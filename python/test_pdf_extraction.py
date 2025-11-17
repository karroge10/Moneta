#!/usr/bin/env python3
"""
Test script to debug PDF extraction for MYCREDO bank statements.
Usage: python python/test_pdf_extraction.py path/to/file.pdf
"""

import sys
import json
from pathlib import Path

# Add the python directory to the path so we can import process_pdf
sys.path.insert(0, str(Path(__file__).parent))

from process_pdf import extract_transactions_with_pdfplumber, extract_transactions_with_mineru

def main():
    if len(sys.argv) < 2:
        print("Usage: python python/test_pdf_extraction.py <path_to_pdf>")
        sys.exit(1)
    
    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print("=" * 80)
    print(f"Testing PDF extraction for: {pdf_path.name}")
    print("=" * 80)
    print()
    
    # Try pdfplumber extraction
    print("Step 1: Attempting extraction with pdfplumber...")
    print("-" * 80)
    transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)
    
    print()
    print(f"Results from pdfplumber:")
    print(f"  - Transactions found: {len(transactions)}")
    print(f"  - Metadata: {metadata}")
    print()
    
    if transactions:
        print("Sample transactions (first 5):")
        for i, tx in enumerate(transactions[:5], 1):
            print(f"  {i}. Date: {tx.date}, Amount: {tx.amount}, Description: {tx.description[:50]}")
        print()
    
    # If no transactions found, try mineru fallback
    if not transactions:
        print("Step 2: No transactions found with pdfplumber, trying mineru fallback...")
        print("-" * 80)
        mineru_transactions = extract_transactions_with_mineru(pdf_path)
        print(f"Results from mineru fallback:")
        print(f"  - Transactions found: {len(mineru_transactions)}")
        print()
        
        if mineru_transactions:
            print("Sample transactions from mineru (first 5):")
            for i, tx in enumerate(mineru_transactions[:5], 1):
                print(f"  {i}. Date: {tx.date}, Amount: {tx.amount}, Description: {tx.description[:50]}")
            print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total_found = len(transactions) + (len(mineru_transactions) if not transactions else 0)
    print(f"Total transactions extracted: {total_found}")
    
    if total_found == 0:
        print()
        print("⚠️  No transactions were extracted!")
        print("This could mean:")
        print("  1. The PDF structure doesn't match expected table format")
        print("  2. The PDF is image-based (scanned) and needs OCR")
        print("  3. The PDF is encrypted or has access restrictions")
        print("  4. The table extraction settings need adjustment")
        print()
        print("Check the logs above for detailed extraction attempts.")
    elif total_found == 3:
        sample_descriptions = ['Sample Subscription', 'Coffee Shop', 'Salary']
        is_sample = all(
            any(sample in tx.description for sample in sample_descriptions)
            for tx in (transactions or mineru_transactions)
        )
        if is_sample:
            print()
            print("⚠️  WARNING: Sample data detected! PDF extraction failed.")
    else:
        print(f"✓ Successfully extracted {total_found} transactions")
    
    print()

if __name__ == "__main__":
    main()

