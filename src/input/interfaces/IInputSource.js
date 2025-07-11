/**
 * 输入源接口定义
 * 定义统一的输入源接口，支持摄像头、视频文件、图片等多种输入源
 */

/**
 * 输入源接口
 * @interface IInputSource
 */
export class IInputSource {
    /**
     * 初始化输入源
     * @param {Object} options - 初始化选项
     * @returns {Promise<void>}
     */
    async init(options = {}) {
        throw new Error('IInputSource.init() must be implemented');
    }

    /**
     * 启动输入源
     * @param {Object} config - 启动配置
     * @returns {Promise<any>} 输入源实例（如video元素）
     */
    async start(config = {}) {
        throw new Error('IInputSource.start() must be implemented');
    }

    /**
     * 停止输入源
     * @returns {Promise<void>}
     */
    async stop() {
        throw new Error('IInputSource.stop() must be implemented');
    }

    /**
     * 暂停输入源
     * @returns {Promise<void>}
     */
    async pause() {
        throw new Error('IInputSource.pause() must be implemented');
    }

    /**
     * 恢复输入源
     * @returns {Promise<void>}
     */
    async resume() {
        throw new Error('IInputSource.resume() must be implemented');
    }

    /**
     * 获取当前帧
     * @returns {any} 当前帧数据
     */
    getCurrentFrame() {
        throw new Error('IInputSource.getCurrentFrame() must be implemented');
    }

    /**
     * 获取输入源状态
     * @returns {Object} 状态信息
     */
    getState() {
        throw new Error('IInputSource.getState() must be implemented');
    }

    /**
     * 获取输入源能力
     * @returns {Object} 能力描述
     */
    getCapabilities() {
        throw new Error('IInputSource.getCapabilities() must be implemented');
    }

    /**
     * 设置输入源配置
     * @param {Object} config - 配置参数
     * @returns {Promise<void>}
     */
    async setConfig(config) {
        throw new Error('IInputSource.setConfig() must be implemented');
    }

    /**
     * 获取输入源配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        throw new Error('IInputSource.getConfig() must be implemented');
    }

    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        throw new Error('IInputSource.cleanup() must be implemented');
    }
}

/**
 * 输入源类型枚举
 */
export const INPUT_SOURCE_TYPES = {
    CAMERA: 'camera',
    VIDEO_FILE: 'video_file',
    IMAGE_FILE: 'image_file',
    STREAM: 'stream',
    CANVAS: 'canvas',
    WEBCAM: 'webcam'
};

/**
 * 输入源状态枚举
 */
export const INPUT_SOURCE_STATUS = {
    UNINITIALIZED: 'uninitialized',
    INITIALIZING: 'initializing',
    READY: 'ready',
    STARTING: 'starting',
    ACTIVE: 'active',
    PAUSED: 'paused',
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    ERROR: 'error',
    DISPOSED: 'disposed'
};

/**
 * 输入源事件枚举
 */
export const INPUT_SOURCE_EVENTS = {
    // 生命周期事件
    INITIALIZING: 'initializing',
    INITIALIZED: 'initialized',
    READY: 'ready',
    STARTING: 'starting',
    STARTED: 'started',
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    PAUSED: 'paused',
    RESUMED: 'resumed',
    
    // 播放控制事件
    PLAY: 'play',
    PAUSE: 'pause',
    ENDED: 'ended',
    SEEKED: 'seeked',
    
    // 配置变更事件
    CONFIG_CHANGED: 'config_changed',
    PLAYBACK_RATE_CHANGED: 'playback_rate_changed',
    VOLUME_CHANGED: 'volume_changed',
    MUTED_CHANGED: 'muted_changed',
    
    // 数据事件
    FRAME_READY: 'frame_ready',
    METADATA_LOADED: 'metadata_loaded',
    FRAME_RATE_UPDATED: 'frame_rate_updated',
    TIME_UPDATE: 'time_update',
    
    // 状态事件
    WAITING: 'waiting',
    CAN_PLAY: 'can_play',
    ERROR: 'error'
};

/**
 * 输入源配置接口
 * @interface IInputSourceConfig
 */
export class IInputSourceConfig {
    constructor() {
        this.type = null;
        this.source = null; // 源路径或设备ID
        this.resolution = {
            width: 640,
            height: 480
        };
        this.frameRate = 30;
        this.format = 'auto';
        this.options = {};
    }
}

/**
 * 输入源状态接口
 * @interface IInputSourceState
 */
export class IInputSourceState {
    constructor() {
        this.status = INPUT_SOURCE_STATUS.UNINITIALIZED;
        this.isInitialized = false;
        this.isActive = false;
        this.isPaused = false;
        this.currentFrame = null;
        this.frameCount = 0;
        this.resolution = { width: 0, height: 0 };
        this.frameRate = 0;
        this.lastError = null;
        this.metadata = {};
    }
}

/**
 * 输入源能力接口
 * @interface IInputSourceCapabilities
 */
export class IInputSourceCapabilities {
    constructor() {
        this.supportedResolutions = [];
        this.supportedFrameRates = [];
        this.supportedFormats = [];
        this.features = {
            pause: false,
            resume: false,
            seek: false,
            loop: false,
            record: false
        };
        this.constraints = {
            maxResolution: { width: 1920, height: 1080 },
            maxFrameRate: 60,
            minFrameRate: 1
        };
    }
}