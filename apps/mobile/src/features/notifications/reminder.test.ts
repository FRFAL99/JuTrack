import { describe, expect, it } from 'vitest';
import { nextReminderAt, REMINDER_DAYS, REMINDER_HOUR, reminderContent } from './reminder';

/**
 * Le date si costruiscono con i componenti locali, come fa l'implementazione: così il test
 * dice la stessa cosa in qualunque fuso giri la CI, senza fissare un'ora UTC che sarebbe
 * giusta solo a Roma.
 */
const at = (y: number, m: number, d: number, h = 0, min = 0): number =>
  new Date(y, m - 1, d, h, min).getTime();

describe('nextReminderAt', () => {
  it('cade N giorni dopo l ultima spesa, all ora scelta', () => {
    const last = at(2026, 8, 12, 9, 30);
    expect(nextReminderAt(last, at(2026, 8, 12, 10))).toBe(at(2026, 8, 15, REMINDER_HOUR));
  });

  it('conta i giorni dalla data, non dall ora', () => {
    // Una spesa registrata alle 23:50 e una alle 00:10 del giorno dopo non devono dare
    // scadenze a dodici ore di distanza: il promemoria è un fatto di giornate.
    const sera = nextReminderAt(at(2026, 8, 12, 23, 50), at(2026, 8, 12, 23, 55));
    expect(sera).toBe(at(2026, 8, 15, REMINDER_HOUR));
  });

  it('parte da adesso se non si è mai registrato niente', () => {
    // È il caso di chi accende l'interruttore appena installata l'app: il conto comincia
    // dall'accensione, non da un passato che non esiste.
    const now = at(2026, 8, 12, 10);
    expect(nextReminderAt(null, now)).toBe(at(2026, 8, 15, REMINDER_HOUR));
  });

  it('va alla prossima occorrenza dell ora se la scadenza è già passata', () => {
    // Succede appena si sta senza aprire l'app più di N giorni: programmare nel passato
    // farebbe scattare la notifica all'istante.
    const last = at(2026, 8, 1, 12);
    const now = at(2026, 8, 12, 10);
    expect(nextReminderAt(last, now)).toBe(at(2026, 8, 12, REMINDER_HOUR));
  });

  it('passa a domani se l ora di oggi è già trascorsa', () => {
    const last = at(2026, 8, 1, 12);
    const now = at(2026, 8, 12, REMINDER_HOUR, 30);
    expect(nextReminderAt(last, now)).toBe(at(2026, 8, 13, REMINDER_HOUR));
  });

  it('non restituisce mai un istante nel passato', () => {
    // L'invariante che tiene insieme le due regole sopra, su un anno di casi.
    const now = at(2026, 8, 12, 15, 17);
    for (let daysAgo = 0; daysAgo <= 365; daysAgo++) {
      const last = at(2026, 8, 12 - daysAgo, 15, 17);
      expect(nextReminderAt(last, now)).toBeGreaterThan(now);
    }
  });

  it('scavalca il cambio di ora legale senza spostarsi di un ora', () => {
    // In Europa l'ora legale finisce l'ultima domenica di ottobre. Sommando giorni in
    // millisecondi la scadenza cadrebbe alle 19 invece che alle 20: l'aritmetica passa dai
    // componenti del Date proprio per questo.
    const due = new Date(nextReminderAt(at(2026, 10, 24, 12), at(2026, 10, 24, 13)));
    expect(due.getHours()).toBe(REMINDER_HOUR);
    expect(due.getDate()).toBe(27);
  });
});

describe('reminderContent', () => {
  it('non dice «da N giorni» a chi non ha mai registrato nulla', () => {
    // Sarebbe falso, ed è lo stesso criterio per cui «Metà e metà» non si scrive in tre.
    expect(reminderContent(null).body).not.toContain(`${REMINDER_DAYS} giorni`);
  });

  it('dice da quanti giorni quando c è un passato a cui riferirsi', () => {
    expect(reminderContent(at(2026, 8, 9, 12)).body).toContain(`${REMINDER_DAYS} giorni`);
  });
});
