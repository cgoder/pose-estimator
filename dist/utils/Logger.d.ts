/**
 * 日志系统
 * 提供结构化的日志记录和管理
 */
export declare enum LogLevel {
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
export declare class Logger {
    private logs;
    private maxLogs;
    private currentLevel;
    private categories;
    constructor(level?: LogLevel);
    /**
     * 设置日志级别
     */
    setLevel(level: LogLevel): void;
    /**
     * 记录调试信息
     */
    debug(message: string, category?: string, data?: any): void;
    /**
     * 记录信息
     */
    info(message: string, category?: string, data?: any): void;
    /**
     * 记录警告
     */
    warn(message: string, category?: string, data?: any): void;
    /**
     * 记录错误
     */
    error(message: string, category?: string, data?: any, error?: Error): void;
    /**
     * 内部日志记录方法
     */
    private log;
    /**
     * 输出到控制台
     */
    private outputToConsole;
    /**
     * 获取日志
     */
    getLogs(level?: LogLevel, category?: string): LogEntry[];
    /**
     * 获取所有类别
     */
    getCategories(): string[];
    /**
     * 清除日志
     */
    clear(): void;
    /**
     * 导出日志为JSON
     */
    exportLogs(): string;
    /**
     * 获取日志统计
     */
    getStats(): {
        [key in LogLevel]: number;
    };
}
export declare const logger: Logger;
export declare const log: {
    debug: (message: string, category?: string, data?: any) => void;
    info: (message: string, category?: string, data?: any) => void;
    warn: (message: string, category?: string, data?: any) => void;
    error: (message: string, category?: string, data?: any, error?: Error) => void;
};
//# sourceMappingURL=Logger.d.ts.map