import { eventBus } from './EventBus.js';
/**
 * 状态管理器实现
 * 提供集中式的应用状态管理
 */
export class StateManagerImpl {
    constructor() {
        this.subscribers = new Set();
        this.state = this.createInitialState();
    }
    /**
     * 创建初始状态
     */
    createInitialState() {
        return {
            dataSource: {
                type: null,
                status: 'idle',
                config: null
            },
            model: {
                type: null,
                isLoaded: false,
                loadingProgress: 0,
                config: null
            },
            analysis: {
                isRunning: false,
                currentPose: null,
                repetitionCount: 0,
                currentExercise: null,
                quality: {
                    score: 0,
                    feedback: []
                }
            },
            render: {
                showKeypoints: true,
                showSkeleton: true,
                showBoundingBox: false
            },
            performance: {
                frameRate: 0,
                inferenceTime: 0,
                totalTime: 0,
                memoryUsage: 0
            },
            ui: {
                showControls: true,
                showStats: false,
                showPerformance: false,
                isLoading: false,
                error: null
            }
        };
    }
    /**
     * 获取当前状态
     */
    getState() {
        return this.deepClone(this.state); // 使用自定义深拷贝防止外部修改
    }
    /**
     * 深拷贝对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Error) {
            const error = new Error(obj.message);
            error.name = obj.name || 'Error';
            error.stack = obj.stack || '';
            return error;
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        if (obj.constructor !== Object) {
            return obj;
        }
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
    /**
     * 更新状态
     * @param newState 新状态（部分更新）
     */
    setState(newState) {
        const prevState = this.getState();
        // 深度合并状态
        this.state = this.deepMerge(this.state, newState);
        // 通知订阅者
        this.notifySubscribers(this.getState(), prevState);
        // 发布状态变更事件
        eventBus.emit('state:changed', this.getState(), prevState);
    }
    /**
     * 订阅状态变更
     * @param callback 回调函数
     * @returns 取消订阅函数
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }
    /**
     * 重置状态
     */
    reset() {
        const prevState = this.getState();
        this.state = this.createInitialState();
        this.notifySubscribers(this.getState(), prevState);
        eventBus.emit('state:reset', this.getState());
    }
    /**
     * 通知所有订阅者
     */
    notifySubscribers(state, prevState) {
        this.subscribers.forEach(callback => {
            try {
                callback(state, prevState);
            }
            catch (error) {
                console.error('状态变更回调错误:', error);
            }
        });
    }
    /**
     * 深度合并对象
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceValue = source[key];
                // 处理null、undefined或基本类型
                if (sourceValue === null || sourceValue === undefined || typeof sourceValue !== 'object') {
                    result[key] = sourceValue;
                }
                // 处理数组
                else if (Array.isArray(sourceValue)) {
                    result[key] = sourceValue;
                }
                // 处理Error对象和其他特殊对象
                else if (sourceValue instanceof Error || sourceValue instanceof Date || sourceValue.constructor !== Object) {
                    result[key] = sourceValue;
                }
                // 处理普通对象
                else {
                    result[key] = this.deepMerge(target[key] || {}, sourceValue);
                }
            }
        }
        return result;
    }
    /**
     * 获取特定路径的状态值
     * @param path 状态路径，如 'dataSource.status'
     */
    getStateByPath(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    /**
     * 设置特定路径的状态值
     * @param path 状态路径
     * @param value 新值
     */
    setStateByPath(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key])
                obj[key] = {};
            return obj[key];
        }, this.state);
        const prevState = this.getState();
        target[lastKey] = value;
        this.notifySubscribers(this.getState(), prevState);
    }
    /**
     * 获取订阅者数量
     */
    getSubscriberCount() {
        return this.subscribers.size;
    }
}
// 全局状态管理器实例
export const stateManager = new StateManagerImpl();
//# sourceMappingURL=StateManager.js.map