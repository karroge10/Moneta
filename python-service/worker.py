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

# Add parent directory to path to import process_pdf
project_root = Path(__file__).resolve().parent.parent
python_dir = project_root / 'python'
sys.path.insert(0, str(project_root))

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    from python.process_pdf import (
        extract_transactions_with_pdfplumber,
        translate_to_english,
        predict_category,
        load_classifier,
    )
except ImportError:
    sys.path.insert(0, str(python_dir))
    from process_pdf import (
        extract_transactions_with_pdfplumber,
        translate_to_english,
        predict_category,
        load_classifier,
    )

# Load classifier model once at startup
default_model_path = project_root / 'python' / 'models' / 'categories.ftz'
model_path = Path(os.getenv('CATEGORIES_MODEL_PATH', str(default_model_path)))
classifier_model = load_classifier(model_path)

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
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute("""
        INSERT INTO "Notification" ("userId", type, text, date, time, read)
        VALUES (%s, %s, %s, %s, %s, false)
    """, (
        user_id,
        'PDF Processing',
        message,
        now.date(),
        now.strftime('%H:%M:%S'),
    ))
    conn.commit()
    cursor.close()

def process_job(conn, job_id, file_content, file_name, user_id):
    """Process a single PDF job."""
    temp_file_path = None
    try:
        print(f'[worker] Processing job {job_id}...', flush=True)
        
        # Update status to processing
        update_job_status(conn, job_id, 'processing', progress=0)
        
        # Write file content to temporary file on Render's filesystem
        temp_dir = Path(tempfile.gettempdir())
        temp_file_path = temp_dir / f'pdf_{job_id}_{file_name}'
        
        print(f'[worker] Writing PDF content to temp file: {temp_file_path}...', flush=True)
        with open(temp_file_path, 'wb') as f:
            f.write(file_content)
        
        # Extract transactions
        print(f'[worker] Extracting transactions from {file_name}...', flush=True)
        transactions, metadata = extract_transactions_with_pdfplumber(temp_file_path)
        
        if not transactions:
            raise ValueError('No transactions found in PDF')
        
        print(f'[worker] Extracted {len(transactions)} transactions', flush=True)
        
        # Update progress: 50% after extraction
        update_job_status(conn, job_id, 'processing', progress=50)
        
        # Translate & categorize
        total = len(transactions)
        print(f'[worker] Starting translation + categorization for {total} transactions', flush=True)
        
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
            
            # Update progress: 50-100% during processing
            progress = 50 + int((index / total) * 50)
            update_job_status(conn, job_id, 'processing', progress=progress)
            
            # Log progress every 25 transactions
            if index % 25 == 0 or index == total:
                print(f'[worker] Progress: processed {index}/{total} transactions ({progress}%)', flush=True)
        
        # Prepare result with metadata
        result = {
            'transactions': result_transactions,
            'metadata': {
                'currency': metadata.currency,
                'source': metadata.source or Path(file_path).name,
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
        
        # Create notification
        create_notification(
            conn,
            user_id,
            f'Your bank statement has been processed successfully! Found {len(result_transactions)} transactions.'
        )
        
        print(f'[worker] Job {job_id} completed successfully', flush=True)
        
    except Exception as e:
        error_msg = str(e)
        print(f'[worker] Error processing job {job_id}: {error_msg}', flush=True)
        update_job_status(conn, job_id, 'failed', error=error_msg)
        
        # Create error notification
        try:
            create_notification(
                conn,
                user_id,
                f'PDF processing failed: {error_msg}'
            )
        except:
            pass  # Don't fail if notification creation fails
    finally:
        # Always clean up temp file
        if temp_file_path and temp_file_path.exists():
            try:
                temp_file_path.unlink()
                print(f'[worker] Cleaned up temp file: {temp_file_path}', flush=True)
            except Exception as e:
                print(f'[worker] Warning: Could not delete temp file {temp_file_path}: {e}', flush=True)

def main():
    """Main worker loop - polls for jobs and processes them."""
    print('[worker] Starting PDF processing worker...', flush=True)
    print(f'[worker] Model path: {model_path}', flush=True)
    
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
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Find next queued job (FOR UPDATE SKIP LOCKED prevents multiple workers from picking same job)
            cursor.execute("""
                SELECT id, "fileContent", "fileName", "userId"
                FROM "PdfProcessingJob"
                WHERE status = 'queued'
                ORDER BY "createdAt" ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            """)
            
            job = cursor.fetchone()
            cursor.close()
            
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
            time.sleep(5)  # Wait longer on error before retrying

if __name__ == '__main__':
    main()

