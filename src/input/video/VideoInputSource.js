/**
 * 视频文件输入源
 * 负责视频文件的播放、控制和帧数据获取
 */

import { IInputSource, INPUT_SOURCE_TYPES, INPUT_SOURCE_STATUS, INPUT_SOURCE_EVENTS } from '../interfaces/IInputSource.js';
import { ErrorHandler } from '../../utils/errorHandling.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

/**
 * 视频输入源类
 * 实现视频文件播放的统一接口
 */
export class VideoInputSource extends IInputSource {
    constructor(options = {}) {
        super();
        
        // 配置选项
        this.options = {
            videoUrl: options.videoUrl || null,
            autoPlay: options.autoPlay !== false,
            loop: options.loop || false,
            muted: options.muted !== false,
            playbackRate: options.playbackRate || 1.0,
            seekStep: options.seekStep || 5, // 秒
            enableControls: options.enableControls || false,
            preload: options.preload || 'metadata', // none, metadata, auto
            ...options
        };
        
        // 状态管理
        this.status = INPUT_SOURCE_STATUS.IDLE;
        this.videoElement = null;
        this.canvas = null;
        this.context = null;
        
        // 视频信息
        this.videoInfo = {
            duration: 0,
            currentTime: 0,
            width: 0,
            height: 0,
            frameRate: 0,
            totalFrames: 0
        };
        
        // 播放控制
        this.isPlaying = false;
        this.isPaused = false;
        this.playbackState = {
            position: 0,
            progress: 0,
            buffered: 0
        };
        
        // 性能监控
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.actualFrameRate = 0;
        this.frameRateHistory = [];
        
        // 事件总线
        this.eventBus = EventBus.getInstance();
        
        console.log('🎬 视频输入源已创建');
        
        // 如果提供了视频URL，自动初始化
        if (this.options.videoUrl) {
            this.initialize().catch(error => {
                console.error('❌ 视频自动初始化失败:', error);
            });
        }
    }
    
    /**
     * 初始化视频
     * @param {string} videoUrl - 视频URL（可选）
     * @returns {Promise<void>}
     */
    async initialize(videoUrl = null) {
        try {
            if (this.status !== INPUT_SOURCE_STATUS.IDLE) {
                return;
            }
            
            this.status = INPUT_SOURCE_STATUS.INITIALIZING;
            this._emitEvent(INPUT_SOURCE_EVENTS.INITIALIZING);
            
            // 更新视频URL
            if (videoUrl) {
                this.options.videoUrl = videoUrl;
            }
            
            if (!this.options.videoUrl) {
                throw new Error('未提供视频URL');
            }
            
            // 创建视频元素
            this._createVideoElement();
            
            // 创建画布
            this._createCanvas();
            
            // 加载视频
            await this._loadVideo();
            
            this.status = INPUT_SOURCE_STATUS.READY;
            this._emitEvent(INPUT_SOURCE_EVENTS.READY);
            
            console.log('✅ 视频初始化完成');
            
        } catch (error) {
            this.status = INPUT_SOURCE_STATUS.ERROR;
            this._emitEvent(INPUT_SOURCE_EVENTS.ERROR, { error });
            
            console.error('❌ 视频初始化失败:', error);
            throw ErrorHandler.createError('VideoInputSource', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 开始播放
     * @returns {Promise<void>}
     */
    async start() {
        try {
            if (this.status === INPUT_SOURCE_STATUS.RUNNING) {
                return;
            }
            
            if (this.status !== INPUT_SOURCE_STATUS.READY && this.status !== INPUT_SOURCE_STATUS.PAUSED) {
                throw new Error('视频未准备好');
            }
            
            this.status = INPUT_SOURCE_STATUS.STARTING;
            this._emitEvent(INPUT_SOURCE_EVENTS.STARTING);
            
            // 开始播放
            await this.videoElement.play();
            
            // 开始帧率监控
            this._startFrameRateMonitoring();
            
            this.isPlaying = true;
            this.isPaused = false;
            this.status = INPUT_SOURCE_STATUS.RUNNING;
            this._emitEvent(INPUT_SOURCE_EVENTS.STARTED);
            
            console.log('▶️ 视频开始播放');
            
        } catch (error) {
            this.status = INPUT_SOURCE_STATUS.ERROR;
            this._emitEvent(INPUT_SOURCE_EVENTS.ERROR, { error });
            
            console.error('❌ 视频播放失败:', error);
            throw ErrorHandler.createError('VideoInputSource', `播放失败: ${error.message}`, error);
        }
    }
    
    /**
     * 停止播放
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            if (this.status === INPUT_SOURCE_STATUS.IDLE || this.status === INPUT_SOURCE_STATUS.STOPPED) {
                return;
            }
            
            this.status = INPUT_SOURCE_STATUS.STOPPING;
            this._emitEvent(INPUT_SOURCE_EVENTS.STOPPING);
            
            // 停止播放
            if (this.videoElement) {
                this.videoElement.pause();
                this.videoElement.currentTime = 0;
            }
            
            // 停止帧率监控
            this._stopFrameRateMonitoring();
            
            this.isPlaying = false;
            this.isPaused = false;
            this.status = INPUT_SOURCE_STATUS.STOPPED;
            this._emitEvent(INPUT_SOURCE_EVENTS.STOPPED);
            
            console.log('⏹️ 视频已停止');
            
        } catch (error) {
            console.error('❌ 视频停止失败:', error);
            throw error;
        }
    }
    
    /**
     * 暂停播放
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
            
            this.isPlaying = false;
            this.isPaused = true;
            this.status = INPUT_SOURCE_STATUS.PAUSED;
            this._emitEvent(INPUT_SOURCE_EVENTS.PAUSED);
            
            console.log('⏸️ 视频已暂停');
            
        } catch (error) {
            console.error('❌ 视频暂停失败:', error);
            throw error;
        }
    }
    
    /**
     * 恢复播放
     * @returns {Promise<void>}
     */
    async resume() {
        try {
            if (this.status !== INPUT_SOURCE_STATUS.PAUSED) {
                return;
            }
            
            await this.videoElement.play();
            
            this.isPlaying = true;
            this.isPaused = false;
            this.status = INPUT_SOURCE_STATUS.RUNNING;
            this._emitEvent(INPUT_SOURCE_EVENTS.RESUMED);
            
            console.log('▶️ 视频已恢复');
            
        } catch (error) {
            console.error('❌ 视频恢复失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取当前帧
     * @returns {HTMLCanvasElement|null} 当前帧画布
     */
    getCurrentFrame() {
        if (!this.videoElement || !this.canvas || this.videoElement.readyState < 2) {
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
            
            // 更新帧计数和播放状态
            this._updateFrameCount();
            this._updatePlaybackState();
            
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
     * 跳转到指定时间
     * @param {number} time - 时间（秒）
     * @returns {Promise<void>}
     */
    async seekTo(time) {
        try {
            if (!this.videoElement) {
                throw new Error('视频元素未准备好');
            }
            
            const clampedTime = Math.max(0, Math.min(time, this.videoInfo.duration));
            
            return new Promise((resolve, reject) => {
                const onSeeked = () => {
                    this.videoElement.removeEventListener('seeked', onSeeked);
                    this._updatePlaybackState();
                    this._emitEvent(INPUT_SOURCE_EVENTS.SEEKED, { time: clampedTime });
                    resolve();
                };
                
                const onError = (error) => {
                    this.videoElement.removeEventListener('error', onError);
                    reject(error);
                };
                
                this.videoElement.addEventListener('seeked', onSeeked);
                this.videoElement.addEventListener('error', onError);
                
                this.videoElement.currentTime = clampedTime;
            });
            
        } catch (error) {
            console.error('❌ 视频跳转失败:', error);
            throw error;
        }
    }
    
    /**
     * 跳转到指定进度
     * @param {number} progress - 进度（0-1）
     * @returns {Promise<void>}
     */
    async seekToProgress(progress) {
        const clampedProgress = Math.max(0, Math.min(progress, 1));
        const time = clampedProgress * this.videoInfo.duration;
        return this.seekTo(time);
    }
    
    /**
     * 前进
     * @param {number} seconds - 前进秒数
     * @returns {Promise<void>}
     */
    async forward(seconds = null) {
        const step = seconds || this.options.seekStep;
        const newTime = this.videoInfo.currentTime + step;
        return this.seekTo(newTime);
    }
    
    /**
     * 后退
     * @param {number} seconds - 后退秒数
     * @returns {Promise<void>}
     */
    async backward(seconds = null) {
        const step = seconds || this.options.seekStep;
        const newTime = this.videoInfo.currentTime - step;
        return this.seekTo(newTime);
    }
    
    /**
     * 设置播放速度
     * @param {number} rate - 播放速度（0.25 - 4.0）
     */
    setPlaybackRate(rate) {
        const clampedRate = Math.max(0.25, Math.min(rate, 4.0));
        
        if (this.videoElement) {
            this.videoElement.playbackRate = clampedRate;
            this.options.playbackRate = clampedRate;
            
            this._emitEvent(INPUT_SOURCE_EVENTS.PLAYBACK_RATE_CHANGED, { rate: clampedRate });
        }
    }
    
    /**
     * 设置音量
     * @param {number} volume - 音量（0-1）
     */
    setVolume(volume) {
        const clampedVolume = Math.max(0, Math.min(volume, 1));
        
        if (this.videoElement) {
            this.videoElement.volume = clampedVolume;
            this._emitEvent(INPUT_SOURCE_EVENTS.VOLUME_CHANGED, { volume: clampedVolume });
        }
    }
    
    /**
     * 静音/取消静音
     * @param {boolean} muted - 是否静音
     */
    setMuted(muted) {
        if (this.videoElement) {
            this.videoElement.muted = muted;
            this.options.muted = muted;
            this._emitEvent(INPUT_SOURCE_EVENTS.MUTED_CHANGED, { muted });
        }
    }
    
    /**
     * 获取输入源状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            type: INPUT_SOURCE_TYPES.VIDEO,
            status: this.status,
            videoInfo: { ...this.videoInfo },
            playbackState: { ...this.playbackState },
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            frameRate: this.actualFrameRate,
            frameCount: this.frameCount,
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
            canSeek: true,
            canAdjustPlaybackRate: true,
            canAdjustVolume: true,
            canLoop: true,
            supportedPlaybackRates: [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0],
            supportedVideoFormats: ['mp4', 'webm', 'ogg', 'mov', 'avi']
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
        
        // 应用配置更改
        if (config.playbackRate !== undefined && config.playbackRate !== oldConfig.playbackRate) {
            this.setPlaybackRate(config.playbackRate);
        }
        
        if (config.muted !== undefined && config.muted !== oldConfig.muted) {
            this.setMuted(config.muted);
        }
        
        if (config.loop !== undefined && config.loop !== oldConfig.loop && this.videoElement) {
            this.videoElement.loop = config.loop;
        }
        
        // 如果视频URL改变，需要重新加载
        if (config.videoUrl !== undefined && config.videoUrl !== oldConfig.videoUrl) {
            const wasRunning = this.status === INPUT_SOURCE_STATUS.RUNNING;
            await this.stop();
            await this.initialize(config.videoUrl);
            if (wasRunning && this.options.autoPlay) {
                await this.start();
            }
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
    
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 开始清理视频资源...');
            
            // 停止播放
            await this.stop();
            
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
            this.isPlaying = false;
            this.isPaused = false;
            this.frameCount = 0;
            this.lastFrameTime = 0;
            this.actualFrameRate = 0;
            this.frameRateHistory = [];
            
            // 重置视频信息
            this.videoInfo = {
                duration: 0,
                currentTime: 0,
                width: 0,
                height: 0,
                frameRate: 0,
                totalFrames: 0
            };
            
            this.playbackState = {
                position: 0,
                progress: 0,
                buffered: 0
            };
            
            console.log('✅ 视频资源清理完成');
            
        } catch (error) {
            console.error('❌ 视频资源清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建视频元素
     * @private
     */
    _createVideoElement() {
        this.videoElement = document.createElement('video');
        this.videoElement.preload = this.options.preload;
        this.videoElement.muted = this.options.muted;
        this.videoElement.loop = this.options.loop;
        this.videoElement.controls = this.options.enableControls;
        this.videoElement.playbackRate = this.options.playbackRate;
        this.videoElement.style.display = 'none';
        
        // 添加事件监听
        this._addVideoEventListeners();
        
        document.body.appendChild(this.videoElement);
    }
    
    /**
     * 创建画布
     * @private
     */
    _createCanvas() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
    }
    
    /**
     * 加载视频
     * @private
     * @returns {Promise<void>}
     */
    async _loadVideo() {
        return new Promise((resolve, reject) => {
            const onLoadedMetadata = () => {
                this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                this.videoElement.removeEventListener('error', onError);
                
                // 更新视频信息
                this._updateVideoInfo();
                
                // 设置画布尺寸
                this.canvas.width = this.videoInfo.width;
                this.canvas.height = this.videoInfo.height;
                
                this._emitEvent(INPUT_SOURCE_EVENTS.METADATA_LOADED, {
                    videoInfo: { ...this.videoInfo }
                });
                
                resolve();
            };
            
            const onError = (error) => {
                this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                this.videoElement.removeEventListener('error', onError);
                reject(new Error(`视频加载失败: ${error.message || '未知错误'}`));
            };
            
            this.videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
            this.videoElement.addEventListener('error', onError);
            
            this.videoElement.src = this.options.videoUrl;
        });
    }
    
    /**
     * 添加视频事件监听
     * @private
     */
    _addVideoEventListeners() {
        // 播放事件
        this.videoElement.addEventListener('play', () => {
            this._emitEvent(INPUT_SOURCE_EVENTS.PLAY);
        });
        
        this.videoElement.addEventListener('pause', () => {
            this._emitEvent(INPUT_SOURCE_EVENTS.PAUSE);
        });
        
        this.videoElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.status = INPUT_SOURCE_STATUS.STOPPED;
            this._emitEvent(INPUT_SOURCE_EVENTS.ENDED);
        });
        
        // 时间更新
        this.videoElement.addEventListener('timeupdate', () => {
            this._updatePlaybackState();
            this._emitEvent(INPUT_SOURCE_EVENTS.TIME_UPDATE, {
                currentTime: this.videoInfo.currentTime,
                progress: this.playbackState.progress
            });
        });
        
        // 缓冲事件
        this.videoElement.addEventListener('progress', () => {
            this._updateBufferedState();
        });
        
        // 错误事件
        this.videoElement.addEventListener('error', (error) => {
            this._emitEvent(INPUT_SOURCE_EVENTS.ERROR, { error });
        });
        
        // 等待数据
        this.videoElement.addEventListener('waiting', () => {
            this._emitEvent(INPUT_SOURCE_EVENTS.WAITING);
        });
        
        // 可以播放
        this.videoElement.addEventListener('canplay', () => {
            this._emitEvent(INPUT_SOURCE_EVENTS.CAN_PLAY);
        });
    }
    
    /**
     * 更新视频信息
     * @private
     */
    _updateVideoInfo() {
        if (!this.videoElement) {
            return;
        }
        
        this.videoInfo = {
            duration: this.videoElement.duration || 0,
            currentTime: this.videoElement.currentTime || 0,
            width: this.videoElement.videoWidth || 0,
            height: this.videoElement.videoHeight || 0,
            frameRate: this._estimateFrameRate(),
            totalFrames: this._estimateTotalFrames()
        };
    }
    
    /**
     * 更新播放状态
     * @private
     */
    _updatePlaybackState() {
        if (!this.videoElement) {
            return;
        }
        
        this.videoInfo.currentTime = this.videoElement.currentTime;
        
        this.playbackState = {
            position: this.videoElement.currentTime,
            progress: this.videoInfo.duration > 0 ? this.videoElement.currentTime / this.videoInfo.duration : 0,
            buffered: this._getBufferedProgress()
        };
    }
    
    /**
     * 更新缓冲状态
     * @private
     */
    _updateBufferedState() {
        this.playbackState.buffered = this._getBufferedProgress();
    }
    
    /**
     * 获取缓冲进度
     * @private
     * @returns {number} 缓冲进度（0-1）
     */
    _getBufferedProgress() {
        if (!this.videoElement || !this.videoElement.buffered.length) {
            return 0;
        }
        
        const buffered = this.videoElement.buffered;
        const duration = this.videoElement.duration;
        
        if (!duration) {
            return 0;
        }
        
        // 获取最大缓冲时间
        let maxBuffered = 0;
        for (let i = 0; i < buffered.length; i++) {
            maxBuffered = Math.max(maxBuffered, buffered.end(i));
        }
        
        return maxBuffered / duration;
    }
    
    /**
     * 估算帧率
     * @private
     * @returns {number} 估算的帧率
     */
    _estimateFrameRate() {
        // 默认帧率，实际应用中可能需要更复杂的检测
        return 30;
    }
    
    /**
     * 估算总帧数
     * @private
     * @returns {number} 估算的总帧数
     */
    _estimateTotalFrames() {
        return Math.floor(this.videoInfo.duration * this.videoInfo.frameRate);
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
            source: 'VideoInputSource',
            type: eventType,
            timestamp: Date.now(),
            ...data
        });
    }
}

// 导出输入源类型和状态枚举
export { INPUT_SOURCE_TYPES, INPUT_SOURCE_STATUS, INPUT_SOURCE_EVENTS };