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
 * **Quello che resta italiano, e va detto:** i numeri. `formatCents` scrive «1.234,56» in
 * entrambe le lingue, perché il separatore decimale sta in `packages/core` e cambiarlo tocca
 * ogni importo dell'app e l'export CSV. Non è una svista dello Step 38, è un lavoro suo che
 * non è ancora stato fatto.
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
    amountPlaceholder: '0,00',
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
      probe: 'Diagnostics',
      wipe: 'Reset this phone',
      idLabel: 'Your identifier',
      idBody:
        'This is how the other phones recognise you inside a group. It is a random number, generated once on this phone: it is not an account, there is nothing to sign in to, and on its own it says nothing about you. It only matters if something goes wrong and you need to say which person we are talking about.\n\n{{id}}',
      version: 'JuTrack {{app}} · core {{core}}',
    },
  },
};
