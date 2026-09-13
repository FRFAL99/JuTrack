import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { categorySummary, detailsSummary, payerSummary } from './group-summary';

/** Il riassunto come si legge a schermo, coi pezzi uniti dal punto mediano. */
function read(parts: { text: string }[]): string {
  return parts.map((p) => p.text).join(' · ');
}

const NOW = new Date(2026, 8, 13, 12); // 13 settembre 2026

describe('payerSummary', () => {
  it('dice chi paga e come si divide', () => {
    expect(read(payerSummary({ name: 'Io', isMe: true }, 'equal', 2))).toBe(
      'Paghi tu · metà e metà',
    );
  });

  it('chiama per nome chi non sono io', () => {
    expect(read(payerSummary({ name: 'Anna', isMe: false }, 'equal', 2))).toBe(
      'Paga Anna · metà e metà',
    );
  });

  it('in tre non dice metà e metà', () => {
    // `splitModeLabel` lo sapeva già: con tre persone quella frase sarebbe falsa, e su
    // un app di conti una frase falsa accanto a un numero è peggio di una lunga.
    expect(read(payerSummary({ name: 'Io', isMe: true }, 'equal', 3))).toBe(
      'Paghi tu · in parti uguali',
    );
  });

  it('copre le altre due modalità', () => {
    expect(read(payerSummary({ name: 'Io', isMe: true }, 'custom', 2))).toBe('Paghi tu · quote');
    expect(read(payerSummary({ name: 'Io', isMe: true }, 'single', 2))).toBe(
      'Paghi tu · solo chi paga',
    );
  });

  it('nessuno dei due pezzi è un segnaposto', () => {
    // Chi paga e come si divide sono **sempre** decisi, anche quando nessuno li ha
    // toccati: hanno un default. `textFaint` qui direbbe il falso.
    expect(payerSummary({ name: 'Io', isMe: true }, 'equal', 2).map((p) => p.tone)).toEqual([
      'strong',
      'muted',
    ]);
  });
});

describe('categorySummary', () => {
  it('scelta, la riga è la categoria', () => {
    expect(categorySummary('Casa')).toEqual([{ text: 'Casa', tone: 'strong' }]);
  });

  it('non scelta, lo dice invece di lasciare la riga muta', () => {
    expect(read(categorySummary(null))).toBe('Categoria · nessuna');
  });

  it('solo il posto vuoto è faint', () => {
    expect(categorySummary(null).map((p) => p.tone)).toEqual(['strong', 'faint']);
    expect(categorySummary('Casa').map((p) => p.tone)).toEqual(['strong']);
  });
});

describe('detailsSummary', () => {
  it('senza niente dice la data e che il resto è facoltativo', () => {
    expect(read(detailsSummary('2026-09-13', '', [], NOW))).toBe('Oggi · facoltativi');
  });

  it('la data non è mai un segnaposto', () => {
    // Su una spesa vecchia è l'unica cosa che dice di quale giorno si sta parlando.
    expect(detailsSummary('2026-09-13', '', [], NOW)[0]).toEqual({ text: 'Oggi', tone: 'muted' });
  });

  it('non parla della nota, che ora è un campo principale', () => {
    // Dopo la prova su telefono la nota è uscita dal gruppo: dirlo qui per una cosa che si
    // vede due righe sopra sarebbe rumore.
    expect(read(detailsSummary('2026-09-13', '', [], NOW))).not.toContain('nota');
  });

  it('riusa extraSummary per negozio e tag', () => {
    expect(read(detailsSummary('2026-09-13', 'Esselunga', ['casa', 'regalo'], NOW))).toBe(
      'Oggi · Esselunga · 2 tag',
    );
  });

  it('non conta tag vuoti', () => {
    expect(read(detailsSummary('2026-09-13', '', ['', '  '], NOW))).toBe('Oggi · facoltativi');
  });

  it('una data vecchia la scrive per esteso', () => {
    expect(read(detailsSummary('2026-08-15', '', [], NOW))).toBe('sabato 15 agosto · facoltativi');
  });

  it('solo il posto vuoto è faint', () => {
    expect(detailsSummary('2026-09-13', '', [], NOW).map((p) => p.tone)).toEqual([
      'muted',
      'faint',
    ]);
    expect(detailsSummary('2026-09-13', 'Coop', [], NOW).map((p) => p.tone)).toEqual([
      'muted',
      'muted',
    ]);
  });
});

describe('in inglese', () => {
  afterEach(async () => {
    await i18n.changeLanguage('it');
  });

  it('traduce tutte e tre le righe', async () => {
    await i18n.changeLanguage('en');
    expect(read(payerSummary({ name: 'Anna', isMe: false }, 'equal', 2))).toBe(
      'Anna pays · half and half',
    );
    expect(read(categorySummary(null))).toBe('Category · none');
    expect(read(detailsSummary('2026-09-13', '', [], NOW))).toBe('Today · optional');
  });
});
