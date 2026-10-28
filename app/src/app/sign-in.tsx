import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { Radius, Spacing, TOUCH, useColors } from '@/constants/theme';
import { register, signIn } from '@/features/account/session';
import { useFormat } from '@/i18n/use-format';
import { isApiError } from '@/services/api/errors';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Optional sign-in (D20). Only Settings → Account and the Saved tab hint open this. */
export default function SignInScreen() {
  const colors = useColors();
  const { t } = useFormat();
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = t('signIn.errors.email');
    if (password.length < 8) next.password = t('signIn.errors.password');
    setErrors(next);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      if (mode === 'signIn') await signIn(email.trim(), password);
      else await register(email.trim(), password, displayName.trim() || undefined);
      router.back();
    } catch (e) {
      const code = isApiError(e) ? e.code : null;
      const known = code === 'INVALID_CREDENTIALS' || code === 'EMAIL_TAKEN' || code === 'NETWORK';
      setErrors({ form: known ? t(`signIn.errors.${code}`) : t('signIn.errors.generic') });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }];
  const title = mode === 'signIn' ? t('signIn.titleSignIn') : t('signIn.titleRegister');

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text color="textSecondary">{t('signIn.why')}</Text>

        <View style={styles.field}>
          <Text bold>{t('signIn.email')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            accessibilityLabel={t('signIn.email')}
            style={inputStyle}
          />
          {errors.email && <Text color="danger">{errors.email}</Text>}
        </View>

        <View style={styles.field}>
          <Text bold>{t('signIn.password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            accessibilityLabel={t('signIn.password')}
            style={inputStyle}
          />
          {errors.password && <Text color="danger">{errors.password}</Text>}
        </View>

        {mode === 'register' && (
          <View style={styles.field}>
            <Text bold>{t('signIn.name')}</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              accessibilityLabel={t('signIn.name')}
              style={inputStyle}
            />
          </View>
        )}

        {errors.form && <Text color="danger">{errors.form}</Text>}

        <Button label={title} onPress={submit} loading={busy} />
        <Button
          variant="ghost"
          label={mode === 'signIn' ? t('signIn.toggleToRegister') : t('signIn.toggleToSignIn')}
          onPress={() => {
            setMode(mode === 'signIn' ? 'register' : 'signIn');
            setErrors({});
          }}
        />
        <Button variant="secondary" label={t('signIn.skip')} onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  input: { minHeight: TOUCH, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: 16 },
});
