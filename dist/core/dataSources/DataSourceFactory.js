import { CameraDataSource } from './CameraDataSource.js';
import { VideoFileDataSource } from './VideoFileDataSource.js';
import { ImageFileDataSource } from './ImageFileDataSource.js';
/**
 * 数据源工厂实现
 * 使用工厂模式创建不同类型的数据源
 */
export class DataSourceFactoryImpl {
    /**
     * 创建摄像头数据源
     */
    createCameraSource(config) {
        return new CameraDataSource(config);
    }
    /**
     * 创建视频文件数据源
     */
    createVideoFileSource(file, config) {
        return new VideoFileDataSource(file, config);
    }
    /**
     * 创建图像文件数据源
     */
    createImageFileSource(files, config) {
        return new ImageFileDataSource(files, config);
    }
    /**
     * 创建流数据源
     */
    createStreamSource(_url, _config) {
        // 暂时抛出错误，因为流数据源还未实现
        throw new Error('流数据源功能尚未实现');
    }
    /**
     * 根据文件自动创建数据源
     */
    createFromFile(file, config) {
        const fileType = this.getFileType(file);
        switch (fileType) {
            case 'video':
                return this.createVideoFileSource(file, config);
            case 'image':
                return this.createImageFileSource([file], config);
            default:
                throw new Error(`不支持的文件类型: ${file.type}`);
        }
    }
    /**
     * 根据文件数组自动创建数据源
     */
    createFromFiles(files, config) {
        if (files.length === 0) {
            throw new Error('文件数组不能为空');
        }
        if (files.length === 1) {
            const firstFile = files[0];
            if (firstFile) {
                return this.createFromFile(firstFile, config);
            }
            else {
                throw new Error('文件不能为空');
            }
        }
        // 多个文件，检查是否都是图像
        const allImages = files.every(file => this.getFileType(file) === 'image');
        if (allImages) {
            return this.createImageFileSource(files, config);
        }
        throw new Error('多个文件必须都是图像文件');
    }
    /**
     * 获取支持的数据源类型
     */
    getSupportedTypes() {
        return ['camera', 'videoFile', 'imageFile'];
    }
    /**
     * 检查文件类型
     */
    getFileType(file) {
        if (file.type.startsWith('video/')) {
            return 'video';
        }
        if (file.type.startsWith('image/')) {
            return 'image';
        }
        return 'unknown';
    }
    /**
     * 检查是否支持指定的文件类型
     */
    isFileTypeSupported(file) {
        return this.getFileType(file) !== 'unknown';
    }
}
// 导出单例实例
export const dataSourceFactory = new DataSourceFactoryImpl();
//# sourceMappingURL=DataSourceFactory.js.map