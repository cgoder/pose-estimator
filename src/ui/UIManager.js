/**
 * UI管理器
 * 负责用户界面的更新、交互和状态管理
 */

import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

export class UIManager {
    constructor() {
        this.logger = new Logger('UIManager');
        this.eventBus = new EventBus();
        
        // UI元素引用
        this.elements = {
            // 主要容器
            app: null,
            loadingScreen: null,
            videoContainer: null,
            canvas: null,
            video: null,
            
            // 控制面板
            controlPanel: null,
            modelSelect: null,
            confidenceSlider: null,
            
            // 侧边面板
            sidePanel: null,
            biomechanicsPanel: null,
            trajectoryPanel: null,
            performancePanel: null,
            
            // 底部面板
            bottomPanel: null,
            filterPanel: null,
            exportPanel: null,
            
            // 状态显示
            statusIndicator: null,
            performanceInfo: null,
            fpsCounter: null,
            
            // 模态框
            errorModal: null,
            helpModal: null,
            settingsModal: null,
            
            // Toast通知
            toastContainer: null,
            
            // 按钮
            toggleSkeletonBtn: null,
            toggleKeypointsBtn: null,
            toggleFilterBtn: null,
            exportBtn: null,
            helpBtn: null,
            settingsBtn: null,
            cameraSwitchBtn: null
        };
        
        // UI状态
        this.state = {
            isLoading: true,
            showSkeleton: true,
            showKeypoints: true,
            filterEnabled: true,
            currentModel: 'MoveNet',
            confidence: 0.3,
            panelStates: {
                biomechanics: false,
                trajectory: false,
                performance: false,
                filter: false,
                export: false
            }
        };
        
        // Toast队列
        this.toastQueue = [];
        this.maxToasts = 5;
        
        this.logger.info('UI管理器已创建');
    }
    
    /**
     * 初始化UI管理器
     */
    async initialize() {
        try {
            this.logger.info('开始初始化UI管理器...');
            
            // 获取UI元素引用
            this.getElementReferences();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 初始化组件
            this.initializeComponents();
            
            // 设置键盘快捷键
            this.setupKeyboardShortcuts();
            
            // 隐藏加载屏幕
            this.hideLoadingScreen();
            
            this.logger.info('UI管理器初始化完成');
            
        } catch (error) {
            this.logger.error('UI管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取UI元素引用
     */
    getElementReferences() {
        const elementIds = {
            app: 'app',
            loadingScreen: 'loading-screen',
            videoContainer: 'video-container',
            canvas: 'pose-canvas',
            video: 'video',
            controlPanel: 'control-panel',
            modelSelect: 'model-select',
            confidenceSlider: 'confidence-slider',
            sidePanel: 'side-panel',
            biomechanicsPanel: 'biomechanics-panel',
            trajectoryPanel: 'trajectory-panel',
            performancePanel: 'performance-panel',
            bottomPanel: 'bottom-panel',
            filterPanel: 'filter-panel',
            exportPanel: 'export-panel',
            statusIndicator: 'status-indicator',
            performanceInfo: 'performance-info',
            fpsCounter: 'fps-counter',
            errorModal: 'error-modal',
            helpModal: 'help-modal',
            settingsModal: 'settings-modal',
            toastContainer: 'toast-container',
            toggleSkeletonBtn: 'toggle-skeleton',
            toggleKeypointsBtn: 'toggle-keypoints',
            toggleFilterBtn: 'toggle-filter',
            exportBtn: 'export-btn',
            helpBtn: 'help-btn',
            settingsBtn: 'settings-btn',
            cameraSwitchBtn: 'camera-switch'
        };
        
        Object.keys(elementIds).forEach(key => {
            const element = document.getElementById(elementIds[key]);
            if (element) {
                this.elements[key] = element;
            } else {
                this.logger.warn(`UI元素未找到: ${elementIds[key]}`);
            }
        });
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 模型选择
        if (this.elements.modelSelect) {
            this.elements.modelSelect.addEventListener('change', (e) => {
                this.handleModelChange(e.target.value);
            });
        }
        
        // 置信度滑块
        if (this.elements.confidenceSlider) {
            this.elements.confidenceSlider.addEventListener('input', (e) => {
                this.handleConfidenceChange(parseFloat(e.target.value));
            });
        }
        
        // 切换按钮
        if (this.elements.toggleSkeletonBtn) {
            this.elements.toggleSkeletonBtn.addEventListener('click', () => {
                this.toggleSkeleton();
            });
        }
        
        if (this.elements.toggleKeypointsBtn) {
            this.elements.toggleKeypointsBtn.addEventListener('click', () => {
                this.toggleKeypoints();
            });
        }
        
        if (this.elements.toggleFilterBtn) {
            this.elements.toggleFilterBtn.addEventListener('click', () => {
                this.toggleFilter();
            });
        }
        
        // 导出按钮
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => {
                this.handleExport();
            });
        }
        
        // 帮助按钮
        if (this.elements.helpBtn) {
            this.elements.helpBtn.addEventListener('click', () => {
                this.showHelpModal();
            });
        }
        
        // 设置按钮
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
        }
        
        // 摄像头切换按钮
        if (this.elements.cameraSwitchBtn) {
            this.elements.cameraSwitchBtn.addEventListener('click', () => {
                this.handleCameraSwitch();
            });
        }
        
        // 模态框关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    /**
     * 初始化组件
     */
    initializeComponents() {
        // 初始化滑块值显示
        this.updateConfidenceDisplay();
        
        // 初始化按钮状态
        this.updateButtonStates();
        
        // 初始化面板状态
        this.updatePanelStates();
        
        // 创建Toast容器
        this.createToastContainer();
    }
    
    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 防止在输入框中触发快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    this.toggleSkeleton();
                    break;
                case 'k':
                    e.preventDefault();
                    this.toggleKeypoints();
                    break;
                case 'f':
                    e.preventDefault();
                    this.toggleFilter();
                    break;
                case 'h':
                    e.preventDefault();
                    this.showHelpModal();
                    break;
                case 'e':
                    e.preventDefault();
                    this.handleExport();
                    break;
                case 'c':
                    e.preventDefault();
                    this.handleCameraSwitch();
                    break;
                case '1':
                case '2':
                case '3':
                    e.preventDefault();
                    const modelIndex = parseInt(e.key) - 1;
                    const models = ['MoveNet', 'PoseNet', 'BlazePose'];
                    if (models[modelIndex]) {
                        this.handleModelChange(models[modelIndex]);
                    }
                    break;
            }
        });
    }
    
    /**
     * 显示加载屏幕
     */
    showLoadingScreen(message = '加载中...') {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
            const messageEl = this.elements.loadingScreen.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
        this.state.isLoading = true;
    }
    
    /**
     * 隐藏加载屏幕
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
        this.state.isLoading = false;
    }
    
    /**
     * 更新加载进度
     */
    updateLoadingProgress(progress, message = '') {
        if (this.elements.loadingScreen) {
            const progressBar = this.elements.loadingScreen.querySelector('.progress-bar');
            const messageEl = this.elements.loadingScreen.querySelector('.loading-message');
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            if (messageEl && message) {
                messageEl.textContent = message;
            }
        }
    }
    
    /**
     * 更新状态指示器
     */
    updateStatus(status) {
        if (this.elements.statusIndicator) {
            const { isInitialized, isDetecting, modelType, frameCount } = status;
            
            let statusText = '';
            let statusClass = '';
            
            if (!isInitialized) {
                statusText = '初始化中...';
                statusClass = 'status-warning';
            } else if (isDetecting) {
                statusText = `检测中 (${modelType}) - 帧数: ${frameCount}`;
                statusClass = 'status-active';
            } else {
                statusText = '已就绪';
                statusClass = 'status-ready';
            }
            
            this.elements.statusIndicator.textContent = statusText;
            this.elements.statusIndicator.className = `status-indicator ${statusClass}`;
        }
    }
    
    /**
     * 更新性能信息
     */
    updatePerformanceInfo(metrics) {
        if (this.elements.performanceInfo) {
            const { currentFPS, currentLatency, averageConfidence, memoryUsage } = metrics;
            
            let html = `
                <div class="metric">
                    <span class="label">FPS:</span>
                    <span class="value">${currentFPS.toFixed(1)}</span>
                </div>
                <div class="metric">
                    <span class="label">延迟:</span>
                    <span class="value">${currentLatency.toFixed(1)}ms</span>
                </div>
                <div class="metric">
                    <span class="label">置信度:</span>
                    <span class="value">${(averageConfidence * 100).toFixed(1)}%</span>
                </div>
            `;
            
            if (memoryUsage) {
                html += `
                    <div class="metric">
                        <span class="label">内存:</span>
                        <span class="value">${memoryUsage.used}MB</span>
                    </div>
                `;
            }
            
            this.elements.performanceInfo.innerHTML = html;
        }
        
        // 更新FPS计数器
        if (this.elements.fpsCounter) {
            this.elements.fpsCounter.textContent = `${metrics.currentFPS.toFixed(1)} FPS`;
        }
    }
    
    /**
     * 处理模型变更
     */
    handleModelChange(modelType) {
        this.state.currentModel = modelType;
        this.eventBus.emit('ui:modelChange', { modelType });
        this.showSuccess(`已切换到 ${modelType} 模型`);
    }
    
    /**
     * 处理置信度变更
     */
    handleConfidenceChange(confidence) {
        this.state.confidence = confidence;
        this.updateConfidenceDisplay();
        this.eventBus.emit('ui:confidenceChange', { confidence });
    }
    
    /**
     * 更新置信度显示
     */
    updateConfidenceDisplay() {
        const display = document.querySelector('.confidence-value');
        if (display) {
            display.textContent = (this.state.confidence * 100).toFixed(0) + '%';
        }
    }
    
    /**
     * 切换骨架显示
     */
    toggleSkeleton() {
        this.state.showSkeleton = !this.state.showSkeleton;
        this.updateButtonStates();
        this.eventBus.emit('ui:toggleSkeleton', { enabled: this.state.showSkeleton });
        this.showInfo(`骨架显示${this.state.showSkeleton ? '已启用' : '已禁用'}`);
    }
    
    /**
     * 切换关键点显示
     */
    toggleKeypoints() {
        this.state.showKeypoints = !this.state.showKeypoints;
        this.updateButtonStates();
        this.eventBus.emit('ui:toggleKeypoints', { enabled: this.state.showKeypoints });
        this.showInfo(`关键点显示${this.state.showKeypoints ? '已启用' : '已禁用'}`);
    }
    
    /**
     * 切换滤波器
     */
    toggleFilter() {
        this.state.filterEnabled = !this.state.filterEnabled;
        this.updateButtonStates();
        this.eventBus.emit('ui:toggleFilter', { enabled: this.state.filterEnabled });
        this.showInfo(`滤波器${this.state.filterEnabled ? '已启用' : '已禁用'}`);
    }
    
    /**
     * 更新按钮状态
     */
    updateButtonStates() {
        if (this.elements.toggleSkeletonBtn) {
            this.elements.toggleSkeletonBtn.classList.toggle('active', this.state.showSkeleton);
        }
        
        if (this.elements.toggleKeypointsBtn) {
            this.elements.toggleKeypointsBtn.classList.toggle('active', this.state.showKeypoints);
        }
        
        if (this.elements.toggleFilterBtn) {
            this.elements.toggleFilterBtn.classList.toggle('active', this.state.filterEnabled);
        }
    }
    
    /**
     * 更新面板状态
     */
    updatePanelStates() {
        Object.keys(this.state.panelStates).forEach(panelName => {
            const panel = this.elements[`${panelName}Panel`];
            if (panel) {
                panel.style.display = this.state.panelStates[panelName] ? 'block' : 'none';
            }
        });
    }
    
    /**
     * 切换面板显示
     */
    togglePanel(panelName) {
        this.state.panelStates[panelName] = !this.state.panelStates[panelName];
        this.updatePanelStates();
        this.eventBus.emit('ui:panelToggle', { panel: panelName, visible: this.state.panelStates[panelName] });
    }
    
    /**
     * 处理导出
     */
    handleExport() {
        this.eventBus.emit('ui:export');
        this.showInfo('开始导出数据...');
    }
    
    /**
     * 处理摄像头切换
     */
    handleCameraSwitch() {
        this.eventBus.emit('ui:cameraSwitch');
        this.showInfo('切换摄像头...');
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message, duration = 3000) {
        this.showToast(message, 'success', duration);
    }
    
    /**
     * 显示信息消息
     */
    showInfo(message, duration = 3000) {
        this.showToast(message, 'info', duration);
    }
    
    /**
     * 显示警告消息
     */
    showWarning(message, duration = 5000) {
        this.showToast(message, 'warning', duration);
    }
    
    /**
     * 显示错误消息
     */
    showError(message, duration = 0) {
        this.showToast(message, 'error', duration);
    }
    
    /**
     * 显示Toast通知
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration,
            timestamp: Date.now()
        };
        
        this.toastQueue.push(toast);
        
        // 限制Toast数量
        if (this.toastQueue.length > this.maxToasts) {
            this.toastQueue.shift();
        }
        
        this.renderToasts();
        
        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast.id);
            }, duration);
        }
    }
    
    /**
     * 移除Toast
     */
    removeToast(id) {
        this.toastQueue = this.toastQueue.filter(toast => toast.id !== id);
        this.renderToasts();
    }
    
    /**
     * 渲染Toast通知
     */
    renderToasts() {
        if (!this.elements.toastContainer) {
            this.createToastContainer();
        }
        
        const html = this.toastQueue.map(toast => `
            <div class="toast toast-${toast.type}" data-id="${toast.id}">
                <div class="toast-content">
                    <span class="toast-message">${toast.message}</span>
                    <button class="toast-close" onclick="uiManager.removeToast(${toast.id})">&times;</button>
                </div>
            </div>
        `).join('');
        
        this.elements.toastContainer.innerHTML = html;
    }
    
    /**
     * 创建Toast容器
     */
    createToastContainer() {
        if (!this.elements.toastContainer) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            this.elements.toastContainer = container;
        }
    }
    
    /**
     * 显示帮助模态框
     */
    showHelpModal() {
        if (this.elements.helpModal) {
            this.elements.helpModal.style.display = 'flex';
        }
    }
    
    /**
     * 显示设置模态框
     */
    showSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = 'flex';
        }
    }
    
    /**
     * 关闭模态框
     */
    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * 关闭所有模态框
     */
    closeAllModals() {
        ['errorModal', 'helpModal', 'settingsModal'].forEach(modalName => {
            if (this.elements[modalName]) {
                this.elements[modalName].style.display = 'none';
            }
        });
    }
    
    /**
     * 获取UI状态
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 设置UI状态
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateButtonStates();
        this.updatePanelStates();
        this.updateConfidenceDisplay();
    }
    
    /**
     * 清理资源
     */
    dispose() {
        // 清除所有事件监听器
        this.eventBus.removeAllListeners();
        
        // 清空Toast队列
        this.toastQueue = [];
        
        this.logger.info('UI管理器资源已清理');
    }
}

// 创建全局实例
export const uiManager = new UIManager();
export default UIManager;