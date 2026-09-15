/**
 * Una frase diventa una spesa: i tipi.
 *
 * Il modulo `parse/` sta accanto a `insights/` e non dentro, perché le due cose guardano
 * in direzioni opposte: `insights` chiede «che numero esce dalle spese che esistono», qui
 * da un testo si propone una spesa che **non esiste ancora**. L'unica lista che si legge è
 * il vocabolario del gruppo, e non la si scandisce: arriva già pronta nel `ParseContext`.
 *
 * Vale la regola dello Step 0 come per tutto il core: qui non entra `react-native`, non
 * entra `i18next`, e nemmeno una stringa italiana — le parole stanno tutte nel `Lexicon`,
 * che è un parametro. Da `insights/` si importano soltanto `naming` e `calendar`: il
 * giorno in cui servisse `query` o `breakdown`, vorrebbe dire che questo modulo sta
 * facendo il mestiere sbagliato.
 */
import type { Cents } from '../model/money';
import type { Category, IsoDate, Member, SplitMode } from '../model/types';

/**
 * Cosa il gruppo sa già, nel momento in cui la frase viene scritta.
 *
 * `stores` e `tags` sono il vocabolario **nella grafia da usare**: la bozza propone quella,
 * non quella digitata, perché è così che «esselunga» e «Esselunga» restano un negozio solo
 * (la ragione è in testa a `insights/naming.ts`).
 *
 * Costruirlo costa una scansione delle spese — `knownStores` e `knownTags` — e per questo
 * si costruisce quando cambiano le spese, non quando cambia la frase.
 */
export interface ParseContext {
  /** Il giorno di oggi, `YYYY-MM-DD`. Nessuna data riconosciuta potrà superarlo. */
  today: IsoDate;
  members: Member[];
  /** Chi sta scrivendo: è la persona a cui risolvono «io», «me», «mio». */
  myMemberId: string;
  /** Le categorie proponibili. Quelle archiviate si ignorano. */
  categories: Category[];
  /** I negozi che il gruppo usa già, nella grafia da proporre. */
  stores: string[];
  /** I tag che il gruppo usa già, nella grafia da proporre. */
  tags: string[];
}

/** I campi di una bozza che possono portare un segno sulla frase. */
export type DraftField = 'amount' | 'date' | 'category' | 'store' | 'tag' | 'paidBy' | 'split';

/**
 * Da quali caratteri della frase viene un campo.
 *
 * Gli offset sono sul **testo originale**, quello che l'utente ha davanti, non su una
 * versione ripulita: l'evidenziazione deve combaciare con ciò che è stato scritto anche
 * quando fra due parole ci sono due spazi. Gli estremi nascono solo su confini di token,
 * così non spezzano mai una coppia surrogata.
 *
 * La nota non ha segni di proposito: un segno vuol dire «questo l'ho capito», e la nota è
 * per definizione ciò che resta.
 */
export interface DraftMark {
  field: DraftField;
  /** Primo carattere, incluso. */
  start: number;
  /** Ultimo carattere, escluso. */
  end: number;
}

/** Come si divide, per quel tanto che una frase può dirlo. */
export interface DraftSplit {
  mode: SplitMode;
  /** Per `single`: chi se la prende tutta. `null` per gli altri modi. */
  memberId: string | null;
}

/**
 * Ciò che la grammatica ha capito. **Non è una spesa** e non tocca il documento.
 *
 * Entra nel vault solo passando per il form e il suo `onSubmit`, come qualunque spesa
 * scritta a mano: la normalizzazione di negozio e tag avviene in un punto solo, in
 * scrittura, e una seconda porta d'ingresso sarebbe una seconda regola da tenere
 * allineata alla prima. E poi una lettura sbagliata che si salva da sola è molto peggio
 * di una che si vede prima.
 *
 * Ogni campo può restare vuoto, e restare vuoto è il caso normale: sotto c'è il tastierino
 * di sempre.
 */
export interface ExpenseDraft {
  /** La frase da cui viene, così com'è stata scritta. Gli offset dei segni sono su questa. */
  text: string;
  amountCents: Cents | null;
  /**
   * Sono rimasti due numeri nudi e nessuno dei due è marcato come importo.
   *
   * Non si tira a indovinare: `amountCents` resta `null` e chi mostra la bozza lo dice.
   * L'imprevedibilità è peggio dell'assenza — chi non si fida di ciò che compare smette
   * di usarlo.
   */
  amountAmbiguous: boolean;
  date: IsoDate | null;
  categoryId: string | null;
  /** Stringa vuota se non è stato riconosciuto alcun negozio del vocabolario. */
  store: string;
  tags: string[];
  paidBy: string | null;
  split: DraftSplit | null;
  /** Tutto ciò che non è stato capito, ripulito con `tidy`. */
  note: string;
  /** In ordine di comparsa nella frase. */
  marks: DraftMark[];
}

/**
 * Le parole di una lingua. L'italiano è `ITALIAN_LEXICON`; l'inglese è un file che ancora
 * non esiste.
 *
 * È la stessa forma di `QueryStrings` in `insights/query.ts`, che il progetto ha già scelto
 * una volta. Una grammatica **è** una lingua: spedire un lessico inglese scritto senza
 * averlo mai usato in inglese significherebbe promettere una superficie mai provata.
 *
 * Ogni voce è una sequenza di parole già ripiegata — minuscola e senza accenti — perché è
 * in quella forma che i token si confrontano. Una voce può contenere spazi: «l'altro ieri»
 * vale quanto «ieri».
 */
export interface Lexicon {
  /** Oggi. */
  today: string[];
  /** Il giorno prima. */
  yesterday: string[];
  /** Due giorni prima. */
  beforeYesterday: string[];
  /** Sette elenchi, **0 = lunedì**, come `dayOfWeek`. */
  weekdays: string[][];
  /** Dodici elenchi, 0 = gennaio. */
  months: string[][];
  /** Parole che possono precedere un giorno del mese: «il 3», «del 3». */
  dayPrefixes: string[];
  /** Si lasciano consumare dopo un giorno della settimana: «venerdì scorso». */
  past: string[];
  /** Marcatori di valuta: rendono un numero un importo anche se non è l'unico. */
  currency: string[];
  /** Divisione in parti uguali: «metà», «mezzo». */
  equalSplit: string[];
  /** Interamente a carico di qualcuno: «tutto», «tutta». */
  wholeSplit: string[];
  /** Preposizioni che legano una persona a una divisione: «a», «per». */
  toward: string[];
  /** Marcatori di chi ha materialmente pagato: «pagato», «paga», «offre». */
  paid: string[];
  /** Si lascia consumare fra un marcatore di pagamento e la persona: «da». */
  by: string[];
  /** Pronomi che valgono sempre e risolvono a chi scrive. */
  me: string[];
  /** Pronomi che si risolvono **solo** in un gruppo di due. */
  you: string[];

  // Da qui in giù: le parole che servono solo alla **domanda**, non alla spesa.
  // Stanno nello stesso lessico perché sono la stessa lingua, e un secondo file vorrebbe
  // dire due elenchi di sinonimi che divergono — la ragione per cui `parseExpense` e
  // `parseQuery` condividono tokenizzatore e riconoscitori invece di somigliarsi.

  /** I sei preset del periodo, ognuno con le frasi che lo nominano. */
  periods: {
    last7: string[];
    last30: string[];
    thisMonth: string[];
    lastMonth: string[];
    last12Months: string[];
    thisYear: string[];
  };
  /** «ultimi», che apre un conteggio: «ultimi 15 giorni». */
  lastN: string[];
  /** Le unità di un conteggio all'indietro. */
  units: { days: string[]; months: string[] };
  /** Si lascia consumare davanti a un mese o a un anno: «ad agosto», «nel 2025». */
  inTime: string[];
  /** Apre una soglia minima: «sopra i 50». */
  above: string[];
  /** Apre una soglia massima: «sotto i 20». */
  below: string[];
  /** Apre una coppia di soglie: «fra 10 e 50». */
  between: string[];
  /** Separa i due estremi di «fra 10 e 50». */
  and: string[];
  /** Articoli e preposizioni che stanno fra un marcatore e il suo numero: «sopra **i** 50». */
  articles: string[];
  /** Chiede le spese **a carico** di qualcuno, invece che pagate da qualcuno. */
  owed: string[];
}
