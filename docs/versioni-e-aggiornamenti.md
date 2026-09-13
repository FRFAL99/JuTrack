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
npx eas-cli build:view <id-della-build-installata> | grep Fingerprint
```

## Cosa si può mandare via etere, e cosa no

Un aggiornamento porta **JavaScript e asset**, non codice nativo. Se il bundle nuovo chiama un modulo
che quel binario non ha, l'app si rompe **dopo** l'aggiornamento, sul telefono di chi l'ha ricevuto.
La verifica è una sola riga:

```bash
git diff <commit-della-build-installata>..HEAD --stat -- apps/mobile/package.json apps/mobile/app.json
```

Vuoto = il bundle non può riferirsi a niente che non ci sia già.

## Il numero che si legge in fondo a «Tu»

Arriva da `Constants.expoConfig?.version`, cioè da `app.json`. Fino al 13 settembre era la stringa
`'0.1.0'` **scritta a mano** nel componente: la versione pubblicata era già 1.0.0, quindi l'unico
numero che un tester potesse riferire era falso. Un numero scritto due volte è un numero che prima o
poi diverge.
