#!/usr/bin/env python3
"""
Quick test to verify only debit amounts are extracted.
Run: python python/test_debit_only.py
"""

import sys
import json
from pathlib import Path

# Add the python directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from process_pdf import extract_transactions_with_pdfplumber

def main():
    pdf_path = Path("public/MYCREDO_GE72CD0360000035897801_GEL_STATEMENT_2025_11_17_20_56_51.pdf")
    
    if not pdf_path.exists():
        print(f"Error: PDF not found at {pdf_path}")
        print("Please run from project root directory")
        return 1
    
    print("=" * 80)
    print("Testing Debit-Only Extraction")
    print("=" * 80)
    print(f"PDF: {pdf_path.name}\n")
    
    transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)
    
    print(f"Total transactions extracted: {len(transactions)}\n")
    
    if not transactions:
        print("⚠️  No transactions found!")
        return 1
    
    print("Transaction Details:")
    print("-" * 80)
    
    # Expected debit amounts from the PDF (based on screenshot)
    expected_debits = [3.54, 20.65, 18.75, 125.00, 22.00]
    # These should NOT appear (credit/balance)
    should_not_appear = [86.56, 165.75, 130.26]
    
    found_expected = []
    found_wrong = []
    
    for i, tx in enumerate(transactions, 1):
        amount = abs(float(tx.amount))
        is_expected = amount in expected_debits
        is_wrong = amount in should_not_appear
        
        status = "✓" if is_expected else ("✗ WRONG" if is_wrong else "?")
        
        print(f"{i}. {status} Amount: {tx.amount:>10.2f} | Date: {tx.date} | {tx.description[:60]}")
        
        if is_expected:
            found_expected.append(amount)
        if is_wrong:
            found_wrong.append(amount)
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    print(f"\nExpected debit amounts found: {len(found_expected)}/{len(expected_debits)}")
    if found_expected:
        print(f"  Found: {found_expected}")
    
    if found_wrong:
        print(f"\n❌ ERROR: Found credit/balance amounts that should NOT be imported:")
        print(f"  Wrong amounts: {found_wrong}")
        print("\nThese are from Turnover (Cr) or Balance columns - they should be skipped!")
        return 1
    else:
        print("\n✓ No credit or balance amounts found - extraction is correct!")
    
    print(f"\nTotal transactions: {len(transactions)}")
    print(f"All amounts are negative (expenses): {all(tx.amount < 0 for tx in transactions)}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

