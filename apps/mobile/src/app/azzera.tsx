import { useState } from 'react';
import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { NavCard } from '@/components/NavCard';
import { useWipeDevice } from '@/features/profile/useWipeDevice';
import { useGroups, useProfile } from '@/state';
import { useTheme } from '@/theme';

/**
 * Azzera questo telefono: che cosa sparisce, che cosa no, e la doppia conferma.
 *
 * Sta sulla radice e **fuori** da `app/(gruppo)/`: chi azzera resta senza gruppi, e questa
 * schermata deve continuare a essere disegnabile mentre lo fa. Per la stessa ragione non
 * legge il vault — solo il profilo e il registro dei gruppi, che è ciò che elenca.
 *
 * La conferma è **un interruttore più un `Alert`**, e non un `Alert.prompt` con il nome del
 * profilo da riscrivere: su Android `Alert.prompt` non esiste. L'interruttore fa da attrito
 * deliberato — il bottone non si può premere per sbaglio mentre si scorre la pagina — e
 * l'`Alert` finale è l'ultima occasione per annullare.
 */
export default function WipeDeviceScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const profile = useProfile();
  const { groups } = useGroups();
  const { phase, error, start } = useWipeDevice();
  /**
   * Spento di default, e non ricordato: è il gesto meno reversibile dell'app, e ogni volta
   * che si apre questa schermata la domanda va rifatta da capo.
   */
  const [understood, setUnderstood] = useState(false);
  const busy = phase === 'closing' || phase === 'wiping';

  const confirm = (): void => {
    Alert.alert(
      'Azzerare questo telefono?',
      `Spariscono il profilo «${profile.name}»` +
        (groups.length === 0
          ? ''
          : groups.length === 1
            ? ' e il tuo gruppo, con tutte le sue spese'
            : ` e i tuoi ${groups.length} gruppi, con tutte le loro spese`) +
        '. Senza un backup della chiave non tornano: non esiste un reset lato server.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Azzera', style: 'destructive', onPress: start },
      ],
    );
  };

  const heading = {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  } as const;
  const body = { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 } as const;

  return (
    <ModalScreen title="Azzera questo telefono">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {/* In cima, non in fondo: è l'unica cosa che rende reversibile il gesto, e va
            letta prima di decidere, non dopo. */}
        {groups.length > 0 && (
          <NavCard
            title="Fai prima un backup della chiave"
            subtitle="La chiave del gruppo aperto, cifrata con una passphrase che scegli tu. È l'unico modo di ritrovare queste spese dopo un azzeramento."
            onPress={() => router.push('/backup')}
          />
        )}

        <Card style={{ gap: spacing.sm, borderColor: colors.danger }}>
          <Text style={heading}>Che cosa sparisce</Text>
          <Text style={body}>Da questo telefono, e senza possibilità di annullare:</Text>

          <Bullet>
            il tuo profilo, «{profile.name}», con il suo identificativo: quello che registrerai dopo
            sarà una persona diversa per chi divide le spese con te
          </Bullet>
          {groups.length > 0 && (
            <>
              <Bullet>
                {groups.length === 1
                  ? 'il tuo gruppo, con tutte le sue spese, categorie, budget e pareggi'
                  : `i tuoi ${groups.length} gruppi, con tutte le loro spese, categorie, budget e pareggi`}
              </Bullet>
              <Bullet>le chiavi con cui quei dati sono cifrati</Bullet>
            </>
          )}

          {groups.length > 0 && (
            <View style={{ paddingLeft: spacing.md, paddingTop: spacing.xs, gap: 2 }}>
              {groups.map((group) => (
                <Text key={group.vaultId} style={{ color: colors.text, fontSize: fontSize.sm }}>
                  · {group.name}
                </Text>
              ))}
            </View>
          )}

          <Text style={[body, { paddingTop: spacing.xs }]}>
            I dati sono cifrati end-to-end: senza la chiave non li può recuperare nessuno, noi
            compresi. Non esiste un reset lato server.
          </Text>
        </Card>

        {/* Senza gruppi non c'è nessuna copia sul relay di cui parlare: dirlo lo stesso
            farebbe cercare all'utente qualcosa che non esiste. */}
        {groups.length > 0 && (
          <Card style={{ gap: spacing.sm }}>
            <Text style={heading}>Che cosa invece resta</Text>
            <Text style={body}>
              Le copie sul relay. Sono cifrate e illeggibili senza la chiave, e scadono da sole dopo
              trenta giorni. Se vuoi cancellarle subito, esci da ogni gruppo con l&apos;interruttore{' '}
              <Text style={{ color: colors.text }}>Cancella anche la copia sul relay</Text> prima di
              azzerare.
            </Text>
            <Text style={body}>
              E resta ciò che gli altri hanno già scaricato: azzerare il proprio telefono non toglie
              niente a nessun altro.
            </Text>
          </Card>
        )}

        <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }}>
              Ho capito che non si torna indietro
            </Text>
            <Switch
              value={understood}
              onValueChange={setUnderstood}
              disabled={busy}
              accessibilityLabel="Ho capito che non si torna indietro"
            />
          </View>

          <Button
            label={
              phase === 'closing'
                ? 'Chiusura del gruppo…'
                : phase === 'wiping'
                  ? 'Azzeramento…'
                  : 'Azzera questo telefono'
            }
            variant="danger"
            onPress={confirm}
            disabled={!understood}
            loading={busy}
          />

          {/* Un azzeramento fallito lascia uno stato normale — profilo presente, qualche
              gruppo in meno — e si può riprovare: `wipeDevice` si ferma prima di toccare
              il profilo apposta. Dirlo evita che sembri un telefono a metà. */}
          {error !== null && (
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {error}
            </Text>
          )}
        </Card>
      </ScrollView>
    </ModalScreen>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  const { colors, spacing, fontSize } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Text style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}>—</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
