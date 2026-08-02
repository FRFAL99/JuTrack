/**
 * La checklist di `docs/prova-con-un-telefono-solo.md`, eseguita da sola.
 *
 * Due dispositivi senza schermo, i moduli veri dell'app, il relay vero. Stampa un esito
 * per riga ed esce con codice 1 se qualcosa è rosso, così può stare in uno script.
 *
 * Non sostituisce il telefono — schermate, navigazione, deep link, `Share`, fotocamera e
 * SecureStore restano fuori — ma copre tutto ciò che riguarda **i dati e i numeri**, che
 * è dove stavano i due bug della prima prova con due telefoni.
 *
 * Uso: `npm run prova` (dalla root o da apps/mobile). Dura circa un minuto e mezzo.
 */
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSplit, computeBalances, formatMoney } from '@jutrack/core';
import { HeadlessDevice, until, type OpenGroup } from './device.mts';

const ROOT = join(tmpdir(), `jutrack-prova-${Date.now()}`);

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  const mark = ok ? '\x1b[32m  OK  \x1b[0m' : '\x1b[31m FAIL \x1b[0m';
  console.log(`${mark} ${label}${detail === '' ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
}

function section(title: string): void {
  console.log(`\n\x1b[36m${title}\x1b[0m`);
}

const secondsSince = (from: number): string => `${((Date.now() - from) / 1000).toFixed(1)} s`;

function spend(group: OpenGroup, cents: number, note: string): void {
  // Senza ripiego su «il primo membro che passa»: `myMemberId` a `null` significa che la
  // domanda «chi sei in questo gruppo?» non ha ancora avuto risposta, e attribuire la
  // spesa a qualcun altro nasconderebbe proprio ciò che la prova deve mostrare.
  if (group.myMemberId === null) {
    throw new Error(`«${group.record.name}» non sa ancora chi sono io: manca chooseIdentity`);
  }
  const members = group.store.listMembers().map((m) => m.id);
  group.store.addExpense({
    amountCents: cents,
    date: new Date().toISOString().slice(0, 10),
    note,
    paidBy: group.myMemberId,
    split: buildSplit('equal', cents, members),
  });
}

const noteOf = (group: OpenGroup): string[] =>
  group.store
    .listExpenses()
    .map((e) => e.note ?? '')
    .sort();

async function main(): Promise<void> {
  console.log(
    `Dispositivi finti in ${ROOT}\nRelay: ${process.env.JUTRACK_RELAY_URL ?? 'produzione'}`,
  );

  const a = await HeadlessDevice.start(join(ROOT, 'A'), 'Anna');
  const b = await HeadlessDevice.start(join(ROOT, 'B'), 'Bruno');

  // ---------------------------------------------------------------- 1. invito
  section('1 · Creare un gruppo ed entrarci con un invito');

  const casaA = await a.createGroup('Casa');
  const key = await a.registry.keyBytes(casaA.record.vaultId);
  check('il gruppo nasce senza chiedere nulla al relay', key !== null, casaA.record.vaultId);
  if (key === null) throw new Error('senza chiave non si prosegue');

  let casaB = await b.joinGroup(key, 'Casa');
  check(
    'il secondo dispositivo entra col solo materiale dell’invito',
    casaB.record.origin === 'joined',
  );
  // Chi entra in un gruppo altrui **non** ottiene un membro finché non risponde: i membri
  // non hanno tombstone, e quello creato per sbaglio resterebbe lì per sempre. È il
  // comportamento dello Step 12, e vale la pena verificarlo invece di darlo per scontato.
  check(
    'a chi entra viene chiesto chi è, prima di scrivergli un membro',
    casaB.myMemberId === null,
  );
  casaB = await b.chooseIdentity(casaB, b.profile.profileId); // «Sono nuovo»
  check(
    'risposto «sono nuovo», il membro nasce dal profilo',
    casaB.myMemberId === b.profile.profileId,
  );

  // ------------------------------------------------------- 2. i due si vedono
  section('2 · Due membri, non quattro');

  // **Prima di registrare qualunque spesa.** Una spesa divisa «fra tutti» lo è fra tutti
  // quelli che si conoscono in quel momento: registrarla prima che la presenza dell'altro
  // sia arrivata la dividerebbe per uno solo. Non è un difetto — è come funziona un CRDT
  // — ma è la ragione per cui l'ordine di questa prova conta.
  const siVedono = await until(
    () => casaA.store.listMembers().length === 2 && casaB.store.listMembers().length === 2,
  );
  const membersA = casaA.store.listMembers();
  const membersB = casaB.store.listMembers();
  check('A vede due membri', membersA.length === 2, membersA.map((m) => m.name).join(', '));
  check('B vede due membri', membersB.length === 2, membersB.map((m) => m.name).join(', '));
  check(
    'i due membri hanno gli stessi id sui due dispositivi',
    siVedono &&
      membersA
        .map((m) => m.id)
        .sort()
        .join() ===
        membersB
          .map((m) => m.id)
          .sort()
          .join(),
  );

  // --------------------------------------------------- 3. sync bidirezionale
  section('3 · La sincronizzazione, in tutti e due i versi');

  let started = Date.now();
  spend(casaA, 2000, 'da-Anna');
  const arrivedOnB = await until(() => noteOf(casaB).includes('da-Anna'));
  check('A → B', arrivedOnB, secondsSince(started));

  started = Date.now();
  spend(casaB, 750, 'da-Bruno');
  const arrivedOnA = await until(() => noteOf(casaA).includes('da-Bruno'));
  check('B → A', arrivedOnA, secondsSince(started));

  // Un ciclo che riporta `synced` non dimostra che i due lati siano allineati: era vero
  // anche con entrambi i bug. La prova è che le due liste coincidano.
  await until(() => noteOf(casaA).join() === noteOf(casaB).join());
  check(
    'le due liste coincidono',
    noteOf(casaA).join() === noteOf(casaB).join(),
    noteOf(casaA).join(', '),
  );

  // ---------------------------------------------------------------- 4. saldo
  section('4 · Il saldo, contro il calcolo a mano');

  // Anna ha anticipato 20,00 di cui le spetta metà; Bruno 7,50 di cui gli spetta metà.
  // Quindi Anna è in credito di 10,00 − 3,75 = 6,25 e Bruno in debito della stessa cifra.
  const balances = computeBalances(
    casaA.store.listExpenses(),
    casaA.store.listSettlements(),
    membersA.map((m) => m.id),
  );
  const netOf = (id: string | null): number =>
    balances.find((x) => x.memberId === id)?.netCents ?? Number.NaN;
  check(
    'il saldo di Anna coincide col calcolo a mano',
    netOf(casaA.myMemberId) === 625,
    formatMoney(netOf(casaA.myMemberId)),
  );
  check(
    'il saldo di Bruno è speculare',
    netOf(casaB.myMemberId) === -625,
    formatMoney(netOf(casaB.myMemberId)),
  );

  // ------------------------------------------------------------ 5. categorie
  section('5 · Le categorie di default, seminate una volta sola');

  // Chi **entra** non semina: seminare da entrambe le parti era la ragione delle sedici
  // categorie invece di otto, alla prima prova con due telefoni.
  await until(() => casaB.store.listCategories(true).length > 0);
  check(
    'A ne ha otto',
    casaA.store.listCategories(true).length === 8,
    `${casaA.store.listCategories(true).length}`,
  );
  check(
    'B ne ha otto, non sedici',
    casaB.store.listCategories(true).length === 8,
    `${casaB.store.listCategories(true).length}`,
  );

  // ------------------------------------------------------ 6. gruppi separati
  section('6 · Due gruppi sullo stesso dispositivo non si mescolano');

  const viaggioA = await a.createGroup('Viaggio');
  spend(viaggioA, 5000, 'solo-nel-viaggio');
  await until(() => noteOf(viaggioA).includes('solo-nel-viaggio'));
  check('la spesa del viaggio non compare in casa', !noteOf(casaA).includes('solo-nel-viaggio'));
  check('e casa non compare nel viaggio', !noteOf(viaggioA).includes('da-Anna'));
  check(
    'la coda di un gruppo non svuota quella dell’altro',
    (await b.registry.list()).length === 1 && (await a.registry.list()).length === 2,
  );

  // --------------------------------------------------------------- 7. aereo
  section('7 · Modalità aereo, e il ritorno della rete (Step 17)');

  b.http.offline = true;
  spend(casaB, 100, 'in-aereo-1');
  spend(casaB, 200, 'in-aereo-2');
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  check(
    'senza rete le spese restano in coda e non arrivano',
    !noteOf(casaA).includes('in-aereo-1'),
    `${casaB.engine.pendingCount} update in coda`,
  );
  check(
    'lo stato dice «senza rete», non «errore del relay»',
    casaB.engine.getState().phase === 'offline',
  );

  started = Date.now();
  b.http.offline = false;
  // **Non si tocca nulla**: nessun `resume()`, nessuna scrittura. Se arrivano, è perché
  // `offlineRetryMs` ha ritentato da solo — che è il sostituto del listener di
  // connettività che non possiamo avere senza una build EAS nuova.
  const cameBack = await until(() => noteOf(casaA).includes('in-aereo-2'), { timeoutMs: 45_000 });
  check('riaccesa la rete ripartono da sole, senza toccare nulla', cameBack, secondsSince(started));

  // ------------------------------------------------------- 8. scala di poll
  section('8 · La scala di poll si allarga da sola (Step 16)');

  const before = b.http.gets;
  const restStarted = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 25_000));
  const duringRest = b.http.gets - before;
  const lastGap = b.http.gaps[b.http.gaps.length - 1] ?? 0;
  check(
    'a riposo il poll rallenta invece di restare a due secondi',
    lastGap >= 4_000,
    `ultimo intervallo ${(lastGap / 1000).toFixed(1)} s, ${duringRest} richieste in ${secondsSince(restStarted)}`,
  );

  started = Date.now();
  casaB.engine.markActive();
  const wokeUp = await until(() => b.http.gets > before + duringRest, {
    timeoutMs: 5_000,
    everyMs: 50,
  });
  check('markActive sveglia subito il ciclo', wokeUp, secondsSince(started));

  // ------------------------------------------------------------ 9. riavvio
  section('9 · Chiudere e riaprire: i dati sono su disco');

  await casaB.close();
  b.close();
  const bAgain = await HeadlessDevice.start(join(ROOT, 'B'), 'Bruno');
  check('il profilo sopravvive alla chiusura', bAgain.profile.profileId === b.profile.profileId);
  const groupsAgain = await bAgain.registry.list();
  check('il gruppo è ancora in elenco', groupsAgain.length === 1, groupsAgain[0]?.name ?? '—');

  const casaB2 = await bAgain.open(casaB.record.vaultId);
  check(
    'le spese sono ancora tutte lì, senza riscaricarle',
    noteOf(casaB2).includes('da-Anna') && noteOf(casaB2).includes('in-aereo-2'),
    `${noteOf(casaB2).length} spese`,
  );
  check('e sono ancora due membri, non tre', casaB2.store.listMembers().length === 2);

  // ------------------------------------------------ 10. uscire, e cancellare
  section('10 · Uscire da un gruppo, e cancellarlo dal relay (Step 14)');

  await casaB2.close();
  await bAgain.registry.forget(casaB2.record.vaultId, { wipeRelay: false });
  check('uscire lascia l’elenco vuoto', (await bAgain.registry.list()).length === 0);
  check(
    'e la chiave non è più leggibile',
    (await bAgain.registry.keyBytes(casaB2.record.vaultId)) === null,
  );

  await casaA.close();
  await viaggioA.close();
  // La cancellazione remota è la prima richiesta di rete che parte da un gesto
  // dell'utente e non dal motore: se il relay non rispondesse, `forget` solleverebbe.
  let remoteWipeOk = true;
  try {
    await a.registry.forget(casaA.record.vaultId, { wipeRelay: true });
    await a.registry.forget(viaggioA.record.vaultId, { wipeRelay: true });
  } catch (error) {
    remoteWipeOk = false;
    check('cancellazione dal relay', false, error instanceof Error ? error.message : String(error));
  }
  if (remoteWipeOk) check('il relay accetta la cancellazione e i vault di prova spariscono', true);

  a.close();
  bAgain.close();
  rmSync(ROOT, { recursive: true, force: true });

  console.log(
    failures === 0
      ? '\n\x1b[32mTutto verde.\x1b[0m Resta da provare col telefono: interfaccia, navigazione, consegna del deep link, Share, QR.'
      : `\n\x1b[31m${failures} controlli falliti.\x1b[0m`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

await main();
