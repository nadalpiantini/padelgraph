/**
 * Geolocation Client-Side Helpers
 *
 * Browser geolocation API helpers for getting user's current position.
 * Use in client components only (not in server components).
 */

export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Get user's current position from browser
 *
 * Requests high accuracy GPS position with timeout.
 * Best used in client components with user interaction.
 *
 * @param options - Geolocation options
 * @returns Promise with position or error
 */
export async function getCurrentPosition(options?: {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser',
      } as GeolocationError);
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 0, // Don't use cached position
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }

        reject({
          code: error.code,
          message,
        } as GeolocationError);
      },
      defaultOptions
    );
  });
}

/**
 * Watch user's position for continuous updates
 *
 * Useful for real-time tracking during check-in flows.
 *
 * @param callback - Called with each position update
 * @param errorCallback - Called on errors
 * @param options - Geolocation options
 * @returns Watch ID to use with clearWatch()
 */
export function watchPosition(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationError) => void,
  options?: {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
  }
): number | null {
  if (!navigator.geolocation) {
    errorCallback?.({
      code: 0,
      message: 'Geolocation is not supported by this browser',
    });
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Cache for 5 seconds
    ...options,
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      let message = 'Failed to watch location';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location unavailable';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out';
          break;
      }

      errorCallback?.({
        code: error.code,
        message,
      });
    },
    defaultOptions
  );
}

/**
 * Stop watching user's position
 *
 * @param watchId - Watch ID returned from watchPosition()
 */
export function clearWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Check if geolocation is supported
 *
 * @returns True if browser supports geolocation
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Request location permission
 *
 * Modern browsers require user interaction before requesting location.
 * Call this in response to a button click or user gesture.
 *
 * @returns Promise with permission status
 */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (!('permissions' in navigator)) {
    throw new Error('Permissions API not supported');
  }

  const permission = await navigator.permissions.query({ name: 'geolocation' });
  return permission.state;
}
