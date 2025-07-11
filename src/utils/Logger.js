/**
 * 日志管理工具类
 * 提供统一的日志记录功能，支持不同级别和格式化输出
 */

import { DEBUG_CONFIG } from '../config/constants.js';

/**
 * 日志级别枚举
 */
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

/**
 * 日志级别映射
 */
const LEVEL_NAMES = {
    [LOG_LEVELS.DEBUG]: 'DEBUG',
    [LOG_LEVELS.INFO]: 'INFO',
    [LOG_LEVELS.WARN]: 'WARN',
    [LOG_LEVELS.ERROR]: 'ERROR'
};

/**
 * 日志颜色映射
 */
const LEVEL_COLORS = {
    [LOG_LEVELS.DEBUG]: '#6B7280', // 灰色
    [LOG_LEVELS.INFO]: '#3B82F6',  // 蓝色
    [LOG_LEVELS.WARN]: '#F59E0B',  // 黄色
    [LOG_LEVELS.ERROR]: '#EF4444'  // 红色
};

/**
 * 日志图标映射
 */
const LEVEL_ICONS = {
    [LOG_LEVELS.DEBUG]: '🔍',
    [LOG_LEVELS.INFO]: 'ℹ️',
    [LOG_LEVELS.WARN]: '⚠️',
    [LOG_LEVELS.ERROR]: '❌'
};

export class Logger {
    constructor(name = 'App', options = {}) {
        this.name = name;
        this.options = {
            enableTimestamp: true,
            enableColors: true,
            enableIcons: true,
            minLevel: this._getMinLevel(),
            ...options
        };
    }

    /**
     * 获取最小日志级别
     * @private
     */
    _getMinLevel() {
        const configLevel = DEBUG_CONFIG.LOG_LEVEL?.toLowerCase();
        switch (configLevel) {
            case 'debug': return LOG_LEVELS.DEBUG;
            case 'info': return LOG_LEVELS.INFO;
            case 'warn': return LOG_LEVELS.WARN;
            case 'error': return LOG_LEVELS.ERROR;
            default: return LOG_LEVELS.INFO;
        }
    }

    /**
     * 检查是否应该记录指定级别的日志
     * @param {number} level - 日志级别
     * @returns {boolean}
     */
    _shouldLog(level) {
        return level >= this.options.minLevel;
    }

    /**
     * 格式化时间戳
     * @returns {string}
     */
    _formatTimestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');
    }

    /**
     * 格式化日志消息
     * @param {number} level - 日志级别
     * @param {string} message - 消息
     * @param {Array} args - 额外参数
     * @returns {Array} 格式化后的参数数组
     */
    _formatMessage(level, message, args) {
        const parts = [];
        
        // 时间戳
        if (this.options.enableTimestamp) {
            parts.push(`[${this._formatTimestamp()}]`);
        }
        
        // 日志级别和图标
        const levelName = LEVEL_NAMES[level];
        const icon = this.options.enableIcons ? LEVEL_ICONS[level] : '';
        parts.push(`${icon} [${levelName}]`);
        
        // 日志器名称
        parts.push(`[${this.name}]`);
        
        // 消息
        parts.push(message);
        
        const formattedMessage = parts.join(' ');
        
        // 如果支持颜色，使用样式化输出
        if (this.options.enableColors && typeof console.log === 'function') {
            const color = LEVEL_COLORS[level];
            return [`%c${formattedMessage}`, `color: ${color}; font-weight: bold;`, ...args];
        }
        
        return [formattedMessage, ...args];
    }

    /**
     * 记录调试日志
     * @param {string} message - 消息
     * @param {...any} args - 额外参数
     */
    debug(message, ...args) {
        if (!this._shouldLog(LOG_LEVELS.DEBUG)) return;
        const formatted = this._formatMessage(LOG_LEVELS.DEBUG, message, args);
        console.debug(...formatted);
    }

    /**
     * 记录信息日志
     * @param {string} message - 消息
     * @param {...any} args - 额外参数
     */
    info(message, ...args) {
        if (!this._shouldLog(LOG_LEVELS.INFO)) return;
        const formatted = this._formatMessage(LOG_LEVELS.INFO, message, args);
        console.info(...formatted);
    }

    /**
     * 记录警告日志
     * @param {string} message - 消息
     * @param {...any} args - 额外参数
     */
    warn(message, ...args) {
        if (!this._shouldLog(LOG_LEVELS.WARN)) return;
        const formatted = this._formatMessage(LOG_LEVELS.WARN, message, args);
        console.warn(...formatted);
    }

    /**
     * 记录错误日志
     * @param {string} message - 消息
     * @param {...any} args - 额外参数
     */
    error(message, ...args) {
        if (!this._shouldLog(LOG_LEVELS.ERROR)) return;
        const formatted = this._formatMessage(LOG_LEVELS.ERROR, message, args);
        console.error(...formatted);
    }

    /**
     * 记录性能日志
     * @param {string} operation - 操作名称
     * @param {number} duration - 持续时间(毫秒)
     * @param {Object} details - 详细信息
     */
    performance(operation, duration, details = {}) {
        if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_LOGGING) return;
        
        const level = duration > 16 ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
        const message = `⏱️ ${operation} 耗时: ${duration.toFixed(2)}ms`;
        
        if (this._shouldLog(level)) {
            const formatted = this._formatMessage(level, message, [details]);
            if (level === LOG_LEVELS.WARN) {
                console.warn(...formatted);
            } else {
                console.debug(...formatted);
            }
        }
    }

    /**
     * 记录帧率日志
     * @param {number} fps - 帧率
     * @param {Object} metrics - 性能指标
     */
    fps(fps, metrics = {}) {
        if (!DEBUG_CONFIG.ENABLE_PERFORMANCE_LOGGING) return;
        
        const message = `📊 FPS: ${fps.toFixed(1)}`;
        this.debug(message, metrics);
    }

    /**
     * 记录Canvas调试日志
     * @param {string} message - 消息
     * @param {...any} args - 额外参数
     */
    canvas(message, ...args) {
        if (!DEBUG_CONFIG.ENABLE_CANVAS_DEBUGGING) return;
        this.debug(`🎨 ${message}`, ...args);
    }

    /**
     * 创建子日志器
     * @param {string} childName - 子日志器名称
     * @returns {Logger} 子日志器实例
     */
    child(childName) {
        return new Logger(`${this.name}:${childName}`, this.options);
    }

    /**
     * 设置日志级别
     * @param {number} level - 日志级别
     */
    setLevel(level) {
        this.options.minLevel = level;
    }

    /**
     * 启用/禁用颜色
     * @param {boolean} enabled - 是否启用
     */
    setColors(enabled) {
        this.options.enableColors = enabled;
    }

    /**
     * 启用/禁用时间戳
     * @param {boolean} enabled - 是否启用
     */
    setTimestamp(enabled) {
        this.options.enableTimestamp = enabled;
    }
}

// 默认日志器实例
export const logger = new Logger('InputSourceManager');

// 便捷方法
export const createLogger = (name, options) => new Logger(name, options);

export default Logger;