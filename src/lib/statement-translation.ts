import { db } from './db';

/**
 * Fills in English text for imported statement rows that the PDF service could not translate.
 *
 * The PDF service translates with Google's free web endpoint, which blocks busy IPs (Render's shared
 * ones included), so rows often come back still in Georgian. Merchant matching and learned merchants
 * work on the English text, so each Georgian segment of a description ("payment - MERCHANT - date"
 * style, split on " - ") is resolved in this order:
 *   1. the user's own earlier imports, so a phrase gets exactly the English it had before;
 *   2. a glossary of common Georgian banking and utility phrases;
 *   3. Latin transliteration, so unknown names stay readable and consistent between imports.
 * Segments without Georgian letters (merchant names, dates) are kept as they are.
 */
export async function fillMissingTranslations<T extends TranslatableRow>(userId: number, rows: T[]): Promise<T[]> {
  const needsWork = rows.some(needsTranslation);
  if (!needsWork) return rows;

  const memory = await loadTranslationMemory(userId);
  return rows.map((row) => {
    if (!needsTranslation(row)) return row;
    const translated = translateDescription(row.description, memory);
    return { ...row, translatedDescription: translated };
  });
}

/** Pure translation of one description; exported for tests. */
export function translateDescription(description: string, memory: TranslationMemory = EMPTY_MEMORY): string {
  const trimmed = description.trim();
  const remembered = memory.descriptions.get(trimmed);
  if (remembered) return remembered;

  const segments = trimmed.split(SEGMENT_SEPARATOR);
  const translatedSegments = segments.map((segment) => translateSegment(segment.trim(), memory));
  return translatedSegments.join(SEGMENT_SEPARATOR);
}

/** Builds the memory from description/translation pairs; exported for tests. */
export function buildTranslationMemory(pairs: { description: string; translatedDescription?: string | null }[]): TranslationMemory {
  const descriptions = new Map<string, string>();
  const segmentVotes = new Map<string, Map<string, number>>();

  for (const pair of pairs) {
    const description = pair.description?.trim();
    const translated = pair.translatedDescription?.trim();
    if (!description || !translated || translated === description || hasGeorgian(translated)) continue;

    descriptions.set(description, translated);
    const sourceSegments = description.split(SEGMENT_SEPARATOR);
    const targetSegments = translated.split(SEGMENT_SEPARATOR);
    if (sourceSegments.length !== targetSegments.length) continue;

    sourceSegments.forEach((segment, index) => {
      const source = splitTrailingDate(segment.trim()).core;
      if (!hasGeorgian(source)) return;
      const target = splitTrailingDate(targetSegments[index].trim()).core;
      const votes = segmentVotes.get(source) ?? new Map<string, number>();
      votes.set(target, (votes.get(target) ?? 0) + 1);
      segmentVotes.set(source, votes);
    });
  }

  const segments = new Map<string, string>();
  for (const [source, votes] of segmentVotes) {
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    segments.set(source, best[0]);
  }
  return { descriptions, segments };
}

export function hasGeorgian(text: string): boolean {
  return GEORGIAN_LETTER.test(text);
}

export type TranslationMemory = { descriptions: Map<string, string>; segments: Map<string, string> };

type TranslatableRow = { description: string; translatedDescription?: string | null };

const SEGMENT_SEPARATOR = ' - ';
const GEORGIAN_LETTER = /[\u10A0-\u10FF]/;
const TRAILING_DATE = /\s+(\d{2}\.\d{2}\.\d{4})$/;
const MEMORY_JOB_LIMIT = 20;
const EMPTY_MEMORY: TranslationMemory = { descriptions: new Map(), segments: new Map() };

// Common phrases on Georgian bank statements (MyCredo, TBC, Bank of Georgia) and utility payees.
// English wording matches what earlier imports produced, so learned merchants keep matching.
const GLOSSARY: Record<string, string> = {
  'გადახდა': 'Payment',
  'საბარათე ოპერაცია': 'Card operation',
  'ელექტრონული ყულაბის სერვისით ანაბარზე თანხის დამატება': 'Adding money to the deposit with the electronic wallet service',
  'ლარის გადარიცხვის საკომისიო': 'GEL transfer fee',
  'განაღდება': 'Withdrawal',
  'უნაღდო კონვერტაცია': 'Cashless conversion',
  'თანხის გატანა ანგარიშიდან.': 'Withdraw money from the account.',
  'ბარათზე თანხის ჩარიცხვა': 'Transfer money to the card',
  'სწრაფი გადახდის აპარატით თანხის შეტანა': 'Depositing money with a fast payment device',
  'ანგარიშზე თანხის შეტანა.': 'Deposit money to the account.',
  'ანგარიშზე თანხის შეტანა.გზავნილის თანხა': 'Depositing money into the account. Remittance amount',
  'სხვა და სხვა საკომისიო': 'Various fees',
  'საკომისიო': 'Fee',
  'თანხის გადარიცხვა': 'Money transfer',
  'ხელფასი': 'Salary',
  'კონვერტაცია': 'Conversion',
  'დაბრუნება': 'Refund',
  'სხვადასხვა': 'Various',
  'ტელეფონი,ინტერნეტი': 'Telephone, Internet',
  'ოპტიკური ინტერნეტი': 'Optical Internet',
  'მობილური': 'Mobile',
  'მაგთი': 'Magti',
  'დასუფთავება': 'Cleaning',
  'გაზი': 'Gas',
  'წყალი': 'Water',
  'ელ.ენერგია': 'E-energy',
  'თბილისი ენერჯი': 'Tbilisi Energy',
  'თელმიკო': 'Telmiko',
  'შპს თელმიკო (ელექტროენერგია)': 'LLC Telmiko (electricity)',
  'თბილსერვის ჯგუფი': 'Tbilserv Group',
  'ოლ სერვის გრუპი': 'All Service Group',
  'ჯორჯიან უოთერ ენდ ფაუერი': 'Georgian Water and Power',
  'GWP წყლის გადასახადი': 'GWP Water Bill',
  'ზალატაია კარონა RU': 'Zolotaya Korona RU',
};

// Georgian national transliteration, without the apostrophes that mark ejectives.
const TRANSLITERATION: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
  'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
  'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts',
  'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
};

function needsTranslation(row: TranslatableRow): boolean {
  const current = row.translatedDescription || row.description;
  return hasGeorgian(current);
}

function translateSegment(segment: string, memory: TranslationMemory): string {
  if (!hasGeorgian(segment)) return segment;
  const { core, date } = splitTrailingDate(segment);
  const translatedCore = memory.segments.get(core) ?? GLOSSARY[core] ?? transliterate(core);
  return date ? `${translatedCore} ${date}` : translatedCore;
}

/** "MAGNITI 25.03.2025" -> { core: "MAGNITI", date: "25.03.2025" }; the date varies, the merchant does not. */
function splitTrailingDate(segment: string): { core: string; date: string | null } {
  const match = TRAILING_DATE.exec(segment);
  if (!match) return { core: segment, date: null };
  return { core: segment.slice(0, match.index).trim(), date: match[1] };
}

function transliterate(text: string): string {
  let result = '';
  for (const char of text) {
    result += TRANSLITERATION[char] ?? char;
  }
  return result;
}

async function loadTranslationMemory(userId: number): Promise<TranslationMemory> {
  const jobs = await db.pdfProcessingJob.findMany({
    where: { userId, status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: MEMORY_JOB_LIMIT,
    select: { result: true },
  });

  const pairs: TranslatableRow[] = [];
  for (const job of jobs) {
    const result = job.result as { transactions?: TranslatableRow[] } | null;
    const transactions = Array.isArray(result?.transactions) ? result.transactions : [];
    pairs.push(...transactions);
  }
  return buildTranslationMemory(pairs);
}
