import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing, useColors } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = { icon?: IconName; title?: string; body?: string; tone?: 'info' | 'warning'; children?: ReactNode };

/** An inline notice: empty states, errors and warnings. */
export function Message({ icon = 'info-outline', title, body, tone = 'info', children }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: tone === 'warning' ? colors.highlight : colors.surface },
        tone === 'warning' && { borderColor: colors.highlightBorder, borderWidth: 1 },
      ]}>
      <View style={styles.head}>
        <Icon name={icon} color="textSecondary" />
        <View style={styles.text}>
          {title ? <Text bold>{title}</Text> : null}
          {body ? <Text color="textSecondary">{body}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md },
  head: { flexDirection: 'row', gap: Spacing.md },
  text: { flex: 1, gap: Spacing.xs },
});
