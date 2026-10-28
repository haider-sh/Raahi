import { useTranslation } from 'react-i18next';
import { Text as RNText, type TextProps } from 'react-native';

import { Fonts, URDU_LINE_HEIGHT, useColors, type Palette } from '@/constants/theme';

const SIZES = {
  display: 32,
  title: 22,
  heading: 18,
  body: 16,
  caption: 14,
} as const;

export type TextVariant = keyof typeof SIZES;

type Props = TextProps & {
  variant?: TextVariant;
  bold?: boolean;
  color?: keyof Palette;
  /** Latin-only content (route codes, numbers): skip the Urdu font even in Urdu. */
  latin?: boolean;
};

/** All app text goes through this, so Urdu gets the Nastaliq font and a tall enough line height. */
export function Text({ variant = 'body', bold, color = 'text', latin, style, ...rest }: Props) {
  const { i18n } = useTranslation();
  const colors = useColors();
  const size = SIZES[variant];
  const urdu = i18n.language === 'ur' && !latin;
  return (
    <RNText
      {...rest}
      style={[
        { color: colors[color], fontSize: size, writingDirection: 'auto' },
        urdu
          ? { fontFamily: bold ? Fonts.urduBold : Fonts.urdu, lineHeight: Math.round(size * URDU_LINE_HEIGHT) }
          : { fontWeight: bold ? '700' : '400', lineHeight: Math.round(size * 1.35) },
        style,
      ]}
    />
  );
}
