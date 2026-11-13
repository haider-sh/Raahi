import { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/theme';

import LOGO from './logo.json';

/** On-screen size of the logo box. Must equal `imageWidth` of expo-splash-screen in app.config.ts. */
export const SPLASH_LOGO_SIZE = 200;
const K = SPLASH_LOGO_SIZE / LOGO.size; // logo units -> dp
const TRAVEL_DOT = 30 * K * 2; // diameter of the dot that travels the route
const END_DOT = LOGO.end.r * K * 2;

// Timeline (ms after START_DELAY_MS): travel 0–900, pop + ripple ~850, lift ~800, wordmark
// ~950, hold, fade 1800–2250. About 2.3 s in all, including the start delay.
/** Lets the app underneath finish its first mount (the map is heavy), so the opening frames aren't dropped. */
const START_DELAY_MS = 200;
const TRAVEL_MS = 900;
const LIFT = 36; // dp the logo moves up to make room for the wordmark
const FADE_START_MS = 1800;
const FADE_MS = 450;

/** Point on the logo's route curve at t in [0, 1], in logo units. */
function routePoint(t: number) {
  'worklet';
  const { lineStart: p0, c1, c2, end: p3 } = LOGO;
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

type Props = {
  /** Called once the logo image is on screen: hide the native splash then, so nothing flashes. */
  onReady: () => void;
  /** Called when the animation has finished; unmount the overlay then. */
  onDone: () => void;
};

export function AnimatedSplash({ onReady, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const travel = useSharedValue(0); // 0..1 along the route
  const travelOpacity = useSharedValue(0);
  const endScale = useSharedValue(1);
  const ripple = useSharedValue(0); // 0..1: expands and fades
  const lift = useSharedValue(0); // 0..1
  const word = useSharedValue(0); // 0..1
  const overlay = useSharedValue(1);
  const started = useRef(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    onReady();
    const ease = Easing.inOut(Easing.cubic);
    if (reduceMotion) {
      lift.value = 1;
      word.value = 1;
      overlay.value = withDelay(400, withTiming(0, { duration: 250 }));
      setTimeout(onDone, 700);
      return;
    }
    const at = (ms: number, anim: number) => withDelay(START_DELAY_MS + ms, anim);
    travelOpacity.value = at(0, withSequence(withTiming(1, { duration: 150 }), withDelay(TRAVEL_MS - 280, withTiming(0, { duration: 150 }))));
    travel.value = at(0, withTiming(1, { duration: TRAVEL_MS, easing: ease }));
    endScale.value = at(TRAVEL_MS - 60, withSequence(withTiming(1.28, { duration: 200 }), withTiming(1, { duration: 280 })));
    ripple.value = at(TRAVEL_MS - 40, withTiming(1, { duration: 850, easing: Easing.out(Easing.quad) }));
    lift.value = at(TRAVEL_MS - 100, withTiming(1, { duration: 550, easing: ease }));
    word.value = at(TRAVEL_MS + 50, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    overlay.value = at(FADE_START_MS, withTiming(0, { duration: FADE_MS, easing: Easing.in(Easing.quad) }));
    setTimeout(onDone, START_DELAY_MS + FADE_START_MS + FADE_MS + 50);
  };

  // If the image never reports loading (it's bundled, so it shouldn't happen), start anyway.
  useEffect(() => {
    const t = setTimeout(start, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -LIFT * lift.value }, { scale: 1 + 0.06 * (1 - overlay.value) }],
  }));
  const travelStyle = useAnimatedStyle(() => {
    const p = routePoint(travel.value);
    return {
      opacity: travelOpacity.value,
      transform: [{ translateX: p.x * K - TRAVEL_DOT / 2 }, { translateY: p.y * K - TRAVEL_DOT / 2 }],
    };
  });
  const endStyle = useAnimatedStyle(() => ({ transform: [{ scale: endScale.value }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value === 0 ? 0 : 0.7 * (1 - ripple.value),
    transform: [{ scale: 1 + 1.6 * ripple.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: 12 * (1 - word.value) }],
  }));

  const endPos = { left: LOGO.end.x * K - END_DOT / 2, top: LOGO.end.y * K - END_DOT / 2 };

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.container, overlayStyle]}
    >
      <Animated.View style={[styles.logo, logoStyle]}>
        <Image source={require('@/assets/images/splash-mark.png')} style={styles.logoImage} onLoad={start} fadeDuration={0} />
        <Animated.View style={[styles.dot, styles.ripple, endPos, rippleStyle]} />
        <Animated.View style={[styles.dot, endPos, endStyle]} />
        <Animated.View style={[styles.travel, travelStyle]} />
      </Animated.View>
      <Animated.View style={[styles.wordmark, wordStyle]}>
        <Text style={styles.name}>Raahi</Text>
        <Text style={styles.nameUr}>راہی</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: LOGO.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  logo: { width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE },
  logoImage: { width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE },
  dot: {
    position: 'absolute',
    width: END_DOT,
    height: END_DOT,
    borderRadius: END_DOT / 2,
    backgroundColor: LOGO.colors.amber,
  },
  ripple: { backgroundColor: 'transparent', borderWidth: 3, borderColor: LOGO.colors.amber },
  travel: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: TRAVEL_DOT,
    height: TRAVEL_DOT,
    borderRadius: TRAVEL_DOT / 2,
    backgroundColor: LOGO.colors.amber,
  },
  // Absolutely placed under the logo's final (lifted) position, so it never shifts the logo.
  wordmark: { position: 'absolute', top: '50%', marginTop: SPLASH_LOGO_SIZE / 2 - LIFT - 8, alignItems: 'center' },
  name: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: 1 },
  nameUr: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.urdu, fontSize: 22, lineHeight: 44 },
});
