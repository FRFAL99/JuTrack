/**
 * Questi test valgono piu' di quanto sembri: sono l'unico posto in cui si controlla
 * cosa esce dal telefono insieme a un rapporto di errore. Un difetto qui non si vede
 * nell'app, non si vede nei log, e si scoprirebbe solo leggendo i rapporti su Sentry.
 */
import { describe, expect, it } from 'vitest';
import { filtraBriciola, ripuliscEvento, ripuliscUrl, type Evento } from './scrub';

const VAULT = '45bbac1409e2c9aa5669608f5bfad7ce'; // 32 esadecimali, come quelli veri
const TOKEN = 'a'.repeat(64);

describe('filtraBriciola', () => {
  it('butta le richieste di rete, che portano il vaultId nell URL', () => {
    for (const category of ['xhr', 'fetch', 'http']) {
      expect(filtraBriciola({ category, data: { url: `https://relay/v1/${VAULT}` } })).toBeNull();
    }
  });

  it('butta la console, che puo contenere qualunque cosa', () => {
    expect(filtraBriciola({ category: 'console', message: 'spesa 12,30 pizza' })).toBeNull();
  });

  it('tiene la navigazione, che dice su quale schermata e successo', () => {
    const b = { category: 'navigation', data: { to: '/groups' } };
    expect(filtraBriciola(b)).toBe(b);
  });

  it('tiene una briciola senza categoria invece di buttarla per sbaglio', () => {
    const b = { message: 'qualcosa' };
    expect(filtraBriciola(b)).toBe(b);
  });

  it('regge null e undefined, che Sentry passa davvero', () => {
    expect(filtraBriciola(null)).toBeNull();
    expect(filtraBriciola(undefined)).toBeNull();
  });
});

describe('ripuliscUrl', () => {
  it('sostituisce il vaultId lasciando la forma della chiamata', () => {
    expect(ripuliscUrl(`https://relay.test/v1/${VAULT}/updates`)).toBe(
      'https://relay.test/v1/<id>/updates',
    );
  });

  it('sostituisce anche un token da 64, che e piu lungo del vaultId', () => {
    expect(ripuliscUrl(`https://relay.test/x?t=${TOKEN}`)).toBe('https://relay.test/x?t=<id>');
  });

  it('ne sostituisce due nello stesso URL, non solo il primo', () => {
    // Il difetto classico di una regex senza `g`: protegge l'inizio e lascia il resto.
    const due = ripuliscUrl(`https://r/${VAULT}/a/${TOKEN}`);
    expect(due).toBe('https://r/<id>/a/<id>');
    expect(due).not.toContain(VAULT);
    expect(due).not.toContain(TOKEN);
  });

  it('non tocca un percorso normale, che serve a capire cosa e fallito', () => {
    expect(ripuliscUrl('https://relay.test/v1/health')).toBe('https://relay.test/v1/health');
  });

  it('non tocca una parola corta anche se e tutta esadecimale', () => {
    // «deadbeef» e «face» sono esadecimali validi: una soglia troppo bassa
    // cancellerebbe pezzi di URL leggibili senza proteggere niente in piu'.
    expect(ripuliscUrl('https://relay.test/deadbeef/face')).toBe(
      'https://relay.test/deadbeef/face',
    );
  });
});

describe('ripuliscEvento', () => {
  it('toglie l utente, che Sentry inventa dall installazione', () => {
    const e: Evento = { user: { id: 'installation-abc' } };
    expect(ripuliscEvento(e).user).toBeUndefined();
  });

  it('toglie le intestazioni, dove sta il token di autorizzazione del vault', () => {
    const e: Evento = { request: { url: 'https://r/x', headers: { authorization: TOKEN } } };
    const p = ripuliscEvento(e);
    expect(p.request?.headers).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain(TOKEN);
  });

  it('ripulisce l URL della richiesta', () => {
    const e: Evento = { request: { url: `https://r/v1/${VAULT}` } };
    expect(ripuliscEvento(e).request?.url).toBe('https://r/v1/<id>');
  });

  it('rifiltra le briciole, che possono arrivare senza passare da beforeBreadcrumb', () => {
    const e: Evento = {
      breadcrumbs: [
        { category: 'console', message: 'importo 12,30' },
        { category: 'navigation', data: { to: '/tu' } },
        { category: 'xhr' },
      ],
    };
    const p = ripuliscEvento(e);
    expect(p.breadcrumbs).toHaveLength(1);
    expect(p.breadcrumbs?.[0]?.category).toBe('navigation');
  });

  it('non modifica l evento originale', () => {
    // Sentry riusa l'oggetto: mutarlo vorrebbe dire cambiare cosa vede il resto dell'SDK.
    const e: Evento = { user: { id: 'x' }, request: { url: `https://r/${VAULT}` } };
    ripuliscEvento(e);
    expect(e.user).toEqual({ id: 'x' });
    expect(e.request?.url).toBe(`https://r/${VAULT}`);
  });

  it('regge un evento vuoto', () => {
    expect(ripuliscEvento({})).toEqual({});
  });
});
