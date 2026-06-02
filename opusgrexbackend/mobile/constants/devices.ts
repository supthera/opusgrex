/**
 * Mobile device detection patterns
 * Update these patterns when supporting new device types
 */

/**
 * Regular expression to detect mobile and tablet devices
 * Supports: Android, iOS, BlackBerry, Opera Mini, and other mobile platforms
 */
export const MOBILE_DEVICE_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Regular expression to detect specifically tablet devices
 */
export const TABLET_PATTERN = /iPad|Android/;

/**
 * Regular expression to exclude mobile phones when detecting tablets
 */
export const MOBILE_EXCLUDE_PATTERN = /Mobile/;

/**
 * List of supported mobile platforms (for documentation)
 */
export const SUPPORTED_PLATFORMS = [
  'Android',
  'iOS (iPhone, iPad, iPod)',
  'BlackBerry',
  'Opera Mini',
  'WebOS devices',
] as const;
