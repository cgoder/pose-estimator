import { eventBus } from '../EventBus.js';
/**
 * 数据源基类
 * 提供所有数据源的通用功能
 */
export class BaseDataSource {
    constructor(type, config = {}) {
        this.status = 'idle';
        this.eventListeners = new Map();
        this.type = type;
        this.config = { ...config };
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 设置状态
     */
    setStatus(status) {
        if (this.status !== status) {
            const prevStatus = this.status;
            this.status = status;
            // 发布状态变更事件
            eventBus.emit('dataSource:statusChanged', {
                type: this.type,
                status,
                prevStatus
            });
            console.log(`📡 数据源 [${this.type}] 状态变更: ${prevStatus} → ${status}`);
        }
    }
    /**
     * 订阅事件
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    /**
     * 取消订阅事件
     */
    off(event, callback) {
        const callbacks = this.eventListeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    /**
     * 发布事件
     */
    emit(event, ...args) {
        const callbacks = this.eventListeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                }
                catch (error) {
                    console.error(`数据源事件处理错误 [${event}]:`, error);
                }
            });
        }
        // 同时发布到全局事件总线
        eventBus.emit(`dataSource:${event}`, {
            type: this.type,
            ...args
        });
    }
    /**
     * 创建 ImageData 对象
     */
    createImageData(source, width, height) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = width || this.config.width || source.width || 640;
        const targetHeight = height || this.config.height || source.height || 480;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        // 绘制并获取图像数据
        ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
        return ctx.getImageData(0, 0, targetWidth, targetHeight);
    }
    /**
     * 清理资源
     */
    cleanup() {
        this.eventListeners.clear();
        this.setStatus('idle');
    }
}
//# sourceMappingURL=BaseDataSource.js.map