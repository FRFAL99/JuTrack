import { tagKey } from '@jutrack/core';

/**
 * Le due regole della sezione «Informazioni aggiuntive».
 *
 * Fuori dal componente per la stessa ragione di `split-text.ts`: sono le uniche parti che
 * potevano essere sbagliate, e i test dell'app non caricano `react-native`.
 */

/**
 * Quanto del nome del negozio entra nella riga chiusa.
 *
 * Il `numberOfLines={1}` del `Text` impedirebbe già l'a capo, ma taglierebbe **la fine**
 * della stringa — cioè proprio il «· 2 tag», che è l'informazione che dice che lì sotto c'è
 * dell'altro. Troncando il negozio si perde la coda del nome, che è la parte che importa
 * meno.
 */
const MAX_STORE_CHARS = 20;

/**
 * Il riassunto della riga chiusa: «Esselunga · 2 tag», oppure «Facoltativi».
 *
 * Nascondere dietro una tendina muta dei campi **compilati** è il modo in cui i dati si
 * perdono senza che nessuno se ne accorga: chi riapre una spesa vecchia per correggerla
 * deve vedere dalla riga chiusa che lì sotto c'è qualcosa.
 */
export function extraSummary(store: string, tags: string[]): string {
  const name = truncate(store.trim());
  const count = tags.filter((tag) => tag.trim() !== '').length;
  // «tag» è invariabile in italiano: nessun plurale da costruire.
  const tagged = count === 0 ? '' : `${count} tag`;

  if (name !== '' && tagged !== '') return `${name} · ${tagged}`;
  if (name !== '') return name;
  if (tagged !== '') return tagged;
  return 'Facoltativi';
}

/**
 * Le pillole da mostrare: prima i tag scelti, poi quelli già usati nel gruppo.
 *
 * I tag scelti stanno in cima perché sono lo **stato** della spesa che si sta scrivendo, e
 * devono restare visibili senza scorrere quando i suggerimenti sono molti. Il confronto è
 * sulla chiave, come ovunque per i tag: uno appena scritto come `Regalo` non deve
 * ricomparire più sotto perché nel gruppo esiste già come `regalo`.
 */
export function tagChoices(chosen: string[], known: string[]): string[] {
  const seen = new Set(chosen.map(tagKey));
  const out = [...chosen];
  for (const tag of known) {
    const key = tagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** Taglia per grafemi e non per unità UTF-16: `name[0]` spezzerebbe una coppia surrogata. */
function truncate(value: string): string {
  const chars = Array.from(value);
  return chars.length <= MAX_STORE_CHARS
    ? value
    : chars.slice(0, MAX_STORE_CHARS).join('').trimEnd() + '…';
}
