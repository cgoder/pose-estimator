/**
 * EventBus - 统一的事件通信机制
 * 提供发布-订阅模式的事件系统，用于模块间的松耦合通信
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.maxListeners = 50; // 防止内存泄漏
        this.debugMode = false;
    }

    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    on(eventName, callback, options = {}) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new Error('EventBus.on: eventName must be string and callback must be function');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        
        // 检查监听器数量限制
        if (listeners.length >= this.maxListeners) {
            console.warn(`EventBus: Too many listeners for event "${eventName}". Possible memory leak.`);
        }

        const listener = {
            callback,
            context: options.context || null,
            priority: options.priority || 0,
            id: Symbol('listener')
        };

        // 按优先级插入
        const insertIndex = listeners.findIndex(l => l.priority < listener.priority);
        if (insertIndex === -1) {
            listeners.push(listener);
        } else {
            listeners.splice(insertIndex, 0, listener);
        }

        if (this.debugMode) {
            console.log(`EventBus: Subscribed to "${eventName}", total listeners: ${listeners.length}`);
        }

        // 返回取消订阅函数
        return () => this.off(eventName, listener.id);
    }

    /**
     * 订阅一次性事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    once(eventName, callback, options = {}) {
        const unsubscribe = this.on(eventName, (...args) => {
            unsubscribe();
            callback.apply(options.context || null, args);
        }, options);

        return unsubscribe;
    }

    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名称
     * @param {Symbol|Function} listenerOrId - 监听器ID或回调函数
     */
    off(eventName, listenerOrId) {
        if (!this.events.has(eventName)) {
            return;
        }

        const listeners = this.events.get(eventName);
        let index = -1;

        if (typeof listenerOrId === 'symbol') {
            // 通过ID查找
            index = listeners.findIndex(l => l.id === listenerOrId);
        } else if (typeof listenerOrId === 'function') {
            // 通过回调函数查找
            index = listeners.findIndex(l => l.callback === listenerOrId);
        }

        if (index !== -1) {
            listeners.splice(index, 1);
            
            if (this.debugMode) {
                console.log(`EventBus: Unsubscribed from "${eventName}", remaining listeners: ${listeners.length}`);
            }

            // 如果没有监听器了，删除事件
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
        }
    }

    /**
     * 发布事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     * @returns {boolean} 是否有监听器处理了事件
     */
    emit(eventName, ...args) {
        // 参数验证
        if (typeof eventName !== 'string') {
            console.error('EventBus.emit: eventName must be a string, received:', typeof eventName, eventName);
            return false;
        }
        
        if (eventName === 'undefined' || eventName === undefined) {
            console.error('EventBus.emit: Invalid event name "undefined". Check if EVENTS constant is properly defined.');
            return false;
        }
        
        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                // 只对非系统事件显示调试信息，减少控制台噪音
                const systemEvents = [
                    'scriptLoaded', 
                    'loadingProgress',
                    'loading:progress',
                    'ui:loading:ready',
                    'ui:error:ready',
                    'tensorflow:initialized',
                    'app:init'
                ];
                if (!systemEvents.includes(eventName)) {
                    console.log(`EventBus: No listeners for event "${eventName}"`);
                }
            }
            return false;
        }

        const listeners = this.events.get(eventName);
        let hasListeners = false;

        // 复制监听器数组，防止在执行过程中被修改
        const listenersToCall = [...listeners];

        for (const listener of listenersToCall) {
            try {
                if (listener.context) {
                    listener.callback.apply(listener.context, args);
                } else {
                    listener.callback(...args);
                }
                hasListeners = true;
            } catch (error) {
                console.error(`EventBus: Error in listener for event "${eventName}":`, error);
            }
        }

        if (this.debugMode) {
            console.log(`EventBus: Emitted "${eventName}" to ${listenersToCall.length} listeners`);
        }

        return hasListeners;
    }

    /**
     * 异步发布事件
     * @param {string} eventName - 事件名称
     * @param {...any} args - 事件参数
     * @returns {Promise<boolean>} 是否有监听器处理了事件
     */
    async emitAsync(eventName, ...args) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const listeners = this.events.get(eventName);
        const listenersToCall = [...listeners];
        let hasListeners = false;

        for (const listener of listenersToCall) {
            try {
                const result = listener.context 
                    ? listener.callback.apply(listener.context, args)
                    : listener.callback(...args);
                
                // 如果返回Promise，等待完成
                if (result && typeof result.then === 'function') {
                    await result;
                }
                hasListeners = true;
            } catch (error) {
                console.error(`EventBus: Error in async listener for event "${eventName}":`, error);
            }
        }

        return hasListeners;
    }

    /**
     * 获取事件的监听器数量
     * @param {string} eventName - 事件名称
     * @returns {number} 监听器数量
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * 获取所有事件名称
     * @returns {string[]} 事件名称数组
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * 移除所有监听器
     * @param {string} [eventName] - 可选的事件名称，如果不提供则移除所有事件的监听器
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }

        if (this.debugMode) {
            console.log(`EventBus: Removed all listeners${eventName ? ` for "${eventName}"` : ''}`);
        }
    }

    /**
     * 设置最大监听器数量
     * @param {number} max - 最大监听器数量
     */
    setMaxListeners(max) {
        if (typeof max !== 'number' || max < 0) {
            throw new Error('EventBus.setMaxListeners: max must be a non-negative number');
        }
        this.maxListeners = max;
    }

    /**
     * 启用/禁用调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
    }

    /**
     * 获取EventBus状态信息
     * @returns {Object} 状态信息
     */
    getStats() {
        const stats = {
            totalEvents: this.events.size,
            totalListeners: 0,
            events: {}
        };

        for (const [eventName, listeners] of this.events) {
            stats.totalListeners += listeners.length;
            stats.events[eventName] = listeners.length;
        }

        return stats;
    }

    /**
     * 创建命名空间事件总线
     * @param {string} namespace - 命名空间
     * @returns {Object} 命名空间事件总线
     */
    namespace(namespace) {
        const prefixedEventBus = {
            on: (eventName, callback, options) => 
                this.on(`${namespace}:${eventName}`, callback, options),
            once: (eventName, callback, options) => 
                this.once(`${namespace}:${eventName}`, callback, options),
            off: (eventName, listenerOrId) => 
                this.off(`${namespace}:${eventName}`, listenerOrId),
            emit: (eventName, ...args) => 
                this.emit(`${namespace}:${eventName}`, ...args),
            emitAsync: (eventName, ...args) => 
                this.emitAsync(`${namespace}:${eventName}`, ...args),
            removeAllListeners: (eventName) => 
                this.removeAllListeners(eventName ? `${namespace}:${eventName}` : undefined)
        };

        return prefixedEventBus;
    }
}

// 创建全局事件总线实例
const eventBus = new EventBus();

// 在开发模式下启用调试
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    eventBus.setDebugMode(true);
}

// 导出事件总线实例和类
export { EventBus, eventBus };
export default eventBus;

// 定义常用事件名称常量
export const EVENTS = {
    // 应用生命周期事件
    APP_INIT: 'app:init',
    APP_READY: 'app:ready',
    APP_START: 'app:start',
    APP_STARTED: 'app:started',
    APP_STOP: 'app:stop',
    APP_STOPPED: 'app:stopped',
    APP_RESET: 'app:reset',
    APP_DESTROY: 'app:destroy',
    APP_DESTROYED: 'app:destroyed',
    APP_ERROR: 'app:error',
    
    // 摄像头事件
    CAMERA_INIT: 'camera:init',
    CAMERA_READY: 'camera:ready',
    CAMERA_START: 'camera:start',
    CAMERA_STOP: 'camera:stop',
    CAMERA_SWITCH: 'camera:switch',
    CAMERA_CONFIG_UPDATE: 'camera:config:update',
    CAMERA_RESET_EVENT: 'camera:reset',
    CAMERA_STARTED: 'camera:started',
    CAMERA_STOPPED: 'camera:stopped',
    CAMERA_ERROR: 'camera:error',
    CAMERA_CONFIG_UPDATED: 'camera:config:updated',
    CAMERA_PERMISSION_GRANTED: 'camera:permission:granted',
    CAMERA_PERMISSION_DENIED: 'camera:permission:denied',
    CAMERA_DEVICE_CHANGED: 'camera:device:changed',
    CAMERA_RESET: 'camera:reset',
    CAMERA_DESTROYED: 'camera:destroyed',
    
    // 模型事件
    MODEL_LOADING: 'model:loading',
    MODEL_LOADED: 'model:loaded',
    MODEL_ERROR: 'model:error',
    MODEL_PREDICTION: 'model:prediction',
    MODEL_UNLOADED: 'model:unloaded',
    
    // TensorFlow相关事件
    TENSORFLOW_INITIALIZED: 'tensorflow:initialized',
    TENSORFLOW_DESTROYED: 'tensorflow:destroyed',
    
    // 内存管理事件
    MEMORY_CLEANED: 'memory:cleaned',
    MEMORY_WARNING: 'memory:warning',
    MEMORY_CRITICAL: 'memory:critical',
    
    // 缓存事件
    CACHE_HIT: 'cache:hit',
    CACHE_MISS: 'cache:miss',
    CACHE_CLEARED: 'cache:cleared',
    
    // UI相关事件
    UI_CONTROLS_SHOW: 'ui:controls:show',
    UI_CONTROLS_HIDE: 'ui:controls:hide',
    UI_CONTROLS_READY: 'ui:controls:ready',
    UI_STATUS_SHOW: 'ui:status:show',
    UI_STATUS_HIDE: 'ui:status:hide',
    UI_STATUS_READY: 'ui:status:ready',
    UI_PANELS_READY: 'ui:panels:ready',
    UI_LOADING_READY: 'ui:loading:ready',
    UI_LOADING_SHOW: 'ui:loading:show',
    UI_LOADING_HIDE: 'ui:loading:hide',
    UI_ERROR_READY: 'ui:error:ready',
    UI_ERROR_SHOW: 'ui:error:show',
    UI_ERROR_HIDE: 'ui:error:hide',
    UI_PANEL_TOGGLE: 'ui:panel:toggle',
    
    // 错误相关事件
    ERROR_WARNING: 'error:warning',
    ERROR_INFO: 'error:info',
    ERROR_SUCCESS: 'error:success',
    ERROR_SHOWN: 'error:shown',
    ERROR_WARNING_SHOWN: 'error:warning:shown',
    ERROR_INFO_SHOWN: 'error:info:shown',
    ERROR_SUCCESS_SHOWN: 'error:success:shown',
    ERROR_HIDDEN: 'error:hidden',
    ERROR_HISTORY_CLEARED: 'error:history:cleared',
    ERROR_RESET: 'error:reset',
    ERROR_DESTROYED: 'error:destroyed',
    
    // 加载相关事件
    LOADING_UPDATE: 'loading:update',
    LOADING_SHOWN: 'loading:shown',
    LOADING_HIDDEN: 'loading:hidden',
    LOADING_PROGRESS: 'loading:progress',
    LOADING_RESET: 'loading:reset',
    LOADING_DESTROYED: 'loading:destroyed',
    
    // 控制相关事件
    CONTROLS_TOGGLE_MODEL: 'controls:toggle:model',
    CONTROLS_TOGGLE_PERFORMANCE: 'controls:toggle:performance',
    CONTROLS_TOGGLE_FILTER: 'controls:toggle:filter',
    CONTROLS_SHOWN: 'controls:shown',
    CONTROLS_HIDDEN: 'controls:hidden',
    CONTROLS_RESET: 'controls:reset',
    CONTROLS_DESTROYED: 'controls:destroyed',
    CONTROLS_MENU_OPENED: 'controls:menu:opened',
    CONTROLS_MENU_CLOSED: 'controls:menu:closed',
    
    // 状态相关事件
    STATUS_UPDATE: 'status:update',
    STATUS_RESET: 'status:reset',
    STATUS_SHOWN: 'status:shown',
    STATUS_HIDDEN: 'status:hidden',
    STATUS_UPDATED: 'status:updated',
    STATUS_MODULE_RESET: 'status:module:reset',
    STATUS_DESTROYED: 'status:destroyed',
    
    // 模型相关事件
    MODEL_CHANGE: 'model:change',
    MODEL_SKELETON_TOGGLE: 'model:skeleton:toggle',
    MODEL_KEYPOINTS_TOGGLE: 'model:keypoints:toggle',
    MODEL_RESTART: 'model:restart',
    MODEL_CLEAR_CACHE: 'model:clear-cache',
    
    // 滤波器相关事件
    FILTER_TOGGLE: 'filter:toggle',
    FILTER_PRESET_CHANGE: 'filter:preset:change',
    FILTER_PARAM_UPDATE: 'filter:param:update',
    FILTER_PARAMS_UPDATED: 'filter:params:updated',
    FILTER_ENABLED_CHANGED: 'filter:enabled:changed',
    FILTER_RESET: 'filter:reset',
    FILTERS_RESET: 'filters:reset',
    FILTER_APPLY: 'filter:apply',
    
    // 面板事件
    PANELS_MODEL_SHOW: 'panels:model:show',
    PANELS_MODEL_HIDE: 'panels:model:hide',
    PANELS_MODEL_SHOWN: 'panels:model:shown',
    PANELS_MODEL_HIDDEN: 'panels:model:hidden',
    PANELS_MODEL_UPDATE: 'panels:model:update',
    PANELS_FILTER_SHOW: 'panels:filter:show',
    PANELS_FILTER_HIDE: 'panels:filter:hide',
    PANELS_FILTER_SHOWN: 'panels:filter:shown',
    PANELS_FILTER_HIDDEN: 'panels:filter:hidden',
    PANELS_FILTER_UPDATE: 'panels:filter:update',
    PANELS_RESET: 'panels:reset',
    PANELS_DESTROYED: 'panels:destroyed',
    
    // 姿态估计事件
    POSE_INITIALIZED: 'pose:initialized',
    POSE_STARTED: 'pose:started',
    POSE_STOPPED: 'pose:stopped',
    POSE_ERROR: 'pose:error',
    POSE_DETECTION: 'pose:detection',
    POSE_RESET: 'pose:reset',
    POSE_DESTROYED: 'pose:destroyed',
    
    // 性能事件
    PERFORMANCE_UPDATE: 'performance:update',
    PERFORMANCE_WARNING: 'performance:warning',
    
    // 输入源事件
    INPUT_SOURCE_ACTIVATED: 'input:source:activated',
    INPUT_SOURCE_DEACTIVATED: 'input:source:deactivated',
    INPUT_SOURCE_SWITCH: 'input:source:switch',
    INPUT_SOURCE_CREATE: 'input:source:create',
    INPUT_SOURCE_REMOVE: 'input:source:remove',
    
    // AI引擎事件
    AI_ENGINE_INITIALIZED: 'ai:engine:initialized',
    AI_ENGINE_DISPOSED: 'ai:engine:disposed',
    
    // 配置事件
    CONFIG_CHANGE: 'config:change',
    CONFIG_RESET: 'config:reset'
};