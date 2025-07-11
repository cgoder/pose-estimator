import { IAppManager } from '../interfaces/core/IAppManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';
import { ErrorManager } from '../utils/ErrorManager.js';
import { ConfigManager } from '../utils/ConfigManager.js';
import { DIContainer } from '../utils/DIContainer.js';

// 导入所有管理器
import { CameraManagerAdapter } from '../adapters/CameraManagerAdapter.js';
import { PoseEstimator } from './PoseEstimator.js';
import { UIManager } from './UIManager.js';
import { ControlsManager } from './ControlsManager.js';
import { StatusManager } from './StatusManager.js';
import { PanelManager } from './PanelManager.js';
import { LoadingManager } from './LoadingManager.js';
import { ErrorManager as UIErrorManager } from './ErrorManager.js';
import { TensorFlowProvider } from '../ai/models/TensorFlowProvider.js';
import { OneEuroFilterManager } from '../ai/filters/OneEuroFilterManager.js';
import { createAIProvider, createFilterManager } from '../ai/utils/factories.js';
import { InputSourceManager } from './InputSourceManager.js';
import { FeatureControlPanel } from './FeatureControlPanel.js';

/**
 * 应用管理器
 * 负责统一管理所有模块的初始化、生命周期和协调
 */
export class AppManager extends IAppManager {
    constructor() {
        super();
        
        // 依赖注入容器
        this.container = new DIContainer();
        
        // 错误处理器
        this.errorHandler = new ErrorManager();
        
        // 初始化状态
        this.isInitialized = false;
        this.isStarted = false;
        this.initializationProgress = 0;
        
        // 管理器实例
        this.managers = {
            loading: null,
            error: null,
            camera: null,
            inputSource: null,
            pose: null,
            ui: null,
            controls: null,
            status: null,
            panels: null,
            featureControl: null,
            tensorflow: null,
            filter: null
        };
        
        // 模块状态跟踪
        this.moduleStates = new Map();
        
        // 应用状态
        this.currentState = {
            phase: 'created',
            modules: {},
            config: {},
            errors: []
        };
        
        // 注册服务到容器
        this._registerServices();
        
        console.log('🚀 AppManager已创建');
    }
    
    /**
     * 初始化应用（接口方法）
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async init(config = {}) {
        if (this.isInitialized) {
            console.warn('⚠️ AppManager已经初始化');
            return;
        }
        
        try {
            console.log('🚀 开始初始化应用管理器...');
            this.currentState.phase = 'initializing';
            
            // 发布初始化开始事件
            eventBus.emit(EVENTS.APP_INIT, {
                phase: 'start',
                config
            });
            
            // 1. 初始化基础管理器
            await this._initializeBaseManagers();
            this._updateProgress(20, '基础管理器初始化完成');
            
            // 2. 初始化UI管理器
            await this._initializeUIManagers();
            this._updateProgress(40, 'UI管理器初始化完成');
            
            // 3. 初始化核心功能管理器
            await this._initializeCoreManagers();
            this._updateProgress(60, '核心管理器初始化完成');
            
            // 4. 初始化辅助管理器
            await this._initializeAuxiliaryManagers();
            this._updateProgress(80, '辅助管理器初始化完成');
            
            // 5. 绑定事件监听器
            this._bindEventListeners();
            this._updateProgress(90, '事件监听器绑定完成');
            
            // 6. 完成初始化
            this.isInitialized = true;
            this.currentState.phase = 'ready';
            this._updateProgress(100, '应用初始化完成');
            
            // 发布初始化完成事件
            eventBus.emit(EVENTS.APP_READY, {
                managers: this.managers,
                state: this.currentState
            });
            
            console.log('✅ 应用管理器初始化完成');
            
        } catch (error) {
            console.error('❌ 应用管理器初始化失败:', error);
            this.currentState.phase = 'error';
            this.currentState.errors.push(error);
            
            this.errorHandler.handleError(error, 'AppManager.init');
            
            // 发布初始化失败事件
            eventBus.emit(EVENTS.APP_ERROR, {
                error,
                phase: 'initialization'
            });
            
            throw error;
        }
    }
    
    /**
     * 启动应用（接口方法）
     * @param {Object} options - 启动选项
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        if (!this.isInitialized) {
            throw new Error('应用未初始化，请先调用 init() 方法');
        }
        
        if (this.isStarted) {
            console.warn('⚠️ 应用已经启动');
            return;
        }
        
        try {
            console.log('🚀 启动应用...');
            this.currentState.phase = 'running';
            
            // 发布启动开始事件
            eventBus.emit(EVENTS.APP_START, {
                options
            });
            
            // 显示加载状态
            this.managers.loading?.showLoading('正在启动应用...', {
                progress: '准备中...'
            });
            
            // 启动摄像头（使用InputSourceManager）- 检查是否已经启动
            if (this.managers.inputSource) {
                const inputSourceState = this.managers.inputSource.getState();
                if (!inputSourceState.isActive || inputSourceState.sourceType !== 'camera') {
                    console.log('📷 启动摄像头（从AppManager）...');
                    await this.managers.inputSource.startCamera(options.camera);
                } else {
                    console.log('📷 摄像头已启动，跳过重复启动');
                }
            }
            
            // 启动姿态估计器
            if (this.managers.pose && options.autoStartPose !== false) {
                await this.managers.pose.start(options.pose);
            }
            
            // 隐藏加载状态
            this.managers.loading?.hideLoading();
            
            this.isStarted = true;
            
            // 发布启动完成事件
            eventBus.emit(EVENTS.APP_STARTED, {
                state: this.currentState
            });
            
            console.log('✅ 应用启动完成');
            
        } catch (error) {
            console.error('❌ 应用启动失败:', error);
            this.currentState.phase = 'error';
            this.currentState.errors.push(error);
            
            // 隐藏加载状态并显示错误
            this.managers.loading?.hideLoading();
            this.managers.error?.showError(error);
            
            this.errorHandler.handleError(error, 'AppManager.start');
            
            // 发布启动失败事件
            eventBus.emit(EVENTS.APP_ERROR, {
                error,
                phase: 'startup'
            });
            
            throw error;
        }
    }
    
    /**
     * 停止应用（接口方法）
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isStarted) {
            console.warn('⚠️ 应用未启动');
            return;
        }
        
        try {
            console.log('🛑 停止应用...');
            
            // 发布停止开始事件
            eventBus.emit(EVENTS.APP_STOP, {});
            
            // 停止姿态估计器
            if (this.managers.pose) {
                await this.managers.pose.stop();
            }
            
            // 停止摄像头（使用InputSourceManager）
            if (this.managers.inputSource) {
                await this.managers.inputSource.stop();
            }
            
            this.isStarted = false;
            this.currentState.phase = 'ready';
            
            // 发布停止完成事件
            eventBus.emit(EVENTS.APP_STOPPED, {});
            
            console.log('✅ 应用已停止');
            
        } catch (error) {
            console.error('❌ 应用停止失败:', error);
            this.errorHandler.handleError(error, 'AppManager.stop');
            throw error;
        }
    }
    
    /**
     * 获取管理器实例（接口方法）
     * @param {string} name - 管理器名称
     * @returns {Object|null} 管理器实例
     */
    getManager(name) {
        return this.managers[name] || null;
    }
    
    /**
     * 获取应用状态（接口方法）
     * @returns {Object} 应用状态
     */
    getState() {
        return {
            ...this.currentState,
            isInitialized: this.isInitialized,
            isStarted: this.isStarted,
            managers: Object.keys(this.managers).reduce((acc, key) => {
                const manager = this.managers[key];
                acc[key] = {
                    available: !!manager,
                    state: manager?.getState ? manager.getState() : null
                };
                return acc;
            }, {})
        };
    }
    
    /**
     * 重置应用（接口方法）
     * @returns {Promise<void>}
     */
    async reset() {
        try {
            console.log('🔄 重置应用...');
            
            // 发布重置开始事件
            eventBus.emit(EVENTS.APP_RESET, {});
            
            // 停止应用
            if (this.isStarted) {
                await this.stop();
            }
            
            // 重置所有管理器
            for (const [name, manager] of Object.entries(this.managers)) {
                if (manager && typeof manager.reset === 'function') {
                    try {
                        await manager.reset();
                        console.log(`✅ ${name} 管理器重置完成`);
                    } catch (error) {
                        console.error(`❌ ${name} 管理器重置失败:`, error);
                    }
                }
            }
            
            // 重置应用状态
            this.currentState = {
                phase: 'ready',
                modules: {},
                config: {},
                errors: []
            };
            
            console.log('✅ 应用重置完成');
            
        } catch (error) {
            console.error('❌ 应用重置失败:', error);
            this.errorHandler.handleError(error, 'AppManager.reset');
            throw error;
        }
    }
    
    /**
     * 销毁应用（接口方法）
     * @returns {Promise<void>}
     */
    async destroy() {
        try {
            console.log('💥 销毁应用...');
            
            // 发布销毁开始事件
            eventBus.emit(EVENTS.APP_DESTROY, {});
            
            // 停止应用
            if (this.isStarted) {
                await this.stop();
            }
            
            // 销毁所有管理器
            for (const [name, manager] of Object.entries(this.managers)) {
                if (manager && typeof manager.destroy === 'function') {
                    try {
                        await manager.destroy();
                        console.log(`✅ ${name} 管理器销毁完成`);
                    } catch (error) {
                        console.error(`❌ ${name} 管理器销毁失败:`, error);
                    }
                }
            }
            
            // 清理状态
            this.managers = {};
            this.moduleStates.clear();
            this.isInitialized = false;
            this.isStarted = false;
            this.currentState = {
                phase: 'destroyed',
                modules: {},
                config: {},
                errors: []
            };
            
            // 发布销毁完成事件
            eventBus.emit(EVENTS.APP_DESTROYED, {});
            
            console.log('✅ 应用销毁完成');
            
        } catch (error) {
            console.error('❌ 应用销毁失败:', error);
            this.errorHandler.handleError(error, 'AppManager.destroy');
            throw error;
        }
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 注册服务到依赖注入容器
     */
    _registerServices() {
        console.log('📦 注册服务到依赖注入容器...');
        
        // 注册基础服务
        this.container
            .singleton('eventBus', () => eventBus)
            .singleton('errorHandler', () => this.errorHandler)
            .singleton('configManager', () => new ConfigManager())
            
            // 注册基础管理器服务（必需）
            .singleton('loadingManager', () => new LoadingManager())
            .singleton('errorManager', () => new UIErrorManager())
            .singleton('cameraManager', () => new CameraManagerAdapter())
            .singleton('inputSourceManager', () => new InputSourceManager())
            
            // 注册UI管理器服务（必需）
            .singleton('uiManager', () => new UIManager())
            .singleton('controlsManager', () => new ControlsManager())
            .singleton('statusManager', () => new StatusManager())
            .singleton('panelManager', () => new PanelManager())
            .singleton('featureControlPanel', () => new FeatureControlPanel())
            
            // 注册别名
            .alias('loading', 'loadingManager')
            .alias('error', 'errorManager')
            .alias('camera', 'cameraManager')
            .alias('inputSource', 'inputSourceManager')
            .alias('ui', 'uiManager')
            .alias('controls', 'controlsManager')
            .alias('status', 'statusManager')
            .alias('panels', 'panelManager')
            .alias('featureControl', 'featureControlPanel');
        
        // 注意：TensorFlow和Filter相关服务将在需要时动态注册
    }
    
    /**
     * 初始化基础管理器
     */
    async _initializeBaseManagers() {
        console.log('📦 初始化基础管理器...');
        
        // 获取配置管理器
        const configManager = this.container.resolve('configManager');
        
        // 使用依赖注入容器解析基础管理器
        this.managers.loading = this.container.resolve('loading');
        await this.managers.loading.init();
        
        this.managers.error = this.container.resolve('error');
        await this.managers.error.init();
        
        // 初始化摄像头管理器（如果启用）
        if (configManager.isFeatureEnabled('camera')) {
            this.managers.camera = this.container.resolve('camera');
            await this.managers.camera.init();
        }
        
        // 初始化输入源管理器
        this.managers.inputSource = this.container.resolve('inputSource');
        await this.managers.inputSource.init();
        
        console.log('✅ 基础管理器初始化完成');
    }
    
    /**
     * 初始化UI管理器
     */
    async _initializeUIManagers() {
        console.log('🎨 初始化UI管理器...');
        
        // 使用依赖注入容器解析UI管理器
        this.managers.ui = this.container.resolve('ui');
        await this.managers.ui.init();
        
        this.managers.controls = this.container.resolve('controls');
        await this.managers.controls.init();
        
        this.managers.status = this.container.resolve('status');
        await this.managers.status.init();
        
        this.managers.panels = this.container.resolve('panels');
        await this.managers.panels.init();
        
        // 初始化功能控制面板
        this.managers.featureControl = this.container.resolve('featureControl');
        await this.managers.featureControl.init(this);
        
        console.log('✅ UI管理器初始化完成');
    }
    
    /**
     * 初始化核心功能管理器
     */
    async _initializeCoreManagers() {
        console.log('🎯 初始化核心管理器...');
        
        // 获取配置管理器
        const configManager = this.container.resolve('configManager');
        
        // 按需初始化可选功能
        await this._initializeOptionalFeatures(configManager);
        
        console.log('✅ 核心管理器初始化完成');
    }
    
    /**
     * 按需初始化可选功能
     */
    async _initializeOptionalFeatures(configManager) {
        console.log('🔄 检查可选功能配置...');
        
        // 如果TensorFlow功能启用且设置为自动加载
        if (configManager.isFeatureEnabled('tensorflow') && 
            configManager.get('features.tensorflow.autoLoad')) {
            await this.loadTensorFlow();
        }
        
        // 如果Filter功能启用且设置为自动加载，并且TensorFlow已加载
        if (configManager.isFeatureEnabled('filter') && 
            configManager.get('features.filter.autoLoad') &&
            this.managers.tensorflow) {
            await this.loadFilter();
        }
    }
    
    /**
     * 动态加载TensorFlow
     */
    async loadTensorFlow() {
        if (this.managers.tensorflow) {
            console.log('⚠️ TensorFlow已加载');
            return this.managers.tensorflow;
        }
        
        console.log('🤖 动态加载TensorFlow...');
        
        try {
            // 动态注册TensorFlow服务
            this.container.singleton('tensorFlowProvider', async () => {
                const { TensorFlowProvider } = await import('../ai/models/TensorFlowProvider.js');
                return TensorFlowProvider.getInstance();
            });
            
            // 动态注册PoseEstimator服务
            this.container.singleton('poseEstimator', () => {
                const canvas = document.getElementById('canvas');
                if (!canvas) {
                    throw new Error('Canvas元素未找到，请检查HTML结构');
                }
                // 注入 InputSourceManager 依赖
                const inputSourceManager = this.managers.inputSource;
                return new PoseEstimator(canvas, {}, inputSourceManager);
            });
            
            // 注册别名
            this.container.alias('tensorflow', 'tensorFlowProvider');
            this.container.alias('pose', 'poseEstimator');
            
            // 初始化TensorFlow
            this.managers.tensorflow = this.container.resolve('tensorflow');
            await this.managers.tensorflow.initialize();
            
            // 初始化PoseEstimator
            this.managers.pose = this.container.resolve('pose');
            await this.managers.pose.init();
            
            console.log('✅ TensorFlow加载完成');
            eventBus.emit('tensorflow:loaded');
            
            return this.managers.tensorflow;
        } catch (error) {
            console.error('❌ TensorFlow加载失败:', error);
            eventBus.emit('tensorflow:error', error);
            throw error;
        }
    }
    
    /**
     * 动态加载Filter
     */
    async loadFilter() {
        if (this.managers.filter) {
            console.log('⚠️ Filter已加载');
            return this.managers.filter;
        }
        
        if (!this.managers.tensorflow) {
            throw new Error('Filter需要TensorFlow先加载');
        }
        
        console.log('🔧 动态加载Filter...');
        
        try {
            // 动态注册Filter服务
            this.container.singleton('filterManager', () => new OneEuroFilterManager());
            this.container.alias('filter', 'filterManager');
            
            // 初始化Filter
            this.managers.filter = this.container.resolve('filter');
            await this.managers.filter.init();
            
            console.log('✅ Filter加载完成');
            eventBus.emit('filter:loaded');
            
            return this.managers.filter;
        } catch (error) {
            console.error('❌ Filter加载失败:', error);
            eventBus.emit('filter:error', error);
            throw error;
        }
    }
    
    /**
     * 卸载TensorFlow
     */
    async unloadTensorFlow() {
        if (!this.managers.tensorflow) {
            console.log('⚠️ TensorFlow未加载');
            return;
        }
        
        console.log('🗑️ 卸载TensorFlow...');
        
        try {
            // 先卸载依赖的Filter
            if (this.managers.filter) {
                await this.unloadFilter();
            }
            
            // 销毁TensorFlow相关管理器
            if (this.managers.pose) {
                await this.managers.pose.destroy?.();
                this.managers.pose = null;
            }
            
            if (this.managers.tensorflow) {
                await this.managers.tensorflow.destroy?.();
                this.managers.tensorflow = null;
            }
            
            console.log('✅ TensorFlow卸载完成');
            eventBus.emit('tensorflow:unloaded');
        } catch (error) {
            console.error('❌ TensorFlow卸载失败:', error);
            throw error;
        }
    }
    
    /**
     * 卸载Filter
     */
    async unloadFilter() {
        if (!this.managers.filter) {
            console.log('⚠️ Filter未加载');
            return;
        }
        
        console.log('🗑️ 卸载Filter...');
        
        try {
            await this.managers.filter.destroy?.();
            this.managers.filter = null;
            
            console.log('✅ Filter卸载完成');
            eventBus.emit('filter:unloaded');
        } catch (error) {
            console.error('❌ Filter卸载失败:', error);
            throw error;
        }
    }
    
    /**
     * 初始化辅助管理器
     */
    async _initializeAuxiliaryManagers() {
        console.log('🔧 初始化辅助管理器...');
        
        // 辅助管理器现在按需加载，这里可以预留其他必需的辅助功能
        
        console.log('✅ 辅助管理器初始化完成');
    }
    
    /**
     * 绑定事件监听器
     */
    _bindEventListeners() {
        console.log('🔗 绑定应用级事件监听器...');
        
        // 监听模块状态变化
        eventBus.on(EVENTS.UI_CONTROLS_READY, () => {
            this.moduleStates.set('controls', 'ready');
        });
        
        eventBus.on(EVENTS.UI_STATUS_READY, () => {
            this.moduleStates.set('status', 'ready');
        });
        
        eventBus.on(EVENTS.UI_PANELS_READY, () => {
            this.moduleStates.set('panels', 'ready');
        });
        
        eventBus.on(EVENTS.CAMERA_READY, () => {
            this.moduleStates.set('camera', 'ready');
        });
        
        eventBus.on(EVENTS.POSE_STARTED, () => {
            this.moduleStates.set('pose', 'running');
        });
        
        eventBus.on(EVENTS.POSE_STOPPED, () => {
            this.moduleStates.set('pose', 'stopped');
        });
        
        // 监听配置变化
        eventBus.on('config:changed', (config) => {
            console.log('配置已更新:', config);
        });
        
        // 监听功能开关变化
        eventBus.on('feature:changed', async (feature, enabled) => {
            console.log(`功能${feature}${enabled ? '启用' : '禁用'}`);
            
            if (feature === 'tensorflow') {
                if (enabled) {
                    await this.loadTensorFlow();
                } else {
                    await this.unloadTensorFlow();
                }
            } else if (feature === 'filter') {
                if (enabled && this.managers.tensorflow) {
                    await this.loadFilter();
                } else {
                    await this.unloadFilter();
                }
            }
        });
        
        // 监听错误事件
        eventBus.on(EVENTS.CAMERA_ERROR, (data) => {
            this.currentState.errors.push({
                source: 'camera',
                error: data.error,
                timestamp: Date.now()
            });
        });
        
        eventBus.on(EVENTS.POSE_ERROR, (data) => {
            this.currentState.errors.push({
                source: 'pose',
                error: data.error,
                timestamp: Date.now()
            });
        });
        
        eventBus.on('error', (error) => {
            console.error('应用错误:', error);
            this.managers.error?.showError(error.message || '未知错误');
        });
        
        // 监听状态变化
        eventBus.on('state:changed', (state) => {
            console.log('应用状态变化:', state);
        });
    }
    
    /**
     * 获取模块状态（IBaseModule接口）
     * @returns {string} 模块状态
     */
    getStatus() {
        if (!this.isInitialized) return 'not_initialized';
        if (this.isStarted) return 'running';
        return 'initialized';
    }
    
    /**
     * 获取模块名称（IBaseModule接口）
     * @returns {string} 模块名称
     */
    getName() {
        return 'AppManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 更新初始化进度
     * @param {number} progress - 进度百分比
     * @param {string} message - 进度消息
     */
    _updateProgress(progress, message) {
        this.initializationProgress = progress;
        
        if (this.managers.loading) {
            this.managers.loading.updateProgress(progress, message);
        }
        
        console.log(`📊 初始化进度: ${progress}% - ${message}`);
    }
}