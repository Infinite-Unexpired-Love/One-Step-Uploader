/**
 * Media Repository class
 */

import { Connection } from "./connection";
import { UploadResult } from "./r2Connection";

export class MediaRepository {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Upload media file
   */
  async upload(buffer: Buffer, fileName: string, contentType: string): Promise<UploadResult> {
    if (!this.connection.isConfigured()) {
      return {
        success: false,
        error: "Connection is not configured properly"
      };
    }

    // Generate a key for the uploaded file using the connection's method
    const key = this.connection.generateUploadKey(fileName);

    // Perform the upload using the connection
    return await this.connection.upload(buffer, key, contentType);
  }
}