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
 */
export const en: Dictionary = {
  tabs: {
    groups: 'Groups',
    charts: 'Charts',
    you: 'You',
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
