import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import { GROUP_PARAM, newExpenseRoute, readGroupParam } from '@/features/widgets/deeplink';
import { useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * Dove atterra il «+» del widget: `jutrack://spesa?gruppo=<vaultId>`.
 *
 * **Una rotta che non mostra niente, e serve a una cosa sola: decidere il gruppo prima che si
 * scriva.** Il widget dice di che gruppo parla, e chi lo tocca si aspetta di scrivere lì —
 * ma l'app può avere aperto un altro gruppo, e da lì in poi ogni schermata di scrittura
 * lavorerebbe su quello. Aprire il form e **poi** accorgersene sarebbe tardi: è il modo più
 * silenzioso di mettere una spesa nel posto sbagliato, e capita a chi ha due gruppi, cioè
 * proprio a chi il widget lo guarda per sapere **quale** dei due.
 *
 * **Sta fuori da `app/(gruppo)/`, e non è un dettaglio.** Cambiare gruppo significa smontare
 * un runtime e montarne un altro; farlo da una schermata che quel runtime lo sta già leggendo
 * vuol dire vederlo sparire sotto. Qui non si legge nessun vault: si sceglie, e poi si entra.
 *
 * **`replace` e non `push`**: questa rotta non è un posto in cui tornare. Con `push`, il
 * «indietro» dal form ripasserebbe di qui e rifarebbe il giro, cioè riaprirebbe il form.
 */
export default function WidgetExpenseScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { groups, current, select } = useGroups();

  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const wanted = readGroupParam(params[GROUP_PARAM]);

  /**
   * Il gruppo del widget non è più su questo telefono: ci si è usciti, o il telefono è stato
   * azzerato mentre il rettangolo restava sulla home.
   *
   * **Si ricava durante il render e non è uno stato.** Dipende solo da cose che si hanno già
   * in mano, e tenerlo in un `useState` scritto da dentro un effetto vorrebbe dire un render
   * in più per dire una cosa che si sapeva dal primo — è ciò che `react-hooks/set-state-in-effect`
   * segnala, ed è anche il modo in cui questa schermata potrebbe lampeggiare.
   */
  const gone = wanted !== null && !groups.some((group) => group.vaultId === wanted);

  // Un solo giro per apertura: `select` è una promessa, e senza questa guardia un render in
  // mezzo al cambio di gruppo la rilancerebbe su un runtime che si sta già smontando.
  const done = useRef(false);

  useEffect(() => {
    if (done.current || gone) return;
    done.current = true;

    // Nessun gruppo nel link, o è già quello aperto: si entra e basta. Il primo caso è un
    // foglietto scritto prima dello Step 72, e lì si scrive dove l'app è già aperta — l'unico
    // posto che chi tocca può vedere. Se non c'è nemmeno quello, ci pensa la guardia di
    // `(gruppo)` con `GroupRequired`.
    if (wanted === null || current?.vaultId === wanted) {
      router.replace(newExpenseRoute());
      return;
    }

    // Il gruppo c'è, ma non è quello aperto: si cambia **prima** di entrare. È tutta la
    // ragione per cui questa rotta esiste.
    void select(wanted).then(() => {
      router.replace(newExpenseRoute());
    });
  }, [wanted, gone, current, select]);

  return (
    <ModalScreen title={t('widget.deeplink.title')} compact>
      {gone ? (
        <>
          <SectionLabel>{t('widget.deeplink.goneTitle')}</SectionLabel>
          <Note>{t('widget.deeplink.goneHint')}</Note>
        </>
      ) : (
        // Il cambio di gruppo monta un vault: è un battito di ciglia, ma non è zero, e uno
        // schermo vuoto in mezzo si legge come un tocco che non ha funzionato.
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </ModalScreen>
  );
}
