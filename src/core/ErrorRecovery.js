/**
 * 错误恢复模块
 * 负责系统错误处理、自动恢复、故障转移和错误分析
 */

export class ErrorRecovery {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 恢复策略
            enableAutoRecovery: options.enableAutoRecovery !== false,
            maxRetryAttempts: options.maxRetryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            exponentialBackoff: options.exponentialBackoff !== false,
            backoffMultiplier: options.backoffMultiplier || 2,
            maxRetryDelay: options.maxRetryDelay || 30000,
            
            // 错误分类
            criticalErrors: options.criticalErrors || [
                'CAMERA_ACCESS_DENIED',
                'MODEL_LOAD_FAILED',
                'WEBGL_CONTEXT_LOST',
                'OUT_OF_MEMORY'
            ],
            recoverableErrors: options.recoverableErrors || [
                'NETWORK_ERROR',
                'TEMPORARY_FAILURE',
                'RESOURCE_BUSY',
                'TIMEOUT'
            ],
            
            // 监控设置
            errorThreshold: options.errorThreshold || 10, // 错误阈值
            timeWindow: options.timeWindow || 60000, // 时间窗口（毫秒）
            enableCircuitBreaker: options.enableCircuitBreaker !== false,
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout || 30000,
            
            // 故障转移
            enableFailover: options.enableFailover !== false,
            fallbackStrategies: options.fallbackStrategies || {},
            
            // 健康检查
            enableHealthCheck: options.enableHealthCheck !== false,
            healthCheckInterval: options.healthCheckInterval || 10000,
            healthCheckTimeout: options.healthCheckTimeout || 5000,
            
            // 调试设置
            debug: options.debug || false,
            enableErrorReporting: options.enableErrorReporting !== false,
            
            ...options
        };
        
        // 错误历史
        this.errorHistory = [];
        
        // 重试计数器
        this.retryCounters = new Map();
        
        // 熔断器状态
        this.circuitBreakers = new Map();
        
        // 恢复策略
        this.recoveryStrategies = new Map();
        
        // 健康状态
        this.healthStatus = {
            overall: 'healthy',
            components: new Map(),
            lastCheck: null,
            issues: []
        };
        
        // 统计信息
        this.stats = {
            totalErrors: 0,
            criticalErrors: 0,
            recoverableErrors: 0,
            recoveryAttempts: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            circuitBreakerTrips: 0,
            healthChecks: 0
        };
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 定时器
        this.healthCheckTimer = null;
        this.cleanupTimer = null;
        
        this.init();
    }
    
    /**
     * 初始化错误恢复系统
     */
    init() {
        try {
            // 注册默认恢复策略
            this.registerDefaultStrategies();
            
            // 启动健康检查
            if (this.options.enableHealthCheck) {
                this.startHealthCheck();
            }
            
            // 启动清理定时器
            this.startCleanupTimer();
            
            // 设置全局错误处理
            this.setupGlobalErrorHandlers();
            
            if (this.options.debug) {
                console.log('ErrorRecovery已初始化', this.options);
            }
            
        } catch (error) {
            console.error('ErrorRecovery初始化失败:', error);
        }
    }
    
    /**
     * 注册默认恢复策略
     */
    registerDefaultStrategies() {
        // 摄像头访问失败恢复
        this.registerStrategy('CAMERA_ACCESS_DENIED', async (error, context) => {
            console.log('尝试恢复摄像头访问...');
            
            // 尝试降级到较低分辨率
            if (context.deviceManager) {
                try {
                    await context.deviceManager.setResolution({ width: 320, height: 240 });
                    return { success: true, message: '已降级到较低分辨率' };
                } catch (e) {
                    return { success: false, message: '降级失败' };
                }
            }
            
            return { success: false, message: '无法恢复摄像头访问' };
        });
        
        // 模型加载失败恢复
        this.registerStrategy('MODEL_LOAD_FAILED', async (error, context) => {
            console.log('尝试恢复模型加载...');
            
            // 尝试加载备用模型
            if (context.poseEstimator) {
                try {
                    await context.poseEstimator.switchModel('posenet'); // 切换到更轻量的模型
                    return { success: true, message: '已切换到备用模型' };
                } catch (e) {
                    return { success: false, message: '备用模型加载失败' };
                }
            }
            
            return { success: false, message: '无法恢复模型加载' };
        });
        
        // WebGL上下文丢失恢复
        this.registerStrategy('WEBGL_CONTEXT_LOST', async (error, context) => {
            console.log('尝试恢复WebGL上下文...');
            
            // 重新初始化渲染器
            if (context.renderer) {
                try {
                    await context.renderer.reinitialize();
                    return { success: true, message: 'WebGL上下文已恢复' };
                } catch (e) {
                    return { success: false, message: 'WebGL上下文恢复失败' };
                }
            }
            
            return { success: false, message: '无法恢复WebGL上下文' };
        });
        
        // 网络错误恢复
        this.registerStrategy('NETWORK_ERROR', async (error, context) => {
            console.log('尝试恢复网络连接...');
            
            // 等待网络恢复
            await this.waitForNetwork();
            
            return { success: true, message: '网络连接已恢复' };
        });
        
        // 内存不足恢复
        this.registerStrategy('OUT_OF_MEMORY', async (error, context) => {
            console.log('尝试释放内存...');
            
            // 清理缓存
            if (context.cacheManager) {
                context.cacheManager.clearAll();
            }
            
            // 强制垃圾回收（如果支持）
            if (window.gc) {
                window.gc();
            }
            
            return { success: true, message: '内存已清理' };
        });
    }
    
    /**
     * 注册恢复策略
     * @param {string} errorType - 错误类型
     * @param {Function} strategy - 恢复策略函数
     */
    registerStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
        
        if (this.options.debug) {
            console.log(`已注册恢复策略: ${errorType}`);
        }
    }
    
    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文信息
     * @returns {Promise<Object>} 处理结果
     */
    async handleError(error, context = {}) {
        try {
            // 记录错误
            const errorRecord = this.recordError(error, context);
            
            // 分类错误
            const errorType = this.classifyError(error);
            
            // 检查熔断器
            if (this.isCircuitBreakerOpen(errorType)) {
                return {
                    success: false,
                    message: '熔断器已打开，暂停处理',
                    errorType,
                    circuitBreakerOpen: true
                };
            }
            
            // 检查是否应该尝试恢复
            if (!this.shouldAttemptRecovery(errorType, error)) {
                return {
                    success: false,
                    message: '错误不可恢复或超过重试限制',
                    errorType,
                    recoverable: false
                };
            }
            
            // 尝试恢复
            const recoveryResult = await this.attemptRecovery(errorType, error, context);
            
            // 更新统计
            this.updateRecoveryStats(recoveryResult.success);
            
            // 更新熔断器
            this.updateCircuitBreaker(errorType, recoveryResult.success);
            
            // 触发事件
            this.emit('errorHandled', {
                error: errorRecord,
                errorType,
                recoveryResult,
                context
            });
            
            return recoveryResult;
            
        } catch (recoveryError) {
            console.error('错误恢复过程中发生异常:', recoveryError);
            
            return {
                success: false,
                message: '恢复过程异常',
                error: recoveryError
            };
        }
    }
    
    /**
     * 记录错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文信息
     * @returns {Object} 错误记录
     */
    recordError(error, context) {
        const errorRecord = {
            id: this.generateErrorId(),
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: Date.now(),
            context: { ...context },
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 添加到历史记录
        this.errorHistory.push(errorRecord);
        
        // 限制历史记录大小
        if (this.errorHistory.length > 1000) {
            this.errorHistory = this.errorHistory.slice(-500);
        }
        
        this.stats.totalErrors++;
        
        if (this.options.debug) {
            console.log('错误已记录:', errorRecord);
        }
        
        return errorRecord;
    }
    
    /**
     * 分类错误
     * @param {Error} error - 错误对象
     * @returns {string} 错误类型
     */
    classifyError(error) {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();
        
        // 检查关键错误
        for (const criticalError of this.options.criticalErrors) {
            if (message.includes(criticalError.toLowerCase()) || 
                name.includes(criticalError.toLowerCase())) {
                this.stats.criticalErrors++;
                return criticalError;
            }
        }
        
        // 检查可恢复错误
        for (const recoverableError of this.options.recoverableErrors) {
            if (message.includes(recoverableError.toLowerCase()) || 
                name.includes(recoverableError.toLowerCase())) {
                this.stats.recoverableErrors++;
                return recoverableError;
            }
        }
        
        // 根据错误特征分类
        if (message.includes('permission') || message.includes('denied')) {
            return 'PERMISSION_DENIED';
        }
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'NETWORK_ERROR';
        }
        
        if (message.includes('timeout')) {
            return 'TIMEOUT';
        }
        
        if (message.includes('memory') || message.includes('allocation')) {
            return 'MEMORY_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    }
    
    /**
     * 检查是否应该尝试恢复
     * @param {string} errorType - 错误类型
     * @param {Error} error - 错误对象
     * @returns {boolean} 是否应该尝试恢复
     */
    shouldAttemptRecovery(errorType, error) {
        // 检查是否启用自动恢复
        if (!this.options.enableAutoRecovery) {
            return false;
        }
        
        // 检查是否为关键错误且不可恢复
        if (this.options.criticalErrors.includes(errorType) && 
            !this.recoveryStrategies.has(errorType)) {
            return false;
        }
        
        // 检查重试次数
        const retryCount = this.retryCounters.get(errorType) || 0;
        if (retryCount >= this.options.maxRetryAttempts) {
            return false;
        }
        
        // 检查错误频率
        if (this.isErrorRateTooHigh(errorType)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 尝试恢复
     * @param {string} errorType - 错误类型
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文信息
     * @returns {Promise<Object>} 恢复结果
     */
    async attemptRecovery(errorType, error, context) {
        this.stats.recoveryAttempts++;
        
        // 增加重试计数
        const retryCount = (this.retryCounters.get(errorType) || 0) + 1;
        this.retryCounters.set(errorType, retryCount);
        
        // 计算延迟时间
        const delay = this.calculateRetryDelay(retryCount);
        
        if (this.options.debug) {
            console.log(`尝试恢复 ${errorType} (第${retryCount}次), 延迟${delay}ms`);
        }
        
        // 等待延迟
        if (delay > 0) {
            await this.delay(delay);
        }
        
        // 获取恢复策略
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (!strategy) {
            // 使用默认恢复策略
            return this.defaultRecoveryStrategy(errorType, error, context);
        }
        
        try {
            const result = await strategy(error, context);
            
            if (result.success) {
                // 恢复成功，重置计数器
                this.retryCounters.delete(errorType);
                this.stats.successfulRecoveries++;
            } else {
                this.stats.failedRecoveries++;
            }
            
            return result;
            
        } catch (strategyError) {
            console.error('恢复策略执行失败:', strategyError);
            this.stats.failedRecoveries++;
            
            return {
                success: false,
                message: '恢复策略执行失败',
                error: strategyError
            };
        }
    }
    
    /**
     * 默认恢复策略
     * @param {string} errorType - 错误类型
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文信息
     * @returns {Promise<Object>} 恢复结果
     */
    async defaultRecoveryStrategy(errorType, error, context) {
        // 简单的重试策略
        if (context.retryFunction && typeof context.retryFunction === 'function') {
            try {
                await context.retryFunction();
                return { success: true, message: '重试成功' };
            } catch (retryError) {
                return { success: false, message: '重试失败', error: retryError };
            }
        }
        
        return { success: false, message: '没有可用的恢复策略' };
    }
    
    /**
     * 计算重试延迟
     * @param {number} retryCount - 重试次数
     * @returns {number} 延迟时间（毫秒）
     */
    calculateRetryDelay(retryCount) {
        if (!this.options.exponentialBackoff) {
            return this.options.retryDelay;
        }
        
        const delay = this.options.retryDelay * Math.pow(this.options.backoffMultiplier, retryCount - 1);
        return Math.min(delay, this.options.maxRetryDelay);
    }
    
    /**
     * 检查错误率是否过高
     * @param {string} errorType - 错误类型
     * @returns {boolean} 是否过高
     */
    isErrorRateTooHigh(errorType) {
        const now = Date.now();
        const timeWindow = this.options.timeWindow;
        
        // 统计时间窗口内的错误数量
        const recentErrors = this.errorHistory.filter(error => 
            now - error.timestamp <= timeWindow &&
            this.classifyError({ message: error.message, name: error.name }) === errorType
        );
        
        return recentErrors.length >= this.options.errorThreshold;
    }
    
    /**
     * 检查熔断器是否打开
     * @param {string} errorType - 错误类型
     * @returns {boolean} 是否打开
     */
    isCircuitBreakerOpen(errorType) {
        if (!this.options.enableCircuitBreaker) {
            return false;
        }
        
        const breaker = this.circuitBreakers.get(errorType);
        if (!breaker) {
            return false;
        }
        
        if (breaker.state === 'open') {
            // 检查是否应该进入半开状态
            if (Date.now() - breaker.lastFailure >= this.options.circuitBreakerTimeout) {
                breaker.state = 'half-open';
                return false;
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 更新熔断器状态
     * @param {string} errorType - 错误类型
     * @param {boolean} success - 是否成功
     */
    updateCircuitBreaker(errorType, success) {
        if (!this.options.enableCircuitBreaker) {
            return;
        }
        
        let breaker = this.circuitBreakers.get(errorType);
        if (!breaker) {
            breaker = {
                state: 'closed',
                failureCount: 0,
                lastFailure: null
            };
            this.circuitBreakers.set(errorType, breaker);
        }
        
        if (success) {
            // 成功，重置或关闭熔断器
            if (breaker.state === 'half-open') {
                breaker.state = 'closed';
                breaker.failureCount = 0;
            }
        } else {
            // 失败，增加失败计数
            breaker.failureCount++;
            breaker.lastFailure = Date.now();
            
            if (breaker.failureCount >= this.options.circuitBreakerThreshold) {
                breaker.state = 'open';
                this.stats.circuitBreakerTrips++;
                
                this.emit('circuitBreakerTripped', {
                    errorType,
                    failureCount: breaker.failureCount
                });
                
                if (this.options.debug) {
                    console.log(`熔断器已打开: ${errorType}`);
                }
            }
        }
    }
    
    /**
     * 更新恢复统计
     * @param {boolean} success - 是否成功
     */
    updateRecoveryStats(success) {
        if (success) {
            this.stats.successfulRecoveries++;
        } else {
            this.stats.failedRecoveries++;
        }
    }
    
    /**
     * 启动健康检查
     */
    startHealthCheck() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.options.healthCheckInterval);
        
        if (this.options.debug) {
            console.log('健康检查已启动');
        }
    }
    
    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        if (this.options.debug) {
            console.log('健康检查已停止');
        }
    }
    
    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        try {
            this.stats.healthChecks++;
            
            const issues = [];
            const componentStatus = new Map();
            
            // 检查错误率
            const recentErrorRate = this.getRecentErrorRate();
            if (recentErrorRate > 0.1) { // 10%错误率阈值
                issues.push({
                    type: 'high_error_rate',
                    severity: 'warning',
                    message: `错误率过高: ${(recentErrorRate * 100).toFixed(2)}%`
                });
            }
            
            // 检查熔断器状态
            for (const [errorType, breaker] of this.circuitBreakers) {
                if (breaker.state === 'open') {
                    issues.push({
                        type: 'circuit_breaker_open',
                        severity: 'critical',
                        message: `熔断器已打开: ${errorType}`
                    });
                }
            }
            
            // 检查内存使用
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
                if (memoryUsage > 0.9) {
                    issues.push({
                        type: 'high_memory_usage',
                        severity: 'warning',
                        message: `内存使用率过高: ${(memoryUsage * 100).toFixed(2)}%`
                    });
                }
            }
            
            // 更新健康状态
            this.healthStatus = {
                overall: issues.length === 0 ? 'healthy' : 
                        issues.some(i => i.severity === 'critical') ? 'critical' : 'warning',
                components: componentStatus,
                lastCheck: Date.now(),
                issues
            };
            
            this.emit('healthCheckCompleted', this.healthStatus);
            
            if (this.options.debug && issues.length > 0) {
                console.log('健康检查发现问题:', issues);
            }
            
        } catch (error) {
            console.error('健康检查失败:', error);
        }
    }
    
    /**
     * 获取最近错误率
     * @returns {number} 错误率
     */
    getRecentErrorRate() {
        const now = Date.now();
        const timeWindow = this.options.timeWindow;
        
        const recentErrors = this.errorHistory.filter(error => 
            now - error.timestamp <= timeWindow
        );
        
        // 简化计算，假设总操作数为错误数的10倍
        const totalOperations = Math.max(recentErrors.length * 10, 100);
        
        return recentErrors.length / totalOperations;
    }
    
    /**
     * 启动清理定时器
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 300000); // 5分钟清理一次
    }
    
    /**
     * 清理过期数据
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 3600000; // 1小时
        
        // 清理过期错误记录
        this.errorHistory = this.errorHistory.filter(error => 
            now - error.timestamp <= maxAge
        );
        
        // 重置过期的重试计数器
        for (const [errorType, count] of this.retryCounters) {
            if (count === 0) {
                this.retryCounters.delete(errorType);
            }
        }
        
        if (this.options.debug) {
            console.log('错误恢复数据清理完成');
        }
    }
    
    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandlers() {
        // 未捕获的错误
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                type: 'uncaught_error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || new Error('Unhandled Promise Rejection'), {
                type: 'unhandled_rejection'
            });
        });
    }
    
    /**
     * 等待网络恢复
     * @returns {Promise} Promise对象
     */
    waitForNetwork() {
        return new Promise((resolve) => {
            if (navigator.onLine) {
                resolve();
                return;
            }
            
            const handleOnline = () => {
                window.removeEventListener('online', handleOnline);
                resolve();
            };
            
            window.addEventListener('online', handleOnline);
        });
    }
    
    /**
     * 生成错误ID
     * @returns {string} 错误ID
     */
    generateErrorId() {
        return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 毫秒
     * @returns {Promise} Promise对象
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            errorHistory: {
                total: this.errorHistory.length,
                recent: this.errorHistory.filter(e => 
                    Date.now() - e.timestamp <= this.options.timeWindow
                ).length
            },
            retryCounters: Object.fromEntries(this.retryCounters),
            circuitBreakers: Object.fromEntries(
                Array.from(this.circuitBreakers.entries()).map(([key, value]) => [
                    key,
                    {
                        state: value.state,
                        failureCount: value.failureCount,
                        lastFailure: value.lastFailure
                    }
                ])
            ),
            healthStatus: this.healthStatus,
            recoveryRate: this.stats.recoveryAttempts > 0 ? 
                (this.stats.successfulRecoveries / this.stats.recoveryAttempts) * 100 : 0
        };
    }
    
    /**
     * 获取错误报告
     * @returns {Object} 错误报告
     */
    getErrorReport() {
        const now = Date.now();
        const timeWindow = this.options.timeWindow;
        
        const recentErrors = this.errorHistory.filter(error => 
            now - error.timestamp <= timeWindow
        );
        
        // 按错误类型分组
        const errorsByType = {};
        for (const error of recentErrors) {
            const type = this.classifyError({ message: error.message, name: error.name });
            if (!errorsByType[type]) {
                errorsByType[type] = [];
            }
            errorsByType[type].push(error);
        }
        
        return {
            summary: {
                totalErrors: this.stats.totalErrors,
                recentErrors: recentErrors.length,
                criticalErrors: this.stats.criticalErrors,
                recoverableErrors: this.stats.recoverableErrors,
                recoveryRate: this.stats.recoveryAttempts > 0 ? 
                    (this.stats.successfulRecoveries / this.stats.recoveryAttempts) * 100 : 0
            },
            errorsByType,
            healthStatus: this.healthStatus,
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            timestamp: now
        };
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    off(event, listener) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error('错误恢复事件监听器执行出错:', error);
                }
            }
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopHealthCheck();
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        this.errorHistory.length = 0;
        this.retryCounters.clear();
        this.circuitBreakers.clear();
        this.recoveryStrategies.clear();
        this.eventListeners.clear();
        
        if (this.options.debug) {
            console.log('ErrorRecovery资源已清理');
        }
    }
}

export default ErrorRecovery;