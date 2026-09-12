/**
 * L'informativa privacy: `GET /privacy`.
 *
 * Esiste perché il Play Store la pretende come URL pubblico e raggiungibile, ma il
 * contenuto non è un adempimento: descrive quello che il codice di questo repo fa
 * davvero. Se un giorno il relay cominciasse a vedere qualcosa che qui è dichiarato
 * illeggibile, è questo file a essere sbagliato.
 *
 * ## Perché sta qui e non altrove
 *
 * Sullo stesso Worker che serve `/j`: nessun dominio da comprare, nessun servizio in più
 * da fidarsi, e soprattutto **una cosa sola da tenere in vita**. Un'informativa ospitata
 * su una piattaforma che chiude lascia sul Play Store un link morto, ed è una violazione
 * delle regole del negozio, non un dettaglio estetico.
 *
 * ## Le differenze rispetto a `/j`
 *
 * Due, ed entrambe deliberate. La pagina degli inviti è `noindex` perché il suo URL
 * arriva con una chiave nel fragment; questa è un documento pubblico e **deve** essere
 * indicizzabile e citabile. E non ha script: `script-src 'none'` invece di
 * `'unsafe-inline'`, perché qui non c'è niente da calcolare nel browser.
 *
 * Le due lingue stanno nella stessa pagina, una sotto l'altra, raggiunte da due ancore.
 * Serve a non dipendere da JavaScript per una cosa che il Play Store deve poter leggere
 * anche con gli script disattivati — e l'app parla entrambe le lingue dallo Step 37.
 */

/** Percorso servito da questa pagina. */
export const PRIVACY_PATH = '/privacy';

/**
 * Titolare del trattamento e recapito.
 *
 * Il GDPR chiede che il titolare sia identificabile, e il Play Store rifiuta
 * un'informativa senza un contatto raggiungibile. Sono costanti e non testo sparso nella
 * pagina proprio perché si cambiano in un posto solo — e un test impedisce che tornino
 * a essere segnaposto.
 *
 * `CONTACT_EMAIL` è **il recapito dell'app**, non solo quello dell'informativa: la stessa
 * casella servirà alla scheda del Play Store, alle segnalazioni e a chi scrive per un
 * guasto. Per questo non è `privacy@…`, che avrebbe costretto ad aprirne una seconda.
 */
export const CONTROLLER = 'Francesco Fallavena';
export const CONTACT_EMAIL = 'jutrack.info@gmail.com';

/** Data dell'ultima revisione sostanziale, in forma ISO. */
export const LAST_UPDATED = '2026-09-12';

/** La pagina, costruita una volta all'avvio dell'isolate: è uguale per tutti. */
export const PRIVACY_PAGE_HTML = buildHtml();

/**
 * La risposta a `GET /privacy`.
 *
 * Senza parametri, come `invitePage()`: non c'è nulla della richiesta che possa
 * cambiarla, e una funzione che non prende argomenti non può leggere alcun vault.
 */
export function privacyPage(): Response {
  return new Response(PRIVACY_PAGE_HTML, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'no-referrer',
      // Nessuno script e nessuna origine esterna: la pagina è testo e stile, e basta.
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      // Nessun `noindex`, al contrario di `/j`: questo documento deve essere trovabile.
      'cache-control': 'public, max-age=3600',
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
<title>Informativa privacy — JuTrack</title>
<style>
:root { color-scheme: light dark; --bg: #F7F8FA; --card: #FFFFFF; --text: #16181D; --muted: #5B616E; --line: #E2E5EA; --accent: #1F6FEB; }
@media (prefers-color-scheme: dark) { :root { --bg: #0E1015; --card: #171A21; --text: #ECEEF2; --muted: #9AA1AE; --line: #262A33; --accent: #4C8DF6; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 64px; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 42rem; margin: 0 auto; }
h1 { margin: 0 0 4px; font-size: 26px; line-height: 1.2; }
h2 { margin: 32px 0 8px; font-size: 19px; line-height: 1.3; }
h3 { margin: 20px 0 6px; font-size: 16px; }
p, li { color: var(--muted); }
p { margin: 8px 0 0; }
ul { margin: 8px 0 0; padding-left: 20px; }
li { margin: 4px 0; }
strong { color: var(--text); font-weight: 600; }
.meta { font-size: 14px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; margin-top: 20px; }
.card p:first-child { margin-top: 0; }
.langs { margin: 18px 0 0; font-size: 14px; }
.langs a { color: var(--accent); }
hr { margin: 48px 0 0; border: 0; border-top: 1px solid var(--line); }
a { color: var(--accent); }
</style>
</head>
<body>
<main>

<h1 id="it">Informativa privacy di JuTrack</h1>
<p class="meta">Ultimo aggiornamento: ${LAST_UPDATED} · <a href="#en">Read in English</a></p>

<div class="card">
<p><strong>In breve.</strong> JuTrack non ha account, non chiede né e-mail né numero di telefono, non
contiene pubblicità, non ti profila e non misura come usi l'app. Le tue spese sono cifrate sul
telefono prima di partire: <strong>il nostro server non ha la chiave e non può leggerle</strong>.
L'unica cosa che l'app manda fuori di sua iniziativa è il <strong>rapporto tecnico di un guasto</strong>,
quando qualcosa si rompe.</p>
</div>

<h2>Chi tratta i dati</h2>
<p>Il titolare del trattamento è ${CONTROLLER}. Per qualunque richiesta relativa a questa informativa
o ai tuoi dati: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>Come è fatta l'app</h2>
<p>JuTrack tiene le spese sul telefono. Quando due telefoni condividono un gruppo, le modifiche
passano da un server di appoggio — che chiamiamo <em>relay</em> — per raggiungere l'altro
dispositivo. Prima di lasciare il telefono ogni modifica viene cifrata con una chiave che vive solo
sui dispositivi del gruppo: il relay riceve una sequenza di byte che non è in grado di interpretare.</p>
<p>La chiave nasce sul telefono di chi crea il gruppo e raggiunge l'altro dispositivo con il codice QR
o con il link di invito. <strong>La chiave non ci viene mai trasmessa</strong>: nel link di invito sta
dopo il carattere <code>#</code>, la parte dell'indirizzo che i browser non inviano ad alcun server.</p>

<h2>Quali dati restano sul tuo telefono</h2>
<ul>
<li>Le spese: importo, data, categoria, chi ha pagato, come è divisa, e i campi facoltativi negozio e tag.</li>
<li>Il tuo nome nel gruppo e il colore che hai scelto, i nomi dei gruppi, categorie e budget.</li>
<li>Le tue preferenze: lingua, valuta, quali avvisi hai acceso, come hai composto la dashboard.</li>
<li>La chiave di ogni gruppo, custodita nell'archivio protetto del sistema operativo.</li>
</ul>
<p>Questi dati non ci raggiungono mai in chiaro. Restano sul dispositivo finché non esci dal gruppo o
non usi <strong>Azzera questo telefono</strong>.</p>

<h2>Quali dati raggiungono il relay</h2>
<ul>
<li><strong>I blob cifrati</strong> delle tue modifiche. Non abbiamo la chiave per aprirli.</li>
<li><strong>Un identificativo del gruppo</strong> di 32 caratteri, ricavato dalla chiave con una
funzione a senso unico. Ci dice a quale cassetto consegnare un blob, e nient'altro: non contiene il
nome del gruppo né quello delle persone, e da esso non si risale alla chiave.</li>
<li><strong>Un codice di autorizzazione</strong> derivato dalla stessa chiave, che dimostra che chi
scrive appartiene al gruppo. È anch'esso a senso unico.</li>
</ul>
<p>Il relay gira su Cloudflare Workers. Come ogni servizio raggiunto via Internet, Cloudflare tratta
i dati tecnici necessari a consegnare una richiesta — fra cui <strong>l'indirizzo IP</strong> del
dispositivo — per la sicurezza e il funzionamento della rete. Non li usiamo per profilare nessuno e
non li colleghiamo a un'identità, perché non abbiamo alcuna identità a cui collegarli.</p>

<h2>Permessi che l'app richiede</h2>
<h3>Fotocamera</h3>
<p>Serve a una cosa sola: inquadrare il codice QR che collega due telefoni. Le immagini non vengono
salvate, non lasciano il dispositivo e non le riceviamo. Se non usi il collegamento ottico puoi
negare il permesso: il gruppo si condivide anche con un link.</p>
<h3>Notifiche</h3>
<p>Gli avvisi di JuTrack — il promemoria delle spese, il budget vicino al limite, la sincronizzazione
ferma, la chiave non salvata — sono <strong>generati sul telefono</strong> dall'app stessa. Non
esiste alcun server che invii notifiche, quindi il loro contenuto non passa da noi.</p>

<h2>Quando qualcosa si rompe</h2>
<p>Se l'app va in errore, ne manda un <strong>rapporto tecnico</strong> a
<strong>Sentry</strong>, il servizio che usiamo per accorgercene. Senza, un difetto che si presenta
sul tuo telefono non lascerebbe alcuna traccia e nessuno potrebbe correggerlo.</p>
<p>Nel rapporto ci sono: il punto del programma in cui l'errore è avvenuto, il modello del telefono,
la versione di Android e quella dell'app. <strong>Non ci sono le tue spese</strong>, né i nomi dei
gruppi o delle persone. Due categorie di informazioni sono escluse apposta, prima che il rapporto
parta: le <em>richieste di rete</em>, perché i loro indirizzi contengono l'identificativo di un
gruppo, e tutto ciò che l'app scrive nel proprio registro di lavoro.</p>
<p>Il rapporto parte <strong>solo quando qualcosa si rompe</strong>. Non c'è alcuna misura di
apertura, di durata o di uso dell'app: non sappiamo quando la apri né quanto la tieni aperta.</p>

<h2>Aggiornamenti dell'app</h2>
<p>All'avvio l'app chiede ai server di <strong>Expo</strong> se esiste una versione più recente della
sua parte non nativa, così una correzione può arrivarti senza aspettare un aggiornamento dal negozio.
La domanda contiene la piattaforma e la versione che hai installata, e nient'altro: nessun dato tuo
la accompagna.</p>

<h2>Per quanto tempo</h2>
<p>Sul relay ogni blob cifrato viene <strong>cancellato dopo 30 giorni</strong>. Serve solo a far
arrivare una modifica all'altro telefono, non è un archivio: la copia buona dei tuoi dati è quella
sul dispositivo.</p>
<p>Sul telefono i dati restano finché sei tu a rimuoverli.</p>

<h2>Come cancellare i tuoi dati</h2>
<ul>
<li><strong>Uscire da un gruppo</strong> (Gruppi → il gruppo → Esci) rimuove il gruppo dal telefono e
chiede al relay di cancellare il cassetto corrispondente.</li>
<li><strong>Azzera questo telefono</strong> (Tu → Azzera questo telefono) elimina tutto quello che
l'app tiene sul dispositivo: gruppi, spese, chiavi, preferenze. È irreversibile.</li>
<li><strong>Disinstallare l'app</strong> rimuove i dati locali; i blob eventualmente ancora sul relay
scadono da soli entro 30 giorni.</li>
</ul>
<p>Non serve scriverci per cancellare i tuoi dati: non abbiamo un account da chiudere. Se vuoi farlo
comunque, l'indirizzo qui sopra risponde.</p>

<h2>Condivisione con terzi</h2>
<p>Non vendiamo dati e non li cediamo a nessuno. I fornitori coinvolti sono tre, e fanno solo quello
che è descritto sopra:</p>
<ul>
<li><strong>Cloudflare</strong>, che ospita il relay e ne tratta i dati tecnici.</li>
<li><strong>Sentry</strong>, che riceve i rapporti di errore quando l'app si rompe.</li>
<li><strong>Expo</strong>, a cui l'app chiede se esiste un aggiornamento.</li>
</ul>
<p>Tutti e tre, come ogni servizio raggiunto via rete, vedono l'<strong>indirizzo IP</strong> della
richiesta. L'app non contiene reti pubblicitarie, SDK di tracciamento, né strumenti che misurino
come la usi.</p>

<h2>Esportazioni e backup che crei tu</h2>
<p>L'app può produrre un export delle spese (CSV o JSON) e un backup della chiave protetto da
passphrase. Sono file che <strong>tu</strong> generi e consegni a un'altra app: da quel momento
seguono le regole di dove li salvi, e non le nostre. Il backup della chiave è cifrato con la
passphrase che scegli: se la perdi, nessuno — noi compresi — può recuperarlo.</p>

<h2>Minori</h2>
<p>JuTrack non è pensata per bambini e non raccoglie consapevolmente dati di minori di 13 anni.</p>

<h2>I tuoi diritti</h2>
<p>Se ti trovi nello Spazio economico europeo hai diritto di accedere ai tuoi dati, correggerli,
cancellarli, limitarne il trattamento e ottenerne una copia portabile. Nel caso di JuTrack questi
diritti li eserciti soprattutto dall'app stessa, perché i dati stanno sul tuo dispositivo e a noi
arrivano solo cifrati: l'export produce la copia portabile, e le voci qui sopra la cancellazione.
Hai comunque diritto di reclamo all'autorità di controllo del tuo paese.</p>

<h2>Modifiche a questa informativa</h2>
<p>Se cambierà qualcosa di sostanziale aggiorneremo questa pagina e la data in cima. Le versioni
precedenti restano nella storia pubblica del codice sorgente dell'app.</p>

<hr>

<h1 id="en">JuTrack Privacy Policy</h1>
<p class="meta">Last updated: ${LAST_UPDATED} · <a href="#it">Leggi in italiano</a></p>

<div class="card">
<p><strong>In short.</strong> JuTrack has no accounts, asks for no email or phone number, contains no
advertising, does not profile you and does not measure how you use the app. Your expenses are
encrypted on your phone before they leave it: <strong>our server has no key and cannot read
them</strong>. The only thing the app sends out on its own initiative is a <strong>technical crash
report</strong>, when something breaks.</p>
</div>

<h2>Who processes your data</h2>
<p>The data controller is ${CONTROLLER}. For any request about this policy or your data:
<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>How the app works</h2>
<p>JuTrack keeps expenses on your phone. When two phones share a group, changes travel through a
relay server to reach the other device. Every change is encrypted before it leaves the phone, with a
key that only lives on the devices in the group: the relay receives a sequence of bytes it cannot
interpret.</p>
<p>The key is created on the phone of whoever creates the group, and reaches the other device through
the QR code or the invitation link. <strong>The key is never transmitted to us</strong>: in an
invitation link it sits after the <code>#</code> character, the part of a URL that browsers never
send to any server.</p>

<h2>What stays on your phone</h2>
<ul>
<li>Expenses: amount, date, category, who paid, how it is split, and the optional shop and tag fields.</li>
<li>Your name and colour in the group, group names, categories and budgets.</li>
<li>Your preferences: language, currency, which alerts you enabled, how you arranged the dashboard.</li>
<li>Each group's key, held in the operating system's protected store.</li>
</ul>
<p>None of this ever reaches us in readable form. It stays on the device until you leave the group or
use <strong>Wipe this phone</strong>.</p>

<h2>What reaches the relay</h2>
<ul>
<li><strong>Encrypted blobs</strong> of your changes. We hold no key to open them.</li>
<li><strong>A 32-character group identifier</strong>, derived from the key through a one-way
function. It tells us which box a blob belongs to and nothing else: it contains neither the group's
name nor anyone's name, and the key cannot be recovered from it.</li>
<li><strong>An authorisation code</strong> derived from the same key, proving that the writer belongs
to the group. It is one-way as well.</li>
</ul>
<p>The relay runs on Cloudflare Workers. Like any service reached over the Internet, Cloudflare
processes the technical data needed to deliver a request — including the device's
<strong>IP address</strong> — for network security and operation. We do not use it to profile anyone
and cannot link it to an identity, because we hold no identities.</p>

<h2>Permissions the app requests</h2>
<h3>Camera</h3>
<p>Used for one thing only: scanning the QR code that links two phones. Images are not saved, never
leave the device, and never reach us. If you do not use optical pairing you can deny the permission —
a group can also be shared with a link.</p>
<h3>Notifications</h3>
<p>JuTrack's alerts — the expense reminder, the budget warning, stalled synchronisation, the unsaved
key — are <strong>generated on the phone</strong> by the app itself. No server sends notifications,
so their content never passes through us.</p>

<h2>When something breaks</h2>
<p>If the app hits an error, it sends a <strong>technical report</strong> to <strong>Sentry</strong>,
the service we use to find out about it. Without one, a fault that shows up on your phone would leave
no trace at all and nobody could fix it.</p>
<p>The report contains: where in the program the error happened, your phone model, the Android
version and the app version. <strong>It does not contain your expenses</strong>, nor group or people
names. Two categories are excluded deliberately, before the report leaves: <em>network requests</em>,
because their addresses carry a group's identifier, and everything the app writes to its own working
log.</p>
<p>A report is sent <strong>only when something breaks</strong>. There is no measurement of openings,
duration or usage: we do not know when you open the app or how long you keep it open.</p>

<h2>App updates</h2>
<p>At startup the app asks <strong>Expo</strong>'s servers whether a newer version of its non-native
part exists, so a fix can reach you without waiting for a store update. The question carries the
platform and the version you have installed, and nothing else: none of your data goes with it.</p>

<h2>How long we keep it</h2>
<p>On the relay, every encrypted blob is <strong>deleted after 30 days</strong>. Its only job is to
carry a change to the other phone; it is not an archive. The authoritative copy of your data is the
one on your device.</p>
<p>On the phone, data stays until you remove it.</p>

<h2>Deleting your data</h2>
<ul>
<li><strong>Leaving a group</strong> (Groups → the group → Leave) removes it from the phone and asks
the relay to delete the corresponding box.</li>
<li><strong>Wipe this phone</strong> (You → Wipe this phone) erases everything the app holds on the
device: groups, expenses, keys, preferences. It cannot be undone.</li>
<li><strong>Uninstalling the app</strong> removes local data; any blobs still on the relay expire by
themselves within 30 days.</li>
</ul>
<p>You do not need to write to us to delete your data: there is no account to close. If you would
like to anyway, the address above works.</p>

<h2>Sharing with third parties</h2>
<p>We do not sell data and do not pass it to anyone. Three providers are involved, and each does only
what is described above:</p>
<ul>
<li><strong>Cloudflare</strong>, which hosts the relay and processes its technical data.</li>
<li><strong>Sentry</strong>, which receives error reports when the app breaks.</li>
<li><strong>Expo</strong>, which the app asks whether an update exists.</li>
</ul>
<p>All three, like any service reached over a network, see the request's <strong>IP address</strong>.
The app contains no advertising networks, no tracking SDKs, and no tools that measure how you use
it.</p>

<h2>Exports and backups you create</h2>
<p>The app can produce an export of your expenses (CSV or JSON) and a passphrase-protected backup of
your key. These are files <strong>you</strong> create and hand to another app: from then on they
follow the rules of wherever you store them, not ours. The key backup is encrypted with the
passphrase you choose — if you lose it, nobody, ourselves included, can recover it.</p>

<h2>Children</h2>
<p>JuTrack is not directed at children and does not knowingly collect data from anyone under 13.</p>

<h2>Your rights</h2>
<p>If you are in the European Economic Area you have the right to access your data, correct it,
erase it, restrict its processing and obtain a portable copy. With JuTrack you exercise these rights
mostly from the app itself, because the data lives on your device and reaches us only encrypted: the
export produces the portable copy, and the section above covers erasure. You also have the right to
lodge a complaint with your national supervisory authority.</p>

<h2>Changes to this policy</h2>
<p>If anything substantial changes we will update this page and the date at the top. Previous
versions remain in the public history of the app's source code.</p>

</main>
</body>
</html>
`;
}
