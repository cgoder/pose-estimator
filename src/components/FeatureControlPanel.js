/**
 * 功能控制面板
 * 提供TensorFlow、Filter等功能的手动开关控制
 */

import { eventBus } from '../utils/EventBus.js';
import { configManager } from '../utils/ConfigManager.js';

export class FeatureControlPanel {
    constructor() {
        this.panel = null;
        this.controls = {};
        this.appManager = null;
    }

    /**
     * 初始化功能控制面板
     */
    async init(appManager) {
        console.log('🎛️ 初始化功能控制面板...');
        
        this.appManager = appManager;
        this._createPanel();
        this._bindEvents();
        this._updateControlStates();
        
        // 默认启动摄像头
        await this._initializeDefaultInputSource();
        
        console.log('✅ 功能控制面板初始化完成');
    }

    /**
     * 创建控制面板UI
     */
    _createPanel() {
        // 创建面板容器
        this.panel = document.createElement('div');
        this.panel.id = 'feature-control-panel';
        this.panel.className = 'feature-control-panel';
        
        this.panel.innerHTML = `
            <div class="panel-header">
                <h3>功能控制</h3>
                <button class="panel-toggle" title="展开/收起">
                    <span class="toggle-icon">▼</span>
                </button>
            </div>
            <div class="panel-content">
                <div class="control-section">
                    <h4>输入源</h4>
                    <div class="input-controls">
                        <button class="btn btn-camera" data-action="camera">
                            📷 摄像头
                        </button>
                        <input type="file" id="image-input" accept="image/*" style="display: none;">
                        <button class="btn btn-image" data-action="image">
                            🖼️ 图片
                        </button>
                        <input type="file" id="video-input" accept="video/*" style="display: none;">
                        <button class="btn btn-video" data-action="video">
                            🎬 视频
                        </button>
                    </div>
                </div>
                
                <div class="control-section">
                    <h4>AI功能</h4>
                    <div class="feature-controls">
                        <div class="feature-control">
                            <label class="switch">
                                <input type="checkbox" id="tensorflow-toggle">
                                <span class="slider"></span>
                            </label>
                            <span class="feature-label">TensorFlow</span>
                            <span class="feature-status" id="tensorflow-status">未加载</span>
                        </div>
                        
                        <div class="feature-control">
                            <label class="switch">
                                <input type="checkbox" id="filter-toggle">
                                <span class="slider"></span>
                            </label>
                            <span class="feature-label">滤波器</span>
                            <span class="feature-status" id="filter-status">未加载</span>
                        </div>
                    </div>
                </div>
                
                <div class="control-section">
                    <h4>系统状态</h4>
                    <div class="status-info">
                        <div class="status-item">
                            <span class="status-label">输入源:</span>
                            <span class="status-value" id="input-source-status">无</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">内存使用:</span>
                            <span class="status-value" id="memory-status">-</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this._addStyles();
        
        // 添加到页面
        document.body.appendChild(this.panel);
        
        // 获取控制元素引用
        this.controls = {
            tensorflowToggle: document.getElementById('tensorflow-toggle'),
            filterToggle: document.getElementById('filter-toggle'),
            tensorflowStatus: document.getElementById('tensorflow-status'),
            filterStatus: document.getElementById('filter-status'),
            inputSourceStatus: document.getElementById('input-source-status'),
            memoryStatus: document.getElementById('memory-status'),
            panelToggle: this.panel.querySelector('.panel-toggle'),
            panelContent: this.panel.querySelector('.panel-content'),
            imageInput: document.getElementById('image-input'),
            videoInput: document.getElementById('video-input')
        };
    }

    /**
     * 添加样式
     */
    _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .feature-control-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 1000;
                backdrop-filter: blur(10px);
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                border-radius: 8px 8px 0 0;
            }
            
            .panel-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            
            .panel-toggle {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .panel-toggle:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .toggle-icon {
                font-size: 12px;
                transition: transform 0.2s;
            }
            
            .panel-content {
                padding: 16px;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .panel-content.collapsed {
                display: none;
            }
            
            .control-section {
                margin-bottom: 20px;
            }
            
            .control-section:last-child {
                margin-bottom: 0;
            }
            
            .control-section h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #555;
                border-bottom: 1px solid #eee;
                padding-bottom: 4px;
            }
            
            .input-controls {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                flex: 1;
                min-width: 80px;
            }
            
            .btn:hover {
                background: #f8f9fa;
                border-color: #007bff;
            }
            
            .btn.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .feature-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .feature-control {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
            }
            
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 24px;
            }
            
            .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .slider {
                background-color: #007bff;
            }
            
            input:checked + .slider:before {
                transform: translateX(20px);
            }
            
            .feature-label {
                font-weight: 500;
                flex: 1;
            }
            
            .feature-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 12px;
                background: #e9ecef;
                color: #6c757d;
            }
            
            .feature-status.loaded {
                background: #d4edda;
                color: #155724;
            }
            
            .feature-status.loading {
                background: #fff3cd;
                color: #856404;
            }
            
            .feature-status.error {
                background: #f8d7da;
                color: #721c24;
            }
            
            .status-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .status-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 8px;
                background: #f8f9fa;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .status-label {
                font-weight: 500;
                color: #666;
            }
            
            .status-value {
                color: #333;
                font-family: monospace;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 面板展开/收起
        this.controls.panelToggle.addEventListener('click', () => {
            const content = this.controls.panelContent;
            const icon = this.controls.panelToggle.querySelector('.toggle-icon');
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                icon.textContent = '▼';
            } else {
                content.classList.add('collapsed');
                icon.textContent = '▶';
            }
        });
        
        // TensorFlow开关
        this.controls.tensorflowToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            this._setFeatureStatus('tensorflow', 'loading');
            
            try {
                if (enabled) {
                    // 首先预加载TensorFlow库
                    console.log('🤖 用户启用AI功能，开始加载TensorFlow...');
                    await this._loadTensorFlowLibraries();
                    
                    // 然后加载TensorFlow服务
                    await this.appManager.loadTensorFlow();
                    configManager.enableFeature('tensorflow');
                    
                    console.log('✅ TensorFlow功能已启用');
                } else {
                    await this.appManager.unloadTensorFlow();
                    configManager.disableFeature('tensorflow');
                    
                    console.log('🔄 TensorFlow功能已禁用');
                }
            } catch (error) {
                console.error('❌ TensorFlow开关失败:', error);
                e.target.checked = !enabled; // 恢复开关状态
                this._setFeatureStatus('tensorflow', 'error');
                alert('TensorFlow功能切换失败: ' + error.message);
            }
        });
        
        // Filter开关
        this.controls.filterToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            this._setFeatureStatus('filter', 'loading');
            
            try {
                if (enabled) {
                    if (!this.appManager.managers.tensorflow) {
                        throw new Error('请先启用TensorFlow');
                    }
                    await this.appManager.loadFilter();
                    configManager.enableFeature('filter');
                } else {
                    await this.appManager.unloadFilter();
                    configManager.disableFeature('filter');
                }
            } catch (error) {
                console.error('Filter开关失败:', error);
                e.target.checked = !enabled; // 恢复开关状态
                this._setFeatureStatus('filter', 'error');
                alert(error.message);
            }
        });
        
        // 输入源控制
        this.panel.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            
            try {
                switch (action) {
                    case 'camera':
                        await this.appManager.managers.inputSource.startCamera();
                        this._updateInputButtons('camera');
                        break;
                    case 'image':
                        this.controls.imageInput.click();
                        break;
                    case 'video':
                        this.controls.videoInput.click();
                        break;
                }
            } catch (error) {
                console.error('输入源切换失败:', error);
                alert(error.message);
            }
        });
        
        // 文件输入
        this.controls.imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.appManager.managers.inputSource.loadImage(file);
                    this._updateInputButtons('image');
                } catch (error) {
                    console.error('图片加载失败:', error);
                    alert(error.message);
                }
            }
        });
        
        this.controls.videoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.appManager.managers.inputSource.loadVideo(file);
                    await this.appManager.managers.inputSource.playVideo();
                    this._updateInputButtons('video');
                } catch (error) {
                    console.error('视频加载失败:', error);
                    alert(error.message);
                }
            }
        });
        
        // 监听功能状态变化
        eventBus.on('tensorflow:loaded', () => {
            this._setFeatureStatus('tensorflow', 'loaded');
        });
        
        eventBus.on('tensorflow:unloaded', () => {
            this._setFeatureStatus('tensorflow', 'unloaded');
        });
        
        eventBus.on('tensorflow:error', () => {
            this._setFeatureStatus('tensorflow', 'error');
        });
        
        eventBus.on('filter:loaded', () => {
            this._setFeatureStatus('filter', 'loaded');
        });
        
        eventBus.on('filter:unloaded', () => {
            this._setFeatureStatus('filter', 'unloaded');
        });
        
        eventBus.on('filter:error', () => {
            this._setFeatureStatus('filter', 'error');
        });
        
        // 监听输入源变化
        eventBus.on('input:camera:started', () => {
            this._updateInputSourceStatus('摄像头');
        });
        
        eventBus.on('input:image:loaded', () => {
            this._updateInputSourceStatus('图片');
        });
        
        eventBus.on('input:video:loaded', () => {
            this._updateInputSourceStatus('视频');
        });
        
        eventBus.on('input:stopped', () => {
            this._updateInputSourceStatus('无');
            this._updateInputButtons(null);
        });
        
        // 定期更新内存状态
        setInterval(() => {
            this._updateMemoryStatus();
        }, 2000);
    }

    /**
     * 更新控制状态
     */
    _updateControlStates() {
        // 更新功能开关状态
        this.controls.tensorflowToggle.checked = configManager.isFeatureEnabled('tensorflow');
        this.controls.filterToggle.checked = configManager.isFeatureEnabled('filter');
        
        // 更新功能状态显示
        this._setFeatureStatus('tensorflow', this.appManager.managers.tensorflow ? 'loaded' : 'unloaded');
        this._setFeatureStatus('filter', this.appManager.managers.filter ? 'loaded' : 'unloaded');
    }

    /**
     * 设置功能状态
     */
    _setFeatureStatus(feature, status) {
        const statusElement = this.controls[`${feature}Status`];
        if (!statusElement) return;
        
        statusElement.className = `feature-status ${status}`;
        
        switch (status) {
            case 'loaded':
                statusElement.textContent = '已加载';
                break;
            case 'loading':
                statusElement.textContent = '加载中...';
                break;
            case 'unloaded':
                statusElement.textContent = '未加载';
                break;
            case 'error':
                statusElement.textContent = '错误';
                break;
        }
    }

    /**
     * 更新输入源状态
     */
    _updateInputSourceStatus(source) {
        this.controls.inputSourceStatus.textContent = source;
    }

    /**
     * 更新输入按钮状态
     */
    _updateInputButtons(activeType) {
        const buttons = this.panel.querySelectorAll('.input-controls .btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.action === activeType) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * 更新内存状态
     */
    _updateMemoryStatus() {
        if (performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            this.controls.memoryStatus.textContent = `${used}/${total} MB`;
        } else {
            this.controls.memoryStatus.textContent = '不支持';
        }
    }

    /**
     * 初始化默认输入源（摄像头）
     */
    async _initializeDefaultInputSource() {
        try {
            console.log('📷 初始化默认输入源（摄像头）...');
            
            // 启动摄像头
            await this.appManager.managers.inputSource.startCamera();
            
            // 更新按钮状态为选中摄像头
            this._updateInputButtons('camera');
            
            console.log('✅ 默认输入源（摄像头）初始化完成');
        } catch (error) {
            console.warn('⚠️ 默认摄像头启动失败:', error.message);
            // 不抛出错误，允许应用继续运行
        }
    }

    /**
     * 加载TensorFlow.js库
     * @returns {Promise<void>}
     */
    async _loadTensorFlowLibraries() {
        let loadingManager = null;
        
        try {
            console.log('📦 预加载TensorFlow.js库...');
            
            // 动态导入LoadingManager
            const { LoadingManager } = await import('../ui/LoadingManager.js');
            
            // 初始化加载管理器
            loadingManager = new LoadingManager();
            await loadingManager.init();
            loadingManager.showLoading('正在初始化AI模型...', { progress: '0%' });
            
            // 动态导入TensorFlowProvider
            const { TensorFlowProvider } = await import('../ai/models/TensorFlowProvider.js');
            
            // 使用单例实例进行预加载（避免重复初始化）
            const provider = TensorFlowProvider.getInstance();
            
            // 设置进度回调
            if (typeof provider.setProgressCallback === 'function') {
                provider.setProgressCallback((progress, message, stage) => {
                    if (loadingManager) {
                        loadingManager.updateProgress(progress, message);
                        console.log(`📊 加载进度: ${progress}% - ${message}`);
                    }
                });
            }
            
            // 初始化TensorFlow环境（只会初始化一次）
            loadingManager.updateProgress(10, '正在加载TensorFlow.js核心模块...');
            await provider.initialize();
            
            // 预加载PoseDetection库
            loadingManager.updateProgress(70, '正在加载PoseDetection库...');
            console.log('📦 预加载PoseDetection库...');
            await provider.loadPoseDetection();
            
            // 完成加载
            if (loadingManager) {
                loadingManager.updateProgress(100, '加载完成');
                await new Promise(resolve => setTimeout(resolve, 800)); // 短暂显示完成状态
                loadingManager.hideLoading();
            }
            
            console.log('✅ TensorFlow.js库预加载完成');
            
        } catch (error) {
            console.error('❌ TensorFlow.js库预加载失败:', error);
            
            // 显示错误状态
            if (loadingManager) {
                loadingManager.updateProgress(0, '加载失败: ' + error.message);
                await new Promise(resolve => setTimeout(resolve, 3000)); // 显示错误信息3秒
                loadingManager.hideLoading();
            }
            
            throw new Error(`TensorFlow.js库预加载失败: ${error.message}`);
        }
    }

    /**
     * 显示面板
     */
    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
        }
    }

    /**
     * 隐藏面板
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    /**
     * 销毁面板
     */
    destroy() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
        this.controls = {};
        this.appManager = null;
    }
}

// 创建全局实例
export const featureControlPanel = new FeatureControlPanel();