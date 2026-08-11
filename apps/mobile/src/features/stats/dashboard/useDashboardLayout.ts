import { useCallback, useEffect, useState } from 'react';
import { useAppData } from '@/state';
import {
  DEFAULT_LAYOUT,
  LAYOUT_KEY,
  parseLayout,
  serializeLayout,
  type DashboardLayout,
} from './layout';

interface DashboardLayoutHandle {
  layout: DashboardLayout;
  /**
   * Falso finché la lettura da `app_meta` non è tornata.
   *
   * Serve a **non disegnare la dashboard prima di sapere com'è composta**: partendo dal
   * default si vedrebbero per un istante tutti i widget, e chi ne ha tolti dieci
   * assisterebbe a un lampo di schermata piena a ogni apertura del tab.
   */
  ready: boolean;
  update(next: DashboardLayout): void;
  /** Torna al layout di partenza. L'uscita di sicurezza da una dashboard smontata male. */
  reset(): void;
}

/**
 * Il layout salvato su questo telefono, letto una volta e riscritto a ogni modifica.
 *
 * Sta in `app_meta` e non nel documento Yjs: è una preferenza di chi guarda, non un dato
 * del gruppo — le ragioni sono in `layout.ts`, accanto alla chiave.
 *
 * **La scrittura è ottimistica**: lo stato cambia subito e il salvataggio parte dopo. Un
 * riordino deve rispondere sotto il dito, e l'unica conseguenza di un salvataggio fallito è
 * che al riavvio si ritrova l'ordine di prima — che è esattamente ciò che succederebbe
 * aspettando la scrittura e vedendola fallire, ma con un'interfaccia che nel frattempo
 * resta ferma.
 */
export function useDashboardLayout(): DashboardLayoutHandle {
  const { meta } = useAppData();
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      let stored: DashboardLayout | null;
      try {
        stored = parseLayout(await meta.get(LAYOUT_KEY));
      } catch {
        // Una lettura fallita non è diversa da un layout illeggibile: si riparte dal
        // default, che è la schermata giusta, invece di lasciare il tab vuoto.
        stored = null;
      }
      if (cancelled) return;
      if (stored !== null) setLayout(stored);
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  const persist = useCallback(
    (next: DashboardLayout): void => {
      setLayout(next);
      void meta.set(LAYOUT_KEY, serializeLayout(next)).catch(() => {
        /* vedi sopra: al riavvio si ritrova l'ordine di prima */
      });
    },
    [meta],
  );

  const reset = useCallback((): void => persist(DEFAULT_LAYOUT), [persist]);

  return { layout, ready, update: persist, reset };
}
