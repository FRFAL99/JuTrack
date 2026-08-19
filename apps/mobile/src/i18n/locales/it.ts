/**
 * L'italiano, che è **la fonte e non una traduzione**.
 *
 * L'app è stata scritta in italiano per trentasei step, e questo file è il posto in cui
 * quelle frasi hanno smesso di stare dentro i componenti. La direzione conta: si scrive qui,
 * e da qui si traduce — `en.ts` è tipizzato su questa forma, quindi una chiave aggiunta di
 * là senza esserci qui non compila, e una aggiunta qui senza tradurla di là nemmeno.
 *
 * **Lo Step 37 aveva tradotto una schermata**, `tu.tsx`, quella con l'interruttore. Lo Step
 * 38 aggiunge le tre che si aprono più spesso — le spese del gruppo, la nuova spesa,
 * l'elenco dei gruppi — e con esse i moduli condivisi che ci scrivono dentro: date, stato
 * del sync, saldo, divisione, sottotitoli dell'elenco. Lo Step 40 chiude il resto: grafici,
 * dashboard, onboarding, pairing, backup/export/import e azzeramento — comprese le frasi
 * rimaste in `insights/query.ts` (`packages/core`), passate da fuori come `QueryStrings`
 * per la stessa ragione per cui il core non importa `i18next` (Step 0).
 *
 * **Le date sono un modello, non un elenco di parole.** `date.dayTitle` è
 * `{{weekday}} {{day}} {{month}}` in italiano e `{{weekday}}, {{month}} {{day}}` in inglese:
 * l'ordine dei pezzi appartiene alla lingua quanto i nomi dei mesi, e metterlo nel codice
 * avrebbe voluto dire scrivere «Monday 1 August» credendo di aver tradotto.
 *
 * **I plurali si scelgono a mano**, con `.one`/`.other` e l'aiuto di `plural()`: i18next
 * saprebbe farlo, ma lo fa con `Intl.PluralRules`, e senza `Intl` ripiega su una regola
 * finta che sceglie sempre la stessa forma — sbaglierebbe la parola invece di fallire. Vale
 * per italiano e inglese, che dividono uno da molti allo stesso modo; una lingua con più
 * forme chiederebbe di rimettere in mezzo `Intl`.
 */

export const it = {
  common: {
    close: 'Chiudi',
    cancel: 'Annulla',
    /** Il nome di un membro che il documento non conosce: non dovrebbe capitare, ma capita. */
    someone: 'qualcuno',
  },
  date: {
    today: 'Oggi',
    yesterday: 'Ieri',
    dayTitle: '{{weekday}} {{day}} {{month}}',
    /** Senza giorno della settimana: su una data di un altro anno non aiuta a collocarla. */
    dayTitleOtherYear: '{{day}} {{month}} {{year}}',
    dayShort: '{{day}} {{month}}',
    dayShortOtherYear: '{{day}} {{month}} {{year}}',
    monthYear: '{{month}} {{year}}',
    weekdays: {
      0: 'domenica',
      1: 'lunedì',
      2: 'martedì',
      3: 'mercoledì',
      4: 'giovedì',
      5: 'venerdì',
      6: 'sabato',
    },
    months: {
      1: 'gennaio',
      2: 'febbraio',
      3: 'marzo',
      4: 'aprile',
      5: 'maggio',
      6: 'giugno',
      7: 'luglio',
      8: 'agosto',
      9: 'settembre',
      10: 'ottobre',
      11: 'novembre',
      12: 'dicembre',
    },
  },
  sync: {
    idle: 'In attesa',
    syncing: 'Sincronizzazione…',
    syncedAt: 'Aggiornato {{when}}',
    offline: 'Offline — le modifiche restano in coda',
    error: 'Non sincronizzato: {{message}}',
    blocked: 'Sincronizzazione fermata: il relay rifiuta la chiave',
    now: 'adesso',
    secondsAgo: { one: '{{count}} secondo fa', other: '{{count}} secondi fa' },
    minutesAgo: { one: '{{count}} minuto fa', other: '{{count}} minuti fa' },
    hoursAgo: { one: '{{count}} ora fa', other: '{{count}} ore fa' },
  },
  tabs: {
    groups: 'Gruppi',
    charts: 'Grafici',
    you: 'Tu',
  },
  groups: {
    title: 'I tuoi gruppi',
    emptyIntro:
      'Un gruppo è dove finiscono le spese da dividere, con le persone che le dividono. Puoi crearne uno adesso, entrare in quello di qualcun altro con un invito, oppure ripristinare una chiave che avevi messo da parte.',
    newGroup: 'Nuovo gruppo',
    joinInvite: 'Entra con invito',
    restoreIntro:
      'Se hai salvato la chiave di un gruppo e la sua passphrase, il gruppo torna qui. Le spese arrivano col primo sync, se è ancora sul relay.',
    restore: 'Ripristina una chiave',
    /** L'ultima strada: ricostruisce i dati da un export JSON, ma in un gruppo nuovo. */
    importExport: 'Importa un export JSON',
    openNow: 'Aperto adesso',
    vaultShort: 'vault {{id}}',
    noExpenses: 'nessuna spesa',
    expenseCount: { one: '{{count}} spesa', other: '{{count}} spese' },
    subtitle: '{{state}} · {{count}} · {{total}} questo mese',
    new: {
      title: 'Nuovo gruppo',
      body: 'Nasce vuoto e solo tuo. Diventa condiviso quando inviti qualcuno dal gruppo stesso.',
      placeholder: 'Casa, Viaggio, Coinquilini…',
      nameLabel: 'Nome del gruppo',
      create: 'Crea',
      creating: 'Creazione…',
      failed: 'Creazione fallita',
    },
    /** Cosa si vede al posto di una schermata che ha bisogno di un gruppo, quando non ce n'è. */
    required: {
      title: 'Serve un gruppo',
      hint: '{{what}} riguarda un gruppo, e per ora non ne hai nessuno aperto. Creane uno o entra con un invito ricevuto.',
      defaultWhat: 'Questa schermata',
    },
  },
  home: {
    groupLabel: 'Gruppo {{name}}',
    groupHint: 'Apre l’elenco dei gruppi per cambiare',
    settings: 'Impostazioni del gruppo',
    composition: 'Composizione della spesa del mese per categoria',
    settle: 'Pareggia',
    emptyTitle: 'Nessuna spesa',
    emptyBody: 'Tocca «{{action}}» in basso a destra per registrare la prima.',
    fab: 'Spesa',
    fabLabel: 'Aggiungi una spesa',
    balance: {
      creditOne: '{{name}} ti deve {{amount}}',
      creditMany: 'In {{count}} ti devono {{amount}}',
      debtOne: 'Devi {{amount}} a {{name}}',
      debtMany: 'Devi {{amount}} a {{count}} persone',
      even: 'Siete pari',
    },
  },
  expense: {
    newTitle: 'Nuova spesa',
    submitNew: 'Salva la spesa',
    editTitle: 'Modifica spesa',
    submitEdit: 'Salva le modifiche',
    notFoundTitle: 'Spesa',
    notFoundHeading: 'Spesa non trovata',
    notFoundHint: 'Potrebbe essere stata eliminata dall’altro dispositivo.',
    deleteAction: 'Elimina spesa',
    deleteTitle: 'Eliminare la spesa?',
    deleteBody: 'L’azione si applica anche sull’altro dispositivo.',
    deleteConfirm: 'Elimina',
    amount: 'Importo',
    amountPlaceholder: '0,00',
    amountLabel: 'Importo della spesa',
    amountError: 'Inserisci un importo maggiore di zero',
    whoAndHow: 'Chi paga e come si divide',
    paidBy: 'Ha pagato {{name}}',
    me: 'Tu',
    shareOf: 'Quota a carico di {{name}}',
    split: {
      equalTwo: 'Metà e metà',
      equalMany: 'In parti uguali',
      custom: 'Quote',
      single: 'Solo chi paga',
    },
    singleHint: 'Interamente a carico di chi ha pagato',
    preview: {
      none: 'Diviso in parti uguali',
      each: '{{amount}} a testa',
      range: '{{min}} / {{max}} a testa',
    },
    gap: {
      noAmount: 'Inserisci prima l’importo della spesa',
      exact: 'Le quote coprono esattamente il totale',
      missing: 'Mancano {{amount}}',
      excess: 'Eccedono di {{amount}}',
    },
    category: 'Categoria',
    date: 'Data',
    note: 'Nota',
    noteOptional: 'Facoltativa',
    notePlaceholder: 'Per esempio: spesa al supermercato',
    noteLabel: 'Nota della spesa',
    noteAdd: 'Aggiungi una nota',
    noteRead: 'Nota: {{note}}',
    extra: {
      title: 'Informazioni aggiuntive',
      optional: 'Facoltativi',
      tagCount: { one: '{{count}} tag', other: '{{count}} tag' },
      store: 'Negozio',
      storePlaceholder: 'Dove è stata fatta',
      tags: 'Tag',
      tagPlaceholder: 'Aggiungi un tag',
    },
    row: {
      uncategorized: 'Senza categoria',
      share: '{{amount}} per te',
    },
  },
  widget: {
    /**
     * I due rettangoli sulla home di Android.
     *
     * Non erano nel piano dello Step 38 — i widget sarebbero lo Step 39 — ma ci sono finiti
     * dentro per forza: la loro didascalia contiene il nome del mese, che da questo step è
     * tradotto. Lasciarli fuori avrebbe prodotto «Speso in August», che è peggio di
     * entrambe le lingue.
     */
    unknownBalance: 'Apri l’app per vedere il saldo',
    unknownMonth: 'Apri l’app per vedere il totale',
    alone: 'Solo tu in questo gruppo',
    creditOne: '{{name}} ti deve',
    creditMany: 'In {{count}} ti devono',
    debtOne: 'Devi a {{name}}',
    debtMany: 'Devi a {{count}} persone',
    even: 'Siete pari',
    monthCaption: 'Speso in {{month}}',
  },
  you: {
    name: {
      label: 'Il tuo nome',
      edit: 'Cambia nome',
      hint: 'Stesso nome in tutti i tuoi gruppi',
    },
    language: {
      title: 'Lingua',
      hint: 'Vale solo su questo telefono. I nomi che scrivi — gruppi, categorie, spese — restano come li hai scritti: quelli sono dati del gruppo, non testo dell’app.',
    },
    currency: {
      title: 'Valuta',
      hint: 'Vale solo su questo telefono, e per le spese che registri da qui. JuTrack non converte fra valute: in un gruppo conviene sceglierne una sola.',
    },
    alerts: {
      title: 'Avvisi',
      reminderTitle: 'Promemoria spese',
      reminderHint: 'Se passano {{days}} giorni senza che tu registri una spesa',
      budgetTitle: 'Budget del mese',
      budgetHint: 'Quando una categoria arriva al {{percent}}% del limite, e quando lo supera',
      syncTitle: 'Sincronizzazione ferma',
      syncHint:
        'Se le spese non arrivano agli altri telefoni per più di {{hours}} ore, o se il relay rifiuta la chiave',
      backupTitle: 'Chiave non salvata',
      /** «Una volta sola per gruppo» distingue questo avviso dagli altri tre: la chiave non
          cambia mai, quindi salvarla una volta chiude la questione per sempre. */
      backupHint:
        'Una volta per gruppo, se supera le {{count}} spese senza che tu abbia mai salvato la sua chiave',
      scope:
        'Gli avvisi sui budget e sulla sincronizzazione riguardano il gruppo aperto e arrivano mentre l’app è in uso.',
      blocked:
        'Android sta bloccando le notifiche di JuTrack: riattivale dalle impostazioni di sistema.',
      deniedTitle: 'Permesso non concesso',
      deniedBody:
        'Android non lascia mandare notifiche a JuTrack. Puoi cambiarlo dalle impostazioni di sistema, alla voce Notifiche dell’app.',
      unavailableTitle: 'Non disponibile su questa versione',
      unavailableBody:
        'Le notifiche arrivano con una versione più recente dell’app. Tutto il resto funziona come prima.',
    },
    sync: {
      title: 'Sincronizzazione',
      action: 'Sincronizza',
      privacy: 'Cifrato end-to-end · il relay non legge nulla',
    },
    group: {
      title: 'Il gruppo aperto',
      manage: 'persone e invito',
      categories: 'Categorie e budget',
      backup: 'Backup della chiave',
      export: 'Esporta i dati',
    },
    device: {
      title: 'Questo telefono',
      importExport: 'Importa un export JSON',
      probe: 'Diagnostica',
      wipe: 'Azzera questo telefono',
      idLabel: 'Il tuo identificativo',
      idBody:
        'È così che gli altri telefoni ti riconoscono dentro un gruppo. È un numero casuale, generato una volta su questo telefono: non è un account, non c’è niente a cui accedere, e da solo non dice nulla di te. Serve solo se qualcosa va storto e vuoi dire di quale persona stiamo parlando.\n\n{{id}}',
      version: 'JuTrack {{app}} · core {{core}}',
    },
  },
  stats: {
    filters: {
      periodA11y: 'Periodo: {{label}}. Tocca per cambiare i filtri',
      activeA11y: 'Filtro attivo: {{part}}. Tocca per cambiarlo',
      resetA11y: 'Azzera i filtri',
      reset: 'Azzera',
      open: 'Filtri',
      sections: {
        period: 'Periodo',
        person: 'Persona',
        category: 'Categoria',
        store: 'Negozio',
        tag: 'Tag',
        amount: 'Importo',
      },
      personMode: {
        owed: 'A carico di',
        paid: 'Ha pagato',
      },
      personModeHint: {
        owed: 'Quanto le è costato: di una cena divisa a metà conta la metà.',
        paid: 'Quanto ha anticipato: di una cena che ha pagato lei conta tutto.',
      },
      amountHint: 'Sulla cifra che risulta dal filtro persona, non sul prezzo pieno.',
      done: 'Fatto',
    },
    period: {
      last7: 'Ultimi 7 giorni',
      last30: 'Ultimi 30 giorni',
      thisMonth: 'Questo mese',
      lastMonth: 'Mese scorso',
      last12Months: 'Ultimi 12 mesi',
      thisYear: 'Quest’anno',
      custom: 'Personalizzato',
      onlyDay: 'Solo il {{day}}',
      fromTo: 'Dal {{opening}} al {{closing}}',
    },
    grid: {
      previousMonth: 'Mese precedente',
      nextMonth: 'Mese successivo',
      startHint: 'Tocca un giorno per cominciare un intervallo nuovo.',
      endHint: 'Dal {{day}}: tocca il giorno in cui finisce.',
    },
    /** Le frasi di `queryParts`/`describeQuery` (`@jutrack/core`), passate da `@/i18n/query`. */
    query: {
      categoriesCount: '{{count}} categorie',
      storesCount: '{{count}} negozi',
      tagsCount: '{{count}} tag',
      owedBy: 'A carico di {{who}}',
      paidBy: 'Pagate da {{who}}',
      amountFrom: 'Da {{amount}}',
      amountTo: 'Fino a {{amount}}',
      allExpenses: 'Tutte le spese',
      periodFrom: 'Dal {{date}}',
      periodTo: 'Fino al {{date}}',
    },
    change: {
      none: 'Nessuna spesa',
      zeroPrevious: 'Nulla speso in {{previous}}',
      same: 'Come in {{previous}}',
      up: '+{{delta}}% rispetto a {{previous}}',
      down: '{{delta}}% rispetto a {{previous}}',
    },
    budgetStatus: {
      over: '⚠️ Superato di {{amount}}',
      near: '⏳ Restano {{amount}}',
      under: '✓ Restano {{amount}}',
    },
    expenseCount: { one: '{{count}} spesa', other: '{{count}} spese' },
    categoryRemoved: 'Categoria rimossa',
    /** Il nome di una categoria che il documento non conosce, dentro un filtro salvato. */
    categoryFallback: 'categoria',
    categoryShareA11y: '{{name}}: {{amount}}, {{share}} del totale',
    histogramA11y: 'Da {{label}} {{symbol}}: {{count}}, {{amount}}',
    cumulativeSummary: 'Andamento cumulato: {{amount}} al {{label}}.',
    lineSummary: 'Da {{from}} a {{to}}. Massimo {{amount}}, {{peak}}.',
    /** Etichetta e importo, per i grafici in cui la struttura non cambia con la lingua. */
    pointA11y: '{{label}}: {{amount}}',
    treemapTapHint: 'Tocca un riquadro per leggerne nome e importo.',
    topListA11y: '{{name}}: {{amount}}, {{count}}',
    heatmap: {
      dayA11y: '{{day}}: {{amount}}',
      noExpense: 'nessuna spesa',
      scrollHint: 'Il periodo è lungo: trascina la griglia per vedere le altre settimane.',
      tapHint: 'Tocca un giorno per sapere quanto è costato.',
      legendNone: 'niente',
      legendFrom: 'da {{amount}} {{symbol}}',
    },
    memberComparison: {
      paidLabel: 'ha anticipato',
      owedLabel: 'a suo carico',
      paidA11y: '{{name}} ha anticipato {{amount}} {{period}}',
      owedA11y: 'A carico di {{name}}: {{amount}} {{period}}',
    },
    noGroupTitle: 'Nessun gruppo aperto',
    noGroupHint:
      'I grafici raccontano le spese di un gruppo. Aprine uno, o creane uno, e qui compariranno andamento, categorie e saldo.',
    noDataTitle: 'Ancora nessun dato',
    noDataHint:
      'Andamento, ripartizione per categoria e saldo tra di voi appariranno qui una volta registrate le prime spese.',
    emptyFilteredTitle: 'Nessuna spesa con questi filtri',
    emptyPeriodTitle: 'Nessuna spesa in {{period}}',
    emptyFilteredHint:
      'I filtri valgono per tutti i grafici insieme. Toglierne uno, o allargare il periodo, li fa ricomparire.',
    emptyPeriodHint: 'Scegli un periodo più largo, oppure registra una spesa in questi giorni.',
    tiles: {
      perDay: 'Al giorno',
      perDayHint: { one: 'su {{count}} giorno', other: 'su {{count}} giorni' },
      dailyTrend: 'Andamento giornaliero di {{period}}',
      expenses: 'Spese',
      recordedHint: { one: 'registrata', other: 'registrate' },
      perExpense: 'A spesa',
      average: 'in media',
    },
    monthsWholeNote: 'I mesi sono interi, anche quando il periodo scelto è più corto.',
    dailyOverlayLabel: 'Media dei {{days}} giorni precedenti',
    cumulativeReferenceLabel: 'Totale di {{period}}',
    weekdaysNote:
      'Sugli ultimi dodici mesi, non sul periodo scelto: su un mese solo sarebbero sette numeri a caso.',
    amountsNote:
      'L’altezza è il numero di spese, non la somma: dice se si fanno tanti scontrini piccoli o pochi grossi.',
    paidCenterLabel: 'Anticipato in {{period}}',
    balance: {
      evenBody: 'Siete pari. Nessuno deve niente a nessuno.',
      history: 'Storico',
      historyNote:
        'Su tutta la storia del gruppo, filtri esclusi: un debito non si azzera cambiando periodo.',
    },
    membersPeriodLabel: 'negli ultimi dodici mesi',
    storesNote:
      'Le spese senza negozio non compaiono: questa classifica somma meno del totale del periodo.',
    tagsNote:
      'Una spesa con due tag conta per intero in entrambi: qui la somma può superare il totale del periodo.',
    budgetSet: 'Imposta',
    budgetNoneSet:
      'Nessun limite impostato per {{month}}. Un budget serve a sapere a metà mese se si sta esagerando, non a fine mese.',
    footer: 'Calcolato su questo telefono',
  },
  dashboard: {
    title: 'Componi la dashboard',
    intro:
      'Scegli cosa mostrare nel tab Grafici e in che ordine. Vale solo per questo telefono: non cambia niente per le altre persone del gruppo.',
    allOff: 'Con tutti i widget spenti il tab Grafici resta vuoto.',
    visibleCount: {
      one: '{{count}} widget acceso su {{total}}.',
      other: '{{count}} widget accesi su {{total}}.',
    },
    resetOrder: 'Ripristina l’ordine di partenza',
    moveUp: 'Sposta {{title}} più in alto',
    moveDown: 'Sposta {{title}} più in basso',
    emptyTitle: 'Dashboard vuota',
    emptyHint: 'Hai spento tutti i widget. Riaccendine qualcuno da «{{action}}», in alto a destra.',
    widgetEmpty: 'In questo periodo non c’è niente da mostrare.',
    /** Il registro dei sedici widget: titolo e sottotitolo, letti da `dashboard/widgets.ts`. */
    widgets: {
      total: {
        title: 'Totale',
        subtitle: 'Quanto è stato speso nel periodo, e come cambia rispetto a prima',
      },
      tiles: {
        title: 'In sintesi',
        subtitle: 'Media al giorno, numero di spese, importo medio per spesa',
      },
      months: {
        title: 'Mese per mese',
        subtitle: 'Sei barre mensili. Toccarne una sposta il periodo su quel mese',
      },
      daily: {
        title: 'Giorno per giorno',
        subtitle: 'La curva delle spese quotidiane, con la media della settimana',
      },
      cumulative: {
        title: 'Quanto si è accumulato',
        subtitle: 'La somma dall’inizio del periodo, per sapere a metà mese se si sta esagerando',
      },
      heatmap: {
        title: 'Quando si è speso',
        subtitle: 'Una cella per giorno: dice le settimane fitte e i giorni vuoti',
      },
      year: {
        title: 'Dodici mesi',
        subtitle: 'L’andamento lungo, indipendente dal periodo scelto',
      },
      weekdays: {
        title: 'Giorni della settimana',
        subtitle: 'L’abitudine settimanale, sugli ultimi dodici mesi',
      },
      categories: {
        title: 'Dove sono finiti',
        subtitle: 'La ripartizione per categoria, a riquadri e a barre',
      },
      amounts: {
        title: 'Quante spese, per fascia',
        subtitle: 'Tanti scontrini piccoli o pochi grossi?',
      },
      paid: {
        title: 'Chi ha anticipato',
        subtitle: 'Quanto ha messo ciascuno, sul periodo scelto',
      },
      balance: {
        title: 'Fra di voi',
        subtitle: 'Chi deve quanto a chi, su tutta la storia del gruppo',
      },
      members: {
        title: 'Anticipato e a carico',
        subtitle: 'Le due grandezze a confronto, persona per persona',
      },
      stores: {
        title: 'Negozi',
        subtitle: 'La classifica dei posti in cui si è speso di più',
      },
      tags: {
        title: 'Tag',
        subtitle: 'La classifica delle etichette messe sulle spese',
      },
      budget: {
        title: 'Budget',
        subtitle: 'I limiti impostati per il mese, e quanto ne resta',
      },
    },
    needs: {
      members: 'Serve almeno un’altra persona nel gruppo.',
      store: 'Serve almeno una spesa con un negozio.',
      tags: 'Serve almeno una spesa con un tag.',
    },
  },
  backup: {
    title: {
      noGroup: 'Ripristina una chiave',
      withGroup: 'Backup di «{{name}}»',
    },
    keyUnreadable: 'La chiave di questo gruppo non è leggibile su questo dispositivo.',
    noRecoveryTitle: 'Non esiste un «password dimenticata»',
    noRecoveryBody:
      'I dati sono cifrati end-to-end: il server conserva blob che non sa leggere. Se perdi la chiave e non hai un backup, le spese non tornano — nessuno può recuperarle, noi compresi.',
    createTitle: 'Crea un backup',
    createBody:
      'La chiave di «{{name}}», in un file cifrato con la passphrase che scegli. Da solo non serve a niente, e nemmeno la passphrase da sola: servono entrambi. Ogni gruppo ha la sua chiave, quindi va salvato uno per uno.',
    passphrasePlaceholder: 'Passphrase',
    passphraseA11y: 'Passphrase per il backup',
    confirmPlaceholder: 'Ripeti la passphrase',
    confirmA11y: 'Conferma della passphrase',
    mismatch: 'Le due passphrase non coincidono.',
    encrypting: 'Cifratura…',
    createButton: 'Crea il backup',
    encryptHint:
      'La cifratura richiede qualche secondo: è voluto. Rende costoso provare le passphrase a tappeto su un file rubato.',
    clipboardAlert: {
      title: 'Backup negli appunti',
      body: 'Cifratura completata in {{elapsed}} s. Su questa build manca il modulo per salvare i file: il backup è negli appunti. Incollalo subito in un gestore di password — gli appunti non sono un posto dove lasciarlo.',
    },
    shareUnavailableBody: 'Il foglio di condivisione non è disponibile qui.',
    createdAlert: {
      title: 'Backup creato',
      body: 'Cifratura completata in {{elapsed}} s. Conserva il file dove conservi le password, e ricorda la passphrase: senza, il file non serve a niente.',
    },
    exportFailedTitle: 'Backup fallito',
    restoreTitle: 'Ripristina da un backup',
    restoreBody: 'Incolla il contenuto del file di backup, quello che comincia per JTBK1.',
    blobPlaceholder: 'JTBK1.…',
    blobA11y: 'Contenuto del backup',
    restorePassphrasePlaceholder: 'Passphrase del backup',
    restorePassphraseA11y: 'Passphrase del backup da ripristinare',
    verifying: 'Verifica…',
    restoreButton: 'Ripristina la chiave',
    alreadyPresent: {
      title: 'Gruppo già presente',
      body: '«{{name}}» è di nuovo il gruppo aperto.',
    },
    restoreConfirm: {
      title: 'Ripristinare questo gruppo?',
      body: 'Verrà aggiunto ai tuoi gruppi, senza toccare quelli che hai già. Le spese arriveranno col primo sync, se il gruppo è ancora sul relay.',
      confirm: 'Ripristina',
    },
    passphrase: {
      tooShort: 'Almeno {{min}} caratteri: ne mancano {{missing}}.',
      strong: 'Va bene. Scrivila da qualche parte: non c’è modo di recuperarla.',
      acceptable: 'Accettabile. Quattro parole slegate fra loro sarebbero meglio.',
      weak: 'Debole: una parola sola si indovina. Usane quattro senza legame fra loro.',
    },
  },
  importScreen: {
    title: 'Importa un export',
    emptyFile: 'Il file è valido ma non contiene alcun record: non c’è niente da importare.',
    failedTitle: 'Import fallito',
    introTitle: 'Ricostruisce i dati, non riapre il gruppo',
    intro: {
      before:
        'Il file JSON non contiene la chiave del vault — è in chiaro, e se la contenesse chiunque lo ricevesse entrerebbe nel gruppo. Quello che leggi qui diventa un gruppo',
      bold: 'nuovo',
      after:
        ', con una chiave nuova: non si sincronizza con i telefoni che avevano il gruppo di prima, e per tornare a condividerlo serve un invito.',
    },
    useBackupHint:
      'Se hai il backup della chiave, usa quello: è in «{{label}}» e rimette il gruppo dov’era, sincronizzazione compresa.',
    fileTitle: 'Il file',
    fileBody:
      'Incolla il contenuto dell’export JSON, quello che comincia con una graffa e contiene «jutrack-export».',
    filePlaceholder: '{ "format": "jutrack-export", …',
    fileA11y: 'Contenuto del file di export',
    pasteButton: 'Incolla dagli appunti',
    reading: 'Lettura…',
    readButton: 'Leggi il file',
    summaryTitle: 'Cosa c’è nel file',
    skipCount: {
      one: 'Un record non entrerà:',
      other: '{{count}} record non entreranno:',
    },
    groupNameLabel: 'Nome del gruppo',
    groupNameHint: 'Il file non lo contiene: questo è ricavato dalla data dell’export.',
    groupNameA11y: 'Nome del gruppo importato',
    importing: 'Import…',
    createGroupButton: 'Crea il gruppo',
    summary: {
      none: 'niente',
      defaultName: 'Gruppo importato',
      importedOn: 'Importato del {{day}}/{{month}}/{{year}}',
      expenses: { one: '{{count}} spesa', other: '{{count}} spese' },
      members: { one: '{{count}} persona', other: '{{count}} persone' },
      categories: { one: '{{count}} categoria', other: '{{count}} categorie' },
      budgets: { one: '{{count}} budget', other: '{{count}} budget' },
      settlements: { one: '{{count}} pareggio', other: '{{count}} pareggi' },
    },
  },
  wipe: {
    title: 'Azzera questo telefono',
    backupFirstTitle: 'Fai prima un backup della chiave',
    backupFirstSubtitle:
      'La chiave del gruppo aperto, cifrata con una passphrase che scegli tu. È l’unico modo di ritrovare queste spese dopo un azzeramento.',
    whatDisappearsTitle: 'Che cosa sparisce',
    whatDisappearsIntro: 'Da questo telefono, e senza possibilità di annullare:',
    bulletProfile:
      'il tuo profilo, «{{name}}», con il suo identificativo: quello che registrerai dopo sarà una persona diversa per chi divide le spese con te',
    bulletGroups: {
      one: 'il tuo gruppo, con tutte le sue spese, categorie, budget e pareggi',
      other: 'i tuoi {{count}} gruppi, con tutte le loro spese, categorie, budget e pareggi',
    },
    bulletKeys: 'le chiavi con cui quei dati sono cifrati',
    whatDisappearsFooter:
      'I dati sono cifrati end-to-end: senza la chiave non li può recuperare nessuno, noi compresi. Non esiste un reset lato server.',
    whatRemainsTitle: 'Che cosa invece resta',
    relayCopy: {
      before:
        'Le copie sul relay. Sono cifrate e illeggibili senza la chiave, e scadono da sole dopo trenta giorni. Se vuoi cancellarle subito, esci da ogni gruppo con l’interruttore',
      switchLabel: 'Cancella anche la copia sul relay',
      after: ' prima di azzerare.',
    },
    whatRemainsOthers:
      'E resta ciò che gli altri hanno già scaricato: azzerare il proprio telefono non toglie niente a nessun altro.',
    understandLabel: 'Ho capito che non si torna indietro',
    closingGroup: 'Chiusura del gruppo…',
    wiping: 'Azzeramento…',
    action: 'Azzera questo telefono',
    confirmTitle: 'Azzerare questo telefono?',
    confirmBody: {
      base: 'Spariscono il profilo «{{name}}»{{groupsClause}}. Senza un backup della chiave non tornano: non esiste un reset lato server.',
      oneGroup: ' e il tuo gruppo, con tutte le sue spese',
      manyGroups: ' e i tuoi {{count}} gruppi, con tutte le loro spese',
    },
    confirmButton: 'Azzera',
  },
  exportScreen: {
    title: 'Esporta i dati',
    failedTitle: 'Export fallito',
    clipboard: {
      title: 'Copiato negli appunti',
      body: 'Su questa build manca il modulo per salvare i file, quindi {{name}} è finito negli appunti. Incollalo dove preferisci — oppure aggiorna l’app per avere il foglio di condivisione.',
    },
    copyFailedTitle: 'Copia fallita',
    shareUnavailable: {
      title: 'Condivisione non disponibile',
      body: 'Questo dispositivo non offre il foglio di condivisione.',
    },
    csvTitle: 'Per leggerli altrove',
    csvBody:
      'Un foglio di calcolo: una riga per spesa, una colonna con la quota di ciascuno. Si apre in Excel, Fogli Google o qualunque altro strumento. Gli importi ci sono due volte, in euro e in centesimi interi: la seconda colonna è quella che nessun programma può interpretare male.',
    expensesCsvButton: 'Spese (CSV)',
    settlementsCsvButton: 'Pareggi (CSV)',
    csvSplitHint:
      'I pareggi stanno in un file a parte perché non sono spese: sommarli insieme darebbe un totale che non vuol dire niente.',
    jsonTitle: 'Per conservarli',
    jsonBody:
      'Copia integrale del vault in JSON: spese, categorie, persone, budget e pareggi, com’è in memoria. È il formato da tenere da parte — il CSV, per come è fatto, perde pezzi.',
    jsonButton: 'Tutto il vault (JSON)',
    unencryptedTitle: 'Questi file non sono cifrati',
    unencryptedBody1:
      'Escono in chiaro: chi li riceve legge le vostre spese. La cifratura end-to-end protegge i dati mentre passano dal relay, non dopo che li avete mandati a qualcun altro.',
    unencryptedBody2:
      'La chiave del vault non è dentro nessuno di questi file. Per quella c’è «{{label}}», ed è protetta da una passphrase.',
    noSharingNote:
      'Su questa build i moduli per scrivere e condividere file non sono disponibili: gli export finiranno negli appunti. Una build aggiornata dell’app risolve.',
  },
  budget: {
    title: 'Budget',
    prevMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
    copyPrevious: 'Copia i limiti di {{month}}',
    invalidLimitTitle: 'Limite non valido',
    invalidLimitBody: 'Inserisci un importo, oppure lascia vuoto per rimuoverlo.',
    noLimitPlaceholder: 'nessun limite',
    limitA11y: 'Limite mensile per {{name}}',
    spent: 'Spesi {{amount}}',
    spentOver: ' · superato di {{amount}}',
    spentUnder: ' · restano {{amount}}',
    footerNote:
      'I limiti valgono per {{month}} e sono condivisi con l’altro dispositivo. Lasciare vuoto un campo toglie il limite.',
  },
  categories: {
    title: 'Categorie',
    namePlaceholder: 'Nome della categoria',
    nameA11y: 'Nome della nuova categoria',
    addA11y: 'Aggiungi categoria',
    addButton: 'Aggiungi',
    archiveTitle: 'Archiviare «{{name}}»?',
    archiveBodyUnused: 'Non comparirà più fra le categorie selezionabili.',
    archiveBodyUsed: {
      one: '{{count}} spesa usa questa categoria. Restano invariate: la categoria sparisce solo dalle scelte future.',
      other:
        '{{count}} spese usano questa categoria. Restano invariate: la categoria sparisce solo dalle scelte future.',
    },
    archiveConfirm: 'Archivia',
    restore: 'Ripristina',
  },
  settle: {
    title: 'Pareggi',
    evenText: 'Siete pari: non c’è niente da saldare.',
    transferBefore: '{{from}} deve',
    transferAfter: 'a {{to}}',
    amountA11y: 'Importo del pareggio',
    paidButton: 'Ha pagato',
    invalidAmountTitle: 'Importo non valido',
    invalidAmountBody: 'Inserisci una cifra maggiore di zero.',
    tooMuchTitle: 'Più del dovuto',
    tooMuchBody:
      'Il debito è di {{debt}}. Registrando {{amount}} il saldo si rovescerebbe a favore di chi paga.',
    registerAnyway: 'Registra comunque',
    notRegisteredTitle: 'Non registrato',
    deleteTitle: 'Eliminare il pareggio?',
    deleteBody: '{{description}}. Il debito tornerà a comparire.',
    deleteConfirm: 'Elimina',
    historyTitle: 'Storico',
    historyEmpty: 'Nessun pareggio registrato finora.',
  },
  probe: {
    title: 'Diagnostica',
    noIssues: 'Nessun problema rilevato.',
    interrupted: 'INTERROTTA: {{detail}}',
    ok: 'OK',
    failed: 'FALLITO',
    available: 'disponibile',
    steps: {
      started: 'sonda avviata — React Native e Hermes funzionano',
      yjsImported: 'yjs importato',
      yDocCreated: 'Y.Doc creato (clientID {{clientId}}) — shim lib0/webcrypto OK',
      coreImported: '@jutrack/core importato (v{{version}})',
      randomBytes: 'expo-crypto: {{count}} byte casuali',
      keysDerived: 'chiavi derivate (vault {{vaultId}}…) — HKDF e UTF-8 OK',
      crypto: 'XChaCha20-Poly1305: cifratura e decifratura OK',
      dbOpened: 'database SQLite aperto',
      expenseSaved: 'spesa salvata su SQLite ({{count}} in elenco)',
      secureStore: 'SecureStore: {{result}}',
      relay: 'relay raggiungibile: HTTP {{status}}',
      pairing: 'invito di pairing costruito e riletto: {{result}}',
      qr: 'QR generato: griglia {{extent}}×{{extent}} moduli',
      camera: 'modulo fotocamera: {{result}}',
      notifications: 'notifiche locali: {{result}}',
      widgets: 'widget Android: {{result}}',
      allOk: 'TUTTO OK — ogni sottosistema funziona su questo dispositivo',
    },
    secureStoreOk: 'scrive e rilegge',
    secureStoreMismatch: 'RILETTURA DIVERSA',
    cameraUnavailable: 'NON disponibile (resta l’incolla manuale)',
    notifModuleMissing: 'modulo NON nella build — serve la build EAS dello Step 30',
    notifModuleAvailable: 'modulo disponibile, permesso {{status}}',
    permissionGranted: 'concesso',
    permissionDenied: 'non concesso',
    widgetsUnreachable: 'provider NON raggiungibili — serve la build EAS dello Step 30',
    widgetsOk: '{{count}} provider rispondono ({{placed}} sulla home)',
  },
  onboarding: {
    profile: {
      heading: 'Come ti chiami?',
      hint: 'Serve solo perché chi divide le spese con te ti riconosca. Resta sul tuo telefono e dentro i gruppi a cui partecipi: nessun account, nessuna email.',
      colorLabel: 'Il tuo colore',
      saving: 'Un attimo…',
      start: 'Comincia',
    },
    identity: {
      heading: 'Chi sei in questo gruppo?',
      hint: 'Se stai entrando adesso, sei una persona nuova. Se invece hai ripristinato la chiave su un telefono nuovo, qui dentro sei già qualcuno: dirlo evita di comparire due volte e di sballare il saldo.',
      chooseNew: 'Sono nuovo — entro come {{name}}',
      waiting: 'Sto ancora scaricando chi fa parte del gruppo…',
      noOthers: 'In questo gruppo non c’è ancora nessun altro.',
      orSameName: 'Oppure: ero già qui, con questo nome',
    },
  },
  pairing: {
    receivedTitle: 'Invito ricevuto',
    qrLabel: 'Codice QR di collegamento',
    join: {
      title: 'Invito',
      noInviteTitle: 'Nessun invito ricevuto',
      enteringTitle: 'Ingresso in corso…',
      noInviteHint:
        'Apri il link che ti hanno mandato, oppure incolla qui il codice dell’altro telefono.',
      receivedHint:
        'Conferma per aggiungere il gruppo a quelli che hai già. Nessuno dei tuoi gruppi viene toccato.',
      pasteOrScan: 'Incolla o scansiona un codice',
      backToGroups: 'Torna ai gruppi',
    },
    deepLink: {
      title: 'Collegamento',
      noCodeTitle: 'Nessun codice ricevuto',
      noCodeHint:
        'Apri lo scanner per inquadrare il codice mostrato dall’altro telefono, o mostra il tuo per farlo entrare in questo vault.',
      receivedHint: 'Conferma per collegare questo telefono al vault indicato dal codice.',
      scan: 'Scansiona un codice',
      showMyCode: 'Mostra il mio codice',
    },
    invite: {
      guardTitle: 'Invita qualcuno',
      requiredWhat: 'Un invito',
      title: 'Invita in «{{name}}»',
      keyUnreadable: 'La chiave di questo gruppo non è leggibile su questo dispositivo.',
      shareMessage: 'Entra in «{{name}}» su JuTrack:\n{{url}}',
      explainHeading: 'Cosa stai per mandare',
      explainIntro: 'La chiave di questo gruppo.',
      explainWarning: 'Chiunque apra il link entra',
      explainRest:
        ': mandalo alla persona giusta e a nessun altro. Se viene inoltrato, anche chi lo riceve di rimbalzo legge tutte le spese del gruppo, adesso e in futuro.',
      linkPersists:
        'Il link resta nella conversazione in cui l’hai mandato. Dopo {{minutes}} minuti smette di essere accettato, ma la chiave che contiene no: se hai sbagliato destinatario, l’unico rimedio è uscire dal gruppo e rifarlo.',
      scopeNote:
        'Vale solo per «{{name}}»: gli altri tuoi gruppi non c’entrano e restano inaccessibili a chi lo riceve. Il relay non lo legge — la chiave sta nella parte dell’indirizzo che i browser non inviano ai server.',
      preparing: 'Preparazione…',
      understood: 'Ho capito, prepara l’invito',
      expiredTitle: 'Invito scaduto',
      expiredRegenerate: 'Prepara un nuovo invito',
      sendLinkHeading: 'Manda il link',
      linkValidFor:
        'Chi lo apre trova un bottone che apre JuTrack sul suo telefono. Valido ancora {{remaining}}.',
      shareLink: 'Condividi il link',
      copyLink: 'Copia il link',
      linkCopied: 'Link copiato',
      scanHeading: 'Oppure inquadra un codice',
      showQrHint:
        'Se avete i due telefoni davanti, il QR evita di far passare la chiave da una chat. Sull’altro: Gruppi → Entra in un gruppo → Scansiona un codice.',
      showQr: 'Mostra il codice QR',
      regenerate: 'Rigenera l’invito',
    },
    scan: {
      title: 'Entra in un gruppo',
      activating: 'Attivazione fotocamera…',
      cameraUnavailable: 'Fotocamera non disponibile',
      permission: {
        unknown: 'Sto chiedendo il permesso di usare la fotocamera.',
        denied:
          'Permesso negato. Puoi concederlo dalle impostazioni di sistema, oppure incollare il codice qui sotto.',
        unavailable:
          'Questa build non espone la fotocamera. Il collegamento funziona comunque incollando il codice qui sotto.',
      },
      pasteHeading: 'Oppure incolla l’invito',
      pasteHintIntro:
        'Va bene sia il link che ti hanno mandato in chat, sia un indirizzo che comincia con',
      /** Lo schema dell'URI di pairing: uguale in ogni lingua, non è una frase da tradurre. */
      schemePrefix: 'jutrack://',
      pasteHintRest:
        '. Contiene la chiave del gruppo in chiaro: dopo averlo usato, non lasciarlo in giro.',
      /** La forma di un link di invito, non una frase: resta uguale in ogni lingua. */
      placeholder: 'https://…/j#v=1&k=…',
      linkLabel: 'Codice di collegamento',
      paste: 'Incolla',
      connecting: 'Collegamento…',
      connect: 'Collega',
    },
    confirm: {
      unnamedGroup: 'Gruppo condiviso',
      joinedTitle: 'Sei nel gruppo',
      joinedBody:
        'Le spese di questo telefono e quelle dell’altro si uniscono qui. Comparirai fra le persone del gruppo con il tuo nome.',
      confirmTitleGeneric: 'Entrare in questo gruppo?',
      confirmTitleNamed: 'Entrare in «{{name}}»?',
      confirmBody:
        'Verrà aggiunto ai tuoi gruppi, senza toccare quelli che hai già. Le spese sono cifrate end-to-end: chi ha questa chiave le legge, e nessun altro.',
      enter: 'Entra',
    },
  },
};

/**
 * La forma che ogni lingua deve avere, presa dall'italiano.
 *
 * È il modo più economico di rendere la parità delle chiavi un errore di compilazione invece
 * che una svista che si scopre a schermo: `en.ts` si dichiara di questo tipo, e TypeScript
 * rifiuta sia le chiavi mancanti sia quelle di troppo. Quello che il tipo **non** vede — una
 * traduzione che perde un `{{segnaposto}}` — lo verifica `dictionaries.test.ts`.
 */
export type Dictionary = typeof it;
