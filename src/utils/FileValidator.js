/**
 * 文件验证工具类
 * 提供文件类型、大小和格式验证功能
 */

import { VIDEO_CONFIG, IMAGE_CONFIG, ERROR_CODES } from '../config/constants.js';

/**
 * 自定义错误类（本地定义以避免循环依赖）
 */
class ValidationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

export class FileValidator {
    /**
     * 验证图片文件
     * @param {File} file - 要验证的文件
     * @throws {InputSourceError} 验证失败时抛出错误
     */
    static validateImageFile(file) {
        if (!file) {
            throw new ValidationError(
                '文件不能为空',
                ERROR_CODES.INVALID_SOURCE_TYPE
            );
        }

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            throw new ValidationError(
                `不支持的文件类型: ${file.type}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { fileType: file.type, fileName: file.name }
            );
        }

        // 检查文件扩展名
        const extension = this.getFileExtension(file.name).toLowerCase();
        if (!IMAGE_CONFIG.SUPPORTED_FORMATS.includes(extension)) {
            throw new ValidationError(
                `不支持的图片格式: ${extension}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { extension, supportedFormats: IMAGE_CONFIG.SUPPORTED_FORMATS }
            );
        }

        // 检查文件大小
        if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
            throw new ValidationError(
                `图片文件过大: ${this.formatFileSize(file.size)}，最大允许: ${this.formatFileSize(IMAGE_CONFIG.MAX_FILE_SIZE)}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { 
                    fileSize: file.size, 
                    maxSize: IMAGE_CONFIG.MAX_FILE_SIZE,
                    fileName: file.name
                }
            );
        }

        return true;
    }

    /**
     * 验证视频文件
     * @param {File} file - 要验证的文件
     * @throws {InputSourceError} 验证失败时抛出错误
     */
    static validateVideoFile(file) {
        if (!file) {
            throw new ValidationError(
                '文件不能为空',
                ERROR_CODES.INVALID_SOURCE_TYPE
            );
        }

        // 检查文件类型
        if (!file.type.startsWith('video/')) {
            throw new ValidationError(
                `不支持的文件类型: ${file.type}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { fileType: file.type, fileName: file.name }
            );
        }

        // 检查文件扩展名
        const extension = this.getFileExtension(file.name).toLowerCase();
        if (!VIDEO_CONFIG.SUPPORTED_FORMATS.includes(extension)) {
            throw new ValidationError(
                `不支持的视频格式: ${extension}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { extension, supportedFormats: VIDEO_CONFIG.SUPPORTED_FORMATS }
            );
        }

        // 检查文件大小
        if (file.size > VIDEO_CONFIG.MAX_FILE_SIZE) {
            throw new ValidationError(
                `视频文件过大: ${this.formatFileSize(file.size)}，最大允许: ${this.formatFileSize(VIDEO_CONFIG.MAX_FILE_SIZE)}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { 
                    fileSize: file.size, 
                    maxSize: VIDEO_CONFIG.MAX_FILE_SIZE,
                    fileName: file.name
                }
            );
        }

        return true;
    }

    /**
     * 验证图片尺寸
     * @param {HTMLImageElement} image - 图片元素
     * @throws {InputSourceError} 验证失败时抛出错误
     */
    static validateImageDimensions(image) {
        const { naturalWidth, naturalHeight } = image;
        const { width: maxWidth, height: maxHeight } = IMAGE_CONFIG.MAX_DIMENSIONS;

        if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
            throw new ValidationError(
                `图片尺寸过大: ${naturalWidth}x${naturalHeight}，最大允许: ${maxWidth}x${maxHeight}`,
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { 
                    actualDimensions: { width: naturalWidth, height: naturalHeight },
                    maxDimensions: { width: maxWidth, height: maxHeight }
                }
            );
        }

        if (naturalWidth === 0 || naturalHeight === 0) {
            throw new ValidationError(
                '图片尺寸无效',
                ERROR_CODES.INVALID_SOURCE_TYPE,
                { dimensions: { width: naturalWidth, height: naturalHeight } }
            );
        }

        return true;
    }

    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 文件扩展名
     */
    static getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1) : '';
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的文件大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检查是否为图片文件
     * @param {File} file - 文件对象
     * @returns {boolean} 是否为图片文件
     */
    static isImageFile(file) {
        if (!file || !file.type) return false;
        return file.type.startsWith('image/');
    }

    /**
     * 检查是否为视频文件
     * @param {File} file - 文件对象
     * @returns {boolean} 是否为视频文件
     */
    static isVideoFile(file) {
        if (!file || !file.type) return false;
        return file.type.startsWith('video/');
    }

    /**
     * 获取媒体文件信息
     * @param {File} file - 文件对象
     * @returns {Object} 文件信息
     */
    static getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            extension: this.getFileExtension(file.name),
            formattedSize: this.formatFileSize(file.size),
            isImage: this.isImageFile(file),
            isVideo: this.isVideoFile(file),
            lastModified: new Date(file.lastModified)
        };
    }
}

export default FileValidator;