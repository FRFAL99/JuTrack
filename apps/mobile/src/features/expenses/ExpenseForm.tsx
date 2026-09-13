import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import {
  buildSplit,
  currencySymbol,
  normalizeTags,
  parseAmount,
  storeKey,
  tagKey,
  type Expense,
  type ExpenseSplit,
  type Member,
  type SplitMode,
} from '@jutrack/core';
import { formatCents, formatMoney, numberFormat } from '@/i18n/money';
import { initialOf } from '@/components/avatar';
import { AvatarStack } from '@/components/AvatarStack';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DayPicker } from '@/features/calendar/DayPicker';
import { VocabularyPicker } from '@/features/vocabulary/VocabularyPicker';
import { CategoryIcon } from '@/features/categories/CategoryIcon';
import { useCategories, useCurrencyCode, useMembers, useMyMemberId, useVaultStore } from '@/state';
import { numeric, useTheme } from '@/theme';
import { AmountPad } from './AmountPad';
import { applyKey } from './amount-pad';
import { categorySummary, detailsSummary, payerSummary, type SummaryPart } from './group-summary';
import { formatDayTitle, todayIso } from './grouping';
import { describeGap, previewShareCents, splitModeLabel, splitPreview } from './split-text';

export interface ExpenseFormValues {
  amountCents: number;
  date: string;
  categoryId: string | null;
  note: string;
  /**
   * Negozio e tag così come sono stati scritti.
   *
   * **Non normalizzati qui**: lo fa `VaultStore` in scrittura (Step 23), che è l'unico
   * punto da cui il testo entra nel documento. Ripulirli anche nel form sarebbe una
   * seconda regola da tenere allineata alla prima.
   */
  store: string;
  tags: string[];
  /**
   * La valuta con cui la spesa è stata scritta.
   *
   * Su una spesa nuova è quella del profilo (Step 29); su una spesa in modifica è **la
   * sua**, non quella di adesso: cambiare valuta nel profilo non deve riscrivere il
   * passato, o una spesa fatta in franchi diventerebbe la stessa cifra in euro.
   */
  currency: string;
  paidBy: string;
  /**
   * Quote già bilanciate sull'importo.
   *
   * Le costruisce il form, non le schermate che lo usano: la coerenza fra `mode` e
   * `shares` è una sola regola, e duplicarla in ogni chiamante è il modo più rapido per
   * farle divergere.
   */
  split: ExpenseSplit;
}

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (values: ExpenseFormValues) => void;
  onDelete?: () => void;
  submitLabel: string;
}

/** I tre gruppi apribili. Uno solo aperto per volta, oppure nessuno. */
type GroupKey = 'who' | 'category' | 'details';

/**
 * Le due misure dell'importo: quando è il soggetto della schermata e quando non lo è più.
 *
 * **Non stanno in `fontSize`** perché non sono un gradino della scala tipografica ma i due
 * capi di una transizione: 62 vale solo finché il tastierino è a schermo, 38 solo mentre un
 * gruppo è aperto, e l'uno non ha senso senza l'altro. Metterli nella scala li offrirebbe a
 * schermate che non hanno né tastierino né gruppi. È lo stesso genere di valore del
 * `minHeight: 52` di `Button`.
 *
 * La crenatura non viene da `tightTitle` (−0,6, pensato «da 28 in su»): a 62 punti quella
 * misura non stringe abbastanza e le cifre si sfilacciano.
 */
const AMOUNT_ALONE = { fontSize: 62, letterSpacing: -2.2, symbol: 24, top: 26 } as const;
const AMOUNT_BESIDE = { fontSize: 38, letterSpacing: -1.2, symbol: 19, top: 14 } as const;

/**
 * Quanto rientra il filetto fra due righe chiuse: fino a sotto la label, non sotto l'icona.
 *
 * 16 di padding + 22 di icona + 10 di distanza. Un filetto a filo del bordo taglierebbe in
 * due anche la colonna delle icone, che è una sola cosa.
 */
const ROW_INSET = 48;

/**
 * Il form della spesa: **l'importo è la schermata, il resto sono tre righe che si aprono**.
 *
 * La spesa si detta a voce così («ventiquattro e cinquanta») e finisce lì nove volte su
 * dieci: chi paga, come si divide, la categoria e i dettagli hanno tutti un default, e
 * toccarli è l'eccezione. Quindi la cifra e il salva stanno insieme a schermo — con il
 * tastierino dello Step 49 in mezzo — e tutto il resto si riassume in tre righe.
 *
 * **Un gruppo aperto per volta** (decisione 7 del Piano v6): con due aperti il salva
 * scenderebbe sotto la piega e la schermata tornerebbe quella densa di prima. Aprendone uno
 * l'importo scende da 62 a 38 punti e il tastierino si smonta — ma **il salva non si
 * muove**, perché non è dentro lo scorrimento: sta sotto, ancorato al fondo della schermata.
 *
 * **La riga chiusa porta il valore, non un segnaposto** (decisione 8): le frasi sono in
 * `group-summary.ts`, dove hanno dei test. Nascondere campi *compilati* dietro una riga muta
 * è il modo in cui i dati si perdono senza che nessuno se ne accorga.
 *
 * La logica di calcolo non è cambiata da nessuno dei due giri di redesign: `parseAmount`,
 * `buildSplit` e la validazione delle quote sono quelle di sempre.
 */
export function ExpenseForm({ initial, onSubmit, onDelete, submitLabel }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const members = useMembers();
  const myMemberId = useMyMemberId();
  // Dallo Step 59 negozi e tag sono un **elenco del gruppo**, non più un vocabolario
  // derivato dalle spese: le pillole le compone `VocabularyPicker`, che legge il catalogo e
  // ci aggiunge in coda le parole già usate ma mai messe in elenco. Qui serve solo il vault,
  // per far entrare in elenco ciò che si scrive col «+».
  const vault = useVaultStore();
  const profileCurrency = useCurrencyCode();

  // Una spesa già registrata conserva la propria valuta anche se nel frattempo il profilo
  // ne ha scelta un'altra: il simbolo qui sopra dev'essere quello con cui l'importo è
  // stato scritto, o la cifra resterebbe la stessa cambiando di significato.
  const currency = initial?.currency ?? profileCurrency;
  const symbol = currencySymbol(currency);

  // Il raggruppamento va tolto perché `parseAmount` non lo accetta, ma **quale** carattere
  // togliere dipende dalla lingua: in italiano è il punto, in inglese la virgola. Scritto a
  // mano com'era prima (`replace(/\./g, '')`), aprire in inglese una spesa da 12,30
  // cancellerebbe il **separatore decimale** e il campo mostrerebbe 1230.
  const [amountText, setAmountText] = useState(
    initial === undefined
      ? ''
      : formatCents(initial.amountCents).replaceAll(numberFormat().group, ''),
  );
  const [note, setNote] = useState(initial?.note ?? '');
  /**
   * La nota è aperta: il tastierino si smonta come per un gruppo.
   *
   * A scriverla è la tastiera di sistema — è testo libero, non cifre — e due tastiere
   * insieme sullo stesso schermo non ci stanno.
   */
  const [writingNote, setWritingNote] = useState(false);
  /**
   * La data è **stato**, dallo Step 58.
   *
   * Era `const date = initial?.date ?? todayIso()`, una costante fra i valori derivati: una
   * spesa nasceva sempre oggi e nessuna poteva essere corretta. Il default non cambia — nove
   * volte su dieci la spesa si registra mentre la si fa.
   */
  const [date, setDate] = useState(initial?.date ?? todayIso());
  /** La griglia è chiusa: a dire che la data è già quella giusta basta la riga. */
  const [pickingDate, setPickingDate] = useState(false);
  const [store, setStore] = useState(initial?.store ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  // Una bozza per campo, e stanno **qui** e non dentro i due selettori: `handleSubmit` deve
  // poterle vedere, o chi tocca «Salva» senza confermare col tasto «fine» perderebbe ciò
  // che ha scritto. Era già la regola del vecchio campo dei tag.
  const [tagDraft, setTagDraft] = useState('');
  const [storeDraft, setStoreDraft] = useState('');
  // Chiusi anche su una spesa che ha già negozio, tag o una categoria: a dire che sotto c'è
  // qualcosa è il riassunto sulla riga, non l'apertura d'ufficio del gruppo.
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  // Chi paga è quasi sempre chi sta scrivendo: il proprio membro è il default, non il
  // primo della lista in ordine alfabetico.
  const [paidBy, setPaidBy] = useState<string>(initial?.paidBy ?? myMemberId);
  const [mode, setMode] = useState<SplitMode>(
    initial?.split.mode ?? (members.length > 1 ? 'equal' : 'single'),
  );
  // Quote personalizzate come testo: convertirle in centesimi a ogni tasto
  // impedirebbe di scrivere «12,» mentre si digita «12,50».
  const [customShares, setCustomShares] = useState<Record<string, string>>(() =>
    initial?.split.mode === 'custom'
      ? Object.fromEntries(
          Object.entries(initial.split.shares).map(([id, v]) => [id, formatCents(v)]),
        )
      : {},
  );
  const [touched, setTouched] = useState(false);

  const amountCents = useMemo(() => parseAmount(amountText), [amountText]);
  // L'errore compare solo dopo il primo tentativo di invio: segnalare "importo non
  // valido" mentre l'utente sta ancora digitando la prima cifra è solo fastidioso.
  const amountError =
    touched && (amountCents === null || amountCents <= 0) ? t('expense.amountError') : undefined;

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  const toggleTag = (tag: string): void => {
    const key = tagKey(tag);
    setTags((current) =>
      current.some((t) => tagKey(t) === key)
        ? current.filter((t) => tagKey(t) !== key)
        : [...current, tag],
    );
  };

  /**
   * Il `+` fa due cose insieme: mette la voce **in elenco** e la sceglie.
   *
   * Sono due perché l'elenco è del gruppo e la scelta è di questa spesa. Scrivere una voce
   * senza metterla in elenco la lascerebbe da riscrivere la volta dopo, che è il difetto da
   * cui nasce questo step.
   */
  const commitTagDraft = (): void => {
    if (tagDraft.trim() === '') return;
    vault.addVocabularyEntry('tag', tagDraft);
    setTags((current) => normalizeTags([...current, tagDraft]));
    setTagDraft('');
  };

  const commitStoreDraft = (): void => {
    if (storeDraft.trim() === '') return;
    const entry = vault.addVocabularyEntry('store', storeDraft);
    if (entry !== null) setStore(entry.name);
    setStoreDraft('');
  };

  const customTotal = useMemo(
    () => members.reduce((sum, m) => sum + (parseAmount(customShares[m.id] ?? '') ?? 0), 0),
    [customShares, members],
  );
  const customGap = (amountCents ?? 0) - customTotal;
  const customBalances = mode !== 'custom' || (amountCents !== null && customGap === 0);

  const canSubmit = amountCents !== null && amountCents > 0 && paidBy !== '' && customBalances;

  /** Un gruppo alla volta: toccare quello aperto lo richiude e riporta il tastierino. */
  const toggleGroup = (key: GroupKey): void =>
    setOpenGroup((current) => (current === key ? null : key));

  /** Qualcosa si sta scrivendo, e non è l'importo: la cifra scende e il tastierino sparisce. */
  const aside = openGroup !== null || writingNote;
  const amountShape = aside ? AMOUNT_BESIDE : AMOUNT_ALONE;

  const payer = members.find((m) => m.id === paidBy);
  const category = categories.find((c) => c.id === categoryId);

  const whoSummary: SummaryPart[] =
    payer === undefined
      ? []
      : [
          ...payerSummary(
            { name: payer.name, isMe: payer.id === myMemberId },
            mode,
            members.length,
          ),
          // Quote che non quadrano è l'unico stato del form che il riassunto non può
          // limitarsi a descrivere: a gruppo chiuso il salva sarebbe spento senza che nulla
          // a schermo dica perché.
          ...(customBalances
            ? []
            : [{ text: describeGap(customGap, amountCents, symbol), tone: 'danger' as const }]),
        ];

  /** Passando a quote libere si parte dalla divisione equa: è il punto di partenza più probabile. */
  const chooseMode = (next: SplitMode): void => {
    if (next === 'custom' && Object.keys(customShares).length === 0 && amountCents !== null) {
      const equal = buildSplit('equal', amountCents, memberIds).shares;
      setCustomShares(
        Object.fromEntries(Object.entries(equal).map(([id, v]) => [id, formatCents(v)])),
      );
    }
    setMode(next);
  };

  const buildValues = (total: number): ExpenseSplit => {
    if (mode === 'single' || members.length < 2) return buildSplit('single', total, [paidBy]);
    if (mode === 'custom') {
      const shares = Object.fromEntries(
        members.map((m) => [m.id, parseAmount(customShares[m.id] ?? '') ?? 0]),
      );
      return { mode: 'custom', shares };
    }
    return buildSplit('equal', total, memberIds);
  };

  const handleSubmit = (): void => {
    setTouched(true);
    if (!canSubmit || amountCents === null) return;
    // Le bozze a metà scrittura contano come scritte: chi tocca «Salva» senza aver premuto
    // «fine» sulla tastiera si aspetta di ritrovarle, non di averle perse. E poiché entrano
    // nella spesa, entrano anche nell'elenco del gruppo — altrimenti la volta dopo sarebbero
    // da riscrivere, che è il difetto che questo step toglie.
    if (tagDraft.trim() !== '') vault.addVocabularyEntry('tag', tagDraft);
    if (storeDraft.trim() !== '') vault.addVocabularyEntry('store', storeDraft);

    onSubmit({
      amountCents,
      date,
      categoryId,
      note: note.trim(),
      store: storeDraft.trim() === '' ? store : storeDraft,
      tags: normalizeTags([...tags, tagDraft]),
      currency,
      paidBy,
      split: buildValues(amountCents),
    });
  };

  const sectionTitle = {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  };

  const fieldBox = {
    color: colors.text,
    fontSize: fontSize.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Lo scorrimento contiene **solo** l'importo e i tre gruppi. Tastierino e salva
          stanno fuori, ancorati al fondo: è così che «il salva non si muove» smette di
          essere un proposito e diventa una proprietà del layout. */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. L'importo, e **la cifra è il campo**: non c'è un riquadro da centrare col
            dito, si tocca il numero. Niente card attorno — a farlo stare in piedi da solo
            è la dimensione, e una superficie sopraelevata attorno gli toglierebbe aria. */}
        <View
          style={[styles.amount, { paddingHorizontal: spacing.lg, paddingTop: amountShape.top }]}
        >
          <View style={styles.amountRow}>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder={t('expense.amountPlaceholder')}
              placeholderTextColor={colors.textFaint}
              // La tastiera di sistema non si apre: a scrivere è il tastierino in fondo
              // (Step 49). Resta un `TextInput` e non un `Text` perché un `Text` perderebbe
              // l'annuncio di campo editabile, e con esso l'unico modo di sapere, con
              // TalkBack, che quella cifra si può cambiare.
              showSoftInputOnFocus={false}
              // Il cursore sta in fondo perché il tastierino scrive in fondo.
              selection={{ start: amountText.length, end: amountText.length }}
              // Tenuto come rete: su un dispositivo che ignorasse `showSoftInputOnFocus` la
              // tastiera che compare è comunque quella numerica.
              keyboardType="decimal-pad"
              autoFocus={initial === undefined}
              accessibilityLabel={t('expense.amountLabel')}
              style={[
                numeric,
                {
                  minWidth: 80,
                  textAlign: 'right',
                  color: colors.text,
                  fontSize: amountShape.fontSize,
                  letterSpacing: amountShape.letterSpacing,
                  fontWeight: fontWeight.heavy,
                  padding: 0,
                },
              ]}
            />
            <Text
              style={{
                color: colors.textFaint,
                fontSize: amountShape.symbol,
                fontWeight: fontWeight.bold,
              }}
            >
              {symbol}
            </Text>
          </View>

          {/* La quota a testa sta **sotto la cifra** e non dentro il gruppo: è la
              conseguenza diretta del numero che si sta scrivendo. Sparisce a gruppo aperto,
              dove a dirla sono i riquadri delle persone, uno per uno. */}
          {!aside && mode === 'equal' && members.length > 1 && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
              {splitPreview(amountCents, members.length, symbol)}
            </Text>
          )}
          {amountError !== undefined && (
            <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>{amountError}</Text>
          )}
        </View>

        {/* 2. I tre gruppi, in un contenitore solo: sono le tre domande che restano dopo
            l'importo, e una card per ciascuna le farebbe sembrare tre schermate. */}
        <Card variant="flat" style={{ marginHorizontal: spacing.lg }}>
          {/* **La nota è il primo campo, e non si apre: si scrive.** Stava dentro
              «Dettagli», dove nessuno la trovava — chi registra una spesa la sta anche
              nominando, e il nome non è un dettaglio facoltativo da andare a cercare sotto
              una riga chiusa. È l'unica riga della card senza chevron, di proposito: dice
              che qui non c'è niente da aprire. */}
          <View
            style={[
              styles.noteRow,
              { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.sm + 2 },
            ]}
          >
            <View style={styles.icon}>
              <Feather name="edit-3" size={15} color={colors.textMuted} />
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              onFocus={() => setWritingNote(true)}
              onBlur={() => setWritingNote(false)}
              placeholder={t('expense.notePrompt')}
              placeholderTextColor={colors.textFaint}
              returnKeyType="done"
              accessibilityLabel={t('expense.noteLabel')}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: fontSize.md,
                paddingVertical: spacing.sm,
              }}
            />
          </View>
          <Divider inset={false} />

          {/* Con una persona sola «chi paga e come si divide» non si pone. */}
          {members.length > 1 && (
            <>
              <GroupRow
                title={t('expense.whoAndHow')}
                summary={whoSummary}
                open={openGroup === 'who'}
                onPress={() => toggleGroup('who')}
                left={<AvatarStack people={members} size={22} surface={colors.surface} />}
              />
              {openGroup === 'who' && (
                <View style={{ padding: spacing.lg, gap: spacing.md }}>
                  <View style={styles.people}>
                    {members.map((member) => (
                      <PersonBox
                        key={member.id}
                        member={member}
                        selected={member.id === paidBy}
                        isMe={member.id === myMemberId}
                        shareCents={previewShareCents(
                          mode,
                          amountCents,
                          memberIds,
                          member.id,
                          paidBy,
                        )}
                        symbol={symbol}
                        onPress={() => setPaidBy(member.id)}
                      />
                    ))}
                  </View>

                  <View style={styles.chips}>
                    {SPLIT_MODES.map((value) => (
                      <Chip
                        key={value}
                        label={splitModeLabel(value, members.length)}
                        selected={value === mode}
                        onPress={() => chooseMode(value)}
                      />
                    ))}
                  </View>

                  {/* Per `equal` non c'è niente da aggiungere: la quota a testa la dicono
                      già i riquadri qui sopra, persona per persona. */}
                  {mode === 'single' && (
                    <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                      {t('expense.singleHint')}
                    </Text>
                  )}

                  {mode === 'custom' && (
                    <View style={{ gap: spacing.sm }}>
                      {members.map((member) => (
                        <View key={member.id} style={styles.shareRow}>
                          <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sm }}>
                            {member.name}
                          </Text>
                          <TextInput
                            value={customShares[member.id] ?? ''}
                            onChangeText={(text) =>
                              setCustomShares((current) => ({ ...current, [member.id]: text }))
                            }
                            placeholder={t('expense.amountPlaceholder')}
                            placeholderTextColor={colors.textFaint}
                            // Le quote libere restano sulla tastiera di sistema: sono più
                            // campi, e un tastierino solo dovrebbe sapere in quale sta
                            // scrivendo. Il tastierino serve all'importo, che è **la**
                            // schermata; qui `decimal-pad` fa ancora da guardiano.
                            keyboardType="decimal-pad"
                            accessibilityLabel={t('expense.shareOf', { name: member.name })}
                            style={[numeric, fieldBox, { width: 110, textAlign: 'right' }]}
                          />
                        </View>
                      ))}
                      {/* Quote che non sommano al totale produrrebbero un saldo sbagliato:
                          VaultStore le rifiuterebbe, ma dirlo qui è più utile che scoprirlo
                          con un errore al salvataggio. */}
                      <Text
                        style={{
                          color: customGap === 0 ? colors.income : colors.danger,
                          fontSize: fontSize.xxs,
                        }}
                      >
                        {describeGap(customGap, amountCents, symbol)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <Divider inset={openGroup !== 'who'} />
            </>
          )}

          <GroupRow
            title={t('expense.category')}
            summary={categorySummary(category?.name ?? null)}
            open={openGroup === 'category'}
            onPress={() => toggleGroup('category')}
            left={
              category === undefined ? (
                <Feather name="tag" size={15} color={colors.textMuted} />
              ) : (
                <CategoryIcon icon={category.icon} color={category.color} size={15} />
              )
            }
          />
          {openGroup === 'category' && (
            <View style={[styles.chips, { padding: spacing.lg }]}>
              {categories.map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  selected={item.id === categoryId}
                  color={item.color}
                  icon={<CategoryIcon icon={item.icon} color={item.color} size={14} />}
                  onPress={() => setCategoryId(item.id === categoryId ? null : item.id)}
                />
              ))}
            </View>
          )}
          <Divider inset={openGroup !== 'category'} />

          {/* 3. I dettagli: data, nota, negozio e tag. Data e nota hanno perso la card
              propria (decisione 9) — erano l'unico blocco a non essere né soldi né
              facoltativo, e occupavano una card intera per due righe che si toccano di
              rado. Il riassunto chiuso continua a dire la data, quindi non si perde nulla. */}
          <GroupRow
            title={t('expense.group.details')}
            summary={detailsSummary(date, storeDraft.trim() === '' ? store : storeDraft, tags)}
            open={openGroup === 'details'}
            onPress={() => toggleGroup('details')}
            left={<Feather name="list" size={15} color={colors.textMuted} />}
            /* «Dettagli» resta scritto anche da chiuso, col riassunto a destra: è l'unico
               dei tre a mettere insieme quattro campi diversi, e senza un nome la riga
               direbbe «Oggi · una nota» senza dire di cosa. */
            keepTitle
          />
          {openGroup === 'details' && (
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              {/* La data **si sceglie**, dallo Step 58. Il commento che stava qui diceva
                  che serviva `@react-native-community/datetimepicker`, e quindi una build
                  EAS: era vero quando è stato scritto e ha smesso di esserlo allo Step 27,
                  quando i filtri dei Grafici hanno prodotto una griglia di giorni fatta di
                  `Pressable`. È quella, ora condivisa in `features/calendar/`.

                  Si apre **in linea** e non in un foglio: il gruppo apribile è già il
                  contenitore, e un `Modal` dentro un gruppo aperto sarebbe un secondo
                  livello per la stessa domanda. */}
              <View style={{ gap: spacing.sm }}>
                <Pressable
                  onPress={() => setPickingDate((open) => !open)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: pickingDate }}
                  /* Il nome del campo e il suo valore insieme: la riga da sola direbbe
                     «Ieri» senza dire di cosa, come per i tre gruppi qui sopra. */
                  accessibilityLabel={`${t('expense.date')}, ${formatDayTitle(date)}`}
                  style={({ pressed }) => [
                    styles.detailRow,
                    { backgroundColor: pressed ? colors.surfacePressed : 'transparent' },
                  ]}
                >
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {t('expense.date')}
                  </Text>
                  <View style={styles.dateValue}>
                    <Text style={[numeric, { color: colors.text, fontSize: fontSize.sm }]}>
                      {formatDayTitle(date)}
                    </Text>
                    <Feather
                      name={pickingDate ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textFaint}
                    />
                  </View>
                </Pressable>
                {pickingDate && <DayPicker value={date} onChange={setDate} />}
              </View>

              {/* Negozio e tag sono **lo stesso campo con due cardinalità**, dallo Step
                  59: si sceglie da un elenco del gruppo invece di riscrivere. Il `+` mette
                  una voce nuova in elenco e la sceglie. */}
              <View style={{ gap: spacing.sm }}>
                <Text style={sectionTitle}>{t('expense.extra.store')}</Text>
                <VocabularyPicker
                  kind="store"
                  chosen={store === '' ? [] : [store]}
                  onToggle={(name) => setStore(storeKey(name) === storeKey(store) ? '' : name)}
                  draft={storeDraft}
                  onDraftChange={setStoreDraft}
                  onCommitDraft={commitStoreDraft}
                />
              </View>

              <View style={{ gap: spacing.sm }}>
                <Text style={sectionTitle}>{t('expense.extra.tags')}</Text>
                <VocabularyPicker
                  kind="tag"
                  chosen={tags}
                  onToggle={toggleTag}
                  draft={tagDraft}
                  onDraftChange={setTagDraft}
                  onCommitDraft={commitTagDraft}
                />
              </View>
            </View>
          )}
        </Card>

        {/* L'eliminazione **scorre col contenuto** invece di stare nella barra in fondo:
            è rara e distruttiva, e affiancarla all'azione che si tocca ogni volta è il modo
            più rapido per farle premere per sbaglio. */}
        {onDelete !== undefined && (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Button label={t('expense.deleteAction')} variant="danger" onPress={onDelete} />
          </View>
        )}
      </ScrollView>

      {/* Il tastierino si smonta a gruppo aperto: lo spazio serve a ciò che si sta
          scegliendo, e l'importo in quel momento non si sta scrivendo. */}
      {!aside && <AmountPad onKey={(char) => setAmountText((text) => applyKey(text, char))} />}

      {/* `insets.bottom`: la barra sta **fuori** dallo scorrimento, quindi niente la spinge
          più sopra la barra dei gesti di Android. `ModalScreen` applica solo l'inset
          superiore — il suo commento dice «la safe area inferiore è gestita dalla tab bar»,
          che è vero per le schermate a tab e falso per una modale, che la tab bar la copre.
          Finché il salva scorreva col contenuto non si vedeva; da quando è ancorato, sì. */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        }}
      >
        <Button
          label={submitLabel}
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{ minHeight: 54 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * La riga chiusa di un gruppo, e la sua intestazione quando è aperto.
 *
 * Da chiusa **il valore prende il posto del nome**: «Paghi tu · metà e metà», «Casa». Il
 * nome del gruppo torna solo all'apertura, quando il valore è sotto in chiaro e la riga deve
 * dire di cosa si sta parlando. Fa eccezione «Dettagli» (`keepTitle`), che mette insieme
 * quattro campi e senza nome non si capirebbe.
 *
 * **L'annuncio per TalkBack li dice sempre tutti e due**, aperta o chiusa: la scorciatoia
 * visiva di togliere il nome funziona perché l'icona a sinistra lo compensa, e un'icona non
 * si legge ad alta voce.
 */
function GroupRow({
  title,
  summary,
  open,
  onPress,
  left,
  keepTitle = false,
}: {
  title: string;
  summary: SummaryPart[];
  open: boolean;
  onPress: () => void;
  left: ReactNode;
  keepTitle?: boolean;
}) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  const spoken = [title, ...summary.map((part) => part.text)].join(', ');
  const showTitle = open || keepTitle;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={spoken}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.lg,
        backgroundColor: open || pressed ? colors.surfacePressed : 'transparent',
      })}
    >
      <View style={styles.icon}>{left}</View>

      {showTitle && (
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.md,
            fontWeight: open ? fontWeight.semibold : fontWeight.regular,
          }}
        >
          {title}
        </Text>
      )}

      {/* Da aperta il riassunto sparisce: il valore è già sotto, in chiaro e modificabile. */}
      {!open && (
        <Text
          numberOfLines={1}
          style={{
            flex: showTitle ? 0 : 1,
            flexShrink: 1,
            textAlign: showTitle ? 'right' : 'left',
            // Label a `md` e valore a `sm` è la stessa coppia di `ListRow`: quando il
            // valore prende il posto della label ne prende anche la misura.
            fontSize: showTitle ? fontSize.sm : fontSize.md,
          }}
        >
          {summary.map((part, index) => (
            <Text key={index} style={{ color: toneColor(part.tone, colors) }}>
              {index === 0 ? '' : ' · '}
              {part.text}
            </Text>
          ))}
        </Text>
      )}

      <Feather
        name={open ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={open ? colors.textMuted : colors.textFaint}
      />
    </Pressable>
  );
}

/**
 * Il colore di un pezzo di riassunto.
 *
 * `faint` **solo per i segnaposto**: è la regola della decisione 8, e il posto dove non
 * tradirla è questo — una riga scritta tutta a 2,1:1 di contrasto è una riga muta, cioè
 * esattamente il difetto che i tre gruppi dovevano togliere.
 */
function toneColor(
  tone: SummaryPart['tone'],
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (tone === 'strong') return colors.text;
  if (tone === 'muted') return colors.textMuted;
  if (tone === 'danger') return colors.danger;
  return colors.textFaint;
}

/** Il filetto fra due righe. Rientrato fra due righe chiuse, a tutta larghezza sotto un gruppo aperto. */
function Divider({ inset }: { inset: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.divider,
        marginLeft: inset ? ROW_INSET : 0,
      }}
    />
  );
}

/**
 * Il riquadro di una persona: chi ha pagato, e quanto gli tocca.
 *
 * Selezionato prende il **colore del membro**, non l'accento: è la stessa tinta con cui
 * quella persona compare negli avatar e nei grafici, quindi il riquadro dice *chi* e non
 * solo *scelto*. L'iniziale e il nome ci sono sempre, quindi il colore non porta l'identità
 * da solo.
 */
function PersonBox({
  member,
  selected,
  isMe,
  shareCents,
  symbol,
  onPress,
}: {
  member: Member;
  selected: boolean;
  isMe: boolean;
  shareCents: number | null;
  symbol: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t('expense.paidBy', { name: member.name })}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: 120,
        alignItems: 'center',
        gap: 4,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? member.color : colors.border,
        backgroundColor: selected
          ? member.color + '22'
          : pressed
            ? colors.surfacePressed
            : 'transparent',
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: member.color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.textOnAccent, fontSize: 11, fontWeight: fontWeight.bold }}>
          {initialOf(member.name)}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontSize: fontSize.sm,
          fontWeight: selected ? fontWeight.semibold : fontWeight.regular,
        }}
      >
        {isMe ? t('expense.me') : member.name}
      </Text>
      {/* La quota si aggiorna mentre si scrive l'importo: è ciò che rende visibile la
          differenza fra le tre modalità senza doverle provare una a una. */}
      <Text style={[numeric, { color: colors.textFaint, fontSize: fontSize.xxs }]}>
        {shareCents === null ? ' ' : formatMoney(shareCents, symbol)}
      </Text>
    </Pressable>
  );
}

const SPLIT_MODES: SplitMode[] = ['equal', 'custom', 'single'];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  amount: { alignItems: 'center', gap: 6, paddingBottom: 20 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // `minHeight: 44` da quando la riga si tocca (Step 58): prima era testo, e un bersaglio
  // alto quanto una riga di `sm` sarebbe sotto la soglia di qualunque dito. Stessa famiglia
  // del `minHeight: 52` di `Button` e dell'`hitSlop` dei chevron del mese.
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  dateValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteRow: { flexDirection: 'row', alignItems: 'center' },
  // `minWidth` e non `width`: le tre icone sono da 22, ma al posto della prima c'è la pila
  // degli avatar, che è più larga di quanto sono i cerchi perché si sovrappongono. Fissata a
  // 22 la schiaccerebbe; il filetto resta comunque allineato sotto le icone singole.
  icon: { minWidth: 22, alignItems: 'center' },
});
