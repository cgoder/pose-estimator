/**
 * 加载管理器 - 提供加载进度反馈和用户体验改进
 */
class LoadingManager {
    constructor() {
        this.progressElement = null;
        this.messageElement = null;
        this.isVisible = false;
        this.currentProgress = {};
        this.init();
    }

    /**
     * 初始化加载管理器
     */
    init() {
        this.createProgressUI();
        this.bindEvents();
    }

    /**
     * 创建进度UI
     */
    createProgressUI() {
        // 创建加载容器
        const container = document.createElement('div');
        container.id = 'loading-manager';
        container.className = 'loading-manager';
        container.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-title">正在加载...</div>
                    <div class="loading-stages"></div>
                    <div class="loading-overall-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .loading-manager {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
            }

            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .loading-content {
                background: white;
                border-radius: 12px;
                padding: 30px;
                min-width: 400px;
                max-width: 500px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-title {
                font-size: 18px;
                font-weight: bold;
                color: #333;
                margin-bottom: 20px;
            }

            .loading-stages {
                margin-bottom: 20px;
            }

            .stage-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }

            .stage-item:last-child {
                border-bottom: none;
            }

            .stage-name {
                font-weight: 500;
                color: #555;
            }

            .stage-progress {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .stage-progress-bar {
                width: 100px;
                height: 6px;
                background: #f0f0f0;
                border-radius: 3px;
                overflow: hidden;
            }

            .stage-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #0056b3);
                transition: width 0.3s ease;
            }

            .stage-progress-text {
                font-size: 12px;
                color: #666;
                min-width: 30px;
            }

            .loading-overall-progress {
                margin-top: 20px;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-text {
                font-size: 14px;
                color: #666;
            }

            .stage-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 10px;
                color: white;
            }

            .stage-status.loading {
                background: #007bff;
            }

            .stage-status.completed {
                background: #28a745;
            }

            .stage-status.error {
                background: #dc3545;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);

        this.container = container;
        this.stagesContainer = container.querySelector('.loading-stages');
        this.overallProgressFill = container.querySelector('.progress-fill');
        this.overallProgressText = container.querySelector('.progress-text');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 监听加载进度事件
        if (typeof eventBus !== 'undefined') {
            eventBus.on('loadingProgress', (progressInfo) => {
                this.updateProgress(progressInfo);
            });
            
            // 监听脚本加载事件（减少控制台警告）
            eventBus.on('scriptLoaded', (scriptInfo) => {
                if (scriptInfo.success) {
                    console.debug(`📦 脚本加载完成: ${scriptInfo.url}`);
                } else {
                    console.error(`❌ 脚本加载失败: ${scriptInfo.url}`, scriptInfo.error);
                }
            });
        }
    }

    /**
     * 显示加载界面
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.isVisible = true;
        }
    }

    /**
     * 隐藏加载界面
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * 更新进度
     * @param {Object} progressInfo - 进度信息
     */
    updateProgress(progressInfo) {
        const { stage, progress, message } = progressInfo;
        
        // 更新当前进度
        this.currentProgress[stage] = { progress, message };
        
        // 更新UI
        this.updateStageUI(stage, progress, message);
        this.updateOverallProgress();
        
        // 自动显示/隐藏
        if (progress > 0 && progress < 100) {
            this.show();
        } else if (this.isAllCompleted()) {
            setTimeout(() => this.hide(), 1000);
        }
    }

    /**
     * 更新阶段UI
     * @param {string} stage - 阶段名称
     * @param {number} progress - 进度
     * @param {string} message - 消息
     */
    updateStageUI(stage, progress, message) {
        let stageElement = this.stagesContainer.querySelector(`[data-stage="${stage}"]`);
        
        if (!stageElement) {
            stageElement = document.createElement('div');
            stageElement.className = 'stage-item';
            stageElement.setAttribute('data-stage', stage);
            stageElement.innerHTML = `
                <div class="stage-name">${stage}</div>
                <div class="stage-progress">
                    <div class="stage-progress-bar">
                        <div class="stage-progress-fill"></div>
                    </div>
                    <div class="stage-progress-text">0%</div>
                    <div class="stage-status loading">加载中</div>
                </div>
            `;
            this.stagesContainer.appendChild(stageElement);
        }
        
        const progressFill = stageElement.querySelector('.stage-progress-fill');
        const progressText = stageElement.querySelector('.stage-progress-text');
        const statusElement = stageElement.querySelector('.stage-status');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
        
        if (progress >= 100) {
            statusElement.textContent = '完成';
            statusElement.className = 'stage-status completed';
        } else if (progress === 0 && message.includes('失败')) {
            statusElement.textContent = '失败';
            statusElement.className = 'stage-status error';
        } else {
            statusElement.textContent = '加载中';
            statusElement.className = 'stage-status loading';
        }
        
        // 更新消息（可选）
        if (message) {
            stageElement.title = message;
        }
    }

    /**
     * 更新总体进度
     */
    updateOverallProgress() {
        const stages = Object.values(this.currentProgress);
        if (stages.length === 0) return;
        
        const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
        const averageProgress = Math.round(totalProgress / stages.length);
        
        this.overallProgressFill.style.width = `${averageProgress}%`;
        this.overallProgressText.textContent = `${averageProgress}%`;
    }

    /**
     * 检查是否所有阶段都已完成
     * @returns {boolean}
     */
    isAllCompleted() {
        const stages = Object.values(this.currentProgress);
        return stages.length > 0 && stages.every(stage => stage.progress >= 100);
    }

    /**
     * 重置进度
     */
    reset() {
        this.currentProgress = {};
        if (this.stagesContainer) {
            this.stagesContainer.innerHTML = '';
        }
        if (this.overallProgressFill) {
            this.overallProgressFill.style.width = '0%';
        }
        if (this.overallProgressText) {
            this.overallProgressText.textContent = '0%';
        }
        this.hide();
    }

    /**
     * 销毁加载管理器
     */
    destroy() {
        if (this.container) {
            this.container.remove();
        }
        this.currentProgress = {};
        this.isVisible = false;
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.loadingManager = new LoadingManager();
}

export default LoadingManager;