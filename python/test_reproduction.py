
import json
import sys
import subprocess
from pathlib import Path

def main():
    # Path to the PDF file
    pdf_path = Path("public/MYCREDO_GE72CD0360000035897801_GEL_STATEMENT_2025_11_17_20_56_51.pdf")
    if not pdf_path.exists():
        print(f"Error: PDF file not found at {pdf_path}")
        sys.exit(1)

    # Run process_pdf.py
    process_script = Path("python/process_pdf.py")
    result = subprocess.run(
        [sys.executable, str(process_script), str(pdf_path)],
        capture_output=True,
        encoding='utf-8',
        errors='replace'
    )

    if result.returncode != 0:
        print("Error running process_pdf.py:")
        print(result.stderr)
        sys.exit(1)

    # Parse output
    try:
        output = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("Error parsing JSON output:")
        print(result.stdout)
        sys.exit(1)

    transactions = output.get("transactions", [])
    print(f"Processed {len(transactions)} transactions.")

    # Assertions
    errors = []
    
    # Check for "Groceries" spam
    groceries_count = sum(1 for tx in transactions if tx.get("category") == "Groceries")
    print(f"Groceries count: {groceries_count}/{len(transactions)}")
    if groceries_count > 50: # Arbitrary threshold, but user said 251/326
        errors.append(f"Too many Groceries: {groceries_count}. Likely model hallucination.")

    # Specific checks
    for tx in transactions:
        desc = tx.get("description", "")
        cat = tx.get("category")
        
        # Zoommer (Electronics store)
        if "Zoommer" in desc:
            print(f"Zoommer category: {cat}")
            if cat == "Groceries":
                errors.append(f"Zoommer incorrectly categorized as Groceries: {desc}")
        
        # Exchange amount
        if "Exchange amount" in desc:
             if cat is not None:
                 print(f"Exchange amount category: {cat}")
                 errors.append(f"Exchange amount should be null (Uncategorized), got: {cat}")

        # Deposit
        if "Deposit money" in desc or "თანხის შეტანა" in desc:
             print(f"Deposit category: {cat}")
             if cat is not None and cat != "Deposit": # We removed Deposit, so it should be None
                 errors.append(f"Deposit should be null, got: {cat}")

        # Fees
        if "fee" in desc.lower() or "საკომისიო" in desc:
             print(f"Fee category: {cat}")
             if cat == "Fees": # Should be Other now
                 errors.append(f"Fee should be mapped to 'Other', got: {cat}")

    if errors:
        print("\nFAILED: Found errors:")
        for err in errors:
            print(f" - {err}")
        sys.exit(1)
    else:
        print("\nSUCCESS: All checks passed.")
        sys.exit(0)

if __name__ == "__main__":
    main()

