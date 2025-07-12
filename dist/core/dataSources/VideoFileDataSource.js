import { BaseDataSource } from './BaseDataSource.js';
/**
 * 视频文件数据源
 * 处理视频文件的播放和帧提取
 */
export class VideoFileDataSource extends BaseDataSource {
    constructor(file, config) {
        super('videoFile', config);
        this.video = null;
        this.animationId = null;
        this.objectUrl = null;
        this.isPlaying = false;
        this.file = file;
        // 验证文件类型
        if (!this.isVideoFile(file)) {
            throw new Error('不支持的视频文件格式');
        }
    }
    /**
     * 启动视频文件处理
     */
    async start() {
        try {
            this.setStatus('loading');
            // 创建视频元素
            await this.setupVideo();
            // 加载视频文件
            await this.loadVideoFile();
            // 开始播放
            await this.startPlayback();
            this.setStatus('running');
            this.emit('ready');
            console.log('🎬 视频文件数据源启动成功');
        }
        catch (error) {
            this.setStatus('error');
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 停止视频处理
     */
    stop() {
        try {
            this.setStatus('idle');
            this.isPlaying = false;
            // 停止帧循环
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            // 暂停视频
            if (this.video) {
                this.video.pause();
                this.video.currentTime = 0;
            }
            this.cleanup();
            this.emit('end');
            console.log('🎬 视频文件数据源已停止');
        }
        catch (error) {
            console.error('停止视频文件时出错:', error);
        }
    }
    /**
     * 获取当前帧
     */
    getFrame() {
        if (!this.video || this.video.readyState < 2) {
            return null;
        }
        try {
            return this.createImageData(this.video);
        }
        catch (error) {
            console.error('获取视频帧失败:', error);
            return null;
        }
    }
    /**
     * 检查是否为视频文件
     */
    isVideoFile(file) {
        const videoTypes = [
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/avi',
            'video/mov',
            'video/wmv',
            'video/flv'
        ];
        return videoTypes.some(type => file.type.startsWith(type)) ||
            /\.(mp4|webm|ogg|avi|mov|wmv|flv)$/i.test(file.name);
    }
    /**
     * 设置视频元素
     */
    async setupVideo() {
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.preload = 'metadata';
        // 隐藏视频元素
        Object.assign(this.video.style, {
            display: 'none',
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px'
        });
        document.body.appendChild(this.video);
        // 监听视频事件
        this.video.addEventListener('ended', () => {
            this.handleVideoEnd();
        });
        this.video.addEventListener('error', (error) => {
            this.setStatus('error');
            this.emit('error', new Error(`视频播放错误: ${error}`));
        });
    }
    /**
     * 加载视频文件
     */
    async loadVideoFile() {
        if (!this.video)
            return;
        this.objectUrl = URL.createObjectURL(this.file);
        this.video.src = this.objectUrl;
        try {
            // 等待视频元数据加载
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('视频元数据加载超时'));
                }, 30000);
                this.video.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                this.video.addEventListener('error', () => {
                    clearTimeout(timeout);
                    reject(new Error('视频文件加载失败'));
                }, { once: true });
            });
            console.log(`📹 视频文件加载成功: ${this.video.duration.toFixed(2)}秒, ${this.video.videoWidth}x${this.video.videoHeight}`);
        }
        catch (error) {
            if (this.objectUrl) {
                URL.revokeObjectURL(this.objectUrl);
                this.objectUrl = null;
            }
            throw error;
        }
    }
    /**
     * 开始播放
     */
    async startPlayback() {
        if (!this.video)
            return;
        this.isPlaying = true;
        // 开始帧循环
        this.startFrameLoop();
        // 播放视频
        await this.video.play();
    }
    /**
     * 开始帧循环
     */
    startFrameLoop() {
        const loop = () => {
            if (!this.isPlaying || this.status !== 'running') {
                return;
            }
            // 发送当前帧
            const frame = this.getFrame();
            if (frame) {
                this.emit('frame', frame);
            }
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }
    /**
     * 处理视频结束
     */
    handleVideoEnd() {
        this.isPlaying = false;
        this.setStatus('idle');
        this.emit('end');
        console.log('📹 视频播放结束');
    }
    /**
     * 清理资源
     */
    cleanup() {
        super.cleanup();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.video) {
            this.video.pause();
            this.video.remove();
            this.video = null;
        }
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
        this.isPlaying = false;
    }
}
//# sourceMappingURL=VideoFileDataSource.js.map