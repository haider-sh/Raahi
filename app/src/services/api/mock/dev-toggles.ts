import type { ApiErrorCode } from '../errors';

/**
 * Dev-only switches for the mock API, set from Settings → Developer. They live in memory only,
 * so a reload always starts clean.
 */
export const devToggles: {
  /** The next matching calls fail with this code. */
  forceError: ApiErrorCode | null;
  /** Fake network latency. Tests set this to false. */
  latency: boolean;
} = {
  forceError: null,
  latency: true,
};

export function setForceError(code: ApiErrorCode | null) {
  devToggles.forceError = code;
}

/** Which mock methods each forced error applies to. */
export const FORCEABLE_ERRORS: { code: ApiErrorCode; methods: string[] }[] = [
  { code: 'NO_STOPS_NEARBY', methods: ['plan'] },
  { code: 'NO_ROUTE', methods: ['plan'] },
  { code: 'INVALID_CREDENTIALS', methods: ['login'] },
  { code: 'UNAUTHENTICATED', methods: ['getMe', 'getUserData', 'putUserData'] },
  { code: 'NETWORK', methods: ['*'] },
];
