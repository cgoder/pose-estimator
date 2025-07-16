/**
 * 输入源管理器
 * 统一管理摄像头、视频文件、图像文件、在线视频流等输入源
 * 基于架构设计文档要求实现
 */

/**
 * 输入源类型枚举
 */
export const InputSourceType = {
    CAMERA: 'camera',
    VIDEO_FILE: 'video',
    IMAGE_FILE: 'image',
    ONLINE_STREAM: 'stream',
    SCREEN_CAPTURE: 'screen',
    WEBRTC: 'webrtc'
};

/**
 * 输入源状态枚举
 */
export const InputSourceStatus = {
    IDLE: 'idle',
    INITIALIZING: 'initializing',
    READY: 'ready',
    ACTIVE: 'active',
    ERROR: 'error',
    DISPOSED: 'disposed'
};

/**
 * 输入质量等级
 */
export const QualityLevel = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    ULTRA: 'ultra'
};

/**
 * 输入源抽象接口
 */
class InputSource {
    constructor(type, config = {}) {
        this.type = type;
        this.config = config;
        this.status = InputSourceStatus.IDLE;
        this.element = null;
        this.stream = null;
        this.quality = QualityLevel.MEDIUM;
        this.metadata = {};
        this.eventListeners = new Map();
    }
    
    /**
     * 初始化输入源
     */
    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }
    
    /**
     * 获取当前帧
     */
    async getFrame() {
        throw new Error('getFrame() must be implemented by subclass');
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        throw new Error('cleanup() must be implemented by subclass');
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
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error (${event}):`, error);
                }
            });
        }
    }
}

/**
 * 摄像头输入源
 */
class CameraInputSource extends InputSource {
    constructor(config = {}) {
        super(InputSourceType.CAMERA, config);
        this.facingMode = config.facingMode || 'user';
        this.resolution = config.resolution || { width: 640, height: 480 };
        this.frameRate = config.frameRate || 30;
        this.deviceId = config.deviceId;
    }
    
    async initialize() {
        this.status = InputSourceStatus.INITIALIZING;
        
        try {
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: this.resolution.width },
                    height: { ideal: this.resolution.height },
                    frameRate: { ideal: this.frameRate }
                }
            };
            
            if (this.deviceId) {
                constraints.video.deviceId = { exact: this.deviceId };
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.element = document.createElement('video');
            this.element.srcObject = this.stream;
            this.element.autoplay = true;
            this.element.muted = true;
            this.element.playsInline = true;
            
            await new Promise((resolve, reject) => {
                this.element.onloadedmetadata = () => {
                    this.metadata = {
                        width: this.element.videoWidth,
                        height: this.element.videoHeight,
                        duration: Infinity,
                        frameRate: this.frameRate
                    };
                    resolve();
                };
                this.element.onerror = reject;
            });
            
            this.status = InputSourceStatus.READY;
            this._emitEvent('initialized', { source: this });
            
        } catch (error) {
            this.status = InputSourceStatus.ERROR;
            this._emitEvent('error', { error, source: this });
            throw error;
        }
    }
    
    async getFrame() {
        if (this.status !== InputSourceStatus.READY && this.status !== InputSourceStatus.ACTIVE) {
            throw new Error('Camera not ready');
        }
        
        this.status = InputSourceStatus.ACTIVE;
        return this.element;
    }
    
    async switchCamera() {
        const newFacingMode = this.facingMode === 'user' ? 'environment' : 'user';
        this.facingMode = newFacingMode;
        
        await this.cleanup();
        await this.initialize();
    }
    
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.element) {
            this.element.srcObject = null;
            this.element = null;
        }
        
        this.status = InputSourceStatus.DISPOSED;
        this._emitEvent('disposed', { source: this });
    }
}

/**
 * 视频文件输入源
 */
class VideoFileInputSource extends InputSource {
    constructor(file, config = {}) {
        super(InputSourceType.VIDEO_FILE, config);
        this.file = file;
        this.currentTime = 0;
        this.duration = 0;
        this.isPlaying = false;
    }
    
    async initialize() {
        this.status = InputSourceStatus.INITIALIZING;
        
        try {
            this.element = document.createElement('video');
            this.element.src = URL.createObjectURL(this.file);
            this.element.muted = true;
            this.element.playsInline = true;
            
            await new Promise((resolve, reject) => {
                this.element.onloadedmetadata = () => {
                    this.metadata = {
                        width: this.element.videoWidth,
                        height: this.element.videoHeight,
                        duration: this.element.duration,
                        frameRate: 30 // 估算值
                    };
                    this.duration = this.element.duration;
                    resolve();
                };
                this.element.onerror = reject;
            });
            
            this.status = InputSourceStatus.READY;
            this._emitEvent('initialized', { source: this });
            
        } catch (error) {
            this.status = InputSourceStatus.ERROR;
            this._emitEvent('error', { error, source: this });
            throw error;
        }
    }
    
    async getFrame() {
        if (this.status !== InputSourceStatus.READY && this.status !== InputSourceStatus.ACTIVE) {
            throw new Error('Video not ready');
        }
        
        this.status = InputSourceStatus.ACTIVE;
        return this.element;
    }
    
    play() {
        if (this.element) {
            this.element.play();
            this.isPlaying = true;
        }
    }
    
    pause() {
        if (this.element) {
            this.element.pause();
            this.isPlaying = false;
        }
    }
    
    seek(time) {
        if (this.element) {
            this.element.currentTime = Math.max(0, Math.min(time, this.duration));
            this.currentTime = this.element.currentTime;
        }
    }
    
    cleanup() {
        if (this.element) {
            this.element.pause();
            URL.revokeObjectURL(this.element.src);
            this.element = null;
        }
        
        this.status = InputSourceStatus.DISPOSED;
        this._emitEvent('disposed', { source: this });
    }
}

/**
 * 图像文件输入源
 */
class ImageFileInputSource extends InputSource {
    constructor(file, config = {}) {
        super(InputSourceType.IMAGE_FILE, config);
        this.file = file;
    }
    
    async initialize() {
        this.status = InputSourceStatus.INITIALIZING;
        
        try {
            this.element = document.createElement('img');
            this.element.src = URL.createObjectURL(this.file);
            
            await new Promise((resolve, reject) => {
                this.element.onload = () => {
                    this.metadata = {
                        width: this.element.naturalWidth,
                        height: this.element.naturalHeight,
                        duration: 0,
                        frameRate: 0
                    };
                    resolve();
                };
                this.element.onerror = reject;
            });
            
            this.status = InputSourceStatus.READY;
            this._emitEvent('initialized', { source: this });
            
        } catch (error) {
            this.status = InputSourceStatus.ERROR;
            this._emitEvent('error', { error, source: this });
            throw error;
        }
    }
    
    async getFrame() {
        if (this.status !== InputSourceStatus.READY && this.status !== InputSourceStatus.ACTIVE) {
            throw new Error('Image not ready');
        }
        
        this.status = InputSourceStatus.ACTIVE;
        return this.element;
    }
    
    cleanup() {
        if (this.element) {
            URL.revokeObjectURL(this.element.src);
            this.element = null;
        }
        
        this.status = InputSourceStatus.DISPOSED;
        this._emitEvent('disposed', { source: this });
    }
}

/**
 * 在线视频流输入源
 */
class OnlineStreamInputSource extends InputSource {
    constructor(url, config = {}) {
        super(InputSourceType.ONLINE_STREAM, config);
        this.url = url;
        this.streamType = config.streamType || 'hls'; // hls, dash, webrtc
    }
    
    async initialize() {
        this.status = InputSourceStatus.INITIALIZING;
        
        try {
            this.element = document.createElement('video');
            this.element.crossOrigin = 'anonymous';
            this.element.muted = true;
            this.element.playsInline = true;
            
            // 根据流类型使用不同的加载方式
            if (this.streamType === 'hls' && this._isHLSSupported()) {
                await this._loadHLSStream();
            } else if (this.streamType === 'dash' && this._isDASHSupported()) {
                await this._loadDASHStream();
            } else {
                // 直接加载
                this.element.src = this.url;
            }
            
            await new Promise((resolve, reject) => {
                this.element.onloadedmetadata = () => {
                    this.metadata = {
                        width: this.element.videoWidth,
                        height: this.element.videoHeight,
                        duration: this.element.duration || Infinity,
                        frameRate: 30 // 估算值
                    };
                    resolve();
                };
                this.element.onerror = reject;
                
                // 设置超时
                setTimeout(() => reject(new Error('Stream load timeout')), 10000);
            });
            
            this.status = InputSourceStatus.READY;
            this._emitEvent('initialized', { source: this });
            
        } catch (error) {
            this.status = InputSourceStatus.ERROR;
            this._emitEvent('error', { error, source: this });
            throw error;
        }
    }
    
    async getFrame() {
        if (this.status !== InputSourceStatus.READY && this.status !== InputSourceStatus.ACTIVE) {
            throw new Error('Stream not ready');
        }
        
        this.status = InputSourceStatus.ACTIVE;
        return this.element;
    }
    
    _isHLSSupported() {
        // 检查是否支持HLS
        return this.element.canPlayType('application/vnd.apple.mpegurl') !== '';
    }
    
    _isDASHSupported() {
        // 检查是否支持DASH
        return this.element.canPlayType('application/dash+xml') !== '';
    }
    
    async _loadHLSStream() {
        // 这里可以集成HLS.js库
        console.warn('HLS streaming requires HLS.js library');
        this.element.src = this.url;
    }
    
    async _loadDASHStream() {
        // 这里可以集成DASH.js库
        console.warn('DASH streaming requires DASH.js library');
        this.element.src = this.url;
    }
    
    cleanup() {
        if (this.element) {
            this.element.pause();
            this.element.src = '';
            this.element = null;
        }
        
        this.status = InputSourceStatus.DISPOSED;
        this._emitEvent('disposed', { source: this });
    }
}

/**
 * 输入源管理器主类
 */
class InputSourceManager {
    constructor(config = {}) {
        this.name = 'InputSourceManager';
        this.config = {
            autoQualityAdjustment: true,
            qualityCheckInterval: 5000, // 5秒
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
        
        this.currentSource = null;
        this.availableSources = new Map();
        this.qualityMonitor = null;
        this.eventListeners = new Map();
        this.retryCount = 0;
        
        // 质量监控指标
        this.qualityMetrics = {
            resolution: { width: 0, height: 0 },
            frameRate: 0,
            latency: 0,
            stability: 0,
            clarity: 0,
            overallScore: 0
        };
        
        this._initializeQualityMonitor();
    }
    
    /**
     * 切换输入源
     * @param {string} sourceType - 输入源类型
     * @param {*} sourceData - 输入源数据（文件、URL等）
     * @param {Object} config - 配置选项
     */
    async switchSource(sourceType, sourceData = null, config = {}) {
        try {
            // 清理当前源
            if (this.currentSource) {
                await this._cleanupCurrentSource();
            }
            
            // 创建新的输入源
            const newSource = this._createInputSource(sourceType, sourceData, config);
            
            // 添加事件监听
            this._setupSourceEventListeners(newSource);
            
            // 初始化新源
            await newSource.initialize();
            
            // 设置为当前源
            this.currentSource = newSource;
            this.retryCount = 0;
            
            // 开始质量监控
            this._startQualityMonitoring();
            
            this._emitEvent('sourceChanged', {
                oldSource: null,
                newSource: newSource,
                sourceType: sourceType
            });
            
            console.log(`已切换到输入源: ${sourceType}`);
            return true;
            
        } catch (error) {
            console.error('切换输入源失败:', error);
            
            // 重试机制
            if (this.retryCount < this.config.maxRetries) {
                this.retryCount++;
                console.log(`重试切换输入源 (${this.retryCount}/${this.config.maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                return this.switchSource(sourceType, sourceData, config);
            }
            
            this._emitEvent('sourceError', { error, sourceType });
            throw error;
        }
    }
    
    /**
     * 获取当前帧
     */
    async getCurrentFrame() {
        if (!this.currentSource) {
            throw new Error('没有活动的输入源');
        }
        
        try {
            return await this.currentSource.getFrame();
        } catch (error) {
            this._emitEvent('frameError', { error });
            throw error;
        }
    }
    
    /**
     * 评估输入质量
     */
    assessInputQuality() {
        if (!this.currentSource) {
            return {
                score: 0,
                level: QualityLevel.LOW,
                issues: ['没有输入源'],
                recommendations: ['请选择输入源']
            };
        }
        
        const metrics = this.qualityMetrics;
        const issues = [];
        const recommendations = [];
        
        // 分辨率评估
        const resolution = metrics.resolution.width * metrics.resolution.height;
        let resolutionScore = 0;
        if (resolution >= 1920 * 1080) resolutionScore = 100;
        else if (resolution >= 1280 * 720) resolutionScore = 80;
        else if (resolution >= 640 * 480) resolutionScore = 60;
        else resolutionScore = 40;
        
        // 帧率评估
        let frameRateScore = 0;
        if (metrics.frameRate >= 30) frameRateScore = 100;
        else if (metrics.frameRate >= 24) frameRateScore = 80;
        else if (metrics.frameRate >= 15) frameRateScore = 60;
        else frameRateScore = 40;
        
        // 延迟评估
        let latencyScore = 0;
        if (metrics.latency <= 50) latencyScore = 100;
        else if (metrics.latency <= 100) latencyScore = 80;
        else if (metrics.latency <= 200) latencyScore = 60;
        else latencyScore = 40;
        
        // 综合评分
        const overallScore = (resolutionScore * 0.4 + frameRateScore * 0.3 + latencyScore * 0.3);
        
        // 确定质量等级
        let qualityLevel;
        if (overallScore >= 90) qualityLevel = QualityLevel.ULTRA;
        else if (overallScore >= 75) qualityLevel = QualityLevel.HIGH;
        else if (overallScore >= 60) qualityLevel = QualityLevel.MEDIUM;
        else qualityLevel = QualityLevel.LOW;
        
        // 生成问题和建议
        if (resolutionScore < 80) {
            issues.push('分辨率较低');
            recommendations.push('建议使用更高分辨率的输入源');
        }
        
        if (frameRateScore < 80) {
            issues.push('帧率不足');
            recommendations.push('建议提高帧率或优化网络连接');
        }
        
        if (latencyScore < 80) {
            issues.push('延迟较高');
            recommendations.push('建议优化网络连接或使用本地输入源');
        }
        
        return {
            score: Math.round(overallScore),
            level: qualityLevel,
            metrics: { ...metrics },
            issues,
            recommendations
        };
    }
    
    /**
     * 自适应调整
     */
    adaptToInputSource() {
        if (!this.config.autoQualityAdjustment || !this.currentSource) {
            return;
        }
        
        const quality = this.assessInputQuality();
        
        // 根据质量等级调整参数
        switch (quality.level) {
            case QualityLevel.LOW:
                this._applyLowQualityOptimizations();
                break;
            case QualityLevel.MEDIUM:
                this._applyMediumQualityOptimizations();
                break;
            case QualityLevel.HIGH:
            case QualityLevel.ULTRA:
                this._applyHighQualityOptimizations();
                break;
        }
        
        this._emitEvent('qualityAdjusted', { quality });
    }
    
    /**
     * 获取当前输入源信息
     */
    getCurrentSourceInfo() {
        if (!this.currentSource) {
            return null;
        }
        
        return {
            type: this.currentSource.type,
            status: this.currentSource.status,
            metadata: this.currentSource.metadata,
            quality: this.assessInputQuality()
        };
    }
    
    /**
     * 获取可用的摄像头设备
     */
    async getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices
                .filter(device => device.kind === 'videoinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `摄像头 ${device.deviceId.slice(0, 8)}`,
                    groupId: device.groupId
                }));
        } catch (error) {
            console.error('获取摄像头设备失败:', error);
            return [];
        }
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
    async cleanup() {
        // 停止质量监控
        this._stopQualityMonitoring();
        
        // 清理当前源
        if (this.currentSource) {
            await this._cleanupCurrentSource();
        }
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        console.log('输入源管理器已清理');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 创建输入源实例
     */
    _createInputSource(sourceType, sourceData, config) {
        switch (sourceType) {
            case InputSourceType.CAMERA:
                return new CameraInputSource(config);
            case InputSourceType.VIDEO_FILE:
                if (!sourceData) throw new Error('视频文件输入源需要文件数据');
                return new VideoFileInputSource(sourceData, config);
            case InputSourceType.IMAGE_FILE:
                if (!sourceData) throw new Error('图像文件输入源需要文件数据');
                return new ImageFileInputSource(sourceData, config);
            case InputSourceType.ONLINE_STREAM:
                if (!sourceData) throw new Error('在线流输入源需要URL');
                return new OnlineStreamInputSource(sourceData, config);
            default:
                throw new Error(`不支持的输入源类型: ${sourceType}`);
        }
    }
    
    /**
     * 设置输入源事件监听器
     */
    _setupSourceEventListeners(source) {
        source.addEventListener('error', (data) => {
            this._emitEvent('sourceError', data);
        });
        
        source.addEventListener('initialized', (data) => {
            this._emitEvent('sourceInitialized', data);
        });
        
        source.addEventListener('disposed', (data) => {
            this._emitEvent('sourceDisposed', data);
        });
    }
    
    /**
     * 清理当前输入源
     */
    async _cleanupCurrentSource() {
        if (this.currentSource) {
            try {
                this.currentSource.cleanup();
            } catch (error) {
                console.error('清理输入源时发生错误:', error);
            }
            this.currentSource = null;
        }
    }
    
    /**
     * 初始化质量监控器
     */
    _initializeQualityMonitor() {
        // 质量监控逻辑
    }
    
    /**
     * 开始质量监控
     */
    _startQualityMonitoring() {
        if (this.qualityMonitor) {
            clearInterval(this.qualityMonitor);
        }
        
        this.qualityMonitor = setInterval(() => {
            this._updateQualityMetrics();
            this.adaptToInputSource();
        }, this.config.qualityCheckInterval);
    }
    
    /**
     * 停止质量监控
     */
    _stopQualityMonitoring() {
        if (this.qualityMonitor) {
            clearInterval(this.qualityMonitor);
            this.qualityMonitor = null;
        }
    }
    
    /**
     * 更新质量指标
     */
    _updateQualityMetrics() {
        if (!this.currentSource || !this.currentSource.metadata) {
            return;
        }
        
        const metadata = this.currentSource.metadata;
        
        this.qualityMetrics = {
            resolution: {
                width: metadata.width || 0,
                height: metadata.height || 0
            },
            frameRate: metadata.frameRate || 0,
            latency: this._measureLatency(),
            stability: this._measureStability(),
            clarity: this._measureClarity(),
            overallScore: 0
        };
        
        // 计算综合评分
        this.qualityMetrics.overallScore = this.assessInputQuality().score;
    }
    
    /**
     * 测量延迟
     */
    _measureLatency() {
        // 这里实现延迟测量逻辑
        return 50; // 临时返回值
    }
    
    /**
     * 测量稳定性
     */
    _measureStability() {
        // 这里实现稳定性测量逻辑
        return 90; // 临时返回值
    }
    
    /**
     * 测量清晰度
     */
    _measureClarity() {
        // 这里实现清晰度测量逻辑
        return 85; // 临时返回值
    }
    
    /**
     * 应用低质量优化
     */
    _applyLowQualityOptimizations() {
        console.log('应用低质量优化设置');
        // 降低处理频率、简化算法等
    }
    
    /**
     * 应用中等质量优化
     */
    _applyMediumQualityOptimizations() {
        console.log('应用中等质量优化设置');
        // 平衡性能和质量
    }
    
    /**
     * 应用高质量优化
     */
    _applyHighQualityOptimizations() {
        console.log('应用高质量优化设置');
        // 启用所有高级功能
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
                    console.error(`Event callback error (${event}):`, error);
                }
            });
        }
    }
}

export default InputSourceManager;
export {
    InputSource,
    CameraInputSource,
    VideoFileInputSource,
    ImageFileInputSource,
    OnlineStreamInputSource,
    InputSourceType,
    InputSourceStatus,
    QualityLevel
};