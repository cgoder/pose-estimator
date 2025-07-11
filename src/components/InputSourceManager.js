/**
 * 输入源管理器
 * 负责管理不同类型的输入源：摄像头、图片、视频文件
 */

import { eventBus } from '../utils/EventBus.js';
import { CameraManagerAdapter } from '../adapters/CameraManagerAdapter.js';
import { FileValidator } from '../utils/FileValidator.js';
import {
    CANVAS_CONFIG,
    SOURCE_TYPES,
    ERROR_CODES,
    PERFORMANCE_CONFIG,
    UI_CONFIG,
    DEBUG_CONFIG
} from '../config/constants.js';
import { logger } from '../utils/Logger.js';
import { performanceMonitor, METRIC_TYPES } from '../utils/PerformanceMonitor.js';
import { errorHandler, InputSourceError } from '../utils/ErrorHandler.js';



/**
 * 输入源管理器
 * 负责管理摄像头、图片、视频等输入源
 */
export class InputSourceManager {
    constructor() {
        this.currentSource = null;
        this.sourceType = null;
        this.isActive = false;
        this.cameraManager = null;
        this.videoElement = null;
        this.imageElement = null;
        this.canvas = null;
        this.context = null;
        
        // 渲染循环状态
        this.isRendering = false;
        this.renderAnimationId = null;
        
        // 性能监控
        this.performanceMetrics = {
            frameCount: 0,
            lastFrameTime: 0,
            fps: 0,
            renderStartTime: null,
            errorCount: 0,
            totalFrames: 0,
            averageFrameTime: 0
        };
        
        // 初始化错误处理器
        errorHandler.setContext('InputSourceManager');
    }

    /**
     * 初始化输入源管理器
     * @throws {InputSourceError} 初始化失败时抛出错误
     */
    async init() {
        try {
            // 获取canvas元素
            this.canvas = document.getElementById('canvas');
            if (!this.canvas) {
                throw new InputSourceError(
                    'Canvas元素未找到',
                    ERROR_CODES.CANVAS_NOT_FOUND,
                    { elementId: 'canvas' }
                );
            }
            
            // 创建优化的2D上下文
            this.context = this.canvas.getContext('2d', CANVAS_CONFIG.CONTEXT_OPTIONS);
            if (!this.context) {
                throw new InputSourceError(
                    '无法获取Canvas 2D上下文',
                    ERROR_CODES.CONTEXT_CREATION_FAILED,
                    { contextOptions: CANVAS_CONFIG.CONTEXT_OPTIONS }
                );
            }
            
            // 设置默认Canvas尺寸
            if (!this.canvas.width) this.canvas.width = CANVAS_CONFIG.DEFAULT_WIDTH;
            if (!this.canvas.height) this.canvas.height = CANVAS_CONFIG.DEFAULT_HEIGHT;
        
            // 确保Canvas和UI状态正确
            this._ensureCanvasVisibility();
            this._ensureUIState();
            
            // 创建隐藏的媒体元素
            this._createMediaElements();
            
        } catch (error) {
            if (error instanceof InputSourceError) {
                throw error;
            }
            throw new InputSourceError(
                `初始化失败: ${error.message}`,
                'INIT_FAILED',
                { originalError: error }
            );
        }
    }
    
    /**
     * 确保Canvas可见性
     * @private
     */
    _ensureCanvasVisibility() {
        if (!this.canvas) {
            logger.error('Canvas元素不存在');
            return;
        }
        
        // 强制确保Canvas可见（使用!important）
        this.canvas.style.setProperty('display', 'block', 'important');
        this.canvas.style.setProperty('visibility', 'visible', 'important');
        this.canvas.style.setProperty('opacity', '1', 'important');
        this.canvas.style.setProperty('background', '#000', 'important');
        
        // 确保父容器也是可见的
        let parent = this.canvas.parentElement;
        while (parent && parent !== document.body) {
            const parentStyle = getComputedStyle(parent);
            
            if (parentStyle.display === 'none') {
                parent.style.setProperty('display', 'flex', 'important');
                logger.canvas(`修复父容器 ${parent.id || parent.className} display`);
            }
            if (parentStyle.visibility === 'hidden') {
                parent.style.setProperty('visibility', 'visible', 'important');
                logger.canvas(`修复父容器 ${parent.id || parent.className} visibility`);
            }
            if (parentStyle.opacity === '0') {
                parent.style.setProperty('opacity', '1', 'important');
                logger.canvas(`修复父容器 ${parent.id || parent.className} opacity`);
            }
            
            parent = parent.parentElement;
        }
        
        logger.canvas('Canvas可见性检查完成');
    }
    
    /**
     * 确保UI状态正确
     * @private
     */
    _ensureUIState() {
        // 强制显示主应用容器
        const appMain = document.getElementById('app-main');
        if (appMain) {
            // 使用!important样式确保显示
            appMain.style.setProperty('display', 'flex', 'important');
            appMain.style.setProperty('opacity', '1', 'important');
            appMain.style.setProperty('visibility', 'visible', 'important');
            appMain.style.setProperty('z-index', '1', 'important');
            logger.canvas('主应用容器已强制显示');
        }
        
        // 强制隐藏HTML中的加载界面
        const appLoading = document.getElementById('app-loading');
        if (appLoading) {
            appLoading.style.setProperty('display', 'none', 'important');
            logger.canvas('HTML加载界面已隐藏');
        }
        
        // 隐藏LoadingManager创建的加载元素
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) {
            loadingStatus.style.setProperty('display', 'none', 'important');
        }
        
        // 隐藏所有可能的加载元素
        const allLoadingElements = document.querySelectorAll('[id*="loading"], [class*="loading"], [class*="spinner"]');
        allLoadingElements.forEach(element => {
            if (element.id !== 'app-main' && element.id !== 'canvas') {
                element.style.setProperty('display', 'none', 'important');
            }
        });
        
        // 强制显示Canvas容器
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.style.setProperty('display', 'inline-block', 'important');
            canvasContainer.style.setProperty('visibility', 'visible', 'important');
            canvasContainer.style.setProperty('opacity', '1', 'important');
            canvasContainer.style.setProperty('background', '#000', 'important');
        }
    }
    
    /**
     * 创建媒体元素
     * @private
     */
    _createMediaElements() {
        // 创建video元素用于视频文件播放
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        this.videoElement.crossOrigin = 'anonymous';
        this.videoElement.loop = true;
        document.body.appendChild(this.videoElement);
        
        // 创建image元素用于图片显示
        this.imageElement = document.createElement('img');
        this.imageElement.style.display = 'none';
        this.imageElement.crossOrigin = 'anonymous';
        document.body.appendChild(this.imageElement);
        
        // 初始化渲染循环状态
        this.isRendering = false;
        this.renderAnimationId = null;
        
        logger.info('输入源管理器初始化完成');
    }

    /**
     * 启动摄像头输入
     * @param {Object} constraints - 摄像头约束条件
     * @returns {Promise<HTMLVideoElement>} 返回video元素
     * @throws {InputSourceError} 摄像头启动失败时抛出错误
     */
    async startCamera(constraints = {}) {
        logger.debug('开始启动摄像头');
        const timerId = performanceMonitor.startTimer('startCamera', METRIC_TYPES.SOURCE_SWITCH);
        
        try {
            await this.stop(); // 停止当前输入源
            
            // 初始化摄像头管理器
            if (!this.cameraManager) {
                this.cameraManager = new CameraManagerAdapter();
                await this.cameraManager.init();
                logger.debug('摄像头适配器初始化完成');
            }
            
            // 启动摄像头
            const videoElement = await this.cameraManager.startCamera(constraints || {});
            logger.debug('摄像头流启动成功');
            
            // 等待video元素准备就绪
            await this._waitForVideoReady(videoElement, 'camera');
            logger.debug('视频已准备就绪');
            
            this.currentSource = videoElement;
            this.sourceType = SOURCE_TYPES.CAMERA;
            this.isActive = true;
            
            // 确保UI状态正确
            this._ensureUIState();
            
            // 确保Canvas可见性
            this._ensureCanvasVisibility();
            
            // 启动Canvas渲染循环
            this.startCanvasRendering();
            
            logger.debug('摄像头启动成功');
            eventBus.emit('input:camera:started');
            
            performanceMonitor.endTimer(timerId, { success: true });
            return this.currentSource;
        } catch (error) {
            logger.error('摄像头启动失败:', error);
            eventBus.emit('input:camera:error', error);
            performanceMonitor.endTimer(timerId, { success: false, error: error.message });
            
            const inputSourceError = errorHandler.handleError(error, {
                method: 'startCamera',
                sourceType: SOURCE_TYPES.CAMERA,
                constraints
            });
            
            throw inputSourceError;
        }
    }

    /**
     * 启动图片输入
     * @param {File|string} file - 图片文件或URL
     * @returns {Promise<HTMLImageElement>} 返回image元素
     * @throws {InputSourceError} 图片启动失败时抛出错误
     */
    async startImage(file) {
        logger.info('启动图片输入...');
        const timerId = performanceMonitor.startTimer('startImage', METRIC_TYPES.SOURCE_SWITCH);
        
        try {
            // 验证文件（如果是File对象）
            if (file instanceof File) {
                FileValidator.validateImageFile(file);
            }
            
            await this.stop(); // 停止当前输入源
            
            return new Promise((resolve, reject) => {
                this.imageElement.onload = () => {
                    try {
                        // 验证图片尺寸
                        FileValidator.validateImageDimensions(this.imageElement);
                        
                        // 调整canvas尺寸以匹配图片
                        this.canvas.width = this.imageElement.naturalWidth;
                        this.canvas.height = this.imageElement.naturalHeight;
                        
                        // 绘制图片到canvas
                        this.context.drawImage(this.imageElement, 0, 0);
                        
                        this.currentSource = this.imageElement;
                        this.sourceType = SOURCE_TYPES.IMAGE;
                        this.isActive = true;
                        
                        logger.info('图片启动成功');
                        eventBus.emit('input:image:started', {
                            width: this.imageElement.naturalWidth,
                            height: this.imageElement.naturalHeight
                        });
                        
                        performanceMonitor.endTimer(timerId, { success: true });
                        resolve(this.currentSource);
                    } catch (error) {
                        performanceMonitor.endTimer(timerId, { success: false, error: 'Image processing failed' });
                        
                        const inputSourceError = errorHandler.handleError(error, {
                            method: 'startImage',
                            sourceType: SOURCE_TYPES.IMAGE,
                            file: file?.name || file,
                            fileSize: file?.size
                        });
                        
                        reject(inputSourceError);
                    }
                };
                
                this.imageElement.onerror = (error) => {
                    logger.error('图片加载失败', error);
                    eventBus.emit('input:image:error', error);
                    performanceMonitor.endTimer(timerId, { success: false, error: '图片加载失败' });
                    
                    const inputSourceError = errorHandler.handleError(error, {
                        method: 'startImage',
                        sourceType: SOURCE_TYPES.IMAGE,
                        file: file?.name || file,
                        fileSize: file?.size
                    });
                    
                    reject(inputSourceError);
                };
                
                // 设置图片源
                if (file instanceof File) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.imageElement.src = e.target.result;
                    };
                    reader.onerror = (error) => {
                        performanceMonitor.endTimer(timerId, { success: false, error: '文件读取失败' });
                        
                        const inputSourceError = errorHandler.handleError(error, {
                            method: 'startImage',
                            sourceType: SOURCE_TYPES.IMAGE,
                            file: file.name,
                            fileSize: file.size,
                            operation: 'fileRead'
                        });
                        
                        reject(inputSourceError);
                    };
                    reader.readAsDataURL(file);
                } else if (typeof file === 'string') {
                    this.imageElement.src = file;
                } else {
                    performanceMonitor.endTimer(timerId, { success: false, error: '不支持的图片格式' });
                    
                    const inputSourceError = errorHandler.handleError(
                        new Error('不支持的图片格式'),
                        {
                            method: 'startImage',
                            sourceType: SOURCE_TYPES.IMAGE,
                            file: file,
                            operation: 'sourceValidation'
                        }
                    );
                    
                    reject(inputSourceError);
                }
            });
        } catch (error) {
            logger.error('图片启动失败', error);
            eventBus.emit('input:image:error', error);
            performanceMonitor.endTimer(timerId, { success: false, error: error.message });
            throw new InputSourceError(
                `图片输入启动失败: ${error.message}`,
                ERROR_CODES.IMAGE_START_FAILED,
                { file: file?.name || file, originalError: error }
            );
        }
    }

    /**
     * 加载图片文件（向后兼容）
     * @deprecated 请使用 startImage 方法
     */
    async loadImage(file) {
        return this.startImage(file);
    }

    /**
     * 启动视频文件
     * @param {File} file - 视频文件
     * @returns {Promise<HTMLVideoElement>} 返回video元素
     * @throws {InputSourceError} 视频启动失败时抛出错误
     */
    async startVideo(file) {
        logger.info('启动视频文件...');
        const timerId = performanceMonitor.startTimer('startVideo', METRIC_TYPES.SOURCE_SWITCH);
        
        try {
            // 验证文件（如果是File对象）
            if (file instanceof File) {
                FileValidator.validateVideoFile(file);
            }
            
            await this.stop(); // 停止当前输入源
            
            return new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = async () => {
                    try {
                        // 调整canvas尺寸以匹配视频
                        this.canvas.width = this.videoElement.videoWidth;
                        this.canvas.height = this.videoElement.videoHeight;
                        
                        // 等待video元素准备就绪
                        await this._waitForVideoReady(this.videoElement, 'video');
                        
                        this.currentSource = this.videoElement;
                        this.sourceType = SOURCE_TYPES.VIDEO;
                        this.isActive = true;
                        
                        // 确保UI状态正确
                        this._ensureUIState();
                        
                        // 确保Canvas可见性
                        this._ensureCanvasVisibility();
                        
                        // 启动Canvas渲染循环
                        this.startCanvasRendering();
                        
                        // 自动播放视频以确保getCurrentFrame能正常工作
                        try {
                            await this.videoElement.play();
                            logger.info('视频启动并开始播放成功');
                            eventBus.emit('input:video:playing');
                        } catch (playError) {
                            logger.warn('视频自动播放失败，可能需要用户交互', playError);
                            // 即使播放失败，也继续完成加载流程
                        }
                        
                        logger.info('视频启动成功，Canvas渲染已启动');
                        eventBus.emit('input:video:started', {
                            width: this.videoElement.videoWidth,
                            height: this.videoElement.videoHeight,
                            duration: this.videoElement.duration
                        });
                        
                        performanceMonitor.endTimer(timerId, { success: true });
                        resolve(this.currentSource);
                    } catch (error) {
                        logger.error('视频准备失败', error);
                        eventBus.emit('input:video:error', error);
                        performanceMonitor.endTimer(timerId, { success: false, error: error.message });
                        
                        const inputSourceError = errorHandler.handleError(error, {
                            method: 'startVideo',
                            sourceType: SOURCE_TYPES.VIDEO,
                            file: file?.name,
                            fileSize: file?.size
                        });
                        
                        reject(inputSourceError);
                    }
                };
                
                this.videoElement.onerror = (error) => {
                    logger.error('视频加载失败', error);
                    eventBus.emit('input:video:error', error);
                    performanceMonitor.endTimer(timerId, { success: false, error: '视频加载失败' });
                    
                    const inputSourceError = errorHandler.handleError(error, {
                        method: 'startVideo',
                        sourceType: SOURCE_TYPES.VIDEO,
                        file: file?.name,
                        fileSize: file?.size
                    });
                    
                    reject(inputSourceError);
                };
                
                // 设置视频源
                if (file instanceof File) {
                    const url = URL.createObjectURL(file);
                    this.videoElement.src = url;
                    
                    // 清理URL对象以防止内存泄漏
                    this.videoElement.addEventListener('loadstart', () => {
                        URL.revokeObjectURL(url);
                    }, { once: true });
                } else if (typeof file === 'string') {
                    this.videoElement.src = file;
                } else {
                    performanceMonitor.endTimer(timerId, { success: false, error: '不支持的视频格式' });
                    
                    const inputSourceError = errorHandler.handleError(
                        new Error('不支持的视频格式'),
                        {
                            method: 'startVideo',
                            sourceType: SOURCE_TYPES.VIDEO,
                            file: file
                        }
                    );
                    
                    reject(inputSourceError);
                }
            });
        } catch (error) {
            logger.error('视频启动失败', error);
            eventBus.emit('input:video:error', error);
            performanceMonitor.endTimer(timerId, { success: false, error: error.message });
            
            const inputSourceError = errorHandler.handleError(error, {
                method: 'startVideo',
                sourceType: SOURCE_TYPES.VIDEO,
                file: file?.name,
                fileSize: file?.size
            });
            
            throw inputSourceError;
        }
    }

    /**
     * 加载视频文件（向后兼容）
     * @deprecated 请使用 startVideo 方法
     */
    async loadVideo(file) {
        return this.startVideo(file);
    }

    /**
     * 播放视频
     */
    async playVideo() {
        if (this.sourceType !== 'video' || !this.videoElement) {
            throw new Error('当前输入源不是视频');
        }
        
        try {
            await this.videoElement.play();
            eventBus.emit('input:video:playing');
        } catch (error) {
            logger.error('视频播放失败', error);
            eventBus.emit('input:video:error', error);
            throw error;
        }
    }

    /**
     * 暂停视频
     */
    pauseVideo() {
        if (this.sourceType !== 'video' || !this.videoElement) {
            throw new Error('当前输入源不是视频');
        }
        
        this.videoElement.pause();
        eventBus.emit('input:video:paused');
    }

    /**
     * 停止当前输入源
     */
    async stop() {
         if (!this.isActive) {
             return;
         }
         
         logger.info('停止输入源...');
         const timerId = performanceMonitor.startTimer('stopSource', METRIC_TYPES.SOURCE_SWITCH);
         
         try {
            // 停止Canvas渲染循环
            this.stopCanvasRendering();
            
            if (this.sourceType === SOURCE_TYPES.CAMERA && this.cameraManager) {
                await this.cameraManager.stopCamera();
            } else if (this.sourceType === SOURCE_TYPES.VIDEO && this.videoElement) {
                this.videoElement.pause();
                this.videoElement.src = '';
            } else if (this.sourceType === SOURCE_TYPES.IMAGE && this.imageElement) {
                this.imageElement.src = '';
            }
            
            this.currentSource = null;
            this.sourceType = null;
            this.isActive = false;
            
            logger.info('输入源已停止');
             eventBus.emit('input:stopped');
             performanceMonitor.endTimer(timerId, { success: true });
         } catch (error) {
             logger.error('停止输入源失败', error);
             performanceMonitor.endTimer(timerId, { success: false, error: error.message });
             
             const inputSourceError = errorHandler.handleError(error, {
                 method: 'stop',
                 sourceType: this.sourceType
             });
             
             throw inputSourceError;
         }
    }

    /**
     * 获取当前输入源
     */
    getCurrentSource() {
        return this.currentSource;
    }

    /**
     * 获取当前帧
     * @returns {HTMLCanvasElement|HTMLVideoElement|HTMLImageElement|null} 当前帧或null
     */
    getCurrentFrame() {
        // 检查输入源管理器状态
        if (!this.isActive || !this.currentSource) {
            logger.debug('InputSourceManager: No active source available', {
                isActive: this.isActive,
                currentSource: !!this.currentSource,
                sourceType: this.sourceType
            });
            return null;
        }
        
        try {
            // 开始性能监控
            const timerId = performanceMonitor.startTimer('getCurrentFrame', METRIC_TYPES.FRAME_GET);
            let frame = null;
            
            // 优先使用输入源的 getCurrentFrame 方法
            if (typeof this.currentSource.getCurrentFrame === 'function') {
                frame = this.currentSource.getCurrentFrame();
                if (frame) {
                    logger.debug('InputSourceManager: Got frame from source getCurrentFrame method');
                    return frame;
                }
            }
            
            // 对于摄像头输入，检查video元素状态
            if (this.sourceType === SOURCE_TYPES.CAMERA && this.currentSource instanceof HTMLVideoElement) {
                const video = this.currentSource;
                
                // 详细的状态检查和调试
                const videoStatus = {
                    readyState: video.readyState,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    paused: video.paused,
                    ended: video.ended,
                    currentTime: video.currentTime,
                    srcObject: !!video.srcObject
                };
                
                // 放宽检查：只要有视频数据就可以获取帧，不检查播放状态
                const isReady = video.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA && 
                    video.videoWidth > 0 && 
                    video.videoHeight > 0 && 
                    !video.ended && 
                    video.srcObject; // 确保有媒体流
                
                if (isReady) {
                    frame = video;
                    // 在调试模式下记录播放状态
                    if (video.paused) {
                        logger.debug('摄像头帧获取成功（视频暂停状态，可能由于自动播放限制）', videoStatus);
                    }
                } else {
                    // 如果video元素状态不正确，返回null（仅在调试模式下输出详细信息）
                    logger.debug('摄像头视频流状态异常', videoStatus);
                    return null;
                }
            }
            
            // 对于视频文件输入，检查video元素状态
            else if (this.sourceType === SOURCE_TYPES.VIDEO && this.currentSource instanceof HTMLVideoElement) {
                const video = this.currentSource;
                
                // 检查video元素是否有有效的视频数据（视频文件不需要检查播放状态）
                const isReady = video.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA && 
                    video.videoWidth > 0 && 
                    video.videoHeight > 0 && 
                    !video.ended;
                
                if (isReady) {
                    logger.debug('InputSourceManager: Video frame ready', {
                        videoWidth: video.videoWidth,
                        videoHeight: video.videoHeight,
                        currentTime: video.currentTime,
                        paused: video.paused
                    });
                    frame = video;
                } else {
                    // 如果video元素状态不正确，返回null
                    logger.debug('视频文件状态异常', {
                        readyState: video.readyState,
                        videoWidth: video.videoWidth,
                        videoHeight: video.videoHeight,
                        paused: video.paused,
                        ended: video.ended,
                        currentTime: video.currentTime,
                        duration: video.duration
                    });
                    return null;
                }
            }
            
            // 对于图片输入
            else if (this.sourceType === SOURCE_TYPES.IMAGE && this.currentSource instanceof HTMLImageElement) {
                logger.debug('InputSourceManager: Image frame ready', {
                    naturalWidth: this.currentSource.naturalWidth,
                    naturalHeight: this.currentSource.naturalHeight
                });
                frame = this.currentSource;
            }
            
            // 对于直接的 HTML 元素，返回元素本身
            else if (this.currentSource instanceof HTMLElement) {
                logger.debug('InputSourceManager: Returning HTML element as frame');
                frame = this.currentSource;
            }
            
            // 结束性能监控
            performanceMonitor.endTimer(timerId, {
                sourceType: this.sourceType,
                hasFrame: !!frame
            });
            
            if (!frame) {
                logger.debug('InputSourceManager: Unable to get current frame', {
                    sourceType: this.sourceType,
                    currentSourceType: this.currentSource.constructor.name
                });
            }
            
            return frame;
        } catch (error) {
            logger.error('InputSourceManager: Error getting current frame', error);
            this.performanceMetrics.errorCount++;
            return null;
        }
    }

    /**
     * 获取当前输入源类型
     */
    getSourceType() {
        return this.sourceType;
    }

    /**
     * 验证帧是否有效
     * @param {*} frame - 要验证的帧
     * @returns {boolean} 帧是否有效
     */
    _isValidFrame(frame) {
        return frame && (
            frame instanceof HTMLCanvasElement ||
            frame instanceof HTMLVideoElement ||
            frame instanceof HTMLImageElement
        );
    }
    
    /**
     * 检查是否有活动的输入源
     */
    isSourceActive() {
        return this.isActive;
    }

    /**
     * 等待video元素准备就绪
     * @private
     * @param {HTMLVideoElement} videoElement - video元素
     * @param {string} sourceType - 源类型 ('camera' 或 'video')
     * @returns {Promise<void>}
     */
    async _waitForVideoReady(videoElement, sourceType = this.sourceType) {
        if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
            throw new Error('无效的video元素');
        }
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('等待video元素准备就绪超时'));
            }, 10000); // 10秒超时
            
            const checkReady = () => {
                const basicReady = videoElement.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA &&
                    videoElement.videoWidth > 0 &&
                    videoElement.videoHeight > 0 &&
                    !videoElement.ended;
                
                let isReady = false;
                
                if (sourceType === 'camera') {
                    // 摄像头：放宽播放状态检查，允许暂停状态（处理自动播放限制）
                    isReady = basicReady; // 不再强制要求 !videoElement.paused
                    
                    // 如果视频正在播放，那更好
                    if (basicReady && !videoElement.paused) {
                        console.log('📹 摄像头视频正在播放');
                    } else if (basicReady && videoElement.paused) {
                        console.log('📹 摄像头视频已准备但暂停（可能由于自动播放限制）');
                    }
                } else if (sourceType === 'video') {
                    // 视频文件只需要基本准备就绪，不检查播放状态
                    isReady = basicReady;
                }
                
                if (isReady) {
                    clearTimeout(timeout);
                    logger.info('Video元素已准备就绪', {
                        sourceType: sourceType,
                        readyState: videoElement.readyState,
                        videoWidth: videoElement.videoWidth,
                        videoHeight: videoElement.videoHeight,
                        paused: videoElement.paused,
                        ended: videoElement.ended,
                        autoplayBlocked: sourceType === 'camera' && videoElement.paused
                    });
                    resolve();
                } else {
                    // 继续检查
                    setTimeout(checkReady, 100);
                }
            };
            
            checkReady();
        });
    }
    
    /**
     * 获取输入源尺寸
     */
    getSourceDimensions() {
        if (!this.currentSource) {
            return null;
        }
        
        switch (this.sourceType) {
            case 'camera':
            case 'video':
                return {
                    width: this.currentSource.videoWidth || 0,
                    height: this.currentSource.videoHeight || 0
                };
            case 'image':
                return {
                    width: this.currentSource.naturalWidth || 0,
                    height: this.currentSource.naturalHeight || 0
                };
            default:
                return null;
        }
    }
    
    /**
     * 启动Canvas渲染循环
     * @throws {InputSourceError} 渲染启动失败时抛出错误
     */
    startCanvasRendering() {
        if (this.isRendering) {
            return;
        }
        
        if (!this.canvas || !this.context) {
            throw new InputSourceError(
                'Canvas未初始化，无法启动渲染',
                'CANVAS_NOT_INITIALIZED'
            );
        }
        
        this.isRendering = true;
        this.performanceMetrics.renderStartTime = performance.now();
        this.performanceMetrics.frameCount = 0;
        this.performanceMetrics.errorCount = 0;
        
        logger.canvas('Canvas渲染循环启动', {
            canvasSize: `${this.canvas.width}x${this.canvas.height}`,
            sourceType: this.sourceType
        });
        
        const renderFrame = () => {
             if (!this.isRendering || !this.isActive) {
                 logger.canvas('渲染循环停止', { isRendering: this.isRendering, isActive: this.isActive });
                 return;
             }
             
             // 开始帧渲染性能监控
             const renderTimerId = performanceMonitor.startTimer('renderFrame', METRIC_TYPES.FRAME_RENDER);
             
             try {
                 const currentFrame = this.getCurrentFrame();
                 
                 // 基本状态检查（减少日志输出以提高性能）
                 if (this.canvas && !document.contains(this.canvas)) {
                     console.error('❌ Canvas不在DOM中！');
                     return;
                 }
                 
                 // 检查Canvas是否可见（仅在出现问题时输出日志）
                 if (this.canvas) {
                     const rect = this.canvas.getBoundingClientRect();
                     if (rect.width === 0 || rect.height === 0) {
                         console.warn('⚠️ Canvas尺寸为0，可能不可见', {
                             rect: { width: rect.width, height: rect.height },
                             offsetParent: !!this.canvas.offsetParent
                         });
                     }
                 }
                
                if (currentFrame && this.canvas && this.context) {
                    // 设置Canvas尺寸
                    const dimensions = this.getSourceDimensions();
                    
                    // 添加详细的调试信息
                    console.log('🎨 渲染帧调试信息:', {
                        hasCurrentFrame: !!currentFrame,
                        frameType: currentFrame?.constructor?.name,
                        dimensions: dimensions,
                        canvasSize: { width: this.canvas.width, height: this.canvas.height },
                        sourceType: this.sourceType,
                        videoReady: currentFrame instanceof HTMLVideoElement ? {
                            readyState: currentFrame.readyState,
                            videoWidth: currentFrame.videoWidth,
                            videoHeight: currentFrame.videoHeight,
                            paused: currentFrame.paused
                        } : 'N/A'
                    });
                    
                    if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
                        // 记录当前Canvas尺寸
                        const currentWidth = this.canvas.width;
                        const currentHeight = this.canvas.height;
                        
                        // 更新Canvas尺寸（仅在尺寸变化时）
                        if (currentWidth !== dimensions.width || currentHeight !== dimensions.height) {
                            this.canvas.width = dimensions.width;
                            this.canvas.height = dimensions.height;
                            logger.canvas('Canvas尺寸已更新', {
                                 from: { width: currentWidth, height: currentHeight },
                                 to: dimensions
                             });
                        }
                        
                        // 清空并绘制当前帧
                        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        this.context.drawImage(currentFrame, 0, 0, this.canvas.width, this.canvas.height);
                        
                        // 更新性能指标
                        this.performanceMetrics.frameCount++;
                        this.performanceMetrics.totalFrames++;
                        const now = performance.now();
                        
                        if (now - this.performanceMetrics.lastFrameTime > PERFORMANCE_CONFIG.METRICS_UPDATE_INTERVAL) {
                            this.performanceMetrics.fps = this.performanceMetrics.frameCount;
                            this.performanceMetrics.frameCount = 0;
                            this.performanceMetrics.lastFrameTime = now;
                            
                            // 更新性能监控器的FPS指标
                             performanceMonitor.updateFps();
                        }
                        
                        // 强制触发重绘
                        this.canvas.style.transform = 'translateZ(0)';
                    } else {
                        logger.canvas('无效的源尺寸，跳过渲染', dimensions);
                    }
                } else {
                    // 渲染条件不满足时，仅记录到日志系统
                    logger.canvas('渲染条件不满足', {
                         hasFrame: !!currentFrame,
                         hasCanvas: !!this.canvas,
                         hasContext: !!this.context
                     });
                }
            } catch (error) {
                this.performanceMetrics.errorCount++;
                
                const inputSourceError = errorHandler.handleError(error, {
                    method: 'startCanvasRendering',
                    frameCount: this.performanceMetrics.frameCount,
                    errorCount: this.performanceMetrics.errorCount
                });
                
                // 连续错误检测
                if (this.performanceMetrics.errorCount > PERFORMANCE_CONFIG.ERROR_THRESHOLD) {
                    this.stopCanvasRendering();
                    logger.error('Canvas渲染连续错误过多，已停止渲染', {
                        errorCount: this.performanceMetrics.errorCount,
                        threshold: PERFORMANCE_CONFIG.ERROR_THRESHOLD
                    });
                    throw new InputSourceError(
                        '渲染错误过多，停止渲染循环',
                        ERROR_CODES.RENDER_ERROR_THRESHOLD_EXCEEDED,
                        { 
                            errorCount: this.performanceMetrics.errorCount,
                            threshold: PERFORMANCE_CONFIG.ERROR_THRESHOLD
                        }
                    );
                }
            } finally {
                // 确保性能监控结束
                if (renderTimerId) {
                    performanceMonitor.endTimer(renderTimerId, {
                        frameRendered: true
                    });
                }
            }
            
            // 继续下一帧
            this.renderAnimationId = requestAnimationFrame(renderFrame);
        };
        
        // 开始渲染循环
        this.renderAnimationId = requestAnimationFrame(renderFrame);
    }
    
    /**
     * 停止Canvas渲染循环
     */
    stopCanvasRendering() {
        if (!this.isRendering) {
            return;
        }
        
        this.isRendering = false;
        
        if (this.renderAnimationId) {
            cancelAnimationFrame(this.renderAnimationId);
            this.renderAnimationId = null;
        }
        
        // 记录渲染结束时间
        if (this.performanceMetrics.renderStartTime) {
            const totalTime = performance.now() - this.performanceMetrics.renderStartTime;
            logger.info('Canvas渲染循环已停止', {
                totalTime: `${totalTime.toFixed(2)}ms`,
                totalFrames: this.performanceMetrics.frameCount,
                avgFps: this.performanceMetrics.frameCount / (totalTime / 1000),
                errorCount: this.performanceMetrics.errorCount
            });
        }
    }

    /**
     * 获取性能指标
     * @returns {Object} 性能指标对象
     */
    getPerformanceMetrics() {
        const currentTime = performance.now();
        const totalTime = this.performanceMetrics.renderStartTime ? 
            currentTime - this.performanceMetrics.renderStartTime : 0;
        
        // 合并本地性能指标和 PerformanceMonitor 的报告
        const monitorReport = performanceMonitor.getPerformanceReport();
        const errorReport = errorHandler.getErrorStats();
        
        return {
            isRendering: this.isRendering,
            frameCount: this.performanceMetrics.frameCount,
            fps: this.performanceMetrics.fps,
            totalRenderTime: totalTime,
            errorCount: this.performanceMetrics.errorCount || 0,
            sourceType: this.sourceType,
            isActive: this.isActive,
            canvasDimensions: this.canvas ? {
                width: this.canvas.width,
                height: this.canvas.height
            } : null,
            sourceDimensions: this.getSourceDimensions(),
            detailedMetrics: monitorReport,
            errorHandler: errorReport
        };
    }

    /**
     * 重置性能指标
     */
    resetPerformanceMetrics() {
        this.performanceMetrics = {
            frameCount: 0,
            lastFrameTime: 0,
            fps: 0,
            renderStartTime: this.isRendering ? performance.now() : null,
            errorCount: 0
        };
        
        // 同时重置 PerformanceMonitor 和 ErrorHandler 的指标
        performanceMonitor.reset();
        errorHandler.reset();
        logger.info('性能指标已重置');
    }

    /**
     * 清理资源
     * @private
     */
    _cleanup() {
        // 停止渲染循环
        this.stopCanvasRendering();
        
        // 清理媒体资源
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.load(); // 释放媒体资源
        }
        
        if (this.imageElement) {
            this.imageElement.src = '';
        }
        
        // 清理Canvas
        if (this.canvas && this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // 重置状态
        this.currentSource = null;
        this.sourceType = null;
        this.isActive = false;
        
        // 重置性能指标
        this.resetPerformanceMetrics();
    }
    
    /**
     * 销毁输入源管理器
     */
    async destroy() {
        logger.info('销毁输入源管理器...');
        const timerId = performanceMonitor.startTimer('destroyManager', METRIC_TYPES.SOURCE_SWITCH);
        
        try {
            await this.stop();
            
            // 清理所有资源
            this._cleanup();
            
            // 清理媒体元素
            if (this.videoElement) {
                this.videoElement.remove();
                this.videoElement = null;
            }
            
            if (this.imageElement) {
                this.imageElement.remove();
                this.imageElement = null;
            }
            
            // 清理摄像头管理器
            if (this.cameraManager) {
                await this.cameraManager.destroy?.();
                this.cameraManager = null;
            }
            
            // 清理Canvas引用
            if (this.canvas) {
                this.canvas.width = 0;
                this.canvas.height = 0;
            }
            
            this.canvas = null;
            this.context = null;
            
            // 清理事件监听器
            eventBus.off('input:camera:started');
            eventBus.off('input:camera:error');
            eventBus.off('input:image:started');
            eventBus.off('input:image:error');
            eventBus.off('input:video:started');
            eventBus.off('input:video:error');
            eventBus.off('input:video:playing');
            eventBus.off('input:stopped');
            
            performanceMonitor.endTimer(timerId, { success: true });
            logger.info('输入源管理器已销毁');
        } catch (error) {
            performanceMonitor.endTimer(timerId, { success: false, error: error.message });
            
            const inputSourceError = errorHandler.handleError(error, {
                method: 'destroy'
            });
            
            logger.error('销毁输入源管理器时出错', inputSourceError);
        }
    }
}

// 创建全局实例
export const inputSourceManager = new InputSourceManager();