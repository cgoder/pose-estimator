/**
 * 摄像头性能监控器
 * 监控摄像头操作的性能指标
 */
export class CameraPerformanceMonitor {
    constructor() {
        this.metrics = {
            switchCount: 0,
            switchTimes: [],
            errorCount: 0,
            lastSwitchTime: 0,
            averageSwitchTime: 0,
            setupTimes: [],
            averageSetupTime: 0
        };
    }

    /**
     * 开始监控摄像头切换
     */
    startSwitchMonitoring() {
        return performance.now();
    }

    /**
     * 结束监控摄像头切换
     */
    endSwitchMonitoring(startTime, success = true) {
        const duration = performance.now() - startTime;
        
        if (success) {
            this.metrics.switchCount++;
            this.metrics.switchTimes.push(duration);
            this.metrics.lastSwitchTime = duration;
            
            // 保持最近20次的记录
            if (this.metrics.switchTimes.length > 20) {
                this.metrics.switchTimes.shift();
            }
            
            // 计算平均时间
            this.metrics.averageSwitchTime = 
                this.metrics.switchTimes.reduce((a, b) => a + b, 0) / this.metrics.switchTimes.length;
        } else {
            this.metrics.errorCount++;
        }

        console.log(`📊 摄像头切换${success ? '成功' : '失败'}: ${duration.toFixed(2)}ms`);
    }

    /**
     * 监控摄像头设置
     */
    startSetupMonitoring() {
        return performance.now();
    }

    /**
     * 结束监控摄像头设置
     */
    endSetupMonitoring(startTime) {
        const duration = performance.now() - startTime;
        this.metrics.setupTimes.push(duration);
        
        // 保持最近10次的记录
        if (this.metrics.setupTimes.length > 10) {
            this.metrics.setupTimes.shift();
        }
        
        // 计算平均时间
        this.metrics.averageSetupTime = 
            this.metrics.setupTimes.reduce((a, b) => a + b, 0) / this.metrics.setupTimes.length;

        console.log(`📊 摄像头设置完成: ${duration.toFixed(2)}ms`);
    }

    /**
     * 获取性能报告
     */
    getReport() {
        return {
            ...this.metrics,
            successRate: this.metrics.switchCount > 0 
                ? ((this.metrics.switchCount / (this.metrics.switchCount + this.metrics.errorCount)) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * 重置统计数据
     */
    reset() {
        this.metrics = {
            switchCount: 0,
            switchTimes: [],
            errorCount: 0,
            lastSwitchTime: 0,
            averageSwitchTime: 0,
            setupTimes: [],
            averageSetupTime: 0
        };
    }
}

// 导出单例实例
export const cameraPerformanceMonitor = new CameraPerformanceMonitor();