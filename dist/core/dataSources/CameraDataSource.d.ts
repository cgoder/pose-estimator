import { BaseDataSource } from './BaseDataSource.js';
/**
 * 摄像头数据源
 * 提供实时摄像头视频流
 */
export declare class CameraDataSource extends BaseDataSource {
    private stream;
    private video;
    private animationId;
    constructor(config?: any);
    /**
     * 验证配置
     */
    private validateConfig;
    /**
     * 启动摄像头
     */
    start(): Promise<void>;
    /**
     * 停止摄像头
     */
    stop(): void;
    /**
     * 获取当前帧
     */
    getFrame(): ImageData | null;
    /**
     * 设置视频元素
     */
    private setupVideo;
    /**
     * 设置摄像头流
     */
    private setupCamera;
    /**
     * 开始帧循环
     */
    private startFrameLoop;
    /**
     * 处理摄像头错误
     */
    private handleCameraError;
    /**
     * 获取摄像头能力
     */
    getCapabilities(): Promise<MediaTrackCapabilities | null>;
    /**
     * 获取当前设置
     */
    getSettings(): MediaTrackSettings | null;
}
//# sourceMappingURL=CameraDataSource.d.ts.map