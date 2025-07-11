import { IInputManager } from './IInputManager.js';

/**
 * 图像输入管理器接口
 */
export class IImageInputManager extends IInputManager {
    /**
     * 加载图像文件
     * @param {File|string} imageSource - 图像文件或URL
     * @returns {Promise<void>}
     */
    async loadImage(imageSource) {
        throw new Error('IImageInputManager.loadImage must be implemented');
    }

    /**
     * 加载多个图像
     * @param {Array<File|string>} imageSources - 图像文件或URL数组
     * @returns {Promise<void>}
     */
    async loadImages(imageSources) {
        throw new Error('IImageInputManager.loadImages must be implemented');
    }

    /**
     * 获取当前图像
     * @returns {HTMLImageElement} 当前图像
     */
    getCurrentImage() {
        throw new Error('IImageInputManager.getCurrentImage must be implemented');
    }

    /**
     * 切换到下一张图像
     * @returns {boolean} 是否成功切换
     */
    nextImage() {
        throw new Error('IImageInputManager.nextImage must be implemented');
    }

    /**
     * 切换到上一张图像
     * @returns {boolean} 是否成功切换
     */
    previousImage() {
        throw new Error('IImageInputManager.previousImage must be implemented');
    }

    /**
     * 跳转到指定索引的图像
     * @param {number} index - 图像索引
     * @returns {boolean} 是否成功跳转
     */
    goToImage(index) {
        throw new Error('IImageInputManager.goToImage must be implemented');
    }

    /**
     * 获取当前图像索引
     * @returns {number} 当前图像索引
     */
    getCurrentImageIndex() {
        throw new Error('IImageInputManager.getCurrentImageIndex must be implemented');
    }

    /**
     * 获取图像总数
     * @returns {number} 图像总数
     */
    getImageCount() {
        throw new Error('IImageInputManager.getImageCount must be implemented');
    }

    /**
     * 删除当前图像
     * @returns {boolean} 是否成功删除
     */
    removeCurrentImage() {
        throw new Error('IImageInputManager.removeCurrentImage must be implemented');
    }

    /**
     * 删除指定索引的图像
     * @param {number} index - 图像索引
     * @returns {boolean} 是否成功删除
     */
    removeImage(index) {
        throw new Error('IImageInputManager.removeImage must be implemented');
    }

    /**
     * 清空所有图像
     */
    clearImages() {
        throw new Error('IImageInputManager.clearImages must be implemented');
    }

    /**
     * 获取图像信息
     * @param {number} index - 图像索引
     * @returns {Object} 图像信息
     */
    getImageInfo(index) {
        throw new Error('IImageInputManager.getImageInfo must be implemented');
    }

    /**
     * 缩放图像
     * @param {number} scale - 缩放比例
     */
    scaleImage(scale) {
        throw new Error('IImageInputManager.scaleImage must be implemented');
    }

    /**
     * 旋转图像
     * @param {number} angle - 旋转角度
     */
    rotateImage(angle) {
        throw new Error('IImageInputManager.rotateImage must be implemented');
    }

    /**
     * 重置图像变换
     */
    resetImageTransform() {
        throw new Error('IImageInputManager.resetImageTransform must be implemented');
    }

    /**
     * 检查是否有图像
     * @returns {boolean} 是否有图像
     */
    hasImages() {
        throw new Error('IImageInputManager.hasImages must be implemented');
    }
}

export default IImageInputManager;