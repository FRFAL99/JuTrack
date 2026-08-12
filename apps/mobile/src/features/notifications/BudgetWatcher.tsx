import { useEffect, useMemo, useRef } from 'react';
import { budgetStatuses, monthBounds } from '@jutrack/core';
import { currentMonth } from '@/features/expenses/grouping';
import {
  useAppData,
  useBudgets,
  useCategories,
  useCurrencySymbol,
  useExpenses,
  useVaultStatus,
} from '@/state';
import { budgetContent, detectCrossings, MARKS_KEY, parseMarks, serializeMarks } from './budget';
import { installForegroundHandler } from './foreground';
import { notifyBudget } from './schedule';
import { parseSettings, SETTINGS_KEY } from './settings';

/**
 * Guarda i budget del mese e avvisa quando uno cambia livello. Non disegna niente.
 *
 * **Si iscrive al documento, e non a un gesto**, ed è la differenza che rende questo step
 * diverso dal 31. Il promemoria dipende da un'azione — «ho registrato una spesa» — e
 * infatti `useExpenseRegistered` va chiamata dal form. Un budget invece dipende dal
 * **documento**: sfonda tanto per una spesa scritta qui quanto per una arrivata dall'altro
 * telefono col sync, e le due cose non hanno un punto di chiamata in comune. Iscriversi
 * alla versione del documento le prende entrambe senza che nessuna schermata debba
 * ricordarsi di dire niente.
 *
 * Sta accanto allo `Stack` e non dentro una schermata: se vivesse nei Grafici, i budget si
 * controllerebbero solo aprendo la scheda dove sono già disegnati — cioè proprio dove un
 * avviso non serve.
 *
 * **Solo il gruppo aperto, e solo il mese in corso.** Di documenti Yjs ne è montato uno per
 * volta (è la stessa ragione per cui `last_expense_registered_at` sta in `app_meta`), e un
 * mese passato non può più essere sforato: la spesa porta la data del giorno in cui viene
 * registrata, e il form non ha un selettore di date.
 */
export function BudgetWatcher() {
  const status = useVaultStatus();
  // Diviso in due come `/dashboard`: gli hook che leggono il vault esistono solo dove il
  // vault esiste, invece di un ramo nullable propagato in ogni riga sotto.
  if (status.phase !== 'ready') return null;
  return <Watch vaultId={status.runtime.vaultId} />;
}

function Watch({ vaultId }: { vaultId: string }) {
  const { meta } = useAppData();
  const symbol = useCurrencySymbol();

  const month = currentMonth();
  const bounds = useMemo(() => monthBounds(month), [month]);
  const expenses = useExpenses({ from: bounds.from, to: bounds.to });
  const budgets = useBudgets(month);
  // Anche le archiviate: un budget può riferirsi a una categoria messa da parte durante il
  // mese, e un avviso che dice «Categoria rimossa» al posto del nome è mezzo avviso.
  const categories = useCategories(true);

  const statuses = useMemo(
    () => budgetStatuses(budgets, expenses, month),
    [budgets, expenses, month],
  );

  /**
   * I giri si mettono in fila, non in parallelo.
   *
   * Ogni giro è un leggi-modifica-scrivi su `app_meta`: due che si accavallano — succede
   * quando il sync applica più update di seguito — leggerebbero gli stessi segni e il
   * secondo riscriverebbe i primi, riaprendo la porta all'avviso doppio che tutto questo
   * file esiste per chiudere.
   */
  const chain = useRef<Promise<void>>(Promise.resolve());

  // Al montaggio e non appena serve: l'avviso di budget nasce mentre l'app è aperta, e
  // senza gestore `expo-notifications` in primo piano non mostra niente. Installarlo qui
  // vuol dire che è già a posto quando la prima notifica parte, invece di dipendere
  // dall'ordine di due chiamate nello stesso istante.
  useEffect(() => {
    installForegroundHandler();
  }, []);

  useEffect(() => {
    let cancelled = false;

    chain.current = chain.current
      .then(async () => {
        if (cancelled) return;

        const marks = parseMarks(await meta.get(MARKS_KEY));
        const {
          alerts,
          marks: next,
          changed,
        } = detectCrossings({ statuses, marks, vaultId, month });
        if (cancelled) return;

        // **Prima si scrive, poi si avvisa**, e l'ordine è una scelta. Al contrario, un
        // invio riuscito seguito da una scrittura fallita rifarebbe lo stesso avviso al
        // giro dopo, e poi ancora: un avviso perso si nota una volta, uno ripetuto fa
        // spegnere l'interruttore.
        if (changed) await meta.set(MARKS_KEY, serializeMarks(next));
        if (alerts.length === 0) return;

        // Le impostazioni si rileggono **adesso** e non all'inizio: l'interruttore può
        // essere stato toccato in un altro tab mentre questo effetto era in coda, e i segni
        // vanno aggiornati comunque — è ciò che evita la raffica di arretrati a chi
        // riaccende.
        const settings = parseSettings(await meta.get(SETTINGS_KEY));
        if (cancelled || !settings.budget) return;

        const byId = new Map(categories.map((category) => [category.id, category.name]));
        await notifyBudget(
          budgetContent(alerts, (id) => byId.get(id) ?? 'Categoria rimossa', symbol),
        );
      })
      .catch(() => {
        // Un avviso mancato non è un guasto da mostrare: l'app funziona, i budget si
        // vedono nei Grafici, e la prossima modifica del documento riprova.
      });

    return () => {
      cancelled = true;
    };
  }, [meta, statuses, vaultId, month, categories, symbol]);

  return null;
}
