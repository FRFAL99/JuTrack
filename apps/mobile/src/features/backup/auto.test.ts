import { describe, expect, it } from 'vitest';
import {
  backupFileName,
  backupFilePrefix,
  fileSlug,
  filesToPrune,
  markBackedUp,
  parseBackupMarks,
  pruneBackupMarks,
  reviewAutoBackup,
  serializeBackupMarks,
  type BackupMarks,
} from './auto';

const DAY = 24 * 60 * 60 * 1000;
const now = 1_760_000_000_000;

describe('parseBackupMarks', () => {
  it('rilegge quello che ha scritto', () => {
    const marks: BackupMarks = { v1: { lastBackupAt: now, expenseCount: 12 } };
    expect(parseBackupMarks(serializeBackupMarks(marks))).toEqual(marks);
  });

  it('un segno illeggibile vale «mai fatto», non «fatto poco fa»', () => {
    // La direzione dell'errore è deliberata: sbagliare dall'altra parte produrrebbe
    // silenzio su dei dati a rischio. Un backup di troppo costa qualche centinaio di KB.
    expect(parseBackupMarks('non è json')).toEqual({});
    expect(parseBackupMarks('[1,2,3]')).toEqual({});
    expect(parseBackupMarks(null)).toEqual({});
  });

  it('scarta un segno per volta, non l’intera tabella', () => {
    const raw = JSON.stringify({
      buono: { lastBackupAt: now, expenseCount: 3 },
      rotto: { lastBackupAt: 'ieri' },
      negativo: { lastBackupAt: -5 },
    });
    expect(Object.keys(parseBackupMarks(raw))).toEqual(['buono']);
  });

  it('un conteggio mancante vale zero, invece di buttare via il segno', () => {
    // La data è la parte che serve a questo file; il conteggio serve all'avviso dello
    // Step 66, e la sua assenza non è una ragione per rifare un backup appena fatto.
    const raw = JSON.stringify({ v1: { lastBackupAt: now } });
    expect(parseBackupMarks(raw)).toEqual({ v1: { lastBackupAt: now, expenseCount: 0 } });
  });
});

describe('reviewAutoBackup', () => {
  it('un gruppo mai salvato va salvato subito', () => {
    const review = reviewAutoBackup({ vaultIds: ['v1'], marks: {}, nowMs: now });
    expect(review.due).toEqual(['v1']);
  });

  it('sotto la soglia non si fa niente', () => {
    const marks: BackupMarks = { v1: { lastBackupAt: now - 3 * DAY, expenseCount: 1 } };
    expect(reviewAutoBackup({ vaultIds: ['v1'], marks, nowMs: now }).due).toEqual([]);
  });

  it('alla soglia esatta si fa', () => {
    const marks: BackupMarks = { v1: { lastBackupAt: now - 7 * DAY, expenseCount: 1 } };
    expect(reviewAutoBackup({ vaultIds: ['v1'], marks, nowMs: now }).due).toEqual(['v1']);
  });

  it('vale per ogni gruppo per conto suo, non per il telefono', () => {
    // È il difetto che la schermata aveva prima: un export copriva il gruppo aperto, e
    // chi ne ha tre doveva ricordarsi di ripetere il gesto tre volte.
    const marks: BackupMarks = {
      vecchio: { lastBackupAt: now - 30 * DAY, expenseCount: 1 },
      fresco: { lastBackupAt: now - 1 * DAY, expenseCount: 1 },
    };
    const review = reviewAutoBackup({
      vaultIds: ['vecchio', 'fresco', 'nuovo'],
      marks,
      nowMs: now,
    });
    expect(review.due).toEqual(['vecchio', 'nuovo']);
  });

  it('**un orologio spostato all’indietro non blocca il backup per anni**', () => {
    // Un segno «nel futuro» con un confronto ingenuo darebbe una differenza negativa, che
    // non supera mai la soglia: il backup smetterebbe di partire e nessuno lo saprebbe.
    const marks: BackupMarks = { v1: { lastBackupAt: now + 400 * DAY, expenseCount: 1 } };
    expect(reviewAutoBackup({ vaultIds: ['v1'], marks, nowMs: now }).due).toEqual(['v1']);
  });

  it('pota i segni dei gruppi che non ci sono più, e lo segnala', () => {
    const marks: BackupMarks = {
      resta: { lastBackupAt: now, expenseCount: 1 },
      sparito: { lastBackupAt: now, expenseCount: 1 },
    };
    const review = reviewAutoBackup({ vaultIds: ['resta'], marks, nowMs: now });
    expect(Object.keys(review.marks)).toEqual(['resta']);
    expect(review.changed).toBe(true);
  });

  it('senza niente da potare non dichiara cambiamenti, per non riscrivere a vuoto', () => {
    const marks: BackupMarks = { v1: { lastBackupAt: now, expenseCount: 1 } };
    expect(reviewAutoBackup({ vaultIds: ['v1'], marks, nowMs: now }).changed).toBe(false);
  });

  it('**non segna come fatti i gruppi che restituisce**', () => {
    // Il segno si scrive quando il file è finito sul disco. Segnarlo qui vorrebbe dire che
    // una scrittura fallita spegne il backup per altri sette giorni, proprio dopo aver
    // fallito — e in silenzio.
    const review = reviewAutoBackup({ vaultIds: ['v1'], marks: {}, nowMs: now });
    expect(review.due).toEqual(['v1']);
    expect(review.marks.v1).toBeUndefined();
  });
});

describe('markBackedUp', () => {
  it('registra istante e conteggio, senza toccare gli altri gruppi', () => {
    const before: BackupMarks = { altro: { lastBackupAt: 1, expenseCount: 9 } };
    const after = markBackedUp(before, 'v1', now, 42);
    expect(after).toEqual({
      altro: { lastBackupAt: 1, expenseCount: 9 },
      v1: { lastBackupAt: now, expenseCount: 42 },
    });
  });

  it('dopo averlo segnato, quel gruppo esce dal giro fino alla soglia', () => {
    const marks = markBackedUp({}, 'v1', now, 3);
    expect(reviewAutoBackup({ vaultIds: ['v1'], marks, nowMs: now }).due).toEqual([]);
    expect(reviewAutoBackup({ vaultIds: ['v1'], marks, nowMs: now + 8 * DAY }).due).toEqual(['v1']);
  });
});

describe('pruneBackupMarks', () => {
  it('tiene solo i gruppi che esistono ancora', () => {
    const marks: BackupMarks = {
      a: { lastBackupAt: 1, expenseCount: 0 },
      b: { lastBackupAt: 2, expenseCount: 0 },
    };
    expect(Object.keys(pruneBackupMarks(marks, ['b']))).toEqual(['b']);
  });
});

describe('fileSlug', () => {
  it('riduce un nome a qualcosa che si può usare come nome di file', () => {
    expect(fileSlug('Casa')).toBe('casa');
    expect(fileSlug('Spese di Casa')).toBe('spese-di-casa');
  });

  it('**toglie le barre, che il modulo nativo rifiuta**', () => {
    // `validateFileSystemChildName` rifiuta `/` e `\`: un gruppo «Casa/Ufficio» farebbe
    // fallire il backup in silenzio, e solo quello.
    expect(fileSlug('Casa/Ufficio')).toBe('casa-ufficio');
    expect(fileSlug('Casa\\Ufficio')).toBe('casa-ufficio');
  });

  it('toglie anche i segni che i filesystem sotto una cartella SAF rifiutano', () => {
    expect(fileSlug('Viaggio: Perù 2026?')).toBe('viaggio-peru-2026');
    expect(fileSlug('a*b"c<d>e|f')).toBe('a-b-c-d-e-f');
  });

  it('conserva la lettera sotto l’accento, invece di perderla', () => {
    expect(fileSlug('Perù')).toBe('peru');
    expect(fileSlug('Caffè')).toBe('caffe');
  });

  it('non lascia trattini in testa o in coda', () => {
    expect(fileSlug('  Casa  ')).toBe('casa');
    expect(fileSlug('—Casa—')).toBe('casa');
  });

  it('si riduce a niente su un nome di soli emoji, e va bene così', () => {
    // Meglio vuoto che inventato: chi chiama ripiega sull'id, che è sempre distinto.
    expect(fileSlug('🛒🏠')).toBe('');
  });

  it('tronca i nomi lunghissimi', () => {
    expect(fileSlug('a'.repeat(200))).toHaveLength(40);
  });
});

describe('backupFileName', () => {
  const day = new Date(2026, 8, 13); // 13 settembre 2026, ora locale

  it('mette il nome del gruppo e la data civile locale', () => {
    expect(backupFileName('Casa', 'abc123456789', day)).toBe('jutrack-casa-2026-09-13.json');
  });

  it('ripiega sull’id quando lo slug resta vuoto', () => {
    // Due gruppi di soli emoji darebbero altrimenti lo stesso nome, e la potatura ne
    // cancellerebbe uno credendo di cancellare una copia vecchia dell'altro.
    expect(backupFileName('🛒', 'abc123456789', day)).toBe('jutrack-abc12345-2026-09-13.json');
    expect(backupFileName('🏠', 'def456789012', day)).toBe('jutrack-def45678-2026-09-13.json');
  });

  it('il prefisso combacia col nome, o la potatura non riconoscerebbe i propri file', () => {
    const name = backupFileName('Casa', 'abc123456789', day);
    expect(name.startsWith(backupFilePrefix('Casa', 'abc123456789'))).toBe(true);
  });
});

describe('filesToPrune', () => {
  const prefix = 'jutrack-casa-';
  const names = [
    'jutrack-casa-2026-09-01.json',
    'jutrack-casa-2026-09-08.json',
    'jutrack-casa-2026-09-13.json',
    'jutrack-casa-2026-08-25.json',
  ];

  it('tiene le ultime copie e restituisce le più vecchie', () => {
    expect(filesToPrune(names, prefix, 3)).toEqual(['jutrack-casa-2026-08-25.json']);
  });

  it('non cancella niente se le copie sono già poche', () => {
    expect(filesToPrune(names.slice(0, 2), prefix, 3)).toEqual([]);
  });

  it('**non tocca i file di un altro gruppo**', () => {
    const misti = [...names, 'jutrack-ufficio-2026-01-01.json', 'jutrack-ufficio-2026-01-02.json'];
    expect(filesToPrune(misti, prefix, 3)).toEqual(['jutrack-casa-2026-08-25.json']);
  });

  it('**non tocca i file che non ha scritto lui**', () => {
    // La cartella può essere una qualsiasi, scelta dall'utente, con dentro le sue cose. Un
    // nome col prefisso giusto ma una coda che non è una data non è roba nostra.
    const estranei = [
      'jutrack-casa-appunti.json',
      'jutrack-casa-2026-09-13.json.bak',
      'jutrack-casa-copia.json',
    ];
    expect(filesToPrune([...names, ...estranei], prefix, 0)).toEqual([...names].sort());
  });

  it('ordina per nome e non per come arrivano dalla cartella', () => {
    // La data di modifica dentro una cartella SAF la decide il fornitore di documenti, e
    // Drive o Nextcloud la riscrivono quando gli pare. Il nome invece l'abbiamo scritto noi.
    const disordinati = [...names].reverse();
    expect(filesToPrune(disordinati, prefix, 1)).toEqual([
      'jutrack-casa-2026-08-25.json',
      'jutrack-casa-2026-09-01.json',
      'jutrack-casa-2026-09-08.json',
    ]);
  });
});
