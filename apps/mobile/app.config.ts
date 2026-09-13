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
 * **`APP_VARIANT` non si passa da `eas.json`**, e il giro lungo è il punto. `@expo/fingerprint`
 * hasha `eas.json` come **file intero**: una riga aggiunta al solo profilo `development` sposta la
 * `runtimeVersion` di *tutti* i profili, e con lei taglia fuori da ogni `eas update` le build già
 * installate. Misurato il 13 settembre 2026 — con quella riga dentro, l'impronta passava da
 * `d862b56d` a `832a0a87` e la 1.0.0 in test chiuso sul Play Store smetteva di ricevere
 * aggiornamenti. Lo Step 47 esiste per evitare esattamente questo. La variabile sta quindi fra le
 * variabili d'ambiente del progetto su EAS: `eas env:list development`.
 *
 * **E la spiegazione non può stare in `eas.json`**: scriverla lì dentro come commento ha spostato
 * l'impronta una seconda volta. Il file va lasciato identico, byte per byte, finché non c'è una
 * ragione vera per cambiarlo — e quando ci sarà, servirà una build nuova per ogni profilo.
 *
 * **Fuori dalla variante questo file non tocca niente**: restituisce la configurazione di
 * `app.json` com'è, e infatti non compare fra le sorgenti dell'impronta di `preview`.
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
