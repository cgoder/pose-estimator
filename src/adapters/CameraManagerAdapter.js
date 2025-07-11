/**
 * CameraManager适配器
 * 为CameraInputSource提供CameraManager兼容接口
 * 实现适配器模式，确保向后兼容性
 */

import { ICameraManager } from '../interfaces/components/ICameraManager.js';
import { InputSourceFactory } from '../input/InputSourceFactory.js';
import { INPUT_SOURCE_TYPES } from '../input/interfaces/IInputSource.js';
import { ErrorHandler } from '../utils/errorHandling.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * CameraManager适配器类
 * 将CameraInputSource适配为CameraManager接口
 */
export class CameraManagerAdapter extends ICameraManager {
    constructor() {
        super();
        
        // 创建摄像头输入源实例
        this.cameraInputSource = InputSourceFactory.createCameraSource({
            autoStart: false
        });
        
        // 错误处理器
        this.errorHandler = ErrorHandler;
        
        // 绑定事件总线事件
        this._bindEventBusEvents();
        
        console.log('📷 CameraManager适配器已创建');
    }
    
    /**
     * 初始化模块（IBaseModule接口方法）
     * @param {Object} config - 配置对象
     * @param {Object} dependencies - 依赖对象
     * @returns {Promise<void>}
     */
    async init(config = {}, dependencies = {}) {
        try {
            console.log('📷 初始化摄像头管理器适配器...');
            
            await this.cameraInputSource.initialize();
            
            console.log('✅ 摄像头管理器适配器初始化完成');
            
        } catch (error) {
            console.error('❌ 摄像头管理器适配器初始化失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.init');
            throw error;
        }
    }

    /**
     * 初始化摄像头管理器
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize() {
        try {
            console.log('📷 初始化摄像头管理器...');
            
            await this.cameraInputSource.initialize();
            
            console.log('✅ 摄像头管理器初始化完成');
            return true;
            
        } catch (error) {
            console.error('❌ 摄像头管理器初始化失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.initialize');
            return false;
        }
    }
    
    /**
     * 启动摄像头
     * @param {Object} options - 启动选项
     * @returns {Promise<HTMLVideoElement>} 视频元素
     */
    async startCamera(options = {}) {
        try {
            console.log('📷 启动摄像头...', options);
            
            return await this.cameraInputSource.startCamera(options);
            
        } catch (error) {
            console.error('❌ 摄像头启动失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.startCamera');
            
            // 发布错误事件
            eventBus.emit(EVENTS.CAMERA_ERROR, {
                error: error.message,
                type: 'start_failed'
            });
            
            throw error;
        }
    }
    
    /**
     * 停止摄像头
     */
    async stopCamera() {
        try {
            console.log('📷 停止摄像头...');
            
            await this.cameraInputSource.stopCamera();
            
            console.log('📷 摄像头已停止');
            
        } catch (error) {
            console.error('❌ 停止摄像头失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.stopCamera');
        }
    }
    
    /**
     * 切换摄像头设备
     * @param {string} deviceId - 设备ID
     * @returns {Promise<boolean>} 切换是否成功
     */
    async switchDevice(deviceId) {
        try {
            console.log('📷 切换摄像头设备:', deviceId);
            
            await this.cameraInputSource.switchDevice(deviceId);
            
            console.log('📷 摄像头设备切换成功');
            return true;
            
        } catch (error) {
            console.error('❌ 切换摄像头设备失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.switchDevice');
            return false;
        }
    }
    
    /**
     * 获取摄像头状态
     * @returns {Object} 摄像头状态
     */
    getCameraStatus() {
        return this.cameraInputSource.getCameraStatus();
    }
    
    /**
     * 获取视频元素
     * @returns {HTMLVideoElement|null} 视频元素
     */
    getVideoElement() {
        return this.cameraInputSource.getVideoElement();
    }
    
    /**
     * 获取媒体流
     * @returns {MediaStream|null} 媒体流
     */
    getStream() {
        return this.cameraInputSource.getStream();
    }
    
    /**
     * 获取可用设备列表
     * @returns {Array} 设备列表
     */
    getAvailableDevices() {
        return this.cameraInputSource.getAvailableDevices();
    }
    
    /**
     * 更新摄像头配置
     * @param {Object} config - 配置对象
     */
    updateConfig(config) {
        this.cameraInputSource.updateConfig(config);
    }
    
    /**
     * 获取模块状态（接口方法）
     * @returns {Object} 模块状态
     */
    getState() {
        return this.cameraInputSource.getState();
    }
    
    /**
     * 重置模块（接口方法）
     */
    async reset() {
        try {
            console.log('📷 重置摄像头管理器...');
            
            await this.cameraInputSource.reset();
            
            console.log('📷 摄像头管理器重置完成');
            
        } catch (error) {
            console.error('❌ 重置摄像头管理器失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.reset');
        }
    }
    
    /**
     * 销毁模块（接口方法）
     */
    async destroy() {
        try {
            console.log('📷 销毁摄像头管理器...');
            
            await this.cameraInputSource.destroy();
            
            console.log('📷 摄像头管理器销毁完成');
            
        } catch (error) {
            console.error('❌ 销毁摄像头管理器失败:', error);
            this.errorHandler.handleError(error, 'CameraManagerAdapter.destroy');
        }
    }
    
    // ==================== 扩展功能 ====================
    
    /**
     * 获取当前帧
     * @returns {HTMLCanvasElement|null} 当前帧画布
     */
    getCurrentFrame() {
        return this.cameraInputSource.getCurrentFrame();
    }
    
    /**
     * 获取当前帧数据
     * @param {string} format - 数据格式
     * @returns {Promise<any>} 帧数据
     */
    async getFrameData(format = 'canvas') {
        return await this.cameraInputSource.getFrameData(format);
    }
    
    /**
     * 暂停摄像头
     * @returns {Promise<void>}
     */
    async pause() {
        await this.cameraInputSource.pause();
    }
    
    /**
     * 恢复摄像头
     * @returns {Promise<void>}
     */
    async resume() {
        await this.cameraInputSource.resume();
    }
    
    /**
     * 获取输入源状态
     * @returns {Object} 状态信息
     */
    getInputSourceStatus() {
        return this.cameraInputSource.getStatus();
    }
    
    /**
     * 获取输入源能力
     * @returns {Object} 能力信息
     */
    getCapabilities() {
        return this.cameraInputSource.getCapabilities();
    }
    
    /**
     * 设置配置
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async setConfig(config) {
        await this.cameraInputSource.setConfig(config);
    }
    
    /**
     * 获取配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return this.cameraInputSource.getConfig();
    }
    
    /**
     * 获取底层输入源实例
     * @returns {CameraInputSource} 输入源实例
     */
    getInputSource() {
        return this.cameraInputSource;
    }
    
    // ==================== IBaseModule 接口方法 ====================
    
    /**
     * 获取模块状态（IBaseModule接口方法）
     * @returns {string} 模块状态
     */
    getStatus() {
        const cameraStatus = this.cameraInputSource.getCameraStatus();
        return cameraStatus.isActive ? 'active' : 'inactive';
    }
    
    /**
     * 获取模块名称（IBaseModule接口方法）
     * @returns {string} 模块名称
     */
    getName() {
        return 'CameraManagerAdapter';
    }
    
    /**
     * 获取模块版本（IBaseModule接口方法）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 绑定事件总线事件
     */
    _bindEventBusEvents() {
        // 监听摄像头控制事件
        eventBus.on(EVENTS.CAMERA_START, async (data) => {
            await this.startCamera(data.options);
        });
        
        eventBus.on(EVENTS.CAMERA_STOP, async () => {
            await this.stopCamera();
        });
        
        eventBus.on(EVENTS.CAMERA_SWITCH, async (data) => {
            await this.switchDevice(data.deviceId);
        });
        
        eventBus.on(EVENTS.CAMERA_CONFIG_UPDATE, (data) => {
            this.updateConfig(data.config);
        });
        
        eventBus.on(EVENTS.CAMERA_RESET_EVENT, async () => {
            await this.reset();
        });
    }
}

// 导出适配器类
export default CameraManagerAdapter;