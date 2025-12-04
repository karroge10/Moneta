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

CURRENCY_SYMBOL_MAP: Dict[str, str] = {
    "₾": "GEL",
    "₽": "RUB",
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₹": "INR",
    "₺": "TRY",
}

COMMON_CURRENCY_CODES = {
    "USD",
    "EUR",
    "GEL",
    "GBP",
    "RUB",
    "JPY",
    "CAD",
    "AUD",
    "CHF",
    "CNY",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "TRY",
    "KZT",
    "UAH",
    "INR",
}


@dataclass
class RawTransaction:
    date: str
    description: str
    amount: float


@dataclass
class _PendingTextTransaction:
    record: RawTransaction
    meta_parts: List[str]
    detail_parts: List[str]


@dataclass
class StatementMetadata:
    currency: str = "GEL"
    currency_confidence: float = 0.4
    currency_detection_method: Optional[str] = "default"
    source: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


_translation_cache: Dict[str, str] = {}
_translator: Optional[GoogleTranslator] = None

# Temporary flag to keep categorization on the Node.js side only
DISABLE_CATEGORY_PREDICTION = True

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

    candidates = [cleaned]
    # Extract obvious date fragments from longer strings like "31.10.2025 20:21"
    inline_match = re.search(r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})", cleaned)
    iso_match = re.search(r"(\d{4}[./-]\d{1,2}[./-]\d{1,2})", cleaned)
    if inline_match:
        candidates.insert(0, inline_match.group(1))
    if iso_match:
        candidates.insert(0, iso_match.group(1))
    if " " in cleaned:
        candidates.extend(part for part in cleaned.split() if part)

    for candidate in candidates:
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(candidate.strip(), fmt).date().isoformat()
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
        raw = candidate.replace("\xa0", " ").strip()
        if not raw:
            continue
        normalized = raw
        normalized = normalized.replace("−", "-").replace("–", "-").replace("—", "-")
        sign = 1
        if normalized.startswith("(") and normalized.endswith(")"):
            sign = -1
            normalized = normalized[1:-1]
        normalized = normalized.strip()
        if normalized.startswith("+"):
            normalized = normalized[1:]
            sign = 1
        elif normalized.startswith("-"):
            normalized = normalized[1:]
            sign = -1
        normalized = re.sub(r"[A-Za-zА-Яа-я$€£¥₽₾₴₺₹]", "", normalized)
        normalized = normalized.replace(" ", "")
        normalized = normalized.replace("'", "")
        if not normalized:
            continue
        comma_count = normalized.count(",")
        dot_count = normalized.count(".")
        if comma_count and not dot_count:
            normalized = normalized.replace(",", ".")
        elif comma_count and dot_count:
            if normalized.rfind(",") > normalized.rfind("."):
                normalized = normalized.replace(".", "")
                normalized = normalized.replace(",", ".")
            else:
                normalized = normalized.replace(",", "")
        try:
            value = float(Decimal(normalized))
        except (InvalidOperation, ValueError):
            continue
        return sign * value
    return None


def extract_amount_from_text(text: str) -> Optional[float]:
    """
    Extract amount from text that may contain currency codes like "20.65 GEL" or "3.54 GEL".
    Returns the first valid amount found in the text.
    """
    if not text:
        return None
    
    # Pattern to match amounts like "20.65 GEL", "3.54 GEL", "86.56", etc.
    # Matches: optional sign, digits, optional dot/comma, digits, optional currency code
    patterns = [
        r'([+-]?\d+[.,]\d{2})\s*(?:GEL|USD|EUR|RUB|₾|₽|\$|€)?',  # "20.65 GEL" or "20.65"
        r'([+-]?\d+[.,]\d{1,2})\s*(?:GEL|USD|EUR|RUB|₾|₽|\$|€)?',  # "20.6 GEL" or "20.6"
        r'([+-]?\d+)\s*(?:GEL|USD|EUR|RUB|₾|₽|\$|€)',  # "20 GEL"
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            amount_str = match.group(1)
            amount = parse_amount([amount_str])
            if amount is not None and amount != 0:
                return amount
    
    return None


def detect_currency_from_text(text: Optional[str]) -> Optional[Tuple[str, float, str]]:
    """
    Attempt to detect currency codes from statement text.
    Returns (currency_code, confidence, detection_method).
    """

    if not text:
        return None

    detection_candidates: List[Tuple[str, float, str]] = []

    # Highest confidence: explicit labels like "Currency: RUB" or "Валюта: RUB"
    currency_match = re.search(r"(?:currency|валюта)\s*[:\-]?\s*([A-Z]{3})", text, re.IGNORECASE)
    if currency_match:
        detection_candidates.append((currency_match.group(1).upper(), 0.95, "header-label"))

    # Symbols map (€, $, ₽, ₾, etc.)
    for symbol, code in CURRENCY_SYMBOL_MAP.items():
        if symbol and symbol in text:
            detection_candidates.append((code, 0.9, f"symbol:{symbol}"))

    # Common language-specific keywords
    keyword_patterns: List[Tuple[str, str, float, str]] = [
        (r"\bруб(?:\.|ля|лей|\b)", "RUB", 0.85, "keyword:rub"),
        (r"\blari\b", "GEL", 0.8, "keyword:lari"),
        (r"\btenge\b", "KZT", 0.75, "keyword:tenge"),
        (r"\bdram\b", "AMD", 0.75, "keyword:dram"),
    ]
    for pattern, code, confidence, method in keyword_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            detection_candidates.append((code, confidence, method))

    # ISO codes appearing in context (lower confidence because it might be part of text)
    code_candidates = re.findall(r"\b[A-Z]{3}\b", text)
    for candidate in code_candidates:
        upper_candidate = candidate.upper()
        if upper_candidate in COMMON_CURRENCY_CODES:
            detection_candidates.append((upper_candidate, 0.65, "iso-token"))

    if not detection_candidates:
        return None

    # Return the candidate with highest confidence
    detection_candidates.sort(key=lambda item: item[1], reverse=True)
    return detection_candidates[0]


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
            total_pages = len(pdf.pages)
            logger.info("Opened %s with %d pages (processing all pages)", pdf_path.name, total_pages)
            
            # First, get some diagnostic info about the PDF
            if len(pdf.pages) > 0:
                first_page = pdf.pages[0]
                text_sample = first_page.extract_text()
                if text_sample:
                    # Show first 200 chars to understand PDF structure
                    preview = text_sample[:200].replace('\n', ' ').strip()
                    logger.info("Page 1 text preview: %s...", preview)
                    currency_hint = detect_currency_from_text(text_sample)
                    if currency_hint:
                        metadata.currency = currency_hint[0]
                        metadata.currency_confidence = currency_hint[1]
                        metadata.currency_detection_method = currency_hint[2]
                else:
                    logger.warning("Page 1: No text extracted - PDF might be image-based or encrypted")
            
            for page_index, page in enumerate(pdf.pages, start=1):
                tables_found = False
                transactions_before_page = len(transactions)
                
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
                                    logger.info("Page %d table %d: successfully processed %d transaction rows (total now: %d)", 
                                              page_index, table_index, processed, len(transactions))
                            
                            # If we found and processed tables, no need to try other strategies
                            if tables_found and len(transactions) > 0:
                                break
                    except Exception as e:
                        logger.debug("Page %d: strategy '%s' failed: %s", page_index, strategy["name"], str(e))
                        continue
                
                # Log page summary
                transactions_added = len(transactions) - transactions_before_page
                if transactions_added > 0:
                    logger.info("Page %d: Added %d transactions (total: %d)", page_index, transactions_added, len(transactions))
                
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

    # Only use text-based extraction if table-based extraction found no transactions
    # Table-based extraction is more reliable, so we prefer it when it finds transactions
    if not transactions:
        logger.info("No transactions found via table extraction, trying text-based extraction")
        text_based_rows = _extract_transactions_from_text(pdf_path)
        if text_based_rows:
            logger.info("Text-based extraction found %d transactions", len(text_based_rows))
            transactions = text_based_rows
    else:
        logger.info("Using table-based extraction results (%d transactions found)", len(transactions))

    logger.info("PDF extraction completed: found %d transactions", len(transactions))
    return transactions, metadata


def _clean_cell_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def _looks_like_time(value: str) -> bool:
    stripped = value.strip()
    return bool(re.fullmatch(r"\d{1,2}:\d{2}(:\d{2})?", stripped))


def _is_masked_value(value: str) -> bool:
    if not value:
        return False
    normalized = value.replace(" ", "")
    return bool(re.fullmatch(r"\*{2,}\d{2,}", normalized))


def _collect_description_from_cells(cells: List[str]) -> str:
    parts: List[str] = []
    for cell in cells:
        text = _clean_cell_text(cell)
        if not text:
            continue
        if parse_date(text):
            continue
        if _looks_like_time(text):
            continue
        if parse_amount([text]):
            continue
        if _is_masked_value(text):
            continue
        # Skip cells that are purely numeric identifiers (6+ digits)
        numeric_only = text.replace(" ", "")
        if numeric_only.isdigit() and len(numeric_only) >= 6:
            continue
        parts.append(text)
    deduped: List[str] = []
    seen: set[str] = set()
    for part in parts:
        lowered = part.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(part)
    return " ".join(deduped).strip()


def _line_starts_with_date(value: str) -> bool:
    stripped = value.strip()
    return bool(re.match(r"^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}", stripped))


def _strip_date_prefix(value: str) -> str:
    stripped = value.strip()
    match = re.match(
        r"^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*(\d{2}:\d{2})?\s*(\d{6,})?\s*(.*)$",
        stripped,
    )
    if match:
        remainder = match.group(3) or ""
        return remainder.strip()
    return stripped


def _normalize_description(value: str) -> str:
    if not value:
        return "Imported transaction"
    text = re.sub(r"\s+", " ", value).strip()
    text = re.sub(r"^\d{4,}\s+", "", text)
    text = re.sub(r"\bоперация по карте\s+\*+\d+\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bоперация по карте\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bкарте\s+\*+\d+\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Продолжение на следующей странице.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Для проверки подлинности.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"В ВАЛЮТЕ СЧЁТА.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip(" -")
    return text or "Imported transaction"


HEADER_KEYWORDS = (
    "выписка",
    "statement",
    "www.",
    "сбербанк",
    "остаток",
    "итого",
    "категория",
    "описание операции",
    "account holder",
    # Georgian header keywords
    "თარიღი",
    "ოპერაცია",
    "ბრუნვა",
    "ნაშთი",
    "დანიშნულება",
    "ბენეფიციარის",
    "date",
    "operation",
    "turnover",
    "balance",
    "description",
    "beneficiary",
)

CREDIT_KEYWORDS = (
    "перевод от",
    "зачисление",
    "зарплата",
    "заработная плата",
    "transfer from",
    "incoming transfer",
    "deposit",
    "salary",
    "credited",
    "поступление",
)

DEBIT_KEYWORDS = (
    "перевод на",
    "списание",
    "оплата",
    "платеж",
    "transfer to",
    "payment to",
    "withdrawal",
    "cash withdrawal",
)

NUMBER_PATTERN = re.compile(r"[+-]?\d[\d\s]*[.,]\d{2}")


def _looks_like_header(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in HEADER_KEYWORDS)


def _description_indicates_credit(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in CREDIT_KEYWORDS)


def _description_indicates_debit(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in DEBIT_KEYWORDS)


def _parse_text_transaction_line(line: str) -> Optional[Tuple[str, str, float]]:
    match = re.match(r"(?P<date>\d{2}\.\d{2}\.\d{4})(?:\s+(?P<time>\d{2}:\d{2}))?\s+(?P<body>.+)", line)
    if not match:
        return None
    date_raw = match.group("date")
    date_value = parse_date(date_raw)
    if not date_value:
        return None
    body = match.group("body").strip()
    number_matches = list(NUMBER_PATTERN.finditer(body))
    if not number_matches:
        return None
    amount_match = number_matches[-2] if len(number_matches) > 1 else number_matches[-1]
    amount_text = amount_match.group()
    amount_value = parse_amount([amount_text])
    if amount_value is None:
        return None
    meta_text = body[:amount_match.start()].strip()
    if not meta_text:
        meta_text = "Imported transaction"
    if amount_text.strip().startswith("+"):
        amount = abs(amount_value)
    elif amount_value < 0 or _description_indicates_debit(meta_text):
        amount = -abs(amount_value)
    elif _description_indicates_credit(meta_text):
        amount = abs(amount_value)
    else:
        amount = -abs(amount_value)
    return date_value, meta_text, amount


def _finalize_pending_transaction(pending: _PendingTextTransaction) -> RawTransaction:
    if pending.detail_parts:
        detail = " ".join(pending.detail_parts)
    elif pending.meta_parts:
        detail = " ".join(pending.meta_parts)
    else:
        detail = "Imported transaction"
    pending.record.description = _normalize_description(detail)
    return pending.record


def _extract_transactions_from_text(pdf_path: Path) -> List[RawTransaction]:
    text_transactions: List[RawTransaction] = []
    pending: Optional[_PendingTextTransaction] = None
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            logger.info("Text-based extraction: processing all %d pages", total_pages)
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                for raw_line in page_text.splitlines():
                    line = raw_line.strip()
                    if not line:
                        continue
                    parsed = _parse_text_transaction_line(line)
                    if parsed:
                        if pending:
                            text_transactions.append(_finalize_pending_transaction(pending))
                        date_value, meta_text, amount = parsed
                        meta_clean = meta_text.strip()
                        pending = _PendingTextTransaction(
                            record=RawTransaction(
                                date=date_value,
                                description=meta_clean or "Imported transaction",
                                amount=amount,
                            ),
                            meta_parts=[meta_clean] if meta_clean else [],
                            detail_parts=[],
                        )
                        continue

                    if pending is None:
                        continue

                    if _looks_like_header(line):
                        continue

                    if _is_masked_value(line):
                        continue

                    if parse_amount([line]):
                        continue

                    if _line_starts_with_date(line):
                        remainder = _strip_date_prefix(line)
                        if remainder:
                            pending.detail_parts.append(remainder)
                        continue

                    if parse_date(line):
                        continue

                    pending.detail_parts.append(line)

            if pending:
                text_transactions.append(_finalize_pending_transaction(pending))
    except Exception:
        logger.exception("Text-based PDF parsing failed")
        return []
    return text_transactions


def _score_transactions(rows: List[RawTransaction]) -> float:
    if not rows:
        return float("inf")
    absolute_values = sorted(abs(tx.amount) for tx in rows if tx.amount is not None)
    if not absolute_values:
        return float("inf")
    median = absolute_values[len(absolute_values) // 2]
    header_penalty = sum(1 for tx in rows if _looks_like_header(tx.description)) / len(rows)
    zero_penalty = sum(1 for tx in rows if tx.amount == 0) / len(rows)
    return median * (1 + header_penalty + zero_penalty)


def _process_table(table: List[List], page_index: int, table_index: int, transactions: List[RawTransaction]) -> int:
    """Process a single table and extract transactions. Returns number of transactions extracted."""
    if not table or len(table) <= 1:
        return 0
    
    # Check if first row is actually a header or a data row
    first_row = table[0] if table and len(table) > 0 else None
    first_row_text = " ".join(str(cell).lower().strip() if cell else "" for cell in first_row) if first_row else ""
    is_first_row_header = _looks_like_header(first_row_text) if first_row_text else False
    
    # If first row is a header, skip it; otherwise include it in body
    body = table[1:] if is_first_row_header else table
    rows_processed = 0

    # Try to detect column structure from header row if available
    header = table[0] if is_first_row_header and table and len(table) > 0 else None
    date_col_idx = None
    debit_col_idx = None
    credit_col_idx = None
    desc_col_idx = None
    
    # Try to find column indices from header
    if header:
        header_lower = [str(cell).lower().strip() if cell else "" for cell in header]
        header_original = [str(cell).strip() if cell else "" for cell in header]
        for idx, header_cell in enumerate(header_lower):
            # Date column detection
            if any(keyword in header_cell for keyword in ['date', 'дата', 'თარიღი']):
                date_col_idx = idx
            # Debit column detection - includes Georgian "ბრუნვა (დებ)" pattern
            if any(keyword in header_cell for keyword in ['debit', 'дебет', 'დებეტი', 'out', 'გასავალი', 'დებ']):
                debit_col_idx = idx
            # Also check original text for Georgian patterns
            if header_original[idx] and ('ბრუნვა (დებ)' in header_original[idx] or 'დებ' in header_original[idx]):
                debit_col_idx = idx
            # Credit column detection - includes Georgian "ბრუნვა (კრ)" pattern
            if any(keyword in header_cell for keyword in ['credit', 'кредит', 'კრედიტი', 'in', 'შემოსავალი', 'კრ']):
                credit_col_idx = idx
            # Also check original text for Georgian patterns
            if header_original[idx] and ('ბრუნვა (კრ)' in header_original[idx] or 'კრ' in header_original[idx]):
                credit_col_idx = idx
            # Description column detection
            if any(keyword in header_cell for keyword in ['description', 'описание', 'აღწერა', 'operation', 'операция', 'ოპერაცია', 'details', 'დეტალები', 'დანიშნულება']):
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
    
    # Log detected column structure for debugging
    if header:
        logger.debug("Page %d table %d: Detected columns - Date: %s, Debit: %s, Credit: %s, Desc: %s", 
                    page_index, table_index, date_col_idx, debit_col_idx, credit_col_idx, desc_col_idx)
    
    recent_transaction: Optional[RawTransaction] = None

    for row_idx, row in enumerate(body, start=1):
        cells = [_clean_cell_text(cell) for cell in row]
        if not any(cells):
            continue

        # Check if this row looks like a header row BEFORE processing
        # But be careful - don't skip valid transactions that happen to contain header-like words
        row_text = " ".join(cells).lower()
        is_header = _looks_like_header(row_text)
        
        # Additional check: if row has a valid date AND amounts, it's probably a transaction, not a header
        if is_header:
            # Check if it has a date - if yes, it's probably a transaction row, not a header
            has_date = False
            for cell in cells:
                if parse_date(cell):
                    has_date = True
                    break
            
            # If it has a date, don't treat it as a header
            if has_date:
                is_header = False
                if row_idx <= 6:
                    logger.info("Row %d contains header-like text but has a date - treating as transaction", row_idx)
        
        if is_header:
            if row_idx <= 6:
                logger.info("SKIPPING ROW %d: Detected as header row", row_idx)
                logger.info("  Row text: %s", row_text[:100])
            else:
                logger.debug("Skipping header row %d: %s", row_idx, " | ".join(cells[:5]))
            continue

        # Log raw cells for first 6 rows to debug
        if row_idx <= 6:
            logger.info("=" * 80)
            logger.info("PROCESSING ROW %d (Page %d, Table %d)", row_idx, page_index, table_index)
            logger.info("Raw cells (%d total):", len(cells))
            for i, cell in enumerate(cells[:8]):
                logger.info("  [%d] '%s'", i, cell[:50] if cell else "(empty)")
            if len(cells) > 8:
                logger.info("  ... (%d more cells)", len(cells) - 8)
        
        row_description_hint = _collect_description_from_cells(cells)

        # Try to find date in description column first (user's request)
        date_value = None
        if desc_col_idx < len(cells) and cells[desc_col_idx]:
            date_value = parse_date(cells[desc_col_idx])
            if date_value and row_idx <= 6:
                logger.info("Found date in description column: '%s' -> %s", cells[desc_col_idx][:50], date_value)
        
        # If date not found in description, try date column
        if not date_value and date_col_idx < len(cells):
            date_value = parse_date(cells[date_col_idx])
            if date_value and row_idx <= 6:
                logger.info("Found date in date column: '%s' -> %s", cells[date_col_idx][:50], date_value)
        
        # If date still not found, try all other columns (excluding description and date columns already checked)
        if not date_value:
            for idx, cell in enumerate(cells):
                # Skip description and date columns (already checked)
                if idx == desc_col_idx or idx == date_col_idx:
                    continue
                date_value = parse_date(cell)
                if date_value:
                    if row_idx <= 6:
                        logger.info("Found date in column[%d]: '%s' -> %s", idx, cell[:50], date_value)
                    break
        
        # Skip rows without dates - don't modify previous transactions
        # Only skip if we also don't have valid amounts (to avoid skipping valid transactions)
        if not date_value:
            # Check if this row has any amounts - if yes, it might be a valid transaction with date in wrong column
            has_amounts = False
            if debit_col_idx < len(cells) and cells[debit_col_idx]:
                if parse_amount([cells[debit_col_idx]]):
                    has_amounts = True
            if not has_amounts and credit_col_idx < len(cells) and cells[credit_col_idx]:
                if parse_amount([cells[credit_col_idx]]):
                    has_amounts = True
            
            # If no date and no amounts, skip this row entirely without modifying previous transaction
            if not has_amounts:
                if row_idx <= 6:
                    logger.info("SKIPPING ROW %d: No date and no amounts", row_idx)
                    logger.info("  Cells: %s", " | ".join(cells[:8]))
                else:
                    logger.debug("Skipping row %d: no date and no amounts. Cells: %s", row_idx, " | ".join(cells[:5]))
                continue
            
            # If we have amounts but no date, try harder to find date or skip
            if row_idx <= 6:
                logger.info("SKIPPING ROW %d: Has amounts but no date (skipping to avoid misalignment)", row_idx)
                logger.info("  Cells: %s", " | ".join(cells[:8]))
            else:
                logger.debug("Row %d has amounts but no date, skipping to avoid misalignment", row_idx)
            continue

        # Extract amounts from debit/credit columns - be very strict about column indices
        debit_amount = None
        credit_amount = None
        
        # Log column indices and amount extraction for first 6 rows
        if row_idx <= 6:
            logger.info("Column indices - Date: %s, Debit: %s, Credit: %s, Desc: %s", 
                       date_col_idx, debit_col_idx, credit_col_idx, desc_col_idx)
            logger.info("Date extraction: '%s' -> %s", cells[date_col_idx] if date_col_idx < len(cells) else "N/A", date_value)
        
        if debit_col_idx < len(cells):
            debit_text = cells[debit_col_idx].replace("\n", " ").strip()
            if debit_text:
                debit_amount = parse_amount([debit_text])
                if row_idx <= 6:
                    logger.info("Debit column[%s]: '%s' -> %s", debit_col_idx, debit_text[:40], debit_amount)
        if credit_col_idx < len(cells):
            credit_text = cells[credit_col_idx].replace("\n", " ").strip()
            if credit_text:
                credit_amount = parse_amount([credit_text])
                if row_idx <= 6:
                    logger.info("Credit column[%s]: '%s' -> %s", credit_col_idx, credit_text[:40], credit_amount)
        
        # If amounts not found in expected columns, try to find in any column
        if debit_amount is None and credit_amount is None:
            amount_candidates: List[Tuple[int, float, str]] = []
            for idx in range(len(cells) - 1, -1, -1):
                cell = cells[idx]
                if not cell:
                    continue
                if parse_date(cell) or _looks_like_time(cell):
                    continue
                if _is_masked_value(cell):
                    continue
                stripped_digits = cell.replace(" ", "")
                if stripped_digits.isdigit() and len(stripped_digits) >= 6 and "," not in cell and "." not in cell:
                    continue
                amount = parse_amount([cell])
                if amount is None or amount == 0:
                    continue
                amount_candidates.append((idx, amount, cell))
            if amount_candidates:
                preferred = [candidate for candidate in amount_candidates if candidate[0] != len(cells) - 1]
                target_idx, candidate_value, raw_cell = (preferred or amount_candidates)[0]
                raw_stripped = raw_cell.strip()
                if candidate_value < 0 or raw_stripped.startswith("-") or raw_stripped.startswith("("):
                    debit_amount = abs(candidate_value)
                elif raw_stripped.startswith("+"):
                    credit_amount = abs(candidate_value)
                else:
                    debit_amount = abs(candidate_value)
        
        # If still no amount found, try extracting from description text
        if debit_amount is None and credit_amount is None:
            # Collect description text first
            description_segments = []
            if desc_col_idx < len(cells):
                description_segments.append(cells[desc_col_idx].replace("\n", " "))
            # Also try adjacent columns for description
            for idx in range(max(0, desc_col_idx - 1), min(len(cells), desc_col_idx + 2)):
                if idx != desc_col_idx and cells[idx]:
                    text = cells[idx].replace("\n", " ")
                    # Skip if it looks like a date or pure amount
                    if not parse_date(text) and not parse_amount([text]):
                        description_segments.append(text)
            
            description_text = " ".join(segment for segment in description_segments if segment).strip()
            if description_text:
                extracted_amount = extract_amount_from_text(description_text)
                if extracted_amount:
                    if extracted_amount < 0:
                        debit_amount = abs(extracted_amount)
                    else:
                        credit_amount = abs(extracted_amount)
        
        amount_value: Optional[float] = None
        if debit_amount is not None and debit_amount != 0:
            amount_value = -abs(debit_amount)
        elif credit_amount is not None and credit_amount != 0:
            amount_value = abs(credit_amount)
        
        if amount_value is None:
            if row_idx <= 6:
                logger.warning("SKIPPING ROW %d: Could not extract amount", row_idx)
                logger.warning("  Debit amount: %s, Credit amount: %s", debit_amount, credit_amount)
                logger.warning("  Cells: %s", " | ".join(cells[:8]))
            else:
                logger.warning("Row %d: Could not extract amount. Cells: %s", row_idx, " | ".join(cells[:8]))
            continue

        # Extract description - STRICTLY use ONLY description column (column 5)
        # Do NOT mix with operation column or any other column
        description = ""
        if desc_col_idx < len(cells):
            description = cells[desc_col_idx].replace("\n", " ").strip()
        
        if row_idx <= 6:
            logger.info("Description extraction:")
            logger.info("  Description column[%s]: '%s'", desc_col_idx, description[:80] if description else "(empty)")
            if len(cells) > 1:
                logger.info("  Operation column[1]: '%s' (NOT using)", cells[1][:80] if cells[1] else "(empty)")
        
        # If description column is truly empty, use operation column as fallback
        # But ONLY if description is completely empty (not just whitespace)
        if not description or description.strip() == "":
            if len(cells) > 1:
                operation_text = cells[1].replace("\n", " ").strip()
                # Only use if it's a meaningful operation (not just "card operation" type)
                if operation_text and not _looks_like_header(operation_text.lower()):
                    # Check if it's a specific transaction type, not a generic operation label
                    generic_operations = ['საბარათე ოპერაცია', 'card operation', 'გადახდები', 'payments']
                    if operation_text not in generic_operations:
                        description = operation_text
                        if row_idx <= 6:
                            logger.info("  Using operation column as fallback: '%s'", description[:80])
        
        # Final fallback
        if not description or description.strip() == "":
            description = "Imported transaction"
        
        # Final check: if description looks like a header, skip this row
        if _looks_like_header(description.lower()):
            if row_idx <= 6:
                logger.info("SKIPPING ROW %d: Description looks like header", row_idx)
                logger.info("  Description: %s", description[:100])
            else:
                logger.debug("Skipping row %d: description looks like header: %s", row_idx, description[:50])
            continue
        
        # Clean up description - remove any embedded amounts that might have been extracted
        # This prevents "გადახდა - LTD MADAGONI 2 3.54 GEL" from being in description when amount is already extracted
        description = re.sub(r'\d+\.\d{2}\s*(?:GEL|USD|EUR|RUB|₾|₽|\$|€)', '', description, flags=re.IGNORECASE).strip()
        description = re.sub(r'\s+', ' ', description).strip()
        
        if row_idx <= 6:
            logger.info("  Final description: '%s'", description[:100])

        new_transaction = RawTransaction(
            date=date_value,
            description=description,
            amount=amount_value,
        )
        
        # Log transaction details for first 6 rows
        if row_idx <= 6:
            logger.info("EXTRACTED TRANSACTION:")
            logger.info("  Date: %s", date_value)
            logger.info("  Amount: %.2f (debit: %s, credit: %s)", 
                       amount_value, debit_amount, credit_amount)
            logger.info("  Description: %s", description[:100])
            logger.info("  Description column[%s]: '%s'", desc_col_idx, 
                       cells[desc_col_idx][:60] if desc_col_idx < len(cells) else "N/A")
            logger.info("=" * 80)
        
        transactions.append(new_transaction)
        recent_transaction = new_transaction
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
    if DISABLE_CATEGORY_PREDICTION:
        # Leave categorization to merchant matching in Next.js
        return None, 0.0

    text = description_en or ""
    
    # Check for withdrawal patterns first - these should not be categorized
    # (They'll be excluded in the import route, but we shouldn't suggest a category)
    # All checks are on translated English text - translation happens before this function is called
    lowered = text.lower()
    if ('atm' in lowered or 
        'cash withdrawal' in lowered or
        'money withdrawal' in lowered or
        'withdrawal of money' in lowered or
        ('withdrawal' in lowered and ('account' in lowered or 'from account' in lowered)) or
        ('withdraw' in lowered and 'account' in lowered) or
        ('take out' in lowered and ('account' in lowered or 'money' in lowered)) or
        ('takeout' in lowered and ('account' in lowered or 'money' in lowered))):
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

    # Double-check for withdrawal patterns after normalization (in case translation uses different wording)
    # Check again after normalization to catch variations
    normalized_for_withdrawal_check = re.sub(r'[^\w\s]', ' ', lowered)
    normalized_for_withdrawal_check = ' '.join(normalized_for_withdrawal_check.split())
    if ('atm' in normalized_for_withdrawal_check or 
        'cash withdrawal' in normalized_for_withdrawal_check or
        'money withdrawal' in normalized_for_withdrawal_check or
        'withdrawal of money' in normalized_for_withdrawal_check or
        ('withdrawal' in normalized_for_withdrawal_check and ('account' in normalized_for_withdrawal_check or 'from account' in normalized_for_withdrawal_check)) or
        ('withdraw' in normalized_for_withdrawal_check and 'account' in normalized_for_withdrawal_check) or
        ('take out' in normalized_for_withdrawal_check and ('account' in normalized_for_withdrawal_check or 'money' in normalized_for_withdrawal_check)) or
        ('takeout' in normalized_for_withdrawal_check and ('account' in normalized_for_withdrawal_check or 'money' in normalized_for_withdrawal_check))):
        return None, 0.35  # Return uncategorized for withdrawals
    
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
            "currencyConfidence": metadata.currency_confidence,
            "currencyDetectionMethod": metadata.currency_detection_method,
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

