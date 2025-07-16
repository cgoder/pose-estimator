/**
 * 事件总线模块
 * 负责应用内组件间的事件通信和消息传递
 */

export class EventBus {
    constructor(options = {}) {
        // 配置选项
        this.config = {
            // 调试模式
            debug: options.debug || false,
            
            // 最大监听器数量
            maxListeners: options.maxListeners || 100,
            
            // 事件历史记录
            enableHistory: options.enableHistory || false,
            maxHistorySize: options.maxHistorySize || 1000,
            
            // 性能监控
            enablePerformanceMonitoring: options.enablePerformanceMonitoring || false,
            
            // 错误处理
            enableErrorHandling: options.enableErrorHandling !== false,
            
            // 异步事件处理
            enableAsyncHandling: options.enableAsyncHandling !== false,
            
            // 事件命名空间
            enableNamespaces: options.enableNamespaces || false,
            
            // 通配符支持
            enableWildcards: options.enableWildcards || false,
            
            ...options
        };
        
        // 事件监听器映射
        this.listeners = new Map();
        
        // 一次性监听器映射
        this.onceListeners = new Map();
        
        // 事件历史记录
        this.history = [];
        
        // 性能统计
        this.stats = {
            eventsEmitted: 0,
            listenersAdded: 0,
            listenersRemoved: 0,
            errorsHandled: 0,
            averageEmitTime: 0,
            totalEmitTime: 0
        };
        
        // 命名空间映射
        this.namespaces = new Map();
        
        // 中间件列表
        this.middlewares = [];
        
        // 错误处理器
        this.errorHandlers = [];
        
        // 调试日志器
        this.logger = null;
        
        this.init();
    }
    
    /**
     * 初始化事件总线
     */
    init() {
        // 设置默认错误处理器
        if (this.config.enableErrorHandling) {
            this.onError((error, event, data) => {
                console.error('EventBus错误:', error, { event, data });
            });
        }
        
        if (this.config.debug) {
            console.log('EventBus已初始化', this.config);
        }
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     * @param {Object} options - 选项
     * @returns {Function} 取消监听的函数
     */
    on(event, listener, options = {}) {
        return this.addEventListener(event, listener, { ...options, once: false });
    }
    
    /**
     * 添加一次性事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     * @param {Object} options - 选项
     * @returns {Function} 取消监听的函数
     */
    once(event, listener, options = {}) {
        return this.addEventListener(event, listener, { ...options, once: true });
    }
    
    /**
     * 添加事件监听器（内部方法）
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     * @param {Object} options - 选项
     * @returns {Function} 取消监听的函数
     */
    addEventListener(event, listener, options = {}) {
        if (typeof listener !== 'function') {
            throw new Error('监听器必须是函数');
        }
        
        // 检查监听器数量限制
        const currentCount = this.getListenerCount(event);
        if (currentCount >= this.config.maxListeners) {
            console.warn(`事件 "${event}" 的监听器数量已达到最大限制 (${this.config.maxListeners})`);
        }
        
        // 创建监听器对象
        const listenerObj = {
            id: this.generateId(),
            listener,
            options,
            addedAt: Date.now(),
            callCount: 0,
            lastCalledAt: null,
            totalExecutionTime: 0
        };
        
        // 选择存储位置
        const storage = options.once ? this.onceListeners : this.listeners;
        
        // 添加到映射
        if (!storage.has(event)) {
            storage.set(event, []);
        }
        
        storage.get(event).push(listenerObj);
        
        // 更新统计
        this.stats.listenersAdded++;
        
        if (this.config.debug) {
            console.log(`添加监听器: ${event}`, { options, id: listenerObj.id });
        }
        
        // 返回取消监听的函数
        return () => this.removeListener(event, listenerObj.id);
    }
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {string|Function} listenerOrId - 监听器函数或ID
     * @returns {boolean} 是否成功移除
     */
    off(event, listenerOrId) {
        return this.removeListener(event, listenerOrId);
    }
    
    /**
     * 移除事件监听器（内部方法）
     * @param {string} event - 事件名称
     * @param {string|Function} listenerOrId - 监听器函数或ID
     * @returns {boolean} 是否成功移除
     */
    removeListener(event, listenerOrId) {
        let removed = false;
        
        // 从普通监听器中移除
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.findIndex(l => 
                l.id === listenerOrId || l.listener === listenerOrId
            );
            
            if (index > -1) {
                listeners.splice(index, 1);
                removed = true;
                
                if (listeners.length === 0) {
                    this.listeners.delete(event);
                }
            }
        }
        
        // 从一次性监听器中移除
        if (this.onceListeners.has(event)) {
            const listeners = this.onceListeners.get(event);
            const index = listeners.findIndex(l => 
                l.id === listenerOrId || l.listener === listenerOrId
            );
            
            if (index > -1) {
                listeners.splice(index, 1);
                removed = true;
                
                if (listeners.length === 0) {
                    this.onceListeners.delete(event);
                }
            }
        }
        
        if (removed) {
            this.stats.listenersRemoved++;
            
            if (this.config.debug) {
                console.log(`移除监听器: ${event}`);
            }
        }
        
        return removed;
    }
    
    /**
     * 移除所有事件监听器
     * @param {string} event - 事件名称（可选）
     */
    removeAllListeners(event) {
        if (event) {
            // 移除特定事件的所有监听器
            const regularCount = this.listeners.has(event) ? this.listeners.get(event).length : 0;
            const onceCount = this.onceListeners.has(event) ? this.onceListeners.get(event).length : 0;
            
            this.listeners.delete(event);
            this.onceListeners.delete(event);
            
            this.stats.listenersRemoved += regularCount + onceCount;
            
            if (this.config.debug) {
                console.log(`移除所有监听器: ${event}`, { count: regularCount + onceCount });
            }
        } else {
            // 移除所有事件的所有监听器
            let totalCount = 0;
            
            for (const listeners of this.listeners.values()) {
                totalCount += listeners.length;
            }
            
            for (const listeners of this.onceListeners.values()) {
                totalCount += listeners.length;
            }
            
            this.listeners.clear();
            this.onceListeners.clear();
            
            this.stats.listenersRemoved += totalCount;
            
            if (this.config.debug) {
                console.log('移除所有监听器', { count: totalCount });
            }
        }
    }
    
    /**
     * 发射事件
     * @param {string} event - 事件名称
     * @param {...any} args - 事件参数
     * @returns {Promise<boolean>} 是否有监听器处理了事件
     */
    async emit(event, ...args) {
        const startTime = performance.now();
        let hasListeners = false;
        
        try {
            // 应用中间件
            const processedArgs = await this.applyMiddlewares(event, args);
            
            // 记录事件历史
            if (this.config.enableHistory) {
                this.recordEvent(event, processedArgs);
            }
            
            // 获取所有匹配的监听器
            const listeners = this.getMatchingListeners(event);
            
            if (listeners.length > 0) {
                hasListeners = true;
                
                // 执行监听器
                await this.executeListeners(event, listeners, processedArgs);
            }
            
            // 处理通配符监听器
            if (this.config.enableWildcards) {
                const wildcardListeners = this.getWildcardListeners(event);
                if (wildcardListeners.length > 0) {
                    hasListeners = true;
                    await this.executeListeners(event, wildcardListeners, processedArgs);
                }
            }
            
            // 更新统计
            this.stats.eventsEmitted++;
            
            const executionTime = performance.now() - startTime;
            this.stats.totalEmitTime += executionTime;
            this.stats.averageEmitTime = this.stats.totalEmitTime / this.stats.eventsEmitted;
            
            if (this.config.debug) {
                console.log(`发射事件: ${event}`, {
                    args: processedArgs,
                    listenersCount: listeners.length,
                    executionTime: `${executionTime.toFixed(2)}ms`
                });
            }
            
        } catch (error) {
            this.handleError(error, event, args);
        }
        
        return hasListeners;
    }
    
    /**
     * 同步发射事件
     * @param {string} event - 事件名称
     * @param {...any} args - 事件参数
     * @returns {boolean} 是否有监听器处理了事件
     */
    emitSync(event, ...args) {
        const startTime = performance.now();
        let hasListeners = false;
        
        try {
            // 记录事件历史
            if (this.config.enableHistory) {
                this.recordEvent(event, args);
            }
            
            // 获取所有匹配的监听器
            const listeners = this.getMatchingListeners(event);
            
            if (listeners.length > 0) {
                hasListeners = true;
                
                // 同步执行监听器
                this.executeListenersSync(event, listeners, args);
            }
            
            // 处理通配符监听器
            if (this.config.enableWildcards) {
                const wildcardListeners = this.getWildcardListeners(event);
                if (wildcardListeners.length > 0) {
                    hasListeners = true;
                    this.executeListenersSync(event, wildcardListeners, args);
                }
            }
            
            // 更新统计
            this.stats.eventsEmitted++;
            
            const executionTime = performance.now() - startTime;
            this.stats.totalEmitTime += executionTime;
            this.stats.averageEmitTime = this.stats.totalEmitTime / this.stats.eventsEmitted;
            
        } catch (error) {
            this.handleError(error, event, args);
        }
        
        return hasListeners;
    }
    
    /**
     * 获取匹配的监听器
     * @param {string} event - 事件名称
     * @returns {Array} 监听器数组
     */
    getMatchingListeners(event) {
        const listeners = [];
        
        // 普通监听器
        if (this.listeners.has(event)) {
            listeners.push(...this.listeners.get(event));
        }
        
        // 一次性监听器
        if (this.onceListeners.has(event)) {
            listeners.push(...this.onceListeners.get(event));
        }
        
        // 按优先级排序
        return listeners.sort((a, b) => {
            const priorityA = a.options.priority || 0;
            const priorityB = b.options.priority || 0;
            return priorityB - priorityA; // 高优先级先执行
        });
    }
    
    /**
     * 获取通配符监听器
     * @param {string} event - 事件名称
     * @returns {Array} 监听器数组
     */
    getWildcardListeners(event) {
        const listeners = [];
        
        // 检查普通监听器
        for (const [pattern, patternListeners] of this.listeners.entries()) {
            if (this.matchWildcard(pattern, event)) {
                listeners.push(...patternListeners);
            }
        }
        
        // 检查一次性监听器
        for (const [pattern, patternListeners] of this.onceListeners.entries()) {
            if (this.matchWildcard(pattern, event)) {
                listeners.push(...patternListeners);
            }
        }
        
        return listeners;
    }
    
    /**
     * 匹配通配符模式
     * @param {string} pattern - 模式
     * @param {string} event - 事件名称
     * @returns {boolean} 是否匹配
     */
    matchWildcard(pattern, event) {
        if (!pattern.includes('*')) {
            return false;
        }
        
        const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*') + '$'
        );
        
        return regex.test(event);
    }
    
    /**
     * 执行监听器（异步）
     * @param {string} event - 事件名称
     * @param {Array} listeners - 监听器数组
     * @param {Array} args - 参数数组
     */
    async executeListeners(event, listeners, args) {
        const onceListenersToRemove = [];
        
        for (const listenerObj of listeners) {
            try {
                const startTime = performance.now();
                
                // 检查条件
                if (listenerObj.options.condition && 
                    !listenerObj.options.condition(...args)) {
                    continue;
                }
                
                // 执行监听器
                if (this.config.enableAsyncHandling) {
                    await listenerObj.listener(...args);
                } else {
                    listenerObj.listener(...args);
                }
                
                // 更新统计
                const executionTime = performance.now() - startTime;
                listenerObj.callCount++;
                listenerObj.lastCalledAt = Date.now();
                listenerObj.totalExecutionTime += executionTime;
                
                // 标记一次性监听器待移除
                if (listenerObj.options.once) {
                    onceListenersToRemove.push({ event, id: listenerObj.id });
                }
                
            } catch (error) {
                this.handleError(error, event, args, listenerObj);
            }
        }
        
        // 移除一次性监听器
        for (const { event: eventName, id } of onceListenersToRemove) {
            this.removeListener(eventName, id);
        }
    }
    
    /**
     * 执行监听器（同步）
     * @param {string} event - 事件名称
     * @param {Array} listeners - 监听器数组
     * @param {Array} args - 参数数组
     */
    executeListenersSync(event, listeners, args) {
        const onceListenersToRemove = [];
        
        for (const listenerObj of listeners) {
            try {
                const startTime = performance.now();
                
                // 检查条件
                if (listenerObj.options.condition && 
                    !listenerObj.options.condition(...args)) {
                    continue;
                }
                
                // 执行监听器
                listenerObj.listener(...args);
                
                // 更新统计
                const executionTime = performance.now() - startTime;
                listenerObj.callCount++;
                listenerObj.lastCalledAt = Date.now();
                listenerObj.totalExecutionTime += executionTime;
                
                // 标记一次性监听器待移除
                if (listenerObj.options.once) {
                    onceListenersToRemove.push({ event, id: listenerObj.id });
                }
                
            } catch (error) {
                this.handleError(error, event, args, listenerObj);
            }
        }
        
        // 移除一次性监听器
        for (const { event: eventName, id } of onceListenersToRemove) {
            this.removeListener(eventName, id);
        }
    }
    
    /**
     * 应用中间件
     * @param {string} event - 事件名称
     * @param {Array} args - 参数数组
     * @returns {Promise<Array>} 处理后的参数数组
     */
    async applyMiddlewares(event, args) {
        let processedArgs = [...args];
        
        for (const middleware of this.middlewares) {
            try {
                const result = await middleware(event, processedArgs);
                if (result !== undefined) {
                    processedArgs = Array.isArray(result) ? result : [result];
                }
            } catch (error) {
                this.handleError(error, event, args, null, 'middleware');
            }
        }
        
        return processedArgs;
    }
    
    /**
     * 记录事件历史
     * @param {string} event - 事件名称
     * @param {Array} args - 参数数组
     */
    recordEvent(event, args) {
        const record = {
            id: this.generateId(),
            event,
            args: this.serializeArgs(args),
            timestamp: Date.now(),
            iso: new Date().toISOString()
        };
        
        this.history.push(record);
        
        // 限制历史记录大小
        if (this.history.length > this.config.maxHistorySize) {
            this.history.shift();
        }
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
                
                if (typeof arg === 'function') {
                    return '[Function]';
                }
                
                if (typeof arg === 'object') {
                    // 避免循环引用
                    return JSON.parse(JSON.stringify(arg));
                }
                
                return arg;
                
            } catch (error) {
                return '[序列化失败]';
            }
        });
    }
    
    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {string} event - 事件名称
     * @param {Array} args - 参数数组
     * @param {Object} listenerObj - 监听器对象
     * @param {string} context - 上下文
     */
    handleError(error, event, args, listenerObj = null, context = 'listener') {
        this.stats.errorsHandled++;
        
        const errorInfo = {
            error,
            event,
            args,
            listenerObj,
            context,
            timestamp: Date.now()
        };
        
        // 调用错误处理器
        for (const handler of this.errorHandlers) {
            try {
                handler(errorInfo);
            } catch (handlerError) {
                console.error('错误处理器本身出错:', handlerError);
            }
        }
        
        if (this.config.debug) {
            console.error(`EventBus错误 (${context}):`, errorInfo);
        }
    }
    
    /**
     * 添加中间件
     * @param {Function} middleware - 中间件函数
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('中间件必须是函数');
        }
        
        this.middlewares.push(middleware);
        
        if (this.config.debug) {
            console.log('添加中间件');
        }
    }
    
    /**
     * 添加错误处理器
     * @param {Function} handler - 错误处理器
     */
    onError(handler) {
        if (typeof handler !== 'function') {
            throw new Error('错误处理器必须是函数');
        }
        
        this.errorHandlers.push(handler);
        
        if (this.config.debug) {
            console.log('添加错误处理器');
        }
    }
    
    /**
     * 等待事件
     * @param {string} event - 事件名称
     * @param {Object} options - 选项
     * @returns {Promise} Promise对象
     */
    waitFor(event, options = {}) {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 0;
            const condition = options.condition;
            
            let timeoutId = null;
            
            const cleanup = this.once(event, (...args) => {
                if (condition && !condition(...args)) {
                    return; // 条件不满足，继续等待
                }
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                resolve(args);
            });
            
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error(`等待事件 "${event}" 超时 (${timeout}ms)`));
                }, timeout);
            }
        });
    }
    
    /**
     * 获取监听器数量
     * @param {string} event - 事件名称
     * @returns {number} 监听器数量
     */
    getListenerCount(event) {
        let count = 0;
        
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).length;
        }
        
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).length;
        }
        
        return count;
    }
    
    /**
     * 获取所有事件名称
     * @returns {Array} 事件名称数组
     */
    getEventNames() {
        const events = new Set();
        
        for (const event of this.listeners.keys()) {
            events.add(event);
        }
        
        for (const event of this.onceListeners.keys()) {
            events.add(event);
        }
        
        return Array.from(events);
    }
    
    /**
     * 获取事件历史
     * @param {Object} options - 选项
     * @returns {Array} 事件历史数组
     */
    getHistory(options = {}) {
        let history = [...this.history];
        
        // 按事件过滤
        if (options.event) {
            history = history.filter(record => record.event === options.event);
        }
        
        // 按时间范围过滤
        if (options.since) {
            history = history.filter(record => record.timestamp >= options.since);
        }
        
        if (options.until) {
            history = history.filter(record => record.timestamp <= options.until);
        }
        
        // 限制数量
        if (options.limit) {
            history = history.slice(-options.limit);
        }
        
        return history;
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const totalListeners = Array.from(this.listeners.values())
            .reduce((sum, listeners) => sum + listeners.length, 0) +
            Array.from(this.onceListeners.values())
            .reduce((sum, listeners) => sum + listeners.length, 0);
        
        return {
            ...this.stats,
            totalListeners,
            totalEvents: this.getEventNames().length,
            historySize: this.history.length,
            middlewareCount: this.middlewares.length,
            errorHandlerCount: this.errorHandlers.length
        };
    }
    
    /**
     * 获取性能信息
     * @returns {Object} 性能信息
     */
    getPerformanceInfo() {
        const listenerStats = [];
        
        // 收集监听器性能信息
        for (const [event, listeners] of this.listeners.entries()) {
            for (const listener of listeners) {
                listenerStats.push({
                    event,
                    id: listener.id,
                    callCount: listener.callCount,
                    totalExecutionTime: listener.totalExecutionTime,
                    averageExecutionTime: listener.callCount > 0 ? 
                        listener.totalExecutionTime / listener.callCount : 0,
                    lastCalledAt: listener.lastCalledAt
                });
            }
        }
        
        // 按平均执行时间排序
        listenerStats.sort((a, b) => b.averageExecutionTime - a.averageExecutionTime);
        
        return {
            stats: this.getStats(),
            listenerStats,
            slowestListeners: listenerStats.slice(0, 10),
            mostCalledListeners: listenerStats
                .sort((a, b) => b.callCount - a.callCount)
                .slice(0, 10)
        };
    }
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
        
        if (this.config.debug) {
            console.log('事件历史已清空');
        }
    }
    
    /**
     * 重置统计信息
     */
    resetStats() {
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
        
        // 重置监听器统计
        for (const listeners of this.listeners.values()) {
            for (const listener of listeners) {
                listener.callCount = 0;
                listener.totalExecutionTime = 0;
                listener.lastCalledAt = null;
            }
        }
        
        if (this.config.debug) {
            console.log('统计信息已重置');
        }
    }
    
    /**
     * 设置日志器
     * @param {Object} logger - 日志器对象
     */
    setLogger(logger) {
        this.logger = logger;
        
        if (this.config.debug) {
            console.log('日志器已设置');
        }
    }
    
    /**
     * 创建命名空间
     * @param {string} namespace - 命名空间名称
     * @returns {EventBus} 命名空间事件总线
     */
    namespace(namespace) {
        if (!this.config.enableNamespaces) {
            throw new Error('命名空间功能未启用');
        }
        
        if (!this.namespaces.has(namespace)) {
            const namespaceBus = new EventBus({
                ...this.config,
                debug: this.config.debug
            });
            
            // 设置命名空间前缀
            namespaceBus._namespace = namespace;
            namespaceBus._parent = this;
            
            this.namespaces.set(namespace, namespaceBus);
        }
        
        return this.namespaces.get(namespace);
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.removeAllListeners();
        this.clearHistory();
        this.middlewares = [];
        this.errorHandlers = [];
        
        // 清理命名空间
        for (const namespaceBus of this.namespaces.values()) {
            namespaceBus.dispose();
        }
        this.namespaces.clear();
        
        if (this.config.debug) {
            console.log('EventBus资源已清理');
        }
    }
}

export default EventBus;