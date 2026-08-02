/**
 * Un secondo dispositivo interattivo, per provare col telefono in mano.
 *
 * È `scripts/device.mts` con una tastiera davanti: gli stessi moduli veri dell'app, lo
 * stesso relay. Serve quando la prova ha bisogno di un telefono dall'altra parte — la
 * consegna del deep link, il foglio di condivisione, la scansione del QR — cioè le cose
 * che `npm run prova` non può fare da solo.
 *
 *   npm run peer -- crea "Casa"       crea un gruppo e stampa l'invito da aprire sul telefono
 *   npm run peer -- entra "<link>"    entra con un invito generato dal telefono
 *   npm run peer -- apri              riapre l'ultimo gruppo e riparte da dov'era
 *   npm run peer -- invito            ristampa un invito per il gruppo salvato
 *
 * `--profilo <nome>` per tenere più dispositivi distinti, `--nome <nome>` per come ti
 * chiami, `--verbose` per vedere ogni richiesta al relay con l'intervallo.
 */
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';
import {
  buildSplit,
  computeBalances,
  createInviteLink,
  formatMoney,
  parseAmount,
  parseInvite,
  type Expense,
  type Member,
} from '@jutrack/core';
import { HeadlessDevice, RELAY_URL, describeSync, type OpenGroup } from './device.mts';

const STATE_DIR = join(import.meta.dirname, '..', '..', '..', '.jutrack-peer');

const COLORS = {
  grigio: '\x1b[90m',
  verde: '\x1b[32m',
  giallo: '\x1b[33m',
  rosso: '\x1b[31m',
  ciano: '\x1b[36m',
  neutro: '\x1b[0m',
} as const;

function log(message: string, color: keyof typeof COLORS = 'neutro'): void {
  const time = new Date().toTimeString().slice(0, 8);
  console.log(`${COLORS[color]}${time} ${message}${COLORS.neutro}`);
}

function readFlag(argv: string[], name: string): string | null {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : (argv[i + 1] ?? null);
}

function describe(expense: Expense, members: Map<string, Member>): string {
  const who = members.get(expense.paidBy)?.name ?? expense.paidBy.slice(0, 8);
  const note = expense.note === null || expense.note === '' ? '(senza nota)' : expense.note;
  return `${formatMoney(expense.amountCents)} · ${note} · pagata da ${who}`;
}

/**
 * Stampa ciò che arriva dall'altro telefono, appena arriva.
 *
 * Gli arrivi si distinguono per **origine**: il motore applica ciò che scarica con sé
 * stesso come origine. Senza, anche le spese scritte qui comparirebbero con la freccia in
 * entrata, e guardare il terminale non direbbe più se il sync funziona.
 */
function watch(group: OpenGroup): void {
  let expenses = new Map(group.store.listExpenses().map((e) => [e.id, e]));
  let members = new Map(group.store.listMembers().map((m) => [m.id, m]));

  group.doc.on('update', (_update: Uint8Array, origin: unknown) => {
    const remote = origin === group.engine;
    const nextExpenses = new Map(group.store.listExpenses().map((e) => [e.id, e]));
    const nextMembers = new Map(group.store.listMembers().map((m) => [m.id, m]));

    for (const [id, member] of nextMembers) {
      if (!members.has(id)) log(`👤 nuovo membro: ${member.name}  (${id.slice(0, 8)}…)`, 'ciano');
    }
    if (remote) {
      for (const [id, expense] of nextExpenses) {
        const before = expenses.get(id);
        if (before === undefined) log(`← ${describe(expense, nextMembers)}`, 'verde');
        else if (before.updatedAt !== expense.updatedAt)
          log(`✎ modificata dall'altro: ${describe(expense, nextMembers)}`, 'verde');
      }
      for (const id of expenses.keys()) {
        if (!nextExpenses.has(id)) log('✖ una spesa è stata cancellata dall’altro', 'verde');
      }
    }

    expenses = nextExpenses;
    members = nextMembers;
  });
}

function printState(device: HeadlessDevice, group: OpenGroup): void {
  const members = group.store.listMembers();
  const expenses = group.store.listExpenses();
  const byId = new Map(members.map((m) => [m.id, m]));
  const balances = computeBalances(
    expenses,
    group.store.listSettlements(),
    members.map((m) => m.id),
  );

  console.log(`\n  Gruppo: ${group.store.getGroupName() ?? '(senza nome)'}`);
  console.log(`  vault:  ${group.record.vaultId}`);
  console.log(`\n  Membri (${members.length}):`);
  for (const m of members) {
    console.log(
      `    · ${m.name}  (${m.id.slice(0, 8)}…)${m.id === group.myMemberId ? '  ← sono io' : ''}`,
    );
  }
  console.log(`\n  Spese (${expenses.length}):`);
  for (const e of expenses) console.log(`    · ${e.date}  ${describe(e, byId)}`);
  console.log('\n  Saldi:');
  for (const b of balances) {
    console.log(
      `    · ${byId.get(b.memberId)?.name ?? b.memberId.slice(0, 8)}: ${formatMoney(b.netCents)}`,
    );
  }
  console.log(
    `\n  Sync: ${describeSync(group.engine.getState())} · ${device.http.gets} GET, ${device.http.posts} POST\n`,
  );
}

async function printInvite(device: HeadlessDevice, group: OpenGroup): Promise<void> {
  const key = await device.registry.keyBytes(group.record.vaultId);
  if (key === null) {
    log('La chiave di questo gruppo non è leggibile.', 'rosso');
    return;
  }
  const invite = createInviteLink(key, {
    baseUrl: RELAY_URL,
    name: group.store.getGroupName() ?? group.record.name,
    now: Date.now(),
  });
  console.log('\n  Aprilo sul telefono, o incollalo in «Incolla un invito»:\n');
  console.log(`    ${COLORS.ciano}${invite.url}${COLORS.neutro}\n`);
  console.log(`  In forma di URI:\n\n    ${invite.joinUri}\n`);
  console.log(`  Scade il ${new Date(invite.expiresAt).toLocaleString('it-IT')}\n`);
}

function addExpense(group: OpenGroup, rest: string): void {
  if (group.myMemberId === null) {
    log('Prima devi dire chi sei in questo gruppo: riavvia il peer.', 'rosso');
    return;
  }
  const [rawAmount, ...noteParts] = rest.split(' ');
  const cents = rawAmount === undefined ? null : parseAmount(rawAmount);
  if (cents === null || cents <= 0) {
    log('Serve un importo: «spesa 12,30 pizza»', 'rosso');
    return;
  }
  const members = group.store.listMembers().map((m) => m.id);
  group.store.addExpense({
    amountCents: cents,
    date: new Date().toISOString().slice(0, 10),
    note: noteParts.join(' '),
    paidBy: group.myMemberId,
    split: buildSplit('equal', cents, members),
  });
  log(`→ registrata ${formatMoney(cents)}, divisa fra ${members.length}`, 'verde');
}

const AIUTO = `
  spesa <importo> [nota]   registra una spesa (es. «spesa 12,30 pizza»)
  stato                    membri, spese, saldi e stato del sync
  invito                   ristampa un invito per questo gruppo
  aiuto                    questo elenco
  esci                     chiude
`;

/**
 * La domanda «chi sei in questo gruppo?», che l'app pone con `GroupIdentityGate`.
 *
 * Si fa **prima** che venga scritto un membro: i membri non hanno tombstone, e quello
 * creato per sbaglio resterebbe lì per sempre.
 */
async function askIdentity(device: HeadlessDevice, group: OpenGroup): Promise<OpenGroup> {
  const others = group.store.listMembers();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n  Chi sei in questo gruppo?\n');
  console.log(`    0) Sono nuovo — entro come ${device.profile.name}`);
  others.forEach((m, i) => console.log(`    ${i + 1}) Ero già qui, sono ${m.name}`));
  const answer = (await rl.question('\n  Scegli [0]: ')).trim();
  rl.close();

  const index = answer === '' ? 0 : Number(answer);
  const chosen = index > 0 ? others[index - 1]?.id : device.profile.profileId;
  return device.chooseIdentity(group, chosen ?? device.profile.profileId);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? 'aiuto';
  const profile = readFlag(argv, 'profilo') ?? 'default';
  const verbose = argv.includes('--verbose');
  const dir = join(STATE_DIR, profile);

  if (command === 'aiuto' || command === '--help' || command === '-h') {
    console.log(`
  Un secondo dispositivo, in un terminale. Monta i moduli veri dell'app.

  npm run peer -- crea "Casa"       crea un gruppo e stampa l'invito
  npm run peer -- entra "<link>"    entra con un invito generato dal telefono
  npm run peer -- apri              riapre l'ultimo gruppo
  npm run peer -- invito            ristampa un invito per il gruppo salvato

  --profilo <nome>   tiene più dispositivi distinti (default: «default»)
  --nome <nome>      come ti chiami (solo alla prima creazione del profilo)
  --verbose          stampa ogni richiesta al relay, con l'intervallo

  Per la verifica automatica senza telefono: npm run prova
`);
    return;
  }

  const device = await HeadlessDevice.start(dir, readFlag(argv, 'nome') ?? `Peer-${profile}`);
  if (verbose) {
    device.http.onRequest = (method, gap) =>
      log(`· ${method} al relay (${(gap / 1000).toFixed(1)} s dalla precedente)`, 'grigio');
  }

  let group: OpenGroup;
  if (command === 'crea') {
    group = await device.createGroup(argv[1] ?? 'Gruppo di prova');
    log(`Gruppo «${group.record.name}» creato.`, 'ciano');
  } else if (command === 'entra') {
    const link = argv[1];
    if (link === undefined) {
      console.error('Serve il link: npm run peer -- entra "https://…/j#v=1&k=…"');
      process.exit(1);
    }
    const parsed = parseInvite(link, Date.now());
    if (!parsed.ok) {
      console.error(`Invito non valido (${parsed.reason}).`);
      process.exit(1);
    }
    group = await device.joinGroup(parsed.key, parsed.name ?? 'Gruppo condiviso');
    log(`Entrato nel gruppo «${parsed.name ?? 'senza nome'}»`, 'ciano');
  } else {
    const groups = await device.registry.list();
    const first = groups[0];
    if (first === undefined) {
      console.error(`Nessun gruppo in ${dir}. Usa «crea» oppure «entra».`);
      process.exit(1);
    }
    group = await device.open(first.vaultId);
  }

  // Chi entra in un gruppo altrui non ha ancora un membro: la domanda va fatta adesso,
  // prima di poter scrivere qualunque cosa.
  if (group.myMemberId === null) group = await askIdentity(device, group);

  if (command === 'invito') {
    await printInvite(device, group);
    await group.close();
    device.close();
    return;
  }

  log(`Relay: ${RELAY_URL}`, 'grigio');
  group.engine.subscribe((state) => {
    if (state.phase === 'offline' || state.phase === 'error' || state.phase === 'blocked') {
      log(`⚠ ${describeSync(state)}`, 'giallo');
    }
  });
  watch(group);
  if (command === 'crea') await printInvite(device, group);
  printState(device, group);
  console.log(`  «aiuto» per l'elenco dei comandi.\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();
  rl.on('line', (line) => {
    const trimmed = line.trim();
    const [verb, ...rest] = trimmed.split(' ');
    if (verb === 'esci' || verb === 'q') rl.close();
    else if (verb === 'stato') printState(device, group);
    else if (verb === 'invito') void printInvite(device, group);
    else if (verb === 'spesa') addExpense(group, rest.join(' '));
    else if (verb === 'aiuto') console.log(AIUTO);
    else if (trimmed !== '') log(`Non conosco «${verb}». Prova «aiuto».`, 'rosso');
    rl.prompt();
  });

  await new Promise<void>((resolve) => rl.on('close', resolve));
  await group.close();
  device.close();
  log('Chiuso. Lo stato è su disco: «npm run peer -- apri» riprende da qui.', 'grigio');
}

await main();
