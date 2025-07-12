import { DataSource, DataSourceStatus } from '../../types/index.js';
import { eventBus } from '../EventBus.js';

/**
 * 数据源基类
 * 提供所有数据源的通用功能
 */
export abstract class BaseDataSource implements DataSource {
  public readonly type: string;
  public status: DataSourceStatus = 'idle';
  
  private config: any;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(type: string, config: any = {}) {
    this.type = type;
    this.config = { ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): any {
    return { ...this.config };
  }

  /**
   * 设置状态
   */
  protected setStatus(status: DataSourceStatus): void {
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
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 取消订阅事件
   */
  off(event: string, callback: Function): void {
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
  emit(event: string, ...args: any[]): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
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
  protected createImageData(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    width?: number,
    height?: number
  ): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const targetWidth = width || this.config.width || (source as any).width || 640;
    const targetHeight = height || this.config.height || (source as any).height || 480;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // 绘制并获取图像数据
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return ctx.getImageData(0, 0, targetWidth, targetHeight);
  }

  /**
   * 清理资源
   */
  protected cleanup(): void {
    this.eventListeners.clear();
    this.setStatus('idle');
  }

  // 抽象方法，子类必须实现
  abstract start(): Promise<void>;
  abstract stop(): void;
  abstract getFrame(): ImageData | null;
}