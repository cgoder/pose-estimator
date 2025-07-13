import { eventBus } from './EventBus.js';
import { stateManager } from './StateManager.js';
import { CodeQualityChecker } from '../utils/CodeQualityChecker.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { dataSourceFactory } from './dataSources/DataSourceFactory.js';
// 只在回退模式下动态导入 TensorFlowInferenceEngine
// import { TensorFlowInferenceEngine } from '../inference/InferenceEngine.js';
import { FitnessAnalysisEngine } from '../analysis/AnalysisEngine.js';
import { CanvasRenderEngine } from '../rendering/RenderEngine.js';
import { WorkerManagerFactory } from '../workers/WorkerManager.js';
/**
 * 重构后的主应用类
 * 采用事件驱动和状态管理的架构，集成新的模块化引擎
 */
export class PoseEstimationApp {
    /**
     * 智能错误恢复
     */
    async handleErrorWithRecovery(error, context) {
        const errorKey = `${context}:${error.message}`;
        const attempts = this.errorRecoveryAttempts.get(errorKey) || 0;
        if (attempts >= this.maxRecoveryAttempts) {
            console.error(`❌ ${context} 错误恢复失败，已达到最大重试次数:`, error);
            this.emitAppEvent('error', {
                message: `${context} 错误恢复失败`,
                error,
                recoverable: false
            });
            return false;
        }
        this.errorRecoveryAttempts.set(errorKey, attempts + 1);
        console.warn(`🔄 尝试恢复 ${context} 错误 (第${attempts + 1}次):`, error.message);
        try {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, this.recoveryDelay * (attempts + 1)));
            // 根据错误类型执行不同的恢复策略
            switch (context) {
                case 'inference':
                    return await this.recoverInferenceEngine();
                case 'worker':
                    return await this.recoverWorkerManager();
                case 'dataSource':
                    return await this.recoverDataSource();
                case 'render':
                    return await this.recoverRenderEngine();
                default:
                    return false;
            }
        }
        catch (recoveryError) {
            console.error(`❌ ${context} 恢复过程中发生错误:`, recoveryError);
            return false;
        }
    }
    /**
     * 恢复推理引擎
     */
    async recoverInferenceEngine() {
        try {
            console.log('🔄 尝试重新初始化推理引擎...');
            // 清理现有推理引擎
            if (this.inferenceEngine) {
                await this.inferenceEngine.dispose();
                this.inferenceEngine = null;
            }
            // 重新初始化
            await this.initializeInferenceEngine();
            console.log('✅ 推理引擎恢复成功');
            return true;
        }
        catch (error) {
            console.error('❌ 推理引擎恢复失败:', error);
            return false;
        }
    }
    /**
     * 恢复 Worker 管理器
     */
    async recoverWorkerManager() {
        try {
            console.log('🔄 尝试重新初始化 Worker 管理器...');
            // 清理现有 Worker
            if (this.workerManager) {
                await this.workerManager.dispose();
                this.workerManager = null;
            }
            // 重新初始化
            await this.initializeWorkerManager();
            console.log('✅ Worker 管理器恢复成功');
            return true;
        }
        catch (error) {
            console.error('❌ Worker 管理器恢复失败:', error);
            return false;
        }
    }
    /**
     * 恢复数据源
     */
    async recoverDataSource() {
        try {
            console.log('🔄 尝试重新启动数据源...');
            if (this.dataSource) {
                // 停止当前数据源
                await this.dataSource.stop();
                // 重新启动
                await this.dataSource.start();
                console.log('✅ 数据源恢复成功');
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ 数据源恢复失败:', error);
            return false;
        }
    }
    /**
     * 恢复渲染引擎
     */
    async recoverRenderEngine() {
        try {
            console.log('🔄 尝试重新初始化渲染引擎...');
            // 清理现有渲染引擎
            if (this.renderEngine) {
                this.renderEngine.dispose();
                this.renderEngine = null;
            }
            // 重新初始化
            await this.initializeRenderEngine();
            console.log('✅ 渲染引擎恢复成功');
            return true;
        }
        catch (error) {
            console.error('❌ 渲染引擎恢复失败:', error);
            return false;
        }
    }
    constructor(config) {
        this.dataSource = null;
        this.inferenceEngine = null;
        this.analysisEngine = null;
        this.renderEngine = null;
        this.workerManager = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.config = null;
        // 性能优化：帧率控制
        this.lastInferenceTime = 0;
        this.targetInferenceInterval = 100; // 10fps 推理频率 (100ms间隔)
        this.frameSkipCount = 0;
        this.maxFrameSkip = 2; // 最多跳过2帧
        this.errorRecoveryAttempts = new Map();
        this.maxRecoveryAttempts = 3;
        this.recoveryDelay = 1000; // 1秒
        this.setupEventListeners();
        // 设置默认配置
        this.config = this.mergeWithDefaultConfig(config);
        // 初始化质量监控
        this.qualityChecker = new CodeQualityChecker({
            enableMemoryLeakDetection: true,
            enablePerformanceMonitoring: true,
            enableErrorPatternAnalysis: true,
            enableSecurityChecks: true,
            checkInterval: 30000, // 30秒检查一次
            memoryThreshold: 100 * 1024 * 1024, // 100MB
            performanceThreshold: 1000 // 1秒
        });
        this.performanceMonitor = new PerformanceMonitor();
        // 监听质量检查事件
        eventBus.on('code-quality-warning', (data) => {
            console.warn('⚠️ 代码质量警告:', data);
            // 发射应用事件（暂时注释，需要在类型定义中添加）
            // this.emitAppEvent('quality-warning', data);
        });
        // 启动质量检查（默认启用）
        this.qualityChecker.startChecking();
        this.performanceMonitor.reset();
        console.log('🚀 PoseEstimationApp (重构版) 已创建');
    }
    /**
     * 合并默认配置
     */
    mergeWithDefaultConfig(config) {
        const defaultConfig = {
            dataSource: {
                type: 'camera',
                config: {
                    width: 640,
                    height: 480,
                    fps: 30
                }
            },
            inference: {
                type: 'MoveNet',
                modelType: 'MoveNet',
                backend: 'webgl',
                enableWorker: true,
                scoreThreshold: 0.3,
                maxPoses: 1
            },
            analysis: {
                exercises: [],
                enableKinematics: true,
                enableRepetitionCounting: true,
                enablePostureEvaluation: true,
                enableRunningGait: false
            },
            render: {
                canvas: document.createElement('canvas'),
                renderer: 'canvas',
                showKeypoints: true,
                showSkeleton: true,
                showBoundingBox: false,
                showConfidence: false,
                showAnalysis: true,
                showPerformance: false
            },
            performance: {
                enableMonitoring: true,
                targetFPS: 30
            },
            ui: {
                showControls: true,
                showStats: false,
                showPerformance: false
            }
        };
        return {
            ...defaultConfig,
            ...config,
            dataSource: { ...defaultConfig.dataSource, ...config?.dataSource },
            inference: { ...defaultConfig.inference, ...config?.inference },
            analysis: { ...defaultConfig.analysis, ...config?.analysis },
            render: { ...defaultConfig.render, ...config?.render },
            performance: { ...defaultConfig.performance, ...config?.performance },
            ui: { ...defaultConfig.ui, ...config?.ui }
        };
    }
    /**
     * 初始化应用
     */
    async init(canvas) {
        try {
            if (this.isInitialized) {
                console.warn('⚠️ 应用已初始化');
                return;
            }
            console.log('🔧 开始初始化应用...');
            // 如果提供了canvas，更新配置
            if (canvas && this.config) {
                this.config.render.canvas = canvas;
            }
            // 更新状态
            stateManager.setState({
                ui: {
                    showControls: true,
                    showStats: false,
                    showPerformance: false,
                    isLoading: true,
                    error: null
                }
            });
            // 注意：根据架构设计，主线程不再加载 TensorFlow.js 依赖
            // TensorFlow.js 推理将完全在 Worker 中进行，避免阻塞 UI 线程
            console.log('📦 主线程初始化完成，TensorFlow.js 将在用户启动推理时按需加载');
            // 环境检查
            await this.performEnvironmentChecks();
            // 注意：不再在初始化时创建 Worker，而是在用户启动推理时按需创建
            // 这样可以避免不必要的资源消耗和重复加载问题
            console.log('⏳ Worker 将在用户启动推理时按需创建');
            // 更新状态 - 加载完成
            stateManager.setState({
                ui: {
                    showControls: true,
                    showStats: false,
                    showPerformance: false,
                    isLoading: false,
                    error: null
                }
            });
            console.log('✅ 应用初始化完成，等待用户选择数据源和启动推理');
            this.isInitialized = true;
            this.emitAppEvent('initialized');
        }
        catch (error) {
            console.error('❌ 应用初始化失败:', error);
            // 更新状态 - 显示错误
            stateManager.setState({
                ui: {
                    showControls: true,
                    showStats: false,
                    showPerformance: false,
                    isLoading: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            this.emitAppEvent('error', undefined, error);
            throw error;
        }
    }
    /**
     * 设置数据源
     * @param type 数据源类型
     * @param options 选项
     */
    async setDataSource(type, options) {
        try {
            // 停止当前数据源
            if (this.dataSource) {
                this.dataSource.stop();
            }
            // 创建新数据源
            switch (type) {
                case 'camera':
                    this.dataSource = dataSourceFactory.createCameraSource(options?.config);
                    break;
                case 'videoFile':
                    if (!options?.file)
                        throw new Error('视频文件数据源需要提供文件');
                    this.dataSource = dataSourceFactory.createVideoFileSource(options.file, options?.config);
                    break;
                case 'imageFile':
                    if (!options?.files)
                        throw new Error('图像文件数据源需要提供文件数组');
                    this.dataSource = dataSourceFactory.createImageFileSource(options.files, options?.config);
                    break;
                default:
                    throw new Error(`不支持的数据源类型: ${type}`);
            }
            // 绑定数据源事件
            this.bindDataSourceEvents();
            // 立即初始化渲染引擎以显示画面
            if (!this.renderEngine) {
                await this.initializeRenderEngine();
            }
            // 启动数据源以开始获取画面
            await this.dataSource.start();
            // 更新状态
            stateManager.setState({
                dataSource: {
                    type,
                    status: this.dataSource.status,
                    config: this.dataSource.getConfig()
                }
            });
            console.log(`📡 数据源已设置: ${type}`);
            this.emitAppEvent('data-source-ready', { type });
        }
        catch (error) {
            console.error('❌ 设置数据源失败:', error);
            this.emitAppEvent('error', undefined, error);
            throw error;
        }
    }
    /**
     * 启动应用
     */
    async start() {
        try {
            if (!this.isInitialized) {
                throw new Error('应用尚未初始化');
            }
            if (!this.dataSource) {
                throw new Error('请先设置数据源');
            }
            if (this.isRunning) {
                console.warn('⚠️ 应用已在运行');
                return;
            }
            console.log('🚀 启动应用...');
            // 启动数据源
            await this.dataSource.start();
            // 初始化推理引擎
            if (!this.inferenceEngine) {
                await this.initializeInferenceEngine();
            }
            // 初始化分析引擎
            if (!this.analysisEngine) {
                await this.initializeAnalysisEngine();
            }
            // 初始化渲染引擎
            if (!this.renderEngine) {
                await this.initializeRenderEngine();
            }
            this.isRunning = true;
            // 更新状态
            const currentState = stateManager.getState();
            stateManager.setState({
                analysis: {
                    ...currentState.analysis,
                    isRunning: true
                }
            });
            console.log('✅ 应用启动成功');
            eventBus.emit('app:started');
        }
        catch (error) {
            console.error('❌ 应用启动失败:', error);
            this.emitAppEvent('error', undefined, error);
            throw error;
        }
    }
    /**
     * 停止应用
     */
    stop() {
        try {
            if (!this.isRunning) {
                console.warn('⚠️ 应用未在运行');
                return;
            }
            console.log('🛑 停止应用...');
            // 停止数据源
            if (this.dataSource) {
                this.dataSource.stop();
            }
            this.isRunning = false;
            // 更新状态
            const currentState = stateManager.getState();
            stateManager.setState({
                analysis: {
                    ...currentState.analysis,
                    isRunning: false
                }
            });
            console.log('✅ 应用已停止');
            eventBus.emit('app:stopped');
        }
        catch (error) {
            console.error('❌ 停止应用时出错:', error);
            eventBus.emit('app:error', error);
        }
    }
    /**
     * 重启应用
     */
    async restart() {
        console.log('🔄 重启应用...');
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 100)); // 短暂延迟
        await this.start();
    }
    /**
     * 切换AI模型
     * @param modelType 模型类型
     */
    async switchModel(modelType) {
        try {
            console.log(`🤖 切换模型到: ${modelType}`);
            if (!this.config) {
                throw new Error('应用配置未初始化');
            }
            // 更新配置
            this.config.inference.modelType = modelType;
            // 如果推理引擎已初始化，重新加载模型
            if (this.inferenceEngine) {
                await this.inferenceEngine.initialize(this.config.inference);
            }
            // 更新状态
            stateManager.setState({
                model: {
                    type: modelType,
                    isLoaded: this.inferenceEngine?.isInitialized || false,
                    loadingProgress: 100,
                    config: {
                        ...this.config.inference
                    }
                }
            });
            this.emitAppEvent('model-loaded', { modelType });
        }
        catch (error) {
            console.error('❌ 切换模型失败:', error);
            this.emitAppEvent('error', undefined, error);
            throw error;
        }
    }
    /**
     * 设置运动类型
     */
    setExercise(exerciseType, parameters) {
        if (!this.analysisEngine) {
            console.warn('⚠️ 分析引擎未初始化');
            return;
        }
        this.analysisEngine.setExercise({
            type: exerciseType,
            parameters: parameters || {}
        });
        // 更新状态
        const currentState = stateManager.getState();
        stateManager.setState({
            analysis: {
                ...currentState.analysis,
                currentExercise: exerciseType
            }
        });
        console.log(`🏃 设置运动类型: ${exerciseType}`);
    }
    /**
     * 更新渲染配置
     */
    updateRenderConfig(config) {
        if (!this.renderEngine || !this.config) {
            console.warn('⚠️ 渲染引擎未初始化');
            return;
        }
        // 更新配置
        this.config.render = { ...this.config.render, ...config };
        this.renderEngine.updateConfig(config);
        console.log('🎨 渲染配置已更新');
    }
    /**
     * 获取应用状态
     */
    getAppStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            dataSourceType: this.dataSource?.type || null,
            state: stateManager.getState()
        };
    }
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听状态变更
        stateManager.subscribe((_state, _prevState) => {
            console.log('📊 应用状态已更新');
        });
        // 监听全局错误
        eventBus.on('app:error', (error) => {
            console.error('🚨 应用错误:', error);
        });
    }
    /**
     * 绑定数据源事件
     */
    bindDataSourceEvents() {
        if (!this.dataSource)
            return;
        this.dataSource.on('frame', (imageData) => {
            this.processFrame(imageData);
        });
        this.dataSource.on('error', (error) => {
            console.error('📡 数据源错误:', error);
            eventBus.emit('app:error', error);
        });
        this.dataSource.on('end', () => {
            console.log('📡 数据源结束');
            eventBus.emit('app:dataSourceEnded');
        });
    }
    /**
     * 处理图像帧
     */
    async processFrame(imageData) {
        const frameStartTime = performance.now();
        try {
            // 如果渲染引擎可用，总是显示原始画面
            if (this.renderEngine) {
                // 创建基础渲染数据以显示原始画面
                const basicRenderData = {
                    frame: {
                        imageData: imageData,
                        width: imageData.width,
                        height: imageData.height,
                        timestamp: Date.now()
                    },
                    poses: [], // 没有推理时为空
                    config: {
                        showKeypoints: false, // 没有推理时不显示关键点
                        showSkeleton: false, // 没有推理时不显示骨骼
                        showConfidence: false,
                        showBoundingBox: false,
                        showAnalysis: false,
                        showPerformance: false,
                        keypointRadius: 4,
                        skeletonLineWidth: 2,
                        colors: {
                            keypoint: '#00ff00',
                            skeleton: '#ff0000',
                            confidence: '#0000ff'
                        }
                    },
                    performance: {
                        frameRate: 0,
                        averageFrameTime: 0,
                        inferenceTime: 0,
                        memoryUsage: this.getMemoryUsage(),
                        cacheHitRate: 0,
                        totalFrames: 0,
                        droppedFrames: 0
                    }
                };
                // 性能优化：智能推理控制
                const currentTime = performance.now();
                const shouldRunInference = this.shouldRunInference(currentTime);
                // 如果应用正在运行且推理引擎可用，进行AI推理和分析
                if (this.isRunning && this.inferenceEngine && this.analysisEngine && shouldRunInference) {
                    // 性能监控：推理开始
                    const inferenceStartTime = performance.now();
                    try {
                        // 1. AI推理
                        const inferenceResult = await this.inferenceEngine.predict(imageData);
                        this.emitAppEvent('inference-complete', inferenceResult);
                        const inferenceTime = performance.now() - inferenceStartTime;
                        this.lastInferenceTime = currentTime; // 更新最后推理时间
                        // 性能监控：分析开始
                        const analysisStartTime = performance.now();
                        // 2. 分析计算
                        const analysisResult = this.analysisEngine.analyze(inferenceResult.poses);
                        this.emitAppEvent('analysis-complete', analysisResult);
                        const analysisTime = performance.now() - analysisStartTime;
                        // 3. 更新渲染数据以包含推理和分析结果
                        basicRenderData.poses = inferenceResult.poses;
                        basicRenderData.analysis = analysisResult;
                        basicRenderData.config = {
                            showKeypoints: this.config?.render.showKeypoints || true,
                            showSkeleton: this.config?.render.showSkeleton || true,
                            showConfidence: this.config?.render.showConfidence || false,
                            showBoundingBox: this.config?.render.showBoundingBox || false,
                            showAnalysis: this.config?.render.showAnalysis || false,
                            showPerformance: this.config?.render.showPerformance || false,
                            keypointRadius: 4,
                            skeletonLineWidth: 2,
                            colors: {
                                keypoint: '#00ff00',
                                skeleton: '#ff0000',
                                confidence: '#0000ff'
                            }
                        };
                        // 4. 更新性能指标
                        const totalTime = performance.now() - frameStartTime;
                        basicRenderData.performance = {
                            frameRate: Math.round(1000 / totalTime),
                            averageFrameTime: totalTime,
                            inferenceTime,
                            memoryUsage: this.getMemoryUsage(),
                            cacheHitRate: 0,
                            totalFrames: 0,
                            droppedFrames: 0
                        };
                        this.updatePerformanceMetrics(inferenceTime, totalTime);
                        // 性能日志（仅在开发模式下）
                        if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development') {
                            console.debug(`🎯 帧处理性能: 总计=${totalTime.toFixed(1)}ms, 推理=${inferenceTime.toFixed(1)}ms, 分析=${analysisTime.toFixed(1)}ms`);
                        }
                        // 性能警告
                        if (totalTime > 33) { // 超过33ms (30fps)
                            console.warn(`⚠️ 帧处理时间过长: ${totalTime.toFixed(1)}ms`);
                        }
                    }
                    catch (inferenceError) {
                        console.error('❌ 推理处理失败:', inferenceError);
                        // 尝试错误恢复
                        const recovered = await this.handleErrorWithRecovery(inferenceError instanceof Error ? inferenceError : new Error(String(inferenceError)), 'inference');
                        if (!recovered) {
                            this.emitAppEvent('error', {
                                message: '推理失败',
                                error: inferenceError instanceof Error ? inferenceError : new Error(String(inferenceError))
                            });
                        }
                        // 即使推理失败，仍然显示原始画面
                    }
                }
                else if (!shouldRunInference) {
                    // 跳帧时使用上一次的推理结果（如果有的话）
                    this.frameSkipCount++;
                    if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development') {
                        console.debug(`⏭️ 跳帧 ${this.frameSkipCount}/${this.maxFrameSkip}, 距离上次推理: ${(currentTime - this.lastInferenceTime).toFixed(1)}ms`);
                    }
                }
                // 渲染画面（无论是否有推理结果）
                this.renderEngine.render(basicRenderData);
                this.emitAppEvent('render-complete');
                const totalFrameTime = performance.now() - frameStartTime;
                // 更新基础性能指标
                if (basicRenderData.performance) {
                    basicRenderData.performance.averageFrameTime = totalFrameTime;
                    basicRenderData.performance.frameRate = Math.round(1000 / totalFrameTime);
                }
            }
        }
        catch (error) {
            console.error('❌ 帧处理失败:', error);
            this.emitAppEvent('error', undefined, error);
        }
    }
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics(inferenceTime, totalTime) {
        const currentState = stateManager.getState();
        stateManager.setState({
            performance: {
                ...currentState.performance,
                inferenceTime,
                totalTime,
                frameRate: Math.round(1000 / totalTime)
            }
        });
        this.emitAppEvent('performance-update', {
            inferenceTime,
            totalTime,
            frameRate: Math.round(1000 / totalTime)
        });
        // 动态调整推理频率
        this.adjustInferenceFrequency(inferenceTime);
    }
    /**
     * 智能推理控制 - 决定是否应该运行推理
     */
    shouldRunInference(currentTime) {
        // 如果是第一次推理，直接运行
        if (this.lastInferenceTime === 0) {
            this.frameSkipCount = 0;
            return true;
        }
        // 检查时间间隔
        const timeSinceLastInference = currentTime - this.lastInferenceTime;
        // 如果距离上次推理时间超过目标间隔，运行推理
        if (timeSinceLastInference >= this.targetInferenceInterval) {
            this.frameSkipCount = 0;
            return true;
        }
        // 如果跳帧次数超过最大值，强制运行推理
        if (this.frameSkipCount >= this.maxFrameSkip) {
            this.frameSkipCount = 0;
            return true;
        }
        // 否则跳过这一帧
        return false;
    }
    /**
     * 动态调整推理频率
     */
    adjustInferenceFrequency(averageInferenceTime) {
        // 根据推理时间动态调整频率
        if (averageInferenceTime > 200) {
            // 推理时间过长，降低频率到 5fps
            this.targetInferenceInterval = 200;
            this.maxFrameSkip = 5;
        }
        else if (averageInferenceTime > 100) {
            // 推理时间中等，保持 10fps
            this.targetInferenceInterval = 100;
            this.maxFrameSkip = 2;
        }
        else {
            // 推理时间较短，可以提高到 15fps
            this.targetInferenceInterval = 67;
            this.maxFrameSkip = 1;
        }
    }
    /**
     * 发送应用事件
     */
    emitAppEvent(type, data, error) {
        const eventData = {
            type,
            timestamp: Date.now(),
            ...(data && { data }),
            ...(error && { error })
        };
        eventBus.emit(`app:${type}`, eventData);
    }
    /**
     * 环境检查
     */
    async performEnvironmentChecks() {
        // 根据新架构设计，主线程不再检查 TensorFlow.js 依赖
        // TensorFlow.js 将在 Worker 中按需加载和检查
        // 检查基本浏览器兼容性
        if (typeof window === 'undefined') {
            throw new Error('浏览器环境不可用');
        }
        // 检查WebGL支持（用于性能优化建议）
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.warn('⚠️ WebGL不可用，Worker 将使用CPU后端');
        }
        else {
            console.log('✅ WebGL可用，Worker 可使用GPU加速');
        }
        // 检查 Web Workers 支持
        if (typeof Worker === 'undefined') {
            console.warn('⚠️ Web Workers 不可用，将使用主线程回退模式');
        }
        else {
            console.log('✅ Web Workers 可用');
        }
        console.log('✅ 环境检查通过');
    }
    /**
     * 初始化Worker管理器
     */
    async initializeWorkerManager() {
        try {
            console.log('👷 初始化Worker管理器...');
            // 使用 WorkerManagerFactory 创建管理器
            this.workerManager = await WorkerManagerFactory.create(this.config?.inference.enableWorker ?? true);
            console.log('✅ Worker管理器初始化完成');
        }
        catch (error) {
            console.error('❌ Worker管理器初始化失败:', error);
            // 更新应用状态以反映错误
            stateManager.setState({
                ui: {
                    showControls: true,
                    showStats: false,
                    showPerformance: false,
                    isLoading: false,
                    error: `Worker初始化失败: ${error instanceof Error ? error.message : String(error)}`
                }
            });
            // 严格遵循架构原则：Worker 失败时应该抛出错误，而不是回退到主线程
            throw new Error(`Worker 管理器初始化失败，应用无法启动。主线程不支持 TensorFlow.js 推理。原因: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 初始化推理引擎
     */
    async initializeInferenceEngine() {
        try {
            console.log('🤖 初始化推理引擎...');
            if (!this.config) {
                throw new Error('应用配置未初始化');
            }
            // 按需初始化 Worker 管理器（只有在真正需要推理时才创建）
            if (!this.workerManager) {
                console.log('📦 按需创建 Worker 管理器...');
                await this.initializeWorkerManager();
            }
            // 严格遵循架构原则：主线程永远不使用 TensorFlow.js
            // 只能通过 Worker 管理器进行推理
            if (!this.workerManager) {
                throw new Error('Worker 管理器创建失败，无法进行推理。主线程不支持 TensorFlow.js 推理。');
            }
            console.log('📡 使用 Worker 管理器进行推理');
            // Worker 管理器本身就是推理引擎的接口
            this.inferenceEngine = this.workerManager; // 类型转换，因为 WorkerManager 实现了推理接口
            // 关键修复：在 Worker 初始化后，必须加载模型
            try {
                console.log('🔄 加载姿态估计模型到 Worker...');
                console.log('📋 模型配置:', {
                    modelType: this.config.inference.modelType,
                    config: this.config.inference
                });
                await this.workerManager.loadModel(this.config.inference.modelType, this.config.inference);
                console.log('✅ 模型加载成功');
            }
            catch (modelError) {
                console.error('❌ 模型加载失败:', modelError);
                console.error('🔍 模型加载错误详情:', {
                    modelType: this.config.inference.modelType,
                    workerReady: this.workerManager.isReady(),
                    error: modelError instanceof Error ? modelError.message : String(modelError)
                });
                throw new Error(`模型加载失败: ${modelError instanceof Error ? modelError.message : String(modelError)}`);
            }
            // 更新状态
            stateManager.setState({
                model: {
                    type: this.config.inference.modelType,
                    isLoaded: true,
                    loadingProgress: 100,
                    config: this.config.inference
                }
            });
            this.emitAppEvent('model-loaded', {
                modelType: this.config.inference.modelType
            });
            console.log('✅ 推理引擎初始化完成');
        }
        catch (error) {
            console.error('❌ 推理引擎初始化失败:', error);
            console.error('🔍 推理引擎初始化错误详情:', {
                hasConfig: !!this.config,
                hasWorkerManager: !!this.workerManager,
                workerReady: this.workerManager ? this.workerManager.isReady() : false,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * 初始化分析引擎
     */
    async initializeAnalysisEngine() {
        try {
            console.log('📊 初始化分析引擎...');
            if (!this.config) {
                throw new Error('应用配置未初始化');
            }
            this.analysisEngine = new FitnessAnalysisEngine();
            this.analysisEngine.initialize(this.config.analysis);
            console.log('✅ 分析引擎初始化完成');
        }
        catch (error) {
            console.error('❌ 分析引擎初始化失败:', error);
            throw error;
        }
    }
    /**
     * 初始化渲染引擎
     */
    async initializeRenderEngine() {
        try {
            console.log('🎨 初始化渲染引擎...');
            if (!this.config) {
                throw new Error('应用配置未初始化');
            }
            this.renderEngine = new CanvasRenderEngine();
            // 创建canvas元素（如果不存在）
            let canvas = document.getElementById('pose-canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'pose-canvas';
                canvas.width = 640;
                canvas.height = 480;
                document.body.appendChild(canvas);
            }
            // 构建RenderEngineConfig
            const renderConfig = {
                canvas,
                showKeypoints: this.config.render.showKeypoints ?? true,
                showSkeleton: this.config.render.showSkeleton ?? true,
                showBoundingBox: this.config.render.showBoundingBox ?? false,
                showConfidence: this.config.render.showConfidence ?? false,
                showAnalysis: this.config.render.showAnalysis ?? false,
                showPerformance: this.config.render.showPerformance ?? false
            };
            this.renderEngine.initialize(renderConfig);
            console.log('✅ 渲染引擎初始化完成');
        }
        catch (error) {
            console.error('❌ 渲染引擎初始化失败:', error);
            throw error;
        }
    }
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            return {
                used: memory.usedJSHeapSize || 0,
                total: memory.totalJSHeapSize || 0,
                limit: memory.jsHeapSizeLimit || 0
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }
    /**
     * 清理资源
     */
    async dispose() {
        console.log('🧹 清理 PoseEstimationApp 资源...');
        // 停止质量监控
        if (this.qualityChecker) {
            this.qualityChecker.stopChecking();
        }
        // 停止应用
        if (this.isRunning) {
            await this.stop();
        }
        // 清理各个引擎
        if (this.inferenceEngine) {
            await this.inferenceEngine.dispose();
            this.inferenceEngine = null;
        }
        if (this.analysisEngine) {
            this.analysisEngine.dispose();
            this.analysisEngine = null;
        }
        if (this.renderEngine) {
            this.renderEngine.dispose();
            this.renderEngine = null;
        }
        if (this.workerManager) {
            await this.workerManager.dispose();
            this.workerManager = null;
        }
        // 清理数据源
        if (this.dataSource) {
            await this.dataSource.stop();
            this.dataSource = null;
        }
        // 清理错误恢复记录
        this.errorRecoveryAttempts.clear();
        // 清理事件监听器
        eventBus.clear();
        // 重置状态
        stateManager.reset();
        this.isInitialized = false;
        this.isRunning = false;
        this.config = null;
        console.log('✅ PoseEstimationApp 资源清理完成');
    }
}
// 导出工厂函数而不是全局实例，提供更好的控制
export function createPoseEstimationApp(config) {
    return new PoseEstimationApp(config);
}
// 为了向后兼容，保留全局实例
export const poseApp = new PoseEstimationApp();
//# sourceMappingURL=PoseEstimationApp.js.map