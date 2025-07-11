/**
 * 环境管理器
 * 负责环境检查、浏览器兼容性检测和配置管理
 */
export class EnvironmentManager {
    constructor() {
        this.environmentInfo = null;
        this.compatibilityCache = new Map();
    }

    /**
     * 初始化环境检查
     * @returns {Object} 环境信息
     */
    async init() {
        this.environmentInfo = {
            browser: this.getBrowserInfo(),
            capabilities: await this.checkCapabilities(),
            security: this.checkSecurityContext(),
            performance: this.checkPerformanceFeatures(),
            timestamp: new Date().toISOString()
        };
        
        return this.environmentInfo;
    }

    /**
     * 获取浏览器信息
     * @returns {Object} 浏览器信息
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        
        // 检测浏览器类型
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';
        
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browserName = 'Chrome';
            const match = userAgent.match(/Chrome\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browserName = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browserName = 'Safari';
            const match = userAgent.match(/Version\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Edg')) {
            browserName = 'Edge';
            const match = userAgent.match(/Edg\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        }
        
        return {
            name: browserName,
            version: browserVersion,
            userAgent,
            platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }

    /**
     * 检查浏览器能力
     * @returns {Object} 能力检查结果
     */
    async checkCapabilities() {
        const capabilities = {
            webgl: this.checkWebGL(),
            webgl2: this.checkWebGL2(),
            indexedDB: this.checkIndexedDB(),
            serviceWorker: this.checkServiceWorker(),
            camera: this.checkCamera(),
            canvas: this.checkCanvas(),
            webAssembly: this.checkWebAssembly(),
            offscreenCanvas: this.checkOffscreenCanvas(),
            webWorkers: this.checkWebWorkers()
        };
        
        // 异步检查摄像头设备
        try {
            capabilities.cameraDevices = await this.getCameraDevices();
        } catch (error) {
            capabilities.cameraDevices = [];
        }
        
        return capabilities;
    }

    /**
     * 检查安全上下文
     * @returns {Object} 安全上下文信息
     */
    checkSecurityContext() {
        const isSecureContext = window.isSecureContext;
        const protocol = location.protocol;
        const hostname = location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        const isHTTPS = protocol === 'https:';
        
        return {
            isSecureContext,
            protocol,
            hostname,
            isLocalhost,
            isHTTPS,
            canAccessCamera: isSecureContext || isLocalhost,
            recommendHTTPS: !isHTTPS && !isLocalhost
        };
    }

    /**
     * 检查性能相关特性
     * @returns {Object} 性能特性信息
     */
    checkPerformanceFeatures() {
        return {
            performanceAPI: 'performance' in window,
            performanceObserver: 'PerformanceObserver' in window,
            requestAnimationFrame: 'requestAnimationFrame' in window,
            requestIdleCallback: 'requestIdleCallback' in window,
            intersectionObserver: 'IntersectionObserver' in window,
            resizeObserver: 'ResizeObserver' in window,
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            deviceMemory: navigator.deviceMemory || 'unknown'
        };
    }

    /**
     * 检查WebGL支持
     * @returns {Object} WebGL支持信息
     */
    checkWebGL() {
        const cacheKey = 'webgl';
        if (this.compatibilityCache.has(cacheKey)) {
            return this.compatibilityCache.get(cacheKey);
        }
        
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                const result = { supported: false, reason: 'WebGL context not available' };
                this.compatibilityCache.set(cacheKey, result);
                return result;
            }
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const result = {
                supported: true,
                version: gl.getParameter(gl.VERSION),
                vendor: gl.getParameter(gl.VENDOR),
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
            };
            
            this.compatibilityCache.set(cacheKey, result);
            return result;
        } catch (error) {
            const result = { supported: false, reason: error.message };
            this.compatibilityCache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * 检查WebGL2支持
     * @returns {Object} WebGL2支持信息
     */
    checkWebGL2() {
        const cacheKey = 'webgl2';
        if (this.compatibilityCache.has(cacheKey)) {
            return this.compatibilityCache.get(cacheKey);
        }
        
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            
            const result = {
                supported: !!gl,
                reason: gl ? 'Available' : 'WebGL2 context not available'
            };
            
            this.compatibilityCache.set(cacheKey, result);
            return result;
        } catch (error) {
            const result = { supported: false, reason: error.message };
            this.compatibilityCache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * 检查IndexedDB支持
     * @returns {Object} IndexedDB支持信息
     */
    checkIndexedDB() {
        const supported = 'indexedDB' in window;
        return {
            supported,
            reason: supported ? 'Available' : 'IndexedDB not supported'
        };
    }

    /**
     * 检查Service Worker支持
     * @returns {Object} Service Worker支持信息
     */
    checkServiceWorker() {
        const supported = 'serviceWorker' in navigator;
        return {
            supported,
            reason: supported ? 'Available' : 'Service Worker not supported'
        };
    }

    /**
     * 检查摄像头API支持
     * @returns {Object} 摄像头API支持信息
     */
    checkCamera() {
        const hasMediaDevices = 'mediaDevices' in navigator;
        const hasGetUserMedia = hasMediaDevices && 'getUserMedia' in navigator.mediaDevices;
        
        return {
            supported: hasGetUserMedia,
            hasMediaDevices,
            hasGetUserMedia,
            reason: hasGetUserMedia ? 'Available' : 'Camera API not supported'
        };
    }

    /**
     * 检查Canvas支持
     * @returns {Object} Canvas支持信息
     */
    checkCanvas() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            return {
                supported: !!ctx,
                reason: ctx ? 'Available' : 'Canvas 2D context not available'
            };
        } catch (error) {
            return {
                supported: false,
                reason: error.message
            };
        }
    }

    /**
     * 检查WebAssembly支持
     * @returns {Object} WebAssembly支持信息
     */
    checkWebAssembly() {
        const supported = 'WebAssembly' in window;
        return {
            supported,
            reason: supported ? 'Available' : 'WebAssembly not supported'
        };
    }

    /**
     * 检查OffscreenCanvas支持
     * @returns {Object} OffscreenCanvas支持信息
     */
    checkOffscreenCanvas() {
        const supported = 'OffscreenCanvas' in window;
        return {
            supported,
            reason: supported ? 'Available' : 'OffscreenCanvas not supported'
        };
    }

    /**
     * 检查Web Workers支持
     * @returns {Object} Web Workers支持信息
     */
    checkWebWorkers() {
        const supported = 'Worker' in window;
        return {
            supported,
            reason: supported ? 'Available' : 'Web Workers not supported'
        };
    }

    /**
     * 获取摄像头设备列表
     * @returns {Array} 摄像头设备列表
     */
    async getCameraDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return [];
        }
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices
                .filter(device => device.kind === 'videoinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
                    groupId: device.groupId
                }));
        } catch (error) {
            console.warn('无法枚举摄像头设备:', error);
            return [];
        }
    }

    /**
     * 检查特定功能的兼容性
     * @param {string} feature - 功能名称
     * @returns {boolean} 是否兼容
     */
    isFeatureSupported(feature) {
        if (!this.environmentInfo) {
            console.warn('环境信息未初始化，请先调用 init() 方法');
            return false;
        }
        
        const capabilities = this.environmentInfo.capabilities;
        
        switch (feature) {
            case 'camera':
                return capabilities.camera.supported && this.environmentInfo.security.canAccessCamera;
            case 'webgl':
                return capabilities.webgl.supported;
            case 'webgl2':
                return capabilities.webgl2.supported;
            case 'indexeddb':
                return capabilities.indexedDB.supported;
            case 'serviceworker':
                return capabilities.serviceWorker.supported;
            case 'canvas':
                return capabilities.canvas.supported;
            case 'webassembly':
                return capabilities.webAssembly.supported;
            default:
                return false;
        }
    }

    /**
     * 获取兼容性报告
     * @returns {Object} 兼容性报告
     */
    getCompatibilityReport() {
        if (!this.environmentInfo) {
            return { error: '环境信息未初始化' };
        }
        
        const { browser, capabilities, security } = this.environmentInfo;
        const issues = [];
        const warnings = [];
        const recommendations = [];
        
        // 检查关键功能
        if (!capabilities.camera.supported) {
            issues.push('浏览器不支持摄像头API');
        } else if (!security.canAccessCamera) {
            issues.push('当前环境无法访问摄像头（需要HTTPS或localhost）');
        }
        
        if (!capabilities.webgl.supported) {
            issues.push('浏览器不支持WebGL，AI模型可能无法正常运行');
        }
        
        if (!capabilities.canvas.supported) {
            issues.push('浏览器不支持Canvas，无法显示姿态检测结果');
        }
        
        // 检查性能相关
        if (!capabilities.webgl2.supported) {
            warnings.push('浏览器不支持WebGL2，可能影响AI模型性能');
        }
        
        if (!capabilities.webAssembly.supported) {
            warnings.push('浏览器不支持WebAssembly，可能影响计算性能');
        }
        
        // 生成建议
        if (security.recommendHTTPS) {
            recommendations.push('建议使用HTTPS协议以获得最佳体验');
        }
        
        if (browser.name === 'Unknown' || parseInt(browser.version) < 80) {
            recommendations.push('建议使用最新版本的现代浏览器（Chrome、Firefox、Safari、Edge）');
        }
        
        return {
            compatible: issues.length === 0,
            issues,
            warnings,
            recommendations,
            browser,
            capabilities,
            security
        };
    }

    /**
     * 获取环境信息
     * @returns {Object} 环境信息
     */
    getEnvironmentInfo() {
        return this.environmentInfo;
    }

    /**
     * 清理缓存
     */
    clearCache() {
        this.compatibilityCache.clear();
    }
}

// 创建全局环境管理器实例
export const environmentManager = new EnvironmentManager();