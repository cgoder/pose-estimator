import { EventBus, EventCallback } from '../types/index.js';
/**
 * 事件总线实现
 * 提供发布-订阅模式的事件系统
 */
export declare class EventBusImpl implements EventBus {
    private listeners;
    /**
     * 订阅事件
     * @param event 事件名称
     * @param callback 回调函数
     */
    on(event: string, callback: EventCallback): void;
    /**
     * 取消订阅事件
     * @param event 事件名称
     * @param callback 回调函数
     */
    off(event: string, callback: EventCallback): void;
    /**
     * 发布事件
     * @param event 事件名称
     * @param args 事件参数
     */
    emit(event: string, ...args: any[]): void;
    /**
     * 订阅一次性事件
     * @param event 事件名称
     * @param callback 回调函数
     */
    once(event: string, callback: EventCallback): void;
    /**
     * 清除所有事件监听器
     */
    clear(): void;
    /**
     * 获取事件监听器数量
     * @param event 事件名称
     * @returns 监听器数量
     */
    getListenerCount(event: string): number;
    /**
     * 获取所有事件名称
     * @returns 事件名称数组
     */
    getEventNames(): string[];
}
export declare const eventBus: EventBusImpl;
//# sourceMappingURL=EventBus.d.ts.map