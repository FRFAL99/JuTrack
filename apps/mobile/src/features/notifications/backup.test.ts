import { describe, expect, it } from 'vitest';
import {
  backupContent,
  BACKUP_MIN_EXPENSES,
  markBackedUp,
  parseBackupMarks,
  pruneBackupMarks,
  reviewBackup,
  serializeBackupMarks,
  type BackupMarks,
} from './backup';

const VAULT = 'aabb';
const OTHER = 'ccdd';

/** Il caso normale: un solo gruppo su questo telefono. */
function review(args: {
  expenseCount: number;
  marks?: BackupMarks;
  knownVaultIds?: readonly string[];
}) {
  return reviewBackup({
    vaultId: VAULT,
    expenseCount: args.expenseCount,
    marks: args.marks ?? {},
    knownVaultIds: args.knownVaultIds ?? [VAULT],
  });
}

describe('reviewBackup — quando avvisa', () => {
  it('avvisa un gruppo mai salvato che ha superato la soglia', () => {
    const { alert } = review({ expenseCount: BACKUP_MIN_EXPENSES });
    expect(alert).toEqual({ vaultId: VAULT, expenseCount: BACKUP_MIN_EXPENSES });
  });

  it('tace sotto soglia: un gruppo appena creato non ha ancora niente da perdere', () => {
    const { alert, changed } = review({ expenseCount: BACKUP_MIN_EXPENSES - 1 });
    expect(alert).toBeNull();
    // E non consuma l'unico avviso che ha a disposizione: non segna niente.
    expect(changed).toBe(false);
  });

  it('avvisa una volta sola per gruppo', () => {
    const first = review({ expenseCount: 10 });
    expect(first.alert).not.toBeNull();

    const second = review({ expenseCount: 40, marks: first.marks });
    expect(second.alert).toBeNull();
    expect(second.changed).toBe(false);
  });

  it('non avvisa più una chiave salvata, per quante spese arrivino', () => {
    const marks = markBackedUp({}, VAULT, 1_000);
    const { alert, changed } = review({ expenseCount: 5_000, marks });
    expect(alert).toBeNull();
    expect(changed).toBe(false);
  });

  it('salvare la chiave dopo l’avviso lo chiude per sempre', () => {
    const warned = review({ expenseCount: 10 });
    const saved = markBackedUp(warned.marks, VAULT, 2_000);
    expect(review({ expenseCount: 99, marks: saved }).alert).toBeNull();
  });

  it('ogni gruppo ha la sua chiave, quindi il suo avviso', () => {
    const marks = markBackedUp({}, OTHER, 1_000);
    const { alert } = review({ expenseCount: 10, marks, knownVaultIds: [VAULT, OTHER] });
    expect(alert?.vaultId).toBe(VAULT);
  });
});

describe('reviewBackup — i segni si tengono anche a interruttore spento', () => {
  it('segna di aver avvisato, così riaccendere non racconta la stessa cosa', () => {
    const { marks, changed } = review({ expenseCount: 10 });
    expect(changed).toBe(true);
    expect(marks[VAULT]).toEqual({ savedAt: null, notified: true });
  });

  it('non riscrive app_meta quando non è cambiato niente', () => {
    const marks = markBackedUp({}, VAULT, 1_000);
    expect(review({ expenseCount: 10, marks }).changed).toBe(false);
  });
});

describe('pruneBackupMarks', () => {
  it('butta via i gruppi che non ci sono più', () => {
    const marks = markBackedUp(markBackedUp({}, VAULT, 1), OTHER, 2);
    expect(Object.keys(pruneBackupMarks(marks, [VAULT]))).toEqual([VAULT]);
  });

  it('un gruppo lasciato e rifatto riparte da «mai salvato»', () => {
    const marks = markBackedUp({}, VAULT, 1_000);
    // Uscire cancella la chiave davvero: il segno non deve sopravviverle.
    const afterLeaving = pruneBackupMarks(marks, []);
    const { alert } = review({ expenseCount: 10, marks: afterLeaving });
    expect(alert).not.toBeNull();
  });

  it('la potatura passa da reviewBackup, non solo dalla funzione a parte', () => {
    const marks = markBackedUp({}, OTHER, 1_000);
    const { marks: next } = review({ expenseCount: 1, marks, knownVaultIds: [VAULT] });
    expect(next[OTHER]).toBeUndefined();
  });
});

describe('parseBackupMarks', () => {
  it('rilegge quello che serializeBackupMarks ha scritto', () => {
    const marks = markBackedUp({}, VAULT, 1_700_000_000_000);
    expect(parseBackupMarks(serializeBackupMarks(marks))).toEqual(marks);
  });

  it('un valore mai scritto vale «nessun segno»', () => {
    expect(parseBackupMarks(null)).toEqual({});
  });

  it('un JSON rotto vale «nessun segno», cioè «chiave mai salvata»', () => {
    // La direzione dell'errore è opposta a quella di parseSyncMarks, ed è deliberata:
    // sbagliare qui verso il silenzio significherebbe tacere su una chiave a rischio.
    expect(parseBackupMarks('{ rotto')).toEqual({});
    expect(parseBackupMarks('[1,2]')).toEqual({});
  });

  it('scarta i segni illeggibili uno per uno, tenendo gli altri', () => {
    const raw = JSON.stringify({
      [VAULT]: { savedAt: 1_000, notified: true },
      [OTHER]: 'non un oggetto',
    });
    expect(parseBackupMarks(raw)).toEqual({ [VAULT]: { savedAt: 1_000, notified: true } });
  });

  it('un savedAt non credibile vale «mai salvato», non «salvato nel 1970»', () => {
    const raw = JSON.stringify({ [VAULT]: { savedAt: 0, notified: false } });
    expect(parseBackupMarks(raw)[VAULT]).toEqual({ savedAt: null, notified: false });

    const negative = JSON.stringify({ [VAULT]: { savedAt: -5, notified: false } });
    expect(parseBackupMarks(negative)[VAULT]?.savedAt).toBeNull();
  });
});

describe('markBackedUp', () => {
  it('registra l’istante senza perdere il fatto di aver già avvisato', () => {
    const warned = review({ expenseCount: 10 }).marks;
    expect(markBackedUp(warned, VAULT, 5_000)[VAULT]).toEqual({ savedAt: 5_000, notified: true });
  });

  it('funziona anche su un gruppo di cui non si sapeva niente', () => {
    expect(markBackedUp({}, VAULT, 5_000)[VAULT]).toEqual({ savedAt: 5_000, notified: false });
  });

  it('non tocca gli altri gruppi', () => {
    const marks = markBackedUp({}, OTHER, 1_000);
    expect(markBackedUp(marks, VAULT, 2_000)[OTHER]?.savedAt).toBe(1_000);
  });
});

describe('backupContent', () => {
  it('nomina il gruppo: con più gruppi, «la chiave» non dice quale', () => {
    const content = backupContent({ vaultId: VAULT, expenseCount: 12 }, 'Casa');
    expect(content.body).toContain('«Casa»');
  });

  it('dice quante spese: è la differenza fra un avviso e un rimprovero', () => {
    expect(backupContent({ vaultId: VAULT, expenseCount: 12 }, 'Casa').body).toContain('12 spese');
  });

  it('dice «non risulta», perché l’app conosce solo i backup che ha visto fare', () => {
    const content = backupContent({ vaultId: VAULT, expenseCount: 12 }, 'Casa');
    expect(content.body).toContain('non risulta');
    expect(content.body).not.toContain('non hai mai');
  });
});
