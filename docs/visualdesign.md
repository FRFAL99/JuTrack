# Redesign JuTrack — documento di implementazione

Direzione approvata: **2a** (mix). Riferimento visivo: `JuTrack Redesign.dc.html`, sezione **turno 2**.

- **Card** dove si agisce e c'è un numero da mettere al centro → Spese (home), Nuova spesa.
- **Registro** (liste a tutta larghezza, filetti, etichette maiuscoletta) dove si legge → Grafici, selettore gruppi, Tu.
- Regola unica: **una sola card per schermata**. Se una schermata ne chiede due, una delle due è una lista.

Tutto quanto segue è espresso rispetto al codice attuale in `apps/mobile/src`.

---

## 1. Token — `theme/tokens.ts`

Il redesign **non introduce una palette nuova**: accento, semantici e colori di categoria restano quelli attuali. Cambiano i grigi del tema scuro (più profondi, più stacchi) e si aggiungono tre token che oggi mancano.

### 1.1 `darkPalette` — valori aggiornati

| Token            | Oggi      | Nuovo     | Perché                                                                              |
| ---------------- | --------- | --------- | ----------------------------------------------------------------------------------- |
| `background`     | `#111116` | `#0B0B10` | Serve un fondo più scuro delle superfici, altrimenti card e fondo si leggono uguali |
| `surface`        | `#1B1B22` | `#15151C` | Superficie di lista/riga                                                            |
| `surfacePressed` | `#25252E` | `#1F1F28` |                                                                                     |
| `border`         | `#2C2C36` | `#2C2C36` | invariato — bordo di contorno                                                       |
| `text`           | `#F2F2F5` | `#F2F2F5` | invariato                                                                           |
| `textMuted`      | `#9A9AA6` | `#9A9AA6` | invariato                                                                           |
| `accent`         | `#748FFC` | `#748FFC` | invariato                                                                           |

`lightPalette` non è toccata in questo giro (tema chiaro fuori scope, ma i token nuovi vanno definiti anche lì).

### 1.2 Token nuovi da aggiungere all'interface `Palette`

```ts
/** Superficie della card eroe: unica superficie più chiara del fondo lista. */
surfaceRaised: string; // dark: '#171722'   light: '#FFFFFF'
/** Separatore interno a una lista (più tenue di `border`). */
divider: string; // dark: '#1F1F28'   light: '#EDEDF1'
/** Testo terziario: metadati, footer, id. Non usare per contenuto. */
textFaint: string; // dark: '#4A4A56'   light: '#9A9AA6'
```

Sono tre token, non tre eccezioni locali: oggi `#4A4A56` e `#1F1F28` comparirebbero hardcoded in sei schermate, che il commento in testa a `tokens.ts` vieta esplicitamente.

### 1.3 Scale

`spacing`, `radius` e `fontWeight` restano invariati. Su `radius` si aggiunge un gradino, su `fontSize` due:

```ts
export const radius = { sm: 6, md: 10, lg: 16, xl: 20, pill: 999 } as const;
export const fontSize = {
  xxs: 11,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 34,
  display: 46,
} as const;
```

- `radius.xl` = card eroe e card di sezione del nuovo form.
- `fontSize.xxs` = etichette maiuscoletta, metadati di riga, tab bar.
- `fontSize.display` = importo eroe (home, Grafici, Nuova spesa).

### 1.4 Tipografia

Font di sistema come oggi (nessuna dipendenza nuova). I mockup usano Manrope solo per la resa in HTML: su device il peso equivalente è quello di default. Le due regole che contano sono di **impostazione**, non di famiglia:

```ts
// Da applicare a ogni Text che mostra denaro o una data numerica.
export const numeric = { fontVariant: ['tabular-nums'] } as const;
// Titoli grandi (≥28): l'aria di default è troppa a questa scala.
export const tightTitle = { letterSpacing: -0.6 } as const;
```

`fontVariant: ['tabular-nums']` è supportato da RN su Android e iOS: senza, le cifre ballano fra una riga e l'altra della lista, che è il difetto più visibile dell'attuale schermata spese.

---

## 2. Componenti

### 2.1 Da modificare

**`components/Screen.tsx`** — il titolo grande da 34px sparisce da tre schermate su cinque. Il componente resta ma il `title` diventa opzionale nel senso pieno: Spese usa un header custom (pill del gruppo), Grafici usa lo stepper del mese come header, Tu usa il blocco identità. Aggiungere una prop:

```ts
/** Header libero al posto del titolo grande. Esclusivo con `title`. */
header?: React.ReactNode;
```

**`components/Card.tsx`** — aggiungere una variante:

```ts
variant?: 'flat' | 'raised';   // default 'flat'
```

- `flat` → `backgroundColor: colors.surface`, `radius.lg`, **niente bordo**, `padding: 0` (il padding lo mettono le righe dentro). È il contenitore di lista di Spese e Nuova spesa.
- `raised` → `backgroundColor: colors.surfaceRaised`, `radius.xl`, `borderWidth: hairline`, `borderColor: colors.border`, `padding: spacing.lg`. È la card eroe: **una per schermata**.

**`components/Button.tsx`** — invariato nell'API. Cambia solo il default: `borderRadius: radius.md` → `radius.lg` e `minHeight: 48` → `52` per il primario a piena larghezza.

**`features/expenses/ExpenseRow.tsx`** — la riga acquista una terza informazione, la quota personale:

```
[icona 38×38]  Titolo                    50,00 €
               Categoria · Chi ha pagato  +25,00 per te
```

- Riquadro icona: 38×38, `radius.md`, sfondo `category.color + '22'` (invariato), ma dentro va un'**icona vettoriale**, non l'emoji (§3).
- Quota: `fontSize.xxs`; `colors.income` se sei in credito su quella spesa, `colors.expense` se in debito. Il valore arriva da `computeBalances` ristretto alla singola spesa — se il calcolo per-riga risulta costoso su liste lunghe, calcolarlo una volta nel `useMemo` della schermata e passarlo come prop `yourShareCents`.
- Separatore fra righe: `colors.divider`, `marginLeft: 64` (allineato al testo, non al bordo).

**`features/groups/GroupRow.tsx`** — la riga guadagna il pallino di stato a sinistra (8px, `colors.income` se è il gruppo corrente, `colors.border` altrimenti) e un sottotitolo più ricco: `Aperto adesso · 2 spese · 119,00 € questo mese`. La logica del sottotitolo sta già in `features/groups/list.ts` → `groupSubtitle`: estenderla lì, non nella riga.

**`features/stats/CategoryBars.tsx`** — la barra passa da 8px a **3px** e va sotto la riga di testo a piena larghezza; la percentuale si sposta **a sinistra**, larghezza fissa 26px, prima del nome. L'icona emoji sparisce (il colore della barra + il nome bastano, ed era l'unico posto in cui l'emoji portava informazione già ridondante).

**`features/stats/MonthlyBars.tsx`** — invariato nella logica. Cambiano tre numeri: `CHART_HEIGHT` 120 → 100, `gap` 6 → 9, `borderRadius` delle barre `4/4/0/0` → `3` su tutti i lati. La regola «etichetta solo su selezionato e picco» resta: è giusta.

**`features/sync/SyncBadge.tsx`** — da badge testuale a **pallino + testo**, 7px di diametro, stesso mapping di colori di oggi (`describeSync` resta invariato). Sulla home compare come pill dentro la card eroe (`background: colors.income + '14'`), su Tu come pallino nudo in riga.

### 2.2 Nuovi componenti

**`components/SectionLabel.tsx`** — l'etichetta maiuscoletta che apre ogni sezione del registro.

```tsx
<SectionLabel>Dove sono finiti</SectionLabel>
// fontSize.xxs, fontWeight.bold, letterSpacing 1.3, textTransform uppercase,
// color: colors.textMuted, padding: lg lg sm
```

**`components/ListRow.tsx`** — la riga di impostazione: label a sinistra, valore opzionale, chevron. Sostituisce le quattro `NavCard` di Tu.

```ts
interface ListRowProps {
  label: string;
  value?: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
}
```

`NavCard` **resta** per i due casi in cui il sottotitolo esplicativo serve davvero (Diagnostica dalla schermata di gestione gruppo, Ripristina da backup nello stato vuoto). Ovunque altro va `ListRow`.

**`components/AvatarStack.tsx`** — i cerchi delle persone sovrapposti, 26px, `marginLeft: -9` dal secondo in poi, `borderWidth: 2` del colore della superficie sotto. Iniziale del nome, `fontWeight.bold`, bianco. Il colore è `member.color`, che esiste già nel profilo.

**`features/groups/GroupSwitcherSheet.tsx`** — il bottom sheet del selettore gruppi (§4.3).

---

## 3. Icone

Le emoji spariscono da **tab bar** e **categorie**. Restano solo nei testi di stato (`describeBudget` in `features/stats/format.ts` usa `⚠️`/`⏳`/`✓`: quelle sono parte della frase, non icone).

**Libreria:** `@expo/vector-icons` è già una dipendenza transitiva di Expo — nessun pacchetto nuovo. Usare il set **Feather** (tratto 1.7, 24×24, geometrie coerenti con i mockup).

| Uso                               | Icona Feather          |
| --------------------------------- | ---------------------- |
| Tab Spese                         | `file-text`            |
| Tab Grafici                       | `bar-chart-2`          |
| Tab Tu                            | `user`                 |
| Cambia gruppo                     | `chevron-down`         |
| Impostazioni gruppo (header home) | `sliders`              |
| Aggiungi                          | `plus`                 |
| Naviga                            | `chevron-right`        |
| Entra con invito                  | `maximize` (mirino QR) |
| Backup chiave                     | `lock`                 |
| Esporta                           | `download`             |
| Diagnostica                       | `shield`               |
| Azzera                            | `trash-2`              |

**Categorie.** Il campo `icon` nello schema Yjs (`state/schema.ts`) oggi contiene un'emoji ed è **sincronizzato fra i telefoni**: non si può riscrivere al volo senza generare un update per ogni categoria su ogni device. Approccio:

1. Il campo `icon` resta com'è nei dati.
2. Si aggiunge in `state/seed.ts` una mappa `emoji → nome icona Feather` per le otto categorie di default (`🛒 → shopping-cart`, `🏠 → home`, `🍕 → coffee`, `🚗 → truck`, `💊 → thermometer`, `🎬 → film`, `✈️ → send`, `📦 → package`).
3. Il componente che disegna una categoria prova la mappa; se l'emoji non è nota (categoria creata a mano dall'utente) mostra un **pallino del colore della categoria**, non l'emoji.
4. La schermata `categories.tsx` passa da campo testo-emoji a griglia di icone Feather selezionabili, scrivendo nel campo `icon` il nome Feather. La mappa al punto 2 copre la retrocompatibilità.

Il punto 3 è il vincolo che tiene: nessuna migrazione dei dati, nessuna emoji visibile.

---

## 4. Schermate

### 4.1 Navigazione — da 4 tab a 3

`app/(tabs)/_layout.tsx`:

| Prima                      | Dopo                                        |
| -------------------------- | ------------------------------------------- |
| `(gruppi)` → elenco gruppi | `(gruppi)` → **le spese del gruppo aperto** |
| `stats`                    | `stats`                                     |
| `settings`                 | _rimosso come tab_                          |
| `profile`                  | `tu` (ex `profile`, assorbe `settings`)     |

Conseguenze sul routing:

- La radice dello stack `(gruppi)` diventa la schermata spese del gruppo corrente. L'attuale `(tabs)/(gruppi)/index.tsx` (elenco + crea + entra) **non è più una schermata**: diventa il bottom sheet `GroupSwitcherSheet`, aperto dalla pill nell'header.
- Serve una rotta di fallback quando non c'è nessun gruppo: se `useCurrentGroup()` è `null`, la radice mostra lo stato vuoto «nessun gruppo» con i due bottoni (Crea / Entra) — è lo stesso contenuto del sheet, montato a piena pagina. Un componente, due contenitori.
- `app/(tabs)/settings.tsx` viene svuotato: «Sincronizza adesso» e «Diagnostica» migrano in `tu.tsx`. Tenere il file come redirect a `/tu` per un ciclo, poi eliminarlo (i deep link vecchi).
- `azzera.tsx`, `backup.tsx`, `probe.tsx`, `join.tsx` restano dove sono.

### 4.2 Spese — home (stile card)

Struttura dall'alto:

1. **Header** (`padding: 14 16 12`): pill del gruppo a sinistra (avatar quadrato 20px col colore del gruppo, nome `fontSize.sm`/bold, `chevron-down`; `radius.pill`, `background: colors.surface`, bordo `colors.border`) + bottone tondo 34px con `sliders` a destra → `/groups/[vaultId]/manage`.
2. **Card eroe** (`Card variant="raised"`, `margin: 0 16`):
   - riga alta: `Agosto` (`xs`, muted) + importo `38px/800` con `€` in muted; a destra la pill di sync.
   - barra di composizione: altezza 7, `radius 4`, un segmento per categoria in proporzione, `gap: 2`. Sostituisce, sulla home, il grafico a torta: dice «dove sono finiti» senza aprire i Grafici.
   - separatore `colors.divider`, poi `AvatarStack` + `Juju ti deve 25,00 €` + link `Pareggia` → `/settle`.
3. **Sezioni giorno**: intestazione fuori dal contenitore (`Oggi` bold `xs` a sinistra, totale muted a destra, `padding: 20 18 8`), poi un `Card variant="flat"` per giorno con dentro le `ExpenseRow` separate da `divider`.
4. **FAB esteso**: pill 52px di altezza, `plus` + label `Spesa`, `background: colors.accent`, ombra `0 8 24 rgba(116,143,252,.32)`. Posizione `right: 16, bottom: insets.bottom + 14`. L'estensione con label è deliberata: il `+` nudo attuale non dice cosa aggiunge.

`SectionList` resta la scelta giusta; le intestazioni di sezione stanno fuori dal contenitore quindi `stickySectionHeadersEnabled` può restare `false`.

**Stato vuoto** (gruppo senza spese): card eroe con `0,00 €` e barra vuota, sotto un blocco centrato con `file-text` in `colors.textFaint`, «Nessuna spesa» e «Tocca _Spesa_ per registrare la prima». Il FAB resta visibile — è la via d'uscita.

### 4.3 Selettore gruppi (bottom sheet, stile registro)

Sostituisce `(tabs)/(gruppi)/index.tsx`. Sheet a `radius 22 22 0 0`, `background: colors.surface`, `borderTop: colors.border`, ombra `0 -20 50 rgba(0,0,0,.55)`, maniglia 38×4 centrata.

- `SectionLabel` «I tuoi gruppi».
- Una `GroupRow` per gruppo; quello corrente ha sfondo `colors.surfacePressed` e pallino verde.
- Separatore `divider` (rientrato di 38px) fra le righe, `border` pieno prima dei bottoni.
- Due bottoni secondari affiancati, 48px: `Nuovo gruppo` e `Entra con invito`.
- La creazione **non ha più un campo inline nel sheet**: `Nuovo gruppo` apre una modale minima con un solo campo e un bottone. Era il terzo dei quattro problemi segnalati (elenco + crea + entra sulla stessa schermata).

Implementazione: `@gorhom/bottom-sheet` è la scelta naturale ma aggiunge `react-native-reanimated`+`gesture-handler`. Se non sono già nel bundle, usare una `Modal` RN con `animationType="slide"` e `presentationStyle` di default: la resa a schermo è la stessa, il costo è zero dipendenze. **Preferire questa seconda strada** finché non serve il drag.

### 4.4 Grafici (stile registro)

Nessuna card. Dall'alto:

1. **Stepper del mese** come header: `chevron-left` accent, `Agosto 2026` bold `sm`, `chevron-right` (disabilitato → `colors.textFaint`). Invariato nella logica (`shiftMonth`, `currentMonth`).
2. **Importo eroe** `46px/800` + `€` muted, sotto `describeChange(...)` in `xs`.
3. **MonthlyBars** a piena larghezza, senza contenitore.
4. Filetto `border`. `SectionLabel` «Dove sono finiti» → `CategoryBars` nuova forma.
5. Filetto. Blocco «Fra di voi»: `SectionLabel`, la frase `X deve N a Y` (`md`, importo in `colors.expense` bold), bottone secondario compatto `Pareggia` a destra sulla stessa riga.
6. Filetto. Riga budget: titolo + una riga di spiegazione in `xs`, link `Imposta` a destra. Con budget impostati, `BudgetRows` invariato.
7. Piede: `lock` 13px + «Calcolato su questo telefono» in `textFaint`. È l'unico accenno all'architettura in tutta l'app, come chiesto.

Gli stati vuoti (`nessun gruppo`, `ancora nessun dato`) restano quelli attuali con `EmptyState`, ma l'icona emoji va sostituita con `bar-chart-2` in `colors.textFaint` a 26px.

### 4.5 Tu — profilo + impostazioni (stile registro)

Fusione di `profile.tsx` e `settings.tsx`. Dall'alto:

1. **Identità**: avatar 60px col colore del profilo e l'iniziale, nome `26px/800`, sotto «Stesso nome in tutti i tuoi gruppi» in `xxs`, icona matita a destra. Il nome **non è più un `TextInput` sempre montato**: si tocca la matita e diventa editabile (o si apre una modale a un campo). Il commit resta on-blur come oggi, per non generare un update Yjs per tasto.
2. **ColorChoice** subito sotto, cerchi 36px (invariato nella logica; il selezionato mantiene anello + spunta).
3. Filetto. `SectionLabel` «Sincronizzazione» → riga con pallino, «Aggiornato adesso», sotto in `textFaint` «Cifrato end-to-end · il relay non legge nulla», link `Sincronizza` a destra.
4. Filetto. `SectionLabel` «Il gruppo aperto» → `ListRow` ×4: `Ciccipucci · persone e invito` (→ `manage`), `Categorie e budget`, `Backup della chiave`, `Esporta i dati` (valore `CSV · JSON`).
5. Filetto. `SectionLabel` «Questo telefono» → `ListRow` `Diagnostica`, poi `ListRow tone="danger"` `Azzera questo telefono`.
6. Piede: `id 51a79a…` per esteso in `textFaint` `xxs` (resta `selectable`), sotto `JuTrack 0.1.0 · core 0.1.0`.

**Testi tagliati.** I quattro paragrafi lunghi di `profile.tsx` e `settings.tsx` non compaiono più in linea. Dove il contenuto serve davvero (l'identificativo, la spiegazione della sincronizzazione) va nella schermata di destinazione o dietro il tocco sulla riga. Il paragrafo «Identificativo» completo si sposta in una modale informativa aperta toccando l'id.

Le sezioni 4 e 5 richiedono un gruppo aperto: se `useCurrentGroup()` è `null`, la sezione «Il gruppo aperto» semplicemente non si monta (niente righe disabilitate).

### 4.6 Nuova spesa (stile card)

Riscrittura di `features/expenses/ExpenseForm.tsx` (oggi 16 KB, è la schermata più densa dell'app). Dall'alto:

1. Header modale: chiudi (tondo 32px con `x`) — titolo — spazio vuoto. **Il salva non sta in alto**: è il bottone a piena larghezza in fondo, sempre raggiungibile col pollice.
2. **Card eroe importo** (`raised`, `padding: 22`, centrata): etichetta `Importo` in `xs`, cifra `46px/800` con `€` in `textFaint`. Il tap apre il tastierino di sistema numerico; la cifra è il campo.
3. **Card «Chi paga e come si divide»** (`flat`, `padding: 16 18`): due riquadri persona affiancati (selezionato = bordo e sfondo del colore del membro a `22`), sotto tre pill di modalità: `Metà e metà` (default, accent pieno) · `Quote` · `Tutto mio`. Sotto ogni persona, la quota calcolata in tempo reale in `xxs`.
4. **Card «Categoria»** (`flat`): pill con pallino del colore + nome. Selezionata = bordo del colore categoria e sfondo `+22`.
5. **Card righe** (`flat`): `Data` (valore `Oggi`) e `Nota` (`Facoltativa` in `textFaint`).
6. **Salva la spesa**: bottone primario 54px, `radius.lg`, a piena larghezza, `margin: 0 16 20`.

Ordine deliberato: importo → chi/come → categoria → dettagli. È l'ordine in cui la spesa viene detta a voce.

---

## 5. Ordine di lavoro

Ogni passo è indipendente e lascia l'app funzionante.

1. **Token** — `tokens.ts`: nuovi grigi dark, `surfaceRaised`/`divider`/`textFaint`, `radius.xl`, `fontSize.xxs`/`display`, helper `numeric`. Nessuna schermata cambia aspetto se non per i grigi. _Piccolo._
2. **Icone** — `@expo/vector-icons`/Feather nella tab bar e nelle righe; mappa emoji→Feather in `seed.ts`; fallback a pallino colorato. _Medio._
3. **Componenti nuovi** — `SectionLabel`, `ListRow`, `AvatarStack`; `Card variant`; `Screen header`. Con test di rendering se ne esistono già per i componenti. _Medio._
4. **Tu** — fusione `profile` + `settings`, rimozione del tab, redirect di `/settings`. È il passo che chiude il problema «4 tab senza gerarchia» ed è isolato dal resto. _Medio._
5. **Grafici** — riscrittura di `stats.tsx` in forma registro; `CategoryBars` e `MonthlyBars` ritoccati. La logica di calcolo (`@jutrack/core`) non si tocca. _Medio._
6. **Spese home + selettore** — il passo grosso: nuova radice del tab, `GroupSwitcherSheet`, card eroe, `ExpenseRow` con quota, FAB esteso, modale «nuovo gruppo». _Grande._
7. **Nuova spesa** — riscrittura del form. _Grande._

I passi 1-3 si possono fare in un giorno e rendono i successivi meccanici.

## 6. Cosa non cambia

- `packages/core` — nessuna modifica. Nessun calcolo si sposta nella UI e nessuna funzione nuova serve al core: `computeBalances`, `simplifyDebts`, `totalsByCategory`, `budgetStatuses` coprono già tutto quello che i mockup mostrano.
- Lo schema Yjs (`state/schema.ts`) — invariato, compreso il campo `icon` delle categorie (§3).
- Sync, crypto, relay, backup, export, azzeramento — invariati.
- Il **copy** delle schermate di conferma e di rischio (azzeramento, backup, invito): quei testi lunghi restano lunghi. Il taglio riguarda le schermate di uso quotidiano, non quelle in cui si può perdere qualcosa.
