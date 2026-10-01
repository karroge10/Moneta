"""
Background worker that processes PDF jobs from PostgreSQL queue.
Polls for queued jobs, processes them, and updates status/progress.
"""
import os
import sys
import json
import time
import tempfile
from pathlib import Path
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# The repo root must be importable for python.process_pdf, whatever the working directory.
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from python.process_pdf import (  # noqa: E402
    build_transaction_payload,
    extract_transactions_with_pdfplumber,
)

def main():
    """Main worker loop - polls for jobs and processes them."""
    print('[worker] Starting PDF processing worker...', flush=True)
    
    # Connect to database
    try:
        conn = get_db_connection()
        print('[worker] Connected to database', flush=True)
    except Exception as e:
        print(f'[worker] ERROR: Could not connect to database: {e}', flush=True)
        sys.exit(1)
    
    # Main loop
    while True:
        try:
            job = claim_next_job(conn)

            if job:
                job_id = job['id']
                file_content = job['fileContent']  # Bytes from database
                file_name = job['fileName']
                user_id = job['userId']
                
                process_job(conn, job_id, file_content, file_name, user_id)
            else:
                # No jobs, wait before checking again
                time.sleep(2)  # Check every 2 seconds
                
        except KeyboardInterrupt:
            print('\n[worker] Shutting down...', flush=True)
            conn.close()
            break
        except Exception as e:
            print(f'[worker] Error in main loop: {e}', flush=True)
            try:
                conn.rollback()
            except psycopg2.Error as rollback_error:
                print(f'[worker] Rollback failed: {rollback_error}', flush=True)
            time.sleep(5)  # Wait longer on error before retrying

def claim_next_job(conn):
    """
    Atomically claim the oldest queued job and mark it as processing.
    FOR UPDATE SKIP LOCKED keeps concurrent workers from claiming the same job.
    Returns the job row or None.
    """
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            UPDATE "PdfProcessingJob"
            SET status = 'processing', progress = 0, "updatedAt" = NOW()
            WHERE id = (
                SELECT id
                FROM "PdfProcessingJob"
                WHERE status = 'queued'
                ORDER BY "createdAt" ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, "fileContent", "fileName", "userId"
        """)
        job = cursor.fetchone()
        conn.commit()
        return job
    finally:
        cursor.close()

def get_db_connection():
    """Get PostgreSQL connection from DATABASE_URL environment variable."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError('DATABASE_URL environment variable is not set')
    
    # Parse connection string (handles Neon's postgres:// format)
    return psycopg2.connect(database_url)

def update_job_status(conn, job_id, status, progress=None, result=None, error=None):
    """Update job status in database."""
    cursor = conn.cursor()
    updates = ['status = %s']
    values = [status]
    
    if progress is not None:
        updates.append('progress = %s')
        values.append(progress)
    
    if result is not None:
        updates.append('result = %s::jsonb')
        values.append(json.dumps(result))
    
    if error is not None:
        updates.append('error = %s')
        values.append(error)
    
    if status == 'completed':
        updates.append('"completedAt" = NOW()')
    
    values.append(job_id)
    
    query = f"""
        UPDATE "PdfProcessingJob"
        SET {', '.join(updates)}, "updatedAt" = NOW()
        WHERE id = %s
    """
    
    cursor.execute(query, values)
    conn.commit()
    cursor.close()

def create_notification(conn, user_id, message):
    """Create a notification for the user."""
    cursor = None
    try:
        cursor = conn.cursor()
        now = datetime.now()
        # Use full datetime for date field (PostgreSQL will handle it)
        cursor.execute("""
            INSERT INTO "Notification" ("userId", type, text, date, time, read)
            VALUES (%s, %s, %s, %s, %s, false)
        """, (
            user_id,
            'PDF Processing',
            message,
            now,  # Use full datetime - PostgreSQL DateTime field accepts this
            now.strftime('%H:%M:%S'),
        ))
        conn.commit()
        print(f'[worker] Created notification for user {user_id}: {message}', flush=True)
    except Exception as e:
        print(f'[worker] ERROR: Failed to create notification for user {user_id}: {str(e)}', flush=True)
        import traceback
        print(f'[worker] Traceback: {traceback.format_exc()}', flush=True)
        # Don't raise - notification creation failure shouldn't break the job
    finally:
        if cursor:
            cursor.close()

def process_job(conn, job_id, file_content, file_name, user_id):
    """Process a single PDF job."""
    temp_file_path = None
    try:
        print(f'[worker] Processing job {job_id}...', flush=True)
        
        # Write file content to a temp file (the name never includes the user-supplied file name)
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            temp_file_path = Path(tmp_file.name)
            tmp_file.write(file_content)
        print(f'[worker] Wrote PDF content to temp file: {temp_file_path}', flush=True)
        
        # Extract transactions
        print(f'[worker] Extracting transactions from {file_name}...', flush=True)
        transactions, metadata = extract_transactions_with_pdfplumber(temp_file_path)
        
        if not transactions:
            raise ValueError('No transactions found in PDF')
        
        print(f'[worker] Extracted {len(transactions)} transactions', flush=True)
        
        # Update progress: 50% after extraction
        update_job_status(conn, job_id, 'processing', progress=50)
        
        result_transactions = [build_transaction_payload(tx) for tx in transactions]
        update_job_status(conn, job_id, 'processing', progress=90)
        print(f'[worker] Built {len(result_transactions)} transactions', flush=True)
        
        # Prepare result with metadata
        result = {
            'transactions': result_transactions,
            'metadata': {
                'currency': metadata.currency,
                'source': Path(file_name).name if file_name else metadata.source,
                'periodStart': metadata.period_start,
                'periodEnd': metadata.period_end,
            }
        }
        
        # Mark as completed
        update_job_status(conn, job_id, 'completed', progress=100, result=result)
        
        # Delete PDF content to save database storage (we only need the extracted transactions)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE "PdfProcessingJob"
            SET "fileContent" = NULL
            WHERE id = %s
        """, (job_id,))
        conn.commit()
        cursor.close()
        print(f'[worker] Deleted PDF content from database for job {job_id}', flush=True)
        
        # Notification will be created by the API route when it receives the completion status
        # No need to create it here to avoid duplicates
        
        print(f'[worker] Job {job_id} completed successfully', flush=True)
        
    except Exception as e:
        error_msg = str(e)
        print(f'[worker] Error processing job {job_id}: {error_msg}', flush=True)
        conn.rollback()
        update_job_status(conn, job_id, 'failed', error=error_msg)

        # create_notification logs and swallows its own errors
        create_notification(
            conn,
            user_id,
            f'PDF processing failed: {error_msg}'
        )
    finally:
        # Always clean up temp file
        if temp_file_path and temp_file_path.exists():
            try:
                temp_file_path.unlink()
                print(f'[worker] Cleaned up temp file: {temp_file_path}', flush=True)
            except Exception as e:
                print(f'[worker] Warning: Could not delete temp file {temp_file_path}: {e}', flush=True)

if __name__ == '__main__':
    main()

