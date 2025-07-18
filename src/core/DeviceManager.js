/**
 * 设备管理器模块
 * 负责摄像头、传感器等设备的管理、配置和监控
 */

export class DeviceManager {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 摄像头设置
            preferredCamera: options.preferredCamera || 'user', // 'user' | 'environment'
            defaultResolution: options.defaultResolution || { width: 640, height: 480 },
            preferredFrameRate: options.preferredFrameRate || 30,
            enableAutoFocus: options.enableAutoFocus !== false,
            enableTorch: options.enableTorch || false,
            
            // 音频设置
            enableAudio: options.enableAudio || false,
            audioConstraints: options.audioConstraints || {},
            
            // 传感器设置
            enableDeviceOrientation: options.enableDeviceOrientation || false,
            enableDeviceMotion: options.enableDeviceMotion || false,
            enableGeolocation: options.enableGeolocation || false,
            
            // 性能设置
            enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
            performanceCheckInterval: options.performanceCheckInterval || 5000,
            
            // 错误处理
            maxRetryAttempts: options.maxRetryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            
            // 调试设置
            debug: options.debug || false,
            
            ...options
        };
        
        // 设备状态
        this.devices = {
            cameras: [],
            microphones: [],
            speakers: []
        };
        
        // 当前活动设备
        this.activeDevices = {
            camera: null,
            microphone: null,
            speaker: null
        };
        
        // 媒体流
        this.mediaStreams = new Map();
        
        // 设备约束
        this.constraints = {
            video: {
                width: this.options.defaultResolution.width,
                height: this.options.defaultResolution.height,
                frameRate: this.options.preferredFrameRate,
                facingMode: this.options.preferredCamera
            },
            audio: this.options.enableAudio ? this.options.audioConstraints : false
        };
        
        // 传感器数据
        this.sensorData = {
            orientation: null,
            motion: null,
            geolocation: null
        };
        
        // 性能监控
        this.performance = {
            frameRate: 0,
            resolution: null,
            bandwidth: 0,
            latency: 0,
            dropRate: 0
        };
        
        // 统计信息
        this.stats = {
            deviceEnumerations: 0,
            streamCreations: 0,
            streamErrors: 0,
            deviceChanges: 0,
            permissionRequests: 0,
            permissionDenials: 0
        };
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 监控定时器
        this.monitoringTimer = null;
        
        // 重试计数
        this.retryCount = 0;
        
        this.init();
    }
    
    /**
     * 初始化设备管理器
     */
    async init() {
        try {
            // 检查浏览器支持
            this.checkBrowserSupport();
            
            // 枚举设备
            await this.enumerateDevices();
            
            // 设置设备变化监听
            this.setupDeviceChangeListener();
            
            // 初始化传感器
            if (this.options.enableDeviceOrientation) {
                this.initDeviceOrientation();
            }
            
            if (this.options.enableDeviceMotion) {
                this.initDeviceMotion();
            }
            
            if (this.options.enableGeolocation) {
                this.initGeolocation();
            }
            
            // 启动性能监控
            if (this.options.enablePerformanceMonitoring) {
                this.startPerformanceMonitoring();
            }
            
            if (this.options.debug) {
                console.log('DeviceManager已初始化', {
                    devices: this.devices,
                    constraints: this.constraints
                });
            }
            
        } catch (error) {
            console.error('DeviceManager初始化失败:', error);
            this.stats.streamErrors++;
        }
    }
    
    /**
     * 检查浏览器支持
     */
    checkBrowserSupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
            deviceOrientation: 'DeviceOrientationEvent' in window,
            deviceMotion: 'DeviceMotionEvent' in window,
            geolocation: 'geolocation' in navigator,
            webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
        };
        
        this.browserSupport = support;
        
        if (!support.getUserMedia) {
            throw new Error('浏览器不支持 getUserMedia API');
        }
        
        if (this.options.debug) {
            console.log('浏览器支持检查:', support);
        }
        
        return support;
    }
    
    /**
     * 枚举设备
     */
    async enumerateDevices() {
        try {
            if (!navigator.mediaDevices.enumerateDevices) {
                throw new Error('浏览器不支持设备枚举');
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // 分类设备
            this.devices.cameras = devices.filter(device => device.kind === 'videoinput');
            this.devices.microphones = devices.filter(device => device.kind === 'audioinput');
            this.devices.speakers = devices.filter(device => device.kind === 'audiooutput');
            
            this.stats.deviceEnumerations++;
            
            this.emit('devicesEnumerated', {
                cameras: this.devices.cameras.length,
                microphones: this.devices.microphones.length,
                speakers: this.devices.speakers.length
            });
            
            if (this.options.debug) {
                console.log('设备枚举完成:', this.devices);
            }
            
            return this.devices;
            
        } catch (error) {
            console.error('设备枚举失败:', error);
            this.stats.streamErrors++;
            throw error;
        }
    }
    
    /**
     * 获取媒体流（别名方法）
     * @param {Object} constraints - 媒体约束
     * @returns {Promise<MediaStream>} 媒体流
     */
    async getMediaStream(constraints = null) {
        const result = await this.getUserMedia(constraints);
        return result.stream;
    }

    /**
     * 停止媒体流
     * @param {MediaStream} stream - 媒体流
     */
    stopMediaStream(stream) {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
        }
    }

    /**
     * 获取用户媒体流
     * @param {Object} constraints - 媒体约束
     * @returns {Promise<MediaStream>} 媒体流
     */
    async getUserMedia(constraints = null) {
        try {
            const finalConstraints = constraints || this.constraints;
            
            if (this.options.debug) {
                console.log('请求用户媒体:', finalConstraints);
            }
            
            this.stats.permissionRequests++;
            
            const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            
            // 存储媒体流
            const streamId = this.generateStreamId();
            this.mediaStreams.set(streamId, stream);
            
            // 更新活动设备
            if (stream.getVideoTracks().length > 0) {
                this.activeDevices.camera = stream.getVideoTracks()[0];
            }
            
            if (stream.getAudioTracks().length > 0) {
                this.activeDevices.microphone = stream.getAudioTracks()[0];
            }
            
            this.stats.streamCreations++;
            
            this.emit('streamCreated', {
                streamId,
                hasVideo: stream.getVideoTracks().length > 0,
                hasAudio: stream.getAudioTracks().length > 0
            });
            
            if (this.options.debug) {
                console.log('媒体流创建成功:', {
                    streamId,
                    videoTracks: stream.getVideoTracks().length,
                    audioTracks: stream.getAudioTracks().length
                });
            }
            
            return { stream, streamId };
            
        } catch (error) {
            console.error('获取用户媒体失败:', error);
            this.stats.streamErrors++;
            this.stats.permissionDenials++;
            
            this.emit('streamError', { error });
            
            // 重试逻辑
            if (this.retryCount < this.options.maxRetryAttempts) {
                this.retryCount++;
                
                if (this.options.debug) {
                    console.log(`重试获取媒体流 (${this.retryCount}/${this.options.maxRetryAttempts})`);
                }
                
                await this.delay(this.options.retryDelay);
                return this.getUserMedia(constraints);
            }
            
            throw error;
        }
    }
    
    /**
     * 切换摄像头
     * @param {string} deviceId - 设备ID
     * @returns {Promise<MediaStream>} 新的媒体流
     */
    async switchCamera(deviceId = null) {
        try {
            // 停止当前摄像头
            if (this.activeDevices.camera) {
                this.activeDevices.camera.stop();
            }
            
            // 更新约束
            const newConstraints = { ...this.constraints };
            
            if (deviceId) {
                newConstraints.video.deviceId = { exact: deviceId };
            } else {
                // 切换前后摄像头
                newConstraints.video.facingMode = 
                    this.constraints.video.facingMode === 'user' ? 'environment' : 'user';
            }
            
            this.constraints = newConstraints;
            
            const result = await this.getUserMedia(newConstraints);
            
            this.stats.deviceChanges++;
            
            this.emit('cameraChanged', {
                deviceId,
                facingMode: newConstraints.video.facingMode
            });
            
            if (this.options.debug) {
                console.log('摄像头切换成功:', { deviceId, constraints: newConstraints });
            }
            
            return result;
            
        } catch (error) {
            console.error('切换摄像头失败:', error);
            this.stats.streamErrors++;
            throw error;
        }
    }
    
    /**
     * 设置视频分辨率
     * @param {Object} resolution - 分辨率 {width, height}
     * @returns {Promise<MediaStream>} 新的媒体流
     */
    async setResolution(resolution) {
        try {
            const newConstraints = {
                ...this.constraints,
                video: {
                    ...this.constraints.video,
                    width: resolution.width,
                    height: resolution.height
                }
            };
            
            this.constraints = newConstraints;
            
            const result = await this.getUserMedia(newConstraints);
            
            this.performance.resolution = resolution;
            
            this.emit('resolutionChanged', resolution);
            
            if (this.options.debug) {
                console.log('分辨率设置成功:', resolution);
            }
            
            return result;
            
        } catch (error) {
            console.error('设置分辨率失败:', error);
            this.stats.streamErrors++;
            throw error;
        }
    }
    
    /**
     * 设置帧率
     * @param {number} frameRate - 帧率
     * @returns {Promise<MediaStream>} 新的媒体流
     */
    async setFrameRate(frameRate) {
        try {
            const newConstraints = {
                ...this.constraints,
                video: {
                    ...this.constraints.video,
                    frameRate: frameRate
                }
            };
            
            this.constraints = newConstraints;
            
            const result = await this.getUserMedia(newConstraints);
            
            this.emit('frameRateChanged', frameRate);
            
            if (this.options.debug) {
                console.log('帧率设置成功:', frameRate);
            }
            
            return result;
            
        } catch (error) {
            console.error('设置帧率失败:', error);
            this.stats.streamErrors++;
            throw error;
        }
    }
    
    /**
     * 控制手电筒
     * @param {boolean} enabled - 是否启用
     */
    async setTorch(enabled) {
        try {
            if (!this.activeDevices.camera) {
                throw new Error('没有活动的摄像头');
            }
            
            const track = this.activeDevices.camera;
            const capabilities = track.getCapabilities();
            
            if (!capabilities.torch) {
                throw new Error('当前设备不支持手电筒');
            }
            
            await track.applyConstraints({
                advanced: [{ torch: enabled }]
            });
            
            this.emit('torchChanged', enabled);
            
            if (this.options.debug) {
                console.log('手电筒状态:', enabled);
            }
            
        } catch (error) {
            console.error('控制手电筒失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置设备变化监听
     */
    setupDeviceChangeListener() {
        if (navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', async () => {
                if (this.options.debug) {
                    console.log('检测到设备变化');
                }
                
                await this.enumerateDevices();
                this.emit('deviceChange', this.devices);
            });
        }
    }
    
    /**
     * 初始化设备方向传感器
     */
    initDeviceOrientation() {
        if (!this.browserSupport.deviceOrientation) {
            console.warn('设备不支持方向传感器');
            return;
        }
        
        // 请求权限（iOS 13+）
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.setupOrientationListener();
                    }
                })
                .catch(console.error);
        } else {
            this.setupOrientationListener();
        }
    }
    
    /**
     * 设置方向监听器
     */
    setupOrientationListener() {
        window.addEventListener('deviceorientation', (event) => {
            this.sensorData.orientation = {
                alpha: event.alpha, // Z轴旋转
                beta: event.beta,   // X轴旋转
                gamma: event.gamma, // Y轴旋转
                absolute: event.absolute,
                timestamp: Date.now()
            };
            
            this.emit('orientationChange', this.sensorData.orientation);
        });
        
        if (this.options.debug) {
            console.log('设备方向监听器已设置');
        }
    }
    
    /**
     * 初始化设备运动传感器
     */
    initDeviceMotion() {
        if (!this.browserSupport.deviceMotion) {
            console.warn('设备不支持运动传感器');
            return;
        }
        
        // 请求权限（iOS 13+）
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.setupMotionListener();
                    }
                })
                .catch(console.error);
        } else {
            this.setupMotionListener();
        }
    }
    
    /**
     * 设置运动监听器
     */
    setupMotionListener() {
        window.addEventListener('devicemotion', (event) => {
            this.sensorData.motion = {
                acceleration: event.acceleration,
                accelerationIncludingGravity: event.accelerationIncludingGravity,
                rotationRate: event.rotationRate,
                interval: event.interval,
                timestamp: Date.now()
            };
            
            this.emit('motionChange', this.sensorData.motion);
        });
        
        if (this.options.debug) {
            console.log('设备运动监听器已设置');
        }
    }
    
    /**
     * 初始化地理位置
     */
    initGeolocation() {
        if (!this.browserSupport.geolocation) {
            console.warn('设备不支持地理位置');
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.sensorData.geolocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    altitudeAccuracy: position.coords.altitudeAccuracy,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: position.timestamp
                };
                
                this.emit('locationChange', this.sensorData.geolocation);
                
                if (this.options.debug) {
                    console.log('地理位置获取成功:', this.sensorData.geolocation);
                }
            },
            (error) => {
                console.error('获取地理位置失败:', error);
            },
            options
        );
    }
    
    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        this.monitoringTimer = setInterval(() => {
            this.updatePerformanceMetrics();
        }, this.options.performanceCheckInterval);
        
        if (this.options.debug) {
            console.log('性能监控已启动');
        }
    }
    
    /**
     * 停止性能监控
     */
    stopPerformanceMonitoring() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        
        if (this.options.debug) {
            console.log('性能监控已停止');
        }
    }
    
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics() {
        if (this.activeDevices.camera) {
            const track = this.activeDevices.camera;
            const settings = track.getSettings();
            
            this.performance.frameRate = settings.frameRate || 0;
            this.performance.resolution = {
                width: settings.width || 0,
                height: settings.height || 0
            };
            
            // 获取统计信息（如果支持）
            if (track.getStats) {
                track.getStats().then(stats => {
                    // 处理统计信息
                    this.processTrackStats(stats);
                });
            }
        }
        
        this.emit('performanceUpdate', this.performance);
    }
    
    /**
     * 处理轨道统计信息
     * @param {RTCStatsReport} stats - 统计报告
     */
    processTrackStats(stats) {
        // 这里可以处理更详细的性能统计
        // 实际实现取决于具体的统计数据格式
        if (this.options.debug) {
            console.log('轨道统计信息:', stats);
        }
    }
    
    /**
     * 停止媒体流
     * @param {string} streamId - 流ID
     */
    stopStream(streamId) {
        const stream = this.mediaStreams.get(streamId);
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            
            this.mediaStreams.delete(streamId);
            
            this.emit('streamStopped', { streamId });
            
            if (this.options.debug) {
                console.log('媒体流已停止:', streamId);
            }
        }
    }
    
    /**
     * 停止所有媒体流
     */
    stopAllStreams() {
        for (const [streamId] of this.mediaStreams) {
            this.stopStream(streamId);
        }
        
        this.activeDevices.camera = null;
        this.activeDevices.microphone = null;
        
        if (this.options.debug) {
            console.log('所有媒体流已停止');
        }
    }
    
    /**
     * 获取设备能力
     * @param {string} deviceType - 设备类型
     * @returns {Object} 设备能力
     */
    getDeviceCapabilities(deviceType = 'camera') {
        const device = this.activeDevices[deviceType];
        if (!device) {
            return null;
        }
        
        return device.getCapabilities ? device.getCapabilities() : null;
    }
    
    /**
     * 获取设备设置
     * @param {string} deviceType - 设备类型
     * @returns {Object} 设备设置
     */
    getDeviceSettings(deviceType = 'camera') {
        const device = this.activeDevices[deviceType];
        if (!device) {
            return null;
        }
        
        return device.getSettings ? device.getSettings() : null;
    }
    
    /**
     * 获取设备约束
     * @param {string} deviceType - 设备类型
     * @returns {Object} 设备约束
     */
    getDeviceConstraints(deviceType = 'camera') {
        const device = this.activeDevices[deviceType];
        if (!device) {
            return null;
        }
        
        return device.getConstraints ? device.getConstraints() : null;
    }
    
    /**
     * 生成流ID
     * @returns {string} 流ID
     */
    generateStreamId() {
        return 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 毫秒
     * @returns {Promise} Promise对象
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            devices: {
                cameras: this.devices.cameras.length,
                microphones: this.devices.microphones.length,
                speakers: this.devices.speakers.length
            },
            activeStreams: this.mediaStreams.size,
            performance: this.performance,
            sensorData: this.sensorData,
            browserSupport: this.browserSupport
        };
    }
    
    /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
    getDeviceInfo() {
        return {
            devices: this.devices,
            activeDevices: {
                camera: this.activeDevices.camera ? {
                    id: this.activeDevices.camera.id,
                    label: this.activeDevices.camera.label,
                    kind: this.activeDevices.camera.kind,
                    enabled: this.activeDevices.camera.enabled,
                    muted: this.activeDevices.camera.muted,
                    readyState: this.activeDevices.camera.readyState
                } : null,
                microphone: this.activeDevices.microphone ? {
                    id: this.activeDevices.microphone.id,
                    label: this.activeDevices.microphone.label,
                    kind: this.activeDevices.microphone.kind,
                    enabled: this.activeDevices.microphone.enabled,
                    muted: this.activeDevices.microphone.muted,
                    readyState: this.activeDevices.microphone.readyState
                } : null
            },
            constraints: this.constraints,
            capabilities: {
                camera: this.getDeviceCapabilities('camera'),
                microphone: this.getDeviceCapabilities('microphone')
            },
            settings: {
                camera: this.getDeviceSettings('camera'),
                microphone: this.getDeviceSettings('microphone')
            }
        };
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    off(event, listener) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error('设备事件监听器执行出错:', error);
                }
            }
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopAllStreams();
        this.stopPerformanceMonitoring();
        
        this.eventListeners.clear();
        this.mediaStreams.clear();
        
        this.activeDevices.camera = null;
        this.activeDevices.microphone = null;
        this.activeDevices.speaker = null;
        
        if (this.options.debug) {
            console.log('DeviceManager资源已清理');
        }
    }
}

export default DeviceManager;