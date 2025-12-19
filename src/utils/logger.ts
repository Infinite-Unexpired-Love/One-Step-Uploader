/**
 * Logger module with sensitive data filtering
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private readonly pluginName = "One Step Uploader";

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Sanitize error messages to prevent credential leakage
   */
  private sanitizeMessage(message: string): string {
    // Remove potential access keys, secrets, and tokens
    return message
      .replace(/AKIA[0-9A-Z]{16}/gi, "AKIA***************")
      .replace(/[A-Za-z0-9/+=]{40,}/g, "***REDACTED***")
      .replace(/(secret|password|token|key)[\s:=]+[^\s&]+/gi, "$1=***REDACTED***");
  }

  /**
   * Sanitize objects to remove sensitive fields
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};
    const sensitiveKeys = ["accessKeyId", "secretAccessKey", "password", "token", "key", "secret"];

    for (const key in obj) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = "***REDACTED***";
      } else if (typeof obj[key] === "object") {
        sanitized[key] = this.sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }

    return sanitized;
  }

  debug(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const sanitizedMsg = this.sanitizeMessage(message);
      const sanitizedData = data ? this.sanitizeObject(data) : undefined;
      console.debug(`[${this.pluginName}] ${sanitizedMsg}`, sanitizedData || "");
    }
  }

  info(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      const sanitizedMsg = this.sanitizeMessage(message);
      const sanitizedData = data ? this.sanitizeObject(data) : undefined;
      console.info(`[${this.pluginName}] ${sanitizedMsg}`, sanitizedData || "");
    }
  }

  warn(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      const sanitizedMsg = this.sanitizeMessage(message);
      const sanitizedData = data ? this.sanitizeObject(data) : undefined;
      console.warn(`[${this.pluginName}] ${sanitizedMsg}`, sanitizedData || "");
    }
  }

  error(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const sanitizedMsg = this.sanitizeMessage(message);
      let sanitizedError = error;

      if (error instanceof Error) {
        sanitizedError = {
          name: error.name,
          message: this.sanitizeMessage(error.message),
          stack: error.stack ? this.sanitizeMessage(error.stack) : undefined,
        };
      } else if (error) {
        sanitizedError = this.sanitizeObject(error);
      }

      console.error(`[${this.pluginName}] ${sanitizedMsg}`, sanitizedError || "");
    }
  }
}