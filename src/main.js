import { CONFIG } from './utils/constants.js';
import { ErrorHandler, EnvironmentChecker, GlobalErrorHandler } from './utils/errorHandling.js';
import { performanceMonitor, PerformanceOptimizer } from './utils/performance.js';
import { adaptiveFrameController } from './utils/adaptiveFrameController.js';
import { hybridCacheManager as modelCacheManager } from './components/HybridCacheManager.js';
import { PoseEstimator } from './components/PoseEstimator.js';
import { uiManager } from './components/UIManager.js';
import { offscreenRenderManager } from './utils/offscreenRenderManager.js';

// 暴露到全局作用域以便调试和监控面板访问
window.performanceMonitor = performanceMonitor;
window.adaptiveFrameController = adaptiveFrameController;
window.offscreenRenderManager = offscreenRenderManager;

/**
 * 主应用类
 * 负责协调各个模块的工作
 */
class PoseEstimationApp {
    constructor() {
        this.canvas = null;
        this.poseEstimator = null;
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
            
            // 显示加载状态
            uiManager.init();
            uiManager.showLoading('正在初始化应用...', '检查环境兼容性');
            
            // 环境检查
            await this.performEnvironmentChecks();
            
            // 初始化Canvas
            uiManager.showLoading('正在初始化Canvas...', '设置渲染环境');
            this.initCanvas();
            
            // 初始化缓存管理器
            uiManager.showLoading('正在初始化缓存...', '连接本地存储');
            await this.initCacheManager();
            
            // 预加载模型
            uiManager.showLoading('正在预加载模型...', '下载AI模型文件');
            await this.preloadModels();
            
            // 创建姿态估计器
            uiManager.showLoading('正在创建姿态估计器...', '初始化AI引擎');
            this.createPoseEstimator();
            
            // 初始化UI
            this.initUI();
            
            // 启动姿态估计器
            uiManager.showLoading('正在启动摄像头...', '获取视频流');
            await this.poseEstimator.start();
            
            // 隐藏加载状态
            uiManager.hideLoading();
            uiManager.showSuccess('姿态估计器启动成功！');
            
            this.isInitialized = true;
            console.log('✅ 应用初始化完成');
            
        } catch (error) {
            uiManager.hideLoading();
            const errorMessage = this.getErrorMessage(error);
            uiManager.showError(errorMessage, 0);
            console.error('❌ 应用初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 执行环境检查
     * @returns {Promise<void>}
     */
    async performEnvironmentChecks() {
        // HTTPS检查（支持开发模式跳过）
        const skipHttpsCheck = window.CONFIG?.DEVELOPMENT?.SKIP_HTTPS_CHECK || false;
        if (!skipHttpsCheck && !EnvironmentChecker.checkHTTPS()) {
            throw new Error('需要HTTPS环境才能访问摄像头');
        }
        
        if (skipHttpsCheck) {
            console.warn('🔧 开发模式：已跳过HTTPS检查');
            console.warn('⚠️ 注意：某些浏览器可能仍然限制HTTP环境下的摄像头访问');
        }
        
        // 浏览器兼容性检查
        const compatibilityResult = EnvironmentChecker.checkBrowserCompatibility();
        if (!compatibilityResult.isCompatible) {
            throw new Error(compatibilityResult.issues.join('; '));
        }
        
        // TensorFlow.js检查
        if (typeof tf === 'undefined' || typeof poseDetection === 'undefined') {
            throw new Error('TensorFlow.js库未正确加载');
        }
        
        console.log('✅ 环境检查通过');
    }
    
    /**
     * 初始化Canvas
     */
    initCanvas() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            throw new Error('找不到Canvas元素');
        }
        
        EnvironmentChecker.checkCanvas(this.canvas);
        
        // 设置Canvas样式
        this.canvas.style.cssText = `
            border: 2px solid #3498db;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            background: #000;
        `;
        
        console.log('✅ Canvas初始化完成');
    }
    
    /**
     * 初始化缓存管理器
     * @returns {Promise<void>}
     */
    async initCacheManager() {
        try {
            await modelCacheManager.init();
            console.log('✅ 缓存管理器初始化完成');
        } catch (error) {
            console.warn('⚠️ 缓存管理器初始化失败，将使用内存缓存:', error);
        }
    }
    
    /**
     * 预加载模型
     * @returns {Promise<void>}
     */
    async preloadModels() {
        try {
            await PoseEstimator.preloadModels();
            console.log('✅ 模型预加载完成');
        } catch (error) {
            console.warn('⚠️ 模型预加载失败，将在使用时加载:', error);
        }
    }
    
    /**
     * 创建姿态估计器
     */
    createPoseEstimator() {
        this.poseEstimator = new PoseEstimator(this.canvas, this.currentOptions);
        console.log('✅ 姿态估计器创建完成');
    }
    
    /**
     * 初始化UI
     */
    initUI() {
        // 调试信息：检查 uiManager 对象
        console.log('🔍 调试信息 - uiManager:', uiManager);
        
        // 设置PoseEstimator实例引用到UIManager
        try {
            if (uiManager && this.poseEstimator) {
                // 直接设置属性，然后调用方法
                uiManager.poseEstimator = this.poseEstimator;
                
                // 如果有摄像头切换按钮，更新其状态
                if (uiManager.cameraSwitchButton && this.poseEstimator.getCurrentFacingMode) {
                    const currentMode = this.poseEstimator.getCurrentFacingMode();
                    uiManager.updateCameraSwitchButton(currentMode);
                }
                
                console.log('✅ 成功设置 PoseEstimator 实例到 UIManager');
            } else {
                console.warn('⚠️ uiManager 或 poseEstimator 不存在');
            }
        } catch (error) {
            console.error('❌ 设置 PoseEstimator 失败:', error);
            // 不抛出错误，尝试继续执行
        }
        
        // 绑定控制面板事件
        uiManager.bindControlEvents({
            onModelPanelToggle: (enabled) => this.toggleModelPanel(enabled),
            onPerformanceToggle: (enabled) => this.togglePerformanceInfo(enabled),
            onFilterPanelToggle: (enabled) => this.toggleFilterPanel(enabled)
        });
        
        // 绑定模型参数面板事件
        uiManager.bindModelPanelEvents({
            onModelChange: (modelType) => this.changeModel(modelType),
            onSkeletonToggle: (enabled) => this.toggleSkeleton(enabled),
            onKeypointsToggle: (enabled) => this.toggleKeypoints(enabled),
            onRestart: () => this.restart(),
            onClearCache: () => this.clearCache()
        });
        
        // 绑定滤波器面板事件
        uiManager.bindFilterPanelEvents({
            onFilterToggle: (enabled) => this.toggleFilter(enabled),
            onPresetChange: (presetName) => this.applyFilterPreset(presetName),
            onFrequencyChange: (value) => this.updateFilterParam('frequency', value),
            onMinCutoffChange: (value) => this.updateFilterParam('minCutoff', value),
            onBetaChange: (value) => this.updateFilterParam('beta', value),
            onDCutoffChange: (value) => this.updateFilterParam('dCutoff', value),
            onReset: () => this.resetFilterParams(),
            onApply: () => this.applyFilterConfig()
        });
        
        // 添加键盘快捷键
        uiManager.addKeyboardShortcuts({
            onRestart: () => this.restart(),
            onTogglePause: () => this.togglePause()
        });
        
        // 更新控制面板状态
        uiManager.updateControlsState(this.currentOptions);
        
        // 显示控制面板
        uiManager.showControls();
        
        // 定期更新状态显示
        this.startStatusUpdates();
        
        // 根据初始设置显示或隐藏系统监控面板
        if (this.currentOptions.showPerformanceInfo) {
            uiManager.showStatus();
        } else {
            uiManager.hideStatus();
        }
        
        // 根据初始设置显示或隐藏模型参数面板
        if (this.currentOptions.showModelPanel) {
            uiManager.showModelPanel();
            uiManager.updateModelPanelState({
                modelType: this.currentOptions.modelType,
                showSkeleton: this.currentOptions.showSkeleton,
                showKeypoints: this.currentOptions.showKeypoints
            });
        } else {
            uiManager.hideModelPanel();
        }
        
        console.log('✅ UI初始化完成');
    }
    
    /**
     * 开始状态更新
     */
    startStatusUpdates() {
        setInterval(() => {
            if (this.poseEstimator && this.isInitialized) {
                const status = this.poseEstimator.getStatus();
                uiManager.updateStatus(status);
            }
        }, 1000);
    }
    
    /**
     * 更改模型类型
     * @param {string} modelType - 新的模型类型
     */
    async changeModel(modelType) {
        try {
            uiManager.showLoading(`正在切换到${modelType}模型...`, '重新初始化AI引擎');
            
            // 停止当前估计器
            if (this.poseEstimator) {
                await this.poseEstimator.stop();
            }
            
            // 更新选项
            this.currentOptions.modelType = modelType;
            
            // 创建新的估计器
            this.createPoseEstimator();
            
            // 更新UIManager的PoseEstimator引用
            uiManager.poseEstimator = this.poseEstimator;
            
            // 如果有摄像头切换按钮，更新其状态
            if (uiManager.cameraSwitchButton && this.poseEstimator.getCurrentFacingMode) {
                const currentMode = this.poseEstimator.getCurrentFacingMode();
                uiManager.updateCameraSwitchButton(currentMode);
            }
            
            // 重新启动
            await this.poseEstimator.start();
            
            uiManager.hideLoading();
            uiManager.showSuccess(`已切换到${modelType}模型`);
            
        } catch (error) {
            uiManager.hideLoading();
            uiManager.showError(`模型切换失败: ${error.message}`);
            console.error('❌ 模型切换失败:', error);
        }
    }
    
    /**
     * 切换骨架显示
     * @param {boolean} enabled - 是否启用
     */
    toggleSkeleton(enabled) {
        this.currentOptions.showSkeleton = enabled;
        if (this.poseEstimator) {
            this.poseEstimator.options.showSkeleton = enabled;
        }
        console.log(`🦴 骨架显示: ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 切换关键点显示
     * @param {boolean} enabled - 是否启用
     */
    toggleKeypoints(enabled) {
        this.currentOptions.showKeypoints = enabled;
        if (this.poseEstimator) {
            this.poseEstimator.options.showKeypoints = enabled;
        }
        console.log(`🎯 关键点显示: ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 切换系统监控面板显示
     * @param {boolean} enabled - 是否启用
     */
    togglePerformanceInfo(enabled) {
        this.currentOptions.showPerformanceInfo = enabled;
        if (this.poseEstimator) {
            this.poseEstimator.options.showPerformanceInfo = enabled;
        }
        
        // 控制status-display元素的显示和隐藏
        if (enabled) {
            uiManager.showStatus();
        } else {
            uiManager.hideStatus();
        }
        
        console.log(`📊 系统监控面板: ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 切换模型参数面板显示
     * @param {boolean} enabled - 是否启用
     */
    toggleModelPanel(enabled) {
        this.currentOptions.showModelPanel = enabled;
        
        // 控制model-panel元素的显示和隐藏
        if (enabled) {
            uiManager.showModelPanel();
            // 显示面板时更新状态
            uiManager.updateModelPanelState({
                modelType: this.currentOptions.modelType,
                showSkeleton: this.currentOptions.showSkeleton,
                showKeypoints: this.currentOptions.showKeypoints
            });
        } else {
            uiManager.hideModelPanel();
        }
        
        console.log(`🤖 模型参数面板: ${enabled ? '显示' : '隐藏'}`);
    }
    
    /**
     * 切换滤波器
     * @param {boolean} enabled - 是否启用
     */
    toggleFilter(enabled) {
        this.currentOptions.enableFilter = enabled;
        if (this.poseEstimator && this.poseEstimator.filterManager) {
            this.poseEstimator.filterManager.setEnabled(enabled);
            // 当禁用滤波器时，清理现有的滤波器实例以避免内存泄漏
            if (!enabled) {
                this.poseEstimator.filterManager.resetFilters();
            }
        }
        console.log(`🔧 滤波器: ${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 切换One Euro Filter参数面板显示
     * @param {boolean} enabled - 是否启用
     */
    toggleFilterPanel(enabled) {
        if (enabled) {
            uiManager.showFilterPanel();
            // 显示面板时更新参数显示
            if (this.poseEstimator && this.poseEstimator.filterManager) {
                const params = this.poseEstimator.filterManager.getParameters();
                uiManager.updateFilterPanelParams(params);
            }
        } else {
            uiManager.hideFilterPanel();
        }
        console.log(`⚙️ One Euro Filter参数面板: ${enabled ? '显示' : '隐藏'}`);
    }

    /**
     * 应用滤波器预设
     * @param {string} presetName - 预设名称
     */
    applyFilterPreset(presetName) {
        // 检查滤波器是否启用
        if (!this.currentOptions.enableFilter) {
            console.log(`⚠️ 滤波器未启用，忽略预设应用: ${presetName}`);
            return;
        }
        
        if (this.poseEstimator && this.poseEstimator.filterManager) {
            this.poseEstimator.filterManager.applyPreset(presetName);
            // 更新面板显示
            const params = this.poseEstimator.filterManager.getParameters();
            uiManager.updateFilterPanelParams(params);
            uiManager.showSuccess(`已应用预设: ${presetName}`);
        }
        console.log(`🎛️ 应用滤波器预设: ${presetName}`);
    }

    /**
     * 更新滤波器参数
     * @param {string} paramName - 参数名称
     * @param {number} value - 参数值
     */
    updateFilterParam(paramName, value) {
        // 检查滤波器是否启用
        if (!this.currentOptions.enableFilter) {
            console.log(`⚠️ 滤波器未启用，忽略参数更新: ${paramName}`);
            return;
        }
        
        if (this.poseEstimator && this.poseEstimator.filterManager) {
            const params = { [paramName]: value };
            this.poseEstimator.filterManager.updateParameters(params);
        }
        console.log(`🎛️ 更新滤波器参数 ${paramName}: ${value}`);
    }

    /**
     * 重置滤波器参数
     */
    resetFilterParams() {
        // 检查滤波器是否启用
        if (!this.currentOptions.enableFilter) {
            console.log('⚠️ 滤波器未启用，忽略重置操作');
            return;
        }
        
        if (this.poseEstimator && this.poseEstimator.filterManager) {
            this.poseEstimator.filterManager.resetToDefaults();
            // 更新面板显示
            const params = this.poseEstimator.filterManager.getParameters();
            uiManager.updateFilterPanelParams(params);
            uiManager.showSuccess('滤波器参数已重置为默认值');
        }
        console.log('🎛️ 重置滤波器参数');
    }

    /**
     * 应用滤波器配置
     */
    applyFilterConfig() {
        // 检查滤波器是否启用
        if (!this.currentOptions.enableFilter) {
            console.log('⚠️ 滤波器未启用，忽略应用配置操作');
            return;
        }
        
        if (this.poseEstimator && this.poseEstimator.filterManager) {
            // 获取当前面板中的参数
            const currentParams = this.poseEstimator.filterManager.getParameters();
            
            // 应用当前参数到滤波器（确保参数生效）
            this.poseEstimator.filterManager.updateParameters(currentParams);
            
            uiManager.showSuccess('滤波器配置已应用到实际参数中');
        }
        console.log('🎛️ 应用滤波器配置');
    }
    
    /**
     * 重启应用
     */
    async restart() {
        try {
            uiManager.showLoading('正在重启应用...', '重新初始化所有组件');
            
            // 清理当前实例
            if (this.poseEstimator) {
                await this.poseEstimator.cleanup();
                this.poseEstimator = null;
            }
            
            // 重新创建和启动
            this.createPoseEstimator();
            await this.poseEstimator.start();
            
            uiManager.hideLoading();
            uiManager.showSuccess('应用重启成功！');
            
        } catch (error) {
            uiManager.hideLoading();
            uiManager.showError(`重启失败: ${error.message}`);
            console.error('❌ 重启失败:', error);
        }
    }
    
    /**
     * 清空缓存
     */
    async clearCache() {
        try {
            uiManager.showLoading('正在清空缓存...', '删除所有缓存数据');
            
            await modelCacheManager.clearAll();
            
            // 清理TensorFlow内存
            PerformanceOptimizer.cleanupTensorFlowMemory();
            
            uiManager.hideLoading();
            uiManager.showSuccess('缓存清空成功！');
            
        } catch (error) {
            uiManager.hideLoading();
            uiManager.showError(`清空缓存失败: ${error.message}`);
            console.error('❌ 清空缓存失败:', error);
        }
    }
    
    /**
     * 暂停/继续检测
     */
    async togglePause() {
        if (!this.poseEstimator) return;
        
        try {
            if (this.poseEstimator.isRunning) {
                await this.poseEstimator.stop();
                uiManager.showSuccess('检测已暂停');
            } else {
                await this.poseEstimator.start();
                uiManager.showSuccess('检测已继续');
            }
        } catch (error) {
            uiManager.showError(`操作失败: ${error.message}`);
            console.error('❌ 暂停/继续操作失败:', error);
        }
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
        
        if (this.poseEstimator) {
            await this.poseEstimator.cleanup();
            this.poseEstimator = null;
        }
        
        uiManager.cleanup();
        
        this.isInitialized = false;
        
        console.log('✅ 应用资源清理完成');
    }
    
    /**
     * 获取应用状态
     * @returns {Object} 应用状态信息
     */
    getAppStatus() {
        return {
            isInitialized: this.isInitialized,
            currentOptions: this.currentOptions,
            poseEstimator: this.poseEstimator?.getStatus(),
            ui: uiManager.getUIState(),
            performance: performanceMonitor.getReport(),
            cache: modelCacheManager.getStats()
        };
    }
}

/**
 * 主函数 - 应用入口点
 */
async function main() {
    try {
        console.log('🌟 启动姿态估计应用...');
        
        // 初始化全局错误处理
        GlobalErrorHandler.init();
        
        // 优化TensorFlow.js性能
        await PerformanceOptimizer.optimizeTensorFlow();
        
        // 创建应用实例
        const app = new PoseEstimationApp();
        
        // 将应用实例挂载到全局，便于调试
        window.poseApp = app;
        
        // 初始化应用
        await app.init();
        
        // 页面卸载时清理资源
        window.addEventListener('beforeunload', async () => {
            await app.cleanup();
        });
        
        console.log('🎉 姿态估计应用启动成功！');
        
    } catch (error) {
        console.error('💥 应用启动失败:', error);
        
        // 显示启动失败的错误信息
        if (typeof uiManager !== 'undefined') {
            uiManager.init();
            uiManager.hideLoading();
            uiManager.showError(
                `应用启动失败: ${error.message}<br><br>请检查控制台获取详细错误信息`,
                0
            );
        }
    }
}

// 等待DOM加载完成后启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// 导出主要类和函数，便于测试和扩展
export { PoseEstimationApp, main };