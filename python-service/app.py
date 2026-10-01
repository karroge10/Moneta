"""
Flask API service for PDF processing.

Called server to server by the Next.js upload route. Every request to
/process-pdf must carry the shared secret in the x-internal-secret header.
"""
import hmac
import logging
import os
import sys
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlparse

import requests
from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

# The repo root must be importable for python.process_pdf, whatever the working directory.
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from python.process_pdf import (  # noqa: E402
    build_transaction_payload,
    extract_transactions_with_pdfplumber,
    prefetch_translations,
    translate_to_english,
)

logger = logging.getLogger('pdf_service')

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
LOCAL_HOSTS = {'localhost', '127.0.0.1', '::1'}

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_BYTES


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint (public)."""
    return jsonify({'status': 'ok', 'service': 'pdf-processor'})


@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    """
    Process a PDF file and return transactions.
    Expects multipart/form-data with a 'file' field.
    Optional fields: 'jobId', 'callbackUrl' (https only; restricted to
    CALLBACK_ALLOWED_HOSTS when that is set).
    """
    auth_error = check_internal_secret()
    if auth_error:
        return auth_error

    job_id = None
    callback_url = None
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        job_id = request.form.get('jobId')
        requested_callback = request.form.get('callbackUrl')
        if requested_callback and is_allowed_callback(requested_callback):
            callback_url = requested_callback
        elif requested_callback:
            logger.warning('Ignoring callback URL for job %s: host not allowed', job_id)
        logger.info('Received request for job %s (callback %s)', job_id, 'enabled' if callback_url else 'disabled')

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        source_name = Path(file.filename).name

        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            pdf_path = Path(tmp_file.name)
        file.save(str(pdf_path))

        try:
            report_progress(job_id, callback_url, 10, 'processing')

            transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)
            metadata_payload = {
                'currency': metadata.currency,
                'source': source_name,
                'periodStart': metadata.period_start,
                'periodEnd': metadata.period_end,
            }

            if not transactions:
                report_progress(job_id, callback_url, 0, 'failed')
                return jsonify({
                    'error': 'No transactions found in PDF',
                    'transactions': [],
                    'metadata': metadata_payload,
                }), 400

            total = len(transactions)
            logger.info('Starting translation for %d transactions', total)
            report_progress(job_id, callback_url, 30, 'processing', processed_count=0, total_count=total)

            prefetch_translations(tx.description for tx in transactions)
            result_transactions = []
            for index, tx in enumerate(transactions, start=1):
                translated = translate_to_english(tx.description)
                tx_payload = build_transaction_payload(tx, translated)
                result_transactions.append(tx_payload)

                if index % 25 == 0 or index == total:
                    logger.info('Progress: processed %d/%d transactions', index, total)
                    current_progress = 30 + int((index / total) * 60)
                    report_progress(job_id, callback_url, current_progress, 'processing', processed_count=index, total_count=total)

            logger.info('Completed processing %d transactions', total)

            final_result = {
                'transactions': result_transactions,
                'metadata': metadata_payload,
            }

            # Mark job as completed via callback (the Next.js caller may be a serverless function)
            report_progress_with_result(job_id, callback_url, final_result)

            return jsonify(final_result)

        finally:
            remove_temp_file(pdf_path)

    except RequestEntityTooLarge:
        raise
    except Exception as e:
        logger.exception('Processing failed for job %s', job_id)
        report_progress(job_id, callback_url, 0, 'failed')
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@app.errorhandler(413)
def file_too_large(_error):
    limit_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
    return jsonify({'error': f'File too large (max {limit_mb} MB)'}), 413


def check_internal_secret():
    """Return an error response unless x-internal-secret matches INTERNAL_API_SECRET."""
    expected = os.getenv('INTERNAL_API_SECRET')
    if not expected:
        logger.error('INTERNAL_API_SECRET is not set; rejecting request')
        return jsonify({'error': 'Service not configured'}), 503
    provided = request.headers.get('x-internal-secret', '')
    if not hmac.compare_digest(provided.encode(), expected.encode()):
        return jsonify({'error': 'Unauthorized'}), 401
    return None


def is_allowed_callback(url):
    """
    Allow https callbacks (http only for localhost). When CALLBACK_ALLOWED_HOSTS is set, the host
    must also be in it. Without it any https host is accepted: only callers holding the shared
    secret can reach this endpoint, so the list is an extra guard, not the main one.
    """
    allowed_raw = os.getenv('CALLBACK_ALLOWED_HOSTS', '')
    allowed_hosts = {host.strip().lower() for host in allowed_raw.split(',') if host.strip()}
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    host = (parsed.hostname or '').lower()
    if allowed_hosts and host not in allowed_hosts:
        return False
    if parsed.scheme == 'https':
        return True
    return parsed.scheme == 'http' and host in LOCAL_HOSTS


def report_progress(job_id, callback_url, progress, status='processing', processed_count=None, total_count=None):
    """
    Send a progress update to the callback URL.
    Fire and forget: does not block processing if the callback fails.
    """
    if not job_id or not callback_url:
        return

    payload = {'progress': progress, 'status': status}
    if processed_count is not None:
        payload['processedCount'] = processed_count
    if total_count is not None:
        payload['totalCount'] = total_count

    sender = threading.Thread(target=post_callback, args=(job_id, callback_url, payload, 5))
    sender.start()


def report_progress_with_result(job_id, callback_url, result):
    """
    Mark job as completed with the final result.
    Blocking, so completion is recorded before the request returns.
    """
    if not job_id or not callback_url:
        return

    payload = {
        'progress': 100,
        'status': 'completed',
        'result': result,
    }
    if post_callback(job_id, callback_url, payload, 10):
        logger.info('Successfully marked job %s as completed', job_id)


def post_callback(job_id, callback_url, payload, timeout):
    """POST a payload to the callback URL with the shared secret. Returns True on success."""
    headers = {}
    internal_secret = os.getenv('INTERNAL_API_SECRET')
    if internal_secret:
        headers['x-internal-secret'] = internal_secret
    try:
        resp = requests.post(callback_url, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        logger.warning('Callback for job %s failed: %s', job_id, e)
        return False
    if not resp.ok:
        logger.warning('Callback for job %s returned %s: %s', job_id, resp.status_code, resp.text[:200])
        return False
    return True


def remove_temp_file(path):
    try:
        path.unlink(missing_ok=True)
    except OSError as e:
        logger.warning('Could not delete temp file %s: %s', path, e)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
