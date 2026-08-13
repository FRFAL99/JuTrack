import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { describeGap, previewShareCents, splitModeLabel, splitPreview } from './split-text';

describe('splitModeLabel', () => {
  it('dice «Metà e metà» solo quando si è in due', () => {
    expect(splitModeLabel('equal', 2)).toBe('Metà e metà');
  });

  it('non dice «Metà e metà» in tre, dove sarebbe falso', () => {
    // È la correzione al mockup, che assumeva due persone: su un'app di conti una frase
    // falsa accanto a un numero è peggio di una frase lunga.
    expect(splitModeLabel('equal', 3)).toBe('In parti uguali');
    expect(splitModeLabel('equal', 5)).toBe('In parti uguali');
  });

  it('non chiama «Tutto mio» una spesa che può aver pagato un altro', () => {
    // `single` mette la spesa a carico di **chi ha pagato**, che non sono per forza io.
    expect(splitModeLabel('single', 2)).toBe('Solo chi paga');
  });

  it('chiama le quote libere «Quote»', () => {
    expect(splitModeLabel('custom', 2)).toBe('Quote');
  });
});

describe('describeGap', () => {
  it('chiede l importo prima di parlare di quote', () => {
    expect(describeGap(0, null)).toBe('Inserisci prima l’importo della spesa');
    expect(describeGap(0, 0)).toBe('Inserisci prima l’importo della spesa');
  });

  it('conferma quando le quote tornano', () => {
    expect(describeGap(0, 5000)).toBe('Le quote coprono esattamente il totale');
  });

  it('dice quanto manca', () => {
    expect(describeGap(1500, 5000)).toBe('Mancano 15,00 €');
  });

  it('dice quanto eccede, senza segno meno', () => {
    // «Eccedono di -15,00 €» sarebbe una doppia negazione da decifrare.
    expect(describeGap(-1500, 5000)).toBe('Eccedono di 15,00 €');
  });
});

describe('splitPreview', () => {
  it('mostra la quota a testa quando l importo si divide esatto', () => {
    expect(splitPreview(5000, 2)).toBe('25,00 € a testa');
  });

  it('mostra i due estremi quando resta un centesimo', () => {
    // 10,00 € in 3 fa 3,34 / 3,33 / 3,33: mostrarlo evita che sembri un errore di calcolo.
    expect(splitPreview(1000, 3)).toBe('3,33 € / 3,34 € a testa');
  });

  it('non calcola nulla senza importo', () => {
    expect(splitPreview(null, 2)).toBe('Diviso in parti uguali');
    expect(splitPreview(0, 2)).toBe('Diviso in parti uguali');
  });

  it('non calcola nulla con una persona sola', () => {
    expect(splitPreview(5000, 1)).toBe('Diviso in parti uguali');
  });

  it('scrive il simbolo che riceve, su entrambi gli estremi', () => {
    // Step 29: il simbolo arriva dal profilo attraverso il form. Il caso col resto è
    // quello che conta — un solo estremo convertito sarebbe passato inosservato.
    expect(splitPreview(5000, 2, 'CHF')).toBe('25,00 CHF a testa');
    expect(splitPreview(1000, 3, 'CHF')).toBe('3,33 CHF / 3,34 CHF a testa');
  });
});

describe('la valuta arriva alle frasi', () => {
  it('vale anche per lo scarto delle quote', () => {
    expect(describeGap(1500, 5000, '£')).toBe('Mancano 15,00 £');
    expect(describeGap(-1500, 5000, '£')).toBe('Eccedono di 15,00 £');
  });
});

describe('previewShareCents', () => {
  const IDS = ['a', 'b'];

  it('divide in parti uguali', () => {
    expect(previewShareCents('equal', 5000, IDS, 'a', 'a')).toBe(2500);
    expect(previewShareCents('equal', 5000, IDS, 'b', 'a')).toBe(2500);
  });

  it('distribuisce il centesimo di resto in modo deterministico', () => {
    // Le due quote devono sommare al totale: è l'invariante di `splitEvenly`.
    const first = previewShareCents('equal', 1001, IDS, 'a', 'a');
    const second = previewShareCents('equal', 1001, IDS, 'b', 'a');
    expect((first ?? 0) + (second ?? 0)).toBe(1001);
  });

  it('mette tutto su chi ha pagato in modalità single', () => {
    expect(previewShareCents('single', 5000, IDS, 'a', 'a')).toBe(5000);
    expect(previewShareCents('single', 5000, IDS, 'b', 'a')).toBe(0);
  });

  it('non anticipa nulla sulle quote libere, che le scrive l utente', () => {
    expect(previewShareCents('custom', 5000, IDS, 'a', 'a')).toBeNull();
  });

  it('non mostra una quota finché non c è un importo', () => {
    // Uno `0,00` sotto un nome farebbe sembrare deciso qualcosa che non è stato scritto.
    expect(previewShareCents('equal', null, IDS, 'a', 'a')).toBeNull();
    expect(previewShareCents('equal', 0, IDS, 'a', 'a')).toBeNull();
  });

  it('dà zero a un membro fuori dallo split invece di sollevare', () => {
    expect(previewShareCents('equal', 5000, IDS, 'membro-ignoto', 'a')).toBe(0);
  });
});

describe('in inglese', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('cambia etichetta alla divisione equa a seconda di quanti si è', () => {
    expect(splitModeLabel('equal', 2)).toBe('Half and half');
    expect(splitModeLabel('equal', 3)).toBe('Split evenly');
    expect(splitModeLabel('single', 2)).toBe('Payer only');
  });

  it('mette l importo dove lo vuole la lingua', () => {
    // In italiano «Mancano 5,00 €», in inglese «5,00 € missing»: il verbo sta da parti
    // opposte, ed è la ragione per cui la frase intera è una chiave e non un pezzo cucito
    // attorno a un numero.
    expect(describeGap(500, 10_000)).toBe('5,00 € missing');
    expect(describeGap(-500, 10_000)).toBe('5,00 € too much');
    expect(describeGap(0, 10_000)).toBe('The shares cover the total exactly');
  });

  it('traduce l anteprima delle quote', () => {
    expect(splitPreview(10_000, 2)).toBe('50,00 € each');
    expect(splitPreview(null, 2)).toBe('Split evenly');
  });
});
