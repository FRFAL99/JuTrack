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
      transfer: '{{from}} owes {{amount}} to {{to}}',
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
};
