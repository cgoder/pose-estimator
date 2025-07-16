/**
 * 多平台兼容性模块
 * 确保系统在不同平台和设备上的兼容性
 * 基于架构设计文档实现
 */

/**
 * 平台类型枚举
 */
export const PlatformType = {
    WEB: 'web',                         // Web浏览器
    MOBILE_WEB: 'mobile_web',           // 移动端Web
    DESKTOP: 'desktop',                 // 桌面应用
    MOBILE_APP: 'mobile_app',           // 移动应用
    TABLET: 'tablet',                   // 平板设备
    TV: 'tv',                          // 智能电视
    EMBEDDED: 'embedded',               // 嵌入式设备
    IOT: 'iot'                         // 物联网设备
};

/**
 * 操作系统类型枚举
 */
export const OSType = {
    WINDOWS: 'windows',
    MACOS: 'macos',
    LINUX: 'linux',
    ANDROID: 'android',
    IOS: 'ios',
    CHROME_OS: 'chromeos',
    UBUNTU: 'ubuntu',
    UNKNOWN: 'unknown'
};

/**
 * 浏览器类型枚举
 */
export const BrowserType = {
    CHROME: 'chrome',
    FIREFOX: 'firefox',
    SAFARI: 'safari',
    EDGE: 'edge',
    OPERA: 'opera',
    IE: 'ie',
    SAMSUNG: 'samsung',
    UC: 'uc',
    UNKNOWN: 'unknown'
};

/**
 * 设备类型枚举
 */
export const DeviceType = {
    DESKTOP: 'desktop',
    LAPTOP: 'laptop',
    TABLET: 'tablet',
    MOBILE: 'mobile',
    TV: 'tv',
    WATCH: 'watch',
    EMBEDDED: 'embedded',
    UNKNOWN: 'unknown'
};

/**
 * 特性支持级别枚举
 */
export const FeatureSupportLevel = {
    FULL: 'full',                       // 完全支持
    PARTIAL: 'partial',                 // 部分支持
    POLYFILL: 'polyfill',              // 需要polyfill
    UNSUPPORTED: 'unsupported'          // 不支持
};

/**
 * 平台检测器类
 */
class PlatformDetector {
    constructor() {
        this.userAgent = navigator.userAgent;
        this.platform = navigator.platform;
        this.vendor = navigator.vendor;
        
        this.detectionResult = {
            platform: this._detectPlatform(),
            os: this._detectOS(),
            browser: this._detectBrowser(),
            device: this._detectDevice(),
            capabilities: this._detectCapabilities(),
            limitations: this._detectLimitations()
        };
    }
    
    /**
     * 获取检测结果
     */
    getDetectionResult() {
        return { ...this.detectionResult };
    }
    
    /**
     * 检测平台类型
     */
    _detectPlatform() {
        const ua = this.userAgent.toLowerCase();
        
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return PlatformType.MOBILE_WEB;
        }
        
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return PlatformType.TABLET;
        }
        
        if (ua.includes('smart-tv') || ua.includes('tizen') || ua.includes('webos')) {
            return PlatformType.TV;
        }
        
        // 检查是否为Electron应用
        if (window.process && window.process.versions && window.process.versions.electron) {
            return PlatformType.DESKTOP;
        }
        
        return PlatformType.WEB;
    }
    
    /**
     * 检测操作系统
     */
    _detectOS() {
        const ua = this.userAgent.toLowerCase();
        const platform = this.platform.toLowerCase();
        
        if (ua.includes('windows') || platform.includes('win')) {
            return OSType.WINDOWS;
        }
        
        if (ua.includes('mac') || platform.includes('mac')) {
            return ua.includes('iphone') || ua.includes('ipad') ? OSType.IOS : OSType.MACOS;
        }
        
        if (ua.includes('linux') || platform.includes('linux')) {
            if (ua.includes('android')) {
                return OSType.ANDROID;
            }
            if (ua.includes('ubuntu')) {
                return OSType.UBUNTU;
            }
            return OSType.LINUX;
        }
        
        if (ua.includes('cros')) {
            return OSType.CHROME_OS;
        }
        
        return OSType.UNKNOWN;
    }
    
    /**
     * 检测浏览器类型
     */
    _detectBrowser() {
        const ua = this.userAgent.toLowerCase();
        
        if (ua.includes('chrome') && !ua.includes('edge')) {
            if (ua.includes('samsung')) {
                return { type: BrowserType.SAMSUNG, version: this._extractVersion(ua, 'samsungbrowser') };
            }
            return { type: BrowserType.CHROME, version: this._extractVersion(ua, 'chrome') };
        }
        
        if (ua.includes('firefox')) {
            return { type: BrowserType.FIREFOX, version: this._extractVersion(ua, 'firefox') };
        }
        
        if (ua.includes('safari') && !ua.includes('chrome')) {
            return { type: BrowserType.SAFARI, version: this._extractVersion(ua, 'version') };
        }
        
        if (ua.includes('edge')) {
            return { type: BrowserType.EDGE, version: this._extractVersion(ua, 'edge') };
        }
        
        if (ua.includes('opera') || ua.includes('opr')) {
            return { type: BrowserType.OPERA, version: this._extractVersion(ua, 'opr') };
        }
        
        if (ua.includes('trident') || ua.includes('msie')) {
            return { type: BrowserType.IE, version: this._extractVersion(ua, 'msie') };
        }
        
        if (ua.includes('ucbrowser')) {
            return { type: BrowserType.UC, version: this._extractVersion(ua, 'ucbrowser') };
        }
        
        return { type: BrowserType.UNKNOWN, version: '0.0.0' };
    }
    
    /**
     * 检测设备类型
     */
    _detectDevice() {
        const ua = this.userAgent.toLowerCase();
        
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return DeviceType.MOBILE;
        }
        
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return DeviceType.TABLET;
        }
        
        if (ua.includes('smart-tv') || ua.includes('tizen') || ua.includes('webos')) {
            return DeviceType.TV;
        }
        
        // 基于屏幕尺寸判断
        if (window.screen) {
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const maxDimension = Math.max(screenWidth, screenHeight);
            
            if (maxDimension <= 768) {
                return DeviceType.MOBILE;
            } else if (maxDimension <= 1024) {
                return DeviceType.TABLET;
            }
        }
        
        return DeviceType.DESKTOP;
    }
    
    /**
     * 检测设备能力
     */
    _detectCapabilities() {
        return {
            // 基础Web API支持
            webgl: this._checkWebGLSupport(),
            webgl2: this._checkWebGL2Support(),
            webassembly: this._checkWebAssemblySupport(),
            webworkers: this._checkWebWorkersSupport(),
            serviceworkers: this._checkServiceWorkersSupport(),
            
            // 媒体API支持
            getUserMedia: this._checkGetUserMediaSupport(),
            mediaRecorder: this._checkMediaRecorderSupport(),
            webrtc: this._checkWebRTCSupport(),
            
            // 存储API支持
            localStorage: this._checkLocalStorageSupport(),
            sessionStorage: this._checkSessionStorageSupport(),
            indexedDB: this._checkIndexedDBSupport(),
            
            // 设备API支持
            deviceOrientation: this._checkDeviceOrientationSupport(),
            deviceMotion: this._checkDeviceMotionSupport(),
            geolocation: this._checkGeolocationSupport(),
            
            // 性能API支持
            performanceObserver: this._checkPerformanceObserverSupport(),
            intersectionObserver: this._checkIntersectionObserverSupport(),
            
            // 硬件信息
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            deviceMemory: navigator.deviceMemory || 0,
            
            // 网络信息
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
    
    /**
     * 检测平台限制
     */
    _detectLimitations() {
        const limitations = [];
        
        // iOS Safari限制
        if (this.detectionResult.os === OSType.IOS) {
            limitations.push('ios_safari_video_autoplay');
            limitations.push('ios_safari_fullscreen_api');
            limitations.push('ios_safari_webgl_context_limit');
        }
        
        // 移动设备限制
        if (this.detectionResult.device === DeviceType.MOBILE) {
            limitations.push('mobile_performance_constraints');
            limitations.push('mobile_memory_constraints');
            limitations.push('mobile_battery_constraints');
        }
        
        // 旧版浏览器限制
        const browserVersion = parseFloat(this.detectionResult.browser.version);
        if (this.detectionResult.browser.type === BrowserType.IE) {
            limitations.push('ie_compatibility_issues');
        }
        
        if (this.detectionResult.browser.type === BrowserType.SAFARI && browserVersion < 14) {
            limitations.push('safari_webgl2_limited_support');
        }
        
        return limitations;
    }
    
    /**
     * 提取版本号
     */
    _extractVersion(ua, keyword) {
        const regex = new RegExp(keyword + '\\/(\\d+(?:\\.\\d+)*)', 'i');
        const match = ua.match(regex);
        return match ? match[1] : '0.0.0';
    }
    
    // ==================== 特性检测方法 ====================
    
    _checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }
    
    _checkWebGL2Support() {
        try {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext('webgl2');
        } catch (e) {
            return false;
        }
    }
    
    _checkWebAssemblySupport() {
        return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    }
    
    _checkWebWorkersSupport() {
        return typeof Worker !== 'undefined';
    }
    
    _checkServiceWorkersSupport() {
        return 'serviceWorker' in navigator;
    }
    
    _checkGetUserMediaSupport() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    
    _checkMediaRecorderSupport() {
        return typeof MediaRecorder !== 'undefined';
    }
    
    _checkWebRTCSupport() {
        return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
    }
    
    _checkLocalStorageSupport() {
        try {
            return typeof localStorage !== 'undefined' && localStorage !== null;
        } catch (e) {
            return false;
        }
    }
    
    _checkSessionStorageSupport() {
        try {
            return typeof sessionStorage !== 'undefined' && sessionStorage !== null;
        } catch (e) {
            return false;
        }
    }
    
    _checkIndexedDBSupport() {
        return 'indexedDB' in window;
    }
    
    _checkDeviceOrientationSupport() {
        return 'DeviceOrientationEvent' in window;
    }
    
    _checkDeviceMotionSupport() {
        return 'DeviceMotionEvent' in window;
    }
    
    _checkGeolocationSupport() {
        return 'geolocation' in navigator;
    }
    
    _checkPerformanceObserverSupport() {
        return 'PerformanceObserver' in window;
    }
    
    _checkIntersectionObserverSupport() {
        return 'IntersectionObserver' in window;
    }
}

/**
 * 特性适配器类
 */
class FeatureAdapter {
    constructor(platformInfo) {
        this.platformInfo = platformInfo;
        this.polyfills = new Map();
        this.adaptations = new Map();
        
        this._initializeAdaptations();
    }
    
    /**
     * 检查特性支持情况
     */
    checkFeatureSupport(feature) {
        const capabilities = this.platformInfo.capabilities;
        
        switch (feature) {
            case 'webgl':
                return capabilities.webgl ? FeatureSupportLevel.FULL : FeatureSupportLevel.UNSUPPORTED;
            
            case 'webgl2':
                return capabilities.webgl2 ? FeatureSupportLevel.FULL : 
                       capabilities.webgl ? FeatureSupportLevel.PARTIAL : FeatureSupportLevel.UNSUPPORTED;
            
            case 'webassembly':
                return capabilities.webassembly ? FeatureSupportLevel.FULL : FeatureSupportLevel.UNSUPPORTED;
            
            case 'camera':
                return capabilities.getUserMedia ? FeatureSupportLevel.FULL : FeatureSupportLevel.UNSUPPORTED;
            
            case 'fullscreen':
                if (this.platformInfo.os === OSType.IOS) {
                    return FeatureSupportLevel.PARTIAL;
                }
                return document.fullscreenEnabled ? FeatureSupportLevel.FULL : FeatureSupportLevel.UNSUPPORTED;
            
            case 'orientation':
                return capabilities.deviceOrientation ? FeatureSupportLevel.FULL : FeatureSupportLevel.UNSUPPORTED;
            
            default:
                return FeatureSupportLevel.UNKNOWN;
        }
    }
    
    /**
     * 获取特性的适配方案
     */
    getFeatureAdaptation(feature) {
        return this.adaptations.get(feature) || null;
    }
    
    /**
     * 应用特性适配
     */
    async applyFeatureAdaptation(feature, options = {}) {
        const adaptation = this.getFeatureAdaptation(feature);
        if (!adaptation) {
            throw new Error(`No adaptation available for feature: ${feature}`);
        }
        
        return await adaptation.apply(options);
    }
    
    /**
     * 初始化适配方案
     */
    _initializeAdaptations() {
        // WebGL适配
        this.adaptations.set('webgl', {
            apply: async (options) => {
                if (!this.platformInfo.capabilities.webgl) {
                    throw new Error('WebGL not supported');
                }
                
                const canvas = options.canvas || document.createElement('canvas');
                const contextOptions = {
                    antialias: this.platformInfo.device !== DeviceType.MOBILE,
                    alpha: false,
                    depth: true,
                    stencil: false,
                    preserveDrawingBuffer: false,
                    powerPreference: this.platformInfo.device === DeviceType.MOBILE ? 'low-power' : 'high-performance',
                    ...options.contextOptions
                };
                
                const gl = canvas.getContext('webgl2', contextOptions) || 
                          canvas.getContext('webgl', contextOptions) || 
                          canvas.getContext('experimental-webgl', contextOptions);
                
                if (!gl) {
                    throw new Error('Failed to get WebGL context');
                }
                
                return gl;
            }
        });
        
        // 摄像头适配
        this.adaptations.set('camera', {
            apply: async (options) => {
                if (!this.platformInfo.capabilities.getUserMedia) {
                    throw new Error('Camera not supported');
                }
                
                const constraints = {
                    video: {
                        width: { ideal: this.platformInfo.device === DeviceType.MOBILE ? 640 : 1280 },
                        height: { ideal: this.platformInfo.device === DeviceType.MOBILE ? 480 : 720 },
                        frameRate: { ideal: this.platformInfo.device === DeviceType.MOBILE ? 15 : 30 },
                        facingMode: options.facingMode || 'user'
                    },
                    audio: false,
                    ...options.constraints
                };
                
                try {
                    return await navigator.mediaDevices.getUserMedia(constraints);
                } catch (error) {
                    // 降级处理
                    if (constraints.video.width) {
                        constraints.video = { facingMode: constraints.video.facingMode };
                        return await navigator.mediaDevices.getUserMedia(constraints);
                    }
                    throw error;
                }
            }
        });
        
        // 全屏适配
        this.adaptations.set('fullscreen', {
            apply: async (options) => {
                const element = options.element || document.documentElement;
                
                if (this.platformInfo.os === OSType.IOS) {
                    // iOS Safari的特殊处理
                    element.style.position = 'fixed';
                    element.style.top = '0';
                    element.style.left = '0';
                    element.style.width = '100vw';
                    element.style.height = '100vh';
                    element.style.zIndex = '9999';
                    return true;
                }
                
                const requestFullscreen = element.requestFullscreen ||
                                        element.webkitRequestFullscreen ||
                                        element.mozRequestFullScreen ||
                                        element.msRequestFullscreen;
                
                if (requestFullscreen) {
                    await requestFullscreen.call(element);
                    return true;
                }
                
                return false;
            }
        });
        
        // 设备方向适配
        this.adaptations.set('orientation', {
            apply: async (options) => {
                if (!this.platformInfo.capabilities.deviceOrientation) {
                    throw new Error('Device orientation not supported');
                }
                
                return new Promise((resolve, reject) => {
                    const handleOrientation = (event) => {
                        const orientation = {
                            alpha: event.alpha,
                            beta: event.beta,
                            gamma: event.gamma
                        };
                        
                        if (options.callback) {
                            options.callback(orientation);
                        }
                        
                        if (!options.continuous) {
                            window.removeEventListener('deviceorientation', handleOrientation);
                            resolve(orientation);
                        }
                    };
                    
                    // iOS 13+需要请求权限
                    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                        DeviceOrientationEvent.requestPermission()
                            .then(response => {
                                if (response === 'granted') {
                                    window.addEventListener('deviceorientation', handleOrientation);
                                    if (options.continuous) {
                                        resolve(() => window.removeEventListener('deviceorientation', handleOrientation));
                                    }
                                } else {
                                    reject(new Error('Device orientation permission denied'));
                                }
                            })
                            .catch(reject);
                    } else {
                        window.addEventListener('deviceorientation', handleOrientation);
                        if (options.continuous) {
                            resolve(() => window.removeEventListener('deviceorientation', handleOrientation));
                        }
                    }
                });
            }
        });
        
        // 性能适配
        this.adaptations.set('performance', {
            apply: async (options) => {
                const performanceLevel = this._assessPerformanceLevel();
                
                const adaptedOptions = {
                    ...options,
                    quality: this._adaptQualityForPerformance(options.quality, performanceLevel),
                    frameRate: this._adaptFrameRateForPerformance(options.frameRate, performanceLevel),
                    resolution: this._adaptResolutionForPerformance(options.resolution, performanceLevel)
                };
                
                return adaptedOptions;
            }
        });
    }
    
    /**
     * 评估性能级别
     */
    _assessPerformanceLevel() {
        const capabilities = this.platformInfo.capabilities;
        let score = 0;
        
        // CPU评分
        if (capabilities.hardwareConcurrency >= 8) score += 30;
        else if (capabilities.hardwareConcurrency >= 4) score += 20;
        else if (capabilities.hardwareConcurrency >= 2) score += 10;
        
        // 内存评分
        if (capabilities.deviceMemory >= 8) score += 25;
        else if (capabilities.deviceMemory >= 4) score += 15;
        else if (capabilities.deviceMemory >= 2) score += 10;
        
        // GPU评分
        if (capabilities.webgl2) score += 25;
        else if (capabilities.webgl) score += 15;
        
        // 设备类型调整
        if (this.platformInfo.device === DeviceType.MOBILE) score *= 0.7;
        else if (this.platformInfo.device === DeviceType.TABLET) score *= 0.8;
        
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }
    
    /**
     * 根据性能调整质量
     */
    _adaptQualityForPerformance(quality, performanceLevel) {
        const qualityMap = {
            high: { high: 'high', medium: 'medium', low: 'low' },
            medium: { high: 'medium', medium: 'medium', low: 'low' },
            low: { high: 'low', medium: 'low', low: 'low' }
        };
        
        return qualityMap[performanceLevel][quality] || quality;
    }
    
    /**
     * 根据性能调整帧率
     */
    _adaptFrameRateForPerformance(frameRate, performanceLevel) {
        const frameRateMap = {
            high: frameRate,
            medium: Math.min(frameRate, 30),
            low: Math.min(frameRate, 15)
        };
        
        return frameRateMap[performanceLevel] || frameRate;
    }
    
    /**
     * 根据性能调整分辨率
     */
    _adaptResolutionForPerformance(resolution, performanceLevel) {
        if (!resolution) return resolution;
        
        const scaleFactor = {
            high: 1.0,
            medium: 0.8,
            low: 0.6
        }[performanceLevel] || 1.0;
        
        return {
            width: Math.floor(resolution.width * scaleFactor),
            height: Math.floor(resolution.height * scaleFactor)
        };
    }
}

/**
 * 多平台兼容性管理器主类
 */
class CrossPlatformCompatibility {
    constructor(options = {}) {
        this.name = 'CrossPlatformCompatibility';
        this.options = {
            enableAutoAdaptation: options.enableAutoAdaptation !== false,
            enablePerformanceOptimization: options.enablePerformanceOptimization !== false,
            enableFeatureDetection: options.enableFeatureDetection !== false,
            ...options
        };
        
        this.platformDetector = new PlatformDetector();
        this.platformInfo = this.platformDetector.getDetectionResult();
        this.featureAdapter = new FeatureAdapter(this.platformInfo);
        
        this.isInitialized = false;
        this.adaptationCache = new Map();
        
        this.eventListeners = new Map();
        
        console.log('多平台兼容性管理器初始化完成');
        console.log('平台信息:', this.platformInfo);
    }
    
    /**
     * 初始化兼容性管理器
     */
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // 应用自动适配
            if (this.options.enableAutoAdaptation) {
                await this._applyAutoAdaptations();
            }
            
            // 设置性能优化
            if (this.options.enablePerformanceOptimization) {
                this._setupPerformanceOptimizations();
            }
            
            // 设置事件监听
            this._setupEventListeners();
            
            this.isInitialized = true;
            
            this._emitEvent('initialized', { platformInfo: this.platformInfo });
            
            console.log('多平台兼容性管理器初始化完成');
            return true;
            
        } catch (error) {
            console.error('多平台兼容性管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取平台信息
     */
    getPlatformInfo() {
        return { ...this.platformInfo };
    }
    
    /**
     * 检查特性支持
     */
    checkFeatureSupport(feature) {
        return this.featureAdapter.checkFeatureSupport(feature);
    }
    
    /**
     * 获取适配的配置
     */
    async getAdaptedConfig(baseConfig) {
        const cacheKey = JSON.stringify(baseConfig);
        
        if (this.adaptationCache.has(cacheKey)) {
            return this.adaptationCache.get(cacheKey);
        }
        
        const adaptedConfig = await this._adaptConfig(baseConfig);
        this.adaptationCache.set(cacheKey, adaptedConfig);
        
        return adaptedConfig;
    }
    
    /**
     * 应用特性适配
     */
    async applyFeatureAdaptation(feature, options = {}) {
        return await this.featureAdapter.applyFeatureAdaptation(feature, options);
    }
    
    /**
     * 获取推荐的渲染配置
     */
    getRecommendedRenderConfig() {
        const device = this.platformInfo.device;
        const capabilities = this.platformInfo.capabilities;
        
        const baseConfig = {
            antialias: device !== DeviceType.MOBILE,
            alpha: false,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: false,
            powerPreference: device === DeviceType.MOBILE ? 'low-power' : 'high-performance'
        };
        
        // 根据WebGL支持情况调整
        if (!capabilities.webgl2) {
            baseConfig.antialias = false;
        }
        
        // 根据设备性能调整
        if (device === DeviceType.MOBILE) {
            baseConfig.maxTextureSize = 1024;
            baseConfig.maxFrameRate = 30;
        } else {
            baseConfig.maxTextureSize = 2048;
            baseConfig.maxFrameRate = 60;
        }
        
        return baseConfig;
    }
    
    /**
     * 获取推荐的相机配置
     */
    getRecommendedCameraConfig() {
        const device = this.platformInfo.device;
        
        const baseConfig = {
            video: {
                width: { ideal: device === DeviceType.MOBILE ? 640 : 1280 },
                height: { ideal: device === DeviceType.MOBILE ? 480 : 720 },
                frameRate: { ideal: device === DeviceType.MOBILE ? 15 : 30 },
                facingMode: 'user'
            },
            audio: false
        };
        
        // iOS特殊处理
        if (this.platformInfo.os === OSType.IOS) {
            baseConfig.video.width = { max: 640 };
            baseConfig.video.height = { max: 480 };
            baseConfig.video.frameRate = { max: 30 };
        }
        
        return baseConfig;
    }
    
    /**
     * 检查是否需要polyfill
     */
    needsPolyfill(feature) {
        const support = this.checkFeatureSupport(feature);
        return support === FeatureSupportLevel.POLYFILL || support === FeatureSupportLevel.UNSUPPORTED;
    }
    
    /**
     * 获取平台限制信息
     */
    getPlatformLimitations() {
        return [...this.platformInfo.limitations];
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
     * 销毁兼容性管理器
     */
    destroy() {
        this.adaptationCache.clear();
        this.eventListeners.clear();
        
        console.log('多平台兼容性管理器已销毁');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 应用自动适配
     */
    async _applyAutoAdaptations() {
        // CSS适配
        this._applyCSSAdaptations();
        
        // 触摸事件适配
        this._applyTouchAdaptations();
        
        // 视口适配
        this._applyViewportAdaptations();
    }
    
    /**
     * 应用CSS适配
     */
    _applyCSSAdaptations() {
        const style = document.createElement('style');
        let css = '';
        
        // 移动设备适配
        if (this.platformInfo.device === DeviceType.MOBILE) {
            css += `
                * {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                }
                
                body {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: none;
                }
            `;
        }
        
        // iOS Safari适配
        if (this.platformInfo.os === OSType.IOS) {
            css += `
                body {
                    position: fixed;
                    overflow: hidden;
                    width: 100%;
                    height: 100%;
                }
            `;
        }
        
        style.textContent = css;
        document.head.appendChild(style);
    }
    
    /**
     * 应用触摸事件适配
     */
    _applyTouchAdaptations() {
        if (this.platformInfo.device === DeviceType.MOBILE || this.platformInfo.device === DeviceType.TABLET) {
            // 防止双击缩放
            document.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            // 防止双击缩放的另一种方法
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, { passive: false });
        }
    }
    
    /**
     * 应用视口适配
     */
    _applyViewportAdaptations() {
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        let content = 'width=device-width, initial-scale=1.0';
        
        // 移动设备禁用缩放
        if (this.platformInfo.device === DeviceType.MOBILE) {
            content += ', user-scalable=no, maximum-scale=1.0, minimum-scale=1.0';
        }
        
        // iOS Safari特殊处理
        if (this.platformInfo.os === OSType.IOS) {
            content += ', viewport-fit=cover';
        }
        
        viewport.content = content;
    }
    
    /**
     * 设置性能优化
     */
    _setupPerformanceOptimizations() {
        // 移动设备性能优化
        if (this.platformInfo.device === DeviceType.MOBILE) {
            // 减少重绘
            document.body.style.transform = 'translateZ(0)';
            
            // 优化滚动性能
            document.body.style.webkitOverflowScrolling = 'touch';
        }
        
        // 低性能设备优化
        if (this.platformInfo.capabilities.hardwareConcurrency <= 2) {
            // 降低动画帧率
            if (window.requestAnimationFrame) {
                const originalRAF = window.requestAnimationFrame;
                let frameCount = 0;
                
                window.requestAnimationFrame = function(callback) {
                    return originalRAF(() => {
                        frameCount++;
                        if (frameCount % 2 === 0) { // 降低到30fps
                            callback();
                        }
                    });
                };
            }
        }
    }
    
    /**
     * 设置事件监听
     */
    _setupEventListeners() {
        // 监听屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this._emitEvent('orientationChanged', {
                    orientation: window.orientation || 0
                });
            }, 100);
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this._emitEvent('windowResized', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        });
        
        // 监听网络状态变化
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this._emitEvent('connectionChanged', {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt
                });
            });
        }
    }
    
    /**
     * 适配配置
     */
    async _adaptConfig(baseConfig) {
        const adaptedConfig = { ...baseConfig };
        
        // 性能适配
        if (this.options.enablePerformanceOptimization) {
            const performanceAdaptation = await this.featureAdapter.applyFeatureAdaptation('performance', baseConfig);
            Object.assign(adaptedConfig, performanceAdaptation);
        }
        
        // 平台特定适配
        if (this.platformInfo.os === OSType.IOS) {
            adaptedConfig.iosSpecific = true;
            adaptedConfig.autoplay = false; // iOS不支持自动播放
        }
        
        if (this.platformInfo.device === DeviceType.MOBILE) {
            adaptedConfig.mobileOptimized = true;
            adaptedConfig.touchEnabled = true;
        }
        
        return adaptedConfig;
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
                    console.error(`多平台兼容性管理器事件回调错误 (${event}):`, error);
                }
            });
        }
    }
}

export default CrossPlatformCompatibility;
export {
    PlatformDetector,
    FeatureAdapter,
    PlatformType,
    OSType,
    BrowserType,
    DeviceType,
    FeatureSupportLevel
};