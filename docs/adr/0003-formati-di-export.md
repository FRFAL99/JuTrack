# ADR 0003 — Due formati di export, e un CSV che non segue la convenzione italiana

- **Data:** 2026-08-01
- **Stato:** Accettata

## Contesto

L'export dei dati esiste per una ragione dichiarata fin dal piano: **nessun lock-in**. Chi smette di
usare JuTrack deve potersi portare via tutto, e deve poterlo fare senza passare da un server — che
peraltro non ha mai visto quei dati in chiaro.

Due esigenze diverse si nascondono sotto la parola «export»:

1. **Leggere i dati altrove**: aprirli in un foglio di calcolo, sommare una colonna, fare un
   grafico. Vuole un formato tabellare, appiattito.
2. **Conservarli**: tenerne una copia che non perda niente. Vuole un formato fedele alla struttura,
   tombstone compresi.

Un formato solo servirebbe male entrambe. Un CSV che conserva la struttura non è più un CSV; un JSON
non si somma in Excel.

Sul CSV c'è poi un conflitto specifico. La convenzione italiana usa `;` come separatore di campo e
`,` come separatore decimale, perché la virgola è già occupata dal decimale. Excel con locale
italiano si aspetta quella. Ma è una convenzione locale: Fogli Google, `pandas`, `csv` di Python,
qualunque strumento non italiano si aspettano RFC 4180 — `,` separatore, `.` decimale.

## Decisione

**Due formati distinti, presentati come tali** nella schermata: «per leggerli altrove» (CSV) e «per
conservarli» (JSON). Non come alternative equivalenti.

Il CSV segue **RFC 4180 puro**: separatore `,`, decimale `.`, fine riga CRLF. Ogni importo compare
in **due colonne**: `importo` (decimale) e `importo_centesimi` (intero). La seconda è quella
autorevole.

In testa al file c'è il **BOM UTF-8**.

Il JSON è integrale e include i tombstone. Nessuno dei due contiene la chiave del vault.

## Motivazione

**Perché RFC 4180 e non la convenzione italiana.** Il file va dove va: se si sceglie il formato
locale, si rompe ovunque tranne che in un Excel configurato in italiano. Il caso d'uso più probabile
su un telefono è per giunta Fogli Google, che RFC 4180 lo legge nativamente.

**Perché la colonna in centesimi risolve il conflitto invece di sceglierne un lato.** Un intero non
ha separatore decimale, quindi non ha ambiguità di locale: `2500` è 2500 in qualunque
configurazione. Se `importo` viene interpretato male da un foglio di calcolo, `importo_centesimi`
resta corretto e basta dividere per 100. Ed è coerente col resto del progetto, dove il denaro è
sempre un intero in centesimi e mai un float (vedi `model/money.ts`).

**Perché il BOM.** Senza, Excel su Windows legge un CSV UTF-8 come se fosse nella codepage di
sistema, e le accentate diventano mojibake. Gli altri strumenti lo ignorano. Il costo è tre byte.

**Perché il JSON conserva i tombstone.** Una cancellazione, nel modello, è un tombstone e non una
rimozione (vedi `docs/architecture.md`). Un export che li scartasse, reimportato, farebbe riapparire
spese che qualcuno aveva cancellato di proposito — un backup che resuscita dati è peggio di nessun
backup.

**Perché i pareggi in un file separato.** Non sono spese. In un unico foglio prima o poi qualcuno
somma una colonna che comprende entrambi e ottiene un numero privo di significato.

## Conseguenze

**Positive**

- I file si aprono ovunque, non solo in una configurazione.
- L'importo resta recuperabile anche se il foglio di calcolo sbaglia a interpretare il decimale.
- La distinzione fra «leggere» e «conservare» è esplicita: nessuno terrà il CSV credendo di avere un
  backup.

**Negative**

- Un utente italiano che apra il CSV in Excel con doppio clic vedrà probabilmente tutto in una
  colonna sola, e dovrà usare l'importazione guidata. È il prezzo esplicito della portabilità.
- Due file invece di uno per avere spese e pareggi.
- Il CSV **non è reimportabile**. Non è un difetto da correggere: è la conseguenza del suo essere
  appiattito. Il formato reimportabile è il JSON.

**Rischio mitigato: CSV injection.** Un campo di testo che comincia per `=`, `+`, `-` o `@` viene
valutato come formula da Excel e da Fogli Google. Le note vengono quindi prefissate con un apice
singolo quando iniziano così. Qui i testi li scrivono i due proprietari del vault, ma un export si
gira a terzi e la difesa costa un carattere.

## Reversibilità

Il formato JSON porta `format` e `version` in testa proprio per questo: se la forma dei record
cambierà, un futuro importatore saprà distinguere i file vecchi dai nuovi. Il CSV non ha bisogno di
versionamento perché non viene riletto dall'app.

Aggiungere in futuro una variante «CSV per Excel italiano» come seconda opzione è un cambiamento
additivo: cambia il separatore e il decimale, non la struttura. Il segnale per farlo è che aprire il
file diventi un fastidio ricorrente nell'uso reale — da osservare, non da anticipare.
