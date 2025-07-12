import { CONFIG } from './constants.js';

// 扩展Window接口以包含TensorFlow.js和性能相关属性
declare global {
  interface Window {
    tf?: any;
    gc?: () => void;
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// 性能指标接口
interface PerformanceMetrics {
  frameRate: number;
  averageFrameTime: number;
  inferenceTime: number;
  memoryUsage: number | MemoryUsage;
  cacheHitRate: number | string;
  totalFrames: number;
  droppedFrames: number;
  tensorflowMemory?: TensorFlowMemory;
}

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

interface TensorFlowMemory {
  numTensors: number;
  numDataBuffers: number;
  numBytes: number;
}

export interface PerformanceReport extends PerformanceMetrics {
  frameDropRate: string;
  timestamp: string;
}

interface OptimizationSuggestion {
  type: 'info' | 'warning' | 'error';
  message: string;
}

/**
 * 性能监控工具类
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameBuffer: number[];
  private lastFrameTime: number;
  private fpsUpdateTime: number;
  private isMonitoring: boolean;

  constructor() {
        this.metrics = {
            frameRate: 0,
            averageFrameTime: 0,
            inferenceTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0,
            totalFrames: 0,
            droppedFrames: 0
        };
        
        this.frameBuffer = [];
        this.lastFrameTime = performance.now();
        this.fpsUpdateTime = 0;
        this.isMonitoring = false;
    }
    
    /**
     * 开始性能监控
     */
    start() {
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        this.fpsUpdateTime = this.lastFrameTime;
        console.log('📊 性能监控已启动');
    }
    
    /**
     * 停止性能监控
     */
    stop() {
        this.isMonitoring = false;
        console.log('📊 性能监控已停止');
    }
    
    /**
     * 记录帧开始时间
     * @returns {number} 帧开始时间戳
     */
    frameStart() {
        if (!this.isMonitoring) return performance.now();
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        
        // 更新帧缓冲区
        this.frameBuffer.push(frameTime);
        if (this.frameBuffer.length > CONFIG.PERFORMANCE.PERFORMANCE_BUFFER_SIZE) {
            this.frameBuffer.shift();
        }
        
        // 检查丢帧
        if (frameTime > CONFIG.PERFORMANCE.MAX_FRAME_TIME) {
            this.metrics.droppedFrames++;
        }
        
        this.metrics.totalFrames++;
        this.lastFrameTime = now;
        
        // 定期更新FPS
        if (now - this.fpsUpdateTime >= CONFIG.PERFORMANCE.FPS_UPDATE_INTERVAL) {
            this.updateFPS();
            this.fpsUpdateTime = now;
        }
        
        return now;
    }
    
    /**
     * 记录帧结束时间并计算推理时间
     * @param {number} startTime - 帧开始时间戳
     */
    frameEnd(startTime: number): void {
        if (!this.isMonitoring) return;
        
        const endTime = performance.now();
        this.metrics.inferenceTime = endTime - startTime;
    }
    
    /**
     * 更新FPS计算
     */
    updateFPS(): void {
        if (this.frameBuffer.length === 0) return;
        
        const averageFrameTime = this.frameBuffer.reduce((sum, time) => sum + time, 0) / this.frameBuffer.length;
        this.metrics.averageFrameTime = averageFrameTime;
        this.metrics.frameRate = averageFrameTime > 0 ? 1000 / averageFrameTime : 0;
    }
    
    /**
     * 更新内存使用情况
     */
    updateMemoryUsage(): void {
        if (!this.isMonitoring) return;
        
        if (performance.memory) {
            this.metrics.memoryUsage = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        
        // TensorFlow.js 内存使用
        if (window.tf && window.tf.memory) {
            const tfMemory = window.tf.memory();
            this.metrics.tensorflowMemory = {
                numTensors: tfMemory.numTensors,
                numDataBuffers: tfMemory.numDataBuffers,
                numBytes: Math.round(tfMemory.numBytes / 1024 / 1024)
            };
        }
    }
    
    /**
     * 更新缓存命中率
     * @param {number} hits - 缓存命中次数
     * @param {number} total - 总请求次数
     */
    updateCacheHitRate(hits: number, total: number): void {
        this.metrics.cacheHitRate = total > 0 ? (hits / total * 100).toFixed(1) : 0;
    }
    
    /**
     * 获取性能报告
     * @returns {Object} 性能指标对象
     */
    getReport(): PerformanceReport {
        this.updateMemoryUsage();
        
        return {
            ...this.metrics,
            frameDropRate: this.metrics.totalFrames > 0 ? 
                (this.metrics.droppedFrames / this.metrics.totalFrames * 100).toFixed(1) : '0',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 重置性能指标
     */
    reset(): void {
        this.metrics = {
            frameRate: 0,
            averageFrameTime: 0,
            inferenceTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0,
            totalFrames: 0,
            droppedFrames: 0
        };
        this.frameBuffer = [];
        console.log('📊 性能指标已重置');
    }
    
    /**
     * 输出性能日志
     */
    logPerformance(): void {
        const report = this.getReport();
        console.log('📊 性能报告:', {
            'FPS': report.frameRate.toFixed(1),
            '平均帧时间': report.averageFrameTime.toFixed(1) + 'ms',
            '推理时间': report.inferenceTime.toFixed(1) + 'ms',
            '丢帧率': report.frameDropRate + '%',
            '缓存命中率': report.cacheHitRate + '%',
            '总帧数': report.totalFrames
        });
        
        if (report.memoryUsage && typeof report.memoryUsage === 'object') {
            console.log('💾 内存使用:', {
                'JS堆': `${report.memoryUsage.used}MB / ${report.memoryUsage.total}MB`,
                '限制': `${report.memoryUsage.limit}MB`
            });
        }
        
        if (report.tensorflowMemory) {
            console.log('🤖 TensorFlow内存:', {
                '张量数量': report.tensorflowMemory.numTensors,
                '数据缓冲区': report.tensorflowMemory.numDataBuffers,
                '内存使用': `${report.tensorflowMemory.numBytes}MB`
            });
        }
    }
}

/**
 * 性能优化建议工具
 */
export class PerformanceOptimizer {
    /**
     * 分析性能并提供优化建议
     * @param {Object} metrics - 性能指标
     * @returns {Array} 优化建议列表
     */
    static analyzeAndSuggest(metrics: PerformanceReport): OptimizationSuggestion[] {
        const suggestions = [];
        
        // FPS过低
        if (metrics.frameRate < 20) {
            suggestions.push({
                type: 'warning' as const,
                message: 'FPS过低，建议降低视频分辨率或使用更轻量的模型'
            });
        }
        
        // 推理时间过长
        if (metrics.inferenceTime > 50) {
            suggestions.push({
                type: 'warning' as const,
                message: '模型推理时间过长，建议使用GPU加速或更快的模型'
            });
        }
        
        // 丢帧率过高
        if (parseFloat(metrics.frameDropRate) > 10) {
            suggestions.push({
                type: 'error' as const,
                message: '丢帧率过高，建议优化渲染逻辑或降低处理频率'
            });
        }
        
        // 内存使用过高
        if (metrics.memoryUsage && typeof metrics.memoryUsage === 'object' && 
            'used' in metrics.memoryUsage && 'limit' in metrics.memoryUsage &&
            metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.8) {
            suggestions.push({
                type: 'error' as const,
                message: '内存使用接近限制，建议清理缓存或重启应用'
            });
        }
        
        // TensorFlow内存泄漏
        if (metrics.tensorflowMemory && metrics.tensorflowMemory.numTensors > 1000) {
            suggestions.push({
                type: 'warning' as const,
                message: 'TensorFlow张量数量过多，可能存在内存泄漏'
            });
        }
        
        // 缓存命中率过低
        const cacheHitRate = typeof metrics.cacheHitRate === 'string' ? 
            parseFloat(metrics.cacheHitRate) : metrics.cacheHitRate;
        if (cacheHitRate < 50) {
            suggestions.push({
                type: 'info' as const,
                message: '缓存命中率较低，建议预加载常用模型'
            });
        }
        
        return suggestions;
    }
    
    /**
     * 自动优化TensorFlow.js性能
     */
    static async optimizeTensorFlow(): Promise<void> {
        if (!window.tf) return;
        
        try {
            // 设置后端
            await window.tf.setBackend('webgl');
            
            // 启用内存增长
            window.tf.env().set('WEBGL_MEMORY_GROWTH', true);
            
            // 设置最大纹理大小
            window.tf.env().set('WEBGL_MAX_TEXTURE_SIZE', 4096);
            
            // 启用打包优化
            window.tf.env().set('WEBGL_PACK', true);
            
            console.log('🚀 TensorFlow.js性能优化已应用');
        } catch (error) {
            console.warn('⚠️ TensorFlow.js性能优化失败:', error);
        }
    }
    
    /**
     * 清理TensorFlow.js内存
     */
    static cleanupTensorFlowMemory(): void {
        if (!window.tf) return;
        
        try {
            // 获取当前内存信息
            const memoryBefore = window.tf.memory();
            console.log('🔍 清理前内存状态:', {
                tensors: memoryBefore.numTensors,
                dataBuffers: memoryBefore.numDataBuffers,
                bytes: Math.round(memoryBefore.numBytes / 1024 / 1024) + 'MB'
            });
            
            // 清理变量
            window.tf.disposeVariables();
            
            // 安全地结束作用域
            const engine = window.tf.engine();
            if (engine && engine.scopeStack && engine.scopeStack.length > 0) {
                try {
                    engine.endScope();
                } catch (scopeError) {
                    const errorMessage = scopeError instanceof Error ? scopeError.message : String(scopeError);
                    console.warn('⚠️ 结束作用域时出错:', errorMessage);
                }
            }
            
            // 清理孤立张量
            window.tf.tidy(() => {});
            
            // 强制垃圾回收
            if (window.gc) {
                window.gc();
            }
            
            // 获取清理后内存信息
            const memoryAfter = window.tf.memory();
            console.log('✅ 清理后内存状态:', {
                tensors: memoryAfter.numTensors,
                dataBuffers: memoryAfter.numDataBuffers,
                bytes: Math.round(memoryAfter.numBytes / 1024 / 1024) + 'MB'
            });
            
            const freedTensors = memoryBefore.numTensors - memoryAfter.numTensors;
            const freedMemory = Math.round((memoryBefore.numBytes - memoryAfter.numBytes) / 1024 / 1024);
            
            console.log('🧹 TensorFlow.js内存清理完成', {
                '释放张量': freedTensors,
                '释放内存': freedMemory + 'MB'
            });
        } catch (error) {
            console.error('❌ TensorFlow.js内存清理失败:', error);
            throw error;
        }
    }
}

/**
 * 性能监控单例实例
 */
export const performanceMonitor = new PerformanceMonitor();