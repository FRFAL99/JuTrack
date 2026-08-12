# Modello di minaccia

Documento vivo. Va aggiornato quando cambia l'architettura, non a fine progetto.

Il criterio adottato qui: **dichiarare i limiti reali invece di suggerire una sicurezza che non
c'è**. Un modello di minaccia che promette troppo è peggio di nessun modello, perché induce
l'utente a comportamenti che non sarebbero giustificati.

## Cosa proteggiamo

Le spese personali di due persone: importi, date, categorie, note, e i saldi reciproci. Sono dati
che rivelano abitudini, luoghi frequentati, relazioni e situazione economica.

## Da chi

| Avversario                                        | Capacità                                         | Protetti?                         |
| ------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| Operatore del relay (noi stessi, Cloudflare)      | Legge tutto ciò che transita e resta memorizzato | ✅ Sì                             |
| Chi compromette il relay                          | Accesso completo allo storage del server         | ✅ Sì                             |
| Chi intercetta la rete                            | Legge il traffico                                | ✅ Sì (TLS + payload già cifrato) |
| Chi ruba un telefono **sbloccato**                | Accesso all'app                                  | ❌ **No**                         |
| Chi fotografa il QR di pairing                    | Ottiene la chiave del vault                      | ❌ **No**                         |
| Chi riceve un link d'invito inoltrato             | Ottiene la chiave del gruppo                     | ❌ **No**                         |
| Chi compromette il sistema operativo del telefono | Root/jailbreak, malware                          | ❌ No                             |

## Garanzie

**1. Il relay non può leggere i dati.** I payload sono cifrati con XChaCha20-Poly1305 sotto
`contentKey`, derivata da `vaultKey` che non lascia mai i dispositivi. Il server tratta i blob come
byte opachi. Non è una promessa di policy: è che il materiale crittografico non c'è.

**2. Il relay non può modificare i dati inosservato.** XChaCha20-Poly1305 è un cifrario autenticato:
qualunque alterazione del ciphertext fa fallire la decifratura. Il client scarta il blob invece di
applicare dati manomessi.

**3. Chi conosce `authKey` non può decifrare.** `authKey` e `contentKey` sono derivate con HKDF su
domini separati. Il relay vede la prima e non ha modo di risalire alla seconda.

**4. I metadati sono minimi.** Il relay conosce `vaultId` (casuale, non collegato a identità),
dimensione dei blob e orari di sync. Non conosce numero di spese, importi, categorie, né chi siano
gli utenti. Non c'è registrazione, non ci sono email.

## Limiti — da leggere

### La chiave persa non è recuperabile

Non esiste reset lato server. È il prezzo diretto della garanzia 1: se potessimo recuperare i tuoi
dati, potremmo leggerli. **Esporta il backup della chiave e conservalo fuori dal telefono.**

### Il QR di pairing contiene la chiave in chiaro

Chi fotografa lo schermo mentre il QR è visibile entra nel vault e ci resta.

Mitigazioni: scadenza breve, conferma esplicita prima di mostrarlo, avviso nella UI. Restano
mitigazioni, non soluzioni — il QR è un segreto trasmesso otticamente.

Mostralo solo in un luogo privato. Un protocollo di pairing autenticato (SAS/PAKE) eliminerebbe il
problema; non è in v1 ed è tracciato tra i miglioramenti futuri.

La scadenza scritta nell'URI (`e=`, cinque minuti) **non è una difesa crittografica**: è dentro il
codice, quindi chi ne ha copiato il contenuto può rimuoverla. Limita la finestra in cui uno
screenshot dimenticato viene ancora accettato da un'app onesta, niente di più.

### Il link d'invito è più esposto del QR, e va detto

Dallo Step 13 un invito viaggia anche come link:
`https://<relay>/j#v=1&k=<chiave>&n=<nome>&e=<scadenza>`.

**Cosa il link migliora.** La chiave sta nel **fragment**, la parte dell'indirizzo che i browser non
trasmettono: non arriva al Worker, non finisce nei log di Cloudflare e non compare nelle anteprime
che le chat generano visitando l'URL. La pagina `/j` è statica, non fa alcuna richiesta di rete e
non istanzia alcun Durable Object — proprietà verificate da test, non promesse. Il relay resta
esattamente ignorante com'era.

**Cosa il link peggiora, ed è la parte che conta.** Un QR vive cinque minuti sullo schermo di chi lo
mostra: per catturarlo bisogna essere presenti o avere una foto. Un link invece:

- resta nella cronologia della conversazione in cui è stato mandato, e in quella di chi lo riceve;
- si inoltra a un terzo con due tocchi, senza che chi l'ha creato lo sappia mai;
- attraversa i server della chat usata, dove è leggibile da chiunque li amministri se quella chat
  non è cifrata end-to-end;
- sopravvive nei backup di quella conversazione.

Chiunque abbia il link entra nel gruppo. La schermata d'invito lo dichiara **prima** di generarlo,
non dopo, e nomina l'unico rimedio reale a un invito finito nelle mani sbagliate: **rigenerare il
gruppo** con una chiave nuova, che dallo Step 14 è un'azione dell'interfaccia e non perde i dati. La scadenza di cinque minuti resta ciò che era già dichiarata di
essere — una cortesia verso un link dimenticato in chat, non una difesa: sta dentro l'URL, quindi è
rimovibile, e la chiave che contiene non scade mai.

Il QR e l'incolla manuale restano disponibili nella stessa schermata: quando i due telefoni sono uno
di fronte all'altro, sono la scelta migliore e non fanno passare la chiave da una chat.

### Il codice di pairing incollato passa dagli appunti

Lo scanner offre un campo per incollare il codice, perché senza fotocamera funzionante il secondo
telefono non entrerebbe più nel vault. Il prezzo è che la chiave transita dagli appunti di sistema,
leggibili da altre app installate. Chi usa la fotocamera non paga questo prezzo; chi incolla
dovrebbe copiare qualcos'altro subito dopo.

### L'export dei dati esce in chiaro

CSV e JSON prodotti da «Esporta i dati» **non sono cifrati**. È deliberato: servono a essere aperti
altrove, e un file che richiede JuTrack per essere letto non risolverebbe il lock-in che l'export
esiste per evitare.

La conseguenza va detta: da lì in poi quei dati valgono quanto vale il posto dove finiscono. La
cifratura end-to-end protegge ciò che transita dal relay, non ciò che si manda a qualcun altro.
L'interfaccia lo dichiara nella schermata stessa.

Il file viene scritto nella **cache** e non nella directory dei documenti: è di transito verso l'app
scelta nel foglio di condivisione, e il sistema può rimuoverlo. Lasciarlo fra i documenti
significherebbe accumulare export in chiaro che nessuno cancella.

Nessun file di export contiene la chiave del vault — c'è un test di regressione che lo verifica.

### La sicurezza del backup dipende da una passphrase umana

È l'unico punto dell'intero progetto in cui è così: nell'uso quotidiano la chiave è casuale a 256
bit, qui invece il file regge quanto regge la passphrase. Chi ottiene il backup può provare offline,
senza limiti di tentativi. `scrypt` (`logN = 16`) rende ogni tentativo costoso, ma su una passphrase
indovinabile il costo non basta.

Mitigazione: soglia minima di 12 caratteri e un giudizio esplicito nel campo, che spinge verso
quattro parole slegate. È una **euristica, non una misura di entropia** — una frase lunga presa da
una canzone nota la supererebbe e cadrebbe al primo attacco a dizionario.

I parametri di `scrypt` viaggiano dentro il backup, legati al ciphertext dall'AAD: un file vecchio
resta importabile anche dopo che il costo di default sarà stato alzato, e nessuno può rigiocarlo
abbassandolo.

### Il telefono sbloccato è il vault aperto

`vaultKey` sta in `expo-secure-store` (Keychain iOS / Keystore Android), protetta a riposo. Ma con
il telefono sbloccato e l'app aperta i dati sono in chiaro sullo schermo. Non c'è PIN applicativo in
v1.

Se questo è nel tuo modello di minaccia, usa un blocco schermo forte. Un lock applicativo con
biometria è tra i miglioramenti futuri.

### Nessuna revoca di dispositivo

Non c'è modo di espellere un dispositivo compromesso. La chiave del vault è condivisa e simmetrica:
chi ce l'ha, ce l'ha.

L'unico rimedio è **ruotare il vault**: nuova chiave, nuovo `vaultId`, ri-pairing dei dispositivi
legittimi. Dallo Step 14 è un'azione dell'interfaccia — «Rigenera con una chiave nuova», nella
schermata del gruppo — che porta con sé spese, categorie e saldi e finisce sulla schermata d'invito
per chi resta. Vale allo stesso modo per un link d'invito finito dove non doveva.

Va detto con precisione cosa **non** ottiene, perché l'interfaccia lo dice e questo documento non
può dire meno:

- **Non toglie a nessuno ciò che ha già scaricato.** I dati del gruppo vecchio restano sui telefoni
  che li hanno, leggibili con la chiave che hanno. Quello che si interrompe è il flusso di
  aggiornamenti.
- **Cancellare il vault dal relay non è una revoca.** Svuota la copia sul server, e poiché elimina
  anche il token registrato al primo accesso, il `vaultId` torna disponibile: chi conserva la chiave
  può ricominciare a scriverci, in un vault che però nessun altro sta più leggendo.
- **I membri restano tutti nel gruppo rigenerato**, escluso compreso. Le spese li riferiscono con
  `paidBy` e con le quote: rimuoverli cambierebbe i saldi già calcolati.

### Il relay può negare il servizio

Non potendo leggere né alterare, un relay ostile può comunque rifiutare o ritardare la
sincronizzazione. Impatto contenuto: ogni telefono ha lo stato completo in locale e resta pienamente
funzionante offline.

### Nessuna resistenza all'analisi del traffico

Il relay osserva quando e quanto sincronizzi. Dalla frequenza si può inferire qualcosa sui ritmi
d'uso dell'app. Non lo consideriamo rilevante per questo caso d'uso; sarebbe rilevante in altri.

Dallo **Step 36** questa inferenza è cambiata di segno, e vale la pena dirlo: con un widget sulla
schermata home il telefono contatta il relay ogni mezz'ora **anche quando l'app non viene aperta**.
Il relay quindi vede più traffico, ma quel traffico dice **meno** di prima su quando la persona sta
usando l'app — un ritmo regolare copre i picchi. Resta vero il contrario per la presenza: un
dispositivo con un widget si annuncia periodicamente, mentre prima taceva per giorni.

### I widget mostrano importi fuori dall'app

I due widget (Step 34 e 35) scrivono saldo e totale del mese sulla **schermata home**, cioè fuori
dall'app e senza che nessuno li apra. Non c'è una nuova falla crittografica — la home di Android è
raggiungibile solo a telefono sbloccato, come l'app — ma la superficie visiva è diversa: chi guarda
lo schermo da sopra la spalla legge un importo senza toccare niente. Chi non lo vuole ha un rimedio
diretto e completo: non aggiungere i widget, o toglierli.

Il foglietto che li alimenta (`widget_snapshot` in `app_meta`) contiene **frasi già formattate** —
un nome di gruppo, un nome di membro, due importi — in chiaro nel database locale. Non è una
categoria nuova di esposizione: il documento Yjs è già in chiaro su disco, e la cifratura di questo
progetto protegge ciò che transita dal relay, non il database di un telefono sbloccato.

### Il refresh in background decifra il vault mentre nessuno guarda

Lo Step 36 fa girare un task headless ogni mezz'ora, quando c'è un widget sulla home: legge la
chiave da SecureStore, decifra quello che arriva dal relay e riscrive il foglietto. **Non concede
un permesso nuovo** — su Android la chiave è già leggibile dal processo dell'app in qualunque
momento, perché `expo-secure-store` è usato senza `requireAuthentication` — ma sposta il momento in
cui quella lettura avviene: prima solo con l'app aperta, ora anche a telefono in tasca.

La conseguenza da tenere a mente è per il futuro: **un lock applicativo con biometria** (fra i
miglioramenti qui sotto) o un `requireAuthentication` su SecureStore renderebbero il refresh in
background impossibile per costruzione, perché non c'è nessuno che possa autenticarsi. Sono due
funzioni che si escludono a vicenda, e la scelta fra loro va fatta consapevolmente, non scoprendola
quando la seconda smette di funzionare.

## Scelte crittografiche

| Elemento                 | Scelta                              | Perché                                                                                                             |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cifratura                | XChaCha20-Poly1305                  | AEAD moderno, nonce da 24 byte: generazione casuale sicura senza contatore condiviso                               |
| Nonce                    | 24 byte casuali, uno per messaggio  | Con 192 bit la collisione è trascurabile anche senza coordinamento tra dispositivi                                 |
| Derivazione chiavi       | HKDF-SHA256                         | Standard, separazione di dominio esplicita                                                                         |
| Passphrase (solo backup) | scrypt                              | In JS Argon2 è penalizzato dall'assenza di `Uint64Array` veloce; gli autori di `@noble/hashes` raccomandano scrypt |
| Libreria                 | `@noble/ciphers`, `@noble/hashes`   | JS puro, auditate, minimali, senza dipendenze native                                                               |
| Randomness               | CSPRNG di sistema via `expo-crypto` | Mai `Math.random()` per materiale crittografico                                                                    |
| Confronto token          | Tempo costante                      | Un confronto naive perde informazione via timing                                                                   |

## Miglioramenti futuri

Non in v1, tracciati per non essere dimenticati:

- Pairing autenticato (SAS o PAKE) per eliminare il segreto nel QR
- Lock applicativo con biometria
- Rotazione della chiave del vault assistita dalla UI
- Padding dei blob per uniformare le dimensioni contro l'analisi del traffico
- Backup cifrato automatico su storage scelto dall'utente
