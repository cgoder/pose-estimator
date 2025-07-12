import { eventBus } from './EventBus.js';
import { stateManager } from './StateManager.js';
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
    constructor(config) {
        this.dataSource = null;
        this.inferenceEngine = null;
        this.analysisEngine = null;
        this.renderEngine = null;
        this.workerManager = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.config = null;
        this.setupEventListeners();
        // 设置默认配置
        this.config = this.mergeWithDefaultConfig(config);
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
        try {
            if (!this.isRunning || !this.inferenceEngine || !this.analysisEngine || !this.renderEngine) {
                return;
            }
            const startTime = performance.now();
            // 1. AI推理
            const inferenceResult = await this.inferenceEngine.predict(imageData);
            this.emitAppEvent('inference-complete', inferenceResult);
            // 2. 分析计算
            const analysisResult = this.analysisEngine.analyze(inferenceResult.poses);
            this.emitAppEvent('analysis-complete', analysisResult);
            // 3. 渲染输出
            const renderData = {
                frame: {
                    imageData: imageData,
                    width: imageData.width,
                    height: imageData.height,
                    timestamp: Date.now()
                },
                poses: inferenceResult.poses,
                analysis: analysisResult,
                config: {
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
                },
                performance: {
                    frameRate: Math.round(1000 / (performance.now() - startTime)),
                    averageFrameTime: performance.now() - startTime,
                    inferenceTime: inferenceResult.inferenceTime,
                    memoryUsage: { used: 0, total: 0, limit: 0 },
                    cacheHitRate: 0,
                    totalFrames: 0,
                    droppedFrames: 0
                }
            };
            this.renderEngine.render(renderData);
            this.emitAppEvent('render-complete');
            // 4. 更新性能指标
            const totalTime = performance.now() - startTime;
            this.updatePerformanceMetrics(inferenceResult.inferenceTime, totalTime);
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
     * 清理资源
     */
    dispose() {
        this.stop();
        // 清理数据源
        if (this.dataSource) {
            this.dataSource.stop();
            this.dataSource = null;
        }
        // 清理推理引擎
        if (this.inferenceEngine) {
            this.inferenceEngine.dispose();
            this.inferenceEngine = null;
        }
        // 清理分析引擎
        if (this.analysisEngine) {
            this.analysisEngine.dispose();
            this.analysisEngine = null;
        }
        // 清理渲染引擎
        if (this.renderEngine) {
            this.renderEngine.dispose();
            this.renderEngine = null;
        }
        // 清理Worker管理器
        if (this.workerManager) {
            this.workerManager.dispose();
            this.workerManager = null;
        }
        // 清理事件监听器
        eventBus.clear();
        // 重置状态
        stateManager.reset();
        this.isInitialized = false;
        this.isRunning = false;
        this.config = null;
        console.log('🧹 应用资源已清理');
    }
}
// 导出工厂函数而不是全局实例，提供更好的控制
export function createPoseEstimationApp(config) {
    return new PoseEstimationApp(config);
}
// 为了向后兼容，保留全局实例
export const poseApp = new PoseEstimationApp();
//# sourceMappingURL=PoseEstimationApp.js.map