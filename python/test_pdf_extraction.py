#!/usr/bin/env python3
"""
Test script to extract transactions from PDF and show detailed logging.
"""

import json
import sys
from pathlib import Path

# Add parent directory to path to import process_pdf
sys.path.insert(0, str(Path(__file__).parent))

from process_pdf import extract_transactions_with_pdfplumber, translate_to_english

def main():
    # Find PDF in public folder
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    public_dir = project_root / "public"
    
    # Try to find the Georgian PDF
    pdf_files = list(public_dir.glob("*.pdf"))
    if not pdf_files:
        print("ERROR: No PDF files found in public folder")
        return 1
    
    # Prefer the MYCREDO PDF if it exists
    pdf_path = None
    for pdf in pdf_files:
        if "MYCREDO" in pdf.name:
            pdf_path = pdf
            break
    
    if not pdf_path:
        pdf_path = pdf_files[0]
    
    print(f"Testing PDF extraction on: {pdf_path.name}")
    print("=" * 80)
    
    # Extract transactions
    transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)
    
    print("\n" + "=" * 80)
    print("EXTRACTION SUMMARY")
    print("=" * 80)
    print(f"Total transactions found: {len(transactions)}")
    print(f"Currency: {metadata.currency} (confidence: {metadata.currency_confidence:.2f})")
    print("\n" + "=" * 80)
    print("DETAILED TRANSACTION REPORT")
    print("=" * 80)
    
    # Show all transactions with original and translated descriptions
    for idx, tx in enumerate(transactions, start=1):
        translated = translate_to_english(tx.description)
        print(f"\nTransaction #{idx}:")
        print(f"  Date: {tx.date}")
        print(f"  Amount: {tx.amount:.2f}")
        print(f"  Original Description: {tx.description}")
        print(f"  Translated Description: {translated}")
        print("-" * 80)
    
    # Check specific expected transactions
    print("\n" + "=" * 80)
    print("VALIDATION AGAINST EXPECTED VALUES")
    print("=" * 80)
    
    expected_transactions = [
        {
            "description_pattern": "T AND K RESTAURANTS",
            "expected_amount": 20.65,
            "found": False
        },
        {
            "description_pattern": "LTD MADAGONI 2",
            "expected_amount": 3.54,
            "found": False
        },
        {
            "description_pattern": "უნაღდო კონვერტაცია",
            "expected_amount": 86.56,
            "found": False
        }
    ]
    
    for expected in expected_transactions:
        pattern = expected["description_pattern"]
        expected_amount = expected["expected_amount"]
        
        for tx in transactions:
            if pattern.lower() in tx.description.lower():
                actual_amount = abs(tx.amount)
                if abs(actual_amount - expected_amount) < 0.01:
                    print(f"✓ FOUND: '{pattern}' - Expected: {expected_amount:.2f}, Got: {actual_amount:.2f} ✓")
                    expected["found"] = True
                    break
                else:
                    print(f"✗ MISMATCH: '{pattern}' - Expected: {expected_amount:.2f}, Got: {actual_amount:.2f} ✗")
                    expected["found"] = True
                    break
        
        if not expected["found"]:
            print(f"✗ NOT FOUND: '{pattern}' - Expected amount: {expected_amount:.2f}")
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
