/**
 * 边缘计算适配器
 * 支持边缘设备部署和分布式计算
 * 基于架构设计文档长期优化目标实现
 */

/**
 * 边缘设备类型枚举
 */
export const EdgeDeviceType = {
    MOBILE: 'mobile',                   // 移动设备
    TABLET: 'tablet',                   // 平板设备
    EMBEDDED: 'embedded',               // 嵌入式设备
    IOT: 'iot',                        // 物联网设备
    EDGE_SERVER: 'edge_server',         // 边缘服务器
    GATEWAY: 'gateway',                 // 网关设备
    WORKSTATION: 'workstation'          // 工作站
};

/**
 * 计算模式枚举
 */
export const ComputeMode = {
    LOCAL_ONLY: 'local_only',           // 仅本地计算
    CLOUD_ONLY: 'cloud_only',           // 仅云端计算
    HYBRID: 'hybrid',                   // 混合计算
    ADAPTIVE: 'adaptive',               // 自适应计算
    DISTRIBUTED: 'distributed',         // 分布式计算
    FEDERATED: 'federated'              // 联邦计算
};

/**
 * 任务优先级枚举
 */
export const TaskPriority = {
    CRITICAL: 'critical',               // 关键任务
    HIGH: 'high',                       // 高优先级
    NORMAL: 'normal',                   // 普通优先级
    LOW: 'low',                         // 低优先级
    BACKGROUND: 'background'            // 后台任务
};

/**
 * 网络状态枚举
 */
export const NetworkStatus = {
    OFFLINE: 'offline',                 // 离线
    POOR: 'poor',                       // 网络差
    GOOD: 'good',                       // 网络良好
    EXCELLENT: 'excellent'              // 网络优秀
};

/**
 * 边缘设备配置文件类
 */
class EdgeDeviceProfile {
    constructor(options = {}) {
        this.deviceId = options.deviceId || this._generateDeviceId();
        this.deviceType = options.deviceType || EdgeDeviceType.MOBILE;
        this.capabilities = {
            cpu: {
                cores: options.cpuCores || 4,
                frequency: options.cpuFrequency || 2.0, // GHz
                architecture: options.cpuArchitecture || 'arm64'
            },
            memory: {
                total: options.memoryTotal || 4096, // MB
                available: options.memoryAvailable || 2048 // MB
            },
            gpu: {
                available: options.gpuAvailable || false,
                memory: options.gpuMemory || 0, // MB
                computeUnits: options.gpuComputeUnits || 0
            },
            storage: {
                total: options.storageTotal || 64000, // MB
                available: options.storageAvailable || 32000 // MB
            },
            network: {
                bandwidth: options.networkBandwidth || 100, // Mbps
                latency: options.networkLatency || 50, // ms
                reliability: options.networkReliability || 0.9
            },
            battery: {
                available: options.batteryAvailable || true,
                level: options.batteryLevel || 1.0, // 0-1
                charging: options.batteryCharging || false
            },
            sensors: options.sensors || ['camera', 'accelerometer', 'gyroscope']
        };
        
        this.constraints = {
            maxPowerConsumption: options.maxPowerConsumption || 10, // W
            maxTemperature: options.maxTemperature || 70, // °C
            maxMemoryUsage: options.maxMemoryUsage || 0.8, // 80%
            maxCpuUsage: options.maxCpuUsage || 0.9, // 90%
            minBatteryLevel: options.minBatteryLevel || 0.2 // 20%
        };
        
        this.location = {
            latitude: options.latitude || 0,
            longitude: options.longitude || 0,
            timezone: options.timezone || 'UTC',
            region: options.region || 'unknown'
        };
        
        this.lastUpdated = Date.now();
    }
    
    /**
     * 更新设备状态
     */
    updateStatus(status) {
        Object.assign(this.capabilities, status);
        this.lastUpdated = Date.now();
    }
    
    /**
     * 计算设备性能评分
     */
    calculatePerformanceScore() {
        const weights = {
            cpu: 0.3,
            memory: 0.25,
            gpu: 0.2,
            network: 0.15,
            battery: 0.1
        };
        
        const cpuScore = Math.min(1, this.capabilities.cpu.cores * this.capabilities.cpu.frequency / 8);
        const memoryScore = Math.min(1, this.capabilities.memory.available / 4096);
        const gpuScore = this.capabilities.gpu.available ? Math.min(1, this.capabilities.gpu.computeUnits / 1000) : 0;
        const networkScore = Math.min(1, this.capabilities.network.bandwidth / 1000);
        const batteryScore = this.capabilities.battery.available ? this.capabilities.battery.level : 1;
        
        return (
            cpuScore * weights.cpu +
            memoryScore * weights.memory +
            gpuScore * weights.gpu +
            networkScore * weights.network +
            batteryScore * weights.battery
        );
    }
    
    /**
     * 检查是否满足任务要求
     */
    canHandleTask(taskRequirements) {
        const checks = {
            cpu: this.capabilities.cpu.cores >= (taskRequirements.minCpuCores || 1),
            memory: this.capabilities.memory.available >= (taskRequirements.minMemory || 512),
            gpu: !taskRequirements.requiresGpu || this.capabilities.gpu.available,
            network: this.capabilities.network.bandwidth >= (taskRequirements.minBandwidth || 10),
            battery: !this.capabilities.battery.available || 
                    this.capabilities.battery.level >= this.constraints.minBatteryLevel
        };
        
        return Object.values(checks).every(check => check);
    }
    
    /**
     * 生成设备ID
     */
    _generateDeviceId() {
        return 'edge_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

/**
 * 计算任务类
 */
class ComputeTask {
    constructor(options = {}) {
        this.id = options.id || this._generateTaskId();
        this.name = options.name || 'unnamed_task';
        this.type = options.type || 'general';
        this.priority = options.priority || TaskPriority.NORMAL;
        this.payload = options.payload || {};
        this.requirements = {
            minCpuCores: options.minCpuCores || 1,
            minMemory: options.minMemory || 512, // MB
            minBandwidth: options.minBandwidth || 10, // Mbps
            maxLatency: options.maxLatency || 1000, // ms
            requiresGpu: options.requiresGpu || false,
            estimatedDuration: options.estimatedDuration || 5000, // ms
            dataSize: options.dataSize || 1024 // KB
        };
        
        this.constraints = {
            deadline: options.deadline || Date.now() + 30000, // 30秒后
            maxRetries: options.maxRetries || 3,
            allowPartialResults: options.allowPartialResults || false,
            requiresSecureExecution: options.requiresSecureExecution || false
        };
        
        this.status = 'pending';
        this.assignedDevice = null;
        this.startTime = null;
        this.endTime = null;
        this.result = null;
        this.error = null;
        this.retryCount = 0;
        
        this.createdAt = Date.now();
        this.updatedAt = Date.now();
    }
    
    /**
     * 更新任务状态
     */
    updateStatus(status, data = {}) {
        this.status = status;
        this.updatedAt = Date.now();
        
        if (status === 'running') {
            this.startTime = Date.now();
        } else if (status === 'completed' || status === 'failed') {
            this.endTime = Date.now();
        }
        
        Object.assign(this, data);
    }
    
    /**
     * 获取任务执行时间
     */
    getExecutionTime() {
        if (!this.startTime) return 0;
        return (this.endTime || Date.now()) - this.startTime;
    }
    
    /**
     * 检查是否超时
     */
    isExpired() {
        return Date.now() > this.constraints.deadline;
    }
    
    /**
     * 可以重试
     */
    canRetry() {
        return this.retryCount < this.constraints.maxRetries && !this.isExpired();
    }
    
    /**
     * 生成任务ID
     */
    _generateTaskId() {
        return 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

/**
 * 网络监控器
 */
class NetworkMonitor {
    constructor(options = {}) {
        this.options = {
            checkInterval: options.checkInterval || 5000, // 5秒
            timeoutDuration: options.timeoutDuration || 3000, // 3秒
            testEndpoints: options.testEndpoints || [
                'https://www.google.com/favicon.ico',
                'https://www.cloudflare.com/favicon.ico'
            ],
            ...options
        };
        
        this.status = NetworkStatus.OFFLINE;
        this.metrics = {
            latency: 0,
            bandwidth: 0,
            packetLoss: 0,
            jitter: 0,
            reliability: 0
        };
        
        this.history = [];
        this.isMonitoring = false;
        this.monitorTimer = null;
        
        this.eventListeners = new Map();
    }
    
    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this._performCheck();
        
        this.monitorTimer = setInterval(() => {
            this._performCheck();
        }, this.options.checkInterval);
        
        console.log('网络监控已启动');
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
        
        console.log('网络监控已停止');
    }
    
    /**
     * 获取当前网络状态
     */
    getStatus() {
        return {
            status: this.status,
            metrics: { ...this.metrics },
            lastCheck: this.history.length > 0 ? this.history[this.history.length - 1].timestamp : null
        };
    }
    
    /**
     * 获取网络历史
     */
    getHistory(limit = 50) {
        return this.history.slice(-limit);
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 执行网络检查
     */
    async _performCheck() {
        const startTime = performance.now();
        const results = [];
        
        for (const endpoint of this.options.testEndpoints) {
            try {
                const result = await this._testEndpoint(endpoint);
                results.push(result);
            } catch (error) {
                results.push({ success: false, latency: Infinity, error: error.message });
            }
        }
        
        const totalTime = performance.now() - startTime;
        this._analyzeResults(results, totalTime);
    }
    
    /**
     * 测试端点
     */
    async _testEndpoint(url) {
        const startTime = performance.now();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('请求超时'));
            }, this.options.timeoutDuration);
            
            fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
            })
            .then(() => {
                clearTimeout(timeout);
                const latency = performance.now() - startTime;
                resolve({ success: true, latency });
            })
            .catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    
    /**
     * 分析结果
     */
    _analyzeResults(results, totalTime) {
        const successfulResults = results.filter(r => r.success);
        const successRate = successfulResults.length / results.length;
        
        let avgLatency = 0;
        if (successfulResults.length > 0) {
            avgLatency = successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length;
        }
        
        // 更新指标
        this.metrics = {
            latency: avgLatency,
            bandwidth: this._estimateBandwidth(avgLatency),
            packetLoss: 1 - successRate,
            jitter: this._calculateJitter(successfulResults),
            reliability: successRate
        };
        
        // 确定网络状态
        const previousStatus = this.status;
        this.status = this._determineNetworkStatus();
        
        // 记录历史
        const record = {
            timestamp: Date.now(),
            status: this.status,
            metrics: { ...this.metrics },
            testResults: results,
            totalTime
        };
        
        this.history.push(record);
        
        // 保持历史大小
        if (this.history.length > 1000) {
            this.history = this.history.slice(-500);
        }
        
        // 触发状态变化事件
        if (previousStatus !== this.status) {
            this._emitEvent('statusChanged', {
                previousStatus,
                currentStatus: this.status,
                metrics: this.metrics
            });
        }
        
        // 触发检查完成事件
        this._emitEvent('checkCompleted', record);
    }
    
    /**
     * 估算带宽
     */
    _estimateBandwidth(latency) {
        // 简化的带宽估算，基于延迟
        if (latency < 50) return 1000; // 1Gbps
        if (latency < 100) return 100; // 100Mbps
        if (latency < 200) return 50;  // 50Mbps
        if (latency < 500) return 10;  // 10Mbps
        return 1; // 1Mbps
    }
    
    /**
     * 计算抖动
     */
    _calculateJitter(results) {
        if (results.length < 2) return 0;
        
        const latencies = results.map(r => r.latency);
        const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
        
        const variance = latencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / latencies.length;
        return Math.sqrt(variance);
    }
    
    /**
     * 确定网络状态
     */
    _determineNetworkStatus() {
        if (this.metrics.reliability < 0.5) {
            return NetworkStatus.OFFLINE;
        }
        
        if (this.metrics.latency > 500 || this.metrics.reliability < 0.8) {
            return NetworkStatus.POOR;
        }
        
        if (this.metrics.latency > 100 || this.metrics.reliability < 0.95) {
            return NetworkStatus.GOOD;
        }
        
        return NetworkStatus.EXCELLENT;
    }
    
    /**
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`网络监控事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

/**
 * 任务调度器
 */
class TaskScheduler {
    constructor(options = {}) {
        this.options = {
            maxConcurrentTasks: options.maxConcurrentTasks || 5,
            taskTimeout: options.taskTimeout || 30000, // 30秒
            retryDelay: options.retryDelay || 2000, // 2秒
            enableLoadBalancing: options.enableLoadBalancing !== false,
            ...options
        };
        
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.completedTasks = new Map();
        this.availableDevices = new Map();
        
        this.isRunning = false;
        this.schedulerTimer = null;
        
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            avgExecutionTime: 0,
            totalExecutionTime: 0
        };
        
        this.eventListeners = new Map();
    }
    
    /**
     * 启动调度器
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this._startScheduling();
        
        console.log('任务调度器已启动');
    }
    
    /**
     * 停止调度器
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }
        
        console.log('任务调度器已停止');
    }
    
    /**
     * 注册设备
     */
    registerDevice(device) {
        this.availableDevices.set(device.deviceId, device);
        this._emitEvent('deviceRegistered', { device });
        
        console.log(`设备 ${device.deviceId} 已注册`);
    }
    
    /**
     * 注销设备
     */
    unregisterDevice(deviceId) {
        const device = this.availableDevices.get(deviceId);
        if (device) {
            this.availableDevices.delete(deviceId);
            this._emitEvent('deviceUnregistered', { device });
            
            console.log(`设备 ${deviceId} 已注销`);
        }
    }
    
    /**
     * 提交任务
     */
    submitTask(task) {
        if (!(task instanceof ComputeTask)) {
            task = new ComputeTask(task);
        }
        
        this.taskQueue.push(task);
        this.stats.totalTasks++;
        
        // 按优先级排序
        this._sortTaskQueue();
        
        this._emitEvent('taskSubmitted', { task });
        
        console.log(`任务 ${task.id} 已提交`);
        return task.id;
    }
    
    /**
     * 取消任务
     */
    cancelTask(taskId) {
        // 从队列中移除
        const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
        if (queueIndex !== -1) {
            const task = this.taskQueue.splice(queueIndex, 1)[0];
            task.updateStatus('cancelled');
            this._emitEvent('taskCancelled', { task });
            return true;
        }
        
        // 停止运行中的任务
        const runningTask = this.runningTasks.get(taskId);
        if (runningTask) {
            runningTask.updateStatus('cancelled');
            this.runningTasks.delete(taskId);
            this._emitEvent('taskCancelled', { task: runningTask });
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取任务状态
     */
    getTaskStatus(taskId) {
        // 检查运行中的任务
        const runningTask = this.runningTasks.get(taskId);
        if (runningTask) {
            return {
                status: runningTask.status,
                progress: this._calculateTaskProgress(runningTask),
                assignedDevice: runningTask.assignedDevice,
                executionTime: runningTask.getExecutionTime()
            };
        }
        
        // 检查已完成的任务
        const completedTask = this.completedTasks.get(taskId);
        if (completedTask) {
            return {
                status: completedTask.status,
                result: completedTask.result,
                error: completedTask.error,
                executionTime: completedTask.getExecutionTime()
            };
        }
        
        // 检查队列中的任务
        const queuedTask = this.taskQueue.find(task => task.id === taskId);
        if (queuedTask) {
            return {
                status: 'queued',
                queuePosition: this.taskQueue.indexOf(queuedTask) + 1,
                estimatedWaitTime: this._estimateWaitTime(queuedTask)
            };
        }
        
        return null;
    }
    
    /**
     * 获取调度器统计
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.taskQueue.length,
            runningTasks: this.runningTasks.size,
            availableDevices: this.availableDevices.size,
            isRunning: this.isRunning
        };
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 开始调度
     */
    _startScheduling() {
        this.schedulerTimer = setInterval(() => {
            this._scheduleNextTask();
            this._checkRunningTasks();
        }, 1000); // 每秒检查一次
    }
    
    /**
     * 调度下一个任务
     */
    _scheduleNextTask() {
        if (this.taskQueue.length === 0) return;
        if (this.runningTasks.size >= this.options.maxConcurrentTasks) return;
        
        const task = this.taskQueue.shift();
        if (!task) return;
        
        // 检查任务是否过期
        if (task.isExpired()) {
            task.updateStatus('expired');
            this.stats.failedTasks++;
            this._emitEvent('taskExpired', { task });
            return;
        }
        
        // 选择最佳设备
        const bestDevice = this._selectBestDevice(task);
        if (!bestDevice) {
            // 没有合适的设备，重新放回队列
            this.taskQueue.unshift(task);
            return;
        }
        
        // 分配任务
        task.assignedDevice = bestDevice.deviceId;
        task.updateStatus('running');
        this.runningTasks.set(task.id, task);
        
        // 执行任务
        this._executeTask(task, bestDevice);
        
        this._emitEvent('taskStarted', { task, device: bestDevice });
    }
    
    /**
     * 检查运行中的任务
     */
    _checkRunningTasks() {
        const now = Date.now();
        
        this.runningTasks.forEach((task, taskId) => {
            // 检查超时
            if (task.startTime && (now - task.startTime) > this.options.taskTimeout) {
                task.updateStatus('timeout');
                this.runningTasks.delete(taskId);
                this.stats.failedTasks++;
                
                this._emitEvent('taskTimeout', { task });
                
                // 重试任务
                if (task.canRetry()) {
                    task.retryCount++;
                    task.assignedDevice = null;
                    task.startTime = null;
                    task.updateStatus('pending');
                    
                    setTimeout(() => {
                        this.taskQueue.unshift(task);
                    }, this.options.retryDelay);
                }
            }
        });
    }
    
    /**
     * 选择最佳设备
     */
    _selectBestDevice(task) {
        const suitableDevices = Array.from(this.availableDevices.values())
            .filter(device => device.canHandleTask(task.requirements));
        
        if (suitableDevices.length === 0) return null;
        
        if (!this.options.enableLoadBalancing) {
            return suitableDevices[0];
        }
        
        // 负载均衡：选择性能评分最高且当前负载最低的设备
        return suitableDevices.reduce((best, current) => {
            const currentScore = current.calculatePerformanceScore();
            const bestScore = best.calculatePerformanceScore();
            
            // 考虑当前负载
            const currentLoad = this._getDeviceLoad(current.deviceId);
            const bestLoad = this._getDeviceLoad(best.deviceId);
            
            const currentWeightedScore = currentScore * (1 - currentLoad * 0.5);
            const bestWeightedScore = bestScore * (1 - bestLoad * 0.5);
            
            return currentWeightedScore > bestWeightedScore ? current : best;
        });
    }
    
    /**
     * 执行任务
     */
    async _executeTask(task, device) {
        try {
            // 模拟任务执行
            const result = await this._simulateTaskExecution(task, device);
            
            task.updateStatus('completed', { result });
            this.runningTasks.delete(task.id);
            this.completedTasks.set(task.id, task);
            
            // 更新统计
            this.stats.completedTasks++;
            this.stats.totalExecutionTime += task.getExecutionTime();
            this.stats.avgExecutionTime = this.stats.totalExecutionTime / this.stats.completedTasks;
            
            this._emitEvent('taskCompleted', { task, result });
            
        } catch (error) {
            task.updateStatus('failed', { error: error.message });
            this.runningTasks.delete(task.id);
            this.stats.failedTasks++;
            
            this._emitEvent('taskFailed', { task, error });
            
            // 重试任务
            if (task.canRetry()) {
                task.retryCount++;
                task.assignedDevice = null;
                task.startTime = null;
                task.updateStatus('pending');
                
                setTimeout(() => {
                    this.taskQueue.unshift(task);
                }, this.options.retryDelay);
            }
        }
    }
    
    /**
     * 模拟任务执行
     */
    async _simulateTaskExecution(task, device) {
        // 模拟执行时间
        const executionTime = Math.random() * task.requirements.estimatedDuration;
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 90%的成功率
                if (Math.random() < 0.9) {
                    resolve({
                        taskId: task.id,
                        deviceId: device.deviceId,
                        executionTime,
                        result: `Task ${task.name} completed successfully`
                    });
                } else {
                    reject(new Error('Task execution failed'));
                }
            }, executionTime);
        });
    }
    
    /**
     * 获取设备负载
     */
    _getDeviceLoad(deviceId) {
        const runningTasksOnDevice = Array.from(this.runningTasks.values())
            .filter(task => task.assignedDevice === deviceId);
        
        return runningTasksOnDevice.length / this.options.maxConcurrentTasks;
    }
    
    /**
     * 计算任务进度
     */
    _calculateTaskProgress(task) {
        if (!task.startTime) return 0;
        
        const elapsed = Date.now() - task.startTime;
        const estimated = task.requirements.estimatedDuration;
        
        return Math.min(1, elapsed / estimated);
    }
    
    /**
     * 估算等待时间
     */
    _estimateWaitTime(task) {
        const position = this.taskQueue.indexOf(task);
        const avgExecutionTime = this.stats.avgExecutionTime || 5000;
        
        return position * avgExecutionTime / this.options.maxConcurrentTasks;
    }
    
    /**
     * 排序任务队列
     */
    _sortTaskQueue() {
        const priorityOrder = {
            [TaskPriority.CRITICAL]: 0,
            [TaskPriority.HIGH]: 1,
            [TaskPriority.NORMAL]: 2,
            [TaskPriority.LOW]: 3,
            [TaskPriority.BACKGROUND]: 4
        };
        
        this.taskQueue.sort((a, b) => {
            // 首先按优先级排序
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // 然后按截止时间排序
            return a.constraints.deadline - b.constraints.deadline;
        });
    }
    
    /**
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`任务调度器事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

/**
 * 边缘计算适配器主类
 */
class EdgeComputingAdapter {
    constructor(options = {}) {
        this.name = 'EdgeComputingAdapter';
        this.options = {
            computeMode: options.computeMode || ComputeMode.ADAPTIVE,
            enableNetworkMonitoring: options.enableNetworkMonitoring !== false,
            enableTaskScheduling: options.enableTaskScheduling !== false,
            deviceProfileUpdateInterval: options.deviceProfileUpdateInterval || 30000, // 30秒
            ...options
        };
        
        this.deviceProfile = new EdgeDeviceProfile(options.deviceProfile || {});
        this.networkMonitor = new NetworkMonitor(options.networkMonitor || {});
        this.taskScheduler = new TaskScheduler(options.taskScheduler || {});
        
        this.computeMode = this.options.computeMode;
        this.isInitialized = false;
        this.isRunning = false;
        
        this.eventListeners = new Map();
        this.stats = {
            startTime: null,
            totalComputeTasks: 0,
            localTasks: 0,
            cloudTasks: 0,
            hybridTasks: 0,
            avgTaskLatency: 0,
            totalTaskLatency: 0
        };
        
        this._setupEventListeners();
        
        console.log('边缘计算适配器初始化完成');
    }
    
    /**
     * 初始化适配器
     */
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // 检测设备能力
            await this._detectDeviceCapabilities();
            
            // 启动网络监控
            if (this.options.enableNetworkMonitoring) {
                this.networkMonitor.startMonitoring();
            }
            
            // 启动任务调度器
            if (this.options.enableTaskScheduling) {
                this.taskScheduler.start();
                this.taskScheduler.registerDevice(this.deviceProfile);
            }
            
            // 启动设备状态更新
            this._startDeviceStatusUpdates();
            
            this.isInitialized = true;
            this.stats.startTime = Date.now();
            
            this._emitEvent('initialized', { adapter: this });
            
            console.log('边缘计算适配器初始化完成');
            return true;
            
        } catch (error) {
            console.error('边缘计算适配器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 启动适配器
     */
    start() {
        if (!this.isInitialized) {
            throw new Error('适配器未初始化');
        }
        
        if (this.isRunning) return;
        
        this.isRunning = true;
        this._emitEvent('started', { adapter: this });
        
        console.log('边缘计算适配器已启动');
    }
    
    /**
     * 停止适配器
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        this.networkMonitor.stopMonitoring();
        this.taskScheduler.stop();
        
        this._emitEvent('stopped', { adapter: this });
        
        console.log('边缘计算适配器已停止');
    }
    
    /**
     * 提交计算任务
     */
    async submitComputeTask(taskOptions) {
        if (!this.isRunning) {
            throw new Error('适配器未运行');
        }
        
        const task = new ComputeTask(taskOptions);
        
        // 根据计算模式决定执行策略
        const executionStrategy = this._determineExecutionStrategy(task);
        
        this.stats.totalComputeTasks++;
        
        switch (executionStrategy) {
            case 'local':
                return await this._executeLocalTask(task);
            case 'cloud':
                return await this._executeCloudTask(task);
            case 'hybrid':
                return await this._executeHybridTask(task);
            default:
                return await this._executeAdaptiveTask(task);
        }
    }
    
    /**
     * 设置计算模式
     */
    setComputeMode(mode) {
        this.computeMode = mode;
        this._emitEvent('computeModeChanged', { mode });
        
        console.log(`计算模式已切换为: ${mode}`);
    }
    
    /**
     * 获取设备配置文件
     */
    getDeviceProfile() {
        return this.deviceProfile;
    }
    
    /**
     * 获取网络状态
     */
    getNetworkStatus() {
        return this.networkMonitor.getStatus();
    }
    
    /**
     * 获取适配器统计
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            computeMode: this.computeMode,
            deviceProfile: this.deviceProfile.calculatePerformanceScore(),
            networkStatus: this.networkMonitor.getStatus(),
            taskScheduler: this.taskScheduler.getStats()
        };
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * 销毁适配器
     */
    destroy() {
        this.stop();
        
        this.networkMonitor.stopMonitoring();
        this.taskScheduler.stop();
        
        this.eventListeners.clear();
        
        console.log('边缘计算适配器已销毁');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 检测设备能力
     */
    async _detectDeviceCapabilities() {
        // 检测CPU信息
        if (navigator.hardwareConcurrency) {
            this.deviceProfile.capabilities.cpu.cores = navigator.hardwareConcurrency;
        }
        
        // 检测内存信息
        if (navigator.deviceMemory) {
            this.deviceProfile.capabilities.memory.total = navigator.deviceMemory * 1024; // GB to MB
        }
        
        // 检测网络信息
        if (navigator.connection) {
            const connection = navigator.connection;
            this.deviceProfile.capabilities.network.bandwidth = connection.downlink || 100;
            this.deviceProfile.capabilities.network.latency = connection.rtt || 50;
        }
        
        // 检测电池信息
        if (navigator.getBattery) {
            try {
                const battery = await navigator.getBattery();
                this.deviceProfile.capabilities.battery.level = battery.level;
                this.deviceProfile.capabilities.battery.charging = battery.charging;
            } catch (error) {
                console.warn('无法获取电池信息:', error);
            }
        }
        
        console.log('设备能力检测完成:', this.deviceProfile.capabilities);
    }
    
    /**
     * 启动设备状态更新
     */
    _startDeviceStatusUpdates() {
        setInterval(() => {
            this._updateDeviceStatus();
        }, this.options.deviceProfileUpdateInterval);
    }
    
    /**
     * 更新设备状态
     */
    _updateDeviceStatus() {
        // 更新内存使用情况
        if (performance.memory) {
            const memoryInfo = performance.memory;
            const usedMemory = memoryInfo.usedJSHeapSize / 1024 / 1024; // bytes to MB
            this.deviceProfile.capabilities.memory.available = 
                this.deviceProfile.capabilities.memory.total - usedMemory;
        }
        
        // 更新网络状态
        if (navigator.connection) {
            const connection = navigator.connection;
            this.deviceProfile.capabilities.network.bandwidth = connection.downlink || 100;
            this.deviceProfile.capabilities.network.latency = connection.rtt || 50;
        }
        
        this.deviceProfile.updateStatus(this.deviceProfile.capabilities);
    }
    
    /**
     * 设置事件监听器
     */
    _setupEventListeners() {
        // 网络状态变化
        this.networkMonitor.addEventListener('statusChanged', (data) => {
            this._emitEvent('networkStatusChanged', data);
            
            // 根据网络状态调整计算模式
            if (this.computeMode === ComputeMode.ADAPTIVE) {
                this._adjustComputeModeForNetwork(data.currentStatus);
            }
        });
        
        // 任务完成
        this.taskScheduler.addEventListener('taskCompleted', (data) => {
            this._updateTaskStats(data.task);
            this._emitEvent('taskCompleted', data);
        });
        
        // 任务失败
        this.taskScheduler.addEventListener('taskFailed', (data) => {
            this._emitEvent('taskFailed', data);
        });
    }
    
    /**
     * 确定执行策略
     */
    _determineExecutionStrategy(task) {
        switch (this.computeMode) {
            case ComputeMode.LOCAL_ONLY:
                return 'local';
            case ComputeMode.CLOUD_ONLY:
                return 'cloud';
            case ComputeMode.HYBRID:
                return 'hybrid';
            case ComputeMode.ADAPTIVE:
                return this._selectAdaptiveStrategy(task);
            default:
                return 'local';
        }
    }
    
    /**
     * 选择自适应策略
     */
    _selectAdaptiveStrategy(task) {
        const networkStatus = this.networkMonitor.getStatus();
        const deviceScore = this.deviceProfile.calculatePerformanceScore();
        
        // 网络离线或很差时，优先本地执行
        if (networkStatus.status === NetworkStatus.OFFLINE || 
            networkStatus.status === NetworkStatus.POOR) {
            return 'local';
        }
        
        // 设备性能很好且任务不复杂时，本地执行
        if (deviceScore > 0.8 && task.requirements.estimatedDuration < 10000) {
            return 'local';
        }
        
        // 网络很好且任务复杂时，云端执行
        if (networkStatus.status === NetworkStatus.EXCELLENT && 
            task.requirements.estimatedDuration > 30000) {
            return 'cloud';
        }
        
        // 其他情况使用混合策略
        return 'hybrid';
    }
    
    /**
     * 执行本地任务
     */
    async _executeLocalTask(task) {
        this.stats.localTasks++;
        
        const taskId = this.taskScheduler.submitTask(task);
        
        return new Promise((resolve, reject) => {
            const checkStatus = () => {
                const status = this.taskScheduler.getTaskStatus(taskId);
                
                if (status.status === 'completed') {
                    resolve(status.result);
                } else if (status.status === 'failed') {
                    reject(new Error(status.error));
                } else {
                    setTimeout(checkStatus, 1000);
                }
            };
            
            checkStatus();
        });
    }
    
    /**
     * 执行云端任务
     */
    async _executeCloudTask(task) {
        this.stats.cloudTasks++;
        
        // 模拟云端执行
        return new Promise((resolve, reject) => {
            const networkLatency = this.networkMonitor.getStatus().metrics.latency;
            const totalTime = task.requirements.estimatedDuration + networkLatency * 2;
            
            setTimeout(() => {
                if (Math.random() < 0.95) { // 95%成功率
                    resolve({
                        taskId: task.id,
                        executionLocation: 'cloud',
                        result: `Cloud task ${task.name} completed`
                    });
                } else {
                    reject(new Error('Cloud execution failed'));
                }
            }, totalTime);
        });
    }
    
    /**
     * 执行混合任务
     */
    async _executeHybridTask(task) {
        this.stats.hybridTasks++;
        
        // 将任务分解为本地和云端部分
        const localPart = { ...task, name: task.name + '_local' };
        const cloudPart = { ...task, name: task.name + '_cloud' };
        
        try {
            const [localResult, cloudResult] = await Promise.all([
                this._executeLocalTask(localPart),
                this._executeCloudTask(cloudPart)
            ]);
            
            return {
                taskId: task.id,
                executionLocation: 'hybrid',
                localResult,
                cloudResult
            };
        } catch (error) {
            throw new Error(`Hybrid execution failed: ${error.message}`);
        }
    }
    
    /**
     * 执行自适应任务
     */
    async _executeAdaptiveTask(task) {
        const strategy = this._selectAdaptiveStrategy(task);
        
        switch (strategy) {
            case 'local':
                return await this._executeLocalTask(task);
            case 'cloud':
                return await this._executeCloudTask(task);
            case 'hybrid':
                return await this._executeHybridTask(task);
            default:
                return await this._executeLocalTask(task);
        }
    }
    
    /**
     * 根据网络状态调整计算模式
     */
    _adjustComputeModeForNetwork(networkStatus) {
        let newMode = this.computeMode;
        
        switch (networkStatus) {
            case NetworkStatus.OFFLINE:
            case NetworkStatus.POOR:
                newMode = ComputeMode.LOCAL_ONLY;
                break;
            case NetworkStatus.EXCELLENT:
                newMode = ComputeMode.HYBRID;
                break;
            default:
                newMode = ComputeMode.ADAPTIVE;
        }
        
        if (newMode !== this.computeMode) {
            this.setComputeMode(newMode);
        }
    }
    
    /**
     * 更新任务统计
     */
    _updateTaskStats(task) {
        const latency = task.getExecutionTime();
        this.stats.totalTaskLatency += latency;
        
        const completedTasks = this.stats.localTasks + this.stats.cloudTasks + this.stats.hybridTasks;
        this.stats.avgTaskLatency = this.stats.totalTaskLatency / completedTasks;
    }
    
    /**
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`边缘计算适配器事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

export default EdgeComputingAdapter;
export {
    EdgeDeviceProfile,
    ComputeTask,
    NetworkMonitor,
    TaskScheduler,
    EdgeDeviceType,
    ComputeMode,
    TaskPriority,
    NetworkStatus
};