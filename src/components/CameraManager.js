import { CONFIG } from './constants.js';
import { CameraError, CameraErrorFactory } from './cameraErrors.js';

/**
 * 摄像头管理器
 * 负责摄像头的初始化、切换和状态管理
 */
export class CameraManager {
    constructor() {
        this.currentFacingMode = CONFIG.CAMERA.DEFAULT_FACING_MODE;
        this.video = null;
        this.stream = null;
        this.availableDevices = [];
        this.isInitialized = false;
        this.isSwitching = false;
    }

    /**
     * 初始化摄像头管理器
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.updateAvailableDevices();
            this.isInitialized = true;
            console.log('📷 摄像头管理器初始化完成');
        } catch (error) {
            throw CameraErrorFactory.fromMediaError(error);
        }
    }

    /**
     * 更新可用设备列表
     */
    async updateAvailableDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            throw new CameraError('SWITCH_NOT_SUPPORTED', '浏览器不支持设备枚举');
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        this.availableDevices = devices.filter(device => device.kind === 'videoinput');
    }

    /**
     * 检查是否支持摄像头切换
     */
    async checkSwitchSupport() {
        await this.updateAvailableDevices();
        return this.availableDevices.length > 1;
    }

    /**
     * 设置摄像头
     */
    async setupCamera(facingMode = this.currentFacingMode, videoElement = null) {
        try {
            console.log(`📷 设置摄像头 (${facingMode === 'user' ? '前置' : '后置'})...`);

            // 创建或使用现有的video元素
            if (!videoElement) {
                this.video = document.createElement('video');
                this.video.autoplay = true;
                this.video.muted = true;
                this.video.playsInline = true;
                this.video.style.display = 'none';
            } else {
                this.video = videoElement;
            }

            // 构建摄像头约束
            const constraints = {
                video: {
                    ...CONFIG.CAMERA.CONSTRAINTS.video,
                    facingMode: facingMode
                }
            };

            // 请求摄像头访问
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // 等待视频加载
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('视频加载超时'));
                }, CONFIG.CAMERA.TIMEOUT);

                this.video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                this.video.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };
            });

            this.currentFacingMode = facingMode;
            console.log(`✅ 摄像头设置完成: ${facingMode === 'user' ? '前置' : '后置'}`);

            return this.video;

        } catch (error) {
            await this.cleanup();
            throw CameraErrorFactory.fromMediaError(error);
        }
    }

    /**
     * 切换摄像头
     */
    async switchCamera() {
        if (this.isSwitching) {
            throw new CameraError('SWITCH_TIMEOUT', '摄像头切换正在进行中');
        }

        try {
            this.isSwitching = true;

            // 检查切换支持
            const isSupported = await this.checkSwitchSupport();
            if (!isSupported) {
                throw CameraErrorFactory.switchNotSupported();
            }

            // 确定新的摄像头模式
            const newFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

            // 清理当前摄像头
            await this.cleanup();

            // 设置新摄像头
            await this.setupCamera(newFacingMode);

            console.log(`✅ 摄像头切换完成: ${newFacingMode === 'user' ? '前置' : '后置'}`);

        } catch (error) {
            throw error instanceof CameraError ? error : CameraErrorFactory.fromMediaError(error);
        } finally {
            this.isSwitching = false;
        }
    }

    /**
     * 获取当前摄像头模式
     */
    getCurrentFacingMode() {
        return this.currentFacingMode;
    }

    /**
     * 获取视频元素
     */
    getVideoElement() {
        return this.video;
    }

    /**
     * 获取视频流
     */
    getStream() {
        return this.stream;
    }

    /**
     * 获取摄像头状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isSwitching: this.isSwitching,
            currentFacingMode: this.currentFacingMode,
            hasVideo: !!this.video,
            hasStream: !!this.stream,
            availableDevicesCount: this.availableDevices.length,
            supportsSwitching: this.availableDevices.length > 1
        };
    }

    /**
     * 清理资源
     */
    async cleanup() {
        // 停止视频流
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // 清理video元素
        if (this.video) {
            this.video.srcObject = null;
            if (this.video.parentNode) {
                this.video.parentNode.removeChild(this.video);
            }
            this.video = null;
        }

        console.log('🧹 摄像头资源清理完成');
    }
}