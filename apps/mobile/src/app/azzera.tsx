import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { NavCard } from '@/components/NavCard';
import { useGroups, useProfile } from '@/state';
import { useTheme } from '@/theme';

/**
 * Azzera questo telefono: che cosa sparisce, e che cosa no.
 *
 * Sta sulla radice e **fuori** da `app/(gruppo)/`: chi azzera resta senza gruppi, e questa
 * schermata deve continuare a essere disegnabile mentre lo fa. Per la stessa ragione non
 * legge il vault — solo il profilo e il registro dei gruppi, che è ciò che elenca.
 *
 * **In questo step spiega e basta.** La doppia conferma e la cancellazione vera arrivano
 * con lo Step 22, che così è tutto codice distruttivo e niente impaginazione: l'ordine
 * delle operazioni in `wipeDevice` è la parte in cui un errore lascia chiavi orfane nel
 * Keystore di sistema per sempre, e non va scritta insieme alla grafica.
 */
export default function WipeDeviceScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const profile = useProfile();
  const { groups } = useGroups();

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
        <NavCard
          title="Fai prima un backup della chiave"
          subtitle="La chiave del gruppo aperto, cifrata con una passphrase che scegli tu. È l'unico modo di ritrovare queste spese dopo un azzeramento."
          onPress={() => router.push('/backup')}
        />

        <Card style={{ gap: spacing.sm, borderColor: colors.danger }}>
          <Text style={heading}>Che cosa sparisce</Text>
          <Text style={body}>Da questo telefono, e senza possibilità di annullare:</Text>

          <Bullet>
            il tuo profilo, «{profile.name}», con il suo identificativo: quello che registrerai dopo
            sarà una persona diversa per chi divide le spese con te
          </Bullet>
          <Bullet>
            {groups.length === 1
              ? 'il tuo gruppo, con tutte le sue spese, categorie, budget e pareggi'
              : `i tuoi ${groups.length} gruppi, con tutte le loro spese, categorie, budget e pareggi`}
          </Bullet>
          <Bullet>le chiavi con cui quei dati sono cifrati</Bullet>

          <View style={{ paddingLeft: spacing.md, paddingTop: spacing.xs, gap: 2 }}>
            {groups.map((group) => (
              <Text key={group.vaultId} style={{ color: colors.text, fontSize: fontSize.sm }}>
                · {group.name}
              </Text>
            ))}
          </View>

          <Text style={[body, { paddingTop: spacing.xs }]}>
            I dati sono cifrati end-to-end: senza la chiave non li può recuperare nessuno, noi
            compresi. Non esiste un reset lato server.
          </Text>
        </Card>

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

        {/* Detto qui e non taciuto: una schermata che elenca disastri e non ha un pulsante
            sembra rotta. Lo Step 22 aggiunge l'interruttore «Ho capito» e il bottone. */}
        <Card style={{ gap: spacing.sm }}>
          <Text style={heading}>Non ancora attivo</Text>
          <Text style={body}>
            L&apos;azzeramento vero arriva col prossimo passo. Per adesso questa schermata dice
            soltanto che cosa succederà: non c&apos;è nulla da toccare, e niente è stato cancellato.
          </Text>
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
