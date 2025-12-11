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
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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