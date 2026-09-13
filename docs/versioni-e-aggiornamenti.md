# Versioni e aggiornamenti

> Punto d'ingresso del progetto: [STATO.md](STATO.md). Qui sta una cosa sola: **quale numero si
> alza, quando, e cosa succede se si sbaglia.** Scritto il 13 settembre 2026, dopo aver misurato sul
> progetto vero che due di queste regole non sono deducibili — si scoprono rompendo qualcosa.

## I tre numeri, e solo uno si sceglie

| Numero           | Dove sta                        | Chi lo decide            | Cosa vede l'utente                       |
| ---------------- | ------------------------------- | ------------------------ | ---------------------------------------- |
| `version`        | `app.json` → `expo.version`     | **noi, a mano**          | «1.0.0» nel Play Store e in fondo a «Tu» |
| `versionCode`    | remoto, su EAS                  | **EAS**, `autoIncrement` | niente                                   |
| `runtimeVersion` | derivata, `policy: fingerprint` | **nessuno**: è un hash   | niente                                   |

`versionCode` non si tocca: `eas.json` dichiara `"appVersionSource": "remote"` e il profilo
`production` ha `autoIncrement`, quindi EAS lo alza da sé a ogni build e non può collidere con una
già caricata. Scriverlo a mano è il modo di ritrovarsi un upload rifiutato dal Play Store.

`runtimeVersion` è l'**impronta della parte nativa**. Si legge con
`npx expo-updates fingerprint:generate --platform android`, e si legge di una build fatta con
`eas build:view <id>`. Serve a una cosa sola: un `eas update` raggiunge **solo** le build la cui
impronta è identica a quella con cui l'update è stato pubblicato.

## La regola che conta: `version` sta dentro l'impronta

**Alzare `version` cambia la `runtimeVersion`.** Misurato:

```
version 0.1.0  →  da213b959e21033f355e64ac0cc1d2648827577c
version 1.0.0  →  d862b56d70daebe68db62e164e03d66e5245ed33
```

Da cui l'unica regola davvero controintuitiva di questo documento:

> **Un `eas update` si pubblica con `version` INVARIATA.** Alzarla «per segnare che è cambiato
> qualcosa» è esattamente il gesto che impedisce all'aggiornamento di arrivare: le app installate
> continuano a cercare la vecchia impronta e ignorano la nuova, in silenzio.

Quindi:

- **`version` cambia ⟺ si carica un binario nuovo sul Play Store.** Patch per le correzioni, minor
  per le funzionalità. Mai per un aggiornamento via etere.
- **Un aggiornamento via etere non ha un numero suo**, e non gli serve: si identifica col messaggio
  che gli si dà (`eas update --message "…"`) e si ritrova con `eas update:list`.

## Build o update?

| Cosa è cambiato                                                         | Serve        |
| ----------------------------------------------------------------------- | ------------ |
| Solo `apps/mobile/src/` e `packages/core/` (JS/TS)                      | `eas update` |
| Una dipendenza in `package.json`                                        | **build**    |
| `app.json` o `app.config.ts` (permessi, icona, splash, nome, `version`) | **build**    |
| Un config plugin                                                        | **build**    |
| **`eas.json`**                                                          | **build**    |

L'ultima riga è la seconda cosa non deducibile, e costa cara: `@expo/fingerprint` hasha `eas.json`
come **file intero**. Una riga aggiunta al solo profilo `development` sposta la `runtimeVersion` di
_tutti_ i profili — e taglia fuori dagli aggiornamenti ogni build già installata, produzione
compresa. Il 13 settembre è successo davvero, e il commento scritto dentro `eas.json` per spiegarlo
ha spostato l'impronta **una seconda volta**.

Conseguenze operative:

- Le variabili d'ambiente dei profili di build stanno **su EAS**, non in `eas.json`:
  `eas env:set --name X --value Y --environment development`. Si leggono con `eas env:list development`.
- `eas.json` si lascia identico byte per byte finché non c'è una ragione vera per cambiarlo. Quando
  ci sarà, mettere in conto **una build nuova per ogni profilo**.
- Prima di pubblicare un aggiornamento, verificare che le due impronte combacino:

```bash
cd apps/mobile
npx expo-updates fingerprint:generate --platform android | python3 -c "import json,sys; print(json.load(sys.stdin)['hash'])"
npx eas-cli build:list --platform android --limit 4   # Fingerprint e Commit di ognuna
```

## Cosa si può mandare via etere, e cosa no

Un aggiornamento porta **JavaScript e asset**, non codice nativo. Se il bundle nuovo chiama un modulo
che quel binario non ha, l'app si rompe **dopo** l'aggiornamento, sul telefono di chi l'ha ricevuto.
La verifica è una sola riga:

```bash
git diff <commit-della-build-installata>..HEAD --stat -- apps/mobile/package.json apps/mobile/app.json
```

Vuoto = il bundle non può riferirsi a niente che non ci sia già.

## Registro degli aggiornamenti via etere

| Data       | Canale       | Impronta    | Cosa portava                                                                                                            |
| ---------- | ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-09-13 | `production` | `d862b56d…` | Step 49–57, dal commit `6dfbbeb`. Il **primo** della storia del progetto: gruppo `dcf68b3d-30a1-4214-b85d-e91f76024c2d` |
| 2026-09-13 | `production` | `d862b56d…` | Step 58–60 (Piano v7 intero), dal commit `26fb052`: gruppo `bd3db527-395b-4522-94c1-e8c67ccd067a`                       |
| 2026-09-13 | `production` | `d862b56d…` | Step 61–66 (Piano v8 intero), dal commit `a7c69d8`: gruppo `3fa557a0-a8a5-4fb6-81df-c19611c8fc0b`                       |

Si rilegge con `npx eas-cli channel:view production` e `npx eas-cli update:list`. Per tornare
indietro: `npx eas-cli update:rollback`, oppure ripubblicare dal commit precedente — un aggiornamento
via etere si disfa in un minuto, ed è la ragione per cui è meno rischioso di una build.

**Una cosa imparata pubblicando il terzo.** L'impronta non serve solo a sapere se un update
**arriverà**: dice anche **cosa c'è dentro il binario installato**. `@expo/fingerprint` hasha
`node_modules/<modulo>/android` come cartella, quindi due impronte identiche significano codice
nativo identico. Il Piano v8 usava tre funzioni native nuove — `File.pickFileAsync`,
`Directory.pickDirectoryAsync`, `Directory.createFile` — e la domanda «ci sono nella build del 12
settembre?» sembrava rispondibile solo col telefono in mano. Non lo era: l'impronta corrente
combacia con `d862b56d…`, quindi la cartella `expo-file-system/android` della build è byte per byte
quella che si legge in `node_modules` — dove quelle funzioni ci sono. Un ripiego previsto è rimasto
previsto e basta.

**Due cose imparate pubblicando il secondo.** `eas update` in `--non-interactive` pretende anche
`--environment`, che il primo giro — fatto in interattivo — non aveva chiesto:

```bash
cd apps/mobile
npx eas-cli update --channel production --platform android --environment production \
  --message "…" --non-interactive
```

E **`eas build:view` vuole lo UUID intero**, non le otto cifre con cui una build si nomina a voce:
`807161bd` viene rifiutato con «Invalid UUID buildId». Per leggere l'impronta di una build installata
conviene `npx eas-cli build:list --platform android --limit 4`, che le stampa tutte con `Fingerprint`
e `Commit` accanto — ed è anche il modo di verificare l'impronta **contro la fonte vera** invece che
contro il numero scritto in un documento.

## Il numero che si legge in fondo a «Tu»

Arriva da `Constants.expoConfig?.version`, cioè da `app.json`. Fino al 13 settembre era la stringa
`'0.1.0'` **scritta a mano** nel componente: la versione pubblicata era già 1.0.0, quindi l'unico
numero che un tester potesse riferire era falso. Un numero scritto due volte è un numero che prima o
poi diverge.

## Le build EAS, e la quota

Una build nativa si fa da `apps/mobile`, con uno dei due profili:

```bash
cd apps/mobile && npx eas-cli build -p android --profile preview      # APK autonomo, senza Metro
cd apps/mobile && npx eas-cli build -p android --profile production   # app bundle per il Play Store
```

- Piano EAS Free: **15 build Android al mese**, concorrenza 1, timeout 45 minuti. Ne sono state
  consumate **tre in agosto** (1, 12 e 15) e **una a settembre** (il 5), tutte col profilo
  `development` e tutte riuscite, fra i 13 e i 19 minuti l'una.
- Il keystore è custodito da EAS ed è quello che lega gli aggiornamenti all'app già installata:
  perderlo significa non poter più aggiornare quell'installazione.
- Il profilo `preview` è quello che serve per far provare l'app a qualcun altro: gira senza Metro,
  quindi senza il computer acceso.

È il motivo per cui ogni piano dichiara nella decisione 0 se consuma una build: quindici al mese
sono poche, e un update via etere non ne consuma nessuna.
