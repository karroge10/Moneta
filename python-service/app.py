"""
Flask API service for PDF processing
Deploy this to Render as a separate service
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from pathlib import Path
import sys
import requests
import threading

# Add parent directory to path to import process_pdf
# The process_pdf module is in the python/ directory
project_root = Path(__file__).resolve().parent.parent
python_dir = project_root / 'python'

# Add project root to path so we can import python.process_pdf
sys.path.insert(0, str(project_root))

# Import from process_pdf module in python/ directory
# Try both import styles for compatibility
try:
    from python.process_pdf import extract_transactions_with_pdfplumber, StatementMetadata
    from python.process_pdf import translate_to_english, predict_category, load_classifier
except ImportError:
    # Fallback: add python directory directly to path
    sys.path.insert(0, str(python_dir))
    from process_pdf import extract_transactions_with_pdfplumber, StatementMetadata
    from process_pdf import translate_to_english, predict_category, load_classifier

app = Flask(__name__)
CORS(app)  # Allow requests from Vercel frontend

# Load classifier model once at startup
# Default to python/models/categories.ftz relative to project root
default_model_path = project_root / 'python' / 'models' / 'categories.ftz'
model_path = Path(os.getenv('CATEGORIES_MODEL_PATH', str(default_model_path)))
classifier_model = load_classifier(model_path)

def report_progress(job_id, callback_url, progress, status="processing", processed_count=None, total_count=None):
    """
    Send progress update to the callback URL.
    Fire and forget - don't block processing if callback fails.
    """
    if not job_id or not callback_url:
        return
        
    def _send_request():
        try:
            # Get secret from environment variable
            internal_secret = os.getenv('INTERNAL_API_SECRET')
            headers = {}
            if internal_secret:
                headers['x-internal-secret'] = internal_secret
            
            payload = {'progress': progress, 'status': status}
            if processed_count is not None:
                payload['processedCount'] = processed_count
            if total_count is not None:
                payload['totalCount'] = total_count
            
            resp = requests.post(
                callback_url, 
                json=payload,
                headers=headers,
                timeout=5
            )
            if not resp.ok:
                print(f'[process_pdf] Progress update failed for {job_id}: status {resp.status_code}, response: {resp.text[:100]}', flush=True)
        except Exception as e:
            print(f'[process_pdf] Failed to report progress for {job_id}: {e}', flush=True)
            
    # Run in thread to not block processing loop
    threading.Thread(target=_send_request).start()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'pdf-processor'})

@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    """
    Process PDF file and return transactions
    Expects multipart/form-data with 'file' field
    Optional fields: 'jobId', 'callbackUrl'
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        # Get job tracking info
        job_id = request.form.get('jobId')
        callback_url = request.form.get('callbackUrl')
        print(f'[process_pdf] Received request for job {job_id} with callback {callback_url}', flush=True)
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            pdf_path = Path(tmp_file.name)
        
        try:
            # Initial progress: File received
            report_progress(job_id, callback_url, 10, "processing")
            
            # Extract transactions
            transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)
            
            # If no transactions found, return error (don't fall back to sample data)
            if not transactions:
                report_progress(job_id, callback_url, 0, "failed")
                return jsonify({
                    'error': 'No transactions found in PDF',
                    'transactions': [],
                    'metadata': {
                        'currency': metadata.currency,
                        'source': metadata.source or file.filename,
                        'periodStart': metadata.period_start,
                        'periodEnd': metadata.period_end,
                    }
                }), 400
            
            # Process transactions: translate and categorize
            # Add progress logging for large batches
            total = len(transactions)
            print(f'[process_pdf] Starting translation + categorization for {total} transactions', flush=True)
            
            # Progress after extraction: 30% (we know total now, but haven't processed any yet)
            report_progress(job_id, callback_url, 30, "processing", processed_count=0, total_count=total)
            
            result_transactions = []
            for index, tx in enumerate(transactions, start=1):
                translated = translate_to_english(tx.description)
                category, confidence = predict_category(translated, classifier_model)
                
                result_transactions.append({
                    'date': tx.date,
                    'description': tx.description,
                    'translatedDescription': translated,
                    'amount': round(float(tx.amount), 2),
                    'category': category,
                    'confidence': round(float(confidence), 2),
                })
                
                # Log progress every 25 transactions or at the end
                if index % 25 == 0 or index == total:
                    print(f'[process_pdf] Progress: processed {index}/{total} transactions', flush=True)
                    
                    # Calculate progress between 30% and 90%
                    current_progress = 30 + int((index / total) * 60)
                    report_progress(job_id, callback_url, current_progress, "processing", processed_count=index, total_count=total)
            
            print(f'[process_pdf] Completed processing {total} transactions', flush=True)
            
            # Final progress before response: 95% (Next.js will mark 100% when received)
            report_progress(job_id, callback_url, 95, "processing", processed_count=total, total_count=total)
            
            return jsonify({
                'transactions': result_transactions,
                'metadata': {
                    'currency': metadata.currency,
                    'source': metadata.source or file.filename,
                    'periodStart': metadata.period_start,
                    'periodEnd': metadata.period_end,
                }
            })
        
        finally:
            # Clean up temp file
            try:
                pdf_path.unlink()
            except:
                pass
    
    except Exception as e:
        # Report failure if possible
        # We don't know job_id/callback_url if they weren't parsed yet, 
        # but if they were, try to report.
        # Wrap in try/except to avoid double exception
        try:
            if 'job_id' in locals() and 'callback_url' in locals():
                report_progress(job_id, callback_url, 0, "failed")
        except:
            pass
            
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
