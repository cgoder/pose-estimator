/**
 * 摄像头输入源
 * 负责摄像头数据的获取、管理和配置
 */

import { IInputSource, INPUT_SOURCE_TYPES, INPUT_SOURCE_STATUS, INPUT_SOURCE_EVENTS } from '../interfaces/IInputSource.js';
import { ErrorHandler } from '../../utils/errorHandling.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

/**
 * 摄像头输入源类
 * 实现摄像头数据获取的统一接口
 */
export class CameraInputSource extends IInputSource {
    constructor(options = {}) {
        super();
        
        // 配置选项
        this.options = {
            deviceId: options.deviceId || null, // 指定设备ID
            width: options.width || 640,
            height: options.height || 480,
            frameRate: options.frameRate || 30,
            facingMode: options.facingMode || 'user', // user, environment
            autoStart: options.autoStart !== false,
            enableAudio: options.enableAudio || false,
            ...options
        };
        
        // 状态管理
        this.status = INPUT_SOURCE_STATUS.IDLE;
        this.stream = null;
        this.videoElement = null;
        this.canvas = null;
        this.context = null;
        
        // 设备信息
        this.deviceInfo = null;
        this.availableDevices = [];
        this.currentDevice = null;
        
        // 性能监控
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.actualFrameRate = 0;
        this.frameRateHistory = [];
        
        // 事件总线
        this.eventBus = eventBus;
        
        // 错误处理器（使用静态方法）
        this.errorHandler = ErrorHandler;
        
        // 兼容性标志
        this.isInitialized = false;
        this.isStreaming = false;
        this.hasPermission = false;
        
        console.log('📷 摄像头输入源已创建');
        
        // 自动启动
        if (this.options.autoStart) {
            this.initialize().catch(error => {
                console.error('❌ 摄像头自动启动失败:', error);
            });
        }
    }
    
    /**
     * 初始化摄像头
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            if (this.status !== INPUT_SOURCE_STATUS.IDLE) {
                return;
            }
            
            this.status = INPUT_SOURCE_STATUS.INITIALIZING;
            this._emitEvent(INPUT_SOURCE_EVENTS.INITIALIZING);
            
            // 检查浏览器支持
            if (!this._checkBrowserSupport()) {
                throw new Error('浏览器不支持摄像头访问');
            }
            
            // 获取可用设备
            await this._enumerateDevices();
            
            // 创建视频元素
            this._createVideoElement();
            
            // 创建画布
            this._createCanvas();
            
            this.status = INPUT_SOURCE_STATUS.READY;
            this.isInitialized = true;
            this._emitEvent(INPUT_SOURCE_EVENTS.READY);
            
            console.log('✅ 摄像头初始化完成');
            
        } catch (error) {
            this.status = INPUT_SOURCE_STATUS.ERROR;
            this._emitEvent(INPUT_SOURCE_EVENTS.ERROR, { error });
            
            console.error('❌ 摄像头初始化失败:', error);
            throw ErrorHandler.createError('CameraInputSource', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 启动摄像头
     * @returns {Promise<void>}
     */
    async start() {
        try {
            if (this.status === INPUT_SOURCE_STATUS.RUNNING) {
                return;
            }
            
            if (this.status !== INPUT_SOURCE_STATUS.READY && this.status !== INPUT_SOURCE_STATUS.PAUSED) {
                await this.initialize();
            }
            
            this.status = INPUT_SOURCE_STATUS.STARTING;
            this._emitEvent(INPUT_SOURCE_EVENTS.STARTING);
            
            // 获取媒体流
            await this._requestMediaStream();
            
            // 开始播放
            await this._startVideo();
            
            // 开始帧率监控
            this._startFrameRateMonitoring();
            
            this.status = INPUT_SOURCE_STATUS.RUNNING;
            this.isStreaming = true;
            this.hasPermission = true;
            this._emitEvent(INPUT_SOURCE_EVENTS.STARTED);
            
            // 发布兼容性事件
            this.eventBus.emit(EVENTS.CAMERA_STARTED, {
                videoElement: this.videoElement,
                stream: this.stream,
                settings: this.getStatus()
            });
            
            console.log('✅ 摄像头已启动');
            
        } catch (error) {
            this.status = INPUT_SOURCE_STATUS.ERROR;
            this._emitEvent(INPUT_SOURCE_EVENTS.ERROR, { error });
            
            console.error('❌ 摄像头启动失败:', error);
            throw ErrorHandler.createError('CameraInputSource', `启动失败: ${error.message}`, error);
        }
    }
    
    /**
     * 停止摄像头
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            if (this.status === INPUT_SOURCE_STATUS.IDLE || this.status === INPUT_SOURCE_STATUS.STOPPED) {
                return;
            }
            
            this.status = INPUT_SOURCE_STATUS.STOPPING;
            this._emitEvent(INPUT_SOURCE_EVENTS.STOPPING);
            
            // 停止媒体流
            this._stopMediaStream();
            
            // 停止视频
            this._stopVideo();
            
            // 停止帧率监控
            this._stopFrameRateMonitoring();
            
            this.status = INPUT_SOURCE_STATUS.STOPPED;
            this.isStreaming = false;
            this._emitEvent(INPUT_SOURCE_EVENTS.STOPPED);
            
            // 发布兼容性事件
            this.eventBus.emit(EVENTS.CAMERA_STOPPED, {});
            
            console.log('⏹️ 摄像头已停止');
            
        } catch (error) {
            console.error('❌ 摄像头停止失败:', error);
            throw error;
        }
    }
    
    /**
     * 暂停摄像头
     * @returns {Promise<void>}
     */
    async pause() {
        try {
            if (this.status !== INPUT_SOURCE_STATUS.RUNNING) {
                return;
            }
            
            if (this.videoElement) {
                this.videoElement.pause();
            }
            
            this.status = INPUT_SOURCE_STATUS.PAUSED;
            this._emitEvent(INPUT_SOURCE_EVENTS.PAUSED);
            
            console.log('⏸️ 摄像头已暂停');
            
        } catch (error) {
            console.error('❌ 摄像头暂停失败:', error);
            throw error;
        }
    }
    
    /**
     * 恢复摄像头
     * @returns {Promise<void>}
     */
    async resume() {
        try {
            if (this.status !== INPUT_SOURCE_STATUS.PAUSED) {
                return;
            }
            
            if (this.videoElement) {
                await this.videoElement.play();
            }
            
            this.status = INPUT_SOURCE_STATUS.RUNNING;
            this._emitEvent(INPUT_SOURCE_EVENTS.RESUMED);
            
            console.log('▶️ 摄像头已恢复');
            
        } catch (error) {
            console.error('❌ 摄像头恢复失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取当前帧
     * @returns {HTMLCanvasElement|null} 当前帧画布
     */
    getCurrentFrame() {
        // 详细的状态检查和日志
        if (this.status !== INPUT_SOURCE_STATUS.RUNNING) {
            console.log('🔍 CameraInputSource状态检查: status不是RUNNING', {
                currentStatus: this.status,
                expectedStatus: INPUT_SOURCE_STATUS.RUNNING
            });
            return null;
        }
        
        if (!this.videoElement) {
            console.log('🔍 CameraInputSource状态检查: videoElement不存在');
            return null;
        }
        
        if (!this.canvas) {
            console.log('🔍 CameraInputSource状态检查: canvas不存在');
            return null;
        }
        
        // 检查video元素的详细状态
        const videoStatus = {
            readyState: this.videoElement.readyState,
            videoWidth: this.videoElement.videoWidth,
            videoHeight: this.videoElement.videoHeight,
            paused: this.videoElement.paused,
            ended: this.videoElement.ended,
            currentTime: this.videoElement.currentTime,
            duration: this.videoElement.duration
        };
        
        console.log('🔍 Video元素状态:', videoStatus);
        
        // 检查canvas状态
        const canvasStatus = {
            width: this.canvas.width,
            height: this.canvas.height,
            hasContext: !!this.context
        };
        
        console.log('🔍 Canvas状态:', canvasStatus);
        
        if (this.videoElement.readyState < HTMLVideoElement.HAVE_CURRENT_DATA) {
            console.log('🔍 Video元素还没有准备好数据');
            return null;
        }
        
        if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
            console.log('🔍 Video元素尺寸为0');
            return null;
        }
        
        try {
            // 将视频帧绘制到画布
            this.context.drawImage(
                this.videoElement,
                0, 0,
                this.canvas.width,
                this.canvas.height
            );
            
            console.log('✅ 成功绘制视频帧到canvas', {
                videoSize: `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`,
                canvasSize: `${this.canvas.width}x${this.canvas.height}`
            });
            
            // 更新帧计数
            this._updateFrameCount();
            
            return this.canvas;
            
        } catch (error) {
            console.error('❌ 获取当前帧失败:', error);
            return null;
        }
    }
    
    /**
     * 获取当前帧数据
     * @param {string} format - 数据格式 ('canvas', 'imageData', 'blob', 'dataUrl')
     * @returns {Promise<any>} 帧数据
     */
    async getFrameData(format = 'canvas') {
        const frame = this.getCurrentFrame();
        if (!frame) {
            return null;
        }
        
        switch (format) {
            case 'canvas':
                return frame;
                
            case 'imageData':
                return this.context.getImageData(0, 0, frame.width, frame.height);
                
            case 'blob':
                return new Promise(resolve => {
                    frame.toBlob(resolve, 'image/jpeg', 0.8);
                });
                
            case 'dataUrl':
                return frame.toDataURL('image/jpeg', 0.8);
                
            default:
                throw new Error(`不支持的格式: ${format}`);
        }
    }
    
    /**
     * 切换摄像头设备
     * @param {string} deviceId - 设备ID
     * @returns {Promise<void>}
     */
    async switchDevice(deviceId) {
        try {
            if (!deviceId || deviceId === this.currentDevice?.deviceId) {
                return;
            }
            
            const wasRunning = this.status === INPUT_SOURCE_STATUS.RUNNING;
            
            // 停止当前摄像头
            if (wasRunning) {
                await this.stop();
            }
            
            // 更新设备配置
            this.options.deviceId = deviceId;
            
            // 重新启动
            if (wasRunning) {
                await this.start();
            }
            
            console.log(`📷 已切换到设备: ${deviceId}`);
            
        } catch (error) {
            console.error('❌ 切换摄像头设备失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取可用设备列表
     * @returns {Promise<Array>} 设备列表
     */
    async getAvailableDevices() {
        await this._enumerateDevices();
        return this.availableDevices;
    }
    
    /**
     * 获取输入源状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            type: INPUT_SOURCE_TYPES.CAMERA,
            status: this.status,
            deviceInfo: this.deviceInfo,
            currentDevice: this.currentDevice,
            availableDevices: this.availableDevices,
            frameRate: this.actualFrameRate,
            frameCount: this.frameCount,
            resolution: {
                width: this.options.width,
                height: this.options.height
            },
            options: { ...this.options }
        };
    }
    
    /**
     * 获取输入源能力
     * @returns {Object} 能力信息
     */
    getCapabilities() {
        return {
            supportedFormats: ['canvas', 'imageData', 'blob', 'dataUrl'],
            canSwitchDevice: true,
            canAdjustResolution: true,
            canAdjustFrameRate: true,
            supportedResolutions: [
                { width: 320, height: 240 },
                { width: 640, height: 480 },
                { width: 1280, height: 720 },
                { width: 1920, height: 1080 }
            ],
            supportedFrameRates: [15, 24, 30, 60],
            hasAudioSupport: true
        };
    }
    
    /**
     * 设置配置
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async setConfig(config) {
        const oldConfig = { ...this.options };
        this.options = { ...this.options, ...config };
        
        // 如果分辨率或帧率改变，需要重新启动
        const needRestart = (
            config.width !== undefined && config.width !== oldConfig.width ||
            config.height !== undefined && config.height !== oldConfig.height ||
            config.frameRate !== undefined && config.frameRate !== oldConfig.frameRate ||
            config.deviceId !== undefined && config.deviceId !== oldConfig.deviceId
        );
        
        if (needRestart && this.status === INPUT_SOURCE_STATUS.RUNNING) {
            await this.stop();
            await this.start();
        }
        
        this._emitEvent(INPUT_SOURCE_EVENTS.CONFIG_CHANGED, { config: this.options });
    }
    
    /**
     * 获取配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return { ...this.options };
    }
    
    // ==================== 兼容性方法 ====================
    
    /**
     * 获取视频元素（兼容CameraManager接口）
     * @returns {HTMLVideoElement|null} 视频元素
     */
    getVideoElement() {
        return this.videoElement;
    }
    
    /**
     * 获取媒体流（兼容CameraManager接口）
     * @returns {MediaStream|null} 媒体流
     */
    getStream() {
        return this.stream;
    }
    
    /**
     * 获取摄像头状态（兼容CameraManager接口）
     * @returns {Object} 摄像头状态
     */
    getCameraStatus() {
        return {
            isInitialized: this.isInitialized,
            isStreaming: this.isStreaming,
            hasPermission: this.hasPermission,
            currentDevice: this.currentDevice?.deviceId || null,
            availableDevices: this.availableDevices,
            resolution: {
                width: this.options.width,
                height: this.options.height
            },
            frameRate: this.options.frameRate
        };
    }
    
    /**
     * 启动摄像头（兼容CameraManager接口）
     * @param {Object} options - 启动选项
     * @returns {Promise<HTMLVideoElement>} 视频元素
     */
    async startCamera(options = {}) {
        // 确保options是一个有效的对象
        const validOptions = options || {};
        
        // 更新配置
        if (Object.keys(validOptions).length > 0) {
            await this.setConfig(validOptions);
        }
        
        await this.start();
        
        // 如果视频因自动播放限制而暂停，添加用户交互监听
        if (this.videoElement && this.videoElement.paused && this.videoElement.srcObject) {
            this._addUserInteractionListener();
        }
        
        return this.videoElement;
    }
    
    /**
     * 添加用户交互监听器以启动视频播放
     * @private
     */
    _addUserInteractionListener() {
        if (this._userInteractionAdded) {
            return; // 避免重复添加
        }
        
        this._playVideoHandler = async () => {
            if (this.videoElement && this.videoElement.paused && this.videoElement.srcObject) {
                try {
                    await this.videoElement.play();
                    console.log('✅ 用户交互后视频播放成功');
                    // 移除监听器
                    this._removeUserInteractionListener();
                } catch (error) {
                    console.warn('⚠️ 用户交互后视频播放仍然失败:', error);
                }
            }
        };
        
        // 添加多种用户交互监听
        document.addEventListener('click', this._playVideoHandler, { once: false });
        document.addEventListener('keydown', this._playVideoHandler, { once: false });
        document.addEventListener('touchstart', this._playVideoHandler, { once: false });
        
        this._userInteractionAdded = true;
        console.log('👆 已添加用户交互监听器，点击页面任意位置可启动视频播放');
    }
    
    /**
     * 停止摄像头（兼容CameraManager接口）
     * @returns {Promise<void>}
     */
    async stopCamera() {
        await this.stop();
    }
    
    /**
     * 更新摄像头配置（兼容CameraManager接口）
     * @param {Object} config - 配置对象
     */
    updateConfig(config) {
        this.setConfig(config).catch(error => {
            console.error('❌ 更新摄像头配置失败:', error);
            this.errorHandler.handleError(error, 'CameraInputSource.updateConfig');
        });
        
        // 发布配置更新事件
        this.eventBus.emit(EVENTS.CAMERA_CONFIG_UPDATED, {
            config: this.getConfig()
        });
    }
    
    /**
     * 获取模块状态（兼容ICameraManager接口）
     * @returns {Object} 模块状态
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isStreaming: this.isStreaming,
            hasPermission: this.hasPermission,
            deviceId: this.currentDevice?.deviceId || null,
            resolution: {
                width: this.options.width,
                height: this.options.height
            },
            frameRate: this.options.frameRate,
            facingMode: this.options.facingMode,
            availableDevices: this.availableDevices,
            currentDeviceId: this.currentDevice?.deviceId || null
        };
    }
    
    /**
     * 重置模块（兼容ICameraManager接口）
     */
    async reset() {
        try {
            console.log('📷 重置摄像头输入源...');
            
            await this.stop();
            
            // 重置状态
            this.isInitialized = false;
            this.isStreaming = false;
            this.hasPermission = false;
            this.currentDevice = null;
            this.deviceInfo = null;
            
            // 重置配置为默认值
            this.options = {
                deviceId: null,
                width: 640,
                height: 480,
                frameRate: 30,
                facingMode: 'user',
                autoStart: false,
                enableAudio: false
            };
            
            this.status = INPUT_SOURCE_STATUS.IDLE;
            
            // 发布重置事件
            this.eventBus.emit(EVENTS.CAMERA_RESET, {});
            
            console.log('📷 摄像头输入源重置完成');
            
        } catch (error) {
            console.error('❌ 重置摄像头输入源失败:', error);
            this.errorHandler.handleError(error, 'CameraInputSource.reset');
        }
    }
    
    /**
     * 销毁模块（兼容ICameraManager接口）
     */
    async destroy() {
        try {
            console.log('📷 销毁摄像头输入源...');
            
            await this.cleanup();
            
            // 重置所有状态
            this.isInitialized = false;
            this.isStreaming = false;
            this.hasPermission = false;
            this.availableDevices = [];
            this.currentDevice = null;
            this.deviceInfo = null;
            
            // 发布销毁事件
            this.eventBus.emit(EVENTS.CAMERA_DESTROYED, {});
            
            console.log('📷 摄像头输入源销毁完成');
            
        } catch (error) {
            console.error('❌ 销毁摄像头输入源失败:', error);
            this.errorHandler.handleError(error, 'CameraInputSource.destroy');
        }
    }
    
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 开始清理摄像头资源...');
            
            // 停止摄像头
            await this.stop();
            
            // 清理用户交互监听器
            this._removeUserInteractionListener();
            
            // 清理DOM元素
            if (this.videoElement) {
                this.videoElement.remove();
                this.videoElement = null;
            }
            
            if (this.canvas) {
                this.canvas.remove();
                this.canvas = null;
            }
            
            this.context = null;
            
            // 重置状态
            this.status = INPUT_SOURCE_STATUS.IDLE;
            this.frameCount = 0;
            this.lastFrameTime = 0;
            this.actualFrameRate = 0;
            this.frameRateHistory = [];
            
            console.log('✅ 摄像头资源清理完成');
            
        } catch (error) {
            console.error('❌ 摄像头资源清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 移除用户交互监听器
     * @private
     */
    _removeUserInteractionListener() {
        if (this._userInteractionAdded && this._playVideoHandler) {
            document.removeEventListener('click', this._playVideoHandler);
            document.removeEventListener('keydown', this._playVideoHandler);
            document.removeEventListener('touchstart', this._playVideoHandler);
            this._userInteractionAdded = false;
            this._playVideoHandler = null;
            console.log('🧹 已清理用户交互监听器');
        }
    }
    
    /**
     * 检查浏览器支持
     * @private
     * @returns {boolean} 是否支持
     */
    _checkBrowserSupport() {
        // 检查基本API支持
        if (!navigator.mediaDevices) {
            console.error('❌ 浏览器不支持 navigator.mediaDevices API');
            return false;
        }
        
        if (!navigator.mediaDevices.getUserMedia) {
            console.error('❌ 浏览器不支持 getUserMedia API');
            return false;
        }
        
        // 检查HTTPS或localhost环境
        const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (!isSecureContext) {
            console.error('❌ 摄像头访问需要HTTPS环境或localhost');
            return false;
        }
        
        console.log('✅ 浏览器支持摄像头访问');
        return true;
    }
    
    /**
     * 枚举设备
     * @private
     * @returns {Promise<void>}
     */
    async _enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices
                .filter(device => device.kind === 'videoinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `摄像头 ${device.deviceId.slice(0, 8)}`,
                    groupId: device.groupId
                }));
                
            console.log(`📷 发现 ${this.availableDevices.length} 个摄像头设备`);
            
        } catch (error) {
            console.error('❌ 枚举摄像头设备失败:', error);
            this.availableDevices = [];
        }
    }
    
    /**
     * 创建视频元素
     * @private
     */
    _createVideoElement() {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        this.videoElement.style.display = 'none';
        
        // 添加事件监听
        this.videoElement.addEventListener('loadedmetadata', () => {
            this._emitEvent(INPUT_SOURCE_EVENTS.METADATA_LOADED, {
                videoWidth: this.videoElement.videoWidth,
                videoHeight: this.videoElement.videoHeight
            });
        });
        
        this.videoElement.addEventListener('error', (error) => {
            this._emitEvent(INPUT_SOURCE_EVENTS.ERROR, { error });
        });
        
        document.body.appendChild(this.videoElement);
    }
    
    /**
     * 创建画布
     * @private
     */
    _createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.context = this.canvas.getContext('2d');
    }
    
    /**
     * 请求媒体流
     * @private
     * @returns {Promise<void>}
     */
    async _requestMediaStream() {
        const constraints = {
            video: {
                width: { ideal: this.options.width },
                height: { ideal: this.options.height },
                frameRate: { ideal: this.options.frameRate }
            },
            audio: this.options.enableAudio
        };
        
        // 添加设备ID约束
        if (this.options.deviceId) {
            constraints.video.deviceId = { exact: this.options.deviceId };
        } else if (this.options.facingMode) {
            constraints.video.facingMode = { ideal: this.options.facingMode };
        }
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // 获取实际设备信息
            const videoTrack = this.stream.getVideoTracks()[0];
            if (videoTrack) {
                this.currentDevice = {
                    deviceId: videoTrack.getSettings().deviceId,
                    label: videoTrack.label
                };
                
                this.deviceInfo = videoTrack.getSettings();
            }
            
        } catch (error) {
            console.error('❌ 获取摄像头权限详细错误:', error);
            
            let errorMessage = '获取摄像头权限失败';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = '用户拒绝了摄像头访问权限，请在浏览器设置中允许摄像头访问';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到摄像头设备，请确保摄像头已连接';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = '摄像头不支持请求的配置，请尝试降低分辨率或帧率';
            } else if (error.name === 'SecurityError') {
                errorMessage = '安全错误：请确保在HTTPS环境下访问或使用localhost';
            } else {
                errorMessage = `摄像头访问失败: ${error.message}`;
            }
            
            throw new Error(errorMessage);
        }
    }
    
    /**
     * 启动视频
     * @private
     * @returns {Promise<void>}
     */
    async _startVideo() {
        if (!this.stream || !this.videoElement) {
            throw new Error('媒体流或视频元素未准备好');
        }
        
        this.videoElement.srcObject = this.stream;
        
        return new Promise((resolve, reject) => {
            this.videoElement.onloadedmetadata = async () => {
                try {
                    // 尝试播放视频
                    await this.videoElement.play();
                    console.log('✅ 视频播放成功');
                    resolve();
                } catch (playError) {
                    console.warn('⚠️ 自动播放被阻止，但媒体流已准备就绪:', playError);
                    // 即使播放失败，如果媒体流正常，也认为启动成功
                    if (this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0) {
                        console.log('📹 媒体流数据正常，视频启动成功（等待用户交互播放）');
                        resolve();
                    } else {
                        reject(playError);
                    }
                }
            };
            
            this.videoElement.onerror = reject;
            
            // 设置超时
            setTimeout(() => {
                reject(new Error('视频加载超时'));
            }, 10000);
        });
    }
    
    /**
     * 停止媒体流
     * @private
     */
    _stopMediaStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
        }
    }
    
    /**
     * 停止视频
     * @private
     */
    _stopVideo() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null;
        }
    }
    
    /**
     * 开始帧率监控
     * @private
     */
    _startFrameRateMonitoring() {
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.frameRateHistory = [];
    }
    
    /**
     * 停止帧率监控
     * @private
     */
    _stopFrameRateMonitoring() {
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.actualFrameRate = 0;
        this.frameRateHistory = [];
    }
    
    /**
     * 更新帧计数
     * @private
     */
    _updateFrameCount() {
        this.frameCount++;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // 每秒计算一次帧率
        if (deltaTime >= 1000) {
            this.actualFrameRate = Math.round((this.frameCount * 1000) / deltaTime);
            
            // 保存帧率历史
            this.frameRateHistory.push(this.actualFrameRate);
            if (this.frameRateHistory.length > 10) {
                this.frameRateHistory.shift();
            }
            
            // 重置计数
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            
            // 发送帧率更新事件
            this._emitEvent(INPUT_SOURCE_EVENTS.FRAME_RATE_UPDATED, {
                frameRate: this.actualFrameRate
            });
        }
    }
    
    /**
     * 发送事件
     * @private
     * @param {string} eventType - 事件类型
     * @param {any} data - 事件数据
     */
    _emitEvent(eventType, data = {}) {
        this.eventBus.emit(eventType, {
            source: 'CameraInputSource',
            type: eventType,
            timestamp: Date.now(),
            ...data
        });
    }
}

// 导出输入源类型和状态枚举
export { INPUT_SOURCE_TYPES, INPUT_SOURCE_STATUS, INPUT_SOURCE_EVENTS };