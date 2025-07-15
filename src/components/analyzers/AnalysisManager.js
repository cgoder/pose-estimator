/**
 * 综合分析管理器
 * 协调所有分析模块，提供统一的API接口和高级功能
 */
import ExerciseAnalysisEngine from './ExerciseAnalysisEngine.js';
import AdvancedQualityAssessment from './AdvancedQualityAssessment.js';
import BiomechanicsAnalyzer from './BiomechanicsAnalyzer.js';
import KinematicsAnalyzer from './KinematicsAnalyzer.js';
import PerformanceMonitor from './PerformanceMonitor.js';

class AnalysisManager {
    constructor(config = {}) {
        this.name = 'AnalysisManager';
        
        // 核心分析引擎
        this.exerciseEngine = new ExerciseAnalysisEngine();
        
        // 独立分析模块（用于特殊场景）
        this.qualityAssessment = new AdvancedQualityAssessment();
        this.biomechanicsAnalyzer = new BiomechanicsAnalyzer();
        this.kinematicsAnalyzer = new KinematicsAnalyzer();
        this.performanceMonitor = new PerformanceMonitor();
        
        // 管理器配置
        this.config = {
            // 分析模式
            mode: 'comprehensive', // 'basic', 'advanced', 'comprehensive'
            
            // 实时分析配置
            realTimeAnalysis: true,
            batchAnalysis: false,
            
            // 数据处理配置
            enableDataSmoothing: true,
            enableOutlierDetection: true,
            enableTrendAnalysis: true,
            
            // 输出配置
            outputFormat: 'detailed', // 'minimal', 'standard', 'detailed'
            includeRawData: false,
            includeVisualizationData: true,
            
            // 性能配置
            maxProcessingTime: 50, // 毫秒
            enablePerformanceOptimization: true,
            adaptiveQuality: true,
            
            // 缓存配置
            enableCaching: true,
            cacheSize: 100,
            cacheTTL: 30000, // 30秒
            
            // 警告和通知
            enableWarnings: true,
            warningThresholds: {
                lowConfidence: 0.5,
                highLatency: 100,
                lowQuality: 60
            },
            
            ...config
        };
        
        // 状态管理
        this.state = {
            isActive: false,
            currentMode: this.config.mode,
            lastAnalysisTime: 0,
            totalAnalyses: 0,
            errors: [],
            warnings: []
        };
        
        // 数据缓存
        this.cache = new Map();
        this.cacheCleanupTimer = null;
        
        // 批处理队列
        this.batchQueue = [];
        this.batchProcessor = null;
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 数据平滑器
        this.dataSmoother = {
            enabled: this.config.enableDataSmoothing,
            windowSize: 5,
            history: []
        };
        
        // 异常检测器
        this.outlierDetector = {
            enabled: this.config.enableOutlierDetection,
            threshold: 2.0, // 标准差倍数
            history: []
        };
        
        // 趋势分析器
        this.trendAnalyzer = {
            enabled: this.config.enableTrendAnalysis,
            windowSize: 20,
            trends: new Map()
        };
        
        this._initialize();
    }

    /**
     * 初始化管理器
     */
    _initialize() {
        // 配置子模块
        this._configureSubModules();
        
        // 启动缓存清理
        if (this.config.enableCaching) {
            this._startCacheCleanup();
        }
        
        // 启动批处理器
        if (this.config.batchAnalysis) {
            this._startBatchProcessor();
        }
        
        console.log('分析管理器已初始化');
    }

    /**
     * 配置子模块
     */
    _configureSubModules() {
        // 配置运动分析引擎
        this.exerciseEngine.setConfig({
            enableAdvancedAnalysis: this.config.mode !== 'basic',
            enablePerformanceMonitoring: true
        });
        
        // 配置性能监控
        this.performanceMonitor.setConfig({
            enableDetailedProfiling: this.config.mode === 'comprehensive',
            warningThresholds: this.config.warningThresholds
        });
    }

    /**
     * 启动分析管理器
     */
    start() {
        if (this.state.isActive) {
            console.warn('分析管理器已经在运行');
            return;
        }
        
        this.state.isActive = true;
        this.state.lastAnalysisTime = Date.now();
        
        // 启动性能监控
        this.performanceMonitor.startMonitoring();
        
        this._emitEvent('started', { timestamp: Date.now() });
        console.log('分析管理器已启动');
    }

    /**
     * 停止分析管理器
     */
    stop() {
        if (!this.state.isActive) {
            console.warn('分析管理器未在运行');
            return;
        }
        
        this.state.isActive = false;
        
        // 停止性能监控
        this.performanceMonitor.stopMonitoring();
        
        // 清理定时器
        this._cleanup();
        
        this._emitEvent('stopped', { timestamp: Date.now() });
        console.log('分析管理器已停止');
    }

    /**
     * 执行分析
     * @param {Array} keypoints - 关键点数组
     * @param {Object} options - 分析选项
     */
    async analyze(keypoints, options = {}) {
        if (!this.state.isActive) {
            throw new Error('分析管理器未启动');
        }
        
        const startTime = performance.now();
        const timestamp = options.timestamp || Date.now();
        
        try {
            // 性能监控
            const sessionId = this.performanceMonitor.startProfiling('analysis');
            
            // 数据预处理
            const processedKeypoints = await this._preprocessData(keypoints, options);
            this.performanceMonitor.addMarker('preprocessing_complete');
            
            // 执行分析
            let result;
            if (this.config.batchAnalysis && !options.forceRealTime) {
                result = await this._enqueueBatchAnalysis(processedKeypoints, options);
            } else {
                result = await this._performRealTimeAnalysis(processedKeypoints, options);
            }
            
            this.performanceMonitor.addMarker('analysis_complete');
            
            // 后处理
            const finalResult = await this._postprocessResult(result, options);
            this.performanceMonitor.addMarker('postprocessing_complete');
            
            // 结束性能分析
            const session = this.performanceMonitor.endProfiling(sessionId);
            
            // 更新状态
            this.state.lastAnalysisTime = timestamp;
            this.state.totalAnalyses++;
            
            // 检查性能
            const processingTime = performance.now() - startTime;
            if (processingTime > this.config.maxProcessingTime) {
                this._addWarning('performance', `分析耗时过长: ${processingTime.toFixed(1)}ms`);
            }
            
            // 缓存结果
            if (this.config.enableCaching) {
                this._cacheResult(keypoints, finalResult, options);
            }
            
            // 发送事件
            this._emitEvent('analysis_complete', {
                result: finalResult,
                processingTime,
                session
            });
            
            return finalResult;
            
        } catch (error) {
            this._addError('analysis', error.message, { keypoints, options });
            this._emitEvent('analysis_error', { error, keypoints, options });
            throw error;
        }
    }

    /**
     * 数据预处理
     */
    async _preprocessData(keypoints, options) {
        let processedKeypoints = [...keypoints];
        
        // 数据验证
        if (!this._validateKeypoints(processedKeypoints)) {
            throw new Error('无效的关键点数据');
        }
        
        // 数据平滑
        if (this.dataSmoother.enabled && !options.skipSmoothing) {
            processedKeypoints = this._smoothData(processedKeypoints);
        }
        
        // 异常检测
        if (this.outlierDetector.enabled && !options.skipOutlierDetection) {
            processedKeypoints = this._detectOutliers(processedKeypoints);
        }
        
        return processedKeypoints;
    }

    /**
     * 实时分析
     */
    async _performRealTimeAnalysis(keypoints, options) {
        const timestamp = options.timestamp || Date.now();
        
        // 检查缓存
        if (this.config.enableCaching) {
            const cached = this._getCachedResult(keypoints, options);
            if (cached) {
                return cached;
            }
        }
        
        // 执行核心分析
        const coreResult = this.exerciseEngine.analyze(keypoints, { timestamp });
        
        if (!coreResult) {
            return null;
        }
        
        // 根据模式执行额外分析
        if (this.config.mode === 'comprehensive') {
            await this._performComprehensiveAnalysis(coreResult, keypoints, options);
        } else if (this.config.mode === 'advanced') {
            await this._performAdvancedAnalysis(coreResult, keypoints, options);
        }
        
        return coreResult;
    }

    /**
     * 批处理分析
     */
    async _enqueueBatchAnalysis(keypoints, options) {
        return new Promise((resolve, reject) => {
            this.batchQueue.push({
                keypoints,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
        });
    }

    /**
     * 综合分析
     */
    async _performComprehensiveAnalysis(result, keypoints, options) {
        const timestamp = options.timestamp || Date.now();
        
        // 独立质量评估
        if (!result.qualityAssessment) {
            result.qualityAssessment = this.qualityAssessment.assessQuality(
                keypoints,
                this.exerciseEngine.frameHistory,
                result.exerciseType || 'unknown',
                result.phase || 'unknown',
                { timestamp }
            );
        }
        
        // 独立生物力学分析
        if (!result.biomechanics) {
            result.biomechanics = this.biomechanicsAnalyzer.analyze(
                keypoints,
                timestamp,
                33.33,
                result.exerciseType || 'unknown'
            );
        }
        
        // 独立运动学分析
        if (!result.kinematics) {
            this.kinematicsAnalyzer.updateKinematics(keypoints, timestamp, 33.33);
            result.kinematics = {
                smoothness: this.kinematicsAnalyzer.calculateSmoothness(),
                motionPattern: this.kinematicsAnalyzer.detectMotionPattern(),
                stats: this.kinematicsAnalyzer.getStats()
            };
        }
        
        // 趋势分析
        if (this.trendAnalyzer.enabled) {
            result.trendAnalysis = this._analyzeTrends(result);
        }
        
        // 综合评分
        result.comprehensiveScore = this._calculateComprehensiveScore(result);
    }

    /**
     * 高级分析
     */
    async _performAdvancedAnalysis(result, keypoints, options) {
        // 执行部分综合分析功能
        if (!result.qualityAssessment) {
            result.qualityAssessment = this.qualityAssessment.assessQuality(
                keypoints,
                this.exerciseEngine.frameHistory,
                result.exerciseType || 'unknown',
                result.phase || 'unknown',
                { timestamp: options.timestamp || Date.now() }
            );
        }
    }

    /**
     * 结果后处理
     */
    async _postprocessResult(result, options) {
        if (!result) return result;
        
        // 格式化输出
        const formattedResult = this._formatOutput(result, options);
        
        // 添加元数据
        formattedResult.metadata = {
            analysisMode: this.config.mode,
            processingTime: performance.now() - (options.startTime || 0),
            timestamp: Date.now(),
            version: '1.0.0'
        };
        
        // 质量检查
        this._performQualityCheck(formattedResult);
        
        return formattedResult;
    }

    /**
     * 格式化输出
     */
    _formatOutput(result, options) {
        const format = options.outputFormat || this.config.outputFormat;
        
        switch (format) {
            case 'minimal':
                return {
                    exerciseType: result.exerciseType,
                    repetitions: result.repetitions,
                    quality: result.quality || result.overallScore,
                    timestamp: result.timestamp
                };
                
            case 'standard':
                return {
                    exerciseType: result.exerciseType,
                    repetitions: result.repetitions,
                    quality: result.quality || result.overallScore,
                    phase: result.phase,
                    confidence: result.confidence,
                    recommendations: result.recommendations,
                    timestamp: result.timestamp
                };
                
            case 'detailed':
            default:
                return result;
        }
    }

    /**
     * 质量检查
     */
    _performQualityCheck(result) {
        // 检查置信度
        if (result.confidence < this.config.warningThresholds.lowConfidence) {
            this._addWarning('low_confidence', `分析置信度过低: ${result.confidence}`);
        }
        
        // 检查质量分数
        const qualityScore = result.quality || result.overallScore;
        if (qualityScore < this.config.warningThresholds.lowQuality) {
            this._addWarning('low_quality', `运动质量分数过低: ${qualityScore}`);
        }
    }

    /**
     * 数据验证
     */
    _validateKeypoints(keypoints) {
        if (!Array.isArray(keypoints)) return false;
        if (keypoints.length === 0) return false;
        
        // 检查关键点格式
        return keypoints.every(point => 
            point && 
            typeof point.x === 'number' && 
            typeof point.y === 'number' &&
            typeof point.confidence === 'number'
        );
    }

    /**
     * 数据平滑
     */
    _smoothData(keypoints) {
        this.dataSmoother.history.push(keypoints);
        
        if (this.dataSmoother.history.length > this.dataSmoother.windowSize) {
            this.dataSmoother.history.shift();
        }
        
        if (this.dataSmoother.history.length < 3) {
            return keypoints; // 数据不足，返回原始数据
        }
        
        // 简单移动平均平滑
        const smoothedKeypoints = keypoints.map((point, index) => {
            const historicalPoints = this.dataSmoother.history.map(frame => frame[index]).filter(p => p);
            
            if (historicalPoints.length < 2) return point;
            
            const avgX = historicalPoints.reduce((sum, p) => sum + p.x, 0) / historicalPoints.length;
            const avgY = historicalPoints.reduce((sum, p) => sum + p.y, 0) / historicalPoints.length;
            const avgConf = historicalPoints.reduce((sum, p) => sum + p.confidence, 0) / historicalPoints.length;
            
            return {
                ...point,
                x: avgX,
                y: avgY,
                confidence: avgConf
            };
        });
        
        return smoothedKeypoints;
    }

    /**
     * 异常检测
     */
    _detectOutliers(keypoints) {
        // 简化的异常检测实现
        return keypoints.filter(point => point.confidence > 0.3);
    }

    /**
     * 趋势分析
     */
    _analyzeTrends(result) {
        const exerciseType = result.exerciseType;
        if (!exerciseType) return null;
        
        if (!this.trendAnalyzer.trends.has(exerciseType)) {
            this.trendAnalyzer.trends.set(exerciseType, []);
        }
        
        const history = this.trendAnalyzer.trends.get(exerciseType);
        history.push({
            timestamp: result.timestamp,
            quality: result.quality || result.overallScore,
            repetitions: result.repetitions
        });
        
        if (history.length > this.trendAnalyzer.windowSize) {
            history.shift();
        }
        
        if (history.length < 5) {
            return { trend: 'insufficient_data' };
        }
        
        // 计算趋势
        const recent = history.slice(-3);
        const older = history.slice(-6, -3);
        
        const recentAvg = recent.reduce((sum, item) => sum + item.quality, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + item.quality, 0) / older.length : recentAvg;
        
        const change = recentAvg - olderAvg;
        
        return {
            trend: Math.abs(change) < 2 ? 'stable' : (change > 0 ? 'improving' : 'declining'),
            change,
            recentAverage: recentAvg,
            historicalAverage: olderAvg
        };
    }

    /**
     * 计算综合评分
     */
    _calculateComprehensiveScore(result) {
        const scores = [];
        const weights = [];
        
        // 基础质量分数
        if (result.quality !== undefined) {
            scores.push(result.quality);
            weights.push(0.3);
        }
        
        // 质量评估分数
        if (result.qualityAssessment && result.qualityAssessment.overallScore !== undefined) {
            scores.push(result.qualityAssessment.overallScore);
            weights.push(0.4);
        }
        
        // 生物力学分数
        if (result.biomechanics && result.biomechanics.overallScore !== undefined) {
            scores.push(result.biomechanics.overallScore);
            weights.push(0.2);
        }
        
        // 运动学分数
        if (result.kinematics && result.kinematics.overallScore !== undefined) {
            scores.push(result.kinematics.overallScore);
            weights.push(0.1);
        }
        
        if (scores.length === 0) return 0;
        
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        const weightedSum = scores.reduce((sum, score, index) => sum + score * weights[index], 0);
        
        return weightedSum / weightSum;
    }

    /**
     * 缓存管理
     */
    _cacheResult(keypoints, result, options) {
        const key = this._generateCacheKey(keypoints, options);
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            ttl: this.config.cacheTTL
        });
        
        // 限制缓存大小
        if (this.cache.size > this.config.cacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    _getCachedResult(keypoints, options) {
        const key = this._generateCacheKey(keypoints, options);
        const cached = this.cache.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            return cached.result;
        }
        
        if (cached) {
            this.cache.delete(key);
        }
        
        return null;
    }

    _generateCacheKey(keypoints, options) {
        // 简化的缓存键生成
        const keypointHash = keypoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('|');
        const optionHash = JSON.stringify(options);
        return `${keypointHash}_${optionHash}`;
    }

    _startCacheCleanup() {
        this.cacheCleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of this.cache) {
                if ((now - cached.timestamp) >= cached.ttl) {
                    this.cache.delete(key);
                }
            }
        }, 10000); // 每10秒清理一次
    }

    /**
     * 批处理器
     */
    _startBatchProcessor() {
        this.batchProcessor = setInterval(() => {
            this._processBatch();
        }, 100); // 每100ms处理一次批次
    }

    async _processBatch() {
        if (this.batchQueue.length === 0) return;
        
        const batch = this.batchQueue.splice(0, 10); // 每次处理10个
        
        for (const item of batch) {
            try {
                const result = await this._performRealTimeAnalysis(item.keypoints, item.options);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
        }
    }

    /**
     * 事件管理
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件监听器错误 [${event}]:`, error);
                }
            });
        }
    }

    /**
     * 错误和警告管理
     */
    _addError(type, message, context = {}) {
        const error = {
            type,
            message,
            context,
            timestamp: Date.now()
        };
        
        this.state.errors.push(error);
        
        // 限制错误历史长度
        if (this.state.errors.length > 100) {
            this.state.errors.shift();
        }
        
        console.error(`分析错误 [${type}]: ${message}`, context);
    }

    _addWarning(type, message, context = {}) {
        if (!this.config.enableWarnings) return;
        
        const warning = {
            type,
            message,
            context,
            timestamp: Date.now()
        };
        
        this.state.warnings.push(warning);
        
        // 限制警告历史长度
        if (this.state.warnings.length > 50) {
            this.state.warnings.shift();
        }
        
        console.warn(`分析警告 [${type}]: ${message}`, context);
    }

    /**
     * 清理资源
     */
    _cleanup() {
        if (this.cacheCleanupTimer) {
            clearInterval(this.cacheCleanupTimer);
            this.cacheCleanupTimer = null;
        }
        
        if (this.batchProcessor) {
            clearInterval(this.batchProcessor);
            this.batchProcessor = null;
        }
    }

    /**
     * 获取状态信息
     */
    getStatus() {
        return {
            ...this.state,
            config: this.config,
            performance: this.performanceMonitor.getPerformanceReport(),
            cacheSize: this.cache.size,
            batchQueueSize: this.batchQueue.length,
            eventListeners: Object.fromEntries(
                Array.from(this.eventListeners.entries()).map(([event, listeners]) => [event, listeners.length])
            )
        };
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            manager: {
                totalAnalyses: this.state.totalAnalyses,
                errors: this.state.errors.length,
                warnings: this.state.warnings.length,
                cacheHitRate: this._calculateCacheHitRate()
            },
            exerciseEngine: this.exerciseEngine.getStats(),
            performance: this.performanceMonitor.getStats(),
            qualityAssessment: this.qualityAssessment.getStats(),
            biomechanics: this.biomechanicsAnalyzer.getStats(),
            kinematics: this.kinematicsAnalyzer.getStats()
        };
    }

    _calculateCacheHitRate() {
        // 简化的缓存命中率计算
        return this.cache.size > 0 ? 0.8 : 0; // 模拟值
    }

    /**
     * 重置管理器
     */
    reset() {
        // 重置所有子模块
        this.exerciseEngine.reset();
        this.qualityAssessment.reset();
        this.biomechanicsAnalyzer.reset();
        this.kinematicsAnalyzer.reset();
        this.performanceMonitor.reset();
        
        // 重置状态
        this.state.totalAnalyses = 0;
        this.state.errors = [];
        this.state.warnings = [];
        
        // 清理缓存和队列
        this.cache.clear();
        this.batchQueue = [];
        
        // 重置数据处理器
        this.dataSmoother.history = [];
        this.outlierDetector.history = [];
        this.trendAnalyzer.trends.clear();
        
        console.log('分析管理器已重置');
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.stop();
        this._cleanup();
        
        // 销毁子模块
        if (this.performanceMonitor.destroy) {
            this.performanceMonitor.destroy();
        }
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        console.log('分析管理器已销毁');
    }
}

export default AnalysisManager;