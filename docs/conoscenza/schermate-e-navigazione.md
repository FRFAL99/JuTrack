# Schermate e navigazione

Dove sta ogni cosa nell'app, e perché sta lì. Sezioni estratte da
[STATO.md](../STATO.md), dove erano cresciute insieme alla cronaca.

## Dove sta ogni schermata (Step 18, 19 e 20)

Quattro tab: **Gruppi** 👥 · **Grafici** 📊 · **Impostazioni** ⚙️ · **Profilo** 🙂. Il primo non è
una schermata ma uno **stack**: elenco dei gruppi → gruppo aperto.

> **Due cose sono cambiate dopo**, e stanno in [Redesign visivo](../archivio/stato-step-0-60.md#redesign-visivo): il passo 4 ha
> portato Impostazioni e Profilo a un solo tab, **Tu** (tre tab, non quattro); il passo 6 ha
> invertito lo stack del primo tab — la radice sono **le spese del gruppo aperto**, e l'elenco dei
> gruppi è un foglio. Tutto il resto di questa sezione è ancora valido, **compresi gli URL**, che
> nessuno dei due passi ha toccato: è la ragione per cui sono descritti con tanta cura.

```
app/(tabs)/(gruppi)/index.tsx                      "/"                     le spese del gruppo aperto
                                                                           (era l'elenco: passo 6)
app/(tabs)/(gruppi)/groups/[vaultId]/_layout.tsx                           guardia di selezione
app/(tabs)/(gruppi)/groups/[vaultId]/index.tsx     "/groups/<id>"          le spese del gruppo dell'URL
                                                                           stesso componente della radice
app/(tabs)/(gruppi)/groups/[vaultId]/manage.tsx    "/groups/<id>/manage"   nome, persone, invito, uscita
                                                                           + le cinque NavCard qui sotto
app/(gruppo)/_layout.tsx                                                   guardia «serve un gruppo»
app/(gruppo)/categories.tsx                        "/categories"
app/(gruppo)/budget.tsx                            "/budget"
app/(gruppo)/settle.tsx                            "/settle"
app/(gruppo)/export.tsx                            "/export"
app/(gruppo)/expense/new.tsx                       "/expense/new"
app/(gruppo)/expense/[id].tsx                      "/expense/<id>"

app/(tabs)/stats.tsx                               "/stats"                Grafici del gruppo aperto
app/(tabs)/tu.tsx                                  "/tu"                   sync, diagnostica, profilo, azzeramento
app/(tabs)/settings.tsx                            "/settings"             redatto: solo un redirect verso "/tu"

app/backup.tsx                                     "/backup"               fuori: serve senza gruppo
app/pair/invite.tsx                                "/pair/invite"          fuori: `GroupRequired` in linea
app/azzera.tsx                                     "/azzera"               fuori: chi azzera resta senza gruppi
```

- **Le parentesi non compaiono nell'URL**, quindi `/groups/<vaultId>` è rimasto quello di prima: è
  l'indirizzo su cui atterra chi entra da un invito, e cambiarlo lo avrebbe rotto in silenzio. Il
  controllo che conta non è il ragionamento ma `.expo/types/router.d.ts` rigenerato da `expo start`,
  seguito da un `tsc` con quei tipi presenti — in CI non esistono e il typecheck passa comunque.
- **Lo stack sta dentro il tab, non sulla radice.** Il gruppo aperto è la schermata principale: da lì
  si va a Grafici e Impostazioni, quindi la tab bar deve restare. Le schermate-foglia (categorie,
  budget, pareggi, form spesa) restano invece sulla radice, dove coprire la tab bar è **giusto**.
- **La guardia che rende corrente il gruppo sta nel layout**, non nelle schermate: gira una volta per
  gruppo, e spese e gestione la ereditano. Sotto di essa il runtime del vault è per costruzione quello
  del `vaultId` nell'URL.
- ~~**Il gruppo non è più una pill da leggere**: è il **titolo** della schermata delle spese.~~
  **Rovesciato dal passo 6 del redesign:** il gruppo è tornato una pill, che però adesso **si tocca**
  e apre il selettore in un foglio; alla gestione porta il bottone con le leve accanto. La pill che
  lo Step 18 aveva tolto era di sola lettura, ed era quello il difetto.
- `unstable_settings = { initialRouteName: 'index' }` in entrambi i layout: senza, chi arriva a
  `/groups/<id>` da un link non ha nulla sotto nello stack, e «indietro» esce dall'app.
- **`app/(gruppo)/` è una guardia, non un tab.** Il suo layout controlla che un gruppo aperto esista
  e altrimenti mostra `GroupRequired`. Dallo **Step 21** quel ramo è vivo — al primo avvio non esiste
  alcun gruppo — ed è il **solo** punto dell'app in cui vive, invece delle condizioni sparse che lo
  Step 12 aveva eliminato apposta. La guardia è stata scritta prima dello stato vuoto che la attiva.
- **Due schermate ne restano fuori di proposito.** `backup.tsx`, perché è l'unica da cui si
  **ripristina** una chiave, cioè ciò che serve a chi un gruppo non ce l'ha; e `pair/invite.tsx`,
  perché `app/(gruppo)/pair/` e `app/pair/` convergerebbero sullo stesso segmento `/pair` — usa
  `GroupRequired` in linea, in un componente sopra quello che lavora, perché gli hook vanno chiamati
  prima di ogni uscita anticipata.
- **Tutto ciò che riguarda un gruppo si apre dal gruppo** (Step 19): categorie, budget, pareggi,
  backup della chiave ed export sono cinque `NavCard` in `manage`. Prima stavano in Impostazioni,
  dove sembravano riguardare l'app: chi apriva «Backup della chiave» non poteva sapere di **quale**
  chiave si trattasse. Dallo **Step 20** non sono più duplicate in Impostazioni.
- **Le tre cose che erano mescolate in Impostazioni sono separate** (Step 20): l'app resta lì (sync,
  diagnostica, versione), il gruppo sta nella sua gestione, e **io** ho un tab mio. Il profilo non è
  una preferenza dell'app: è l'unica cosa che attraversa tutti i gruppi, ed è il `profileId` a
  rendermi la stessa persona in ognuno.
- **Impostazioni legge il motore con `useVaultStatus()`, che non solleva** — non con
  `useVaultRuntime()`, che solleva — e non tocca `useGroups().current`: con zero gruppi (Step 21)
  funziona, e «Sincronizza adesso» è semplicemente disabilitato. È l'unica condizione che quel tab
  avrà mai.
- **`/azzera` è nata allo Step 20 e spiegava soltanto** — che cosa sparisce e che cosa no — perché lo
  Step 22 restasse tutto codice distruttivo e niente impaginazione. Adesso ha anche l'interruttore,
  l'`Alert` e la cancellazione vera: vedi [Azzera questo telefono](#azzera-questo-telefono-step-22).

## Nessun gruppo è uno stato normale (Step 21)

Al primo avvio non esiste alcun gruppo, e uscire dall'ultimo non ne crea più uno vuoto. Lo Step 12
aveva fatto il contrario apposta — per togliere un ramo condizionale da mezza dozzina di schermate —
e il prezzo si è visto provando l'app a mano: ci si trovava dentro un gruppo chiamato «Le mie spese»
mai chiesto, senza capire se fosse quello condiviso.

- **Fase `absent` dentro `VaultProvider`, mai `<VaultProvider>` montato condizionalmente.** Montarlo
  solo quando c'è un gruppo cambierebbe il tipo di un antenato dello `Stack`: React rimonterebbe
  l'**intero navigatore** proprio nell'istante in cui si crea il primo gruppo. Con la fase, l'albero
  dei provider è stabile per tutta la vita del processo e `VaultRuntime.keys` resta non nullable.
- **`absent` è derivato dal gruppo corrente, non uno stato scritto dall'effetto** (lo vieta
  `react-hooks/set-state-in-effect`, a ragione). Nel derivarlo si è chiusa anche una finestra che
  c'era già: un runtime `ready` il cui `vaultId` non è più quello corrente vale `loading`, altrimenti
  fra il cambio di gruppo e il rimontaggio del motore le schermate leggono lo store di prima.
- **`VaultGate` lascia passare `absent`**: non c'è niente da attendere. Le schermate che vogliono il
  vault sono già dietro `app/(gruppo)/` o dentro lo stack `[vaultId]`, irraggiungibile senza gruppi.
- **`useCurrentGroup()` è nullabile e non ha un gemello che solleva**: due hook quasi uguali sarebbero
  il posto in cui qualcuno usa quello sbagliato. Cambiarne la firma è ciò che ha fatto trovare al
  compilatore tutti i chiamanti da sistemare.
- **La logica è in `state/current-group.ts`** (`chooseCurrentGroup`, `nextAfterLeave`), fuori dal
  provider perché è l'unica parte provabile senza React Native. **Si tocca solo il ramo
  `list.length === 0`**: nessuna migrazione, nessun bump di `CURRENT_SCHEMA_VERSION` — alzarlo
  farebbe scattare `ensureSchema`, che è scritto per **cancellare**. Il test che protegge chi ha già
  dei dati è `stored === null` con lista piena → il primo.
- **Tre stati vuoti, e nessun altro**: l'elenco gruppi (crea · invito · ripristina da un backup), i
  Grafici, e `app/(gruppo)/_layout.tsx`.
- **`backup.tsx` senza gruppo mostra solo il ripristino**, e si intitola «Ripristina una chiave». È
  la conferma pratica della scelta dello Step 19 di tenerla fuori da `(gruppo)`.

## Azzera questo telefono (Step 22)

`src/app/azzera.tsx` → `useWipeDevice()` → `wipeDevice()`. Il gesto meno reversibile dell'app, e
l'unico posto del progetto dove si cancella tutto: **l'ordine delle operazioni è il contenuto dello
step**, non un dettaglio di implementazione.

- **`registry.list()` è la primissima operazione, sempre.** Le chiavi stanno in SecureStore sotto
  `groupKeyStorageKey(vaultId)`, ed `expo-secure-store` **non sa elencare i propri slot**: l'unico
  modo di nominarle è leggere i `vaultId` dal registro. Cancellare `groups` prima lascerebbe nel
  Keystore di sistema chiavi innominabili **per sempre**.
- **Il profilo per ultimo.** Così ogni prefisso interrotto della sequenza è «profilo presente, zero
  gruppi» — lo stato vuoto dello Step 21, che l'app sa già disegnare. Nell'ordine inverso ci sarebbe
  una finestra con nessun profilo ma i gruppi ancora in elenco: l'app manderebbe all'onboarding e poi
  farebbe **riapparire i gruppi di prima**.
- **Se un `forget` fallisce ci si ferma prima del profilo**, con l'errore mostrato in schermata: chi
  riprova trova i gruppi rimasti ancora in elenco, quindi le loro chiavi ancora nominabili. È il test
  «un'interruzione a metà lascia uno stato coerente».
- **Il motore va spento prima.** `closeCurrent()` (nuovo su `GroupsProvider`: il gruppo resta in
  elenco, semplicemente non è più corrente) → il cleanup del `VaultProvider` ferma engine e
  persistenza → **si attende `phase === 'absent'`** → solo allora si cancella. Attendere invece di
  sperare è la differenza fra un progetto e un `setTimeout(…, 300)`.
- **La fase di `useWipeDevice` è derivata**, non scritta da un `setState` nell'effetto: «il motore è
  spento» si legge già dallo stato del vault. Stessa regola dello Step 21.
- **Non si tocca il relay.** Azzerare è un gesto locale: le copie sono cifrate, scadono col TTL di
  trenta giorni, e cancellarle riguarda tutti gli altri. Chi le vuole via esce da ogni gruppo con
  l'interruttore _Cancella anche la copia sul relay_ **prima**. C'è un test con la spia sul
  `RelayGateway`: zero `deleteVault`.
- **`SqliteSyncStore.forgetAll`** è l'unico `DELETE` senza `WHERE` ammesso nel progetto, e sta dentro
  la classe che possiede quelle tabelle. Altrove il `WHERE vault_id` è ciò che impedisce a un gruppo
  di svuotare la coda offline di un altro.
- **È anche riparatore:** la spazzata delle `y_updates_*` orfane conclude oggi un tentativo
  interrotto ieri. Solo i nomi nella forma esatta di `updatesTableName` vengono eliminati — quello
  che arriva da `sqlite_master` finisce in un `DROP TABLE`, dove non esistono parametri.
- **`ensureSchema` chiude la sequenza**, perché `DELETE FROM app_meta` porta via anche
  `schema_version` e qui non si riavvia l'app. Trovandosi senza versione, `ensureSchema` prende le
  tabelle di sync per quelle del vecchio schema — hanno gli stessi nomi — e le elimina: va bene, sono
  vuote da un istante prima e `SqliteSyncStore.open` le ricrea.
- **Il ritorno all'onboarding senza riavvio** è `forgetProfile()`: il `ProfileGate` smonta
  `GroupsProvider` e `VaultProvider` con tutto il loro stato in memoria, e registrando un profilo
  nuovo quelli rimontano su tabelle vuote. Prima di smontare si fa `router.replace('/')`: il
  navigatore sparisce per intero, e al ritorno riaprirebbe l'ultima rotta — cioè «Azzera questo
  telefono».
