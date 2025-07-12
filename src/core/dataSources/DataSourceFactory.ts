import { DataSourceFactory, DataSource } from '../../types/index.js';
import { CameraDataSource } from './CameraDataSource.js';
import { VideoFileDataSource } from './VideoFileDataSource.js';
import { ImageFileDataSource } from './ImageFileDataSource.js';

/**
 * 数据源工厂实现
 * 使用工厂模式创建不同类型的数据源
 */
export class DataSourceFactoryImpl implements DataSourceFactory {
  
  /**
   * 创建摄像头数据源
   */
  createCameraSource(config?: any): DataSource {
    return new CameraDataSource(config);
  }

  /**
   * 创建视频文件数据源
   */
  createVideoFileSource(file: File, config?: any): DataSource {
    return new VideoFileDataSource(file, config);
  }

  /**
   * 创建图像文件数据源
   */
  createImageFileSource(files: File[], config?: any): DataSource {
    return new ImageFileDataSource(files, config);
  }

  /**
   * 创建流数据源
   */
  createStreamSource(_url: string, _config?: any): DataSource {
    // 暂时抛出错误，因为流数据源还未实现
    throw new Error('流数据源功能尚未实现');
  }

  /**
   * 根据文件自动创建数据源
   */
  createFromFile(file: File, config?: any): DataSource {
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
  createFromFiles(files: File[], config?: any): DataSource {
    if (files.length === 0) {
      throw new Error('文件数组不能为空');
    }

    if (files.length === 1) {
      const firstFile = files[0];
      if (firstFile) {
        return this.createFromFile(firstFile, config);
      } else {
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
  getSupportedTypes(): string[] {
    return ['camera', 'videoFile', 'imageFile'];
  }

  /**
   * 检查文件类型
   */
  private getFileType(file: File): 'video' | 'image' | 'unknown' {
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
  isFileTypeSupported(file: File): boolean {
    return this.getFileType(file) !== 'unknown';
  }
}

// 导出单例实例
export const dataSourceFactory = new DataSourceFactoryImpl();