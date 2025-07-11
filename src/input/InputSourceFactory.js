/**
 * 输入源工厂
 * 负责创建和管理各种输入源实例
 */

import { CameraInputSource } from './camera/CameraInputSource.js';
import { VideoInputSource } from './video/VideoInputSource.js';
import { INPUT_SOURCE_TYPES } from './interfaces/IInputSource.js';
import { ErrorHandler } from '../utils/errorHandling.js';

/**
 * 输入源工厂类
 * 提供统一的输入源创建接口
 */
export class InputSourceFactory {
    /**
     * 创建输入源实例
     * @param {string} type - 输入源类型
     * @param {Object} options - 配置选项
     * @returns {IInputSource} 输入源实例
     */
    static createInputSource(type, options = {}) {
        try {
            console.log(`🏭 创建输入源: ${type}`);
            
            switch (type) {
                case INPUT_SOURCE_TYPES.CAMERA:
                    return new CameraInputSource(options);
                    
                case INPUT_SOURCE_TYPES.VIDEO:
                    return new VideoInputSource(options);
                    
                default:
                    throw new Error(`不支持的输入源类型: ${type}`);
            }
            
        } catch (error) {
            console.error('❌ 创建输入源失败:', error);
            throw ErrorHandler.createError('InputSourceFactory', `创建输入源失败: ${error.message}`, error);
        }
    }
    
    /**
     * 创建摄像头输入源
     * @param {Object} options - 摄像头配置选项
     * @returns {CameraInputSource} 摄像头输入源实例
     */
    static createCameraSource(options = {}) {
        return this.createInputSource(INPUT_SOURCE_TYPES.CAMERA, options);
    }
    
    /**
     * 创建视频输入源
     * @param {Object} options - 视频配置选项
     * @returns {VideoInputSource} 视频输入源实例
     */
    static createVideoSource(options = {}) {
        return this.createInputSource(INPUT_SOURCE_TYPES.VIDEO, options);
    }
    
    /**
     * 获取支持的输入源类型
     * @returns {Array<string>} 支持的类型列表
     */
    static getSupportedTypes() {
        return Object.values(INPUT_SOURCE_TYPES);
    }
    
    /**
     * 检查输入源类型是否支持
     * @param {string} type - 输入源类型
     * @returns {boolean} 是否支持
     */
    static isTypeSupported(type) {
        return Object.values(INPUT_SOURCE_TYPES).includes(type);
    }
    
    /**
     * 获取输入源类型的默认配置
     * @param {string} type - 输入源类型
     * @returns {Object} 默认配置
     */
    static getDefaultConfig(type) {
        switch (type) {
            case INPUT_SOURCE_TYPES.CAMERA:
                return {
                    deviceId: null,
                    width: 640,
                    height: 480,
                    frameRate: 30,
                    facingMode: 'user',
                    autoStart: false,
                    enableAudio: false
                };
                
            case INPUT_SOURCE_TYPES.VIDEO:
                return {
                    src: null,
                    autoPlay: false,
                    loop: false,
                    muted: true,
                    controls: false,
                    preload: 'metadata'
                };
                
            default:
                return {};
        }
    }
    
    /**
     * 验证输入源配置
     * @param {string} type - 输入源类型
     * @param {Object} config - 配置对象
     * @returns {boolean} 配置是否有效
     */
    static validateConfig(type, config) {
        try {
            if (!this.isTypeSupported(type)) {
                throw new Error(`不支持的输入源类型: ${type}`);
            }
            
            switch (type) {
                case INPUT_SOURCE_TYPES.CAMERA:
                    return this._validateCameraConfig(config);
                    
                case INPUT_SOURCE_TYPES.VIDEO:
                    return this._validateVideoConfig(config);
                    
                default:
                    return true;
            }
            
        } catch (error) {
            console.error('❌ 配置验证失败:', error);
            return false;
        }
    }
    
    /**
     * 验证摄像头配置
     * @private
     * @param {Object} config - 摄像头配置
     * @returns {boolean} 配置是否有效
     */
    static _validateCameraConfig(config) {
        const { width, height, frameRate, facingMode } = config;
        
        // 验证分辨率
        if (width && (typeof width !== 'number' || width <= 0)) {
            throw new Error('无效的宽度值');
        }
        
        if (height && (typeof height !== 'number' || height <= 0)) {
            throw new Error('无效的高度值');
        }
        
        // 验证帧率
        if (frameRate && (typeof frameRate !== 'number' || frameRate <= 0 || frameRate > 120)) {
            throw new Error('无效的帧率值');
        }
        
        // 验证朝向模式
        if (facingMode && !['user', 'environment'].includes(facingMode)) {
            throw new Error('无效的朝向模式');
        }
        
        return true;
    }
    
    /**
     * 验证视频配置
     * @private
     * @param {Object} config - 视频配置
     * @returns {boolean} 配置是否有效
     */
    static _validateVideoConfig(config) {
        const { src, preload } = config;
        
        // 验证视频源
        if (src && typeof src !== 'string') {
            throw new Error('无效的视频源');
        }
        
        // 验证预加载模式
        if (preload && !['none', 'metadata', 'auto'].includes(preload)) {
            throw new Error('无效的预加载模式');
        }
        
        return true;
    }
}

// 导出工厂实例
export default InputSourceFactory;