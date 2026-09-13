import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * La variante di sviluppo si installa **accanto** a quella vera, non sopra.
 *
 * **Il problema che risolve, visto sul campo il 13 settembre 2026.** `development` e `preview`
 * costruivano lo stesso `com.frfal.jutrack`: installando la build `preview` del 12 settembre,
 * Android l'ha trattata come un aggiornamento — ecco perché i dati erano sopravvissuti — e ha
 * **sostituito il dev client**. Da quel momento l'unica JuTrack sul telefono non sapeva più
 * agganciarsi a Metro, e l'unico modo di caricare il codice nuovo sembrava Expo Go, che dalla
 * SDK 53 non ha il lato nativo di `expo-notifications` e quindi non parte.
 *
 * Con un package proprio le due convivono, e installare una preview non uccide più niente.
 *
 * **Lo `scheme` resta `jutrack` per tutte e due**, di proposito: un invito è un
 * `jutrack://join#…`, e deve poter aprire quella che si sta provando. Con tutte e due
 * installate Android chiede quale — è una schermata in più, ed è anche l'unico modo di
 * scegliere. Uno schema diverso renderebbe invece falso `pairing.schemePrefix`, che nei
 * dizionari è scritto `jutrack://`.
 *
 * **Fuori dalla variante questo file non tocca niente**: restituisce la configurazione di
 * `app.json` com'è, e infatti non compare fra le sorgenti dell'impronta di `preview`.
 *
 * **A cambiare l'impronta è stato `eas.json`**, misurato il 13 settembre confrontando le
 * sorgenti prima e dopo: `@expo/fingerprint` lo hasha **come file intero**, quindi aggiungere
 * un `env` al solo profilo `development` ha spostato la `runtimeVersion` di *tutti* i profili.
 * È una trappola da ricordare, perché lo Step 47 esiste proprio per mandare `eas update` alle
 * build già installate: **toccare `eas.json` le taglia fuori**, anche per una riga che
 * riguarda un altro profilo. Qui non si è perso niente — la preview sul telefono era già
 * irraggiungibile da quando `version` è passata a 1.0.0 — ma la prossima volta va saputo
 * prima.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.APP_VARIANT !== 'development') return base;

  return {
    ...base,
    // Il nome sotto l'icona: senza, due JuTrack identiche sulla home sono un indovinello.
    name: 'JuTrack dev',
    android: { ...base.android, package: 'com.frfal.jutrack.dev' },
  };
};
