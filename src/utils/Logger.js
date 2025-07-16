/**
 * 日志记录器模块
 * 负责应用的日志管理、格式化和输出
 */

export class Logger {
    constructor(name = 'App', options = {}) {
        this.name = name;
        
        // 配置选项
        this.config = {
            // 日志级别
            level: options.level || 'info', // 'debug', 'info', 'warn', 'error'
            
            // 输出设置
            enableConsole: options.enableConsole !== false,
            enableStorage: options.enableStorage || false,
            enableRemote: options.enableRemote || false,
            
            // 格式设置
            enableTimestamp: options.enableTimestamp !== false,
            enableColors: options.enableColors !== false,
            enableStackTrace: options.enableStackTrace !== false,
            
            // 存储设置
            maxStorageSize: options.maxStorageSize || 1000, // 最大存储条目数
            storageKey: options.storageKey || 'pose_estimator_logs',
            
            // 远程日志设置
            remoteEndpoint: options.remoteEndpoint || null,
            remoteBatchSize: options.remoteBatchSize || 10,
            remoteFlushInterval: options.remoteFlushInterval || 30000, // 30秒
            
            // 过滤设置
            filters: options.filters || [],
            
            // 性能设置
            enablePerformanceLogging: options.enablePerformanceLogging || false,
            
            ...options
        };
        
        // 日志级别映射
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        // 颜色映射
        this.colors = {
            debug: '#888888',
            info: '#0080ff',
            warn: '#ff8000',
            error: '#ff0000',
            success: '#00ff00'
        };
        
        // 日志存储
        this.logs = [];
        
        // 远程日志缓冲区
        this.remoteBuffer = [];
        
        // 远程发送定时器
        this.remoteTimer = null;
        
        // 性能计时器
        this.timers = new Map();
        
        // 统计信息
        this.stats = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            total: 0
        };
        
        this.init();
    }
    
    /**
     * 初始化日志记录器
     */
    init() {
        // 从存储加载历史日志
        if (this.config.enableStorage) {
            this.loadFromStorage();
        }
        
        // 启动远程日志发送
        if (this.config.enableRemote && this.config.remoteEndpoint) {
            this.startRemoteLogging();
        }
        
        // 监听页面卸载事件
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flush();
            });
            
            // 监听未捕获的错误
            window.addEventListener('error', (event) => {
                this.error('未捕获的错误:', event.error, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
            
            // 监听未处理的Promise拒绝
            window.addEventListener('unhandledrejection', (event) => {
                this.error('未处理的Promise拒绝:', event.reason);
            });
        }
        
        this.info('日志记录器已初始化', { name: this.name, config: this.config });
    }
    
    /**
     * 调试日志
     * @param {string} message - 消息
     * @param {...any} args - 参数
     */
    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
    
    /**
     * 信息日志
     * @param {string} message - 消息
     * @param {...any} args - 参数
     */
    info(message, ...args) {
        this.log('info', message, ...args);
    }
    
    /**
     * 警告日志
     * @param {string} message - 消息
     * @param {...any} args - 参数
     */
    warn(message, ...args) {
        this.log('warn', message, ...args);
    }
    
    /**
     * 错误日志
     * @param {string} message - 消息
     * @param {...any} args - 参数
     */
    error(message, ...args) {
        this.log('error', message, ...args);
    }
    
    /**
     * 成功日志
     * @param {string} message - 消息
     * @param {...any} args - 参数
     */
    success(message, ...args) {
        this.log('info', message, ...args, { type: 'success' });
    }
    
    /**
     * 核心日志方法
     * @param {string} level - 日志级别
     * @param {string} message - 消息
     * @param {...any} args - 参数
     */
    log(level, message, ...args) {
        // 检查日志级别
        if (this.levels[level] < this.levels[this.config.level]) {
            return;
        }
        
        // 创建日志条目
        const logEntry = this.createLogEntry(level, message, args);
        
        // 应用过滤器
        if (!this.shouldLog(logEntry)) {
            return;
        }
        
        // 更新统计
        this.stats[level]++;
        this.stats.total++;
        
        // 输出到控制台
        if (this.config.enableConsole) {
            this.outputToConsole(logEntry);
        }
        
        // 存储日志
        if (this.config.enableStorage) {
            this.storeLog(logEntry);
        }
        
        // 添加到远程缓冲区
        if (this.config.enableRemote) {
            this.addToRemoteBuffer(logEntry);
        }
    }
    
    /**
     * 创建日志条目
     * @param {string} level - 日志级别
     * @param {string} message - 消息
     * @param {Array} args - 参数
     * @returns {Object} 日志条目
     */
    createLogEntry(level, message, args) {
        const timestamp = new Date();
        const entry = {
            id: this.generateId(),
            timestamp,
            level,
            logger: this.name,
            message,
            args: this.serializeArgs(args),
            metadata: this.extractMetadata(args)
        };
        
        // 添加堆栈跟踪（错误级别）
        if (level === 'error' && this.config.enableStackTrace) {
            entry.stack = this.getStackTrace();
        }
        
        // 添加性能信息
        if (this.config.enablePerformanceLogging) {
            entry.performance = {
                memory: this.getMemoryUsage(),
                timing: performance.now()
            };
        }
        
        return entry;
    }
    
    /**
     * 序列化参数
     * @param {Array} args - 参数数组
     * @returns {Array} 序列化后的参数
     */
    serializeArgs(args) {
        return args.map(arg => {
            try {
                if (arg === null || arg === undefined) {
                    return arg;
                }
                
                if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
                    return arg;
                }
                
                if (arg instanceof Error) {
                    return {
                        name: arg.name,
                        message: arg.message,
                        stack: arg.stack
                    };
                }
                
                if (typeof arg === 'object') {
                    // 避免循环引用
                    return JSON.parse(JSON.stringify(arg));
                }
                
                return String(arg);
                
            } catch (error) {
                return `[序列化失败: ${error.message}]`;
            }
        });
    }
    
    /**
     * 提取元数据
     * @param {Array} args - 参数数组
     * @returns {Object} 元数据
     */
    extractMetadata(args) {
        const metadata = {};
        
        args.forEach(arg => {
            if (arg && typeof arg === 'object' && arg.type) {
                metadata.type = arg.type;
            }
            
            if (arg && typeof arg === 'object' && arg.category) {
                metadata.category = arg.category;
            }
            
            if (arg && typeof arg === 'object' && arg.userId) {
                metadata.userId = arg.userId;
            }
        });
        
        return metadata;
    }
    
    /**
     * 检查是否应该记录日志
     * @param {Object} logEntry - 日志条目
     * @returns {boolean} 是否应该记录
     */
    shouldLog(logEntry) {
        // 应用过滤器
        for (const filter of this.config.filters) {
            if (typeof filter === 'function') {
                if (!filter(logEntry)) {
                    return false;
                }
            } else if (typeof filter === 'object') {
                // 基于规则的过滤
                if (filter.level && logEntry.level !== filter.level) {
                    return false;
                }
                
                if (filter.logger && !logEntry.logger.includes(filter.logger)) {
                    return false;
                }
                
                if (filter.message && !logEntry.message.includes(filter.message)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 输出到控制台
     * @param {Object} logEntry - 日志条目
     */
    outputToConsole(logEntry) {
        const { level, timestamp, logger, message, args, metadata } = logEntry;
        
        // 格式化时间戳
        const timeStr = this.config.enableTimestamp ? 
            `[${timestamp.toISOString()}]` : '';
        
        // 格式化日志器名称
        const loggerStr = `[${logger}]`;
        
        // 格式化级别
        const levelStr = `[${level.toUpperCase()}]`;
        
        // 组合前缀
        const prefix = [timeStr, loggerStr, levelStr].filter(Boolean).join(' ');
        
        // 选择控制台方法
        const consoleMethod = this.getConsoleMethod(level, metadata.type);
        
        // 应用颜色（如果启用）
        if (this.config.enableColors && typeof window !== 'undefined') {
            const color = this.getColor(level, metadata.type);
            consoleMethod(`%c${prefix} ${message}`, `color: ${color}`, ...args);
        } else {
            consoleMethod(`${prefix} ${message}`, ...args);
        }
    }
    
    /**
     * 获取控制台方法
     * @param {string} level - 日志级别
     * @param {string} type - 日志类型
     * @returns {Function} 控制台方法
     */
    getConsoleMethod(level, type) {
        if (type === 'success') {
            return console.log;
        }
        
        switch (level) {
            case 'debug':
                return console.debug || console.log;
            case 'info':
                return console.info || console.log;
            case 'warn':
                return console.warn || console.log;
            case 'error':
                return console.error || console.log;
            default:
                return console.log;
        }
    }
    
    /**
     * 获取颜色
     * @param {string} level - 日志级别
     * @param {string} type - 日志类型
     * @returns {string} 颜色值
     */
    getColor(level, type) {
        if (type && this.colors[type]) {
            return this.colors[type];
        }
        
        return this.colors[level] || '#000000';
    }
    
    /**
     * 存储日志
     * @param {Object} logEntry - 日志条目
     */
    storeLog(logEntry) {
        this.logs.push(logEntry);
        
        // 限制存储大小
        if (this.logs.length > this.config.maxStorageSize) {
            this.logs.shift();
        }
        
        // 保存到本地存储
        this.saveToStorage();
    }
    
    /**
     * 添加到远程缓冲区
     * @param {Object} logEntry - 日志条目
     */
    addToRemoteBuffer(logEntry) {
        this.remoteBuffer.push(logEntry);
        
        // 如果缓冲区满了，立即发送
        if (this.remoteBuffer.length >= this.config.remoteBatchSize) {
            this.flushRemoteBuffer();
        }
    }
    
    /**
     * 开始计时
     * @param {string} label - 计时标签
     */
    time(label) {
        this.timers.set(label, performance.now());
        this.debug(`计时开始: ${label}`);
    }
    
    /**
     * 结束计时
     * @param {string} label - 计时标签
     */
    timeEnd(label) {
        const startTime = this.timers.get(label);
        
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            this.timers.delete(label);
            this.info(`计时结束: ${label}`, { duration: `${duration.toFixed(2)}ms` });
            return duration;
        } else {
            this.warn(`计时器不存在: ${label}`);
            return null;
        }
    }
    
    /**
     * 记录性能指标
     * @param {string} metric - 指标名称
     * @param {number} value - 指标值
     * @param {string} unit - 单位
     */
    metric(metric, value, unit = '') {
        this.info(`性能指标: ${metric}`, {
            value,
            unit,
            type: 'metric'
        });
    }
    
    /**
     * 记录用户操作
     * @param {string} action - 操作名称
     * @param {Object} data - 操作数据
     */
    userAction(action, data = {}) {
        this.info(`用户操作: ${action}`, {
            ...data,
            type: 'user_action',
            timestamp: Date.now()
        });
    }
    
    /**
     * 记录API调用
     * @param {string} method - HTTP方法
     * @param {string} url - URL
     * @param {number} status - 状态码
     * @param {number} duration - 持续时间
     */
    apiCall(method, url, status, duration) {
        const level = status >= 400 ? 'error' : 'info';
        this.log(level, `API调用: ${method} ${url}`, {
            method,
            url,
            status,
            duration: `${duration}ms`,
            type: 'api_call'
        });
    }
    
    /**
     * 获取堆栈跟踪
     * @returns {string} 堆栈跟踪
     */
    getStackTrace() {
        try {
            throw new Error();
        } catch (error) {
            return error.stack;
        }
    }
    
    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用情况
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        
        return null;
    }
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * 启动远程日志发送
     */
    startRemoteLogging() {
        if (this.remoteTimer) {
            clearInterval(this.remoteTimer);
        }
        
        this.remoteTimer = setInterval(() => {
            this.flushRemoteBuffer();
        }, this.config.remoteFlushInterval);
        
        this.debug('远程日志发送已启动');
    }
    
    /**
     * 停止远程日志发送
     */
    stopRemoteLogging() {
        if (this.remoteTimer) {
            clearInterval(this.remoteTimer);
            this.remoteTimer = null;
        }
        
        this.debug('远程日志发送已停止');
    }
    
    /**
     * 刷新远程缓冲区
     */
    async flushRemoteBuffer() {
        if (this.remoteBuffer.length === 0 || !this.config.remoteEndpoint) {
            return;
        }
        
        const logsToSend = [...this.remoteBuffer];
        this.remoteBuffer = [];
        
        try {
            const response = await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    logs: logsToSend,
                    logger: this.name,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.debug(`已发送${logsToSend.length}条日志到远程服务器`);
            
        } catch (error) {
            this.error('发送远程日志失败:', error);
            
            // 将失败的日志重新加入缓冲区
            this.remoteBuffer.unshift(...logsToSend);
            
            // 限制缓冲区大小
            if (this.remoteBuffer.length > this.config.remoteBatchSize * 5) {
                this.remoteBuffer = this.remoteBuffer.slice(0, this.config.remoteBatchSize * 5);
            }
        }
    }
    
    /**
     * 保存到本地存储
     */
    saveToStorage() {
        if (typeof localStorage === 'undefined') {
            return;
        }
        
        try {
            const data = {
                logs: this.logs.slice(-this.config.maxStorageSize),
                stats: this.stats,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(this.config.storageKey, JSON.stringify(data));
            
        } catch (error) {
            console.warn('保存日志到本地存储失败:', error);
        }
    }
    
    /**
     * 从本地存储加载
     */
    loadFromStorage() {
        if (typeof localStorage === 'undefined') {
            return;
        }
        
        try {
            const data = localStorage.getItem(this.config.storageKey);
            
            if (data) {
                const parsed = JSON.parse(data);
                
                if (parsed.logs && Array.isArray(parsed.logs)) {
                    this.logs = parsed.logs;
                }
                
                if (parsed.stats) {
                    this.stats = { ...this.stats, ...parsed.stats };
                }
                
                this.debug(`从本地存储加载了${this.logs.length}条日志`);
            }
            
        } catch (error) {
            console.warn('从本地存储加载日志失败:', error);
        }
    }
    
    /**
     * 清空日志
     */
    clear() {
        this.logs = [];
        this.remoteBuffer = [];
        this.timers.clear();
        
        // 重置统计
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
        
        // 清空本地存储
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(this.config.storageKey);
        }
        
        this.info('日志已清空');
    }
    
    /**
     * 获取日志
     * @param {Object} options - 选项
     * @returns {Array} 日志数组
     */
    getLogs(options = {}) {
        let logs = [...this.logs];
        
        // 按级别过滤
        if (options.level) {
            logs = logs.filter(log => log.level === options.level);
        }
        
        // 按时间范围过滤
        if (options.since) {
            const since = new Date(options.since);
            logs = logs.filter(log => new Date(log.timestamp) >= since);
        }
        
        if (options.until) {
            const until = new Date(options.until);
            logs = logs.filter(log => new Date(log.timestamp) <= until);
        }
        
        // 按消息内容过滤
        if (options.search) {
            const search = options.search.toLowerCase();
            logs = logs.filter(log => 
                log.message.toLowerCase().includes(search) ||
                JSON.stringify(log.args).toLowerCase().includes(search)
            );
        }
        
        // 限制数量
        if (options.limit) {
            logs = logs.slice(-options.limit);
        }
        
        return logs;
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            logsCount: this.logs.length,
            remoteBufferCount: this.remoteBuffer.length,
            activeTimers: this.timers.size
        };
    }
    
    /**
     * 导出日志
     * @param {string} format - 导出格式 ('json' | 'csv' | 'txt')
     * @param {Object} options - 选项
     * @returns {string} 导出的数据
     */
    export(format = 'json', options = {}) {
        const logs = this.getLogs(options);
        
        switch (format) {
            case 'csv':
                return this.exportToCSV(logs);
            case 'txt':
                return this.exportToText(logs);
            default:
                return JSON.stringify({
                    logs,
                    stats: this.getStats(),
                    config: this.config,
                    exportTime: new Date().toISOString()
                }, null, 2);
        }
    }
    
    /**
     * 导出为CSV
     * @param {Array} logs - 日志数组
     * @returns {string} CSV字符串
     */
    exportToCSV(logs) {
        const headers = ['Timestamp', 'Level', 'Logger', 'Message', 'Args'];
        const rows = logs.map(log => [
            log.timestamp,
            log.level,
            log.logger,
            log.message,
            JSON.stringify(log.args)
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }
    
    /**
     * 导出为文本
     * @param {Array} logs - 日志数组
     * @returns {string} 文本字符串
     */
    exportToText(logs) {
        return logs.map(log => {
            const timestamp = new Date(log.timestamp).toISOString();
            const args = log.args.length > 0 ? ` ${JSON.stringify(log.args)}` : '';
            return `[${timestamp}] [${log.level.toUpperCase()}] [${log.logger}] ${log.message}${args}`;
        }).join('\n');
    }
    
    /**
     * 刷新所有缓冲区
     */
    async flush() {
        // 保存到本地存储
        if (this.config.enableStorage) {
            this.saveToStorage();
        }
        
        // 发送远程日志
        if (this.config.enableRemote) {
            await this.flushRemoteBuffer();
        }
    }
    
    /**
     * 设置日志级别
     * @param {string} level - 新的日志级别
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.config.level = level;
            this.info(`日志级别已设置为: ${level}`);
        } else {
            this.warn(`无效的日志级别: ${level}`);
        }
    }
    
    /**
     * 添加过滤器
     * @param {Function|Object} filter - 过滤器
     */
    addFilter(filter) {
        this.config.filters.push(filter);
        this.debug('已添加日志过滤器');
    }
    
    /**
     * 移除过滤器
     * @param {Function|Object} filter - 过滤器
     */
    removeFilter(filter) {
        const index = this.config.filters.indexOf(filter);
        if (index > -1) {
            this.config.filters.splice(index, 1);
            this.debug('已移除日志过滤器');
        }
    }
    
    /**
     * 创建子日志记录器
     * @param {string} name - 子日志记录器名称
     * @param {Object} options - 选项
     * @returns {Logger} 子日志记录器
     */
    child(name, options = {}) {
        const childName = `${this.name}.${name}`;
        const childOptions = { ...this.config, ...options };
        return new Logger(childName, childOptions);
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopRemoteLogging();
        this.flush();
        this.timers.clear();
        this.info('日志记录器资源已清理');
    }
}

export default Logger;