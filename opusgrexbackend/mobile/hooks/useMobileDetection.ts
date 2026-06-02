import { useLayoutEffect, useState } from 'react';
import { MOBILE_DEVICE_PATTERN, TABLET_PATTERN, MOBILE_EXCLUDE_PATTERN } from '../constants/devices';

/**
 * Custom hook to detect if the device is mobile or tablet
 * Uses centralized device patterns from constants/devices.ts
 * @returns boolean | null - null during hydration, true if mobile, false otherwise
 */
export function useMobileDetection(): boolean | null {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const isMobileDevice = MOBILE_DEVICE_PATTERN.test(navigator.userAgent);
    const isTablet = TABLET_PATTERN.test(navigator.userAgent) && !MOBILE_EXCLUDE_PATTERN.test(navigator.userAgent);
    
    // For desktop browsers (no mobile user agent), force false regardless of window width
    // Only use window width detection if user agent indicates mobile/tablet
    if (isMobileDevice || isTablet) {
      setIsMobileOrTablet(true);
    } else {
      // Desktop browser - always show desktop view
      setIsMobileOrTablet(false);
    }
  }, []);

  return isMobileOrTablet;
}
