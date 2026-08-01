import type { HttpClient } from '@jutrack/core';

/**
 * Timeout di una richiesta. Senza, una rete che non risponde bloccherebbe il ciclo.
 *
 * Deve restare **sotto** l'intervallo di poll: più lungo, e una richiesta appesa terrebbe
 * fermo il ciclo oltre il giro successivo, facendo sembrare il sync più lento di quanto
 * sia. Col poll attivo a 3 s questi 10 s sono già larghi.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * `HttpClient` basato su `fetch`.
 *
 * Il core non usa `fetch` direttamente: su React Native è fornita da Expo e non è
 * garantita ovunque. Passando da un'interfaccia, i test possono sostituirla con un relay
 * finto senza toccare la rete.
 */
export const expoHttp: HttpClient = {
  async request(url, init) {
    // AbortController per il timeout: `fetch` da sola resta appesa finché il sistema
    // non chiude la connessione, che su mobile può richiedere minuti.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: init.method,
        headers: init.headers,
        ...(init.body === undefined ? {} : { body: init.body }),
        signal: controller.signal,
      });
      return { status: res.status, text: () => res.text() };
    } catch (error) {
      // Un abort per timeout viene riportato come errore di rete: per il motore di
      // sync è un guasto transitorio, da ritentare col backoff.
      if (error instanceof Error && error.name === 'AbortError') {
        // `cause` preservata: senza, la diagnosi a valle perde l'errore originale.
        throw new Error(`timeout dopo ${REQUEST_TIMEOUT_MS / 1000}s`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },
};
