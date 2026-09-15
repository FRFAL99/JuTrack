/**
 * Le parole italiane della grammatica. **Solo qui.**
 *
 * Nessuna stringa italiana finisce nel codice dei riconoscitori: se ce ne fosse anche una,
 * il file inglese — il giorno che servisse — non basterebbe ad aggiungere l'inglese, e lo
 * si scoprirebbe soltanto provandolo.
 *
 * Le voci sono già ripiegate: minuscole, senza accenti, con l'apostrofo dritto. È la forma
 * in cui `tokens.ts` consegna le parole, e confrontare due forme diverse è il modo più
 * silenzioso di non riconoscere niente. Quindi «metà» si scrive `meta` e «lunedì» `lunedi`.
 */
import type { Lexicon } from './types';

export const ITALIAN_LEXICON: Lexicon = {
  today: ['oggi', 'stamattina', 'stamane', 'stasera', 'stanotte'],
  yesterday: ['ieri', 'ierisera'],
  // «l'altro ieri» arriva come due token, e la voce con lo spazio li copre tutti e due.
  beforeYesterday: ["l'altro ieri", 'altro ieri', 'altroieri'],
  weekdays: [
    ['lunedi'],
    ['martedi'],
    ['mercoledi'],
    ['giovedi'],
    ['venerdi'],
    ['sabato'],
    ['domenica'],
  ],
  months: [
    ['gennaio', 'gen'],
    ['febbraio', 'feb'],
    ['marzo', 'mar'],
    ['aprile', 'apr'],
    ['maggio', 'mag'],
    ['giugno', 'giu'],
    ['luglio', 'lug'],
    ['agosto', 'ago'],
    ['settembre', 'set'],
    ['ottobre', 'ott'],
    ['novembre', 'nov'],
    ['dicembre', 'dic'],
  ],
  // «l'» da solo esiste perché «l'8» si scrive attaccato e il tokenizzatore non spezza
  // dentro una parola: la voce serve alla forma staccata, «l 8», che capita scrivendo in
  // fretta.
  dayPrefixes: ['il', 'lo', "l'", 'l', 'del', 'dal', 'al', 'nel'],
  past: ['scorso', 'scorsa', 'passato', 'passata'],
  currency: ['euro', 'eur', '€'],
  equalSplit: ['meta', 'mezzo', 'mezza'],
  wholeSplit: ['tutto', 'tutta', 'tutti', 'intero', 'intera'],
  toward: ['a', 'ad', 'per'],
  paid: ['paga', 'pago', 'paghi', 'pagato', 'pagata', 'pagate', 'pagati', 'offre', 'offro'],
  by: ['da'],
  me: ['io', 'me', 'mio', 'mia', 'miei', 'mie'],
  you: ['te', 'tu', 'tuo', 'tua', 'tuoi', 'tue', 'ti'],

  periods: {
    last7: ['ultimi 7 giorni', 'ultimi sette giorni', 'ultima settimana'],
    last30: ['ultimi 30 giorni', 'ultimi trenta giorni'],
    thisMonth: ['questo mese', 'mese corrente', 'nel mese'],
    lastMonth: ['mese scorso', 'il mese scorso', 'lo scorso mese', 'mese passato'],
    last12Months: ['ultimi 12 mesi', 'ultimi dodici mesi', 'ultimo anno'],
    // «quest'anno» è un token solo: il tokenizzatore non spezza dentro una parola.
    thisYear: ["quest'anno", 'questo anno', 'anno corrente'],
  },
  lastN: ['ultimi', 'ultime'],
  units: { days: ['giorni', 'gg'], months: ['mesi'] },
  inTime: ['a', 'ad', 'in', 'nel', 'del', 'di', "dell'", 'per'],
  // «da» non c'è, e non è una svista: «spesa da esselunga» nomina un negozio, non una
  // soglia, ed è la frase del criterio di «fatto» dello step.
  above: ['sopra', 'oltre', 'piu di', 'maggiori di', 'superiori a'],
  below: ['sotto', 'meno di', 'fino a', 'inferiori a'],
  between: ['fra', 'tra'],
  and: ['e', 'ed'],
  articles: ['i', 'gli', 'le', 'il', 'lo', 'la', 'a', 'ai', 'alle', 'di', 'ad', "l'"],
  // Una frase intera e non «di»: «di» da solo aprirebbe «spesa di agosto» come una persona.
  owed: ['a carico di', 'a carico', 'per conto di'],
};
