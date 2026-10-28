import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { SectionHeader } from '@/components/section-header';
import { Text } from '@/components/text';
import { Spacing, useColors } from '@/constants/theme';
import { signOut, useSession } from '@/features/account/session';
import { setSavedPlace, useSavedStore } from '@/features/saved/store';
import { isExpoGo, LANGUAGES, setLanguage } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import type { Lang } from '@/lib/format';
import type { ApiErrorCode } from '@/services/api/errors';
import { devToggles, FORCEABLE_ERRORS, setForceError } from '@/services/api/mock/dev-toggles';

export default function SettingsScreen() {
  const colors = useColors();
  const { t, lang, name } = useFormat();
  const { status, user } = useSession();
  const { home, work } = useSavedStore();
  const [forced, setForced] = useState<ApiErrorCode | null>(devToggles.forceError);

  const chooseLanguage = (code: Lang) => {
    if (code === lang) return;
    Alert.alert(t('settings.languageTitle'), isExpoGo ? t('settings.languageExpoGo') : t('settings.languageReload'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), onPress: () => setLanguage(code) },
    ]);
  };

  const confirmSignOut = () =>
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);

  const force = (code: ApiErrorCode | null) => {
    setForceError(code);
    setForced(code);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title" bold style={styles.title}>
          {t('tabs.settings')}
        </Text>

        <SectionHeader title={t('settings.language')} />
        {LANGUAGES.map((l) => (
          <ListRow
            key={l.code}
            title={l.label}
            onPress={() => chooseLanguage(l.code)}
            trailing={l.code === lang ? <Icon name="check" color="primary" /> : null}
          />
        ))}

        <SectionHeader title={t('settings.account')} />
        {status === 'signedIn' ? (
          <ListRow
            icon="account-circle"
            title={user?.email ?? '…'}
            trailing={<IconButton icon="logout" label={t('settings.signOut')} onPress={confirmSignOut} />}
          />
        ) : (
          <ListRow
            icon="cloud-upload"
            title={t('settings.signInToBackUp')}
            onPress={() => router.push('/sign-in')}
            chevron
          />
        )}

        <SectionHeader title={t('settings.homeWork')} />
        {(['home', 'work'] as const).map((which) => {
          const place = which === 'home' ? home : work;
          return (
            <ListRow
              key={which}
              icon={which}
              title={t(`saved.${which}`)}
              subtitle={place ? name(place.name) : t('common.notSet')}
              onPress={() => router.push({ pathname: '/search', params: { field: which } })}
              trailing={
                place ? (
                  <IconButton icon="close" label={t('common.clear')} onPress={() => setSavedPlace(which, null)} />
                ) : null
              }
            />
          );
        })}

        <SectionHeader title={t('settings.about')} />
        <ListRow icon="info-outline" title={t('settings.about')} onPress={() => router.push('/about')} chevron />

        {__DEV__ && (
          <>
            <SectionHeader title={`${t('settings.developer')} · ${t('settings.forceError')}`} />
            {[null, ...FORCEABLE_ERRORS.map((e) => e.code)].map((code) => (
              <ListRow
                key={code ?? 'none'}
                title={code ?? t('settings.none')}
                subtitle={code ? FORCEABLE_ERRORS.find((e) => e.code === code)?.methods.join(', ') : undefined}
                onPress={() => force(code)}
                trailing={forced === code ? <Icon name="check" color="primary" /> : null}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  title: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
});
