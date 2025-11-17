"""
Lightweight PDF processing worker used by the Next.js upload route.

The workflow is:
1. Read the PDF path passed from Node (argv[1]).
2. Optionally load a scikit-learn text-classification pipeline from `transactions_model.joblib`.
3. Try pdfplumber first for structured extraction; fall back to MinerU sample stub.
4. Emit a JSON payload to stdout that matches TransactionUploadResponse plus metadata.
"""

from __future__ import annotations

import json
import re
import sys
import traceback
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable, List, Optional, Tuple, Dict

import logging

logging.basicConfig(level=logging.INFO, format="[process_pdf] %(message)s")
logger = logging.getLogger(__name__)

try:
    import joblib  # type: ignore
except ImportError:  # pragma: no cover
    joblib = None  # type: ignore

try:
    import pdfplumber  # type: ignore
except ImportError:  # pragma: no cover
    pdfplumber = None  # type: ignore

try:
    import mineru  # noqa: F401  # type: ignore  # pragma: no cover
except ImportError:  # pragma: no cover
    mineru = None  # type: ignore

try:
    from deep_translator import GoogleTranslator  # type: ignore
except ImportError:  # pragma: no cover
    GoogleTranslator = None  # type: ignore


DATE_FORMATS: Tuple[str, ...] = (
    "%Y-%m-%d",
    "%d.%m.%Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %b %Y",
    "%d %B %Y",
)


@dataclass
class RawTransaction:
    date: str
    description: str
    amount: float


@dataclass
class StatementMetadata:
    currency: str = "GEL"
    source: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


_translation_cache: Dict[str, str] = {}
_translator: Optional[GoogleTranslator] = None

if GoogleTranslator is not None:
    try:  # pragma: no cover
        _translator = GoogleTranslator(source="auto", target="en")
    except Exception:
        _translator = None

CATEGORY_KEYWORDS: Dict[str, Dict[str, float]] = {
    "Groceries": {
        "grocery": 1.0,
        "supermarket": 1.0,
        "market": 0.9,
        "carrefour": 1.0,
        "food": 0.6,
        "mart": 0.6,
        "store": 0.7,
        "shop": 0.7,
        "walmart": 1.0,
        "target": 1.0,
        "costco": 1.0,
    },
    "Restaurants": {
        "restaurant": 1.0,
        "cafe": 0.9,
        "bar": 0.7,
        "coffee": 0.6,
        "burger": 0.6,
        "pizza": 0.9,
        "mcdonald": 1.0,
        "starbucks": 1.0,
        "kfc": 1.0,
        "dining": 0.9,
        "bistro": 0.8,
    },
    "Transportation": {
        "taxi": 1.0,
        "uber": 1.0,
        "bolt": 1.0,
        "bus": 0.6,
        "fuel": 0.6,
        "gas": 0.6,
        "metro": 0.6,
        "transport": 1.0,
        "tram": 0.7,
        "subway": 0.7,
        "train": 0.7,
        "parking": 0.8,
        "toll": 0.8,
    },
    "Rent": {
        "rent": 1.0,
        "housing": 0.9,
        "apartment": 0.8,
        "lease": 0.8,
        "landlord": 0.9,
    },
    "Entertainment": {
        "entertainment": 1.0,
        "movie": 0.9,
        "cinema": 1.0,
        "cavea": 1.0,
        "theater": 0.9,
        "netflix": 1.0,
        "spotify": 1.0,
        "streaming": 0.9,
        "game": 0.8,
        "gaming": 0.8,
        "concert": 0.9,
    },
    "Fitness": {
        "gym": 1.0,
        "fitness": 1.0,
        "workout": 0.9,
        "exercise": 0.8,
        "sport": 0.8,
        "yoga": 0.9,
        "pilates": 0.9,
    },
    "Clothes": {
        "clothes": 1.0,
        "clothing": 1.0,
        "shirt": 0.9,
        "pants": 0.8,
        "shoes": 0.9,
        "h&m": 1.0,
        "zara": 1.0,
        "nike": 1.0,
        "adidas": 1.0,
        "fashion": 0.8,
    },
    "Food": {
        "food": 0.9,
        "meal": 0.8,
        "lunch": 0.7,
        "dinner": 0.7,
        "breakfast": 0.7,
    },
    "Technology": {
        "technology": 1.0,
        "tech": 1.0,
        "computer": 0.9,
        "laptop": 0.9,
        "phone": 0.8,
        "software": 0.9,
        "app": 0.7,
        "apple": 0.8,
        "samsung": 0.8,
    },
    "Furniture": {
        "furniture": 1.0,
        "ikea": 1.0,
        "sofa": 0.9,
        "chair": 0.8,
        "table": 0.8,
        "bed": 0.8,
    },
    "Gifts": {
        "gift": 1.0,
        "present": 0.9,
        "donation": 0.7,
    },
    "Fees": {
        "fee": 1.0,
        "commission": 1.0,
        "charge": 0.6,
        "service fee": 1.0,
        "transaction fee": 1.0,
    },
    "Cash Withdrawal": {
        "cash withdrawal": 1.0,
        "withdrawal": 0.9,
        "atm": 1.0,
        "cash-out": 0.9,
        "cash in": 0.6,
    },
    # Currency Exchange removed - these transactions should be excluded entirely
    "Deposit": {
        "deposit": 1.0,
        "top up": 0.9,
        "cash-in": 0.9,
        "credit": 0.6,
        "salary": 0.8,
        "income": 0.7,
    },
}


def translate_to_english(text: str) -> str:
    if not text:
        return text
    cached = _translation_cache.get(text)
    if cached is not None:
        return cached
    if _translator is None:
        _translation_cache[text] = text
        return text
    try:  # pragma: no cover
        translated = _translator.translate(text)
        _translation_cache[text] = translated
        return translated
    except Exception:
        _translation_cache[text] = text
        return text


def sample_transactions() -> List[RawTransaction]:
    today = datetime.utcnow().date()
    return [
        RawTransaction(
            date=today.replace(day=1).isoformat(),
            description="Sample Subscription",
            amount=-9.99,
        ),
        RawTransaction(
            date=today.replace(day=2).isoformat(),
            description="Coffee Shop",
            amount=-4.5,
        ),
        RawTransaction(
            date=today.replace(day=3).isoformat(),
            description="Salary",
            amount=2450.0,
        ),
    ]


def parse_date(value: str) -> Optional[str]:
    cleaned = value.strip()
    if not cleaned:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    # Sometimes date comes as DD/MM/YY without century
    match = re.match(r"^(\d{2})/(\d{2})/(\d{2})$", cleaned)
    if match:
        day, month, year = match.groups()
        century = "20" if int(year) < 70 else "19"
        try:
            return datetime.strptime(f"{day}/{month}/{century}{year}", "%d/%m/%Y").date().isoformat()
        except ValueError:
            return None
    return None


def parse_amount(candidates: Iterable[str]) -> Optional[float]:
    for candidate in candidates:
        if not candidate:
            continue
        raw = candidate.strip()
        if not raw:
            continue
        cleaned = (
            raw.replace("₾", "")
            .replace("GEL", "")
            .replace("lari", "")
            .replace(" ", "")
        )
        cleaned = cleaned.replace("'", "")
        cleaned = cleaned.replace(",", "")
        # Replace Georgian decimal comma
        cleaned = cleaned.replace("·", ".")
        cleaned = cleaned.replace("–", "-")
        if cleaned.count('.') > 1:
            # attempt to fix numbers like 1.234.56 -> 1234.56
            parts = cleaned.split('.')
            cleaned = ''.join(parts[:-1]) + '.' + parts[-1]
        if cleaned.startswith('(') and cleaned.endswith(')'):
            cleaned = f"-{cleaned[1:-1]}"
        try:
            value = float(Decimal(cleaned))
            return value
        except (InvalidOperation, ValueError):
            continue
    return None


def extract_transactions_with_pdfplumber(pdf_path: Path) -> Tuple[List[RawTransaction], StatementMetadata]:
    if pdfplumber is None:
        logger.warning("pdfplumber is not available")
        return [], StatementMetadata()

    logger.info("Starting PDF extraction with pdfplumber for: %s", pdf_path.name)
    metadata = StatementMetadata(source=pdf_path.name)
    transactions: List[RawTransaction] = []

    # Try multiple table extraction strategies
    table_strategies = [
        {
            "name": "lines (strict)",
            "settings": {
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 3,
                "join_tolerance": 3,
                "edge_min_length": 3,
                "text_tolerance": 3,
                "text_strategy": "lines",
                "intersection_tolerance": 3,
                "intersection_x_tolerance": 3,
                "intersection_y_tolerance": 3,
            }
        },
        {
            "name": "lines (relaxed)",
            "settings": {
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 5,
                "join_tolerance": 5,
                "edge_min_length": 1,
                "text_tolerance": 5,
                "text_strategy": "lines",
                "intersection_tolerance": 5,
                "intersection_x_tolerance": 5,
                "intersection_y_tolerance": 5,
            }
        },
        {
            "name": "text (explicit)",
            "settings": {
                "vertical_strategy": "text",
                "horizontal_strategy": "text",
                "snap_tolerance": 3,
                "join_tolerance": 3,
            }
        },
        {
            "name": "lines_strict + explicit",
            "settings": {
                "vertical_strategy": "lines_strict",
                "horizontal_strategy": "lines_strict",
                "snap_tolerance": 3,
                "join_tolerance": 3,
            }
        },
    ]

    try:  # pragma: no cover - requires runtime dependency
        with pdfplumber.open(pdf_path) as pdf:
            logger.info("Opened %s with %d pages", pdf_path.name, len(pdf.pages))
            
            # First, get some diagnostic info about the PDF
            if len(pdf.pages) > 0:
                first_page = pdf.pages[0]
                text_sample = first_page.extract_text()
                if text_sample:
                    # Show first 200 chars to understand PDF structure
                    preview = text_sample[:200].replace('\n', ' ').strip()
                    logger.info("Page 1 text preview: %s...", preview)
                else:
                    logger.warning("Page 1: No text extracted - PDF might be image-based or encrypted")
            
            for page_index, page in enumerate(pdf.pages, start=1):
                tables_found = False
                
                # Try each extraction strategy
                for strategy in table_strategies:
                    try:
                        tables = page.extract_tables(table_settings=strategy["settings"])
                        logger.info("Page %d: strategy '%s' extracted %d tables", page_index, strategy["name"], len(tables))
                        
                        if tables and len(tables) > 0:
                            tables_found = True
                            # Process tables with this strategy
                            for table_index, table in enumerate(tables, start=1):
                                if not table or len(table) <= 1:
                                    continue
                                
                                # Log table structure for debugging
                                logger.info("Page %d table %d (strategy: %s): %d rows, %d columns", 
                                          page_index, table_index, strategy["name"], len(table), len(table[0]) if table else 0)
                                
                                # Show header row if available
                                if table and len(table) > 0:
                                    header_preview = " | ".join(str(cell)[:20] if cell else "" for cell in table[0][:5])
                                    logger.info("Page %d table %d header: %s", page_index, table_index, header_preview)
                                
                                # Process this table
                                processed = _process_table(table, page_index, table_index, transactions)
                                if processed > 0:
                                    logger.info("Page %d table %d: successfully processed %d transaction rows", 
                                              page_index, table_index, processed)
                            
                            # If we found and processed tables, no need to try other strategies
                            if tables_found and len(transactions) > 0:
                                break
                    except Exception as e:
                        logger.debug("Page %d: strategy '%s' failed: %s", page_index, strategy["name"], str(e))
                        continue
                
                if not tables_found:
                    logger.warning("Page %d: No tables found with any extraction strategy", page_index)
                    # Try to extract text and see if we can find transaction-like patterns
                    page_text = page.extract_text()
                    if page_text:
                        # Look for date patterns in the text
                        date_patterns = re.findall(r'\d{1,2}[./-]\d{1,2}[./-]\d{2,4}', page_text)
                        if date_patterns:
                            logger.info("Page %d: Found %d date-like patterns in text (but no tables extracted)", 
                                      page_index, len(date_patterns))
                            logger.debug("Sample dates found: %s", ", ".join(date_patterns[:5]))
                    
    except Exception as e:  # pragma: no cover
        logger.error("Exception during PDF extraction: %s", str(e))
        traceback.print_exc()
        return [], metadata

    logger.info("PDF extraction completed: found %d transactions across %d pages", len(transactions), len(pdf.pages) if 'pdf' in locals() else 0)
    return transactions, metadata


def _process_table(table: List[List], page_index: int, table_index: int, transactions: List[RawTransaction]) -> int:
    """Process a single table and extract transactions. Returns number of transactions extracted."""
    if not table or len(table) <= 1:
        return 0
    
    body = table[1:]
    rows_processed = 0

    # Try to detect column structure from header row if available
    header = table[0] if table and len(table) > 0 else None
    date_col_idx = None
    debit_col_idx = None
    credit_col_idx = None
    desc_col_idx = None
    
    # Try to find column indices from header
    if header:
        header_lower = [str(cell).lower().strip() if cell else "" for cell in header]
        for idx, header_cell in enumerate(header_lower):
            if any(keyword in header_cell for keyword in ['date', 'дата', 'თარიღი']):
                date_col_idx = idx
            if any(keyword in header_cell for keyword in ['debit', 'дебет', 'დებეტი', 'out', 'გასავალი']):
                debit_col_idx = idx
            if any(keyword in header_cell for keyword in ['credit', 'кредит', 'კრედიტი', 'in', 'შემოსავალი']):
                credit_col_idx = idx
            if any(keyword in header_cell for keyword in ['description', 'описание', 'აღწერა', 'operation', 'операция', 'ოპერაცია', 'details', 'დეტალები']):
                desc_col_idx = idx
    
    # Fallback to default positions if not found in header
    if date_col_idx is None:
        date_col_idx = 0
    if debit_col_idx is None:
        debit_col_idx = 2
    if credit_col_idx is None:
        credit_col_idx = 3
    if desc_col_idx is None:
        desc_col_idx = 5
    
    for row in body:
        cells = [cell.strip() if cell else "" for cell in row]
        if not any(cells):
            continue

        # Try to find date in any column if first column doesn't have it
        date_value = None
        if date_col_idx < len(cells):
            date_value = parse_date(cells[date_col_idx])
        
        # If date not found in expected column, try all columns
        if not date_value:
            for cell in cells:
                date_value = parse_date(cell)
                if date_value:
                    break
        
        if not date_value:
            continue

        # Extract amounts
        debit_amount = None
        credit_amount = None
        if debit_col_idx < len(cells):
            debit_text = cells[debit_col_idx].replace("\n", " ")
            debit_amount = parse_amount([debit_text]) if debit_text else None
        if credit_col_idx < len(cells):
            credit_text = cells[credit_col_idx].replace("\n", " ")
            credit_amount = parse_amount([credit_text]) if credit_text else None
        
        # If amounts not found in expected columns, try to find in any column
        if debit_amount is None and credit_amount is None:
            for cell in cells:
                if cell:
                    amount = parse_amount([cell])
                    if amount and amount != 0:
                        # Assume negative if it looks like a debit/expense
                        debit_amount = abs(amount)
                        break
        
        amount_value: Optional[float] = None
        if debit_amount is not None and debit_amount != 0:
            amount_value = -abs(debit_amount)
        elif credit_amount is not None and credit_amount != 0:
            amount_value = abs(credit_amount)
        
        if amount_value is None:
            continue

        # Extract description
        description_segments = []
        if desc_col_idx < len(cells):
            description_segments.append(cells[desc_col_idx].replace("\n", " "))
        # Also try adjacent columns for description
        for idx in range(max(0, desc_col_idx - 1), min(len(cells), desc_col_idx + 2)):
            if idx != desc_col_idx and cells[idx]:
                text = cells[idx].replace("\n", " ")
                # Skip if it looks like a date or amount
                if not parse_date(text) and not parse_amount([text]):
                    description_segments.append(text)
        
        description = " ".join(segment for segment in description_segments if segment).strip() or "Imported transaction"

        transactions.append(
            RawTransaction(
                date=date_value,
                description=description,
                amount=amount_value,
            )
        )
        rows_processed += 1
    
    return rows_processed


def extract_transactions_with_mineru(pdf_path: Path) -> List[RawTransaction]:
    if mineru is None:  # pragma: no cover - placeholder extraction
        return sample_transactions()

    try:  # pragma: no cover
        # TODO: integrate MinerU pipeline here.
        return sample_transactions()
    except Exception:
        traceback.print_exc()
        return sample_transactions()


def load_classifier(model_path: Path):
    if joblib is None:
        return None
    if not model_path.exists():
        return None
    try:  # pragma: no cover
        return joblib.load(str(model_path))
    except Exception:  # pragma: no cover
        traceback.print_exc()
        return None


def predict_category(description_en: str, model) -> Tuple[Optional[str], float]:
    text = description_en or ""
    
    # Check for withdrawal patterns first - these should not be categorized
    # (They'll be excluded in the import route, but we shouldn't suggest a category)
    # All checks are on translated English text - translation happens before this function is called
    lowered = text.lower()
    if ('atm' in lowered or 
        'cash withdrawal' in lowered or
        'money withdrawal' in lowered or
        ('withdrawal' in lowered and ('account' in lowered or 'from account' in lowered))):
        return None, 0.35  # Return uncategorized for withdrawals
    
    if model is not None:
        try:  # pragma: no cover
            if hasattr(model, "predict_proba") and hasattr(model, "classes_"):
                probabilities = model.predict_proba([text])[0]
                classes = getattr(model, "classes_", None)
                if classes is not None and len(probabilities):
                    probabilities = probabilities.tolist()
                    best_index = max(range(len(probabilities)), key=lambda idx: probabilities[idx])
                    return str(classes[best_index]), float(probabilities[best_index])
            if hasattr(model, "predict"):
                label = model.predict([text])[0]
                return str(label), 0.6
        except Exception:  # pragma: no cover
            traceback.print_exc()

    # Improved keyword matching with word boundaries and better scoring
    # Normalize text: remove punctuation, extra spaces
    normalized = re.sub(r'[^\w\s]', ' ', lowered)
    normalized = ' '.join(normalized.split())
    
    best_category: Optional[str] = None
    best_score = 0.0
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0.0
        matched_keywords = []
        
        for keyword, weight in keywords.items():
            # Use word boundaries for better matching (avoid partial matches)
            # Check for whole word match or exact phrase match
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            if re.search(pattern, normalized):
                score += weight
                matched_keywords.append(keyword)
            # Also check for exact substring match (for multi-word phrases)
            elif keyword.lower() in normalized:
                score += weight * 0.8  # Slightly lower weight for substring matches
                matched_keywords.append(keyword)
        
        # Bonus for multiple keyword matches (indicates stronger confidence)
        if len(matched_keywords) > 1:
            score *= 1.1
        
        if score > best_score:
            best_category = category
            best_score = score

    if best_category is None or best_score == 0:
        return None, 0.35

    # Improved confidence calculation based on score
    # Higher scores = higher confidence, but cap at 0.95
    # Require minimum score of 1.0 to avoid wild guesses (e.g., "education" -> "entertainment")
    if best_score < 1.0:
        return None, 0.35  # Don't categorize if confidence is too low
    
    confidence = min(0.35 + best_score * 0.15, 0.95)
    return best_category, confidence


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"transactions": [], "metadata": {}}))
        return 0

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    model_path = (
        Path(sys.argv[2]).expanduser().resolve()
        if len(sys.argv) > 2
        else Path(__file__).resolve().parent / "models" / "transactions_model.joblib"
    )

    extracted_transactions: List[RawTransaction] = []
    metadata = StatementMetadata(source=pdf_path.name)

    if pdfplumber is not None:
        extracted_transactions, metadata = extract_transactions_with_pdfplumber(pdf_path)

    if not extracted_transactions:
        logger.warning("pdfplumber extraction returned zero rows, attempting mineru fallback")
        extracted_transactions = extract_transactions_with_mineru(pdf_path)

    if extracted_transactions:
        logger.info("Extracted %d transactions from PDF", len(extracted_transactions))
        # Check if we got sample data (indicates extraction failed)
        if len(extracted_transactions) == 3:
            sample_descriptions = ['Sample Subscription', 'Coffee Shop', 'Salary']
            is_sample = all(
                any(sample in tx.description for sample in sample_descriptions)
                for tx in extracted_transactions
            )
            if is_sample:
                logger.error("PDF extraction failed - received sample transaction data. The PDF structure may not match the expected format.")
                logger.error("Expected table structure: Date | Operation | Debit | Credit | ... | Description | Beneficiary")
                logger.error("Please check the PDF format and ensure it contains a transaction table.")
                # Return empty list instead of sample data
                extracted_transactions = []
    else:
        logger.warning("No transactions extracted from PDF. The PDF structure may not match the expected format.")

    model = load_classifier(model_path)

    payload = {
        "transactions": [],
        "metadata": {
            "currency": metadata.currency,
            "source": metadata.source,
            "periodStart": metadata.period_start,
            "periodEnd": metadata.period_end,
        },
    }

    for index, item in enumerate(extracted_transactions, start=1):
        if index == 1:
            logger.info("Starting translation + categorisation for %d transactions", len(extracted_transactions))
        translated = translate_to_english(item.description)
        if index % 25 == 0 or index == len(extracted_transactions):
            logger.info("Progress: processed %d/%d rows", index, len(extracted_transactions))
        category, confidence = predict_category(translated, model)
        payload["transactions"].append(
            {
                "date": item.date,
                "description": item.description,
                "translatedDescription": translated,
                "amount": round(float(item.amount), 2),
                "category": category,
                "confidence": round(float(confidence), 2),
            }
        )

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":  # pragma: no cover
    if hasattr(sys.stdout, "reconfigure"):
        try:  # pragma: no cover
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    try:
        raise SystemExit(main())
    except Exception:  # pragma: no cover
        traceback.print_exc()
        raise SystemExit(1)

