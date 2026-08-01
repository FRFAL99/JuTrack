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

### Il codice di pairing incollato passa dagli appunti

Lo scanner offre un campo per incollare il codice, perché senza fotocamera funzionante il secondo
telefono non entrerebbe più nel vault. Il prezzo è che la chiave transita dagli appunti di sistema,
leggibili da altre app installate. Chi usa la fotocamera non paga questo prezzo; chi incolla
dovrebbe copiare qualcos'altro subito dopo.

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
legittimi. Il vecchio vault va abbandonato. Procedura manuale in v1.

### Il relay può negare il servizio

Non potendo leggere né alterare, un relay ostile può comunque rifiutare o ritardare la
sincronizzazione. Impatto contenuto: ogni telefono ha lo stato completo in locale e resta pienamente
funzionante offline.

### Nessuna resistenza all'analisi del traffico

Il relay osserva quando e quanto sincronizzi. Dalla frequenza si può inferire qualcosa sui ritmi
d'uso dell'app. Non lo consideriamo rilevante per questo caso d'uso; sarebbe rilevante in altri.

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
