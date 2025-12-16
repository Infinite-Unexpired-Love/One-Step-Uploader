/**
 * General utility functions (non-image related)
 */

import { Logger } from "./logger";

const logger = Logger.getInstance();

/**
 * Safe error wrapper to prevent sensitive data leakage
 */
export function wrapError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    const sanitizedMessage = `${context}: ${error.message}`;
    logger.error(sanitizedMessage, error);
    return new Error(sanitizedMessage);
  }

  const genericMessage = `${context}: Unknown error occurred`;
  logger.error(genericMessage, error);
  return new Error(genericMessage);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Convert ArrayBuffer to Buffer
 */
export function arrayBufferToBuffer(ab: ArrayBuffer): Buffer {
  return Buffer.from(ab);
}