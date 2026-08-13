/**
 * L'italiano, che è **la fonte e non una traduzione**.
 *
 * L'app è stata scritta in italiano per trentasei step, e questo file è il primo posto in
 * cui quelle frasi smettono di stare dentro i componenti. La direzione conta: si scrive qui,
 * e da qui si traduce — `en.ts` è tipizzato su questa forma, quindi una chiave aggiunta di
 * là senza esserci qui non compila, e una aggiunta qui senza tradurla di là nemmeno.
 *
 * **Lo Step 37 copre una schermata sola** — `tu.tsx`, più le etichette dei tab — e non è
 * pigrizia: serve a provare che il meccanismo funziona nel posto dove si tocca
 * l'interruttore. Le altre schermate sono lo Step 38 e il 39, una sessione per volta.
 *
 * Resta fuori anche quello che `tu.tsx` non scrive di suo: la riga di stato della
 * sincronizzazione arriva da `features/sync/describe.ts`, che la stessa frase la scrive anche
 * in fondo alla lista spese. Tradurre un modulo condiviso vuol dire tradurre le schermate che
 * lo usano, ed è esattamente lo Step 38.
 */

export const it = {
  tabs: {
    groups: 'Gruppi',
    charts: 'Grafici',
    you: 'Tu',
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
