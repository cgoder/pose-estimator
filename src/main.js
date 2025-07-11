import { CONFIG } from './utils/constants.js';
import { ErrorHandler, EnvironmentChecker, GlobalErrorHandler } from './utils/errorHandling.js';
import { performanceMonitor, PerformanceOptimizer } from './utils/performance.js';
import { AppManager } from './components/AppManager.js';
import { eventBus, EVENTS } from './utils/EventBus.js';
import { tensorFlowService } from './ai/models/TensorFlowService.js';
import { LoadingManager } from './components/LoadingManager.js';

/**
 * 主应用类
 * 负责协调各个模块的工作，基于新的 AppManager 架构
 */
class PoseEstimationApp {
    constructor() {
        this.appManager = null;
        this.isInitialized = false;
        this.currentOptions = {
            modelType: 'MoveNet',
            showSkeleton: true,
            showKeypoints: true,
            showPerformanceInfo: false,  // 默认关闭系统监控面板
            showModelPanel: false,       // 默认关闭模型参数面板
            showFilterPanel: false,      // 默认关闭滤波器参数面板
            enableFilter: true
        };
        
        console.log('🚀 PoseEstimationApp已创建');
    }
    
    /**
     * 初始化应用
     * @returns {Promise<void>}
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.warn('⚠️ 应用已初始化');
                return;
            }
            
            console.log('🔧 开始初始化应用...');
            
            // 基础环境检查（不包括TensorFlow）
            await this.performBasicEnvironmentChecks();
            
            // 创建应用管理器
            this.appManager = new AppManager();
            
            // 绑定事件监听器
            this.bindEventListeners();
            
            // 初始化应用管理器
            await this.appManager.init({
                canvas: this.getCanvasElement(),
                options: this.currentOptions
            });
            
            // 初始化UI事件绑定
            this.initUIEventBindings();
            
            this.isInitialized = true;
            console.log('✅ 应用初始化完成');
            
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            
            // 尝试显示错误
            try {
                const errorManager = this.appManager?.getManager('error');
                if (errorManager) {
                    errorManager.showError(errorMessage, { duration: 0 });
                } else {
                    // 如果错误管理器不可用，尝试使用备用的错误显示方式
                    this.showFallbackError(errorMessage);
                }
            } catch (displayError) {
                console.error('❌ 显示错误信息时发生异常:', displayError);
                // 最后的备用方案：直接在控制台显示
                console.error('❌ 原始错误:', errorMessage);
            }
            
            console.error('❌ 应用初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取Canvas元素
     * @returns {HTMLCanvasElement} Canvas元素
     */
    getCanvasElement() {
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            throw new Error('找不到Canvas元素');
        }
        
        EnvironmentChecker.checkCanvas(canvas);
        
        // 设置Canvas样式
        canvas.style.cssText = `
            border: 2px solid #3498db;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            background: #000;
        `;
        
        console.log('✅ Canvas元素获取完成');
        return canvas;
    }
    
    /**
     * 绑定应用级事件监听器
     */
    bindEventListeners() {
        console.log('🔗 绑定应用级事件监听器...');
        
        // 监听应用管理器事件
        eventBus.on(EVENTS.APP_READY, () => {
            console.log('📱 应用管理器准备就绪');
        });
        
        eventBus.on(EVENTS.APP_STARTED, () => {
            console.log('🚀 应用已启动');
        });
        
        eventBus.on(EVENTS.APP_ERROR, (data) => {
            console.error('💥 应用错误:', data.error);
        });
        
        // 监听UI事件
        eventBus.on(EVENTS.UI_CONTROLS_READY, () => {
            console.log('🎛️ 控制面板准备就绪');
        });
        
        eventBus.on(EVENTS.UI_STATUS_READY, () => {
            console.log('📊 状态面板准备就绪');
        });
        
        eventBus.on(EVENTS.UI_PANELS_READY, () => {
            console.log('📋 参数面板准备就绪');
        });
    }
    
    /**
     * 初始化UI事件绑定
     */
    initUIEventBindings() {
        console.log('🎨 初始化UI事件绑定...');
        
        const controlsManager = this.appManager.getManager('controls');
        const panelsManager = this.appManager.getManager('panels');
        const statusManager = this.appManager.getManager('status');
        const poseEstimator = this.appManager.getManager('pose');
        
        if (!controlsManager || !panelsManager) {
            console.warn('⚠️ UI管理器未初始化，跳过事件绑定');
            return;
        }
        
        // 绑定控制面板事件
        eventBus.on(EVENTS.CONTROLS_TOGGLE_MODEL, () => {
            const isVisible = panelsManager.getPanelState('model').visible;
            if (isVisible) {
                panelsManager.hidePanel('model');
            } else {
                panelsManager.showPanel('model');
            }
        });
        
        eventBus.on(EVENTS.CONTROLS_TOGGLE_PERFORMANCE, () => {
            if (statusManager) {
                const currentState = statusManager.getState();
                if (currentState.isVisible) {
                    statusManager.hideStatus();
                } else {
                    statusManager.showStatus();
                }
            }
        });
        
        eventBus.on(EVENTS.CONTROLS_TOGGLE_FILTER, () => {
            const isVisible = panelsManager.getPanelState('filter').visible;
            if (isVisible) {
                panelsManager.hidePanel('filter');
            } else {
                panelsManager.showPanel('filter');
            }
        });
        
        // 绑定模型参数面板事件
        eventBus.on(EVENTS.MODEL_CHANGE, async (data) => {
            await this.changeModel(data.modelType);
        });
        
        eventBus.on(EVENTS.MODEL_SKELETON_TOGGLE, (data) => {
            this.toggleSkeleton(data.enabled);
        });
        
        eventBus.on(EVENTS.MODEL_KEYPOINTS_TOGGLE, (data) => {
            this.toggleKeypoints(data.enabled);
        });
        
        eventBus.on(EVENTS.MODEL_RESTART, async () => {
            await this.restart();
        });
        
        eventBus.on(EVENTS.MODEL_CLEAR_CACHE, async () => {
            await this.clearCache();
        });
        
        // 绑定滤波器面板事件
        eventBus.on(EVENTS.FILTER_TOGGLE, (data) => {
            this.toggleFilter(data.enabled);
        });
        
        eventBus.on(EVENTS.FILTER_PRESET_CHANGE, (data) => {
            this.applyFilterPreset(data.presetName);
        });
        
        eventBus.on(EVENTS.FILTER_PARAM_UPDATE, (data) => {
            this.updateFilterParam(data.paramName, data.value);
        });
        
        eventBus.on(EVENTS.FILTER_RESET, () => {
            this.resetFilterParams();
        });
        
        eventBus.on(EVENTS.FILTER_APPLY, () => {
            this.applyFilterConfig();
        });
        
        // 绑定键盘快捷键
        document.addEventListener('keydown', (event) => {
            if (event.key === 'r' && event.ctrlKey) {
                event.preventDefault();
                this.restart();
            } else if (event.key === ' ') {
                event.preventDefault();
                this.togglePause();
            }
        });
        
        console.log('✅ UI事件绑定完成');
    }
    

    
    /**
     * 执行基础环境检查（不包括TensorFlow）
     * @returns {Promise<void>}
     */
    async performBasicEnvironmentChecks() {
        console.log('🔍 执行基础环境检查...');
        
        // HTTPS检查（支持开发模式跳过）
        const skipHttpsCheck = window.CONFIG?.DEVELOPMENT?.SKIP_HTTPS_CHECK || false;
        if (!skipHttpsCheck) {
            await EnvironmentChecker.checkHTTPS();
        }
        
        if (skipHttpsCheck) {
            console.warn('🔧 开发模式：已跳过HTTPS检查');
            console.warn('⚠️ 注意：某些浏览器可能仍然限制HTTP环境下的摄像头访问');
        }
        
        // 浏览器兼容性检查
        const compatibilityResult = await EnvironmentChecker.checkBrowserCompatibility();
        if (!compatibilityResult.isCompatible) {
            const issues = Array.isArray(compatibilityResult.issues) ? compatibilityResult.issues : ['浏览器兼容性检查失败'];
            throw new Error(issues.join('; '));
        }
        
        console.log('✅ 基础环境检查通过');
        console.log('💡 TensorFlow功能将在用户主动启用时加载');
    }
    
    /**
     * 执行完整环境检查（包括TensorFlow）- 仅在启用AI功能时调用
     * @returns {Promise<void>}
     */
    async performFullEnvironmentChecks() {
        console.log('🔍 执行完整环境检查（包括TensorFlow）...');
        
        // 先执行基础检查
        await this.performBasicEnvironmentChecks();
        
        // TensorFlow.js检查 - 检查全局变量和基本功能
        try {
            // 首先检查全局变量是否存在
            if (typeof window.tf === 'undefined') {
                throw new Error('TensorFlow.js全局变量未找到');
            }
            
            // 检查TensorFlow.js基本功能
            if (!window.tf.version) {
                throw new Error('TensorFlow.js版本信息不可用');
            }
            
            // 检查后端是否可用
            if (!window.tf.getBackend || !window.tf.getBackend()) {
                throw new Error('TensorFlow.js后端未正确设置');
            }
            
            // 检查PoseDetection是否可用
            if (typeof window.poseDetection === 'undefined') {
                throw new Error('PoseDetection库未找到');
            }
            
            if (!window.poseDetection.SupportedModels) {
                throw new Error('PoseDetection库不完整');
            }
            
            console.log('✅ TensorFlow.js环境检查通过');
            console.log(`📋 TensorFlow版本: ${window.tf.version}`);
            console.log(`📋 当前后端: ${window.tf.getBackend()}`);
        } catch (error) {
            console.error('❌ TensorFlow.js环境检查失败:', error);
            throw new Error('TensorFlow.js库未正确加载');
        }
        
        console.log('✅ 完整环境检查通过');
    }
    
    /**
     * 切换模型
     * @param {string} modelType 模型类型
     */
    async changeModel(modelType) {
        try {
            const poseEstimator = this.appManager.getManager('pose');
            if (poseEstimator) {
                await poseEstimator.changeModel(modelType);
            }
        } catch (error) {
            console.error('模型切换失败:', error);
            const errorManager = this.appManager.getManager('error');
            if (errorManager) {
                errorManager.showError('模型切换失败: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * 切换骨架显示
     * @param {boolean} enabled 是否启用
     */
    toggleSkeleton(enabled) {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.toggleSkeleton(enabled);
        }
    }
    
    /**
     * 切换关键点显示
     * @param {boolean} enabled 是否启用
     */
    toggleKeypoints(enabled) {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.toggleKeypoints(enabled);
        }
    }
    
    /**
     * 重启应用
     */
    async restart() {
        try {
            console.log('🔄 重启应用...');
            await this.appManager.reset();
            await this.appManager.start();
            console.log('✅ 应用重启完成');
        } catch (error) {
            console.error('应用重启失败:', error);
            const errorManager = this.appManager.getManager('error');
            if (errorManager) {
                errorManager.showError('应用重启失败: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * 清空缓存
     */
    async clearCache() {
        try {
            console.log('🗑️ 清空缓存...');
            const cacheManager = this.appManager.getManager('cache');
            if (cacheManager) {
                await cacheManager.clearAll();
                console.log('✅ 缓存清空完成');
            }
        } catch (error) {
            console.error('缓存清空失败:', error);
            const errorManager = this.appManager.getManager('error');
            if (errorManager) {
                errorManager.showError('缓存清空失败: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * 切换滤波器
     * @param {boolean} enabled 是否启用
     */
    toggleFilter(enabled) {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.toggleFilter(enabled);
        }
    }
    
    /**
     * 应用滤波器预设
     * @param {string} presetName 预设名称
     */
    applyFilterPreset(presetName) {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.applyFilterPreset(presetName);
        }
    }
    
    /**
     * 更新滤波器参数
     * @param {string} paramName 参数名称
     * @param {number} value 参数值
     */
    updateFilterParam(paramName, value) {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.updateFilterParam(paramName, value);
        }
    }
    
    /**
     * 重置滤波器参数
     */
    resetFilterParams() {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.resetFilterParams();
        }
    }
    
    /**
     * 应用滤波器配置
     */
    applyFilterConfig() {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            poseEstimator.applyFilterConfig();
        }
    }
    
    /**
     * 切换暂停/继续
     */
    togglePause() {
        const poseEstimator = this.appManager.getManager('pose');
        if (poseEstimator) {
            const currentState = poseEstimator.getState();
            if (currentState.isRunning) {
                poseEstimator.stop();
            } else {
                poseEstimator.start();
            }
        }
    }
    

    
    /**
     * 备用错误显示方法
     * 当错误管理器不可用时使用
     * @param {string} errorMessage - 错误消息
     */
    showFallbackError(errorMessage) {
        console.error('❌ 使用备用错误显示:', errorMessage);
        
        // 尝试查找现有的错误显示元素
        let errorElement = document.querySelector('.error-display');
        
        // 如果没有找到，创建一个临时的错误显示元素
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-display fallback-error';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff4757;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 80%;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
            `;
            document.body.appendChild(errorElement);
            
            // 添加关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                position: absolute;
                top: 5px;
                right: 10px;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            closeButton.onclick = () => errorElement.remove();
            errorElement.appendChild(closeButton);
        }
        
        // 显示错误消息
        errorElement.innerHTML = errorMessage + (errorElement.querySelector('button') ? errorElement.querySelector('button').outerHTML : '');
        errorElement.style.display = 'block';
        
        // 自动隐藏（10秒后）
        setTimeout(() => {
            if (errorElement && errorElement.parentNode) {
                errorElement.style.opacity = '0';
                errorElement.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    if (errorElement && errorElement.parentNode) {
                        errorElement.remove();
                    }
                }, 300);
            }
        }, 10000);
    }
    
    /**
     * 获取用户友好的错误消息
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    getErrorMessage(error) {
        if (error.name === 'CameraError') {
            return `摄像头错误: ${error.message}<br><br>解决方案:<br>• 确保已授权摄像头访问权限<br>• 检查摄像头是否被其他应用占用<br>• 尝试刷新页面重新授权`;
        }
        
        if (error.name === 'ModelError') {
            return `模型加载错误: ${error.message}<br><br>解决方案:<br>• 检查网络连接<br>• 清空浏览器缓存后重试<br>• 尝试切换到其他模型`;
        }
        
        if (error.name === 'StartupError') {
            return `启动错误: ${error.message}<br><br>解决方案:<br>• 确保使用HTTPS访问<br>• 检查浏览器兼容性<br>• 尝试刷新页面`;
        }
        
        if (error.message.includes('HTTPS') || error.message.includes('摄像头')) {
            return `需要HTTPS环境才能访问摄像头<br><br>🔧 解决方案:<br><strong>方案1: HTTPS服务器 (推荐)</strong><br>• 运行项目根目录下的 start-https-server.ps1 或 start-https-server.bat<br>• 或手动启动: npx http-server . -p 8443 -S -c-1 --cors<br>• 访问: https://localhost:8443/main.html<br><br><strong>方案2: HTTP调试模式 (仅开发环境)</strong><br>• 运行 start-http-debug.bat 或 start-http-debug.ps1<br>• 或手动启动: npx http-server . -p 8080 -c-1 --cors<br>• 需要配置浏览器允许HTTP摄像头访问<br>• 详见: HTTP-DEBUG-GUIDE.md<br><br>💡 提示: 现代浏览器出于安全考虑，优先推荐HTTPS环境`;
        }
        
        if (error.message.includes('getUserMedia')) {
            return `无法访问摄像头<br><br>解决方案:<br>• 点击地址栏的摄像头图标授权<br>• 检查浏览器设置中的摄像头权限<br>• 确保摄像头设备正常工作`;
        }
        
        return `未知错误: ${error.message}<br><br>请尝试刷新页面或联系技术支持`;
    }
    
    /**
     * 清理应用资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        console.log('🧹 开始清理应用资源...');
        
        if (this.appManager) {
            await this.appManager.destroy();
            this.appManager = null;
        }
        
        this.isInitialized = false;
        
        console.log('✅ 应用资源清理完成');
    }
    
    /**
     * 获取应用状态
     * @returns {Object} 应用状态信息
     */
    getAppStatus() {
        if (!this.appManager) {
            return {
                initialized: false,
                ready: false,
                running: false,
                error: null
            };
        }
        
        const appState = this.appManager.getState();
        const poseEstimator = this.appManager.getManager('pose');
        const cameraManager = this.appManager.getManager('camera');
        
        return {
            initialized: appState.initialized,
            ready: appState.ready,
            running: poseEstimator ? poseEstimator.getState().isRunning : false,
            camera: cameraManager ? cameraManager.getState() : null,
            pose: poseEstimator ? poseEstimator.getState() : null,
            error: appState.error
        };
    }
}

/**
 * 主函数 - 应用入口点
 * @returns {Promise<void>}
 */
async function main() {
    console.log('🚀 启动姿态估计应用...');
    
    // 设置全局错误处理
    window.addEventListener('error', (event) => {
        console.error('💥 全局错误:', event.error);
        eventBus.emit(EVENTS.APP_ERROR, { error: event.error });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('💥 未处理的Promise拒绝:', event.reason);
        eventBus.emit(EVENTS.APP_ERROR, { error: event.reason });
    });
    
    try {
        // 优化TensorFlow.js性能
        if (typeof tf !== 'undefined') {
            // 设置TensorFlow.js后端
            await tf.ready();
            console.log('✅ TensorFlow.js 准备就绪，后端:', tf.getBackend());
            
            // 预加载模型
            const defaultModels = [
                { type: 'MoveNet' },
                { type: 'PoseNet' }
            ];
            await tensorFlowService.batchPreloadModels(defaultModels);
        }
        
        // 创建应用实例
        const app = new PoseEstimationApp();
        
        // 初始化应用
        await app.init();
        
        // 启动应用 - 只启动摄像头，不启动PoseEstimator
        await app.appManager.start({
            autoStartPose: false  // 明确禁用PoseEstimator自动启动
        });
        
        // 确保正确显示主应用容器和隐藏所有加载界面
        try {
            console.log('🔧 开始强制显示主应用界面...');
            
            // 强制显示主应用容器
            const appMain = document.getElementById('app-main');
            if (appMain) {
                // 使用!important样式确保显示
                appMain.style.setProperty('display', 'flex', 'important');
                appMain.style.setProperty('opacity', '1', 'important');
                appMain.style.setProperty('visibility', 'visible', 'important');
                appMain.style.setProperty('z-index', '1', 'important');
                console.log('✅ 主应用容器已显示');
            } else {
                console.error('❌ 找不到app-main元素');
            }
            
            // 强制隐藏HTML中的加载界面
            const appLoading = document.getElementById('app-loading');
            if (appLoading) {
                appLoading.style.setProperty('display', 'none', 'important');
                console.log('✅ HTML加载界面已隐藏');
            }
            
            // 隐藏LoadingManager创建的加载元素
            const loadingStatus = document.getElementById('loading-status');
            if (loadingStatus) {
                loadingStatus.style.setProperty('display', 'none', 'important');
                console.log('✅ LoadingManager加载界面已隐藏');
            }
            
            // 隐藏所有可能的加载元素
            const allLoadingElements = document.querySelectorAll('[id*="loading"], [class*="loading"], [class*="spinner"]');
            allLoadingElements.forEach(element => {
                if (element.id !== 'app-main' && element.id !== 'canvas') {
                    element.style.setProperty('display', 'none', 'important');
                }
            });
            
            // 强制显示Canvas容器和Canvas元素
            const canvasContainer = document.querySelector('.canvas-container');
            if (canvasContainer) {
                canvasContainer.style.setProperty('display', 'inline-block', 'important');
                canvasContainer.style.setProperty('visibility', 'visible', 'important');
                canvasContainer.style.setProperty('opacity', '1', 'important');
                canvasContainer.style.setProperty('background', '#000', 'important');
                console.log('✅ Canvas容器已强制显示');
            } else {
                console.error('❌ 找不到canvas-container元素');
            }
            
            const canvas = document.getElementById('canvas');
            if (canvas) {
                canvas.style.setProperty('display', 'block', 'important');
                canvas.style.setProperty('visibility', 'visible', 'important');
                canvas.style.setProperty('opacity', '1', 'important');
                canvas.style.setProperty('background', '#000', 'important');
                
                // 确保Canvas有正确的尺寸
                const rect = canvas.getBoundingClientRect();
                console.log(`✅ Canvas元素已强制显示，尺寸: ${rect.width}x${rect.height}`);
            } else {
                console.error('❌ 找不到canvas元素');
            }
            
            // 通过LoadingManager实例隐藏（如果存在）
            if (app.appManager && app.appManager.managers.loading) {
                app.appManager.managers.loading.hideLoading();
                console.log('✅ AppManager LoadingManager已隐藏');
            }
            
        } catch (error) {
            console.warn('⚠️ 显示主应用界面时出现问题:', error);
            
            // 备用方案：直接操作DOM并注入强制显示样式
            console.log('🔧 启用备用显示方案...');
            
            const appMain = document.getElementById('app-main');
            const appLoading = document.getElementById('app-loading');
            const loadingStatus = document.getElementById('loading-status');
            const canvasContainer = document.querySelector('.canvas-container');
            const canvas = document.getElementById('canvas');
            
            if (appMain) {
                appMain.style.setProperty('display', 'flex', 'important');
                appMain.style.setProperty('opacity', '1', 'important');
                appMain.style.setProperty('visibility', 'visible', 'important');
                console.log('✅ 备用方案：app-main已显示');
            }
            
            if (appLoading) {
                appLoading.style.setProperty('display', 'none', 'important');
                console.log('✅ 备用方案：app-loading已隐藏');
            }
            
            if (loadingStatus) {
                loadingStatus.style.setProperty('display', 'none', 'important');
                console.log('✅ 备用方案：loading-status已隐藏');
            }
            
            if (canvasContainer) {
                canvasContainer.style.setProperty('display', 'inline-block', 'important');
                canvasContainer.style.setProperty('visibility', 'visible', 'important');
                canvasContainer.style.setProperty('opacity', '1', 'important');
                console.log('✅ 备用方案：canvas-container已显示');
            }
            
            if (canvas) {
                canvas.style.setProperty('display', 'block', 'important');
                canvas.style.setProperty('visibility', 'visible', 'important');
                canvas.style.setProperty('opacity', '1', 'important');
                console.log('✅ 备用方案：canvas已显示');
            }
            
            // 注入强制显示样式
            const forceStyle = document.createElement('style');
            forceStyle.id = 'force-show-canvas';
            forceStyle.textContent = `
                #app-main {
                    display: flex !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    z-index: 1 !important;
                }
                #app-loading, #loading-status {
                    display: none !important;
                }
                [id*="loading"]:not(#app-main):not(#canvas),
                [class*="loading"]:not(.canvas-container),
                [class*="spinner"] {
                    display: none !important;
                }
                .canvas-container {
                    display: inline-block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    background: #000 !important;
                }
                #canvas {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    background: #000 !important;
                }
            `;
            document.head.appendChild(forceStyle);
            console.log('✅ 强制显示样式已注入');
        }
        
        // 设置页面卸载时的清理
        window.addEventListener('beforeunload', async () => {
            await app.cleanup();
        });
        
        // 将应用实例暴露到全局作用域（用于调试）
        window.poseApp = app;
        
        console.log('✅ 姿态估计应用启动成功！');
        console.log('🎉 应用已完全就绪，可以开始使用！');
        console.log('🔍 如果仍看到加载界面，请刷新页面');
        
    } catch (error) {
        console.error('❌ 应用启动失败:', error);
        
        // 显示启动失败的错误信息
        const errorElement = document.querySelector('.error-display');
        if (errorElement) {
            errorElement.innerHTML = `应用启动失败: ${error.message}<br><br>请检查控制台获取详细错误信息`;
            errorElement.style.display = 'block';
        } else {
            // 如果没有错误显示元素，创建一个简单的错误提示
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff4757;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 80%;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            errorDiv.innerHTML = `应用启动失败: ${error.message}`;
            document.body.appendChild(errorDiv);
        }
    }
}

// 等待DOM加载完成后启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// 导出主要类和函数
export { PoseEstimationApp, main };