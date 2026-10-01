import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('./db', () => ({ db: {} }));

import { buildTranslationMemory, translateDescription } from '@/lib/statement-translation';

describe('translateDescription', () => {
  it('translates known Georgian segments and keeps merchant names and dates as they are', () => {
    expect(translateDescription('გადახდა - YAKUDZA EAST POINT LTD 12.10.2025')).toBe('Payment - YAKUDZA EAST POINT LTD 12.10.2025');
    expect(translateDescription('ტელეფონი,ინტერნეტი - მაგთი - ოპტიკური ინტერნეტი - 328647755')).toBe(
      'Telephone, Internet - Magti - Optical Internet - 328647755',
    );
  });

  it('transliterates unknown Georgian text instead of leaving it unreadable', () => {
    expect(translateDescription('გადახდა - ნიკორა 01.02.2026')).toBe('Payment - nikora 01.02.2026');
  });

  it('prefers the English a user already had for the same description or segment', () => {
    const memory = buildTranslationMemory([
      { description: 'ჩემი კაფე', translatedDescription: 'My cafe' },
      { description: 'გადახდა - ბაზარი 01.01.2026', translatedDescription: 'Pay - Market 01.01.2026' },
      { description: 'გადახდა - ბაზარი 02.01.2026', translatedDescription: 'Pay - Market 02.01.2026' },
      { description: 'untranslated', translatedDescription: 'untranslated' },
    ]);
    expect(translateDescription('ჩემი კაფე', memory)).toBe('My cafe');
    expect(translateDescription('გადახდა - ბაზარი 05.03.2026', memory)).toBe('Pay - Market 05.03.2026');
  });

  it('leaves text without Georgian letters untouched', () => {
    expect(translateDescription('Payment - Netflix 01.01.2026')).toBe('Payment - Netflix 01.01.2026');
  });
});
