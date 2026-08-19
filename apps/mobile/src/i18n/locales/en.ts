import type { Dictionary } from './it';

/**
 * L'inglese, tipizzato sulla forma dell'italiano.
 *
 * `: Dictionary` non è decorazione: è la sola cosa che impedisce alle due lingue di
 * divergere in silenzio. Una chiave aggiunta in `it.ts` e dimenticata qui è un errore di
 * `tsc`, non una schermata che un giorno mostra `you.alerts.title` a qualcuno.
 *
 * **Le frasi sono tradotte, non ricalcate.** Dove l'italiano dice «Sincronizza» l'inglese dice
 * «Sync now», perché il verbo inglese senza complemento si legge come un'etichetta e non come
 * un comando; dove l'italiano nomina «il relay», l'inglese lo nomina uguale, perché è il nome
 * della cosa e non una parola italiana.
 *
 * **Le date cambiano ordine, non solo parole.** `date.dayTitle` qui è
 * `{{weekday}}, {{month}} {{day}}` — «Monday, August 1» — contro il
 * `{{weekday}} {{day}} {{month}}` italiano. È la ragione per cui quei modelli stanno nel
 * dizionario e non nel codice.
 *
 * **I numeri non sono più italiani da questo dizionario in giù**, dallo Step 39:
 * `formatCents`/`formatMoney` di `@/i18n/money` scrivono «1,234.56» qui e «1.234,56» in
 * italiano, leggendo il formato dalla lingua corrente. Il core non lo sa fare da sé — non
 * importa `i18next`, per la regola dello Step 0 — e lo riceve come parametro.
 */
export const en: Dictionary = {
  common: {
    close: 'Close',
    cancel: 'Cancel',
    someone: 'someone',
  },
  date: {
    today: 'Today',
    yesterday: 'Yesterday',
    dayTitle: '{{weekday}}, {{month}} {{day}}',
    dayTitleOtherYear: '{{month}} {{day}}, {{year}}',
    dayShort: '{{month}} {{day}}',
    dayShortOtherYear: '{{month}} {{day}}, {{year}}',
    monthYear: '{{month}} {{year}}',
    weekdays: {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    },
    months: {
      1: 'January',
      2: 'February',
      3: 'March',
      4: 'April',
      5: 'May',
      6: 'June',
      7: 'July',
      8: 'August',
      9: 'September',
      10: 'October',
      11: 'November',
      12: 'December',
    },
  },
  sync: {
    idle: 'Waiting',
    syncing: 'Syncing…',
    syncedAt: 'Updated {{when}}',
    offline: 'Offline — your changes stay queued',
    error: 'Not synced: {{message}}',
    blocked: 'Sync stopped: the relay rejects the key',
    now: 'just now',
    secondsAgo: { one: '{{count}} second ago', other: '{{count}} seconds ago' },
    minutesAgo: { one: '{{count}} minute ago', other: '{{count}} minutes ago' },
    hoursAgo: { one: '{{count}} hour ago', other: '{{count}} hours ago' },
  },
  tabs: {
    groups: 'Groups',
    charts: 'Charts',
    you: 'You',
  },
  groups: {
    title: 'Your groups',
    emptyIntro:
      'A group is where the expenses you split end up, along with the people who split them. You can create one now, join someone else’s with an invite, or restore a key you had put aside.',
    newGroup: 'New group',
    joinInvite: 'Join with an invite',
    restoreIntro:
      'If you saved a group’s key and its passphrase, the group comes back here. The expenses arrive with the first sync, if it is still on the relay.',
    restore: 'Restore a key',
    importExport: 'Import a JSON export',
    openNow: 'Open now',
    vaultShort: 'vault {{id}}',
    noExpenses: 'no expenses',
    expenseCount: { one: '{{count}} expense', other: '{{count}} expenses' },
    subtitle: '{{state}} · {{count}} · {{total}} this month',
    new: {
      title: 'New group',
      body: 'It starts empty and yours alone. It becomes shared when you invite someone from the group itself.',
      placeholder: 'Home, Trip, Flatmates…',
      nameLabel: 'Group name',
      create: 'Create',
      creating: 'Creating…',
      failed: 'Could not create the group',
    },
    required: {
      title: 'You need a group',
      hint: '{{what}} is about a group, and you don’t have one open yet. Create one, or join with an invite you’ve received.',
      defaultWhat: 'This screen',
    },
  },
  home: {
    groupLabel: 'Group {{name}}',
    groupHint: 'Opens the list of groups to switch',
    settings: 'Group settings',
    composition: 'Breakdown of this month’s spending by category',
    settle: 'Settle up',
    emptyTitle: 'No expenses',
    emptyBody: 'Tap “{{action}}” at the bottom right to add the first one.',
    fab: 'Expense',
    fabLabel: 'Add an expense',
    balance: {
      creditOne: '{{name}} owes you {{amount}}',
      creditMany: '{{count}} people owe you {{amount}}',
      debtOne: 'You owe {{amount}} to {{name}}',
      debtMany: 'You owe {{amount}} to {{count}} people',
      even: 'You are even',
    },
  },
  expense: {
    newTitle: 'New expense',
    submitNew: 'Save the expense',
    editTitle: 'Edit expense',
    submitEdit: 'Save changes',
    notFoundTitle: 'Expense',
    notFoundHeading: 'Expense not found',
    notFoundHint: 'It may have been deleted from the other device.',
    deleteAction: 'Delete expense',
    deleteTitle: 'Delete this expense?',
    deleteBody: 'This applies to the other device too.',
    deleteConfirm: 'Delete',
    amount: 'Amount',
    amountPlaceholder: '0.00',
    amountLabel: 'Expense amount',
    amountError: 'Enter an amount greater than zero',
    whoAndHow: 'Who pays and how it splits',
    paidBy: '{{name}} paid',
    me: 'You',
    shareOf: 'Share owed by {{name}}',
    split: {
      equalTwo: 'Half and half',
      equalMany: 'Split evenly',
      custom: 'Shares',
      single: 'Payer only',
    },
    singleHint: 'Entirely on whoever paid',
    preview: {
      none: 'Split evenly',
      each: '{{amount}} each',
      range: '{{min}} / {{max}} each',
    },
    gap: {
      noAmount: 'Enter the expense amount first',
      exact: 'The shares cover the total exactly',
      missing: '{{amount}} missing',
      excess: '{{amount}} too much',
    },
    category: 'Category',
    date: 'Date',
    note: 'Note',
    noteOptional: 'Optional',
    notePlaceholder: 'For example: groceries',
    noteLabel: 'Expense note',
    noteAdd: 'Add a note',
    noteRead: 'Note: {{note}}',
    extra: {
      title: 'Additional details',
      optional: 'Optional',
      tagCount: { one: '{{count}} tag', other: '{{count}} tags' },
      store: 'Store',
      storePlaceholder: 'Where it happened',
      tags: 'Tags',
      tagPlaceholder: 'Add a tag',
    },
    row: {
      uncategorized: 'Uncategorised',
      share: '{{amount}} for you',
    },
  },
  widget: {
    unknownBalance: 'Open the app to see the balance',
    unknownMonth: 'Open the app to see the total',
    alone: 'Only you in this group',
    creditOne: '{{name}} owes you',
    creditMany: '{{count}} people owe you',
    debtOne: 'You owe {{name}}',
    debtMany: 'You owe {{count}} people',
    even: 'You are even',
    monthCaption: 'Spent in {{month}}',
  },
  you: {
    name: {
      label: 'Your name',
      edit: 'Change name',
      hint: 'The same name in all your groups',
    },
    language: {
      title: 'Language',
      hint: 'Applies to this phone only. The names you type — groups, categories, expenses — stay as you wrote them: those are group data, not app text.',
    },
    currency: {
      title: 'Currency',
      hint: 'Applies to this phone only, and to the expenses you add from here. JuTrack does not convert between currencies: within a group it is best to pick just one.',
    },
    alerts: {
      title: 'Alerts',
      reminderTitle: 'Expense reminder',
      reminderHint: 'If {{days}} days go by without you adding an expense',
      budgetTitle: 'Monthly budget',
      budgetHint: 'When a category reaches {{percent}}% of its limit, and when it goes over',
      syncTitle: 'Sync stalled',
      syncHint:
        'If your expenses do not reach the other phones for more than {{hours}} hours, or if the relay rejects the key',
      backupTitle: 'Key not saved',
      backupHint:
        'Once per group, if it grows past {{count}} expenses without you ever saving its key',
      scope:
        'Budget and sync alerts are about the open group, and they arrive while the app is in use.',
      blocked: 'Android is blocking JuTrack notifications: turn them back on in system settings.',
      deniedTitle: 'Permission denied',
      deniedBody:
        'Android will not let JuTrack send notifications. You can change that in system settings, under the app’s Notifications entry.',
      unavailableTitle: 'Not available in this version',
      unavailableBody:
        'Notifications arrive with a newer version of the app. Everything else works as before.',
    },
    sync: {
      title: 'Sync',
      action: 'Sync now',
      privacy: 'End-to-end encrypted · the relay reads nothing',
    },
    group: {
      title: 'The open group',
      manage: 'people and invite',
      categories: 'Categories and budgets',
      backup: 'Key backup',
      export: 'Export your data',
    },
    device: {
      title: 'This phone',
      importExport: 'Import a JSON export',
      probe: 'Diagnostics',
      wipe: 'Reset this phone',
      idLabel: 'Your identifier',
      idBody:
        'This is how the other phones recognise you inside a group. It is a random number, generated once on this phone: it is not an account, there is nothing to sign in to, and on its own it says nothing about you. It only matters if something goes wrong and you need to say which person we are talking about.\n\n{{id}}',
      version: 'JuTrack {{app}} · core {{core}}',
    },
  },
  stats: {
    filters: {
      periodA11y: 'Period: {{label}}. Tap to change the filters',
      activeA11y: 'Active filter: {{part}}. Tap to change it',
      resetA11y: 'Reset the filters',
      reset: 'Reset',
      open: 'Filters',
      sections: {
        period: 'Period',
        person: 'Person',
        category: 'Category',
        store: 'Store',
        tag: 'Tag',
        amount: 'Amount',
      },
      personMode: {
        owed: 'Owed by',
        paid: 'Paid by',
      },
      personModeHint: {
        owed: 'What it cost them: a dinner split in half counts as half.',
        paid: 'What they fronted: a dinner they paid for counts in full.',
      },
      amountHint: 'On the figure the person filter produces, not the full price.',
      done: 'Done',
    },
    period: {
      last7: 'Last 7 days',
      last30: 'Last 30 days',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      last12Months: 'Last 12 months',
      thisYear: 'This year',
      custom: 'Custom',
      onlyDay: 'Just {{day}}',
      fromTo: 'From {{opening}} to {{closing}}',
    },
    grid: {
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      startHint: 'Tap a day to start a new range.',
      endHint: 'From {{day}}: tap the day it ends.',
    },
    query: {
      categoriesCount: '{{count}} categories',
      storesCount: '{{count}} stores',
      tagsCount: '{{count}} tags',
      owedBy: 'Owed by {{who}}',
      paidBy: 'Paid by {{who}}',
      amountFrom: 'From {{amount}}',
      amountTo: 'Up to {{amount}}',
      allExpenses: 'All expenses',
      periodFrom: 'From {{date}}',
      periodTo: 'Up to {{date}}',
    },
    change: {
      none: 'No expenses',
      zeroPrevious: 'Nothing spent in {{previous}}',
      same: 'Same as {{previous}}',
      up: '+{{delta}}% compared to {{previous}}',
      down: '{{delta}}% compared to {{previous}}',
    },
    budgetStatus: {
      over: '⚠️ Over by {{amount}}',
      near: '⏳ {{amount}} left',
      under: '✓ {{amount}} left',
    },
    expenseCount: { one: '{{count}} expense', other: '{{count}} expenses' },
    categoryRemoved: 'Removed category',
    categoryFallback: 'category',
    categoryShareA11y: '{{name}}: {{amount}}, {{share}} of the total',
    histogramA11y: 'From {{label}} {{symbol}}: {{count}}, {{amount}}',
    cumulativeSummary: 'Cumulative total: {{amount}} as of {{label}}.',
    lineSummary: 'From {{from}} to {{to}}. Peak {{amount}}, {{peak}}.',
    pointA11y: '{{label}}: {{amount}}',
    treemapTapHint: 'Tap a tile to read its name and amount.',
    topListA11y: '{{name}}: {{amount}}, {{count}}',
    heatmap: {
      dayA11y: '{{day}}: {{amount}}',
      noExpense: 'no expenses',
      scrollHint: 'The period is long: drag the grid to see the other weeks.',
      tapHint: 'Tap a day to see what it cost.',
      legendNone: 'nothing',
      legendFrom: 'from {{amount}} {{symbol}}',
    },
    memberComparison: {
      paidLabel: 'fronted',
      owedLabel: 'owed by them',
      paidA11y: '{{name}} fronted {{amount}} {{period}}',
      owedA11y: 'Owed by {{name}}: {{amount}} {{period}}',
    },
    noGroupTitle: 'No group open',
    noGroupHint:
      'Charts tell the story of a group’s expenses. Open one, or create one, and the trend, categories and balance will show up here.',
    noDataTitle: 'No data yet',
    noDataHint:
      'The trend, the breakdown by category, and the balance between you will show up here once the first expenses are recorded.',
    emptyFilteredTitle: 'No expenses match these filters',
    emptyPeriodTitle: 'No expenses in {{period}}',
    emptyFilteredHint:
      'The filters apply to every chart together. Remove one, or widen the period, and they reappear.',
    emptyPeriodHint: 'Pick a wider period, or record an expense on these days.',
    tiles: {
      perDay: 'Per day',
      perDayHint: { one: 'over {{count}} day', other: 'over {{count}} days' },
      dailyTrend: 'Daily trend for {{period}}',
      expenses: 'Expenses',
      recordedHint: { one: 'recorded', other: 'recorded' },
      perExpense: 'Per expense',
      average: 'on average',
    },
    monthsWholeNote: 'Months are shown whole, even when the chosen period is shorter.',
    dailyOverlayLabel: '{{days}}-day moving average',
    cumulativeReferenceLabel: 'Total for {{period}}',
    weekdaysNote:
      'Over the last twelve months, not the chosen period: a single month would be seven random numbers.',
    amountsNote:
      'The height is the number of expenses, not their sum: it shows whether you make many small purchases or a few big ones.',
    paidCenterLabel: 'Fronted in {{period}}',
    balance: {
      evenBody: 'You’re even. Nobody owes anybody anything.',
      history: 'History',
      historyNote:
        'Across the group’s whole history, filters aside: a debt doesn’t reset when you change the period.',
    },
    membersPeriodLabel: 'over the last twelve months',
    storesNote:
      'Expenses without a store don’t appear: this ranking adds up to less than the period’s total.',
    tagsNote:
      'An expense with two tags counts in full in both: this sum can add up to more than the period’s total.',
    budgetSet: 'Set',
    budgetNoneSet:
      'No limit set for {{month}}. A budget is for knowing halfway through the month if you’re overdoing it, not at the end.',
    footer: 'Calculated on this phone',
  },
  dashboard: {
    title: 'Build the dashboard',
    intro:
      'Choose what to show in the Charts tab and in what order. This applies to this phone only: it changes nothing for the other people in the group.',
    allOff: 'With every widget off, the Charts tab stays empty.',
    visibleCount: {
      one: '{{count}} widget on out of {{total}}.',
      other: '{{count}} widgets on out of {{total}}.',
    },
    resetOrder: 'Reset to the starting order',
    moveUp: 'Move {{title}} up',
    moveDown: 'Move {{title}} down',
    emptyTitle: 'Empty dashboard',
    emptyHint:
      'You’ve turned off every widget. Turn one back on from “{{action}}”, at the top right.',
    widgetEmpty: 'Nothing to show in this period.',
    widgets: {
      total: {
        title: 'Total',
        subtitle: 'How much was spent in the period, and how it compares to before',
      },
      tiles: {
        title: 'At a glance',
        subtitle: 'Average per day, number of expenses, average amount per expense',
      },
      months: {
        title: 'Month by month',
        subtitle: 'Six monthly bars. Tapping one moves the period to that month',
      },
      daily: {
        title: 'Day by day',
        subtitle: 'The curve of daily expenses, with the weekly average',
      },
      cumulative: {
        title: 'How it’s adding up',
        subtitle:
          'The running total since the start of the period, to know halfway through if you’re overdoing it',
      },
      heatmap: {
        title: 'When you spent',
        subtitle: 'One cell per day: shows the busy weeks and the empty days',
      },
      year: {
        title: 'Twelve months',
        subtitle: 'The long-run trend, independent of the chosen period',
      },
      weekdays: {
        title: 'Days of the week',
        subtitle: 'The weekly pattern, over the last twelve months',
      },
      categories: {
        title: 'Where it went',
        subtitle: 'The breakdown by category, as tiles and as bars',
      },
      amounts: {
        title: 'How many expenses, by range',
        subtitle: 'Many small purchases, or a few big ones?',
      },
      paid: {
        title: 'Who fronted it',
        subtitle: 'How much each person put in, over the chosen period',
      },
      balance: {
        title: 'Between you',
        subtitle: 'Who owes what to whom, across the group’s whole history',
      },
      members: {
        title: 'Fronted vs. owed',
        subtitle: 'The two figures compared, person by person',
      },
      stores: {
        title: 'Stores',
        subtitle: 'The ranking of the places you spent the most',
      },
      tags: {
        title: 'Tags',
        subtitle: 'The ranking of the labels put on expenses',
      },
      budget: {
        title: 'Budget',
        subtitle: 'The limits set for the month, and how much is left',
      },
    },
    needs: {
      members: 'Needs at least one more person in the group.',
      store: 'Needs at least one expense with a store.',
      tags: 'Needs at least one expense with a tag.',
    },
  },
  backup: {
    title: {
      noGroup: 'Restore a key',
      withGroup: 'Backup of “{{name}}”',
    },
    keyUnreadable: 'This group’s key cannot be read on this device.',
    noRecoveryTitle: 'There is no “forgot password”',
    noRecoveryBody:
      'Your data is end-to-end encrypted: the server keeps blobs it cannot read. If you lose the key and have no backup, the expenses do not come back — nobody can recover them, us included.',
    createTitle: 'Create a backup',
    createBody:
      '“{{name}}”’s key, in a file encrypted with the passphrase you choose. Neither the file nor the passphrase is any use alone: you need both. Each group has its own key, so it has to be saved one at a time.',
    passphrasePlaceholder: 'Passphrase',
    passphraseA11y: 'Backup passphrase',
    confirmPlaceholder: 'Repeat the passphrase',
    confirmA11y: 'Passphrase confirmation',
    mismatch: 'The two passphrases do not match.',
    encrypting: 'Encrypting…',
    createButton: 'Create the backup',
    encryptHint:
      'Encryption takes a few seconds on purpose: it makes brute-forcing passphrases against a stolen file expensive.',
    clipboardAlert: {
      title: 'Backup copied to clipboard',
      body: 'Encryption finished in {{elapsed}} s. This build is missing the module for saving files, so the backup went to the clipboard. Paste it into a password manager right away — the clipboard is not a place to leave it.',
    },
    shareUnavailableBody: 'The share sheet is not available here.',
    createdAlert: {
      title: 'Backup created',
      body: 'Encryption finished in {{elapsed}} s. Keep the file wherever you keep your passwords, and remember the passphrase: without it, the file is useless.',
    },
    exportFailedTitle: 'Backup failed',
    restoreTitle: 'Restore from a backup',
    restoreBody: 'Paste the contents of the backup file, the one that starts with JTBK1.',
    blobPlaceholder: 'JTBK1.…',
    blobA11y: 'Backup contents',
    restorePassphrasePlaceholder: 'Backup passphrase',
    restorePassphraseA11y: 'Passphrase of the backup to restore',
    verifying: 'Checking…',
    restoreButton: 'Restore the key',
    alreadyPresent: {
      title: 'Group already present',
      body: '“{{name}}” is the open group again.',
    },
    restoreConfirm: {
      title: 'Restore this group?',
      body: 'It will be added to your groups, without touching the ones you already have. The expenses will arrive with the first sync, if the group is still on the relay.',
      confirm: 'Restore',
    },
    passphrase: {
      tooShort: 'At least {{min}} characters: {{missing}} still needed.',
      strong: 'Good. Write it down somewhere: there is no way to recover it.',
      acceptable: 'Acceptable. Four unrelated words would be better.',
      weak: 'Weak: a single word is easy to guess. Use four with no connection to each other.',
    },
  },
  importScreen: {
    title: 'Import an export',
    emptyFile: 'The file is valid but contains no records: there is nothing to import.',
    failedTitle: 'Import failed',
    introTitle: 'Rebuilds the data, does not reopen the group',
    intro: {
      before:
        'The JSON file does not contain the vault’s key — it is in plain text, and if it did, whoever received it would join the group. What you read here becomes a',
      bold: 'new',
      after:
        ' group, with a new key: it does not sync with the phones that had the earlier group, and sharing it again needs an invite.',
    },
    useBackupHint:
      'If you have the key backup, use that instead: it is under “{{label}}” and puts the group back where it was, sync included.',
    fileTitle: 'The file',
    fileBody:
      'Paste the contents of the JSON export, the one that starts with a curly brace and contains “jutrack-export”.',
    filePlaceholder: '{ "format": "jutrack-export", …',
    fileA11y: 'Contents of the export file',
    pasteButton: 'Paste from clipboard',
    reading: 'Reading…',
    readButton: 'Read the file',
    summaryTitle: 'What’s in the file',
    skipCount: {
      one: 'One record will not be included:',
      other: '{{count}} records will not be included:',
    },
    groupNameLabel: 'Group name',
    groupNameHint: 'The file does not contain it: this comes from the export’s date.',
    groupNameA11y: 'Name of the imported group',
    importing: 'Importing…',
    createGroupButton: 'Create the group',
    summary: {
      none: 'nothing',
      defaultName: 'Imported group',
      importedOn: 'Imported on {{month}}/{{day}}/{{year}}',
      expenses: { one: '{{count}} expense', other: '{{count}} expenses' },
      members: { one: '{{count}} person', other: '{{count}} people' },
      categories: { one: '{{count}} category', other: '{{count}} categories' },
      budgets: { one: '{{count}} budget', other: '{{count}} budgets' },
      settlements: { one: '{{count}} settlement', other: '{{count}} settlements' },
    },
  },
  wipe: {
    title: 'Reset this phone',
    backupFirstTitle: 'Back up the key first',
    backupFirstSubtitle:
      'The open group’s key, encrypted with a passphrase you choose. It is the only way to get these expenses back after a reset.',
    whatDisappearsTitle: 'What disappears',
    whatDisappearsIntro: 'From this phone, with no way to undo it:',
    bulletProfile:
      'your profile, “{{name}}”, with its identifier: whoever you register afterwards will look like a different person to the people you split expenses with',
    bulletGroups: {
      one: 'your group, with all its expenses, categories, budgets and settlements',
      other: 'your {{count}} groups, with all their expenses, categories, budgets and settlements',
    },
    bulletKeys: 'the keys that encrypt that data',
    whatDisappearsFooter:
      'Your data is end-to-end encrypted: without the key nobody can recover it, us included. There is no reset on the server.',
    whatRemainsTitle: 'What stays instead',
    relayCopy: {
      before:
        'The copies on the relay. They are encrypted and unreadable without the key, and they expire on their own after thirty days. If you want them gone right away, leave every group with the',
      switchLabel: 'Also delete the relay copy',
      after: ' switch before you reset.',
    },
    whatRemainsOthers:
      'And what other people have already downloaded stays put: resetting your own phone takes nothing away from anyone else.',
    understandLabel: 'I understand there is no going back',
    closingGroup: 'Closing the group…',
    wiping: 'Resetting…',
    action: 'Reset this phone',
    confirmTitle: 'Reset this phone?',
    confirmBody: {
      base: 'This deletes the profile “{{name}}”{{groupsClause}}. Without a key backup they will not come back: there is no reset on the server.',
      oneGroup: ' and your group, with all its expenses',
      manyGroups: ' and your {{count}} groups, with all their expenses',
    },
    confirmButton: 'Reset',
  },
  exportScreen: {
    title: 'Export your data',
    failedTitle: 'Export failed',
    clipboard: {
      title: 'Copied to clipboard',
      body: 'This build is missing the module for saving files, so {{name}} went to the clipboard instead. Paste it wherever you like — or update the app to get the share sheet.',
    },
    copyFailedTitle: 'Copy failed',
    shareUnavailable: {
      title: 'Sharing not available',
      body: 'This device does not offer the share sheet.',
    },
    csvTitle: 'To read them elsewhere',
    csvBody:
      'A spreadsheet: one row per expense, one column with each person’s share. It opens in Excel, Google Sheets, or any other tool. The amounts appear twice, in euros and in whole cents: the second column is the one no program can misread.',
    expensesCsvButton: 'Expenses (CSV)',
    settlementsCsvButton: 'Settlements (CSV)',
    csvSplitHint:
      'Settlements sit in a separate file because they are not expenses: adding them together would give a total that means nothing.',
    jsonTitle: 'To keep them',
    jsonBody:
      'A full copy of the vault in JSON: expenses, categories, people, budgets and settlements, as they are in memory. It is the format to keep on hand — the CSV, by its nature, loses pieces.',
    jsonButton: 'The whole vault (JSON)',
    unencryptedTitle: 'These files are not encrypted',
    unencryptedBody1:
      'They come out in plain text: whoever receives them can read your expenses. End-to-end encryption protects the data while it travels through the relay, not after you have sent it to someone else.',
    unencryptedBody2:
      'The vault’s key is not inside any of these files. For that there is “{{label}}”, protected by a passphrase.',
    noSharingNote:
      'On this build the modules for writing and sharing files are not available: exports will go to the clipboard. An updated build of the app fixes this.',
  },
  budget: {
    title: 'Budget',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    copyPrevious: 'Copy the limits from {{month}}',
    invalidLimitTitle: 'Invalid limit',
    invalidLimitBody: 'Enter an amount, or leave it empty to remove it.',
    noLimitPlaceholder: 'no limit',
    limitA11y: 'Monthly limit for {{name}}',
    spent: 'Spent {{amount}}',
    spentOver: ' · over by {{amount}}',
    spentUnder: ' · {{amount}} left',
    footerNote:
      'The limits apply to {{month}} and are shared with the other device. Leaving a field empty removes the limit.',
  },
  categories: {
    title: 'Categories',
    namePlaceholder: 'Category name',
    nameA11y: 'Name of the new category',
    addA11y: 'Add category',
    addButton: 'Add',
    archiveTitle: 'Archive “{{name}}”?',
    archiveBodyUnused: 'It will no longer appear among the selectable categories.',
    archiveBodyUsed: {
      one: '{{count}} expense uses this category. It stays unchanged: the category only disappears from future choices.',
      other:
        '{{count}} expenses use this category. They stay unchanged: the category only disappears from future choices.',
    },
    archiveConfirm: 'Archive',
    restore: 'Restore',
  },
  settle: {
    title: 'Settlements',
    evenText: 'You are even: there is nothing to settle.',
    transferBefore: '{{from}} owes',
    transferAfter: 'to {{to}}',
    amountA11y: 'Settlement amount',
    paidButton: 'Paid',
    invalidAmountTitle: 'Invalid amount',
    invalidAmountBody: 'Enter a figure greater than zero.',
    tooMuchTitle: 'More than owed',
    tooMuchBody:
      'The debt is {{debt}}. Recording {{amount}} would flip the balance in favor of whoever is paying.',
    registerAnyway: 'Record anyway',
    notRegisteredTitle: 'Not recorded',
    deleteTitle: 'Delete this settlement?',
    deleteBody: '{{description}}. The debt will show up again.',
    deleteConfirm: 'Delete',
    historyTitle: 'History',
    historyEmpty: 'No settlements recorded yet.',
  },
  probe: {
    title: 'Diagnostics',
    noIssues: 'No problems found.',
    interrupted: 'INTERRUPTED: {{detail}}',
    ok: 'OK',
    failed: 'FAILED',
    available: 'available',
    steps: {
      started: 'probe started — React Native and Hermes are working',
      yjsImported: 'yjs imported',
      yDocCreated: 'Y.Doc created (clientID {{clientId}}) — lib0/webcrypto shim OK',
      coreImported: '@jutrack/core imported (v{{version}})',
      randomBytes: 'expo-crypto: {{count}} random bytes',
      keysDerived: 'keys derived (vault {{vaultId}}…) — HKDF and UTF-8 OK',
      crypto: 'XChaCha20-Poly1305: encryption and decryption OK',
      dbOpened: 'SQLite database opened',
      expenseSaved: 'expense saved to SQLite ({{count}} listed)',
      secureStore: 'SecureStore: {{result}}',
      relay: 'relay reachable: HTTP {{status}}',
      pairing: 'pairing invite built and re-read: {{result}}',
      qr: 'QR generated: {{extent}}×{{extent}} module grid',
      camera: 'camera module: {{result}}',
      notifications: 'local notifications: {{result}}',
      widgets: 'Android widgets: {{result}}',
      allOk: 'ALL OK — every subsystem works on this device',
    },
    secureStoreOk: 'writes and reads back',
    secureStoreMismatch: 'READBACK MISMATCH',
    cameraUnavailable: 'NOT available (manual paste remains)',
    notifModuleMissing: 'module NOT in this build — needs the EAS build from Step 30',
    notifModuleAvailable: 'module available, permission {{status}}',
    permissionGranted: 'granted',
    permissionDenied: 'not granted',
    widgetsUnreachable: 'providers NOT reachable — needs the EAS build from Step 30',
    widgetsOk: '{{count}} providers respond ({{placed}} on the home screen)',
  },
  onboarding: {
    profile: {
      heading: 'What’s your name?',
      hint: 'It’s only so the people you split expenses with can recognise you. It stays on your phone and inside the groups you join: no account, no email.',
      colorLabel: 'Your colour',
      saving: 'One moment…',
      start: 'Get started',
    },
    identity: {
      heading: 'Who are you in this group?',
      hint: 'If you’re joining now, you’re a new person. But if you restored the key on a new phone, you’re already someone in here: saying so avoids showing up twice and throwing off the balance.',
      chooseNew: 'I’m new — join as {{name}}',
      waiting: 'Still downloading who’s in the group…',
      noOthers: 'There’s no one else in this group yet.',
      orSameName: 'Or: I was already here, under this name',
    },
  },
  pairing: {
    receivedTitle: 'Invite received',
    qrLabel: 'Pairing QR code',
    join: {
      title: 'Invite',
      noInviteTitle: 'No invite received',
      enteringTitle: 'Joining…',
      noInviteHint: 'Open the link they sent you, or paste the other phone’s code here.',
      receivedHint:
        'Confirm to add the group to the ones you already have. None of your groups are affected.',
      pasteOrScan: 'Paste or scan a code',
      backToGroups: 'Back to your groups',
    },
    deepLink: {
      title: 'Pairing',
      noCodeTitle: 'No code received',
      noCodeHint:
        'Open the scanner to frame the code shown on the other phone, or show yours to let it into this vault.',
      receivedHint: 'Confirm to pair this phone with the vault the code points to.',
      scan: 'Scan a code',
      showMyCode: 'Show my code',
    },
    invite: {
      guardTitle: 'Invite someone',
      requiredWhat: 'An invite',
      title: 'Invite to “{{name}}”',
      keyUnreadable: 'This group’s key can’t be read on this device.',
      shareMessage: 'Join “{{name}}” on JuTrack:\n{{url}}',
      explainHeading: 'What you’re about to send',
      explainIntro: 'This group’s key.',
      explainWarning: 'Anyone who opens the link gets in',
      explainRest:
        ': send it to the right person and no one else. If it gets forwarded, whoever receives it can read every expense in the group too, now and in the future.',
      linkPersists:
        'The link stays in the conversation you sent it in. After {{minutes}} minutes it stops being accepted, but the key inside it doesn’t: if you sent it to the wrong person, the only fix is to leave the group and start over.',
      scopeNote:
        'It only applies to “{{name}}”: your other groups aren’t involved and stay out of reach for whoever receives it. The relay can’t read it — the key sits in the part of the address browsers never send to servers.',
      preparing: 'Preparing…',
      understood: 'Got it, prepare the invite',
      expiredTitle: 'Invite expired',
      expiredRegenerate: 'Prepare a new invite',
      sendLinkHeading: 'Send the link',
      linkValidFor:
        'Whoever opens it finds a button that opens JuTrack on their phone. Still valid for {{remaining}}.',
      shareLink: 'Share the link',
      copyLink: 'Copy the link',
      linkCopied: 'Link copied',
      scanHeading: 'Or scan a code',
      showQrHint:
        'If you both have your phones out, the QR code avoids passing the key through a chat. On the other one: Groups → Join with an invite → Scan a code.',
      showQr: 'Show the QR code',
      regenerate: 'Regenerate the invite',
    },
    scan: {
      title: 'Join a group',
      activating: 'Turning on the camera…',
      cameraUnavailable: 'Camera unavailable',
      permission: {
        unknown: 'Asking for permission to use the camera.',
        denied:
          'Permission denied. You can grant it in system settings, or paste the code below instead.',
        unavailable:
          'This build doesn’t expose the camera. Pairing still works by pasting the code below.',
      },
      pasteHeading: 'Or paste the invite',
      pasteHintIntro: 'Either the link they sent you in chat, or an address that starts with',
      schemePrefix: 'jutrack://',
      pasteHintRest:
        '. It contains the group’s key in plain sight: once you’ve used it, don’t leave it lying around.',
      placeholder: 'https://…/j#v=1&k=…',
      linkLabel: 'Pairing code',
      paste: 'Paste',
      connecting: 'Pairing…',
      connect: 'Pair',
    },
    confirm: {
      unnamedGroup: 'Shared group',
      joinedTitle: 'You’re in the group',
      joinedBody:
        'This phone’s expenses and the other one’s come together here. You’ll show up among the group’s people under your name.',
      confirmTitleGeneric: 'Join this group?',
      confirmTitleNamed: 'Join “{{name}}”?',
      confirmBody:
        'It’ll be added to your groups, without touching the ones you already have. Expenses are end-to-end encrypted: whoever holds this key can read them, and no one else.',
      enter: 'Join',
    },
  },
};
