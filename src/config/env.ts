const rawUseMock = import.meta.env?.VITE_USE_MOCK_API;

export const ENV = {
  /**
   * Toggle between local simulated API (true) and Firebase Auth + Firestore (false).
   * Defaults to false so real Firebase Auth and Firestore are active.
   */
  USE_MOCK_API: rawUseMock === 'true',
  /**
   * Base URL for optional custom HTTP backend when not using Firebase or mock mode.
   */
  API_BASE_URL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
} as const;
