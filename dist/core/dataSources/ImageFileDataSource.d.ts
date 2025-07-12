import { BaseDataSource } from './BaseDataSource.js';
/**
 * 图像文件数据源
 * 处理图像文件序列的播放
 */
export declare class ImageFileDataSource extends BaseDataSource {
    private files;
    private currentIndex;
    private intervalId;
    private frameInterval;
    private isRunning;
    constructor(files: File[], config?: any);
    /**
     * 验证配置
     */
    private validateConfig;
    /**
     * 启动图像序列处理
     */
    start(): Promise<void>;
    /**
     * 停止图像序列处理
     */
    stop(): void;
    /**
     * 获取当前帧
     */
    getFrame(): ImageData | null;
    /**
     * 验证和排序文件
     */
    private validateAndSortFiles;
    /**
     * 检查是否为图像文件
     */
    private isImageFile;
    /**
     * 预加载第一张图像
     */
    private preloadFirstImage;
    /**
     * 开始序列播放
     */
    private startSequence;
    /**
     * 加载当前图像
     */
    private loadCurrentImage;
    /**
     * 加载图像文件
     */
    private loadImageFile;
    /**
     * 处理序列结束
     */
    private handleSequenceEnd;
    /**
     * 跳转到指定索引
     * @param index 图像索引
     */
    seekToIndex(index: number): void;
    /**
     * 暂停播放
     */
    pause(): void;
    /**
     * 恢复播放
     */
    resume(): void;
    /**
     * 设置播放速度
     * @param fps 每秒帧数
     */
    setFrameRate(fps: number): void;
    /**
     * 获取序列信息
     */
    getSequenceInfo(): {
        totalImages: number;
        currentIndex: number;
        frameRate: number;
        isRunning: boolean;
        fileNames: string[];
    };
    /**
     * 获取当前图像文件
     */
    getCurrentFile(): File | null;
    /**
     * 添加图像文件
     * @param files 要添加的文件
     */
    addFiles(files: File[]): void;
    /**
     * 移除图像文件
     * @param index 要移除的文件索引
     */
    removeFile(index: number): void;
}
//# sourceMappingURL=ImageFileDataSource.d.ts.map