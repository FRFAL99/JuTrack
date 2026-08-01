import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { describePairingError, deriveVaultKeys, parsePairingUri } from '@jutrack/core';
import { expoKeyStore } from '@/platform';
import { adoptVaultKey, useVaultRuntime } from '@/state';

interface AdoptPairing {
  /** Interpreta un URI (scansionato, incollato o arrivato per deep link) e chiede conferma. */
  submit(raw: string): void;
  /** Messaggio da mostrare all'utente, `null` se non c'è nulla da segnalare. */
  error: string | null;
  adopting: boolean;
}

/**
 * Dal codice grezzo alla chiave adottata, passando per una conferma esplicita.
 *
 * Condiviso fra la scansione con la fotocamera e l'apertura del link `jutrack://pair`
 * fatta dal lettore QR di sistema: le due strade devono chiedere la stessa conferma e
 * mostrare gli stessi avvisi, altrimenti la più silenziosa diventa quella comoda.
 */
export function useAdoptPairing(): AdoptPairing {
  const { keys } = useVaultRuntime();
  const [error, setError] = useState<string | null>(null);
  const [adopting, setAdopting] = useState(false);
  // La fotocamera continua a emettere finché il codice resta inquadrato: senza freno
  // partirebbero decine di conferme sovrapposte per la stessa scansione.
  const handled = useRef(false);

  const adopt = useCallback((key: Uint8Array): void => {
    setAdopting(true);
    void adoptVaultKey(expoKeyStore, key)
      .then(() => {
        // Il motore di sync viene costruito all'avvio con le chiavi di allora: il
        // riavvio è il modo più prevedibile per farlo ripartire su quelle nuove.
        Alert.alert(
          'Dispositivo collegato',
          "Riavvia l'app: le spese di questo telefono e quelle dell'altro verranno unite nello stesso vault.",
        );
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        handled.current = false;
      })
      .finally(() => setAdopting(false));
  }, []);

  const submit = useCallback(
    (raw: string): void => {
      if (handled.current) return;
      setError(null);

      const result = parsePairingUri(raw, Date.now());
      if (!result.ok) {
        setError(describePairingError(result.reason));
        return;
      }

      const incoming = deriveVaultKeys(result.key).vaultId;
      if (keys !== null && keys.vaultId === incoming) {
        setError('Questo telefono fa già parte di quel vault: non c’è niente da collegare.');
        return;
      }

      handled.current = true;
      const short = `${incoming.slice(0, 8)}…`;

      // Sostituire una chiave esistente è distruttivo: senza un backup della vecchia,
      // i dati già cifrati con essa non tornano più leggibili da questo telefono.
      const message =
        keys === null
          ? `Le spese di questo telefono confluiranno nel vault ${short}, insieme a quelle dell'altro dispositivo.`
          : `Questo telefono lascerà il vault ${keys.vaultId.slice(0, 8)}… per il vault ${short}. ` +
            'Senza un backup della chiave attuale, i dati sincronizzati con essa non saranno più leggibili da qui.';

      Alert.alert('Collegare a questo vault?', message, [
        {
          text: 'Annulla',
          style: 'cancel',
          onPress: () => {
            handled.current = false;
          },
        },
        {
          text: 'Collega',
          style: keys === null ? 'default' : 'destructive',
          onPress: () => adopt(result.key),
        },
      ]);
    },
    [adopt, keys],
  );

  return { submit, error, adopting };
}
