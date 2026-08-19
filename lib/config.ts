export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'Europe/Belgrade';
export const LESSON_MINUTES = 45;
export const BREAK_MINUTES = 15;
export const SLOT_MINUTES = LESSON_MINUTES + BREAK_MINUTES;
export const BOOKING_HOLD_MINUTES = 30;
export const PAYMENT_REVIEW_HOURS = 24;
export const MAX_BOOKING_DAYS = 30;
export const MIN_BOOKING_HOURS = 24;
export const LESSON_CONTENT_LOCK_HOURS = 3;
export const PACKAGE_CREDITS = 4;
export const PACKAGE_VALID_DAYS = 60;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const SAFE_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp'
]);
