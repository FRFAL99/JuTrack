import { describe, expect, it } from 'vitest';
import type { SyncState } from '@jutrack/core';
import {
  parseSyncMarks,
  pruneSyncMarks,
  reviewSync,
  serializeSyncMarks,
  syncContent,
  SYNC_STALL_HOURS,
  type SyncMarks,
} from './sync';

const VAULT = 'v1';
const OTHER = 'v2';
const KNOWN = [VAULT, OTHER];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = new Date(2026, 7, 12, 9, 0).getTime();

/** Un giro solo, con i parametri che il singolo test non guarda già a posto. */
function review(
  phase: SyncState['phase'],
  marks: SyncMarks,
  now: number,
  knownVaultIds: readonly string[] = KNOWN,
) {
  return reviewSync({ vaultId: VAULT, phase, marks, knownVaultIds, now });
}

describe('parseSyncMarks', () => {
  it('rilegge quello che ha scritto', () => {
    const marks: SyncMarks = { [VAULT]: { level: 'stalled', since: T0, notified: true } };
    expect(parseSyncMarks(serializeSyncMarks(marks))).toEqual(marks);
  });

  it.each([
    ['non è mai stato scritto', null],
    ['non è JSON', 'boh'],
    ['non è un oggetto', '"fermo"'],
    ['è null', 'null'],
    ['è un elenco', '[]'],
  ])('riparte da zero se il valore %s', (_caso, raw) => {
    expect(parseSyncMarks(raw)).toEqual({});
  });

  it('scarta una voce sola e tiene le altre', () => {
    // Un segno illeggibile non deve portarsi via l'episodio di un altro gruppo: il conto
    // riparte solo per quello rotto.
    const raw = `{"v1":{"level":"boh","since":1,"notified":true},"v2":{"level":"stopped","since":${T0},"notified":false}}`;
    expect(Object.keys(parseSyncMarks(raw))).toEqual([OTHER]);
  });

  it.each([
    ['manca del tutto', '{"v1":{"level":"stalled","notified":true}}'],
    ['non è un numero', '{"v1":{"level":"stalled","since":"ieri","notified":true}}'],
    ['è zero', '{"v1":{"level":"stalled","since":0,"notified":true}}'],
  ])('scarta il segno se `since` %s', (_caso, raw) => {
    // Senza un istante credibile non c'è durata da misurare, e uno zero farebbe scadere
    // l'episodio all'istante: meglio ricominciare a contare da adesso.
    expect(parseSyncMarks(raw)).toEqual({});
  });

  it('tratta come «non ancora avvisato» tutto ciò che non è vero', () => {
    expect(parseSyncMarks(`{"v1":{"level":"stalled","since":${T0},"notified":"sì"}}`)).toEqual({
      [VAULT]: { level: 'stalled', since: T0, notified: false },
    });
  });
});

describe('pruneSyncMarks', () => {
  it('tiene solo i gruppi che esistono ancora', () => {
    const marks: SyncMarks = {
      [VAULT]: { level: 'stalled', since: T0, notified: false },
      sparito: { level: 'stopped', since: T0, notified: true },
    };
    expect(Object.keys(pruneSyncMarks(marks, KNOWN))).toEqual([VAULT]);
  });
});

describe('reviewSync', () => {
  it('non tocca niente durante `idle` e `syncing`', () => {
    // Sono il prima e il durante di ogni giro, e l'app ci passa a ogni avvio: trattarle
    // come «a posto» azzererebbe il conto a ogni apertura, cioè non arriverebbe mai in
    // fondo proprio per chi apre l'app tutti i giorni.
    const marks: SyncMarks = { [VAULT]: { level: 'stalled', since: T0, notified: false } };
    for (const phase of ['idle', 'syncing'] as const) {
      const out = review(phase, marks, T0 + 2 * DAY);
      expect(out.alert).toBeNull();
      expect(out.marks).toEqual(marks);
      expect(out.changed).toBe(false);
    }
  });

  it('comincia a contare senza dire niente', () => {
    const out = review('error', {}, T0);
    expect(out.alert).toBeNull();
    expect(out.marks[VAULT]).toEqual({ level: 'stalled', since: T0, notified: false });
    expect(out.changed).toBe(true);
  });

  it('tace finché la scadenza non è compiuta', () => {
    const marks = review('error', {}, T0).marks;
    const out = review('error', marks, T0 + SYNC_STALL_HOURS * HOUR - 1);
    expect(out.alert).toBeNull();
    expect(out.changed).toBe(false);
  });

  it('avvisa a scadenza compiuta, e dice da quanto dura', () => {
    const marks = review('offline', {}, T0).marks;
    const out = review('offline', marks, T0 + SYNC_STALL_HOURS * HOUR);
    expect(out.alert).toEqual({ phase: 'offline', forMs: SYNC_STALL_HOURS * HOUR });
    expect(out.marks[VAULT]?.notified).toBe(true);
    expect(out.changed).toBe(true);
  });

  it('conta anche il tempo con l app chiusa', () => {
    // È la ragione per cui i segni stanno su disco: la durata da misurare è più lunga di
    // una sessione, e un contatore in memoria non arriverebbe mai a ventiquattr'ore.
    const marks = parseSyncMarks(serializeSyncMarks(review('error', {}, T0).marks));
    expect(review('error', marks, T0 + 5 * DAY).alert).toEqual({ phase: 'error', forMs: 5 * DAY });
  });

  it('avvisa una volta sola per episodio', () => {
    let marks = review('error', {}, T0).marks;
    marks = review('error', marks, T0 + DAY).marks;
    for (const at of [T0 + DAY + HOUR, T0 + 3 * DAY, T0 + 30 * DAY]) {
      const out = review('error', marks, at);
      expect(out.alert).toBeNull();
      marks = out.marks;
    }
  });

  it('avvisa subito quando il relay rifiuta la chiave', () => {
    // Qui non c'è nessun tentativo in arrivo — il motore ha smesso — e aspettare un giorno
    // per dirlo regalerebbe un giorno di divergenza.
    const out = review('blocked', {}, T0);
    expect(out.alert).toEqual({ phase: 'blocked', forMs: 0 });
    expect(out.marks[VAULT]).toEqual({ level: 'stopped', since: T0, notified: true });
  });

  it('riavvisa se un episodio in ritardo diventa fermo', () => {
    // Sono due fatti diversi con due rimedi diversi: il primo passa da sé, il secondo no.
    let marks = review('error', {}, T0).marks;
    marks = review('error', marks, T0 + DAY).marks;
    const out = review('blocked', marks, T0 + DAY + HOUR);
    expect(out.alert?.phase).toBe('blocked');
  });

  it('non riavvisa se un episodio fermo ricade in errore', () => {
    // Il livello sale e non scende, come per i budget: è lo stesso guaio visto da
    // un'altra angolazione, e ridirlo insegna a non leggere gli avvisi.
    const marks = review('blocked', {}, T0).marks;
    const out = review('error', marks, T0 + 10 * DAY);
    expect(out.alert).toBeNull();
    expect(out.marks[VAULT]?.level).toBe('stopped');
  });

  it('un sync riuscito chiude l episodio e riarma il prossimo', () => {
    let marks = review('error', {}, T0).marks;
    marks = review('error', marks, T0 + DAY).marks;

    const recovered = review('synced', marks, T0 + DAY + HOUR);
    expect(recovered.marks[VAULT]).toBeUndefined();
    expect(recovered.changed).toBe(true);

    marks = review('error', recovered.marks, T0 + 2 * DAY).marks;
    expect(review('error', marks, T0 + 3 * DAY).alert).not.toBeNull();
  });

  it('non riscrive `app_meta` quando non è cambiato niente', () => {
    const marks = review('synced', {}, T0).marks;
    expect(review('synced', marks, T0 + DAY).changed).toBe(false);
  });

  it('ogni gruppo tiene il suo conto', () => {
    // I motori sono uno per gruppo: che il relay rifiuti una chiave non dice niente
    // sull'altra.
    const marks = reviewSync({
      vaultId: OTHER,
      phase: 'blocked',
      marks: {},
      knownVaultIds: KNOWN,
      now: T0,
    }).marks;
    const out = review('error', marks, T0 + DAY);
    expect(out.marks[OTHER]?.level).toBe('stopped');
    expect(out.marks[VAULT]?.level).toBe('stalled');
  });

  it('pota i gruppi da cui si è usciti', () => {
    const marks: SyncMarks = { sparito: { level: 'stalled', since: T0, notified: true } };
    const out = review('syncing', marks, T0 + DAY);
    expect(out.marks).toEqual({});
    expect(out.changed).toBe(true);
  });
});

describe('syncContent', () => {
  const NAME = 'Casa';

  it('dice il nome del gruppo in tutti e tre i casi', () => {
    // L'avviso si legge ore dopo, e con più gruppi «non si sincronizza» senza dire cosa
    // obbliga ad aprire l'app per scoprirlo.
    for (const phase of ['offline', 'error', 'blocked'] as const) {
      expect(syncContent({ phase, forMs: 2 * DAY }, NAME).body).toContain(NAME);
    }
  });

  it('manda a cercare il rimedio giusto', () => {
    expect(syncContent({ phase: 'offline', forMs: DAY }, NAME).body).toContain('connessione');
    expect(syncContent({ phase: 'error', forMs: DAY }, NAME).body).toContain('relay non risponde');
    expect(syncContent({ phase: 'blocked', forMs: 0 }, NAME).body).toContain('invito nuovo');
  });

  it('usa la stessa parola del pallino in Tu quando il sync è fermo', () => {
    // `describeSync` dice «Sincronizzazione fermata»: chi l'ha già letta lì deve
    // riconoscerla, non chiedersi se sono due guasti diversi.
    expect(syncContent({ phase: 'blocked', forMs: 0 }, NAME).title).toBe(
      'Sincronizzazione fermata',
    );
  });

  it('dice «un giorno» al singolare e conta i giorni oltre', () => {
    expect(syncContent({ phase: 'error', forMs: DAY }, NAME).body).toContain('da un giorno');
    expect(syncContent({ phase: 'error', forMs: 3 * DAY + HOUR }, NAME).body).toContain(
      'da 3 giorni',
    );
  });
});
