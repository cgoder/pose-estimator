import { poseApp } from '../core/PoseEstimationApp.js';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
/**
 * 重构后的UI控制器
 * 负责UI交互和应用控制
 */
export class UIController {
    constructor(containerId = 'app') {
        this.statusPanel = null;
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`找不到容器元素: ${containerId}`);
        }
        this.container = container;
        this.setupEventListeners();
        this.createUI();
        console.log('🎮 UI控制器已创建');
    }
    /**
     * 创建UI界面
     */
    createUI() {
        this.container.innerHTML = `
      <div class="pose-app">
        <header class="app-header">
          <h1>🏃‍♂️ 健身姿态分析系统 (重构版)</h1>
          <div id="status-panel" class="status-panel">
            <span class="status-indicator">🔴 未初始化</span>
          </div>
        </header>
        
        <main class="app-main">
          <div class="canvas-container">
            <canvas id="pose-canvas" width="640" height="480"></canvas>
            <div class="canvas-overlay">
              <div id="loading" class="loading hidden">
                <div class="spinner"></div>
                <p>加载中...</p>
              </div>
            </div>
          </div>
          
          <aside class="control-sidebar">
            <div id="control-panel" class="control-panel">
              <div class="panel-section">
                <h3>📡 数据源</h3>
                <div class="button-group">
                  <button id="btn-camera" class="btn btn-primary">📷 摄像头</button>
                  <button id="btn-video" class="btn btn-secondary">🎥 视频文件</button>
                  <button id="btn-images" class="btn btn-secondary">🖼️ 图像序列</button>
                </div>
                <input type="file" id="file-input" accept="video/*,image/*" multiple style="display: none;">
              </div>
              
              <div class="panel-section">
                <h3>🤖 AI模型</h3>
                <div class="button-group">
                  <button id="btn-movenet" class="btn btn-outline">MoveNet</button>
                  <button id="btn-posenet" class="btn btn-outline">PoseNet</button>
                  <button id="btn-blazepose" class="btn btn-outline">BlazePose</button>
                </div>
              </div>
              
              <div class="panel-section">
                <h3>🎮 控制</h3>
                <div class="button-group">
                  <button id="btn-start" class="btn btn-success" disabled>▶️ 开始</button>
                  <button id="btn-stop" class="btn btn-danger" disabled>⏹️ 停止</button>
                  <button id="btn-restart" class="btn btn-warning" disabled>🔄 重启</button>
                </div>
              </div>
              
              <div class="panel-section">
                <h3>📊 状态信息</h3>
                <div id="app-status" class="status-info">
                  <p>应用状态: <span id="app-state">未初始化</span></p>
                  <p>数据源: <span id="data-source">无</span></p>
                  <p>模型: <span id="current-model">未选择</span></p>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    `;
        this.statusPanel = document.getElementById('status-panel');
        this.bindUIEvents();
        this.addStyles();
    }
    /**
     * 绑定UI事件
     */
    bindUIEvents() {
        // 数据源按钮
        document.getElementById('btn-camera')?.addEventListener('click', () => {
            this.handleDataSourceSelection('camera');
        });
        document.getElementById('btn-video')?.addEventListener('click', () => {
            this.handleFileSelection('video');
        });
        document.getElementById('btn-images')?.addEventListener('click', () => {
            this.handleFileSelection('images');
        });
        // 文件输入
        document.getElementById('file-input')?.addEventListener('change', (e) => {
            this.handleFileInputChange(e);
        });
        // 模型选择按钮
        document.getElementById('btn-movenet')?.addEventListener('click', () => {
            this.handleModelSelection('movenet');
        });
        document.getElementById('btn-posenet')?.addEventListener('click', () => {
            this.handleModelSelection('posenet');
        });
        document.getElementById('btn-blazepose')?.addEventListener('click', () => {
            this.handleModelSelection('blazepose');
        });
        // 控制按钮
        document.getElementById('btn-start')?.addEventListener('click', () => {
            this.handleStart();
        });
        document.getElementById('btn-stop')?.addEventListener('click', () => {
            this.handleStop();
        });
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.handleRestart();
        });
    }
    /**
     * 设置应用事件监听器
     */
    setupEventListeners() {
        // 监听应用事件
        eventBus.on('app:initialized', () => {
            this.updateStatus('✅ 已初始化');
            this.updateAppState('已初始化');
        });
        eventBus.on('app:started', () => {
            this.updateStatus('🟢 运行中');
            this.updateAppState('运行中');
            this.updateControlButtons(true);
        });
        eventBus.on('app:stopped', () => {
            this.updateStatus('🟡 已停止');
            this.updateAppState('已停止');
            this.updateControlButtons(false);
        });
        eventBus.on('app:error', (error) => {
            this.updateStatus('🔴 错误');
            this.showError(error.message || '未知错误');
        });
        eventBus.on('app:dataSourceChanged', (type) => {
            this.updateDataSource(type);
            this.enableStartButton();
        });
        eventBus.on('app:modelChanged', (modelType) => {
            this.updateCurrentModel(modelType);
        });
        // 监听状态变更
        stateManager.subscribe((state) => {
            this.updateUIFromState(state);
        });
    }
    /**
     * 处理数据源选择
     */
    async handleDataSourceSelection(type) {
        try {
            this.showLoading('设置摄像头...');
            await poseApp.setDataSource(type);
            this.hideLoading();
        }
        catch (error) {
            this.hideLoading();
            const message = error instanceof Error ? error.message : '未知错误';
            this.showError(`设置摄像头失败: ${message}`);
        }
    }
    /**
     * 处理文件选择
     */
    handleFileSelection(type) {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.setAttribute('data-type', type);
            if (type === 'video') {
                fileInput.accept = 'video/*';
                fileInput.multiple = false;
            }
            else {
                fileInput.accept = 'image/*';
                fileInput.multiple = true;
            }
            fileInput.click();
        }
    }
    /**
     * 处理文件输入变更
     */
    async handleFileInputChange(event) {
        const input = event.target;
        const files = input.files;
        const type = input.getAttribute('data-type');
        if (!files || files.length === 0)
            return;
        try {
            if (type === 'video') {
                this.showLoading('加载视频文件...');
                await poseApp.setDataSource('videoFile', { file: files[0] });
            }
            else if (type === 'images') {
                this.showLoading('加载图像序列...');
                await poseApp.setDataSource('imageFile', { files: Array.from(files) });
            }
            this.hideLoading();
        }
        catch (error) {
            this.hideLoading();
            const message = error instanceof Error ? error.message : '未知错误';
            this.showError(`加载文件失败: ${message}`);
        }
    }
    /**
     * 处理模型选择
     */
    async handleModelSelection(modelType) {
        try {
            this.showLoading(`切换到 ${modelType}...`);
            await poseApp.switchModel(modelType);
            this.hideLoading();
        }
        catch (error) {
            this.hideLoading();
            const message = error instanceof Error ? error.message : '未知错误';
            this.showError(`切换模型失败: ${message}`);
        }
    }
    /**
     * 处理开始按钮
     */
    async handleStart() {
        try {
            this.showLoading('启动应用...');
            await poseApp.start();
            this.hideLoading();
        }
        catch (error) {
            this.hideLoading();
            const message = error instanceof Error ? error.message : '未知错误';
            this.showError(`启动失败: ${message}`);
        }
    }
    /**
     * 处理停止按钮
     */
    handleStop() {
        poseApp.stop();
    }
    /**
     * 处理重启按钮
     */
    async handleRestart() {
        try {
            this.showLoading('重启应用...');
            await poseApp.restart();
            this.hideLoading();
        }
        catch (error) {
            this.hideLoading();
            const message = error instanceof Error ? error.message : '未知错误';
            this.showError(`重启失败: ${message}`);
        }
    }
    /**
     * 更新状态显示
     */
    updateStatus(status) {
        const indicator = this.statusPanel?.querySelector('.status-indicator');
        if (indicator) {
            indicator.textContent = status;
        }
    }
    /**
     * 更新应用状态
     */
    updateAppState(state) {
        const element = document.getElementById('app-state');
        if (element) {
            element.textContent = state;
        }
    }
    /**
     * 更新数据源显示
     */
    updateDataSource(type) {
        const element = document.getElementById('data-source');
        if (element) {
            element.textContent = type;
        }
    }
    /**
     * 更新当前模型显示
     */
    updateCurrentModel(modelType) {
        const element = document.getElementById('current-model');
        if (element) {
            element.textContent = modelType;
        }
    }
    /**
     * 更新控制按钮状态
     */
    updateControlButtons(isRunning) {
        const startBtn = document.getElementById('btn-start');
        const stopBtn = document.getElementById('btn-stop');
        const restartBtn = document.getElementById('btn-restart');
        if (startBtn)
            startBtn.disabled = isRunning;
        if (stopBtn)
            stopBtn.disabled = !isRunning;
        if (restartBtn)
            restartBtn.disabled = !isRunning;
    }
    /**
     * 启用开始按钮
     */
    enableStartButton() {
        const startBtn = document.getElementById('btn-start');
        if (startBtn) {
            startBtn.disabled = false;
        }
    }
    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.querySelector('p').textContent = message;
            loading.classList.remove('hidden');
        }
    }
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }
    /**
     * 显示错误信息
     */
    showError(message) {
        alert(`错误: ${message}`); // 简单的错误显示，可以改进
    }
    /**
     * 根据状态更新UI
     */
    updateUIFromState(state) {
        // 根据状态更新UI元素
        console.log('🎮 UI状态更新:', state);
    }
    /**
     * 添加样式
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .pose-app {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      
      .app-header {
        background: #2c3e50;
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .app-header h1 {
        margin: 0;
        font-size: 1.5rem;
      }
      
      .status-panel {
        display: flex;
        align-items: center;
      }
      
      .status-indicator {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        background: rgba(255,255,255,0.1);
        font-size: 0.9rem;
      }
      
      .app-main {
        flex: 1;
        display: flex;
        gap: 1rem;
        padding: 1rem;
      }
      
      .canvas-container {
        flex: 1;
        position: relative;
        background: #f8f9fa;
        border-radius: 8px;
        overflow: hidden;
      }
      
      #pose-canvas {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      
      .canvas-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .loading {
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
      }
      
      .loading.hidden {
        display: none;
      }
      
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .control-sidebar {
        width: 300px;
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .panel-section {
        margin-bottom: 2rem;
      }
      
      .panel-section h3 {
        margin: 0 0 1rem 0;
        color: #2c3e50;
        font-size: 1.1rem;
      }
      
      .button-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .btn {
        padding: 0.75rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
      }
      
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .btn-primary {
        background: #3498db;
        color: white;
      }
      
      .btn-primary:hover:not(:disabled) {
        background: #2980b9;
      }
      
      .btn-secondary {
        background: #95a5a6;
        color: white;
      }
      
      .btn-secondary:hover:not(:disabled) {
        background: #7f8c8d;
      }
      
      .btn-success {
        background: #27ae60;
        color: white;
      }
      
      .btn-success:hover:not(:disabled) {
        background: #229954;
      }
      
      .btn-danger {
        background: #e74c3c;
        color: white;
      }
      
      .btn-danger:hover:not(:disabled) {
        background: #c0392b;
      }
      
      .btn-warning {
        background: #f39c12;
        color: white;
      }
      
      .btn-warning:hover:not(:disabled) {
        background: #e67e22;
      }
      
      .btn-outline {
        background: transparent;
        border: 2px solid #3498db;
        color: #3498db;
      }
      
      .btn-outline:hover:not(:disabled) {
        background: #3498db;
        color: white;
      }
      
      .status-info {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      
      .status-info p {
        margin: 0.5rem 0;
      }
      
      .status-info span {
        font-weight: bold;
        color: #2c3e50;
      }
    `;
        document.head.appendChild(style);
    }
    /**
     * 初始化应用
     */
    async initializeApp() {
        try {
            this.showLoading('初始化应用...');
            await poseApp.init();
            this.hideLoading();
        }
        catch (error) {
            this.hideLoading();
            const message = error instanceof Error ? error.message : '未知错误';
            this.showError(`初始化失败: ${message}`);
        }
    }
}
//# sourceMappingURL=UIController.js.map