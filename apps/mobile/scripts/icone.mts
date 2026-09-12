/**
 * Rigenera i PNG di `assets/` dal solo `assets/icon-source.svg`.
 *
 * Esiste perche' la prima versione di questo script non e' mai stata committata: i
 * PNG dell'icona definitiva sono entrati nel repo il 5 settembre 2026 insieme al
 * vettoriale, ma senza il programma che li produce, mentre la documentazione li
 * dichiarava «rigenerabili». Per un mese e' stata un'affermazione senza codice sotto.
 *
 * Due regole che vengono da altrettanti difetti gia' pagati:
 *
 * 1. **I colori si leggono dal file, non si scrivono qui.** La prima versione li
 *    aveva dentro, e il risultato e' stato un sorgente che diceva indaco e dei PNG
 *    che restavano viola — un difetto che nessun test puo' vedere.
 * 2. **Ogni estrazione asserisce.** Se l'SVG cambia forma e un id non si trova piu',
 *    lo script muore con un messaggio invece di produrre un'icona muta: un fondo
 *    trasparente o un segno mancante si notano solo guardando l'immagine, cioe' mai.
 *
 * Uso:
 *   npm run icone              rigenera i sette PNG
 *   npm run icone -- --verifica  confronta senza scrivere, esce 1 se divergono
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
/** Gli asset del negozio non stanno in `assets/`: non entrano nell'app, ci vanno caricati
 *  a mano nel Play Console, e tenerli separati evita di gonfiare il bundle. */
const NEGOZIO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'store');
const SORGENTE = join(ASSETS, 'icon-source.svg');

/** Il segno e' disegnato su una tela di 1024: e' la risoluzione a cui si rasterizza
 *  una volta sola, per poi ridurre. Ridurre da un master grande da' bordi migliori
 *  che rasterizzare tre volte a densita' diverse. */
const TELA = 1024;

function estrai(svg: string, re: RegExp, cosa: string): RegExpMatchArray {
  const m = svg.match(re);
  if (!m) {
    throw new Error(
      `icon-source.svg non contiene piu' ${cosa}. Lo script non sa piu' comporre le ` +
        `varianti: aggiornare le espressioni in icone.mts insieme al vettoriale.`,
    );
  }
  return m;
}

/** `<rect id="ground" ... fill="#RRGGBB"/>`: il fondo bianco caldo del disegno. */
const RE_FONDO = /<rect id="ground"[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*\/>/;
/** `<g id="mark"> ... </g>`: il segno, cioe' la lente col buco della J. */
const RE_SEGNO = /<g id="mark">[\s\S]*?<\/g>/;

type Variante = {
  readonly file: string;
  /** Dove scrivere. Di default `assets/`. */
  readonly dove?: string;
  /** Lato del quadrato, oppure larghezza se c'e' `alto`. */
  readonly lato: number;
  readonly alto?: number;
  /** Se dato, l'alpha viene appiattito su questo colore e il PNG esce a tre canali. */
  readonly appiattisciSu?: string;
  readonly svg: (base: string, fondo: string) => string;
};

function varianti(fondo: string): readonly Variante[] {
  const completo = (s: string) => s;
  const soloSegno = (s: string) => s.replace(RE_FONDO, '');
  const soloFondo = (s: string) => s.replace(RE_SEGNO, '');

  return [
    // Quello che vede il launcher sui telefoni senza icone adattive, e la sorgente
    // di tutto il resto. Opaco: un'icona con alpha su Android 7 diventa un quadrato.
    { file: 'icon.png', lato: 1024, appiattisciSu: fondo, svg: completo },
    // La scheda del Play Store lo vuole 512 e **a 32 bit**, cioe' con il canale alpha
    // anche se e' opaco dappertutto: per questo non si appiattisce come `icon.png`.
    // Il fondo lo mette gia' il rettangolo `ground`, quindi l'immagine e' comunque piena.
    { file: 'playstore-512.png', lato: 512, svg: completo },
    { file: 'favicon.png', lato: 48, svg: completo },
    // I tre strati dell'icona adattiva. Android li compone e li ritaglia da se':
    // il segno deve stare nella zona sicura, ed e' la ragione della scala 1.18.
    { file: 'android-icon-background.png', lato: 512, svg: soloFondo },
    { file: 'android-icon-foreground.png', lato: 512, svg: soloSegno },
    // La silhouette della tendina delle notifiche e dell'icona a tema. Android la
    // ricolora, quindi il colore qui e' irrilevante: conta solo l'alpha, e la J deve
    // restare un buco. Bianco perche' e' cosi' che e' stata generata la prima volta.
    {
      file: 'android-icon-monochrome.png',
      lato: 432,
      svg: (s) => bianco(soloSegno(s)),
    },
    // Lo splash: solo il segno, su un fondo che mette app.json. Trasparente apposta,
    // cosi' lo stesso PNG serve al tema chiaro e a quello scuro.
    { file: 'splash-icon.png', lato: 1024, svg: soloSegno },
    // L'immagine in primo piano della scheda del Play Store: 1024x500, obbligatoria.
    // Non e' un asset dell'app, quindi va in `store/` e non in `assets/`.
    {
      file: 'feature-graphic-1024x500.png',
      dove: NEGOZIO,
      lato: 1024,
      alto: 500,
      appiattisciSu: fondo,
      svg: (s) => insegna(s, fondo),
    },
  ];
}

/**
 * L'insegna della scheda del Play Store: il segno a sinistra, il nome a destra.
 *
 * Riusa la geometria del vettoriale invece di ridisegnarla: `<defs>` porta la maschera
 * con la J, e il gruppo `mark` viene riscalato dentro la tela da 1024x500. Cosi' il
 * banner del negozio e l'icona non possono divergere, che e' l'unico modo di tenerli
 * uguali senza ricordarsi di farlo.
 *
 * **Il testo dipende da un font installato sulla macchina**, ed e' precisamente la
 * dipendenza invisibile che il commento dell'icona dice di evitare. Qui si accetta, per
 * due ragioni: l'insegna e' un asset del negozio che si carica una volta, e non entra
 * nell'app; e l'assenza del font non e' silenziosa, perche' `fontDisponibile()` la
 * ferma prima di disegnare invece di lasciare che ne venga sostituito un altro.
 */
function insegna(base: string, fondo: string): string {
  const defs = estrai(base, /<defs>[\s\S]*?<\/defs>/, 'il blocco <defs> con la maschera')[0];
  const segno = estrai(base, RE_SEGNO, 'il gruppo id="mark"')[0];

  // Il segno misura 370x514 dentro una tela di 1024, centrato in (512,512). Portato a
  // 300 di altezza sta nella fascia da 500 con un respiro di 100 sopra e sotto.
  const scala = 300 / 514;
  const centro = 512 * scala;
  // 248 e non 204: il blocco segno+testo misura circa 744 di larghezza, e centrarlo
  // sulla tela invece di appoggiarlo a sinistra lo tiene intero anche dove il Play
  // Store ritaglia l'insegna ai lati.
  const tx = 248 - centro;
  const ty = 250 - centro;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
${defs}
<rect width="1024" height="500" fill="${fondo}"/>
<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scala.toFixed(4)})">${segno}</g>
<text x="420" y="252" font-family="${FONT}" font-size="86" font-weight="700" fill="${INCHIOSTRO}">JuTrack</text>
<text x="422" y="304" font-family="${FONT}" font-size="28" font-weight="400" fill="${NEBBIA}">Dividi le spese. Cifrate sul telefono.</text>
</svg>`;
}

/** Il font dell'insegna. Vicino al carattere che Android usa dentro l'app, quindi il
 *  banner non stona con le schermate che gli stanno accanto sulla scheda. */
const FONT = 'Noto Sans';
const INCHIOSTRO = '#16171C';
const NEBBIA = '#6B7080';

/** Muore se il font non c'e', invece di lasciare che librsvg ne sostituisca un altro:
 *  una sostituzione non da' errore e si nota solo guardando l'immagine. */
function fontDisponibile(): boolean {
  try {
    const elenco = execFileSync('fc-list', [':', 'family'], { encoding: 'utf8' });
    return elenco.split(/[,\n]/).some((f) => f.trim() === FONT);
  } catch {
    return false;
  }
}

/** Ricolora di bianco il solo `fill` dentro `<g id="mark">`: quelli della maschera
 *  (#FFFFFF e #000000) non vanno toccati, o il buco della J si chiude. */
function bianco(svg: string): string {
  const blocco = estrai(svg, RE_SEGNO, 'il gruppo id="mark"')[0];
  const ricolorato = blocco.replace(/fill="#[0-9A-Fa-f]{6}"/, 'fill="#FFFFFF"');
  if (ricolorato === blocco) {
    throw new Error('Nessun fill da ricolorare dentro <g id="mark">.');
  }
  return svg.replace(blocco, ricolorato);
}

async function rendi(v: Variante, base: string, fondo: string): Promise<Buffer> {
  let img = sharp(Buffer.from(v.svg(base, fondo)), { density: 72 });
  const alto = v.alto ?? v.lato;
  if (v.lato !== TELA || v.alto !== undefined) img = img.resize(v.lato, alto, { fit: 'fill' });
  if (v.appiattisciSu) img = img.flatten({ background: v.appiattisciSu });
  return img.png({ compressionLevel: 9 }).toBuffer();
}

/** Scarto massimo per canale fra due PNG, decodificati in pixel grezzi. Confrontare
 *  i byte dei file direbbe «diversi» anche solo per un encoder aggiornato. */
async function scarto(a: Buffer, b: Buffer): Promise<number | 'formato'> {
  const [x, y] = await Promise.all([
    sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (x.data.length !== y.data.length) return 'formato';
  let max = 0;
  for (let i = 0; i < x.data.length; i++) {
    const d = Math.abs(x.data[i]! - y.data[i]!);
    if (d > max) max = d;
  }
  return max;
}

async function main(): Promise<void> {
  const verifica = process.argv.includes('--verifica');
  const base = await readFile(SORGENTE, 'utf8');
  const fondo = estrai(base, RE_FONDO, 'il rettangolo id="ground" con un fill esadecimale')[1]!;
  estrai(base, RE_SEGNO, 'il gruppo id="mark"');

  if (!fontDisponibile()) {
    throw new Error(
      `Il font «${FONT}» non e' installato: l'insegna del negozio uscirebbe con un ` +
        `carattere sostituito, e non lo direbbe nessuno. Installarlo, oppure cambiare ` +
        `FONT in icone.mts con uno presente in \`fc-list\`.`,
    );
  }

  console.log(`Sorgente: ${SORGENTE}`);
  console.log(`Fondo letto dal file: ${fondo}\n`);

  let divergenti = 0;
  for (const v of varianti(fondo)) {
    const prodotto = await rendi(v, base, fondo);
    const dove = join(v.dove ?? ASSETS, v.file);

    if (!verifica) {
      await mkdir(dirname(dove), { recursive: true });
      await writeFile(dove, prodotto);
      console.log(`  scritto  ${v.file.padEnd(30)} ${v.lato}x${v.alto ?? v.lato}`);
      continue;
    }

    let attuale: Buffer;
    try {
      attuale = await readFile(dove);
    } catch {
      console.log(`  ASSENTE  ${v.file}`);
      divergenti++;
      continue;
    }
    const d = await scarto(prodotto, attuale);
    const esito = d === 'formato' ? 'DIMENSIONI DIVERSE' : `scarto max ${d}`;
    if (d === 'formato' || d > 0) divergenti++;
    console.log(`  ${d === 0 ? 'uguale  ' : 'DIVERSO '} ${v.file.padEnd(30)} ${esito}`);
  }

  if (verifica && divergenti > 0) {
    console.log(`\n${divergenti} file divergono da quanto produce il sorgente.`);
    process.exit(1);
  }
  console.log(verifica ? '\nTutti i PNG combaciano col sorgente.' : '\nFatto.');
}

await main();
