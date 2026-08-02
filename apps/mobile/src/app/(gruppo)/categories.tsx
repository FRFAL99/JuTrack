import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ModalScreen } from '@/components/ModalScreen';
import { CategoryIcon } from '@/features/categories/CategoryIcon';
import { useCategories, useExpenses, useVaultStore } from '@/state';
import { useTheme } from '@/theme';

/**
 * Nomi Feather, non più emoji: è questo il valore che finisce nel campo `icon` della
 * categoria. Le categorie già esistenti continuano a contenere un'emoji e restano
 * leggibili — a tradurle è `CATEGORY_ICONS`, in sola lettura — quindi non serve alcuna
 * migrazione del documento condiviso.
 */
const ICONS = [
  'shopping-cart',
  'home',
  'coffee',
  'truck',
  'thermometer',
  'film',
  'send',
  'gift',
  'tag',
  'smartphone',
  'heart',
  'package',
] as const;

export default function CategoriesScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const store = useVaultStore();
  const categories = useCategories(true);
  const expenses = useExpenses();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICONS[0]);

  const handleAdd = (): void => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    store.addCategory({ name: trimmed, icon, color: '#868E96' });
    setName('');
  };

  const handleToggleArchive = (id: string, archived: boolean, categoryName: string): void => {
    if (archived) {
      store.updateCategory(id, { archived: false });
      return;
    }

    // Le categorie non si cancellano: le spese passate continuano a riferirle e
    // resterebbero orfane. Si archiviano, sparendo dalle scelte future.
    const used = expenses.filter((e) => e.categoryId === id).length;
    Alert.alert(
      `Archiviare «${categoryName}»?`,
      used === 0
        ? 'Non comparirà più fra le categorie selezionabili.'
        : `${used} ${used === 1 ? 'spesa usa' : 'spese usano'} questa categoria. ` +
            'Restano invariate: la categoria sparisce solo dalle scelte future.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Archivia', onPress: () => store.updateCategory(id, { archived: true }) },
      ],
    );
  };

  return (
    <ModalScreen title="Categorie">
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <View style={styles.chips}>
              {ICONS.map((candidate) => (
                <Pressable
                  key={candidate}
                  onPress={() => setIcon(candidate)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: candidate === icon }}
                  style={{
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: candidate === icon ? colors.accent + '25' : colors.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: candidate === icon ? colors.accent : colors.border,
                  }}
                >
                  <CategoryIcon
                    icon={candidate}
                    color={candidate === icon ? colors.accent : colors.textMuted}
                    size={18}
                  />
                </Pressable>
              ))}
            </View>

            <View style={[styles.addRow, { gap: spacing.sm }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={handleAdd}
                placeholder="Nome della categoria"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                accessibilityLabel="Nome della nuova categoria"
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: fontSize.md,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  padding: spacing.md,
                }}
              />
              <Pressable
                onPress={handleAdd}
                disabled={name.trim() === ''}
                accessibilityRole="button"
                accessibilityLabel="Aggiungi categoria"
                style={{
                  paddingHorizontal: spacing.lg,
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: colors.accent,
                  opacity: name.trim() === '' ? 0.4 : 1,
                }}
              >
                <Text style={{ color: colors.textOnAccent, fontWeight: fontWeight.semibold }}>
                  Aggiungi
                </Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleToggleArchive(item.id, item.archived, item.name)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              backgroundColor: pressed ? colors.surfacePressed : colors.surface,
              opacity: item.archived ? 0.45 : 1,
            })}
          >
            <CategoryIcon icon={item.icon} color={item.color} size={20} />
            <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}>{item.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
              {item.archived ? 'Ripristina' : 'Archivia'}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
        )}
      />
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addRow: { flexDirection: 'row' },
});
