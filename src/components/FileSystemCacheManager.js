/**
 * 基于 File System Access API 的高级缓存管理器
 * 仅在支持的浏览器中可用（Chrome 86+）
 * 优势：可以直接访问本地文件系统，存储大型模型文件
 */
export class FileSystemCacheManager {
    constructor() {
        this.isSupported = 'showDirectoryPicker' in window;
        this.directoryHandle = null;
        this.modelInstances = new Map();
    }

    /**
     * 检查浏览器支持
     */
    static isSupported() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * 初始化文件系统访问
     */
    async init() {
        if (!this.isSupported) {
            throw new Error('File System Access API 不支持');
        }

        try {
            // 请求用户选择缓存目录
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads'
            });
            
            console.log('📁 文件系统缓存初始化成功');
        } catch (error) {
            console.warn('⚠️ 用户取消了文件系统访问', error);
            throw error;
        }
    }

    /**
     * 保存模型到本地文件系统
     * @param {string} modelName - 模型名称
     * @param {ArrayBuffer} modelData - 模型数据
     */
    async saveModel(modelName, modelData) {
        if (!this.directoryHandle) {
            throw new Error('文件系统未初始化');
        }

        try {
            const fileHandle = await this.directoryHandle.getFileHandle(
                `${modelName}.tfjs`, 
                { create: true }
            );
            
            const writable = await fileHandle.createWritable();
            await writable.write(modelData);
            await writable.close();
            
            console.log(`💾 模型已保存到本地: ${modelName}`);
        } catch (error) {
            console.error('❌ 保存模型失败:', error);
            throw error;
        }
    }

    /**
     * 从本地文件系统加载模型
     * @param {string} modelName - 模型名称
     */
    async loadModel(modelName) {
        if (!this.directoryHandle) {
            throw new Error('文件系统未初始化');
        }

        try {
            const fileHandle = await this.directoryHandle.getFileHandle(`${modelName}.tfjs`);
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            
            console.log(`📂 从本地加载模型: ${modelName}`);
            return arrayBuffer;
        } catch (error) {
            console.warn(`⚠️ 本地模型不存在: ${modelName}`);
            return null;
        }
    }

    /**
     * 列出所有缓存的模型
     */
    async listCachedModels() {
        if (!this.directoryHandle) {
            return [];
        }

        const models = [];
        for await (const [name, handle] of this.directoryHandle.entries()) {
            if (handle.kind === 'file' && name.endsWith('.tfjs')) {
                models.push(name.replace('.tfjs', ''));
            }
        }
        
        return models;
    }
}