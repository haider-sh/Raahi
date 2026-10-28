import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Text } from './text';

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="caption" bold color="textSecondary" accessibilityRole="header" style={styles.header}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
});
