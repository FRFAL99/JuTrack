import { markError } from '@/diagnostics';
// `import type`: cancellato in compilazione, quindi descrive il gestore senza caricare la
// libreria nativa che quel file importa. Stessa forma di `module.ts`.
import type * as Handler from './handler';
import { loadWidgetModule } from './module';

/**
 * Dice ad Android chi risponde per i widget, e va chiamata **all'ingresso del bundle**.
 *
 * Non è una scelta di stile: quando il sistema chiede un widget con l'app chiusa, React
 * Native esegue il bundle e cerca subito un task headless già registrato. Registrarlo dentro
 * un componente — anche il più alto — vorrebbe dire registrarlo solo dopo che l'app è
 * partita, cioè mai nel caso che conta. È l'unica ragione per cui `apps/mobile/index.js`
 * esiste al posto di `main: "expo-router/entry"`.
 *
 * **Il modulo si carica dietro la solita guardia**, e il gestore anche: su una build senza il
 * modulo nativo — o su iOS, dove non esiste per costruzione — un import in cima al file
 * porterebbe giù l'app all'avvio, e non solo la parte con i widget. Il ripiego è l'app di
 * prima, senza widget.
 */
export function registerWidgetTask(): void {
  const module = loadWidgetModule();
  if (module === null) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { handleWidgetTask } = require('./handler') as typeof Handler;
    module.registerWidgetTaskHandler(handleWidgetTask);
  } catch (error) {
    markError('registrazione del task dei widget', error);
  }
}
