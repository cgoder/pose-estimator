import { CONFIG } from '../utils/constants.js';
import { IPanelManager } from '../interfaces/components/IPanelManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * 面板管理器
 * 负责管理模型参数面板和滤波器参数面板
 */
export class PanelManager extends IPanelManager {
    constructor() {
        super();
        this.modelPanelElement = null;
        this.filterPanelElement = null;
        this.isInitialized = false;
        this.modelPanelVisible = false;
        this.filterPanelVisible = false;
        this.callbacks = {};
        
        // 状态管理
        this.currentState = {
            modelPanel: {
                visible: false,
                modelType: 'MoveNet',
                scoreThreshold: 0.3,
                showSkeleton: true,
                showKeypoints: true,
                enableCache: true
            },
            filterPanel: {
                visible: false,
                enabled: true,
                frequency: 60,
                minCutoff: 1.0,
                beta: 0.1,
                dCutoff: 1.0
            }
        };
        
        console.log('🎛️ PanelManager已初始化');
    }
    
    /**
     * 初始化模块（IBaseModule接口方法）
     * @param {Object} config - 配置对象
     * @param {Object} dependencies - 依赖对象
     * @returns {Promise<void>}
     */
    async init(config = {}, dependencies = {}) {
        if (this.isInitialized) return;
        
        this.createModelPanelElement();
        this.createFilterPanelElement();
        this.bindEventBusEvents();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_PANELS_READY, {});
        
        console.log('✅ 面板管理器初始化完成');
    }
    
    /**
     * 初始化面板元素（向后兼容）
     */
    initPanels() {
        if (this.isInitialized) return;
        
        this.createModelPanelElement();
        this.createFilterPanelElement();
        this.bindEventBusEvents();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_PANELS_READY, {});
        
        console.log('✅ 面板管理器初始化完成');
    }
    
    /**
     * 绑定事件总线事件
     */
    bindEventBusEvents() {
        // 监听面板显示/隐藏事件
        eventBus.on(EVENTS.PANELS_MODEL_SHOW, () => this.showModelPanel());
        eventBus.on(EVENTS.PANELS_MODEL_HIDE, () => this.hideModelPanel());
        eventBus.on(EVENTS.PANELS_FILTER_SHOW, () => this.showFilterPanel());
        eventBus.on(EVENTS.PANELS_FILTER_HIDE, () => this.hideFilterPanel());
        
        // 监听参数更新事件
        eventBus.on(EVENTS.PANELS_MODEL_UPDATE, (params) => this.updateModelPanelState(params));
        eventBus.on(EVENTS.PANELS_FILTER_UPDATE, (params) => this.updateFilterPanelState(params));
    }
    
    /**
     * 创建模型参数面板
     */
    createModelPanelElement() {
        this.modelPanelElement = document.createElement('div');
        this.modelPanelElement.id = 'model-panel';
        this.modelPanelElement.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            min-width: 280px;
            max-width: 350px;
            z-index: 998;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInFromLeft 0.3s ease-out;
        `;
        
        this.modelPanelElement.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            ">
                <h3 style="margin: 0; font-size: 14px; color: #fff;">🤖 模型参数</h3>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
            </div>
            
            <div id="model-controls">
                <!-- 模型选择 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 6px;
                        color: #3498db;
                        font-weight: bold;
                    ">模型类型:</label>
                    <select id="model-select" style="
                        width: 100%;
                        padding: 6px 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 4px;
                        font-size: 12px;
                    ">
                        <option value="MoveNet">MoveNet (推荐)</option>
                        <option value="PoseNet">PoseNet</option>
                    </select>
                </div>
                
                <!-- 检测阈值 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 6px;
                        color: #3498db;
                        font-weight: bold;
                    ">检测阈值:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="score-threshold" 
                            min="0.1" max="0.9" step="0.1" value="0.3"
                            style="flex: 1; accent-color: #3498db;"
                        >
                        <span id="score-threshold-value" style="
                            min-width: 30px;
                            color: #2ecc71;
                            font-weight: bold;
                        ">0.3</span>
                    </div>
                    <div style="font-size: 10px; color: #bdc3c7; margin-top: 2px;">
                        较低值检测更多关键点，较高值更准确
                    </div>
                </div>
                
                <!-- 显示选项 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 8px;
                        color: #3498db;
                        font-weight: bold;
                    ">显示选项:</label>
                    
                    <div style="margin-bottom: 6px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="show-skeleton" checked style="
                                margin-right: 8px;
                                accent-color: #3498db;
                            ">
                            <span>显示骨架连线</span>
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 6px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="show-keypoints" checked style="
                                margin-right: 8px;
                                accent-color: #3498db;
                            ">
                            <span>显示关键点</span>
                        </label>
                    </div>
                </div>
                
                <!-- 性能选项 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 8px;
                        color: #3498db;
                        font-weight: bold;
                    ">性能选项:</label>
                    
                    <div style="margin-bottom: 6px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="enable-cache" checked style="
                                margin-right: 8px;
                                accent-color: #3498db;
                            ">
                            <span>启用模型缓存</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div style="
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                text-align: center;
            ">
                <button id="reset-model-params" style="
                    background: rgba(231, 76, 60, 0.8);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='rgba(231, 76, 60, 1)'" 
                   onmouseout="this.style.background='rgba(231, 76, 60, 0.8)'">
                    重置为默认值
                </button>
            </div>
        `;
        
        // 添加滑入动画样式
        if (!document.querySelector('#panel-animation-style')) {
            const style = document.createElement('style');
            style.id = 'panel-animation-style';
            style.textContent = `
                @keyframes slideInFromLeft {
                    0% {
                        transform: translateX(-20px);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutToLeft {
                    0% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(-20px);
                        opacity: 0;
                    }
                }
                
                @keyframes slideInFromRight {
                    0% {
                        transform: translateX(20px);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutToRight {
                    0% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(20px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.modelPanelElement);
        this.bindModelPanelEvents();
    }
    
    /**
     * 创建滤波器参数面板
     */
    createFilterPanelElement() {
        this.filterPanelElement = document.createElement('div');
        this.filterPanelElement.id = 'filter-panel';
        this.filterPanelElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            min-width: 280px;
            max-width: 350px;
            z-index: 998;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInFromLeft 0.3s ease-out;
        `;
        
        this.filterPanelElement.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            ">
                <h3 style="margin: 0; font-size: 14px; color: #fff;">⚙️ 滤波器参数</h3>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
            </div>
            
            <!-- 滤波器开关 -->
            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="enable-filter" checked style="
                        margin-right: 8px;
                        accent-color: #3498db;
                        transform: scale(1.2);
                    ">
                    <span style="color: #3498db; font-weight: bold;">启用One Euro滤波器</span>
                </label>
                <div style="font-size: 10px; color: #bdc3c7; margin-top: 4px;">
                    平滑姿态检测结果，减少抖动
                </div>
            </div>
            
            <div id="filter-controls">
                <!-- 频率参数 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 6px;
                        color: #3498db;
                        font-weight: bold;
                    ">频率 (Hz):</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="frequency" 
                            min="10" max="120" step="10" value="60"
                            style="flex: 1; accent-color: #3498db;"
                        >
                        <span id="frequency-value" style="
                            min-width: 40px;
                            color: #2ecc71;
                            font-weight: bold;
                        ">60</span>
                    </div>
                    <div style="font-size: 10px; color: #bdc3c7; margin-top: 2px;">
                        数据更新频率，通常与摄像头帧率匹配
                    </div>
                </div>
                
                <!-- 最小截止频率 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 6px;
                        color: #3498db;
                        font-weight: bold;
                    ">最小截止频率:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="min-cutoff" 
                            min="0.1" max="5.0" step="0.1" value="1.0"
                            style="flex: 1; accent-color: #3498db;"
                        >
                        <span id="min-cutoff-value" style="
                            min-width: 30px;
                            color: #2ecc71;
                            font-weight: bold;
                        ">1.0</span>
                    </div>
                    <div style="font-size: 10px; color: #bdc3c7; margin-top: 2px;">
                        较低值更平滑但延迟更高
                    </div>
                </div>
                
                <!-- Beta参数 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 6px;
                        color: #3498db;
                        font-weight: bold;
                    ">Beta (速度因子):</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="beta" 
                            min="0.0" max="1.0" step="0.01" value="0.1"
                            style="flex: 1; accent-color: #3498db;"
                        >
                        <span id="beta-value" style="
                            min-width: 40px;
                            color: #2ecc71;
                            font-weight: bold;
                        ">0.10</span>
                    </div>
                    <div style="font-size: 10px; color: #bdc3c7; margin-top: 2px;">
                        控制对速度变化的敏感度
                    </div>
                </div>
                
                <!-- 导数截止频率 -->
                <div class="control-group" style="margin-bottom: 15px;">
                    <label style="
                        display: block;
                        margin-bottom: 6px;
                        color: #3498db;
                        font-weight: bold;
                    ">导数截止频率:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="d-cutoff" 
                            min="0.1" max="5.0" step="0.1" value="1.0"
                            style="flex: 1; accent-color: #3498db;"
                        >
                        <span id="d-cutoff-value" style="
                            min-width: 30px;
                            color: #2ecc71;
                            font-weight: bold;
                        ">1.0</span>
                    </div>
                    <div style="font-size: 10px; color: #bdc3c7; margin-top: 2px;">
                        导数计算的截止频率
                    </div>
                </div>
            </div>
            
            <div style="
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                gap: 8px;
                justify-content: center;
            ">
                <button id="reset-filter-params" style="
                    background: rgba(231, 76, 60, 0.8);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='rgba(231, 76, 60, 1)'" 
                   onmouseout="this.style.background='rgba(231, 76, 60, 0.8)'">
                    重置参数
                </button>
                
                <button id="apply-filter-params" style="
                    background: rgba(46, 204, 113, 0.8);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='rgba(46, 204, 113, 1)'" 
                   onmouseout="this.style.background='rgba(46, 204, 113, 0.8)'">
                    应用设置
                </button>
            </div>
        `;
        
        document.body.appendChild(this.filterPanelElement);
        this.bindFilterPanelEvents();
    }
    
    /**
     * 绑定模型面板事件
     */
    bindModelPanelEvents() {
        if (!this.modelPanelElement) return;
        
        // 模型选择
        const modelSelect = this.modelPanelElement.querySelector('#model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.triggerCallback('onModelChange', e.target.value);
            });
        }
        
        // 检测阈值
        const scoreThreshold = this.modelPanelElement.querySelector('#score-threshold');
        const scoreValue = this.modelPanelElement.querySelector('#score-threshold-value');
        if (scoreThreshold && scoreValue) {
            scoreThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                scoreValue.textContent = value.toFixed(1);
                this.triggerCallback('onScoreThresholdChange', value);
            });
        }
        
        // 显示选项
        const showSkeleton = this.modelPanelElement.querySelector('#show-skeleton');
        if (showSkeleton) {
            showSkeleton.addEventListener('change', (e) => {
                this.triggerCallback('onToggleSkeleton', e.target.checked);
            });
        }
        
        const showKeypoints = this.modelPanelElement.querySelector('#show-keypoints');
        if (showKeypoints) {
            showKeypoints.addEventListener('change', (e) => {
                this.triggerCallback('onToggleKeypoints', e.target.checked);
            });
        }
        
        // 性能选项
        const enableCache = this.modelPanelElement.querySelector('#enable-cache');
        if (enableCache) {
            enableCache.addEventListener('change', (e) => {
                this.triggerCallback('onToggleCache', e.target.checked);
            });
        }
        
        // 重置按钮
        const resetButton = this.modelPanelElement.querySelector('#reset-model-params');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetModelParams();
                this.triggerCallback('onResetModelParams');
            });
        }
    }
    
    /**
     * 绑定滤波器面板事件
     */
    bindFilterPanelEvents() {
        if (!this.filterPanelElement) return;
        
        // 滤波器开关
        const enableFilter = this.filterPanelElement.querySelector('#enable-filter');
        if (enableFilter) {
            enableFilter.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.updateFilterControlsState(enabled);
                this.triggerCallback('onToggleFilter', enabled);
            });
        }
        
        // 参数滑块
        const params = ['frequency', 'min-cutoff', 'beta', 'd-cutoff'];
        params.forEach(param => {
            const slider = this.filterPanelElement.querySelector(`#${param}`);
            const valueDisplay = this.filterPanelElement.querySelector(`#${param}-value`);
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    
                    // 更新显示值
                    if (param === 'beta') {
                        valueDisplay.textContent = value.toFixed(2);
                    } else {
                        valueDisplay.textContent = value.toString();
                    }
                    
                    // 触发回调
                    this.triggerCallback('onFilterParamChange', {
                        param: param.replace('-', '_'),
                        value: value
                    });
                });
            }
        });
        
        // 重置按钮
        const resetButton = this.filterPanelElement.querySelector('#reset-filter-params');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetFilterParams();
                this.triggerCallback('onResetFilterParams');
            });
        }
        
        // 应用按钮
        const applyButton = this.filterPanelElement.querySelector('#apply-filter-params');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.triggerCallback('onApplyFilterParams');
            });
        }
    }
    
    /**
     * 显示模型面板（接口方法）
     */
    showPanel(panelType) {
        if (panelType === 'model') {
            this.showModelPanel();
        } else if (panelType === 'filter') {
            this.showFilterPanel();
        }
    }
    
    /**
     * 隐藏面板（接口方法）
     */
    hidePanel(panelType) {
        if (panelType === 'model') {
            this.hideModelPanel();
        } else if (panelType === 'filter') {
            this.hideFilterPanel();
        }
    }
    
    /**
     * 显示模型面板
     */
    showModelPanel() {
        if (!this.modelPanelElement) {
            this.init();
        }
        
        this.modelPanelElement.style.display = 'block';
        this.modelPanelElement.style.animation = 'slideInFromLeft 0.3s ease-out';
        this.modelPanelVisible = true;
        this.currentState.modelPanel.visible = true;
        
        // 发布事件
        eventBus.emit(EVENTS.PANELS_MODEL_SHOWN, {});
        
        console.log('🤖 显示模型参数面板');
    }
    
    /**
     * 隐藏模型面板
     * @param {boolean} immediate - 是否立即隐藏
     */
    hideModelPanel(immediate = false) {
        if (!this.modelPanelElement) return;
        
        if (immediate) {
            this.modelPanelElement.style.display = 'none';
        } else {
            this.modelPanelElement.style.animation = 'slideOutToLeft 0.3s ease-out';
            
            setTimeout(() => {
                if (this.modelPanelElement) {
                    this.modelPanelElement.style.display = 'none';
                }
            }, 300);
        }
        
        this.modelPanelVisible = false;
        this.currentState.modelPanel.visible = false;
        
        // 发布事件
        eventBus.emit(EVENTS.PANELS_MODEL_HIDDEN, {});
        
        console.log('🤖 隐藏模型参数面板');
    }
    
    /**
     * 显示滤波器面板
     */
    showFilterPanel() {
        if (!this.filterPanelElement) {
            this.init();
        }
        
        this.filterPanelElement.style.display = 'block';
        this.filterPanelElement.style.animation = 'slideInFromLeft 0.3s ease-out';
        this.filterPanelVisible = true;
        this.currentState.filterPanel.visible = true;
        
        // 发布事件
        eventBus.emit(EVENTS.PANELS_FILTER_SHOWN, {});
        
        console.log('⚙️ 显示滤波器参数面板');
    }
    
    /**
     * 隐藏滤波器面板
     * @param {boolean} immediate - 是否立即隐藏
     */
    hideFilterPanel(immediate = false) {
        if (!this.filterPanelElement) return;
        
        if (immediate) {
            this.filterPanelElement.style.display = 'none';
        } else {
            this.filterPanelElement.style.animation = 'slideOutToLeft 0.3s ease-out';
            
            setTimeout(() => {
                if (this.filterPanelElement) {
                    this.filterPanelElement.style.display = 'none';
                }
            }, 300);
        }
        
        this.filterPanelVisible = false;
        this.currentState.filterPanel.visible = false;
        
        // 发布事件
        eventBus.emit(EVENTS.PANELS_FILTER_HIDDEN, {});
        
        console.log('⚙️ 隐藏滤波器参数面板');
    }
    
    /**
     * 重置模型参数
     */
    resetModelParams() {
        if (!this.modelPanelElement) return;
        
        // 重置为默认值
        const modelSelect = this.modelPanelElement.querySelector('#model-select');
        if (modelSelect) modelSelect.value = 'MoveNet';
        
        const scoreThreshold = this.modelPanelElement.querySelector('#score-threshold');
        const scoreValue = this.modelPanelElement.querySelector('#score-threshold-value');
        if (scoreThreshold && scoreValue) {
            scoreThreshold.value = '0.3';
            scoreValue.textContent = '0.3';
        }
        
        const showSkeleton = this.modelPanelElement.querySelector('#show-skeleton');
        if (showSkeleton) showSkeleton.checked = true;
        
        const showKeypoints = this.modelPanelElement.querySelector('#show-keypoints');
        if (showKeypoints) showKeypoints.checked = true;
        
        const enableCache = this.modelPanelElement.querySelector('#enable-cache');
        if (enableCache) enableCache.checked = true;
        
        console.log('🤖 重置模型参数为默认值');
    }
    
    /**
     * 重置滤波器参数
     */
    resetFilterParams() {
        if (!this.filterPanelElement) return;
        
        // 重置为默认值
        const params = {
            'frequency': { value: '60', display: '60' },
            'min-cutoff': { value: '1.0', display: '1.0' },
            'beta': { value: '0.1', display: '0.10' },
            'd-cutoff': { value: '1.0', display: '1.0' }
        };
        
        Object.entries(params).forEach(([param, config]) => {
            const slider = this.filterPanelElement.querySelector(`#${param}`);
            const valueDisplay = this.filterPanelElement.querySelector(`#${param}-value`);
            
            if (slider && valueDisplay) {
                slider.value = config.value;
                valueDisplay.textContent = config.display;
            }
        });
        
        const enableFilter = this.filterPanelElement.querySelector('#enable-filter');
        if (enableFilter) {
            enableFilter.checked = true;
            this.updateFilterControlsState(true);
        }
        
        console.log('⚙️ 重置滤波器参数为默认值');
    }
    
    /**
     * 更新滤波器控件状态
     * @param {boolean} enabled - 是否启用
     */
    updateFilterControlsState(enabled) {
        if (!this.filterPanelElement) return;
        
        const filterControls = this.filterPanelElement.querySelector('#filter-controls');
        if (filterControls) {
            filterControls.style.opacity = enabled ? '1' : '0.5';
            filterControls.style.pointerEvents = enabled ? 'auto' : 'none';
            
            const inputs = filterControls.querySelectorAll('input, button');
            inputs.forEach(input => {
                input.disabled = !enabled;
            });
        }
    }
    
    /**
     * 绑定回调函数
     * @param {Object} callbacks - 回调函数对象
     */
    bindCallbacks(callbacks = {}) {
        this.callbacks = callbacks;
        console.log('🎛️ 面板回调函数已绑定');
    }
    
    /**
     * 触发回调函数
     * @param {string} callbackName - 回调函数名
     * @param {*} data - 传递的数据
     */
    triggerCallback(callbackName, data) {
        if (this.callbacks[callbackName]) {
            this.callbacks[callbackName](data);
        }
    }
    
    /**
     * 更新模型面板状态
     * @param {Object} params - 参数对象
     */
    updateModelPanelState(params) {
        Object.assign(this.currentState.modelPanel, params);
        
        // 更新UI元素
        if (this.modelPanelElement) {
            if (params.modelType !== undefined) {
                const modelSelect = this.modelPanelElement.querySelector('#model-select');
                if (modelSelect) modelSelect.value = params.modelType;
            }
            
            if (params.scoreThreshold !== undefined) {
                const scoreThreshold = this.modelPanelElement.querySelector('#score-threshold');
                const scoreValue = this.modelPanelElement.querySelector('#score-threshold-value');
                if (scoreThreshold && scoreValue) {
                    scoreThreshold.value = params.scoreThreshold;
                    scoreValue.textContent = params.scoreThreshold.toFixed(1);
                }
            }
        }
    }
    
    /**
     * 更新滤波器面板状态
     * @param {Object} params - 参数对象
     */
    updateFilterPanelState(params) {
        Object.assign(this.currentState.filterPanel, params);
        
        // 更新UI元素
        if (this.filterPanelElement) {
            Object.entries(params).forEach(([key, value]) => {
                const element = this.filterPanelElement.querySelector(`#${key.replace('_', '-')}`);
                const valueElement = this.filterPanelElement.querySelector(`#${key.replace('_', '-')}-value`);
                
                if (element && element.type === 'range' && valueElement) {
                    element.value = value;
                    valueElement.textContent = key === 'beta' ? value.toFixed(2) : value.toString();
                }
            });
        }
    }
    
    /**
     * 获取面板状态（接口方法）
     * @returns {Object} 面板状态
     */
    getPanelState(panelType) {
        if (panelType === 'model') {
            return { ...this.currentState.modelPanel };
        } else if (panelType === 'filter') {
            return { ...this.currentState.filterPanel };
        }
        return {};
    }
    
    /**
     * 获取模块状态（接口方法）
     * @returns {Object} 模块状态
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            modelPanelVisible: this.modelPanelVisible,
            filterPanelVisible: this.filterPanelVisible,
            modelPanelState: { ...this.currentState.modelPanel },
            filterPanelState: { ...this.currentState.filterPanel }
        };
    }
    
    /**
     * 重置模块（接口方法）
     */
    reset() {
        this.resetModelParams();
        this.resetFilterParams();
        this.hideModelPanel(true);
        this.hideFilterPanel(true);
        
        // 发布重置事件
        eventBus.emit(EVENTS.PANELS_RESET, {});
    }
    
    /**
     * 销毁模块（接口方法）
     */
    destroy() {
        this.cleanup();
        
        // 发布销毁事件
        eventBus.emit(EVENTS.PANELS_DESTROYED, {});
    }
    
    /**
     * 获取面板可见性状态（向后兼容）
     * @returns {Object} 可见性状态
     */
    getVisibility() {
        return {
            modelPanel: this.modelPanelVisible,
            filterPanel: this.filterPanelVisible
        };
    }
    
    // ==================== IBaseModule 接口方法 ====================
    
    /**
     * 获取模块状态（IBaseModule接口方法）
     * @returns {string} 模块状态
     */
    getStatus() {
        if (!this.isInitialized) return 'uninitialized';
        return (this.modelPanelVisible || this.filterPanelVisible) ? 'active' : 'inactive';
    }
    
    /**
     * 获取模块名称（IBaseModule接口方法）
     * @returns {string} 模块名称
     */
    getName() {
        return 'PanelManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口方法）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 清理面板管理器（向后兼容）
     */
    cleanup() {
        if (this.modelPanelElement && this.modelPanelElement.parentNode) {
            this.modelPanelElement.parentNode.removeChild(this.modelPanelElement);
        }
        
        if (this.filterPanelElement && this.filterPanelElement.parentNode) {
            this.filterPanelElement.parentNode.removeChild(this.filterPanelElement);
        }
        
        this.modelPanelElement = null;
        this.filterPanelElement = null;
        this.isInitialized = false;
        this.modelPanelVisible = false;
        this.filterPanelVisible = false;
        this.callbacks = {};
        
        // 重置状态
        this.currentState = {
            modelPanel: {
                visible: false,
                modelType: 'MoveNet',
                scoreThreshold: 0.3,
                showSkeleton: true,
                showKeypoints: true,
                enableCache: true
            },
            filterPanel: {
                visible: false,
                enabled: true,
                frequency: 60,
                minCutoff: 1.0,
                beta: 0.1,
                dCutoff: 1.0
            }
        };
        
        console.log('🧹 PanelManager清理完成');
    }
}

// 创建全局面板管理器实例
export const panelManager = new PanelManager();