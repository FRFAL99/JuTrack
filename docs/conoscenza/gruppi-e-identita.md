# Gruppi e identità

Come si entra in un gruppo, chi si è, come si esce. Sezioni estratte da
[STATO.md](../STATO.md), dove erano cresciute insieme alla cronaca.

## Come si entra in un gruppo (Step 7 e 13)

Quattro strade, una sola conferma — quella di `useAdoptPairing`:

1. **Link condiviso** — `Share.share` dalla schermata d'invito, aperto dall'altro su `/j` e
   riportato nell'app dalla rotta `/join`
2. **Scanner interno** — Gruppi → «Incolla un invito o scansiona»
3. **Lettore QR di sistema** — apre `jutrack://pair?…`, raccolto dalla rotta `/pair`
4. **Incolla** — link o URI, sempre disponibile, unica via se la fotocamera non c'è

Tutte trasportano **solo la chiave**: `vaultId`, `contentKey` e `authKey` sono derivate. Dallo Step
12 non serve più alcun riavvio, e l'ingresso **aggiunge** un gruppo invece di sostituirlo.

**Il link mette la chiave nel fragment**
(`https://<relay>/j#v=1&k=<base64url>&n=<nome>&e=<scadenza>`): è la parte dell'indirizzo che i
browser non trasmettono, quindi non arriva al Worker, non entra nei log di Cloudflare e non compare
nelle anteprime generate dalle chat. La pagina `/j` è statica, non fa richieste di rete e non
istanzia alcun Durable Object — con i test che lo verificano.

`parseInvite` legge **tre forme**: il link, `jutrack://join#…` e il vecchio `jutrack://pair?…` dei
QR già in circolazione. Una funzione sola, perché chi incolla un codice non sa in quale forma sia, e
tre grammatiche separate divergerebbero.

**Il fragment non passa da expo-router.** Il router instrada sul percorso e trasforma la query in
parametri; ciò che sta dopo il `#` non è né l'uno né l'altra. La rotta `/join` legge il link grezzo
con `Linking.useLinkingURL()`. È il punto in cui questo pezzo poteva fallire in silenzio.

**Chiunque abbia il link o il QR entra nel gruppo.** Rischio accettato, dichiarato
nell'interfaccia **prima** di generare l'invito e ampliato nel threat model: un link inoltrabile è
più esposto di un QR mostrato a schermo per cinque minuti. La scadenza è una cortesia, non una
difesa: sta dentro l'URL, quindi è rimovibile. Il rimedio a un invito finito male è **rigenerare il
gruppo** (Step 14): chiave nuova, storia intatta, chi resta reinvitato. Un protocollo autenticato
(SAS/PAKE) toglierebbe il segreto dal trasporto, ed è fra i miglioramenti futuri.

## Chi sono io (Step 11)

Il **profilo** è uno per persona e vive in `app_meta`, una tabella di SQLite — non in SecureStore,
che resta riservato al materiale crittografico. `{ profileId, name, color, identity? }`.

- **`profileId` è casuale e opaco**, mai derivato dal nome né dalla chiave. È il seam per agganciare
  un giorno un provider d'identità senza cambiare la chiave con cui i membri sono scritti nei vault:
  cambiarla dopo vorrebbe dire riscrivere `paidBy` e le quote di ogni spesa.
- **Il membro nasce dal profilo**: `VaultStore.setMember(id, …)` scrive con un id scelto da chi
  chiama. È idempotente, quindi rieseguirla a ogni avvio non duplica nulla e un cambio di nome
  raggiunge l'altro telefono da solo.
- **`ProfileProvider` sta sopra `VaultProvider`**, non accanto: il profilo deve esistere prima che il
  vault si monti, altrimenti resta una finestra in cui l'app funziona ma «io» non esisto — ed è lì
  che nascevano i duplicati.
- **L'origine del vault (`created` / `joined`) si registra quando si crea o si adotta la chiave**, non
  dopo: guardando un documento pieno di dati sincronizzati i due casi sono indistinguibili. Chi entra
  non semina le categorie, le riceve col primo sync.
- **Le persone non si aggiungono a mano.** Una persona senza telefono dietro non potrebbe registrare
  una spesa né vedere il saldo: l'elenco è in sola lettura, e ognuno si aggiunge collegando il
  proprio telefono.

Il ricollegamento a un membro esistente è arrivato allo **Step 12**, in una forma diversa da quella
prevista qui: la domanda si fa **prima** di scrivere il membro, non dopo. Vedi sotto.

## I gruppi (Step 12)

**Un gruppo = un vault = una `vaultKey` = un `vaultId` = un Durable Object = un documento Yjs.**
«Casa» e «Viaggio in Grecia» convivono sullo stesso telefono e non si mescolano.

- **Registro locale:** una chiave per gruppo in SecureStore (`jutrack.groupKey.<vaultId>`), una riga
  per gruppo nella tabella `groups`, e un `y_updates_<vaultId>` per documento. Il `vaultId` è 32
  caratteri esadecimali **derivati dalla chiave**, quindi è un identificatore SQL valido per
  costruzione: nessun testo scelto dall'utente finisce in un nome di tabella.
- **Il nome autorevole sta dentro il vault** (`Y.Map` `meta`), così rinominare raggiunge l'altro
  telefono da solo. Il registro ne tiene una copia per disegnare la lista senza aprire ogni
  documento; quando divergono, è la copia ad aggiornarsi.
- **Il `WHERE vault_id` di `setPending` è il punto pericoloso di tutto il piano.** Senza, una
  scrittura in un gruppo cancellerebbe la coda offline dell'altro: spese registrate in aereo perse
  in silenzio. Il test gira su **SQLite vero**, perché un finto motore che ignori il `WHERE` farebbe
  passare esattamente quel bug.
- **C'è sempre almeno un gruppo.** Al primo avvio ne nasce uno («Le mie spese»): costa 32 byte
  casuali e nessuna richiesta di rete. Sparisce così lo stato «nessun vault», che era un ramo
  condizionale in mezza dozzina di schermate.
- **Il runtime è rimontabile:** l'effetto dipende da `vaultId`, non da `[]`. Cambiare gruppo smonta
  engine e persistenza e ne monta altri — ed è questo che fa sparire il «riavvia l'app» dopo il
  pairing. Un solo motore attivo per volta, sul gruppo aperto.
- **Gli hook di `state/hooks.ts` non hanno cambiato firma**, quindi le undici schermate che consumano
  dati non sono state toccate. È la ragione per cui lo step era fattibile senza riscrivere l'app.

**«Chi sei in questo gruppo?»** Chi **entra** in un gruppo altrui risponde a una domanda prima che
gli venga scritto un membro: è nuovo, oppure è già dentro con un altro telefono e ha appena
ripristinato la chiave. La domanda si fa **prima**, non dopo, perché i membri non hanno tombstone e
quello creato per sbaglio resterebbe lì per sempre. Chi **crea** un gruppo non vede nulla.

**Ripartenza pulita, non migrazione.** `schema_version` in `app_meta`: trovando lo schema a vault
unico si eliminano quelle tabelle, la vecchia chiave e le chiavi di `app_meta` che la riferivano. Il
profilo sopravvive. Il vault vecchio sul relay resta e scade col TTL di 30 giorni — cancellarlo
richiederebbe la chiave che si sta eliminando, e una richiesta di rete durante l'avvio.

## Uscire da un gruppo, e rigenerarlo (Step 14)

Sono due gesti diversi, e la differenza è l'unica cosa che conta capire.

| Gesto                  | Cosa fa                                                      | Chi resta fuori                          |
| ---------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **Esci dal gruppo**    | Cancella da **questo telefono** chiave, spese e coda di sync | Nessuno: solo tu esci                    |
| + cancella dal relay   | Svuota anche la copia sul server                             | Nessuno, ma si fermano gli aggiornamenti |
| **Rigenera il gruppo** | Chiave nuova, `vaultId` nuovo, tutta la storia dentro        | Chiunque non venga reinvitato            |

- **Cancellare dal relay non è revocare.** Non toglie a nessuno ciò che ha già scaricato, e poiché
  la cancellazione azzera anche il token registrato al primo accesso, il `vaultId` torna libero: chi
  conserva la chiave può ricominciare a scriverci, in un vault che però nessun altro legge. Il relay
  finto dei test replica anche questo, così nessun test può concludere che cancellare escluda
  qualcuno.
- **L'interruttore «cancella anche dal relay» è spento di default**, e vale per entrambi i gesti:
  è irreversibile e vale per tutti, non solo per chi lo tocca.
- **Prima il relay, poi il locale.** La cancellazione remota si autentica con il token derivato
  dalla chiave, che sta per essere eliminata da questo telefono. Se la rete non risponde non si
  tocca nulla: meglio un gruppo ancora in elenco, da cui riprovare, che un vault orfano sul relay
  che nessuno può più cancellare.
- **La rigenerazione tiene tutti i membri, escluso compreso.** Le spese li riferiscono con `paidBy`
  e con le quote: toglierne uno cambierebbe i saldi già calcolati. Chi è escluso resta nella storia,
  e smette solo di ricevere aggiornamenti.
- **Il gruppo vecchio non viene toccato dalla rigenerazione**: uscirne è una chiamata separata, così
  un'interruzione a metà lascia due gruppi leggibili invece di nessuno. Al termine si arriva alla
  schermata d'invito, perché un gruppo rigenerato e non reinviato a nessuno è un gruppo da soli.
