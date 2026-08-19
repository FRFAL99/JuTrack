import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useAppData } from '@/state/ProfileProvider';
import { MAX_PROFILE_NAME, normalizeProfileName, PROFILE_COLORS } from '@/state/profile';
import { useTheme } from '@/theme';
import { ColorChoice } from './ColorChoice';

/**
 * Prima schermata in assoluto: come ti chiami.
 *
 * Una sola domanda, prima di tutto il resto, perché il profilo deve esistere già quando
 * si crea o si apre un gruppo. Nessun account, nessuna email, nessuna password: il nome
 * serve all'altra persona per riconoscerti nella lista, e non lascia mai il vault.
 */
export function ProfileOnboarding() {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAppData();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PROFILE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeProfileName(name);

  const handleSubmit = (): void => {
    if (normalized === null || saving) return;
    setSaving(true);
    setError(null);
    void register(normalized, color).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    });
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        gap: spacing.lg,
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={{ fontSize: 44 }}>👋</Text>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}
        >
          {t('onboarding.profile.heading')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          {t('onboarding.profile.hint')}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        placeholder={t('you.name.label')}
        placeholderTextColor={colors.textMuted}
        maxLength={MAX_PROFILE_NAME}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel={t('you.name.label')}
        style={{
          color: colors.text,
          fontSize: fontSize.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.md,
        }}
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
          {t('onboarding.profile.colorLabel')}
        </Text>
        <ColorChoice value={color} onChange={setColor} />
      </View>

      {error !== null && (
        <Text style={{ color: colors.warning, fontSize: fontSize.sm }} selectable>
          {error}
        </Text>
      )}

      <Button
        label={saving ? t('onboarding.profile.saving') : t('onboarding.profile.start')}
        onPress={handleSubmit}
        disabled={normalized === null}
        loading={saving}
      />
    </ScrollView>
  );
}
