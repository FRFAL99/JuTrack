import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { describePairingError, deriveVaultKeys, parseInvite } from '@jutrack/core';
import { useGroups } from '@/state';

interface AdoptPairing {
  /** Interpreta un invito (scansionato, incollato o arrivato per link) e chiede conferma. */
  submit(raw: string): void;
  /** Messaggio da mostrare all'utente, `null` se non c'è nulla da segnalare. */
  error: string | null;
  adopting: boolean;
}

/**
 * Dall'invito grezzo al gruppo aperto, passando per una conferma esplicita.
 *
 * Condiviso da tutte le strade con cui un invito può arrivare — QR scansionato, link
 * aperto da una chat, codice incollato a mano — perché devono chiedere la stessa conferma
 * e mostrare gli stessi avvisi: se una fosse più silenziosa, diventerebbe quella comoda.
 *
 * **Dallo Step 12 il collegamento aggiunge un gruppo invece di sostituire quello che
 * c'era.** Prima esisteva un solo slot per la chiave, quindi entrare in un vault
 * significava uscire dal precedente e rendersi illeggibili i propri dati: la conferma
 * doveva avvisare di una perdita. Ora non c'è più nulla da perdere, e nemmeno un riavvio
 * da chiedere — il runtime si rimonta sul gruppo nuovo da solo.
 */
export function useAdoptPairing(): AdoptPairing {
  const { t } = useTranslation();
  const { groups, join, select } = useGroups();
  const [error, setError] = useState<string | null>(null);
  const [adopting, setAdopting] = useState(false);
  // La fotocamera continua a emettere finché il codice resta inquadrato: senza freno
  // partirebbero decine di conferme sovrapposte per la stessa scansione.
  const handled = useRef(false);

  const adopt = useCallback(
    (key: Uint8Array, name: string | null): void => {
      setAdopting(true);
      // Il nome dell'invito è solo un suggerimento per la riga del registro: l'autorevole
      // sta dentro il vault e arriva col primo sync, sovrascrivendo questo.
      void join(key, name ?? t('pairing.confirm.unnamedGroup'))
        .then((group) => {
          router.replace(`/groups/${group.vaultId}`);
          Alert.alert(t('pairing.confirm.joinedTitle'), t('pairing.confirm.joinedBody'));
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : String(cause));
          handled.current = false;
        })
        .finally(() => setAdopting(false));
    },
    [join, t],
  );

  const submit = useCallback(
    (raw: string): void => {
      if (handled.current) return;
      setError(null);

      const result = parseInvite(raw, Date.now());
      if (!result.ok) {
        setError(describePairingError(result.reason));
        return;
      }

      const incoming = deriveVaultKeys(result.key).vaultId;
      handled.current = true;

      // Fare già parte di quel gruppo non è più un errore da segnalare: è semplicemente
      // il gruppo che si voleva aprire. Prima era un vicolo cieco, perché l'unico slot
      // era già occupato da quella stessa chiave.
      const known = groups.find((group) => group.vaultId === incoming);
      if (known !== undefined) {
        void select(known.vaultId).then(() => router.replace(`/groups/${known.vaultId}`));
        return;
      }

      Alert.alert(
        result.name === null
          ? t('pairing.confirm.confirmTitleGeneric')
          : t('pairing.confirm.confirmTitleNamed', { name: result.name }),
        t('pairing.confirm.confirmBody'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => {
              handled.current = false;
            },
          },
          { text: t('pairing.confirm.enter'), onPress: () => adopt(result.key, result.name) },
        ],
      );
    },
    [adopt, groups, select, t],
  );

  return { submit, error, adopting };
}
