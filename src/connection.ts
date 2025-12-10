/**
 * Abstract Connection class
 */

export interface BaseSettings {
  // Basic settings that all connections might need
}

export abstract class Connection<T extends BaseSettings = BaseSettings> {
  protected settings: T;

  constructor(settings: T) {
    this.settings = settings;
  }

  /**
   * Initialize the connection
   */
  abstract initialize(): void;

  /**
   * Test the connection
   */
  abstract testConnection(): Promise<void>;

  /**
   * Upload file
   */
  abstract upload(buffer: Buffer, key: string, contentType: string): Promise<any>;

  /**
   * Check if connection is configured
   */
  abstract isConfigured(): boolean;

  /**
   * Update settings and reinitialize
   */
  abstract updateSettings(settings: T): void;

  /**
   * Generate upload key for the file
   */
  abstract generateUploadKey(fileName: string): string;

  /**
   * Get content type from format
   */
  abstract getContentType(format: string): string;
}