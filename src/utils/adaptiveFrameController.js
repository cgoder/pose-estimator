/**
 * 自适应帧率控制器
 * 根据设备性能和推理时间动态调整处理频率，优化CPU使用率
 */
export class AdaptiveFrameController {
    constructor(options = {}) {
        // 配置参数
        this.targetFPS = options.targetFPS || 30;
        this.minFPS = options.minFPS || 10;
        this.maxFPS = options.maxFPS || 60;
        this.adaptationSpeed = options.adaptationSpeed || 0.1;
        
        // 性能指标
        this.actualFPS = 0;
        this.averageInferenceTime = 0;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastInferenceTime = 0;
        this.lastFrameTime = 0;
        
        // 统计数据
        this.frameCount = 0;
        this.skippedFrames = 0;
        this.inferenceTimeBuffer = [];
        this.bufferSize = 10;
        
        // 设备性能评分
        this.deviceScore = 0;
        this.isInitialized = false;
        
        console.log('🎯 自适应帧率控制器已初始化', {
            targetFPS: this.targetFPS,
            minFPS: this.minFPS,
            maxFPS: this.maxFPS
        });
    }
    
    /**
     * 初始化设备性能评估
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            this.deviceScore = await this.benchmarkDevice();
            this.adjustInitialSettings();
            this.isInitialized = true;
            
            console.log('📊 设备性能评估完成', {
                score: this.deviceScore,
                initialTargetFPS: this.targetFPS
            });
        } catch (error) {
            console.warn('⚠️ 设备性能评估失败，使用默认设置:', error);
            this.deviceScore = 50; // 默认中等性能
            this.isInitialized = true;
        }
    }
    
    /**
     * 设备性能基准测试
     */
    async benchmarkDevice() {
        const startTime = performance.now();
        let score = 50; // 基础分数
        
        // CPU 核心数评估
        const cores = navigator.hardwareConcurrency || 4;
        score += Math.min(cores * 5, 30);
        
        // 内存评估
        if (navigator.deviceMemory) {
            score += Math.min(navigator.deviceMemory * 5, 20);
        }
        
        // WebGL 性能测试
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
                const renderer = gl.getParameter(gl.RENDERER);
                if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
                    score += 20;
                } else if (renderer.includes('Intel')) {
                    score += 10;
                }
            }
        } catch (error) {
            score -= 10;
        }
        
        // 简单计算性能测试
        const iterations = 100000;
        const calcStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            Math.sin(i) * Math.cos(i);
        }
        const calcTime = performance.now() - calcStart;
        
        if (calcTime < 10) score += 15;
        else if (calcTime < 20) score += 10;
        else if (calcTime > 50) score -= 15;
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 根据设备性能调整初始设置
     */
    adjustInitialSettings() {
        if (this.deviceScore > 80) {
            this.targetFPS = 30;
            this.maxFPS = 60;
        } else if (this.deviceScore > 60) {
            this.targetFPS = 25;
            this.maxFPS = 30;
        } else if (this.deviceScore > 40) {
            this.targetFPS = 20;
            this.maxFPS = 25;
        } else {
            this.targetFPS = 15;
            this.maxFPS = 20;
        }
        
        this.frameInterval = 1000 / this.targetFPS;
    }
    
    /**
     * 判断是否应该处理当前帧
     */
    shouldProcessFrame() {
        const now = performance.now();
        
        // 检查是否达到帧间隔
        if (now - this.lastInferenceTime < this.frameInterval) {
            this.skippedFrames++;
            return false;
        }
        
        this.lastInferenceTime = now;
        this.frameCount++;
        
        // 更新实际FPS
        if (this.lastFrameTime > 0) {
            const frameDelta = now - this.lastFrameTime;
            this.actualFPS = 1000 / frameDelta;
        }
        this.lastFrameTime = now;
        
        return true;
    }
    
    /**
     * 记录推理时间并自适应调整
     */
    recordInferenceTime(inferenceTime) {
        // 更新推理时间缓冲区
        this.inferenceTimeBuffer.push(inferenceTime);
        if (this.inferenceTimeBuffer.length > this.bufferSize) {
            this.inferenceTimeBuffer.shift();
        }
        
        // 计算平均推理时间
        this.averageInferenceTime = this.inferenceTimeBuffer.reduce((a, b) => a + b, 0) / this.inferenceTimeBuffer.length;
        
        // 自适应调整帧率
        this.adaptFrameRate();
    }
    
    /**
     * 自适应帧率调整算法
     */
    adaptFrameRate() {
        if (this.inferenceTimeBuffer.length < 3) return;
        
        const targetFrameTime = 1000 / this.targetFPS;
        const overhead = 5; // 5ms 开销预留
        const availableTime = targetFrameTime - overhead;
        
        let newTargetFPS = this.targetFPS;
        
        // 如果推理时间过长，降低帧率
        if (this.averageInferenceTime > availableTime) {
            const ratio = availableTime / this.averageInferenceTime;
            newTargetFPS = Math.max(this.minFPS, this.targetFPS * ratio * 0.9);
        }
        // 如果推理时间充足，可以提高帧率
        else if (this.averageInferenceTime < availableTime * 0.7) {
            const ratio = availableTime / this.averageInferenceTime;
            newTargetFPS = Math.min(this.maxFPS, this.targetFPS * Math.min(ratio * 0.8, 1.2));
        }
        
        // 平滑调整
        const adjustment = (newTargetFPS - this.targetFPS) * this.adaptationSpeed;
        this.targetFPS = Math.max(this.minFPS, Math.min(this.maxFPS, this.targetFPS + adjustment));
        this.frameInterval = 1000 / this.targetFPS;
    }
    
    /**
     * 获取性能统计
     */
    getStats() {
        const totalFrames = this.frameCount + this.skippedFrames;
        const skipRate = totalFrames > 0 ? (this.skippedFrames / totalFrames * 100).toFixed(1) : 0;
        
        return {
            targetFPS: Math.round(this.targetFPS * 10) / 10,
            actualFPS: Math.round(this.actualFPS * 10) / 10,
            averageInferenceTime: Math.round(this.averageInferenceTime * 10) / 10,
            processedFrames: this.frameCount,
            skippedFrames: this.skippedFrames,
            skipRate: parseFloat(skipRate),
            deviceScore: this.deviceScore,
            efficiency: this.calculateEfficiency()
        };
    }
    
    /**
     * 计算处理效率
     */
    calculateEfficiency() {
        if (this.averageInferenceTime === 0) return 100;
        
        const targetFrameTime = 1000 / this.targetFPS;
        const efficiency = Math.max(0, Math.min(100, 
            (1 - this.averageInferenceTime / targetFrameTime) * 100
        ));
        
        return Math.round(efficiency);
    }
    
    /**
     * 强制设置目标帧率
     */
    setTargetFPS(fps) {
        this.targetFPS = Math.max(this.minFPS, Math.min(this.maxFPS, fps));
        this.frameInterval = 1000 / this.targetFPS;
        
        console.log('🎯 目标帧率已调整为:', this.targetFPS);
    }
    
    /**
     * 重置统计数据
     */
    reset() {
        this.frameCount = 0;
        this.skippedFrames = 0;
        this.inferenceTimeBuffer = [];
        this.lastInferenceTime = 0;
        this.lastFrameTime = 0;
        this.actualFPS = 0;
        this.averageInferenceTime = 0;
        
        console.log('🔄 帧率控制器统计已重置');
    }
    
    /**
     * 输出性能日志
     */
    logPerformance() {
        const stats = this.getStats();
        console.log('🎯 帧率控制器性能报告:', {
            '目标FPS': stats.targetFPS,
            '实际FPS': stats.actualFPS,
            '平均推理时间': stats.averageInferenceTime + 'ms',
            '处理帧数': stats.processedFrames,
            '跳过帧数': stats.skippedFrames,
            '跳帧率': stats.skipRate + '%',
            '处理效率': stats.efficiency + '%',
            '设备评分': stats.deviceScore
        });
    }
}

/**
 * 全局自适应帧率控制器实例
 */
export const adaptiveFrameController = new AdaptiveFrameController({
    targetFPS: 30,
    minFPS: 10,
    maxFPS: 60,
    adaptationSpeed: 0.15
});