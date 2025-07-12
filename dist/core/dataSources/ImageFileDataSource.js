import { BaseDataSource } from './BaseDataSource.js';
/**
 * 图像文件数据源
 * 处理图像文件序列的播放
 */
export class ImageFileDataSource extends BaseDataSource {
    constructor(files, config) {
        super('imageFile', config);
        this.currentIndex = 0;
        this.intervalId = null;
        this.frameInterval = 1000 / 30; // 默认30fps
        this.isRunning = false;
        this.files = files;
    }
    /**
     * 验证配置
     */
    validateConfig() {
        // 从配置中获取帧率设置
        const frameRate = this.config?.frameRate;
        if (frameRate && frameRate > 0) {
            this.frameInterval = 1000 / frameRate;
        }
    }
    /**
     * 启动图像序列处理
     */
    async start() {
        try {
            this.setStatus('loading');
            this.validateConfig();
            if (this.files.length === 0) {
                throw new Error('没有有效的图像文件');
            }
            // 预加载第一张图像以验证
            await this.preloadFirstImage();
            // 开始播放序列
            this.startSequence();
            this.setStatus('running');
            this.emit('ready');
            console.log(`🖼️ 图像序列数据源启动成功，共 ${this.files.length} 张图像`);
        }
        catch (error) {
            this.setStatus('error');
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 停止图像序列处理
     */
    stop() {
        try {
            this.setStatus('idle');
            this.isRunning = false;
            // 停止定时器
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            // 重置索引
            this.currentIndex = 0;
            this.emit('end');
            console.log('🖼️ 图像序列数据源已停止');
        }
        catch (error) {
            console.error('停止图像序列时出错:', error);
        }
    }
    /**
     * 获取当前帧
     */
    getFrame() {
        if (this.currentIndex >= this.files.length) {
            return null;
        }
        // 由于图像加载是异步的，这里返回 null
        // 实际的帧数据通过事件发送
        return null;
    }
    /**
     * 验证和排序文件
     */
    validateAndSortFiles(files) {
        const validFiles = files.filter(file => this.isImageFile(file));
        // 按文件名排序
        return validFiles.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * 检查是否为图像文件
     */
    isImageFile(file) {
        const imageTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/svg+xml'
        ];
        return imageTypes.includes(file.type) ||
            /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
    }
    /**
     * 预加载第一张图像
     */
    async preloadFirstImage() {
        if (this.files.length === 0)
            return;
        const firstFile = this.files[0];
        if (firstFile) {
            await this.loadImageFile(firstFile);
        }
    }
    /**
     * 开始序列播放
     */
    startSequence() {
        this.isRunning = true;
        this.currentIndex = 0;
        // 立即加载第一张图像
        this.loadCurrentImage();
        // 设置定时器
        this.intervalId = window.setInterval(() => {
            if (!this.isRunning || this.status !== 'running') {
                return;
            }
            this.currentIndex++;
            if (this.currentIndex >= this.files.length) {
                // 序列结束
                this.handleSequenceEnd();
            }
            else {
                // 加载下一张图像
                this.loadCurrentImage();
            }
        }, this.frameInterval);
    }
    /**
     * 加载当前图像
     */
    async loadCurrentImage() {
        if (this.currentIndex >= this.files.length)
            return;
        try {
            const file = this.files[this.currentIndex];
            if (file) {
                const imageData = await this.loadImageFile(file);
                if (imageData && this.isRunning) {
                    this.emit('frame', imageData);
                }
            }
        }
        catch (error) {
            console.error(`加载图像失败 [${this.currentIndex}]:`, error);
            // 继续下一张图像
        }
    }
    /**
     * 加载图像文件
     */
    async loadImageFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                try {
                    const imageData = this.createImageData(img);
                    URL.revokeObjectURL(url);
                    resolve(imageData);
                }
                catch (error) {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error(`图像加载失败: ${file.name}`));
            };
            img.src = url;
        });
    }
    /**
     * 处理序列结束
     */
    handleSequenceEnd() {
        this.isRunning = false;
        this.setStatus('ended');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.emit('end');
        console.log('🖼️ 图像序列播放结束');
    }
    /**
     * 跳转到指定索引
     * @param index 图像索引
     */
    seekToIndex(index) {
        if (index >= 0 && index < this.files.length) {
            this.currentIndex = index;
            if (this.isRunning) {
                this.loadCurrentImage();
            }
        }
    }
    /**
     * 暂停播放
     */
    pause() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    /**
     * 恢复播放
     */
    resume() {
        if (this.status === 'running' && !this.isRunning) {
            this.startSequence();
        }
    }
    /**
     * 设置播放速度
     * @param fps 每秒帧数
     */
    setFrameRate(fps) {
        if (fps > 0 && fps <= 60) {
            this.frameInterval = 1000 / fps;
            // 如果正在播放，重新设置定时器
            if (this.isRunning && this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = window.setInterval(() => {
                    if (!this.isRunning || this.status !== 'running') {
                        return;
                    }
                    this.currentIndex++;
                    if (this.currentIndex >= this.files.length) {
                        this.handleSequenceEnd();
                    }
                    else {
                        this.loadCurrentImage();
                    }
                }, this.frameInterval);
            }
        }
    }
    /**
     * 获取序列信息
     */
    getSequenceInfo() {
        return {
            totalImages: this.files.length,
            currentIndex: this.currentIndex,
            frameRate: 1000 / this.frameInterval,
            isRunning: this.isRunning,
            fileNames: this.files.map(file => file.name)
        };
    }
    /**
     * 获取当前图像文件
     */
    getCurrentFile() {
        return this.currentIndex < this.files.length ? this.files[this.currentIndex] : null;
    }
    /**
     * 添加图像文件
     * @param files 要添加的文件
     */
    addFiles(files) {
        const validFiles = this.validateAndSortFiles(files);
        this.files.push(...validFiles);
        this.files.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`🖼️ 添加了 ${validFiles.length} 张图像，总计 ${this.files.length} 张`);
    }
    /**
     * 移除图像文件
     * @param index 要移除的文件索引
     */
    removeFile(index) {
        if (index >= 0 && index < this.files.length) {
            const removedFile = this.files.splice(index, 1)[0];
            // 调整当前索引
            if (this.currentIndex >= index) {
                this.currentIndex = Math.max(0, this.currentIndex - 1);
            }
            if (removedFile) {
                console.log(`🖼️ 移除图像: ${removedFile.name}`);
            }
        }
    }
}
//# sourceMappingURL=ImageFileDataSource.js.map