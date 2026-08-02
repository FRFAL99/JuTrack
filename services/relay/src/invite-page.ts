/**
 * La pagina di atterraggio degli inviti: `GET /j`.
 *
 * Un invito a un gruppo viaggia come link condivisibile:
 *
 * ```
 * https://<relay>/j#v=1&k=<chiave>&n=<nome>&e=<scadenza>
 *                    ▲
 *                    fragment: i browser non lo mandano MAI al server
 * ```
 *
 * Questa pagina esiste per una ragione sola: un link `https://` si può mandare in chat,
 * un `jutrack://` no — molte app lo mostrano come testo morto. Il browser apre `/j`, e
 * qui dentro il fragment viene riscritto nello schema dell'app.
 *
 * ## Cosa questo file non deve mai fare
 *
 * **Rimandare il fragment al server.** Niente `fetch`, niente `<form>`, niente redirect e
 * nessuna risorsa esterna: basterebbe un `<img src="https://…">` perché la chiave del
 * gruppo finisse in un log altrui. Il relay non deve poter leggere gli inviti, esattamente
 * come non può leggere le spese — ed è una proprietà del codice, non una promessa.
 *
 * Per la stessa ragione la pagina è **statica e autoconsistente**: nessun binding, nessun
 * `env`, nessun Durable Object. Il modulo non importa nulla, e `invitePage()` non prende
 * argomenti: non ha proprio modo di toccare lo stato di un vault.
 */

/** Percorso servito da questa pagina. Deve restare allineato a `INVITE_PATH` nel core. */
export const INVITE_PATH = '/j';

/**
 * Schema con cui l'invito rientra nell'app.
 *
 * Duplicato da `JOIN_URI_PREFIX` di `@jutrack/core`: il relay non dipende dal core, e
 * dargli quella dipendenza per una costante significherebbe far entrare Yjs e la crypto
 * in un Worker che deve restare un inoltro di byte opachi. Un test blocca il valore.
 */
export const JOIN_URI_PREFIX = 'jutrack://join';

/**
 * La pagina, byte per byte.
 *
 * Costruita una volta all'avvio dell'isolate: è la stessa per tutti, perché tutto ciò che
 * distingue un invito dall'altro sta nel fragment e non arriva mai fin qui.
 */
export const INVITE_PAGE_HTML = buildHtml();

/**
 * La risposta a `GET /j`.
 *
 * Nessun parametro, di proposito: non c'è niente della richiesta che possa cambiarla, e
 * una funzione senza argomenti non può leggere né scrivere nulla di un vault.
 */
export function invitePage(): Response {
  return new Response(INVITE_PAGE_HTML, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Il fragment non viene mai inviato in un header `Referer`, ma la pagina non ha
      // nulla da guadagnare dal mandarne uno: meglio non dipendere da quella garanzia.
      'referrer-policy': 'no-referrer',
      // Nessuna origine esterna raggiungibile: se anche qualcosa venisse iniettato in
      // questa pagina, non avrebbe un canale per portarsi via il fragment. Gli `inline`
      // sono lo stile e lo script scritti qui sotto, che non contengono nulla di
      // dinamico — la pagina è la stessa stringa a ogni richiesta.
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'public, max-age=300',
    },
  });
}

function buildHtml(): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<title>Invito a un gruppo JuTrack</title>
<style>
:root { color-scheme: light dark; --bg: #F7F8FA; --card: #FFFFFF; --text: #16181D; --muted: #5B616E; --line: #E2E5EA; --accent: #1F6FEB; --accent-text: #FFFFFF; }
@media (prefers-color-scheme: dark) { :root { --bg: #0E1015; --card: #171A21; --text: #ECEEF2; --muted: #9AA1AE; --line: #262A33; --accent: #4C8DF6; --accent-text: #0E1015; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 48px; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 30rem; margin: 0 auto; display: grid; gap: 16px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
h1 { margin: 0 0 4px; font-size: 22px; }
h2 { margin: 0 0 8px; font-size: 16px; }
p { margin: 8px 0 0; color: var(--muted); }
p.lead { color: var(--text); }
.group { font-size: 20px; font-weight: 600; word-break: break-word; }
a.open { display: block; margin-top: 16px; padding: 14px 16px; border-radius: 12px; background: var(--accent); color: var(--accent-text); font-weight: 600; text-align: center; text-decoration: none; }
code { display: block; margin-top: 8px; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); font-size: 12px; word-break: break-all; user-select: all; }
button { margin-top: 8px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--text); font: inherit; font-size: 14px; cursor: pointer; }
summary { cursor: pointer; font-size: 14px; }
[hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>Invito a un gruppo</h1>
    <p class="lead" id="lead">Qualcuno ti sta invitando a condividere le spese su JuTrack.</p>
    <p class="group" id="group" hidden></p>
    <a class="open" id="open" hidden>Apri in JuTrack</a>
    <p id="broken" hidden>Questo link è incompleto: manca la parte dopo il <b>#</b>, che è quella che conta. Capita quando un link viene riscritto da chi lo inoltra. Fattene mandare uno nuovo.</p>
  </div>

  <div class="card">
    <h2>Cosa c’è dentro questo link</h2>
    <p>La chiave del gruppo. Chi ce l’ha legge tutte le sue spese, adesso e in futuro: <b>trattalo come una password</b> e non inoltrarlo ad altri.</p>
    <p>La chiave sta dopo il <b>#</b>, la parte dell’indirizzo che il browser non invia mai a nessun server. Non l’abbiamo ricevuta, non è nei nostri log, e le spese del gruppo restano illeggibili per noi.</p>
  </div>

  <div class="card">
    <details>
      <summary>Il bottone non apre l’app?</summary>
      <p>Serve JuTrack installato su questo telefono. Se c’è ma non si apre, copia il codice qui sotto e incollalo nell’app: <b>Gruppi → Entra in un gruppo → Incolla</b>.</p>
      <code id="code" hidden></code>
      <button id="copy" type="button" hidden>Copia il codice</button>
    </details>
  </div>
</main>
<script>
(function () {
  // Tutto succede qui nel browser. Il fragment non viene mandato da nessuna parte:
  // niente fetch, niente form, niente redirect — è la garanzia che questa pagina esiste
  // per mantenere.
  var raw = location.hash.slice(1);
  if (!raw) {
    document.getElementById('broken').hidden = false;
    return;
  }

  var joinUri = ${JSON.stringify(JOIN_URI_PREFIX)} + '#' + raw;

  var open = document.getElementById('open');
  open.href = joinUri;
  open.hidden = false;

  var code = document.getElementById('code');
  code.textContent = joinUri;
  code.hidden = false;

  var name = readName(raw);
  if (name) {
    var group = document.getElementById('group');
    // textContent e non innerHTML: il nome lo scrive chi ha generato l'invito, ed è
    // l'unico testo di questa pagina che non viene da noi.
    group.textContent = '\\u00AB' + name + '\\u00BB';
    group.hidden = false;
    document.getElementById('lead').textContent = 'Qualcuno ti sta invitando in questo gruppo di spese.';
  }

  var copy = document.getElementById('copy');
  if (navigator.clipboard) {
    copy.hidden = false;
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(joinUri).then(
        function () { copy.textContent = 'Copiato'; },
        function () { copy.textContent = 'Copia non riuscita: selezionalo a mano'; }
      );
    });
  }

  function readName(fragment) {
    var parts = fragment.split('&');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].slice(0, 2) !== 'n=') continue;
      try {
        // Vince la prima occorrenza, come nell'app: un parametro ripetuto non deve
        // poter sovrascrivere quello legittimo.
        return decodeURIComponent(parts[i].slice(2)).slice(0, 64);
      } catch (e) {
        return '';
      }
    }
    return '';
  }
})();
</script>
</body>
</html>
`;
}
