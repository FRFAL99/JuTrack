/**
 * La grammatica della frase, provata dalla tastiera.
 *
 *     npm run frase -- "25 spesa esselunga ieri metà a te"
 *
 * Lo Step 67 non ha niente a schermo, quindi il gesto con cui si verifica non è sul
 * telefono: è questo. Stampa la bozza che `parseExpense` ricava da una frase, campo per
 * campo, e sotto la frase stessa con i caratteri che ogni riconoscitore si è preso —
 * l'anteprima che lo Step 68 mostrerà a colori, qui in bianco e nero.
 *
 * Il gruppo è finto ma realistico: due membri, cinque categorie, tre negozi e due tag già
 * usati. Serve perché **la grammatica non inventa niente**: un negozio che il gruppo non
 * conosce resta una parola qualunque, e senza un vocabolario da cui pescare la prova non
 * direbbe nulla.
 *
 * `--oggi=AAAA-MM-GG` fissa il giorno, così una frase con «ieri» dà lo stesso risultato
 * domani.
 */
import {
  formatMoney,
  parseExpense,
  type DraftField,
  type ExpenseDraft,
  type ParseContext,
} from '@jutrack/core';

const GRUPPO: Omit<ParseContext, 'today'> = {
  members: [
    { id: 'm1', name: 'Fra', color: '#4c8bf5' },
    { id: 'm2', name: 'Giulia', color: '#e0645a' },
  ],
  myMemberId: 'm1',
  categories: [
    { id: 'c1', name: 'Spesa', icon: '🛒', color: '#4c8bf5', archived: false },
    { id: 'c2', name: 'Casa', icon: '🏠', color: '#7bc67b', archived: false },
    { id: 'c3', name: 'Trasporti', icon: '🚌', color: '#e0645a', archived: false },
    { id: 'c4', name: 'Svago', icon: '🎬', color: '#f5b74c', archived: false },
    { id: 'c5', name: 'Ristorante', icon: '🍝', color: '#c47bd6', archived: false },
  ],
  stores: ['Esselunga', 'Conad', 'Mercato Centrale'],
  tags: ['regalo', 'vacanza'],
};

/** Il simbolo con cui ogni campo si firma sotto la frase. */
const SEGNI: Record<DraftField, string> = {
  amount: '€',
  date: 'D',
  category: 'C',
  store: 'N',
  tag: '#',
  paidBy: 'P',
  split: '/',
};

function main(): void {
  const argomenti = process.argv.slice(2);
  const oggi = argomenti.find((a) => a.startsWith('--oggi='))?.slice('--oggi='.length);
  const frase = argomenti.filter((a) => !a.startsWith('--')).join(' ');

  if (frase.trim() === '') {
    console.error('Uso: npm run frase -- "25 spesa esselunga ieri metà a te" [--oggi=2026-09-15]');
    process.exit(1);
  }

  const context: ParseContext = { ...GRUPPO, today: oggi ?? new Date().toISOString().slice(0, 10) };
  stampa(parseExpense(frase, context), context);
}

function stampa(bozza: ExpenseDraft, context: ParseContext): void {
  console.log('');
  console.log(`  ${bozza.text}`);
  console.log(`  ${sottolineatura(bozza)}`);
  console.log('');

  for (const [etichetta, valore] of righe(bozza, context)) {
    console.log(`  ${etichetta.padEnd(11)}${valore}`);
  }
  console.log('');
}

/** Una riga di simboli sotto la frase: chi ha capito cosa, e dove. */
function sottolineatura(bozza: ExpenseDraft): string {
  const caselle = [...bozza.text].map(() => ' ');
  for (const mark of bozza.marks) {
    for (let i = mark.start; i < mark.end; i++) caselle[i] = SEGNI[mark.field];
  }
  return caselle.join('');
}

function righe(bozza: ExpenseDraft, context: ParseContext): [string, string][] {
  const nome = (id: string | null): string => context.members.find((m) => m.id === id)?.name ?? '—';
  const categoria = context.categories.find((c) => c.id === bozza.categoryId);

  return [
    [
      'Importo',
      bozza.amountCents === null
        ? bozza.amountAmbiguous
          ? '— (due numeri: non si indovina)'
          : '—'
        : formatMoney(bozza.amountCents),
    ],
    ['Data', bozza.date ?? '—'],
    ['Categoria', categoria === undefined ? '—' : `${categoria.icon} ${categoria.name}`],
    ['Negozio', bozza.store === '' ? '—' : bozza.store],
    ['Tag', bozza.tags.length === 0 ? '—' : bozza.tags.join(', ')],
    ['Pagata da', bozza.paidBy === null ? '—' : nome(bozza.paidBy)],
    ['Divisione', divisione(bozza, nome)],
    ['Nota', bozza.note === '' ? '—' : bozza.note],
  ];
}

function divisione(bozza: ExpenseDraft, nome: (id: string | null) => string): string {
  if (bozza.split === null) return '—';
  if (bozza.split.mode === 'equal') return 'a metà';
  if (bozza.split.mode === 'single') return `tutta a ${nome(bozza.split.memberId)}`;
  return 'quote';
}

main();
