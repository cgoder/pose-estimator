/**
 * 日志系统
 * 提供结构化的日志记录和管理
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  category?: string;
  data?: any;
  stack?: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = LogLevel.INFO;
  private categories = new Set<string>();

  constructor(level: LogLevel = LogLevel.INFO) {
    this.currentLevel = level;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * 记录调试信息
   */
  debug(message: string, category?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, category, data);
  }

  /**
   * 记录信息
   */
  info(message: string, category?: string, data?: any): void {
    this.log(LogLevel.INFO, message, category, data);
  }

  /**
   * 记录警告
   */
  warn(message: string, category?: string, data?: any): void {
    this.log(LogLevel.WARN, message, category, data);
  }

  /**
   * 记录错误
   */
  error(message: string, category?: string, data?: any, error?: Error): void {
    this.log(LogLevel.ERROR, message, category, data, error);
  }

  /**
   * 内部日志记录方法
   */
  private log(level: LogLevel, message: string, category?: string, data?: any, error?: Error): void {
    if (level < this.currentLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      category: category || 'default',
      data,
      ...(error?.stack && { stack: error.stack })
    };

    this.logs.push(entry);
    
    if (category) {
      this.categories.add(category);
    }

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    this.outputToConsole(entry);
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const category = entry.category ? `[${entry.category}]` : '';
    const prefix = `${timestamp} ${category}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} DEBUG:`, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(`${prefix} INFO:`, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} WARN:`, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ERROR:`, entry.message, entry.data || '');
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  /**
   * 获取日志
   */
  getLogs(level?: LogLevel, category?: string): LogEntry[] {
    return this.logs.filter(log => {
      if (level !== undefined && log.level !== level) {
        return false;
      }
      if (category && log.category !== category) {
        return false;
      }
      return true;
    });
  }

  /**
   * 获取所有类别
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * 清除日志
   */
  clear(): void {
    this.logs = [];
    this.categories.clear();
  }

  /**
   * 导出日志为JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 获取日志统计
   */
  getStats(): { [key in LogLevel]: number } {
    const stats = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }
}

// 全局日志实例
export const logger = new Logger(
  typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// 便捷的日志方法
export const log = {
  debug: (message: string, category?: string, data?: any) => logger.debug(message, category, data),
  info: (message: string, category?: string, data?: any) => logger.info(message, category, data),
  warn: (message: string, category?: string, data?: any) => logger.warn(message, category, data),
  error: (message: string, category?: string, data?: any, error?: Error) => logger.error(message, category, data, error)
};