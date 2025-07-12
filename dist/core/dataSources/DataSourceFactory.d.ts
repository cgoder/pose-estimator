import { DataSourceFactory, DataSource } from '../../types/index.js';
/**
 * 数据源工厂实现
 * 使用工厂模式创建不同类型的数据源
 */
export declare class DataSourceFactoryImpl implements DataSourceFactory {
    /**
     * 创建摄像头数据源
     */
    createCameraSource(config?: any): DataSource;
    /**
     * 创建视频文件数据源
     */
    createVideoFileSource(file: File, config?: any): DataSource;
    /**
     * 创建图像文件数据源
     */
    createImageFileSource(files: File[], config?: any): DataSource;
    /**
     * 创建流数据源
     */
    createStreamSource(_url: string, _config?: any): DataSource;
    /**
     * 根据文件自动创建数据源
     */
    createFromFile(file: File, config?: any): DataSource;
    /**
     * 根据文件数组自动创建数据源
     */
    createFromFiles(files: File[], config?: any): DataSource;
    /**
     * 获取支持的数据源类型
     */
    getSupportedTypes(): string[];
    /**
     * 检查文件类型
     */
    private getFileType;
    /**
     * 检查是否支持指定的文件类型
     */
    isFileTypeSupported(file: File): boolean;
}
export declare const dataSourceFactory: DataSourceFactoryImpl;
//# sourceMappingURL=DataSourceFactory.d.ts.map