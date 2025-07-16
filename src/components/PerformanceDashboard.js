/**
 * 性能监控仪表板
 * 关键性能指标监控和可视化展示
 * 基于架构设计文档要求实现
 */

/**
 * 性能指标类型枚举
 */
export const MetricType = {
    FPS: 'fps',
    FRAME_TIME: 'frame_time',
    INFERENCE_TIME: 'inference_time',
    RENDER_TIME: 'render_time',
    MEMORY_USAGE: 'memory_usage',
    CPU_USAGE: 'cpu_usage',
    GPU_USAGE: 'gpu_usage',
    CACHE_HIT_RATE: 'cache_hit_rate',
    NETWORK_LATENCY: 'network_latency',
    ERROR_RATE: 'error_rate',
    POSE_ACCURACY: 'pose_accuracy',
    ANALYSIS_QUALITY: 'analysis_quality'
};

/**
 * 警告级别枚举
 */
export const AlertLevel = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * 图表类型枚举
 */
export const ChartType = {
    LINE: 'line',
    BAR: 'bar',
    GAUGE: 'gauge',
    PIE: 'pie',
    HEATMAP: 'heatmap',
    HISTOGRAM: 'histogram'
};

/**
 * 性能指标类
 */
class PerformanceMetric {
    constructor(type, name, options = {}) {
        this.type = type;
        this.name = name;
        this.unit = options.unit || '';
        this.description = options.description || '';
        this.minValue = options.minValue || 0;
        this.maxValue = options.maxValue || 100;
        this.warningThreshold = options.warningThreshold || 80;
        this.errorThreshold = options.errorThreshold || 90;
        this.criticalThreshold = options.criticalThreshold || 95;
        this.historySize = options.historySize || 100;
        this.aggregationWindow = options.aggregationWindow || 1000; // 1秒
        
        this.values = [];
        this.timestamps = [];
        this.currentValue = 0;
        this.averageValue = 0;
        this.minRecordedValue = Infinity;
        this.maxRecordedValue = -Infinity;
        this.lastUpdateTime = 0;
        this.alertLevel = AlertLevel.INFO;
        
        this.aggregatedValues = [];
        this.aggregatedTimestamps = [];
        this.lastAggregationTime = 0;
    }
    
    /**
     * 添加新值
     */
    addValue(value, timestamp = Date.now()) {
        this.values.push(value);
        this.timestamps.push(timestamp);
        this.currentValue = value;
        this.lastUpdateTime = timestamp;
        
        // 更新统计信息
        this.minRecordedValue = Math.min(this.minRecordedValue, value);
        this.maxRecordedValue = Math.max(this.maxRecordedValue, value);
        
        // 保持历史大小
        if (this.values.length > this.historySize) {
            this.values.shift();
            this.timestamps.shift();
        }
        
        // 计算平均值
        this.averageValue = this.values.reduce((sum, val) => sum + val, 0) / this.values.length;
        
        // 更新警告级别
        this._updateAlertLevel();
        
        // 聚合数据
        this._aggregateData(timestamp);
    }
    
    /**
     * 获取最近N个值
     */
    getRecentValues(count = 10) {
        return {
            values: this.values.slice(-count),
            timestamps: this.timestamps.slice(-count)
        };
    }
    
    /**
     * 获取时间范围内的值
     */
    getValuesInRange(startTime, endTime) {
        const result = { values: [], timestamps: [] };
        
        for (let i = 0; i < this.timestamps.length; i++) {
            const timestamp = this.timestamps[i];
            if (timestamp >= startTime && timestamp <= endTime) {
                result.values.push(this.values[i]);
                result.timestamps.push(timestamp);
            }
        }
        
        return result;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            type: this.type,
            name: this.name,
            unit: this.unit,
            currentValue: this.currentValue,
            averageValue: this.averageValue,
            minValue: this.minRecordedValue === Infinity ? 0 : this.minRecordedValue,
            maxValue: this.maxRecordedValue === -Infinity ? 0 : this.maxRecordedValue,
            alertLevel: this.alertLevel,
            dataPoints: this.values.length,
            lastUpdateTime: this.lastUpdateTime
        };
    }
    
    /**
     * 重置指标
     */
    reset() {
        this.values = [];
        this.timestamps = [];
        this.currentValue = 0;
        this.averageValue = 0;
        this.minRecordedValue = Infinity;
        this.maxRecordedValue = -Infinity;
        this.lastUpdateTime = 0;
        this.alertLevel = AlertLevel.INFO;
        this.aggregatedValues = [];
        this.aggregatedTimestamps = [];
        this.lastAggregationTime = 0;
    }
    
    /**
     * 更新警告级别
     */
    _updateAlertLevel() {
        const value = this.currentValue;
        
        if (value >= this.criticalThreshold) {
            this.alertLevel = AlertLevel.CRITICAL;
        } else if (value >= this.errorThreshold) {
            this.alertLevel = AlertLevel.ERROR;
        } else if (value >= this.warningThreshold) {
            this.alertLevel = AlertLevel.WARNING;
        } else {
            this.alertLevel = AlertLevel.INFO;
        }
    }
    
    /**
     * 聚合数据
     */
    _aggregateData(timestamp) {
        if (timestamp - this.lastAggregationTime >= this.aggregationWindow) {
            // 计算聚合窗口内的平均值
            const windowStart = this.lastAggregationTime;
            const windowEnd = timestamp;
            const windowValues = [];
            
            for (let i = 0; i < this.timestamps.length; i++) {
                if (this.timestamps[i] >= windowStart && this.timestamps[i] <= windowEnd) {
                    windowValues.push(this.values[i]);
                }
            }
            
            if (windowValues.length > 0) {
                const aggregatedValue = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
                this.aggregatedValues.push(aggregatedValue);
                this.aggregatedTimestamps.push(timestamp);
                
                // 保持聚合历史大小
                if (this.aggregatedValues.length > this.historySize) {
                    this.aggregatedValues.shift();
                    this.aggregatedTimestamps.shift();
                }
            }
            
            this.lastAggregationTime = timestamp;
        }
    }
}

/**
 * 性能警报类
 */
class PerformanceAlert {
    constructor(metric, level, message, timestamp = Date.now()) {
        this.id = this._generateId();
        this.metric = metric;
        this.level = level;
        this.message = message;
        this.timestamp = timestamp;
        this.acknowledged = false;
        this.resolvedAt = null;
    }
    
    /**
     * 确认警报
     */
    acknowledge() {
        this.acknowledged = true;
    }
    
    /**
     * 解决警报
     */
    resolve() {
        this.resolvedAt = Date.now();
    }
    
    /**
     * 检查是否已解决
     */
    isResolved() {
        return this.resolvedAt !== null;
    }
    
    /**
     * 生成唯一ID
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

/**
 * 图表组件类
 */
class ChartComponent {
    constructor(container, type, options = {}) {
        this.container = container;
        this.type = type;
        this.options = {
            width: options.width || 400,
            height: options.height || 300,
            title: options.title || '',
            showLegend: options.showLegend !== false,
            showGrid: options.showGrid !== false,
            showAxes: options.showAxes !== false,
            colors: options.colors || ['#007bff', '#28a745', '#ffc107', '#dc3545'],
            backgroundColor: options.backgroundColor || '#ffffff',
            textColor: options.textColor || '#333333',
            gridColor: options.gridColor || '#e0e0e0',
            ...options
        };
        
        this.canvas = null;
        this.context = null;
        this.data = null;
        this.isInitialized = false;
        
        this._initialize();
    }
    
    /**
     * 初始化图表
     */
    _initialize() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.canvas.style.border = '1px solid #ddd';
        this.canvas.style.borderRadius = '4px';
        
        this.context = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        
        this.isInitialized = true;
    }
    
    /**
     * 更新数据
     */
    updateData(data) {
        this.data = data;
        this.render();
    }
    
    /**
     * 渲染图表
     */
    render() {
        if (!this.isInitialized || !this.data) return;
        
        const ctx = this.context;
        
        // 清空画布
        ctx.fillStyle = this.options.backgroundColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 渲染标题
        if (this.options.title) {
            this._renderTitle(ctx);
        }
        
        // 根据类型渲染图表
        switch (this.type) {
            case ChartType.LINE:
                this._renderLineChart(ctx);
                break;
            case ChartType.BAR:
                this._renderBarChart(ctx);
                break;
            case ChartType.GAUGE:
                this._renderGaugeChart(ctx);
                break;
            case ChartType.PIE:
                this._renderPieChart(ctx);
                break;
            default:
                this._renderLineChart(ctx);
        }
        
        // 渲染图例
        if (this.options.showLegend) {
            this._renderLegend(ctx);
        }
    }
    
    /**
     * 渲染标题
     */
    _renderTitle(ctx) {
        ctx.fillStyle = this.options.textColor;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.options.title, this.canvas.width / 2, 25);
    }
    
    /**
     * 渲染折线图
     */
    _renderLineChart(ctx) {
        if (!this.data.values || this.data.values.length === 0) return;
        
        const padding = 50;
        const chartWidth = this.canvas.width - 2 * padding;
        const chartHeight = this.canvas.height - 2 * padding - 30;
        const chartX = padding;
        const chartY = padding + 30;
        
        // 渲染网格
        if (this.options.showGrid) {
            this._renderGrid(ctx, chartX, chartY, chartWidth, chartHeight);
        }
        
        // 渲染坐标轴
        if (this.options.showAxes) {
            this._renderAxes(ctx, chartX, chartY, chartWidth, chartHeight);
        }
        
        // 计算数据范围
        const values = this.data.values;
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue || 1;
        
        // 渲染数据线
        ctx.strokeStyle = this.options.colors[0];
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < values.length; i++) {
            const x = chartX + (i / (values.length - 1)) * chartWidth;
            const y = chartY + chartHeight - ((values[i] - minValue) / valueRange) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // 渲染数据点
        ctx.fillStyle = this.options.colors[0];
        for (let i = 0; i < values.length; i++) {
            const x = chartX + (i / (values.length - 1)) * chartWidth;
            const y = chartY + chartHeight - ((values[i] - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    /**
     * 渲染柱状图
     */
    _renderBarChart(ctx) {
        if (!this.data.values || this.data.values.length === 0) return;
        
        const padding = 50;
        const chartWidth = this.canvas.width - 2 * padding;
        const chartHeight = this.canvas.height - 2 * padding - 30;
        const chartX = padding;
        const chartY = padding + 30;
        
        const values = this.data.values;
        const labels = this.data.labels || values.map((_, i) => i.toString());
        const maxValue = Math.max(...values);
        
        const barWidth = chartWidth / values.length * 0.8;
        const barSpacing = chartWidth / values.length * 0.2;
        
        // 渲染柱子
        for (let i = 0; i < values.length; i++) {
            const barHeight = (values[i] / maxValue) * chartHeight;
            const x = chartX + i * (barWidth + barSpacing) + barSpacing / 2;
            const y = chartY + chartHeight - barHeight;
            
            ctx.fillStyle = this.options.colors[i % this.options.colors.length];
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // 渲染标签
            ctx.fillStyle = this.options.textColor;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], x + barWidth / 2, chartY + chartHeight + 15);
            
            // 渲染数值
            ctx.fillText(values[i].toFixed(1), x + barWidth / 2, y - 5);
        }
    }
    
    /**
     * 渲染仪表盘
     */
    _renderGaugeChart(ctx) {
        if (typeof this.data.value !== 'number') return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 20;
        const radius = Math.min(this.canvas.width, this.canvas.height) / 3;
        
        const value = this.data.value;
        const minValue = this.data.minValue || 0;
        const maxValue = this.data.maxValue || 100;
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        
        // 渲染背景弧
        ctx.strokeStyle = this.options.gridColor;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
        ctx.stroke();
        
        // 渲染值弧
        const startAngle = Math.PI;
        const endAngle = Math.PI + normalizedValue * Math.PI;
        
        let color = this.options.colors[0];
        if (normalizedValue > 0.8) color = this.options.colors[3]; // 红色
        else if (normalizedValue > 0.6) color = this.options.colors[2]; // 黄色
        else if (normalizedValue > 0.4) color = this.options.colors[1]; // 绿色
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.stroke();
        
        // 渲染指针
        const pointerAngle = startAngle + normalizedValue * Math.PI;
        const pointerLength = radius - 10;
        
        ctx.strokeStyle = this.options.textColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(pointerAngle) * pointerLength,
            centerY + Math.sin(pointerAngle) * pointerLength
        );
        ctx.stroke();
        
        // 渲染中心点
        ctx.fillStyle = this.options.textColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // 渲染数值
        ctx.fillStyle = this.options.textColor;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(1), centerX, centerY + 40);
        
        // 渲染单位
        if (this.data.unit) {
            ctx.font = '14px Arial';
            ctx.fillText(this.data.unit, centerX, centerY + 60);
        }
    }
    
    /**
     * 渲染饼图
     */
    _renderPieChart(ctx) {
        if (!this.data.values || this.data.values.length === 0) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(this.canvas.width, this.canvas.height) / 3;
        
        const values = this.data.values;
        const labels = this.data.labels || values.map((_, i) => `Item ${i + 1}`);
        const total = values.reduce((sum, val) => sum + val, 0);
        
        let currentAngle = -Math.PI / 2;
        
        for (let i = 0; i < values.length; i++) {
            const sliceAngle = (values[i] / total) * 2 * Math.PI;
            
            // 渲染扇形
            ctx.fillStyle = this.options.colors[i % this.options.colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            
            // 渲染标签
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${((values[i] / total) * 100).toFixed(1)}%`, labelX, labelY);
            
            currentAngle += sliceAngle;
        }
    }
    
    /**
     * 渲染网格
     */
    _renderGrid(ctx, x, y, width, height) {
        ctx.strokeStyle = this.options.gridColor;
        ctx.lineWidth = 1;
        
        // 垂直线
        for (let i = 0; i <= 10; i++) {
            const lineX = x + (i / 10) * width;
            ctx.beginPath();
            ctx.moveTo(lineX, y);
            ctx.lineTo(lineX, y + height);
            ctx.stroke();
        }
        
        // 水平线
        for (let i = 0; i <= 10; i++) {
            const lineY = y + (i / 10) * height;
            ctx.beginPath();
            ctx.moveTo(x, lineY);
            ctx.lineTo(x + width, lineY);
            ctx.stroke();
        }
    }
    
    /**
     * 渲染坐标轴
     */
    _renderAxes(ctx, x, y, width, height) {
        ctx.strokeStyle = this.options.textColor;
        ctx.lineWidth = 2;
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.stroke();
    }
    
    /**
     * 渲染图例
     */
    _renderLegend(ctx) {
        if (!this.data.labels) return;
        
        const legendX = this.canvas.width - 120;
        const legendY = 50;
        const legendItemHeight = 20;
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        for (let i = 0; i < this.data.labels.length; i++) {
            const y = legendY + i * legendItemHeight;
            
            // 渲染颜色块
            ctx.fillStyle = this.options.colors[i % this.options.colors.length];
            ctx.fillRect(legendX, y - 8, 12, 12);
            
            // 渲染标签
            ctx.fillStyle = this.options.textColor;
            ctx.fillText(this.data.labels[i], legendX + 20, y);
        }
    }
    
    /**
     * 销毁图表
     */
    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
        this.context = null;
        this.isInitialized = false;
    }
}

/**
 * 性能监控仪表板主类
 */
class PerformanceDashboard {
    constructor(container, options = {}) {
        this.name = 'PerformanceDashboard';
        this.container = container;
        this.options = {
            updateInterval: options.updateInterval || 1000, // 1秒
            maxAlerts: options.maxAlerts || 50,
            autoRefresh: options.autoRefresh !== false,
            showRealTime: options.showRealTime !== false,
            theme: options.theme || 'light',
            ...options
        };
        
        this.metrics = new Map();
        this.charts = new Map();
        this.alerts = [];
        this.isInitialized = false;
        this.updateTimer = null;
        
        this.eventListeners = new Map();
        
        // DOM元素
        this.dashboardElement = null;
        this.metricsContainer = null;
        this.chartsContainer = null;
        this.alertsContainer = null;
        this.controlsContainer = null;
        
        this._initialize();
    }
    
    /**
     * 初始化仪表板
     */
    _initialize() {
        this._createDashboardStructure();
        this._setupDefaultMetrics();
        this._setupEventListeners();
        
        if (this.options.autoRefresh) {
            this._startAutoRefresh();
        }
        
        this.isInitialized = true;
        this._emitEvent('initialized', { dashboard: this });
        
        console.log('性能监控仪表板初始化完成');
    }
    
    /**
     * 创建仪表板结构
     */
    _createDashboardStructure() {
        // 主容器
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.className = `performance-dashboard theme-${this.options.theme}`;
        this.dashboardElement.innerHTML = `
            <div class="dashboard-header">
                <h2>性能监控仪表板</h2>
                <div class="dashboard-controls"></div>
            </div>
            <div class="dashboard-content">
                <div class="metrics-section">
                    <h3>关键指标</h3>
                    <div class="metrics-container"></div>
                </div>
                <div class="charts-section">
                    <h3>性能图表</h3>
                    <div class="charts-container"></div>
                </div>
                <div class="alerts-section">
                    <h3>警报信息</h3>
                    <div class="alerts-container"></div>
                </div>
            </div>
        `;
        
        // 添加样式
        this._addStyles();
        
        // 获取容器引用
        this.controlsContainer = this.dashboardElement.querySelector('.dashboard-controls');
        this.metricsContainer = this.dashboardElement.querySelector('.metrics-container');
        this.chartsContainer = this.dashboardElement.querySelector('.charts-container');
        this.alertsContainer = this.dashboardElement.querySelector('.alerts-container');
        
        // 添加控制按钮
        this._createControls();
        
        // 添加到页面
        this.container.appendChild(this.dashboardElement);
    }
    
    /**
     * 添加样式
     */
    _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .performance-dashboard {
                font-family: Arial, sans-serif;
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .performance-dashboard.theme-dark {
                background: #2d3748;
                color: #e2e8f0;
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #dee2e6;
            }
            
            .dashboard-header h2 {
                margin: 0;
                color: #495057;
            }
            
            .theme-dark .dashboard-header h2 {
                color: #e2e8f0;
            }
            
            .dashboard-controls {
                display: flex;
                gap: 10px;
            }
            
            .dashboard-controls button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background: #007bff;
                color: white;
                cursor: pointer;
                font-size: 14px;
            }
            
            .dashboard-controls button:hover {
                background: #0056b3;
            }
            
            .dashboard-controls button:disabled {
                background: #6c757d;
                cursor: not-allowed;
            }
            
            .dashboard-content {
                display: grid;
                grid-template-columns: 1fr 2fr;
                grid-template-rows: auto auto;
                gap: 20px;
            }
            
            .metrics-section {
                grid-column: 1;
                grid-row: 1;
            }
            
            .charts-section {
                grid-column: 2;
                grid-row: 1 / 3;
            }
            
            .alerts-section {
                grid-column: 1;
                grid-row: 2;
            }
            
            .metrics-section h3,
            .charts-section h3,
            .alerts-section h3 {
                margin: 0 0 15px 0;
                color: #495057;
                font-size: 18px;
            }
            
            .theme-dark .metrics-section h3,
            .theme-dark .charts-section h3,
            .theme-dark .alerts-section h3 {
                color: #e2e8f0;
            }
            
            .metrics-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .metric-card {
                background: white;
                border-radius: 6px;
                padding: 15px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border-left: 4px solid #007bff;
            }
            
            .theme-dark .metric-card {
                background: #4a5568;
                color: #e2e8f0;
            }
            
            .metric-card.warning {
                border-left-color: #ffc107;
            }
            
            .metric-card.error {
                border-left-color: #dc3545;
            }
            
            .metric-card.critical {
                border-left-color: #dc3545;
                background: #fff5f5;
            }
            
            .theme-dark .metric-card.critical {
                background: #742a2a;
            }
            
            .metric-name {
                font-size: 14px;
                color: #6c757d;
                margin-bottom: 5px;
            }
            
            .theme-dark .metric-name {
                color: #a0aec0;
            }
            
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                color: #495057;
            }
            
            .theme-dark .metric-value {
                color: #e2e8f0;
            }
            
            .metric-unit {
                font-size: 14px;
                color: #6c757d;
                margin-left: 5px;
            }
            
            .charts-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }
            
            .chart-card {
                background: white;
                border-radius: 6px;
                padding: 15px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .theme-dark .chart-card {
                background: #4a5568;
            }
            
            .alerts-container {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .alert-item {
                background: white;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 10px;
                border-left: 4px solid #17a2b8;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .theme-dark .alert-item {
                background: #4a5568;
                color: #e2e8f0;
            }
            
            .alert-item.warning {
                border-left-color: #ffc107;
            }
            
            .alert-item.error {
                border-left-color: #dc3545;
            }
            
            .alert-item.critical {
                border-left-color: #dc3545;
                background: #fff5f5;
            }
            
            .theme-dark .alert-item.critical {
                background: #742a2a;
            }
            
            .alert-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .alert-level {
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 3px;
                background: #17a2b8;
                color: white;
                text-transform: uppercase;
            }
            
            .alert-level.warning {
                background: #ffc107;
                color: #212529;
            }
            
            .alert-level.error {
                background: #dc3545;
            }
            
            .alert-level.critical {
                background: #dc3545;
                animation: blink 1s infinite;
            }
            
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.5; }
            }
            
            .alert-time {
                font-size: 12px;
                color: #6c757d;
            }
            
            .theme-dark .alert-time {
                color: #a0aec0;
            }
            
            .alert-message {
                font-size: 14px;
                line-height: 1.4;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 创建控制按钮
     */
    _createControls() {
        const refreshButton = document.createElement('button');
        refreshButton.textContent = '刷新';
        refreshButton.onclick = () => this.refresh();
        
        const resetButton = document.createElement('button');
        resetButton.textContent = '重置';
        resetButton.onclick = () => this.reset();
        
        const exportButton = document.createElement('button');
        exportButton.textContent = '导出';
        exportButton.onclick = () => this.exportData();
        
        this.controlsContainer.appendChild(refreshButton);
        this.controlsContainer.appendChild(resetButton);
        this.controlsContainer.appendChild(exportButton);
    }
    
    /**
     * 设置默认指标
     */
    _setupDefaultMetrics() {
        // FPS指标
        this.addMetric(new PerformanceMetric(
            MetricType.FPS,
            '帧率',
            {
                unit: 'fps',
                description: '每秒渲染帧数',
                minValue: 0,
                maxValue: 60,
                warningThreshold: 20,
                errorThreshold: 15,
                criticalThreshold: 10
            }
        ));
        
        // 内存使用率
        this.addMetric(new PerformanceMetric(
            MetricType.MEMORY_USAGE,
            '内存使用率',
            {
                unit: '%',
                description: '内存使用百分比',
                minValue: 0,
                maxValue: 100,
                warningThreshold: 70,
                errorThreshold: 85,
                criticalThreshold: 95
            }
        ));
        
        // 推理时间
        this.addMetric(new PerformanceMetric(
            MetricType.INFERENCE_TIME,
            '推理时间',
            {
                unit: 'ms',
                description: '模型推理耗时',
                minValue: 0,
                maxValue: 100,
                warningThreshold: 50,
                errorThreshold: 70,
                criticalThreshold: 90
            }
        ));
        
        // 缓存命中率
        this.addMetric(new PerformanceMetric(
            MetricType.CACHE_HIT_RATE,
            '缓存命中率',
            {
                unit: '%',
                description: '缓存命中百分比',
                minValue: 0,
                maxValue: 100,
                warningThreshold: 50,
                errorThreshold: 30,
                criticalThreshold: 20
            }
        ));
    }
    
    /**
     * 设置事件监听器
     */
    _setupEventListeners() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this._resizeCharts();
        });
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._pauseAutoRefresh();
            } else {
                this._resumeAutoRefresh();
            }
        });
    }
    
    /**
     * 添加性能指标
     */
    addMetric(metric) {
        this.metrics.set(metric.type, metric);
        this._createMetricCard(metric);
        this._createMetricChart(metric);
        
        this._emitEvent('metricAdded', { metric });
    }
    
    /**
     * 更新指标值
     */
    updateMetric(type, value, timestamp = Date.now()) {
        const metric = this.metrics.get(type);
        if (!metric) return;
        
        const oldLevel = metric.alertLevel;
        metric.addValue(value, timestamp);
        
        // 检查是否需要发出警报
        if (metric.alertLevel !== oldLevel && metric.alertLevel !== AlertLevel.INFO) {
            this._createAlert(metric, metric.alertLevel, `${metric.name}达到${metric.alertLevel}级别: ${value}${metric.unit}`);
        }
        
        this._emitEvent('metricUpdated', { metric, value, timestamp });
    }
    
    /**
     * 获取指标
     */
    getMetric(type) {
        return this.metrics.get(type);
    }
    
    /**
     * 获取所有指标
     */
    getAllMetrics() {
        return Array.from(this.metrics.values());
    }
    
    /**
     * 创建警报
     */
    createAlert(level, message, metricType = null) {
        const metric = metricType ? this.metrics.get(metricType) : null;
        const alert = new PerformanceAlert(metric, level, message);
        
        this.alerts.unshift(alert);
        
        // 保持警报数量限制
        if (this.alerts.length > this.options.maxAlerts) {
            this.alerts = this.alerts.slice(0, this.options.maxAlerts);
        }
        
        this._renderAlert(alert);
        this._emitEvent('alertCreated', { alert });
        
        return alert;
    }
    
    /**
     * 获取活跃警报
     */
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.isResolved());
    }
    
    /**
     * 确认警报
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledge();
            this._updateAlertDisplay(alert);
            this._emitEvent('alertAcknowledged', { alert });
        }
    }
    
    /**
     * 解决警报
     */
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolve();
            this._updateAlertDisplay(alert);
            this._emitEvent('alertResolved', { alert });
        }
    }
    
    /**
     * 刷新仪表板
     */
    refresh() {
        this._updateMetricCards();
        this._updateCharts();
        this._updateAlerts();
        
        this._emitEvent('refreshed', { dashboard: this });
    }
    
    /**
     * 重置仪表板
     */
    reset() {
        // 重置所有指标
        this.metrics.forEach(metric => metric.reset());
        
        // 清空警报
        this.alerts = [];
        
        // 更新显示
        this.refresh();
        
        this._emitEvent('reset', { dashboard: this });
    }
    
    /**
     * 导出数据
     */
    exportData() {
        const data = {
            timestamp: Date.now(),
            metrics: {},
            alerts: this.alerts.map(alert => ({
                id: alert.id,
                level: alert.level,
                message: alert.message,
                timestamp: alert.timestamp,
                acknowledged: alert.acknowledged,
                resolved: alert.isResolved()
            }))
        };
        
        // 导出指标数据
        this.metrics.forEach((metric, type) => {
            data.metrics[type] = {
                stats: metric.getStats(),
                recentValues: metric.getRecentValues(50)
            };
        });
        
        // 创建下载链接
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-data-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this._emitEvent('dataExported', { data });
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        // 停止自动刷新
        this._stopAutoRefresh();
        
        // 销毁图表
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        
        // 清理DOM
        if (this.dashboardElement && this.dashboardElement.parentNode) {
            this.dashboardElement.parentNode.removeChild(this.dashboardElement);
        }
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        this.isInitialized = false;
        console.log('性能监控仪表板已清理');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 创建指标卡片
     */
    _createMetricCard(metric) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.id = `metric-${metric.type}`;
        card.innerHTML = `
            <div class="metric-name">${metric.name}</div>
            <div class="metric-value">
                <span class="value">0</span>
                <span class="metric-unit">${metric.unit}</span>
            </div>
        `;
        
        this.metricsContainer.appendChild(card);
    }
    
    /**
     * 创建指标图表
     */
    _createMetricChart(metric) {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-card';
        
        let chartType = ChartType.LINE;
        if (metric.type === MetricType.MEMORY_USAGE || 
            metric.type === MetricType.CPU_USAGE || 
            metric.type === MetricType.CACHE_HIT_RATE) {
            chartType = ChartType.GAUGE;
        }
        
        const chart = new ChartComponent(chartContainer, chartType, {
            title: metric.name,
            width: 380,
            height: 250
        });
        
        this.charts.set(metric.type, chart);
        this.chartsContainer.appendChild(chartContainer);
    }
    
    /**
     * 创建警报
     */
    _createAlert(metric, level, message) {
        const alert = new PerformanceAlert(metric, level, message);
        this.alerts.unshift(alert);
        
        if (this.alerts.length > this.options.maxAlerts) {
            this.alerts = this.alerts.slice(0, this.options.maxAlerts);
        }
        
        this._renderAlert(alert);
        return alert;
    }
    
    /**
     * 渲染警报
     */
    _renderAlert(alert) {
        const alertElement = document.createElement('div');
        alertElement.className = `alert-item ${alert.level}`;
        alertElement.id = `alert-${alert.id}`;
        alertElement.innerHTML = `
            <div class="alert-header">
                <span class="alert-level ${alert.level}">${alert.level}</span>
                <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="alert-message">${alert.message}</div>
        `;
        
        this.alertsContainer.insertBefore(alertElement, this.alertsContainer.firstChild);
    }
    
    /**
     * 更新指标卡片
     */
    _updateMetricCards() {
        this.metrics.forEach(metric => {
            const card = document.getElementById(`metric-${metric.type}`);
            if (card) {
                const valueElement = card.querySelector('.value');
                if (valueElement) {
                    valueElement.textContent = metric.currentValue.toFixed(1);
                }
                
                // 更新样式
                card.className = `metric-card ${metric.alertLevel}`;
            }
        });
    }
    
    /**
     * 更新图表
     */
    _updateCharts() {
        this.metrics.forEach((metric, type) => {
            const chart = this.charts.get(type);
            if (chart) {
                if (chart.type === ChartType.GAUGE) {
                    chart.updateData({
                        value: metric.currentValue,
                        minValue: metric.minValue,
                        maxValue: metric.maxValue,
                        unit: metric.unit
                    });
                } else {
                    const recentData = metric.getRecentValues(20);
                    chart.updateData({
                        values: recentData.values,
                        timestamps: recentData.timestamps
                    });
                }
            }
        });
    }
    
    /**
     * 更新警报显示
     */
    _updateAlerts() {
        // 清空现有警报显示
        this.alertsContainer.innerHTML = '';
        
        // 重新渲染所有警报
        this.alerts.forEach(alert => {
            this._renderAlert(alert);
        });
    }
    
    /**
     * 更新警报显示
     */
    _updateAlertDisplay(alert) {
        const alertElement = document.getElementById(`alert-${alert.id}`);
        if (alertElement) {
            if (alert.acknowledged) {
                alertElement.style.opacity = '0.6';
            }
            if (alert.isResolved()) {
                alertElement.style.display = 'none';
            }
        }
    }
    
    /**
     * 调整图表大小
     */
    _resizeCharts() {
        this.charts.forEach(chart => {
            chart.render();
        });
    }
    
    /**
     * 开始自动刷新
     */
    _startAutoRefresh() {
        if (this.updateTimer) return;
        
        this.updateTimer = setInterval(() => {
            this.refresh();
        }, this.options.updateInterval);
    }
    
    /**
     * 停止自动刷新
     */
    _stopAutoRefresh() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * 暂停自动刷新
     */
    _pauseAutoRefresh() {
        this._stopAutoRefresh();
    }
    
    /**
     * 恢复自动刷新
     */
    _resumeAutoRefresh() {
        if (this.options.autoRefresh) {
            this._startAutoRefresh();
        }
    }
    
    /**
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Dashboard event callback error (${event}):`, error);
                }
            });
        }
    }
}

export default PerformanceDashboard;
export {
    PerformanceMetric,
    PerformanceAlert,
    ChartComponent,
    MetricType,
    AlertLevel,
    ChartType
};