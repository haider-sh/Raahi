import { Map, type MapProps } from '@maplibre/maplibre-react-native';
import { StyleSheet, useColorScheme } from 'react-native';

/**
 * OpenFreeMap: free OpenStreetMap vector tiles, no key, no account (D32). Attribution is required;
 * MapLibre's attribution button shows it, and the About screen repeats it.
 */
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

type Props = Omit<MapProps, 'mapStyle'>;

/** Every map in the app: our tile style, no logo, north-up and flat. Override any prop per screen. */
export function BaseMap({ children, ...props }: Props) {
  const scheme = useColorScheme();
  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLES[scheme === 'dark' ? 'dark' : 'light']}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      {...props}>
      {children}
    </Map>
  );
}
