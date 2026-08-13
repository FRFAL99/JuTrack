import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, resolveLanguage, systemLocale } from './language';
import { en } from './locales/en';
import { it } from './locales/it';

/**
 * L'istanza `i18next` dell'app, inizializzata **all'import**.
 *
 * Un modulo con un effetto collaterale è di solito una cattiva idea, e qui è l'unica che
 * funziona: `useTranslation` chiamato prima di `init` non aspetta, restituisce la chiave
 * grezza e disegna `you.sync.title` a schermo. Inizializzare in un effetto vorrebbe dire
 * accettare un primo fotogramma fatto di chiavi. I dizionari sono due oggetti già in memoria,
 * quindi `init` è sincrona e non c'è niente da attendere.
 *
 * Chi ha bisogno delle traduzioni non importa questo file: importa `useTranslation` da
 * `react-i18next`, che parla con l'istanza di default — che è questa. L'unico import esplicito
 * sta in `app/_layout.tsx`, in cima all'albero, ed è lì per **ordine di esecuzione**, non per
 * usarne il valore.
 */

void i18next.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  // La lingua di sistema è solo il punto di partenza: `LanguageSync` la sostituisce con la
  // scelta del profilo appena il profilo è letto da disco. Metterla qui, e non aspettare,
  // evita che il primo fotogramma sia in una lingua diversa dal secondo.
  lng: resolveLanguage(null, systemLocale()),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    // **Obbligatorio fuori dal web.** L'escape di default serve a non iniettare HTML in una
    // pagina; qui non c'è pagina e non c'è HTML, e l'unico effetto sarebbe trasformare gli
    // apostrofi tipografici delle nostre frasi in `&#39;` dentro un `<Text>`.
    escapeValue: false,
  },
});

export default i18next;
