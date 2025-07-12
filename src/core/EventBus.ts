import { EventBus, EventCallback } from '../types/index.js';

/**
 * 事件总线实现
 * 提供发布-订阅模式的事件系统
 */
export class EventBusImpl implements EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 取消订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param args 事件参数
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`事件处理器错误 [${event}]:`, error);
        }
      });
    }
  }

  /**
   * 订阅一次性事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  once(event: string, callback: EventCallback): void {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    this.on(event, onceCallback);
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 获取事件监听器数量
   * @param event 事件名称
   * @returns 监听器数量
   */
  getListenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * 获取所有事件名称
   * @returns 事件名称数组
   */
  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// 全局事件总线实例
export const eventBus = new EventBusImpl();