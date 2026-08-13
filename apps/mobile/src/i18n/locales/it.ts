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
 * del sync, saldo, divisione, sottotitoli dell'elenco. Restano allo Step 39 i grafici, la
 * dashboard, l'onboarding, il pairing, il backup/export e l'azzeramento.
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
      probe: 'Diagnostica',
      wipe: 'Azzera questo telefono',
      idLabel: 'Il tuo identificativo',
      idBody:
        'È così che gli altri telefoni ti riconoscono dentro un gruppo. È un numero casuale, generato una volta su questo telefono: non è un account, non c’è niente a cui accedere, e da solo non dice nulla di te. Serve solo se qualcosa va storto e vuoi dire di quale persona stiamo parlando.\n\n{{id}}',
      version: 'JuTrack {{app}} · core {{core}}',
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
