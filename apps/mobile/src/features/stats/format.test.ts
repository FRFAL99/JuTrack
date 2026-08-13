import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { compactAmount, describeBudget, describeChange, formatShare } from './format';

describe('describeChange', () => {
  it('dice di quanto si è saliti o scesi', () => {
    expect(describeChange(12000, 10000, 'luglio')).toBe('+20% rispetto a luglio');
    expect(describeChange(8000, 10000, 'luglio')).toBe('-20% rispetto a luglio');
  });

  it('non calcola una percentuale su un mese a zero', () => {
    // Sarebbe una divisione per zero, e «+∞%» non è una frase.
    expect(describeChange(5000, 0, 'luglio')).toBe('Nulla speso in luglio');
    expect(describeChange(0, 0, 'luglio')).toBe('Nessuna spesa');
  });

  it('riconosce la parità', () => {
    expect(describeChange(10000, 10000, 'luglio')).toBe('Come in luglio');
    // Una differenza che arrotonda a zero è parità, non «+0%».
    expect(describeChange(10004, 10000, 'luglio')).toBe('Come in luglio');
  });
});

describe('compactAmount', () => {
  it('mostra euro interi', () => {
    expect(compactAmount(1250)).toBe('13');
    expect(compactAmount(0)).toBe('0');
  });

  it('abbrevia le migliaia con la virgola italiana', () => {
    expect(compactAmount(123456)).toBe('1,2k');
    expect(compactAmount(100000)).toBe('1,0k');
  });
});

describe('formatShare', () => {
  it('arrotonda a percentuale intera', () => {
    expect(formatShare(0.257)).toBe('26%');
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(1)).toBe('100%');
  });
});

describe('describeBudget', () => {
  it('dice sempre un importo, non solo uno stato', () => {
    // Il colore da solo non informa chi non lo distingue.
    expect(describeBudget('over', -1200)).toContain('12,00');
    expect(describeBudget('near', 1200)).toContain('12,00');
    expect(describeBudget('under', 1200)).toContain('12,00');
  });

  it('parla di superamento solo quando il limite è stato superato', () => {
    expect(describeBudget('over', -500)).toMatch(/Superato/);
    expect(describeBudget('under', 500)).toMatch(/Restano/);
  });
});

describe('in inglese', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('abbrevia le migliaia col punto decimale, non con la virgola', () => {
    // «1,2k» in inglese si legge come milleduecento scritto male. Il separatore arriva dallo
    // stesso `numberFormat()` degli importi interi, non da una seconda regola scritta qui.
    expect(compactAmount(123_456)).toBe('1.2k');
    expect(compactAmount(1_234_567)).toBe('12.3k');
  });

  it('non tocca le migliaia sotto il migliaio', () => {
    expect(compactAmount(1250)).toBe('13');
  });

  it('scrive gli importi del budget nel formato giusto', () => {
    expect(describeBudget('over', -1500)).toContain('€15.00');
    expect(describeBudget('under', 1500)).toContain('€15.00');
  });
});
