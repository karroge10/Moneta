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
    "Utilities": {
        "utility": 1.0,
        "electric": 0.9,
        "electricity": 1.0,
        "water": 0.9,
        "gas bill": 1.0,
        "heating": 0.9,
        "internet": 0.9,
        "wifi": 0.9,
        "phone": 0.8,
        "mobile": 0.8,
        "cable": 0.8,
        "tv": 0.7,
        "cleaning": 0.9,
        "elevator": 0.8,
        "maintenance": 0.7,
        "telmiko": 1.0,
        "tbilservice": 0.9,
        "tbilisi servis": 0.9,
        "tbilisi energ": 0.9,
        "tnet": 0.9,
        "magti": 0.8,
    },
    "Entertainment": {
        "entertainment": 1.0,
        "movie": 0.9,
        "cinema": 1.0,
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
        return [], StatementMetadata()

    metadata = StatementMetadata(source=pdf_path.name)
    transactions: List[RawTransaction] = []

    table_settings = {
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

    try:  # pragma: no cover - requires runtime dependency
        with pdfplumber.open(pdf_path) as pdf:
            logger.info("Opened %s with %d pages", pdf_path.name, len(pdf.pages))
            for page_index, page in enumerate(pdf.pages, start=1):
                tables = page.extract_tables(table_settings=table_settings)
                logger.info("Page %d: extracted %d tables", page_index, len(tables))
                for table_index, table in enumerate(tables, start=1):
                    if not table or len(table) <= 1:
                        continue

                    body = table[1:]
                    logger.debug(
                        "Page %d table %d: processing %d rows", page_index, table_index, len(body)
                    )

                    for row in body:
                        cells = [cell.strip() if cell else "" for cell in row]
                        if not any(cells):
                            continue

                        date_value = parse_date(cells[0]) if len(cells) > 0 else None
                        if not date_value:
                            continue

                        operation_text = cells[1].replace("\n", " ") if len(cells) > 1 else ""
                        debit_text = cells[2].replace("\n", " ") if len(cells) > 2 else ""
                        credit_text = cells[3].replace("\n", " ") if len(cells) > 3 else ""
                        description_text = cells[5].replace("\n", " ") if len(cells) > 5 else ""
                        beneficiary_text = cells[6].replace("\n", " ") if len(cells) > 6 else ""

                        debit_amount = parse_amount([debit_text]) if debit_text else None
                        credit_amount = parse_amount([credit_text]) if credit_text else None
                        amount_value: Optional[float] = None

                        if debit_amount is not None and debit_amount != 0:
                            amount_value = -abs(debit_amount)
                        elif credit_amount is not None and credit_amount != 0:
                            amount_value = abs(credit_amount)
                        else:
                            amount_value = parse_amount([description_text])

                        if amount_value is None:
                            continue

                        description_segments = [
                            operation_text,
                            description_text,
                            beneficiary_text,
                        ]
                        description = " ".join(segment for segment in description_segments if segment).strip() or "Imported transaction"

                        transactions.append(
                            RawTransaction(
                                date=date_value,
                                description=description,
                                amount=amount_value,
                            )
                        )
    except Exception:  # pragma: no cover
        traceback.print_exc()
        return [], metadata

    return transactions, metadata


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
    lowered = text.lower()
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
    else:
        logger.warning("No transactions extracted with pdfplumber; falling back to mineru stub")

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

