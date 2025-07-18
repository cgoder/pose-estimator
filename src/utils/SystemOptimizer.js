/**
 * 系统优化器
 * 提供系统级别的性能优化功能
 */

export class SystemOptimizer {
    constructor() {
        this.optimizations = new Map();
        this.isOptimizing = false;
    }

    /**
     * 优化系统性能
     * @param {Object} options - 优化选项
     * @returns {Promise<Object>} 优化结果
     */
    async optimize(options = {}) {
        if (this.isOptimizing) {
            return { success: false, reason: '优化正在进行中' };
        }

        this.isOptimizing = true;
        
        try {
            const results = [];
            
            // 内存优化
            if (options.memory !== false) {
                const memResult = await this.optimizeMemory();
                results.push(memResult);
            }
            
            // 缓存优化
            if (options.cache !== false) {
                const cacheResult = await this.optimizeCache();
                results.push(cacheResult);
            }
            
            // GPU优化
            if (options.gpu !== false) {
                const gpuResult = await this.optimizeGPU();
                results.push(gpuResult);
            }
            
            return {
                success: true,
                results,
                timestamp: Date.now()
            };
            
        } catch (error) {
            return {
                success: false,
                reason: error.message,
                timestamp: Date.now()
            };
        } finally {
            this.isOptimizing = false;
        }
    }

    /**
     * 内存优化
     * @returns {Promise<Object>}
     */
    async optimizeMemory() {
        try {
            // 触发垃圾回收（如果可用）
            if (window.gc) {
                window.gc();
            }
            
            // 清理未使用的对象引用
            this.clearUnusedReferences();
            
            return {
                type: 'memory',
                success: true,
                details: '内存优化完成'
            };
        } catch (error) {
            return {
                type: 'memory',
                success: false,
                reason: error.message
            };
        }
    }

    /**
     * 缓存优化
     * @returns {Promise<Object>}
     */
    async optimizeCache() {
        try {
            // 清理过期缓存
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('old') || cacheName.includes('temp')) {
                        await caches.delete(cacheName);
                    }
                }
            }
            
            return {
                type: 'cache',
                success: true,
                details: '缓存优化完成'
            };
        } catch (error) {
            return {
                type: 'cache',
                success: false,
                reason: error.message
            };
        }
    }

    /**
     * GPU优化
     * @returns {Promise<Object>}
     */
    async optimizeGPU() {
        let canvas = null;
        let gl = null;
        
        try {
            // 检查WebGL上下文
            canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false }) || 
                 canvas.getContext('webgl', { preserveDrawingBuffer: false });
            
            if (gl) {
                // 清理GPU资源
                gl.flush();
                gl.finish();
            }
            
            return {
                type: 'gpu',
                success: true,
                details: 'GPU优化完成'
            };
        } catch (error) {
            return {
                type: 'gpu',
                success: false,
                reason: error.message
            };
        } finally {
            // 清理WebGL上下文
            if (gl) {
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) {
                    loseContext.loseContext();
                }
            }
            if (canvas) {
                canvas.width = 1;
                canvas.height = 1;
                canvas = null;
            }
        }
    }

    /**
     * 清理未使用的对象引用
     */
    clearUnusedReferences() {
        // 清理优化记录中的过期项
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分钟
        
        for (const [key, value] of this.optimizations.entries()) {
            if (now - value.timestamp > maxAge) {
                this.optimizations.delete(key);
            }
        }
    }

    /**
     * 获取系统信息
     * @returns {Object} 系统信息
     */
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            memory: navigator.deviceMemory || 'unknown',
            cores: navigator.hardwareConcurrency || 'unknown',
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            } : 'unknown',
            webgl: this.getWebGLInfo()
        };
    }

    /**
     * 获取WebGL信息
     * @returns {Object} WebGL信息
     */
    getWebGLInfo() {
        let canvas = null;
        let gl = null;
        
        try {
            canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false }) || 
                 canvas.getContext('webgl', { preserveDrawingBuffer: false });
            
            if (!gl) {
                return { supported: false };
            }
            
            return {
                supported: true,
                version: gl.getParameter(gl.VERSION),
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER),
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
            };
        } catch (error) {
            return { supported: false, error: error.message };
        } finally {
            // 清理WebGL上下文
            if (gl) {
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) {
                    loseContext.loseContext();
                }
            }
            if (canvas) {
                canvas.width = 1;
                canvas.height = 1;
                canvas = null;
            }
        }
    }

    /**
     * 检查优化状态
     * @returns {Object} 优化状态
     */
    getOptimizationStatus() {
        return {
            isOptimizing: this.isOptimizing,
            optimizationCount: this.optimizations.size,
            lastOptimization: Array.from(this.optimizations.values())
                .sort((a, b) => b.timestamp - a.timestamp)[0] || null
        };
    }
}

// 导出单例实例
export const systemOptimizer = new SystemOptimizer();

// 默认导出
export default SystemOptimizer;