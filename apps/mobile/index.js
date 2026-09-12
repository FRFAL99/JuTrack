/**
 * L'ingresso del bundle.
 *
 * Fino allo Step 33 non esisteva: `main` puntava dritto a `expo-router/entry`, e non c'era
 * niente da fare prima che il router partisse. Il widget dello Step 34 cambia questo, perché
 * Android può chiedere di disegnarlo **con l'app chiusa**: React Native esegue il bundle,
 * cerca un task headless già registrato e, se non lo trova, il rettangolo sulla home resta
 * vuoto. La registrazione deve quindi stare qui, dove il bundle comincia, e non dentro un
 * componente che in quel caso non verrà mai montato.
 *
 * L'ordine è quello documentato dalla libreria: prima il router, poi il task. `expo-router`
 * registra il componente radice dell'app; `registerWidgetTask` registra un task headless
 * accanto, e i due non si toccano — non c'è nessuna interfaccia da montare per disegnare un
 * widget.
 *
 * **Non serve una build EAS nuova per questo file.** L'app nativa non nomina `index.js`: apre
 * l'entry virtuale di Metro, che risolve `main` di `package.json` al momento del bundle. Se
 * così non fosse, questo step avrebbe smentito lo Step 30, che esiste per pagare una volta
 * sola il conto delle build.
 */
import 'expo-router/entry';
import { registerWidgetTask } from './src/features/widgets/register';

registerWidgetTask();
