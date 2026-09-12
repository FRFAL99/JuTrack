/**
 * Test del relay dentro workerd, con Durable Object e SQLite reali.
 *
 * Verificano soprattutto ciò che il relay **non** deve permettere: leggere dati di
 * altri, accettare token errati, o farsi usare per esaurire risorse.
 */
import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { INVITE_PAGE_HTML, invitePage, JOIN_URI_PREFIX } from './invite-page';
import { CONTACT_EMAIL, CONTROLLER, PRIVACY_PAGE_HTML, privacyPage } from './privacy-page';

const BASE = 'https://relay.test';

/** vaultId valido: 32 caratteri esadecimali. */
let vaultCounter = 0;
function newVaultId(): string {
  vaultCounter++;
  return vaultCounter.toString(16).padStart(32, '0');
}

/** Token valido: 64 caratteri esadecimali. */
function token(seed = 'a'): string {
  return seed.repeat(64).slice(0, 64);
}

function blob(text: string): string {
  return btoa(text);
}

async function push(vaultId: string, blobs: string[], auth = token()): Promise<Response> {
  return SELF.fetch(`${BASE}/v1/vault/${vaultId}/updates`, {
    method: 'POST',
    headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ blobs }),
  });
}

async function pull(vaultId: string, since = 0, auth = token()): Promise<Response> {
  return SELF.fetch(`${BASE}/v1/vault/${vaultId}/updates?since=${since}`, {
    headers: { authorization: `Bearer ${auth}` },
  });
}

/** Corpo di una risposta di pull. */
interface PullBody {
  updates: { seq: number; blob: string }[];
  head: number;
  hasMore: boolean;
}

/** Corpo di una risposta di push. */
interface PushBody {
  head: number;
  accepted: number;
}

/**
 * `Response.json()` restituisce `unknown`. Passare da questi helper mantiene i test
 * tipizzati: un cambio nella forma della risposta diventa un errore di compilazione
 * invece di un confronto sempre falso.
 */
async function pullJson(vaultId: string, since = 0, auth = token()): Promise<PullBody> {
  return (await (await pull(vaultId, since, auth)).json()) as PullBody;
}

describe('routing', () => {
  it('risponde a /health senza autenticazione', async () => {
    const res = await SELF.fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rifiuta un endpoint sconosciuto', async () => {
    expect((await SELF.fetch(`${BASE}/qualcosa`)).status).toBe(404);
  });

  it.each(['troppo-corto', 'ZZZZ'.repeat(8), '', '../etc/passwd'])(
    'rifiuta il vaultId malformato %j senza istanziare un Durable Object',
    async (badId) => {
      // Senza questo controllo, chiunque potrebbe far creare un Durable Object per
      // ogni stringa inventata, consumando quota.
      const res = await SELF.fetch(`${BASE}/v1/vault/${badId}/updates`, {
        headers: { authorization: `Bearer ${token()}` },
      });
      expect([400, 404]).toContain(res.status);
    },
  );
});

describe('autenticazione', () => {
  it('rifiuta una richiesta senza token', async () => {
    const res = await SELF.fetch(`${BASE}/v1/vault/${newVaultId()}/updates`);
    expect(res.status).toBe(401);
  });

  it('rifiuta un token malformato', async () => {
    const res = await pull(newVaultId(), 0, 'non-esadecimale');
    expect(res.status).toBe(401);
  });

  it('registra il primo token che accede al vault', async () => {
    const vault = newVaultId();
    expect((await push(vault, [blob('primo')], token('a'))).status).toBe(200);
  });

  it('rifiuta un token diverso da quello registrato', async () => {
    // È la garanzia che due vault restano separati anche se qualcuno indovinasse
    // un vaultId: senza il token corretto non si legge nulla.
    const vault = newVaultId();
    await push(vault, [blob('dati riservati')], token('a'));

    const res = await pull(vault, 0, token('b'));
    expect(res.status).toBe(403);
  });

  it('non rivela i dati a chi presenta un token errato', async () => {
    const vault = newVaultId();
    await push(vault, [blob('dati riservati')], token('a'));

    const res = await pull(vault, 0, token('b'));
    const body = await res.text();
    expect(body).not.toContain('dati riservati');
    expect(body).not.toContain(blob('dati riservati'));
  });

  it('accetta di nuovo il token corretto dopo un tentativo fallito', async () => {
    const vault = newVaultId();
    await push(vault, [blob('x')], token('a'));
    await pull(vault, 0, token('b'));

    expect((await pull(vault, 0, token('a'))).status).toBe(200);
  });
});

describe('push', () => {
  let vault: string;
  beforeEach(() => {
    vault = newVaultId();
  });

  it('accetta blob e restituisce il nuovo head', async () => {
    const res = await push(vault, [blob('uno'), blob('due')]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ head: 2, accepted: 2 });
  });

  it('assegna numeri di sequenza crescenti', async () => {
    await push(vault, [blob('uno')]);
    const second = await push(vault, [blob('due')]);
    expect(((await second.json()) as PushBody).head).toBe(2);
  });

  it('rifiuta un corpo non JSON', async () => {
    const res = await SELF.fetch(`${BASE}/v1/vault/${vault}/updates`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token()}` },
      body: 'non json',
    });
    expect(res.status).toBe(400);
  });

  it('rifiuta un array di blob vuoto', async () => {
    expect((await push(vault, [])).status).toBe(400);
  });

  it('rifiuta un blob non stringa', async () => {
    const res = await SELF.fetch(`${BASE}/v1/vault/${vault}/updates`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ blobs: [123] }),
    });
    expect(res.status).toBe(400);
  });

  it('rifiuta base64 non valido', async () => {
    const res = await push(vault, ['!!!non-base64!!!']);
    expect(res.status).toBe(400);
  });

  it('rifiuta troppi blob in una sola richiesta', async () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => blob(`b${i}`));
    expect((await push(vault, tooMany)).status).toBe(413);
  });

  it('rifiuta un blob oltre 1 MB', async () => {
    const huge = btoa('x'.repeat(1024 * 1024 + 10));
    expect((await push(vault, [huge])).status).toBe(413);
  });

  it('non inserisce nulla se un solo blob della richiesta è invalido', async () => {
    // Un inserimento parziale lascerebbe il client incerto su cosa sia stato accettato.
    await push(vault, [blob('valido-iniziale')]);
    const before = (await pullJson(vault)).head;

    await push(vault, [blob('ok'), '!!!non-base64!!!']);

    const after = (await pullJson(vault)).head;
    expect(after).toBe(before);
  });
});

describe('pull', () => {
  let vault: string;
  beforeEach(() => {
    vault = newVaultId();
  });

  it('restituisce un elenco vuoto su un vault nuovo', async () => {
    const body = await pullJson(vault);
    expect(body).toEqual({ updates: [], head: 0, hasMore: false });
  });

  it('restituisce i blob esattamente come inseriti', async () => {
    // Il relay non deve alterare i byte: un solo bit cambiato farebbe fallire
    // l'autenticazione AEAD sul client.
    // Il NUL e la ÿ sono scritti come sequenze di escape e non come byte grezzi: un
    // NUL letterale nel sorgente fa considerare il file **binario** a git — che da
    // allora non ne mostra piu' il diff — e a grep, che lo salta in silenzio. Il
    // valore della stringa e' identico.
    const payload = blob('contenuto cifrato \u0000\u00ff binario');
    await push(vault, [payload]);

    const body = await pullJson(vault);
    expect(body.updates[0]?.blob).toBe(payload);
  });

  it('restituisce solo gli update successivi al cursore', async () => {
    await push(vault, [blob('uno'), blob('due'), blob('tre')]);

    const body = await pullJson(vault, 2);
    expect(body.updates).toHaveLength(1);
    expect(body.updates[0]?.seq).toBe(3);
  });

  it('restituisce un elenco vuoto se il cursore è già aggiornato', async () => {
    await push(vault, [blob('uno')]);
    const body = await pullJson(vault, 1);
    expect(body.updates).toEqual([]);
    expect(body.head).toBe(1);
  });

  it('ordina gli update per sequenza crescente', async () => {
    await push(vault, [blob('a'), blob('b'), blob('c')]);
    const body = await pullJson(vault);
    expect(body.updates.map((u) => u.seq)).toEqual([1, 2, 3]);
  });

  it('rifiuta un cursore negativo o non numerico', async () => {
    expect((await pull(vault, -1)).status).toBe(400);
    const res = await SELF.fetch(`${BASE}/v1/vault/${vault}/updates?since=abc`, {
      headers: { authorization: `Bearer ${token()}` },
    });
    expect(res.status).toBe(400);
  });

  it('pagina i risultati segnalando hasMore', async () => {
    // 250 update: oltre il limite di 200 per risposta.
    for (let i = 0; i < 3; i++) {
      await push(
        vault,
        Array.from({ length: 100 }, (_, j) => blob(`b${i}-${j}`)),
      );
    }

    const first = await pullJson(vault, 0);
    expect(first.updates).toHaveLength(200);
    expect(first.hasMore).toBe(true);
    expect(first.head).toBe(300);

    const lastSeq = first.updates.at(-1)?.seq ?? 0;
    const second = await pullJson(vault, lastSeq);
    expect(second.updates).toHaveLength(100);
    expect(second.hasMore).toBe(false);
  });

  it('preserva i blob attraverso la paginazione, senza perdite né duplicati', async () => {
    const sent = Array.from({ length: 250 }, (_, i) => blob(`update-${i}`));
    for (let i = 0; i < sent.length; i += 100) {
      await push(vault, sent.slice(i, i + 100));
    }

    const received: string[] = [];
    let cursor = 0;
    for (;;) {
      const body = await pullJson(vault, cursor);
      received.push(...body.updates.map((u) => u.blob));
      if (!body.hasMore) break;
      cursor = body.updates.at(-1)?.seq ?? cursor;
    }

    expect(received).toEqual(sent);
  });
});

describe('isolamento fra vault', () => {
  it('non fa trapelare dati da un vault all altro', async () => {
    const vaultA = newVaultId();
    const vaultB = newVaultId();

    await push(vaultA, [blob('segreto di A')], token('a'));
    await push(vaultB, [blob('segreto di B')], token('b'));

    const fromB = await pullJson(vaultB, 0, token('b'));
    expect(fromB.updates).toHaveLength(1);
    expect(fromB.updates[0]?.blob).toBe(blob('segreto di B'));
  });

  it('mantiene contatori di sequenza indipendenti', async () => {
    const vaultA = newVaultId();
    const vaultB = newVaultId();

    await push(vaultA, [blob('1'), blob('2'), blob('3')], token('a'));
    const resB = await push(vaultB, [blob('1')], token('b'));

    expect(((await resB.json()) as PushBody).head).toBe(1);
  });
});

describe('cancellazione del vault', () => {
  it('rimuove tutti i dati', async () => {
    const vault = newVaultId();
    await push(vault, [blob('uno'), blob('due')]);

    const del = await SELF.fetch(`${BASE}/v1/vault/${vault}/vault`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token()}` },
    });
    expect(del.status).toBe(200);

    // Cancellato anche l'authHash: il vault torna disponibile per un nuovo pairing.
    const after = await pullJson(vault, 0, token('c'));
    expect(after.updates).toEqual([]);
    expect(after.head).toBe(0);
  });

  it('richiede autenticazione', async () => {
    const vault = newVaultId();
    await push(vault, [blob('uno')], token('a'));

    const del = await SELF.fetch(`${BASE}/v1/vault/${vault}/vault`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token('b')}` },
    });
    expect(del.status).toBe(403);
  });

  it('lascia il vault utilizzabile dopo la cancellazione', async () => {
    // Regressione: `storage.deleteAll()` su un Durable Object con backend SQLite
    // elimina anche le tabelle. Senza ricreare lo schema, ogni richiesta successiva
    // falliva con `no such table` e la cancellazione rompeva il vault per sempre.
    const vault = newVaultId();
    await push(vault, [blob('vecchio')], token('a'));

    await SELF.fetch(`${BASE}/v1/vault/${vault}/vault`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token('a')}` },
    });

    const res = await push(vault, [blob('nuovo')], token('c'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ head: 1, accepted: 1 });

    const body = await pullJson(vault, 0, token('c'));
    expect(body.updates).toHaveLength(1);
    expect(body.updates[0]?.blob).toBe(blob('nuovo'));
  });
});

describe('pagina di atterraggio degli inviti', () => {
  it('serve una pagina HTML su /j', async () => {
    const res = await SELF.fetch(`${BASE}/j`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('serve la stessa pagina anche con la barra finale', async () => {
    expect((await SELF.fetch(`${BASE}/j/`)).status).toBe(200);
  });

  it('non la costruisce a partire da nulla della richiesta', async () => {
    // È la forma verificabile di «/j non tocca il Durable Object»: la risposta del
    // Worker è byte per byte quella di una funzione che non riceve né `env` né la
    // richiesta, quindi non ha modo di aprire un vault. Se un domani qualcuno vi
    // aggiungesse un dato preso dal vault, questa uguaglianza cadrebbe.
    const served = await (await SELF.fetch(`${BASE}/j`)).text();
    expect(served).toBe(await invitePage().text());
    expect(served).toBe(INVITE_PAGE_HTML);
  });

  it('rifiuta i metodi che non siano una lettura', async () => {
    const res = await SELF.fetch(`${BASE}/j`, { method: 'POST', body: 'x' });
    expect(res.status).toBe(405);
  });

  it('non chiede a nessuno di rinviare il fragment', async () => {
    // Il cuore dell'invito via link: la chiave sta nel fragment, che il browser non
    // manda al server. Basterebbe una `fetch`, un form o un redirect dentro la pagina
    // per rispedirla qui — e finirebbe nei log di Cloudflare, cioè fuori dal modello di
    // minaccia dichiarato.
    for (const forbidden of [
      'fetch(',
      'XMLHttpRequest',
      'sendBeacon',
      'WebSocket',
      'EventSource',
      '<form',
      '<iframe',
      'location.href =',
      'location.replace',
      'location.assign',
      'http-equiv="refresh"',
    ]) {
      expect(INVITE_PAGE_HTML).not.toContain(forbidden);
    }
  });

  it('non carica alcuna risorsa esterna', async () => {
    // Un solo `<img src="https://…">` porterebbe l'URL della pagina — fragment escluso,
    // ma il referrer no — su un server di qualcun altro. La pagina è autoconsistente.
    expect(INVITE_PAGE_HTML).not.toMatch(/(src|href)\s*=\s*["']https?:/i);
    expect(INVITE_PAGE_HTML).not.toContain('@import');
  });

  it('dichiara di non essere raggiungibile dall’esterno né indicizzabile', async () => {
    const res = await SELF.fetch(`${BASE}/j`);
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
  });

  it('riapre l’invito nello schema dell’app', () => {
    // Il valore è duplicato da `JOIN_URI_PREFIX` di @jutrack/core, che il relay non
    // importa di proposito. Cambiarlo da una parte sola porterebbe a un link che apre
    // una schermata inesistente, e l'app non ha modo di segnalarlo.
    expect(JOIN_URI_PREFIX).toBe('jutrack://join');
    expect(INVITE_PAGE_HTML).toContain('"jutrack://join"');
  });
});

describe('informativa privacy', () => {
  it('serve una pagina HTML su /privacy', async () => {
    const res = await SELF.fetch(`${BASE}/privacy`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('serve la stessa pagina anche con la barra finale', async () => {
    expect((await SELF.fetch(`${BASE}/privacy/`)).status).toBe(200);
  });

  it('non la costruisce a partire da nulla della richiesta', async () => {
    const served = await (await SELF.fetch(`${BASE}/privacy`)).text();
    expect(served).toBe(await privacyPage().text());
    expect(served).toBe(PRIVACY_PAGE_HTML);
  });

  it('rifiuta i metodi che non siano una lettura', async () => {
    const res = await SELF.fetch(`${BASE}/privacy`, { method: 'POST', body: 'x' });
    expect(res.status).toBe(405);
  });

  it('non carica alcuna risorsa esterna e non esegue script', async () => {
    // Stessa regola di `/j`: la pagina è autoconsistente. Qui in più non c'è proprio
    // niente da eseguire, e l'header lo dichiara.
    expect(PRIVACY_PAGE_HTML).not.toMatch(/(src|href)\s*=\s*["']https?:/i);
    expect(PRIVACY_PAGE_HTML).not.toContain('@import');
    expect(PRIVACY_PAGE_HTML).not.toContain('<script');
    const res = await SELF.fetch(`${BASE}/privacy`);
    expect(res.headers.get('content-security-policy')).toContain("script-src 'none'");
  });

  it('resta indicizzabile, al contrario della pagina degli inviti', async () => {
    // È la differenza deliberata fra le due: `/j` porta una chiave nel fragment e non
    // deve finire in nessun indice, mentre il Play Store pretende che l'informativa sia
    // un URL pubblico e raggiungibile. Un `noindex` copiato per abitudine da `/j` la
    // renderebbe silenziosamente meno citabile.
    const res = await SELF.fetch(`${BASE}/privacy`);
    expect(res.headers.get('x-robots-tag')).toBeNull();
    expect(PRIVACY_PAGE_HTML).not.toContain('noindex');
  });

  it('dice entrambe le lingue che l’app parla', () => {
    // L'app è italiana e inglese dallo Step 37: un'informativa in una lingua sola
    // lascerebbe metà degli utenti senza il documento che li riguarda.
    expect(PRIVACY_PAGE_HTML).toContain('id="it"');
    expect(PRIVACY_PAGE_HTML).toContain('id="en"');
  });

  /** Le due meta' del documento, separate: e' il modo di accorgersi che una sezione
   *  nuova e' stata scritta in una lingua sola, che e' il difetto piu' facile da fare
   *  su una pagina bilingue e il piu' difficile da vedere rileggendola. */
  function meta(): { it: string; en: string } {
    const i = PRIVACY_PAGE_HTML.indexOf('id="en"');
    expect(i).toBeGreaterThan(0);
    return { it: PRIVACY_PAGE_HTML.slice(0, i), en: PRIVACY_PAGE_HTML.slice(i) };
  }

  it('nomina entrambi i fornitori, in tutte e due le lingue', () => {
    // Dallo Step 47 non e' piu' solo Cloudflare: l'app chiede a Expo se esiste un
    // aggiornamento, e un fornitore che tratta dati e non e' nominato qui e'
    // precisamente cio' che rende un'informativa inesatta.
    const { it: ita, en } = meta();
    for (const fornitore of ['Cloudflare', 'Expo']) {
      expect(ita).toContain(fornitore);
      expect(en).toContain(fornitore);
    }
  });

  it('non nomina fornitori che l app non contatta piu', () => {
    // Sentry e' stato installato e poi tolto lo stesso giorno. Un'informativa che
    // dichiara un trattamento che non avviene e' inesatta quanto una che ne tace uno:
    // questo test e' la meta' che manca all'altro qui sopra.
    expect(PRIVACY_PAGE_HTML).not.toContain('Sentry');
  });

  it('dice in tutte e due le lingue che l app si aggiorna da se', () => {
    const { it: ita, en } = meta();
    expect(ita).toContain('Aggiornamenti dell');
    expect(en).toContain('App updates');
  });

  it('non va in produzione senza titolare e recapito', () => {
    // Il GDPR chiede un titolare identificabile e il Play Store un contatto che
    // risponda: il segnaposto deve fallire qui, non in revisione.
    expect(CONTROLLER).not.toBe('DA DEFINIRE');
    expect(CONTACT_EMAIL).toContain('@');
  });
});

describe('binding dell ambiente', () => {
  it('espone il namespace VAULT_ROOM', () => {
    expect(env.VAULT_ROOM).toBeDefined();
  });
});
