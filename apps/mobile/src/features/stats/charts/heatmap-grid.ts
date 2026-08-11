/**
 * La griglia della heatmap: da una sequenza di giorni a colonne di settimane.
 *
 * `dailyHeatmap` restituisce un elenco piatto di celle consecutive; la griglia le dispone
 * in colonne da sette, una per settimana, con il lunedì in alto. La parte che si sbaglia è
 * la **prima settimana**, che quasi mai comincia di lunedì: senza i buchi in testa, un mese
 * che parte di sabato disegnerebbe tutti i giorni spostati di cinque righe e il grafico
 * direbbe che si spende di lunedì quando si spende di sabato.
 */
import { dayOfWeek, HEATMAP_LEVELS, type Cents, type HeatmapCell } from '@jutrack/core';

/**
 * Le celle in colonne da sette, `null` dove la settimana esce dal periodo.
 *
 * Una colonna nuova comincia al lunedì, non ogni sette celle: contare a sette funzionerebbe
 * solo se il periodo cominciasse di lunedì.
 */
export function weekColumns(cells: HeatmapCell[]): (HeatmapCell | null)[][] {
  const columns: (HeatmapCell | null)[][] = [];
  let current: (HeatmapCell | null)[] | null = null;

  for (const cell of cells) {
    const row = dayOfWeek(cell.date);
    if (current === null || row === 0) {
      current = Array.from({ length: 7 }, () => null);
      columns.push(current);
    }
    current[row] = cell;
  }

  return columns;
}

/**
 * L'importo da cui comincia ciascun livello, per la legenda.
 *
 * I livelli li assegna `dailyHeatmap` per quantili e non li racconta a nessuno: qui si
 * ricava da quali cifre partono, cioè il **minimo osservato** a ciascun livello. È la sola
 * cosa che rende leggibile la heatmap a chi le quattro tinte non le distingue — la legenda
 * dice «da 12 €» invece di mostrare cinque quadratini e basta.
 *
 * `null` per un livello che nessun giorno ha raggiunto: succede quando i giorni con spese
 * sono meno dei livelli, e inventare una soglia sarebbe peggio che non mostrarla.
 */
export function levelThresholds(cells: HeatmapCell[]): (Cents | null)[] {
  const minimums: (Cents | null)[] = Array.from({ length: HEATMAP_LEVELS }, () => null);

  for (const cell of cells) {
    if (cell.level < 1 || cell.level > HEATMAP_LEVELS) continue;
    const at = cell.level - 1;
    const current = minimums[at];
    if (current === null || current === undefined || cell.totalCents < current) {
      minimums[at] = cell.totalCents;
    }
  }

  return minimums;
}
