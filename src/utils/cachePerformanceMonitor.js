/**
 * 缓存性能监控器
 * 提供详细的缓存性能指标和可视化面板
 */
export class CachePerformanceMonitor {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgLoadTime: 0,
            loadTimes: [],
            memoryUsage: 0,
            cacheSize: 0,
            errorCount: 0,
            lastUpdated: Date.now()
        };
        
        this.isMonitoring = false;
        this.updateInterval = null;
    }
    
    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
        }, 1000);
        
        console.log('📊 缓存性能监控已启动');
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('📊 缓存性能监控已停止');
    }
    
    /**
     * 记录缓存命中
     */
    recordCacheHit(cacheType, loadTime = 0) {
        this.metrics.totalRequests++;
        this.metrics.cacheHits++;
        
        if (loadTime > 0) {
            this.metrics.loadTimes.push(loadTime);
            this.updateAverageLoadTime();
        }
        
        console.log(`📊 缓存命中记录: ${cacheType}, 耗时: ${loadTime}ms`);
    }
    
    /**
     * 记录缓存未命中
     */
    recordCacheMiss(loadTime) {
        this.metrics.totalRequests++;
        this.metrics.cacheMisses++;
        this.metrics.loadTimes.push(loadTime);
        this.updateAverageLoadTime();
        
        console.log(`📊 缓存未命中记录: 耗时: ${loadTime}ms`);
    }
    
    /**
     * 记录错误
     */
    recordError(error) {
        this.metrics.errorCount++;
        console.log(`📊 缓存错误记录:`, error);
    }
    
    /**
     * 更新平均加载时间
     */
    updateAverageLoadTime() {
        if (this.metrics.loadTimes.length === 0) return;
        
        // 保持最近100次记录
        if (this.metrics.loadTimes.length > 100) {
            this.metrics.loadTimes = this.metrics.loadTimes.slice(-100);
        }
        
        const sum = this.metrics.loadTimes.reduce((a, b) => a + b, 0);
        this.metrics.avgLoadTime = sum / this.metrics.loadTimes.length;
    }
    
    /**
     * 更新内存使用情况
     */
    async updateMetrics() {
        try {
            // 更新内存使用情况
            if (performance.memory) {
                this.metrics.memoryUsage = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                };
            }
            
            this.metrics.lastUpdated = Date.now();
        } catch (error) {
            console.warn('📊 性能指标更新失败:', error);
        }
    }
    
    /**
     * 获取缓存命中率
     */
    getHitRate() {
        if (this.metrics.totalRequests === 0) return 0;
        return (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(1);
    }
    
    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            hitRate: this.getHitRate() + '%',
            totalRequests: this.metrics.totalRequests,
            cacheHits: this.metrics.cacheHits,
            cacheMisses: this.metrics.cacheMisses,
            avgLoadTime: Math.round(this.metrics.avgLoadTime) + 'ms',
            memoryUsage: this.metrics.memoryUsage,
            errorCount: this.metrics.errorCount,
            lastUpdated: new Date(this.metrics.lastUpdated).toLocaleTimeString()
        };
    }
    
    /**
     * 创建性能监控面板
     */
    createMonitoringPanel() {
        const panel = document.createElement('div');
        panel.id = 'cache-performance-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(panel);
        return panel;
    }
    
    /**
     * 更新监控面板显示
     */
    updateMonitoringPanel() {
        let panel = document.getElementById('cache-performance-panel');
        if (!panel) {
            panel = this.createMonitoringPanel();
        }
        
        const report = this.getPerformanceReport();
        
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #3498db;">
                📊 缓存性能监控
            </div>
            <div style="margin-bottom: 5px;">
                <span style="color: #2ecc71;">命中率:</span> ${report.hitRate}
            </div>
            <div style="margin-bottom: 5px;">
                <span style="color: #f39c12;">总请求:</span> ${report.totalRequests}
            </div>
            <div style="margin-bottom: 5px;">
                <span style="color: #2ecc71;">命中:</span> ${report.cacheHits} 
                <span style="color: #e74c3c;">未命中:</span> ${report.cacheMisses}
            </div>
            <div style="margin-bottom: 5px;">
                <span style="color: #9b59b6;">平均加载:</span> ${report.avgLoadTime}
            </div>
            ${report.memoryUsage ? `
            <div style="margin-bottom: 5px;">
                <span style="color: #1abc9c;">内存:</span> ${report.memoryUsage.used}MB / ${report.memoryUsage.total}MB
            </div>
            ` : ''}
            <div style="margin-bottom: 5px;">
                <span style="color: #e67e22;">错误:</span> ${report.errorCount}
            </div>
            <div style="font-size: 10px; color: #95a5a6; margin-top: 10px;">
                更新时间: ${report.lastUpdated}
            </div>
        `;
    }
    
    /**
     * 显示监控面板
     */
    showPanel() {
        const panel = document.getElementById('cache-performance-panel');
        if (panel) {
            panel.style.display = 'block';
            this.updateMonitoringPanel();
            
            // 定期更新面板
            if (!this.panelUpdateInterval) {
                this.panelUpdateInterval = setInterval(() => {
                    this.updateMonitoringPanel();
                }, 1000);
            }
        }
    }
    
    /**
     * 隐藏监控面板
     */
    hidePanel() {
        const panel = document.getElementById('cache-performance-panel');
        if (panel) {
            panel.style.display = 'none';
            
            if (this.panelUpdateInterval) {
                clearInterval(this.panelUpdateInterval);
                this.panelUpdateInterval = null;
            }
        }
    }
    
    /**
     * 切换监控面板显示
     */
    togglePanel() {
        const panel = document.getElementById('cache-performance-panel');
        if (panel && panel.style.display === 'block') {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }
    
    /**
     * 导出性能数据
     */
    exportData() {
        const data = {
            metrics: this.metrics,
            report: this.getPerformanceReport(),
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cache-performance-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📊 性能数据已导出');
    }
    
    /**
     * 重置统计数据
     */
    reset() {
        this.metrics = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgLoadTime: 0,
            loadTimes: [],
            memoryUsage: 0,
            cacheSize: 0,
            errorCount: 0,
            lastUpdated: Date.now()
        };
        
        console.log('📊 性能统计已重置');
    }
}

// 创建全局实例
export const cachePerformanceMonitor = new CachePerformanceMonitor();

// 添加键盘快捷键支持
document.addEventListener('keydown', (event) => {
    // Ctrl+Alt+P 切换性能面板 (避免与浏览器 Cmd+Shift+P 冲突)
    if (event.ctrlKey && event.altKey && event.key === 'p') {
        event.preventDefault();
        cachePerformanceMonitor.togglePanel();
    }
    
    // Ctrl+Alt+E 导出性能数据
    if (event.ctrlKey && event.altKey && event.key === 'e') {
        event.preventDefault();
        cachePerformanceMonitor.exportData();
    }
    
    // Ctrl+Alt+R 重置性能统计
    if (event.ctrlKey && event.altKey && event.key === 'r') {
        event.preventDefault();
        cachePerformanceMonitor.reset();
    }
});

// 自动启动监控
cachePerformanceMonitor.startMonitoring();