/**
 * Validità di una data civile `YYYY-MM-DD`.
 *
 * Finché la data di una spesa la scriveva `todayIso()` questa guardia non serviva: la
 * stringa nasceva da tre `getFullYear`/`getMonth`/`getDate` e non poteva essere altro. Da
 * quando la sceglie una persona invece sì, e una data malformata non si manifesta dove è
 * stata scritta: `monthOf` è uno `slice(0, 7)` cieco, quindi `2026-9-3` finisce nel mese
 * `2026-9`, che non è un mese e non compare in nessun bucket. La spesa sparisce dai totali
 * mensili e dalla heatmap restando visibile nella lista — il genere di difetto che si nota
 * a fine mese, quando i conti non tornano, e che a quel punto non si sa più da dove venga.
 *
 * Sta in `model/` e non in `insights/calendar.ts`, dove pure vive l'aritmetica sui giorni:
 * la usa `VaultStore` in scrittura, e `model` non può dipendere da `insights` — è
 * `insights` a dipendere da `model`.
 */
const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * La stringa è una data civile esistente.
 *
 * **La forma non basta**: `2026-02-30` e `2026-13-01` passano la regex e non sono giorni.
 * Il controllo è un giro attraverso `Date.UTC` — che normalizza il 30 febbraio in 2 marzo —
 * e il confronto dei tre componenti al ritorno. UTC e non ora locale: qui non si sta
 * collocando un istante, si sta verificando un calendario, e un fuso orario introdurrebbe
 * un giorno di scarto senza aggiungere niente.
 */
export function isIsoDate(value: string): boolean {
  const match = SHAPE.exec(value);
  if (match === null) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const time = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(time)) return false;

  const back = new Date(time);
  return (
    back.getUTCFullYear() === year && back.getUTCMonth() === month - 1 && back.getUTCDate() === day
  );
}

/** Come `isIsoDate`, ma solleva un errore diagnostico. Gemella di `assertCents`. */
export function assertIsoDate(value: string, label = 'data'): void {
  if (!isIsoDate(value)) {
    throw new Error(
      `${label} non valida: atteso un giorno nella forma YYYY-MM-DD, ricevuto «${value}». ` +
        'Una data malformata sparirebbe dai totali mensili restando visibile nella lista.',
    );
  }
}
