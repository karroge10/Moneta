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

# Add parent directory to path to import process_pdf
sys.path.insert(0, str(Path(__file__).parent.parent))

from process_pdf import extract_transactions_with_pdfplumber, StatementMetadata
from process_pdf import translate_to_english, predict_category, load_classifier

app = Flask(__name__)
CORS(app)  # Allow requests from Vercel frontend

# Load classifier model once at startup
model_path = Path(__file__).parent.parent / 'python' / 'models' / 'categories.ftz'
if os.getenv('CATEGORIES_MODEL_PATH'):
    model_path = Path(os.getenv('CATEGORIES_MODEL_PATH'))
classifier_model = load_classifier(model_path)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'pdf-processor'})

@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    """
    Process PDF file and return transactions
    Expects multipart/form-data with 'file' field
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            pdf_path = Path(tmp_file.name)
        
        try:
            # Extract transactions
            transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)
            
            # If no transactions found, return error (don't fall back to sample data)
            if not transactions:
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
            result_transactions = []
            for tx in transactions:
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
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

