/**
 * Verificatore di link e ancore per i documenti del repo.
 *
 *     npm run doc:verifica
 *
 * Controlla ogni link relativo fra i file markdown tracciati da git: che il file
 * esista, e — quando il link porta un'ancora verso un altro `.md` — che quel
 * titolo esista davvero. Esce con codice 1 se trova qualcosa.
 *
 * Serve perché un'ancora rotta in markdown non fa rumore: non rompe la CI, non dà
 * un 404, semplicemente porta in cima alla pagina. Il riordino della
 * documentazione del 13 settembre 2026 ha spostato ~2400 righe e riparato undici
 * ancore; senza questo script sarebbe stato alla cieca.
 *
 * Non gira in CI di proposito: il tasso di rottura è zero da sempre, e vale più
 * come rete di sicurezza quando si spostano documenti che come guardia continua.
 */

import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();

/**
 * Lo slug di un heading, come lo genera GitHub.
 *
 * Il punto delicato: GitHub NON collassa gli spazi. Un titolo come
 * `## 2026-08-11 — Step 23: ...` produce `2026-08-11--step-23-...` con DUE
 * trattini, perché l'em-dash sparisce e i due spazi che lo circondavano
 * diventano due trattini. Usare `\s+` qui genera falsi positivi su tutte le
 * ancore verso il devlog.
 */
const slug = (s: string): string =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // il testo dei link, non l'URL
    .replace(/[`*_~]/g, '') // via il markup inline
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '') // via punteggiatura, «», ·, em-dash
    .replace(/ /g, '-'); // OGNI spazio -> UN trattino

/** I file markdown tracciati da git, esclusi node_modules. */
function fileMarkdown(): string[] {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter((r) => r.length > 0 && !r.includes('node_modules/'));
}

/** Gli slug di tutti gli heading di un file, con i duplicati numerati come fa GitHub. */
function ancoreDi(percorso: string): Set<string> {
  const ancore = new Set<string>();
  const visti = new Map<string, number>();
  let dentroUnBlocco = false;

  for (const riga of readFileSync(join(root, percorso), 'utf8').split('\n')) {
    if (/^\s*```/.test(riga)) {
      dentroUnBlocco = !dentroUnBlocco;
      continue;
    }
    if (dentroUnBlocco) continue;

    const titolo = /^(#{1,6})\s+(.*)$/.exec(riga);
    if (titolo?.[2] === undefined) continue;

    const base = slug(titolo[2]);
    if (base.length === 0) continue;

    const quante = visti.get(base) ?? 0;
    visti.set(base, quante + 1);
    ancore.add(quante === 0 ? base : `${base}-${quante}`);
  }
  return ancore;
}

const cacheAncore = new Map<string, Set<string>>();
function ancoreCache(percorso: string): Set<string> {
  let a = cacheAncore.get(percorso);
  if (a === undefined) {
    a = ancoreDi(percorso);
    cacheAncore.set(percorso, a);
  }
  return a;
}

const markdown = fileMarkdown();
const esiste = new Set(markdown);
const rotti: string[] = [];
let totale = 0;

for (const percorso of markdown) {
  const testo = readFileSync(join(root, percorso), 'utf8');
  const righe = testo.split('\n');

  righe.forEach((riga, indice) => {
    // I link markdown inline: [testo](destinazione)
    for (const link of riga.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const destinazione = link[1];
      if (destinazione === undefined) continue;

      // Fuori perimetro: protocolli, ancore verso righe di sorgente.
      if (/^[a-z][a-z0-9+.-]*:/i.test(destinazione)) continue;
      if (destinazione.startsWith('//')) continue;

      const taglio = destinazione.indexOf('#');
      const fileLink = taglio === -1 ? destinazione : destinazione.slice(0, taglio);
      const frammento = taglio === -1 ? '' : destinazione.slice(taglio + 1);

      // Ancora interna allo stesso documento.
      if (fileLink === '') {
        totale++;
        if (frammento.length > 0 && !ancoreCache(percorso).has(decodeURIComponent(frammento))) {
          rotti.push(`${percorso}:${indice + 1}  ancora interna assente  #${frammento}`);
        }
        continue;
      }

      totale++;
      const risolto = relative(
        root,
        resolve(root, dirname(percorso), decodeURIComponent(fileLink)),
      );
      const normalizzato = normalize(risolto);

      if (!esiste.has(normalizzato)) {
        // Potrebbe essere un file non-markdown, o una directory: lo cerchiamo su disco.
        try {
          statSync(join(root, normalizzato));
        } catch {
          rotti.push(`${percorso}:${indice + 1}  file assente  ${fileLink}`);
          continue;
        }
        continue; // esiste, ma non è markdown: niente da dire sulle ancore
      }

      if (frammento.length > 0 && !/^L\d+(-L?\d+)?$/.test(frammento)) {
        if (!ancoreCache(normalizzato).has(decodeURIComponent(frammento))) {
          rotti.push(`${percorso}:${indice + 1}  ancora assente  ${fileLink}#${frammento}`);
        }
      }
    }
  });
}

console.log(`file markdown: ${markdown.length}`);
console.log(`link relativi: ${totale} · rotti: ${rotti.length}`);
if (rotti.length > 0) {
  console.log('');
  for (const r of rotti) console.log(`  ${r}`);
  process.exit(1);
}
