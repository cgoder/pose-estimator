import { DataSource, DataSourceStatus } from '../../types/index.js';
/**
 * 数据源基类
 * 提供所有数据源的通用功能
 */
export declare abstract class BaseDataSource implements DataSource {
    readonly type: string;
    status: DataSourceStatus;
    private config;
    private eventListeners;
    constructor(type: string, config?: any);
    /**
     * 获取配置
     */
    getConfig(): any;
    /**
     * 设置状态
     */
    protected setStatus(status: DataSourceStatus): void;
    /**
     * 订阅事件
     */
    on(event: string, callback: Function): void;
    /**
     * 取消订阅事件
     */
    off(event: string, callback: Function): void;
    /**
     * 发布事件
     */
    emit(event: string, ...args: any[]): void;
    /**
     * 创建 ImageData 对象
     */
    protected createImageData(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, width?: number, height?: number): ImageData;
    /**
     * 清理资源
     */
    protected cleanup(): void;
    abstract start(): Promise<void>;
    abstract stop(): void;
    abstract getFrame(): ImageData | null;
}
//# sourceMappingURL=BaseDataSource.d.ts.map