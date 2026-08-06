/**
 * Simple, zero-dependency console logger with ANSI color styling.
 */
export class Logger {
  private static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    request: '\x1b[35m', // Magenta
    response: '\x1b[34m', // Blue
  };

  private static formatTime(): string {
    return new Date().toISOString();
  }

  static info(message: string): void {
    console.log(`${this.colors.dim}[${this.formatTime()}]${this.colors.reset} ${this.colors.info}[INFO]${this.colors.reset} ${message}`);
  }

  static success(message: string): void {
    console.log(`${this.colors.dim}[${this.formatTime()}]${this.colors.reset} ${this.colors.success}[SUCCESS]${this.colors.reset} ${message}`);
  }

  static warn(message: string): void {
    console.warn(`${this.colors.dim}[${this.formatTime()}]${this.colors.reset} ${this.colors.warning}[WARN]${this.colors.reset} ${message}`);
  }

  static error(message: string, error?: any): void {
    console.error(`${this.colors.dim}[${this.formatTime()}]${this.colors.reset} ${this.colors.error}[ERROR]${this.colors.reset} ${message}`);
    if (error) {
      console.error(error);
    }
  }

  static request(method: string, url: string, headers: Record<string, string>, body?: any): void {
    console.log(`\n${this.colors.bright}${this.colors.request}--- OUTGOING REQUEST ---${this.colors.reset}`);
    console.log(`${this.colors.bright}Method:${this.colors.reset} ${method}`);
    console.log(`${this.colors.bright}URL:${this.colors.reset} ${url}`);
    console.log(`${this.colors.bright}Headers:${this.colors.reset} ${JSON.stringify(headers, null, 2)}`);
    if (body) {
      console.log(`${this.colors.bright}Body:${this.colors.reset} ${typeof body === 'object' ? JSON.stringify(body, null, 2) : body}`);
    }
    console.log(`${this.colors.bright}${this.colors.request}------------------------${this.colors.reset}\n`);
  }

  static response(status: number, durationMs: number, headers: Record<string, string>, body?: any): void {
    const statusColor = status >= 200 && status < 300 ? this.colors.success : this.colors.error;
    console.log(`\n${this.colors.bright}${this.colors.response}=== INCOMING RESPONSE ===${this.colors.reset}`);
    console.log(`${this.colors.bright}Status Code:${this.colors.reset} ${statusColor}${status}${this.colors.reset}`);
    console.log(`${this.colors.bright}Duration:${this.colors.reset} ${durationMs}ms`);
    if (body) {
      console.log(`${this.colors.bright}Body:${this.colors.reset} ${typeof body === 'object' ? JSON.stringify(body, null, 2) : body}`);
    }
    console.log(`${this.colors.bright}${this.colors.response}=========================${this.colors.reset}\n`);
  }
}
