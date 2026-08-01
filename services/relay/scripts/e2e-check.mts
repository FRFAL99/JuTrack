/**
 * Prova end-to-end contro il relay in esecuzione.
 *
 * Non verifica il protocollo in astratto: cifra update Yjs reali con il nostro crypto,
 * li fa transitare dal relay e controlla che il documento ricostruito dall'altra parte
 * sia identico. In più controlla che ciò che il relay riceve sia effettivamente
 * illeggibile.
 *
 * Uso: avviare `wrangler dev` e poi `node e2e-relay-check.mjs`
 */
import * as Y from 'yjs';
import {
  authToken,
  deriveVaultKeys,
  generateVaultKey,
  open,
  seal,
  VaultStore,
  buildSplit,
} from '@jutrack/core';
import { randomBytes } from '@noble/ciphers/utils.js';

const BASE = process.env.RELAY_URL ?? 'http://localhost:8799';
const random = { getRandomBytes: (n) => randomBytes(n) };

// base64 standard per il protocollo del relay (btoa/atob lato server).
const toB64 = (bytes) => Buffer.from(bytes).toString('base64');
const fromB64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

const ok = (label, cond, detail = '') => {
  console.log(`${cond ? '  OK  ' : ' FAIL '} ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) process.exitCode = 1;
};

// --- Due dispositivi che condividono la stessa chiave, come dopo il pairing ---
const vaultKey = generateVaultKey(random);
const keys = deriveVaultKeys(vaultKey);
const token = authToken(keys);

console.log(`vaultId: ${keys.vaultId}`);

const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

// --- Telefono A: registra due spese offline ---
const docA = new Y.Doc();
const storeA = new VaultStore(docA, { random });
const outgoing = [];
docA.on('update', (u) => outgoing.push(u));

const me = 'membro-a';
const you = 'membro-b';
storeA.addExpense({
  amountCents: 1230,
  date: '2026-08-01',
  paidBy: me,
  note: 'spesa alimentare',
  split: buildSplit('equal', 1230, [me, you]),
});
storeA.addExpense({
  amountCents: 450,
  date: '2026-08-01',
  paidBy: you,
  note: 'caffè',
  split: buildSplit('equal', 450, [me, you]),
});

// --- Cifra e invia ---
const sealed = outgoing.map((u) => seal(keys.contentKey, keys.vaultId, u, random));
const pushRes = await fetch(`${BASE}/v1/vault/${keys.vaultId}/updates`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ blobs: sealed.map(toB64) }),
});
const pushBody = await pushRes.json();
ok('push accettato', pushRes.status === 200, JSON.stringify(pushBody));

// --- Telefono B: scarica, decifra, ricostruisce ---
const pullRes = await fetch(`${BASE}/v1/vault/${keys.vaultId}/updates?since=0`, { headers });
const pullBody = await pullRes.json();
ok('pull riuscito', pullRes.status === 200, `${pullBody.updates.length} update`);

const docB = new Y.Doc();
for (const { blob } of pullBody.updates) {
  Y.applyUpdate(docB, open(keys.contentKey, keys.vaultId, fromB64(blob)));
}
const storeB = new VaultStore(docB, { random });

const listA = storeA.listExpenses();
const listB = storeB.listExpenses();
ok(
  'B ha ricevuto tutte le spese',
  listB.length === listA.length,
  `${listB.length}/${listA.length}`,
);
ok('gli stati coincidono', JSON.stringify(listA) === JSON.stringify(listB));
ok(
  'gli importi sono intatti',
  listB
    .map((e) => e.amountCents)
    .sort((a, b) => a - b)
    .join(',') === '450,1230',
);

// --- Il relay non può leggere nulla ---
//
// Prima si verifica che il controllo abbia davvero mordente: un update Yjs *non*
// cifrato deve contenere la nota in chiaro. Senza questa verifica preliminare, il
// controllo successivo passerebbe anche se cercasse una stringa che non compare mai,
// dando una falsa sensazione di sicurezza.
const plainUpdate = Buffer.from(Y.encodeStateAsUpdate(docA)).toString('latin1');
ok(
  'controllo sensato: un update non cifrato ESPONE la nota',
  plainUpdate.includes('spesa alimentare'),
);

const rawFromServer = pullBody.updates.map((u) => u.blob).join('');
const decodedText = Buffer.from(rawFromServer, 'base64').toString('latin1');
ok('nessuna nota in chiaro sul relay', !decodedText.includes('spesa alimentare'));
ok('nessuna categoria in chiaro sul relay', !decodedText.includes('caffè'));

// --- Un blob manomesso deve essere respinto ---
const tampered = Uint8Array.from(fromB64(pullBody.updates[0].blob));
tampered[tampered.length - 1] ^= 0x01;
let rejected = false;
try {
  open(keys.contentKey, keys.vaultId, tampered);
} catch {
  rejected = true;
}
ok('un blob manomesso viene respinto', rejected);

// --- Un altro vault non può leggere questi dati ---
const otherKeys = deriveVaultKeys(generateVaultKey(random));
let crossVaultRejected = false;
try {
  open(otherKeys.contentKey, keys.vaultId, fromB64(pullBody.updates[0].blob));
} catch {
  crossVaultRejected = true;
}
ok('un altro vault non può decifrare', crossVaultRejected);

// --- Limite di dimensione ---
const huge = toB64(new Uint8Array(1024 * 1024 + 10));
const hugeRes = await fetch(`${BASE}/v1/vault/${keys.vaultId}/updates`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ blobs: [huge] }),
});
ok('blob oltre 1 MB rifiutato', hugeRes.status === 413, `HTTP ${hugeRes.status}`);

// --- Idempotenza: rinviare gli stessi update non duplica le spese ---
await fetch(`${BASE}/v1/vault/${keys.vaultId}/updates`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ blobs: sealed.map(toB64) }),
});
const again = await (
  await fetch(`${BASE}/v1/vault/${keys.vaultId}/updates?since=0`, { headers })
).json();
const docC = new Y.Doc();
for (const { blob } of again.updates) {
  Y.applyUpdate(docC, open(keys.contentKey, keys.vaultId, fromB64(blob)));
}
ok(
  'update duplicati non duplicano le spese',
  new VaultStore(docC, { random }).listExpenses().length === 2,
);

console.log(process.exitCode === 1 ? '\nCI SONO FALLIMENTI' : '\nTutto verde');
