/**
 * 输入源管理器
 * 负责统一管理所有输入源实例的生命周期
 */

import { InputSourceFactory } from './InputSourceFactory.js';
import { INPUT_SOURCE_TYPES, INPUT_SOURCE_STATUS, INPUT_SOURCE_EVENTS } from './interfaces/IInputSource.js';
import { ErrorHandler } from '../utils/errorHandling.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * 输入源管理器类
 * 提供输入源的统一管理接口
 */
export class InputSourceManager {
    constructor() {
        // 输入源实例映射
        this.inputSources = new Map();
        
        // 当前活动的输入源
        this.activeSource = null;
        
        // 错误处理器
        this.errorHandler = ErrorHandler;
        
        // 事件总线
        this.eventBus = eventBus;
        
        // 管理器状态
        this.isInitialized = false;
        
        console.log('🎛️ 输入源管理器已创建');
    }
    
    /**
     * 初始化管理器
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                return;
            }
            
            console.log('🎛️ 初始化输入源管理器...');
            
            // 绑定事件监听
            this._bindEvents();
            
            this.isInitialized = true;
            
            console.log('✅ 输入源管理器初始化完成');
            
        } catch (error) {
            console.error('❌ 输入源管理器初始化失败:', error);
            throw ErrorHandler.createError('InputSourceManager', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 创建输入源
     * @param {string} id - 输入源ID
     * @param {string} type - 输入源类型
     * @param {Object} options - 配置选项
     * @returns {Promise<IInputSource>} 输入源实例
     */
    async createInputSource(id, type, options = {}) {
        try {
            console.log(`🎛️ 创建输入源: ${id} (${type})`);
            
            // 检查ID是否已存在
            if (this.inputSources.has(id)) {
                throw new Error(`输入源ID已存在: ${id}`);
            }
            
            // 创建输入源实例
            const inputSource = InputSourceFactory.createInputSource(type, options);
            
            // 添加到管理器
            this.inputSources.set(id, {
                instance: inputSource,
                type: type,
                id: id,
                createdAt: Date.now(),
                lastUsed: null
            });
            
            // 绑定输入源事件
            this._bindInputSourceEvents(id, inputSource);
            
            console.log(`✅ 输入源创建成功: ${id}`);
            return inputSource;
            
        } catch (error) {
            console.error('❌ 创建输入源失败:', error);
            throw ErrorHandler.createError('InputSourceManager', `创建输入源失败: ${error.message}`, error);
        }
    }
    
    /**
     * 获取输入源
     * @param {string} id - 输入源ID
     * @returns {IInputSource|null} 输入源实例
     */
    getInputSource(id) {
        const sourceInfo = this.inputSources.get(id);
        return sourceInfo ? sourceInfo.instance : null;
    }
    
    /**
     * 删除输入源
     * @param {string} id - 输入源ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    async removeInputSource(id) {
        try {
            console.log(`🎛️ 删除输入源: ${id}`);
            
            const sourceInfo = this.inputSources.get(id);
            if (!sourceInfo) {
                console.warn(`⚠️ 输入源不存在: ${id}`);
                return false;
            }
            
            // 如果是当前活动源，先停用
            if (this.activeSource === sourceInfo.instance) {
                await this.deactivateSource();
            }
            
            // 清理输入源
            await sourceInfo.instance.cleanup();
            
            // 从管理器中移除
            this.inputSources.delete(id);
            
            console.log(`✅ 输入源删除成功: ${id}`);
            return true;
            
        } catch (error) {
            console.error('❌ 删除输入源失败:', error);
            this.errorHandler.handleError(error, 'InputSourceManager.removeInputSource');
            return false;
        }
    }
    
    /**
     * 激活输入源
     * @param {string} id - 输入源ID
     * @returns {Promise<boolean>} 激活是否成功
     */
    async activateSource(id) {
        try {
            console.log(`🎛️ 激活输入源: ${id}`);
            
            const sourceInfo = this.inputSources.get(id);
            if (!sourceInfo) {
                throw new Error(`输入源不存在: ${id}`);
            }
            
            // 停用当前活动源
            if (this.activeSource && this.activeSource !== sourceInfo.instance) {
                await this.deactivateSource();
            }
            
            // 启动新的输入源
            await sourceInfo.instance.start();
            
            // 设置为活动源
            this.activeSource = sourceInfo.instance;
            sourceInfo.lastUsed = Date.now();
            
            // 发布激活事件
            this.eventBus.emit(EVENTS.INPUT_SOURCE_ACTIVATED, {
                id: id,
                type: sourceInfo.type,
                instance: sourceInfo.instance
            });
            
            console.log(`✅ 输入源激活成功: ${id}`);
            return true;
            
        } catch (error) {
            console.error('❌ 激活输入源失败:', error);
            this.errorHandler.handleError(error, 'InputSourceManager.activateSource');
            return false;
        }
    }
    
    /**
     * 停用当前活动输入源
     * @returns {Promise<boolean>} 停用是否成功
     */
    async deactivateSource() {
        try {
            if (!this.activeSource) {
                return true;
            }
            
            console.log('🎛️ 停用当前活动输入源...');
            
            await this.activeSource.stop();
            
            // 发布停用事件
            this.eventBus.emit(EVENTS.INPUT_SOURCE_DEACTIVATED, {
                instance: this.activeSource
            });
            
            this.activeSource = null;
            
            console.log('✅ 输入源停用成功');
            return true;
            
        } catch (error) {
            console.error('❌ 停用输入源失败:', error);
            this.errorHandler.handleError(error, 'InputSourceManager.deactivateSource');
            return false;
        }
    }
    
    /**
     * 切换输入源
     * @param {string} id - 目标输入源ID
     * @returns {Promise<boolean>} 切换是否成功
     */
    async switchSource(id) {
        try {
            console.log(`🎛️ 切换到输入源: ${id}`);
            
            return await this.activateSource(id);
            
        } catch (error) {
            console.error('❌ 切换输入源失败:', error);
            this.errorHandler.handleError(error, 'InputSourceManager.switchSource');
            return false;
        }
    }
    
    /**
     * 获取当前活动输入源
     * @returns {IInputSource|null} 活动输入源实例
     */
    getActiveSource() {
        return this.activeSource;
    }
    
    /**
     * 获取所有输入源信息
     * @returns {Array} 输入源信息列表
     */
    getAllSources() {
        const sources = [];
        
        for (const [id, sourceInfo] of this.inputSources) {
            sources.push({
                id: id,
                type: sourceInfo.type,
                status: sourceInfo.instance.getStatus(),
                isActive: this.activeSource === sourceInfo.instance,
                createdAt: sourceInfo.createdAt,
                lastUsed: sourceInfo.lastUsed
            });
        }
        
        return sources;
    }
    
    /**
     * 获取指定类型的输入源
     * @param {string} type - 输入源类型
     * @returns {Array} 输入源列表
     */
    getSourcesByType(type) {
        const sources = [];
        
        for (const [id, sourceInfo] of this.inputSources) {
            if (sourceInfo.type === type) {
                sources.push({
                    id: id,
                    instance: sourceInfo.instance,
                    isActive: this.activeSource === sourceInfo.instance
                });
            }
        }
        
        return sources;
    }
    
    /**
     * 清理所有输入源
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🎛️ 清理所有输入源...');
            
            // 停用当前活动源
            await this.deactivateSource();
            
            // 清理所有输入源
            const cleanupPromises = [];
            for (const [id, sourceInfo] of this.inputSources) {
                cleanupPromises.push(
                    sourceInfo.instance.cleanup().catch(error => {
                        console.error(`❌ 清理输入源失败 ${id}:`, error);
                    })
                );
            }
            
            await Promise.all(cleanupPromises);
            
            // 清空管理器
            this.inputSources.clear();
            this.activeSource = null;
            
            console.log('✅ 所有输入源清理完成');
            
        } catch (error) {
            console.error('❌ 清理输入源失败:', error);
            throw error;
        }
    }
    
    /**
     * 销毁管理器
     * @returns {Promise<void>}
     */
    async destroy() {
        try {
            console.log('🎛️ 销毁输入源管理器...');
            
            await this.cleanup();
            
            this.isInitialized = false;
            
            console.log('✅ 输入源管理器销毁完成');
            
        } catch (error) {
            console.error('❌ 销毁输入源管理器失败:', error);
            throw error;
        }
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 绑定事件监听
     * @private
     */
    _bindEvents() {
        // 监听全局输入源事件
        this.eventBus.on(EVENTS.INPUT_SOURCE_SWITCH, async (data) => {
            await this.switchSource(data.id);
        });
        
        this.eventBus.on(EVENTS.INPUT_SOURCE_CREATE, async (data) => {
            await this.createInputSource(data.id, data.type, data.options);
        });
        
        this.eventBus.on(EVENTS.INPUT_SOURCE_REMOVE, async (data) => {
            await this.removeInputSource(data.id);
        });
    }
    
    /**
     * 绑定输入源事件
     * @private
     * @param {string} id - 输入源ID
     * @param {IInputSource} inputSource - 输入源实例
     */
    _bindInputSourceEvents(id, inputSource) {
        // 监听输入源状态变化
        inputSource.eventBus.on(INPUT_SOURCE_EVENTS.ERROR, (data) => {
            console.error(`❌ 输入源错误 ${id}:`, data.error);
            
            // 如果是活动源出错，尝试停用
            if (this.activeSource === inputSource) {
                this.deactivateSource().catch(error => {
                    console.error('❌ 停用出错的输入源失败:', error);
                });
            }
        });
        
        inputSource.eventBus.on(INPUT_SOURCE_EVENTS.STOPPED, () => {
            // 如果活动源停止，清除活动状态
            if (this.activeSource === inputSource) {
                this.activeSource = null;
            }
        });
    }
}

// 创建单例实例
let instance = null;

/**
 * 获取输入源管理器单例
 * @returns {InputSourceManager} 管理器实例
 */
export function getInputSourceManager() {
    if (!instance) {
        instance = new InputSourceManager();
    }
    return instance;
}

// 导出管理器类和单例获取函数
export default InputSourceManager;