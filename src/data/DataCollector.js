/**
 * 数据收集器
 * 负责收集、存储和管理姿态检测数据
 */

import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { StorageManager } from '../core/StorageManager.js';

export class DataCollector {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 收集选项
            autoSave: options.autoSave !== false,
            saveInterval: options.saveInterval || 5000, // 5秒
            maxMemorySize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB
            maxRecords: options.maxRecords || 10000,
            
            // 数据类型
            collectPoses: options.collectPoses !== false,
            collectTrajectories: options.collectTrajectories !== false,
            collectAnalysis: options.collectAnalysis !== false,
            collectPerformance: options.collectPerformance !== false,
            collectEvents: options.collectEvents !== false,
            
            // 过滤选项
            minConfidence: options.minConfidence || 0,
            skipDuplicates: options.skipDuplicates !== false,
            duplicateThreshold: options.duplicateThreshold || 0.01,
            
            // 压缩选项
            enableCompression: options.enableCompression || false,
            compressionLevel: options.compressionLevel || 6,
            
            // 存储选项
            storageType: options.storageType || 'memory', // memory, localStorage, indexedDB
            storageKey: options.storageKey || 'pose_data',
            
            // 批处理选项
            batchSize: options.batchSize || 100,
            enableBatching: options.enableBatching !== false,
            
            // 调试选项
            debug: options.debug || false,
            
            ...options
        };
        
        // 数据存储
        this.data = {
            poses: [],
            trajectories: {},
            analysis: [],
            performance: [],
            events: [],
            metadata: {
                startTime: Date.now(),
                version: '1.0.0',
                sessionId: this.generateSessionId()
            }
        };
        
        // 批处理队列
        this.batchQueue = [];
        this.pendingBatch = false;
        
        // 统计信息
        this.stats = {
            totalRecords: 0,
            recordsByType: {
                poses: 0,
                trajectories: 0,
                analysis: 0,
                performance: 0,
                events: 0
            },
            memoryUsage: 0,
            lastSaveTime: null,
            duplicatesSkipped: 0,
            compressionRatio: 1.0
        };
        
        // 工具实例
        this.logger = new Logger({ prefix: 'DataCollector' });
        this.eventBus = EventBus.getInstance();
        this.storageManager = new StorageManager();
        
        // 定时器
        this.saveTimer = null;
        this.cleanupTimer = null;
        
        this.init();
    }
    
    /**
     * 初始化数据收集器
     */
    init() {
        try {
            // 加载已保存的数据
            this.loadData();
            
            // 设置自动保存
            if (this.options.autoSave) {
                this.startAutoSave();
            }
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 启动清理定时器
            this.startCleanupTimer();
            
            if (this.options.debug) {
                this.logger.info('数据收集器已初始化', this.options);
            }
            
        } catch (error) {
            this.logger.error('数据收集器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听姿态检测结果
        this.eventBus.on('poseDetected', (poseData) => {
            if (this.options.collectPoses) {
                this.collectPose(poseData);
            }
        });
        
        // 监听轨迹更新
        this.eventBus.on('trajectoryUpdated', (trajectoryData) => {
            if (this.options.collectTrajectories) {
                this.collectTrajectory(trajectoryData);
            }
        });
        
        // 监听分析结果
        this.eventBus.on('analysisCompleted', (analysisData) => {
            if (this.options.collectAnalysis) {
                this.collectAnalysis(analysisData);
            }
        });
        
        // 监听性能数据
        this.eventBus.on('performanceUpdate', (performanceData) => {
            if (this.options.collectPerformance) {
                this.collectPerformance(performanceData);
            }
        });
        
        // 监听系统事件
        this.eventBus.on('systemEvent', (eventData) => {
            if (this.options.collectEvents) {
                this.collectEvent(eventData);
            }
        });
    }
    
    /**
     * 收集姿态数据
     * @param {Object} poseData - 姿态数据
     */
    collectPose(poseData) {
        try {
            // 验证数据
            if (!this.validatePoseData(poseData)) {
                return;
            }
            
            // 过滤低置信度数据
            if (poseData.confidence < this.options.minConfidence) {
                return;
            }
            
            // 检查重复数据
            if (this.options.skipDuplicates && this.isDuplicatePose(poseData)) {
                this.stats.duplicatesSkipped++;
                return;
            }
            
            // 添加时间戳和ID
            const enrichedData = {
                ...poseData,
                id: this.generateId(),
                timestamp: Date.now(),
                sessionId: this.data.metadata.sessionId
            };
            
            // 添加到数据集合
            if (this.options.enableBatching) {
                this.addToBatch('pose', enrichedData);
            } else {
                this.data.poses.push(enrichedData);
                this.updateStats('poses');
            }
            
            // 检查内存限制
            this.checkMemoryLimits();
            
            if (this.options.debug) {
                this.logger.debug('收集姿态数据', { id: enrichedData.id });
            }
            
        } catch (error) {
            this.logger.error('收集姿态数据失败:', error);
        }
    }
    
    /**
     * 收集轨迹数据
     * @param {Object} trajectoryData - 轨迹数据
     */
    collectTrajectory(trajectoryData) {
        try {
            const { keypointName, point } = trajectoryData;
            
            if (!keypointName || !point) {
                return;
            }
            
            // 初始化轨迹数组
            if (!this.data.trajectories[keypointName]) {
                this.data.trajectories[keypointName] = [];
            }
            
            // 添加时间戳
            const enrichedPoint = {
                ...point,
                timestamp: Date.now(),
                sessionId: this.data.metadata.sessionId
            };
            
            // 添加到轨迹
            if (this.options.enableBatching) {
                this.addToBatch('trajectory', { keypointName, point: enrichedPoint });
            } else {
                this.data.trajectories[keypointName].push(enrichedPoint);
                this.updateStats('trajectories');
            }
            
            // 限制轨迹长度
            const maxTrajectoryLength = 1000;
            if (this.data.trajectories[keypointName].length > maxTrajectoryLength) {
                this.data.trajectories[keypointName] = 
                    this.data.trajectories[keypointName].slice(-maxTrajectoryLength);
            }
            
        } catch (error) {
            this.logger.error('收集轨迹数据失败:', error);
        }
    }
    
    /**
     * 收集分析数据
     * @param {Object} analysisData - 分析数据
     */
    collectAnalysis(analysisData) {
        try {
            const enrichedData = {
                ...analysisData,
                id: this.generateId(),
                timestamp: Date.now(),
                sessionId: this.data.metadata.sessionId
            };
            
            if (this.options.enableBatching) {
                this.addToBatch('analysis', enrichedData);
            } else {
                this.data.analysis.push(enrichedData);
                this.updateStats('analysis');
            }
            
        } catch (error) {
            this.logger.error('收集分析数据失败:', error);
        }
    }
    
    /**
     * 收集性能数据
     * @param {Object} performanceData - 性能数据
     */
    collectPerformance(performanceData) {
        try {
            const enrichedData = {
                ...performanceData,
                timestamp: Date.now(),
                sessionId: this.data.metadata.sessionId
            };
            
            if (this.options.enableBatching) {
                this.addToBatch('performance', enrichedData);
            } else {
                this.data.performance.push(enrichedData);
                this.updateStats('performance');
            }
            
            // 限制性能数据长度
            const maxPerformanceRecords = 1000;
            if (this.data.performance.length > maxPerformanceRecords) {
                this.data.performance = this.data.performance.slice(-maxPerformanceRecords);
            }
            
        } catch (error) {
            this.logger.error('收集性能数据失败:', error);
        }
    }
    
    /**
     * 收集事件数据
     * @param {Object} eventData - 事件数据
     */
    collectEvent(eventData) {
        try {
            const enrichedData = {
                ...eventData,
                id: this.generateId(),
                timestamp: Date.now(),
                sessionId: this.data.metadata.sessionId
            };
            
            if (this.options.enableBatching) {
                this.addToBatch('event', enrichedData);
            } else {
                this.data.events.push(enrichedData);
                this.updateStats('events');
            }
            
            // 限制事件数据长度
            const maxEventRecords = 500;
            if (this.data.events.length > maxEventRecords) {
                this.data.events = this.data.events.slice(-maxEventRecords);
            }
            
        } catch (error) {
            this.logger.error('收集事件数据失败:', error);
        }
    }
    
    /**
     * 添加到批处理队列
     * @param {string} type - 数据类型
     * @param {Object} data - 数据
     */
    addToBatch(type, data) {
        this.batchQueue.push({ type, data, timestamp: Date.now() });
        
        // 检查是否需要处理批次
        if (this.batchQueue.length >= this.options.batchSize) {
            this.processBatch();
        }
    }
    
    /**
     * 处理批次数据
     */
    async processBatch() {
        if (this.pendingBatch || this.batchQueue.length === 0) {
            return;
        }
        
        this.pendingBatch = true;
        
        try {
            const batch = this.batchQueue.splice(0, this.options.batchSize);
            
            for (const item of batch) {
                switch (item.type) {
                    case 'pose':
                        this.data.poses.push(item.data);
                        this.updateStats('poses');
                        break;
                    case 'trajectory':
                        const { keypointName, point } = item.data;
                        if (!this.data.trajectories[keypointName]) {
                            this.data.trajectories[keypointName] = [];
                        }
                        this.data.trajectories[keypointName].push(point);
                        this.updateStats('trajectories');
                        break;
                    case 'analysis':
                        this.data.analysis.push(item.data);
                        this.updateStats('analysis');
                        break;
                    case 'performance':
                        this.data.performance.push(item.data);
                        this.updateStats('performance');
                        break;
                    case 'event':
                        this.data.events.push(item.data);
                        this.updateStats('events');
                        break;
                }
            }
            
            // 触发批处理完成事件
            this.eventBus.emit('batchProcessed', {
                batchSize: batch.length,
                timestamp: Date.now()
            });
            
        } catch (error) {
            this.logger.error('批处理失败:', error);
        } finally {
            this.pendingBatch = false;
        }
    }
    
    /**
     * 验证姿态数据
     * @param {Object} poseData - 姿态数据
     * @returns {boolean} 是否有效
     */
    validatePoseData(poseData) {
        if (!poseData || typeof poseData !== 'object') {
            return false;
        }
        
        // 检查必需字段
        if (!poseData.keypoints || !Array.isArray(poseData.keypoints)) {
            return false;
        }
        
        // 检查关键点格式
        for (const keypoint of poseData.keypoints) {
            if (typeof keypoint.x !== 'number' || typeof keypoint.y !== 'number') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 检查是否为重复姿态
     * @param {Object} poseData - 姿态数据
     * @returns {boolean} 是否重复
     */
    isDuplicatePose(poseData) {
        if (this.data.poses.length === 0) {
            return false;
        }
        
        const lastPose = this.data.poses[this.data.poses.length - 1];
        
        // 比较关键点位置
        if (lastPose.keypoints && poseData.keypoints) {
            const distance = this.calculatePoseDistance(lastPose.keypoints, poseData.keypoints);
            return distance < this.options.duplicateThreshold;
        }
        
        return false;
    }
    
    /**
     * 计算姿态距离
     * @param {Array} keypoints1 - 关键点1
     * @param {Array} keypoints2 - 关键点2
     * @returns {number} 距离
     */
    calculatePoseDistance(keypoints1, keypoints2) {
        if (keypoints1.length !== keypoints2.length) {
            return Infinity;
        }
        
        let totalDistance = 0;
        let validPoints = 0;
        
        for (let i = 0; i < keypoints1.length; i++) {
            const kp1 = keypoints1[i];
            const kp2 = keypoints2[i];
            
            if (kp1.score > 0.5 && kp2.score > 0.5) {
                const dx = kp1.x - kp2.x;
                const dy = kp1.y - kp2.y;
                totalDistance += Math.sqrt(dx * dx + dy * dy);
                validPoints++;
            }
        }
        
        return validPoints > 0 ? totalDistance / validPoints : Infinity;
    }
    
    /**
     * 更新统计信息
     * @param {string} type - 数据类型
     */
    updateStats(type) {
        this.stats.totalRecords++;
        this.stats.recordsByType[type]++;
        this.stats.memoryUsage = this.estimateMemoryUsage();
    }
    
    /**
     * 估算内存使用量
     * @returns {number} 内存使用量（字节）
     */
    estimateMemoryUsage() {
        try {
            const dataString = JSON.stringify(this.data);
            return dataString.length * 2; // 估算，考虑字符编码
        } catch (error) {
            this.logger.warn('无法估算内存使用量:', error);
            return 0;
        }
    }
    
    /**
     * 检查内存限制
     */
    checkMemoryLimits() {
        // 检查内存使用量
        if (this.stats.memoryUsage > this.options.maxMemorySize) {
            this.cleanupOldData();
        }
        
        // 检查记录数量
        if (this.stats.totalRecords > this.options.maxRecords) {
            this.cleanupOldData();
        }
    }
    
    /**
     * 清理旧数据
     */
    cleanupOldData() {
        const cleanupRatio = 0.3; // 清理30%的旧数据
        
        // 清理姿态数据
        if (this.data.poses.length > 0) {
            const removeCount = Math.floor(this.data.poses.length * cleanupRatio);
            this.data.poses.splice(0, removeCount);
            this.stats.recordsByType.poses -= removeCount;
        }
        
        // 清理轨迹数据
        for (const [key, trajectory] of Object.entries(this.data.trajectories)) {
            if (trajectory.length > 0) {
                const removeCount = Math.floor(trajectory.length * cleanupRatio);
                trajectory.splice(0, removeCount);
                this.stats.recordsByType.trajectories -= removeCount;
            }
        }
        
        // 清理分析数据
        if (this.data.analysis.length > 0) {
            const removeCount = Math.floor(this.data.analysis.length * cleanupRatio);
            this.data.analysis.splice(0, removeCount);
            this.stats.recordsByType.analysis -= removeCount;
        }
        
        // 更新统计信息
        this.stats.totalRecords = this.calculateTotalRecords();
        this.stats.memoryUsage = this.estimateMemoryUsage();
        
        this.logger.info('清理旧数据完成', {
            totalRecords: this.stats.totalRecords,
            memoryUsage: this.stats.memoryUsage
        });
    }
    
    /**
     * 计算总记录数
     * @returns {number} 总记录数
     */
    calculateTotalRecords() {
        let total = 0;
        total += this.data.poses.length;
        total += this.data.analysis.length;
        total += this.data.performance.length;
        total += this.data.events.length;
        
        for (const trajectory of Object.values(this.data.trajectories)) {
            total += trajectory.length;
        }
        
        return total;
    }
    
    /**
     * 启动自动保存
     */
    startAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }
        
        this.saveTimer = setInterval(() => {
            this.saveData();
        }, this.options.saveInterval);
    }
    
    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }
    
    /**
     * 启动清理定时器
     */
    startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        // 每分钟检查一次
        this.cleanupTimer = setInterval(() => {
            this.checkMemoryLimits();
        }, 60000);
    }
    
    /**
     * 停止清理定时器
     */
    stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    
    /**
     * 保存数据
     */
    async saveData() {
        try {
            // 处理待处理的批次
            if (this.batchQueue.length > 0) {
                await this.processBatch();
            }
            
            // 准备保存数据
            const saveData = {
                ...this.data,
                metadata: {
                    ...this.data.metadata,
                    lastSaveTime: Date.now(),
                    stats: this.stats
                }
            };
            
            // 压缩数据（如果启用）
            let dataToSave = saveData;
            if (this.options.enableCompression) {
                dataToSave = await this.compressData(saveData);
            }
            
            // 保存到存储
            await this.storageManager.set(
                this.options.storageKey,
                dataToSave,
                this.options.storageType
            );
            
            this.stats.lastSaveTime = Date.now();
            
            if (this.options.debug) {
                this.logger.info('数据保存完成', {
                    totalRecords: this.stats.totalRecords,
                    memoryUsage: this.stats.memoryUsage
                });
            }
            
            // 触发保存完成事件
            this.eventBus.emit('dataSaved', {
                timestamp: this.stats.lastSaveTime,
                recordCount: this.stats.totalRecords
            });
            
        } catch (error) {
            this.logger.error('数据保存失败:', error);
        }
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        try {
            const savedData = await this.storageManager.get(
                this.options.storageKey,
                this.options.storageType
            );
            
            if (savedData) {
                // 解压数据（如果需要）
                let loadedData = savedData;
                if (this.options.enableCompression && savedData.compressed) {
                    loadedData = await this.decompressData(savedData);
                }
                
                // 合并数据
                this.data = {
                    poses: loadedData.poses || [],
                    trajectories: loadedData.trajectories || {},
                    analysis: loadedData.analysis || [],
                    performance: loadedData.performance || [],
                    events: loadedData.events || [],
                    metadata: {
                        ...this.data.metadata,
                        ...loadedData.metadata
                    }
                };
                
                // 恢复统计信息
                if (loadedData.metadata && loadedData.metadata.stats) {
                    this.stats = { ...this.stats, ...loadedData.metadata.stats };
                }
                
                // 重新计算统计信息
                this.stats.totalRecords = this.calculateTotalRecords();
                this.stats.memoryUsage = this.estimateMemoryUsage();
                
                if (this.options.debug) {
                    this.logger.info('数据加载完成', {
                        totalRecords: this.stats.totalRecords,
                        memoryUsage: this.stats.memoryUsage
                    });
                }
            }
            
        } catch (error) {
            this.logger.error('数据加载失败:', error);
        }
    }
    
    /**
     * 压缩数据
     * @param {Object} data - 数据
     * @returns {Object} 压缩后的数据
     */
    async compressData(data) {
        try {
            // 简单的压缩实现（实际项目中可以使用更好的压缩算法）
            const jsonString = JSON.stringify(data);
            const compressed = this.simpleCompress(jsonString);
            
            this.stats.compressionRatio = compressed.length / jsonString.length;
            
            return {
                compressed: true,
                data: compressed,
                originalSize: jsonString.length,
                compressedSize: compressed.length
            };
        } catch (error) {
            this.logger.error('数据压缩失败:', error);
            return data;
        }
    }
    
    /**
     * 解压数据
     * @param {Object} compressedData - 压缩数据
     * @returns {Object} 解压后的数据
     */
    async decompressData(compressedData) {
        try {
            const decompressed = this.simpleDecompress(compressedData.data);
            return JSON.parse(decompressed);
        } catch (error) {
            this.logger.error('数据解压失败:', error);
            return compressedData;
        }
    }
    
    /**
     * 简单压缩
     * @param {string} str - 字符串
     * @returns {string} 压缩后的字符串
     */
    simpleCompress(str) {
        // 简单的RLE压缩
        let compressed = '';
        let count = 1;
        
        for (let i = 0; i < str.length; i++) {
            if (i < str.length - 1 && str[i] === str[i + 1]) {
                count++;
            } else {
                if (count > 1) {
                    compressed += count + str[i];
                } else {
                    compressed += str[i];
                }
                count = 1;
            }
        }
        
        return compressed;
    }
    
    /**
     * 简单解压
     * @param {string} str - 压缩字符串
     * @returns {string} 解压后的字符串
     */
    simpleDecompress(str) {
        let decompressed = '';
        let i = 0;
        
        while (i < str.length) {
            if (/\d/.test(str[i])) {
                let count = '';
                while (i < str.length && /\d/.test(str[i])) {
                    count += str[i];
                    i++;
                }
                const char = str[i];
                decompressed += char.repeat(parseInt(count));
            } else {
                decompressed += str[i];
            }
            i++;
        }
        
        return decompressed;
    }
    
    /**
     * 生成会话ID
     * @returns {string} 会话ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 生成ID
     * @returns {string} ID
     */
    generateId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 获取数据
     * @param {string} type - 数据类型
     * @returns {*} 数据
     */
    getData(type = null) {
        if (type) {
            return this.data[type] || null;
        }
        return { ...this.data };
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        return { ...this.stats };
    }
    
    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用情况
     */
    getMemoryUsage() {
        return {
            current: this.stats.memoryUsage,
            max: this.options.maxMemorySize,
            percentage: (this.stats.memoryUsage / this.options.maxMemorySize) * 100,
            records: this.stats.totalRecords,
            maxRecords: this.options.maxRecords
        };
    }
    
    /**
     * 清空数据
     * @param {string} type - 数据类型（可选）
     */
    clearData(type = null) {
        if (type) {
            if (type === 'trajectories') {
                this.data.trajectories = {};
            } else if (this.data[type]) {
                this.data[type] = [];
            }
        } else {
            this.data = {
                poses: [],
                trajectories: {},
                analysis: [],
                performance: [],
                events: [],
                metadata: {
                    startTime: Date.now(),
                    version: '1.0.0',
                    sessionId: this.generateSessionId()
                }
            };
        }
        
        // 重置统计信息
        this.stats = {
            totalRecords: 0,
            recordsByType: {
                poses: 0,
                trajectories: 0,
                analysis: 0,
                performance: 0,
                events: 0
            },
            memoryUsage: 0,
            lastSaveTime: null,
            duplicatesSkipped: 0,
            compressionRatio: 1.0
        };
        
        this.logger.info('数据已清空', { type });
    }
    
    /**
     * 导出数据
     * @param {Object} options - 导出选项
     * @returns {Object} 导出的数据
     */
    exportData(options = {}) {
        const exportData = {
            ...this.data,
            metadata: {
                ...this.data.metadata,
                exportTime: Date.now(),
                stats: this.stats,
                options: this.options
            }
        };
        
        // 应用过滤器
        if (options.dateRange) {
            const { start, end } = options.dateRange;
            exportData.poses = exportData.poses.filter(pose => 
                pose.timestamp >= start && pose.timestamp <= end
            );
        }
        
        if (options.minConfidence) {
            exportData.poses = exportData.poses.filter(pose => 
                pose.confidence >= options.minConfidence
            );
        }
        
        return exportData;
    }
    
    /**
     * 导入数据
     * @param {Object} importData - 导入的数据
     * @param {Object} options - 导入选项
     */
    importData(importData, options = {}) {
        try {
            if (options.merge) {
                // 合并数据
                if (importData.poses) {
                    this.data.poses.push(...importData.poses);
                }
                
                if (importData.trajectories) {
                    for (const [key, trajectory] of Object.entries(importData.trajectories)) {
                        if (!this.data.trajectories[key]) {
                            this.data.trajectories[key] = [];
                        }
                        this.data.trajectories[key].push(...trajectory);
                    }
                }
                
                if (importData.analysis) {
                    this.data.analysis.push(...importData.analysis);
                }
                
                if (importData.performance) {
                    this.data.performance.push(...importData.performance);
                }
                
                if (importData.events) {
                    this.data.events.push(...importData.events);
                }
            } else {
                // 替换数据
                this.data = {
                    poses: importData.poses || [],
                    trajectories: importData.trajectories || {},
                    analysis: importData.analysis || [],
                    performance: importData.performance || [],
                    events: importData.events || [],
                    metadata: {
                        ...this.data.metadata,
                        ...importData.metadata
                    }
                };
            }
            
            // 重新计算统计信息
            this.stats.totalRecords = this.calculateTotalRecords();
            this.stats.memoryUsage = this.estimateMemoryUsage();
            
            this.logger.info('数据导入完成', {
                totalRecords: this.stats.totalRecords,
                merge: options.merge
            });
            
        } catch (error) {
            this.logger.error('数据导入失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新配置
     * @param {Object} newOptions - 新配置
     */
    updateOptions(newOptions) {
        const oldOptions = { ...this.options };
        this.options = { ...this.options, ...newOptions };
        
        // 重新设置自动保存
        if (oldOptions.autoSave !== this.options.autoSave || 
            oldOptions.saveInterval !== this.options.saveInterval) {
            if (this.options.autoSave) {
                this.startAutoSave();
            } else {
                this.stopAutoSave();
            }
        }
        
        this.logger.info('数据收集器配置已更新', newOptions);
    }
    
    /**
     * 重置收集器
     */
    reset() {
        this.clearData();
        this.batchQueue = [];
        this.pendingBatch = false;
        
        this.logger.info('数据收集器已重置');
    }
    
    /**
     * 销毁收集器
     */
    destroy() {
        // 保存数据
        this.saveData();
        
        // 停止定时器
        this.stopAutoSave();
        this.stopCleanupTimer();
        
        // 清理数据
        this.clearData();
        this.batchQueue = [];
        
        this.logger.info('数据收集器已销毁');
    }
}