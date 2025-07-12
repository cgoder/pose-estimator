import { BaseDataSource } from './BaseDataSource.js';
/**
 * 视频文件数据源
 * 处理视频文件的播放和帧提取
 */
export declare class VideoFileDataSource extends BaseDataSource {
    private file;
    private video;
    private animationId;
    private objectUrl;
    private isPlaying;
    constructor(file: File, config?: any);
    /**
     * 启动视频文件处理
     */
    start(): Promise<void>;
    /**
     * 停止视频处理
     */
    stop(): void;
    /**
     * 获取当前帧
     */
    getFrame(): ImageData | null;
    /**
     * 检查是否为视频文件
     */
    private isVideoFile;
    /**
     * 设置视频元素
     */
    private setupVideo;
    /**
     * 加载视频文件
     */
    private loadVideoFile;
    /**
     * 开始播放
     */
    private startPlayback;
    /**
     * 开始帧循环
     */
    private startFrameLoop;
    /**
     * 处理视频结束
     */
    private handleVideoEnd;
    /**
     * 清理资源
     */
    protected cleanup(): void;
}
//# sourceMappingURL=VideoFileDataSource.d.ts.map