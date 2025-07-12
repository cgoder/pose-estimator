import { BaseDataSource } from './BaseDataSource.js';

/**
 * 摄像头数据源
 * 提供实时摄像头视频流
 */
export class CameraDataSource extends BaseDataSource {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private animationId: number | null = null;

  constructor(config?: any) {
    super('camera', config);
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    // 设置默认配置
    const config = (this as any).config || {};
    if (!config.width) config.width = 640;
    if (!config.height) config.height = 480;
    if (!config.fps) config.fps = 30;
    (this as any).config = config;
  }

  /**
   * 启动摄像头
   */
  async start(): Promise<void> {
    try {
      this.setStatus('loading');
      this.validateConfig();

      // 创建视频元素
      await this.setupVideo();
      
      // 获取摄像头流
      await this.setupCamera();
      
      // 开始帧循环
      this.startFrameLoop();
      
      this.setStatus('running');
      this.emit('ready');
      
      console.log('📷 摄像头数据源启动成功');
      
    } catch (error) {
      this.setStatus('error');
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 停止摄像头
   */
  stop(): void {
    try {
      this.setStatus('idle');
      
      // 停止帧循环
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      // 停止媒体流
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // 清理视频元素
      if (this.video) {
        this.video.srcObject = null;
        if (this.video.parentNode) {
          this.video.parentNode.removeChild(this.video);
        }
        this.video = null;
      }
      
      this.emit('end');
      console.log('📷 摄像头数据源已停止');
      
    } catch (error) {
      console.error('停止摄像头时出错:', error);
    }
  }

  /**
   * 获取当前帧
   */
  getFrame(): ImageData | null {
    if (!this.video || this.video.readyState < 2) {
      return null;
    }

    try {
      return this.createImageData(this.video);
    } catch (error) {
      console.error('获取摄像头帧失败:', error);
      return null;
    }
  }

  /**
   * 设置视频元素
   */
  private async setupVideo(): Promise<void> {
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
    
    // 隐藏视频元素
    Object.assign(this.video.style, {
      display: 'none',
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px'
    });
    
    document.body.appendChild(this.video);
  }

  /**
   * 设置摄像头流
   */
  private async setupCamera(): Promise<void> {
    const config = (this as any).config || {};
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: config.width || 640 },
        height: { ideal: config.height || 480 },
        frameRate: { ideal: config.fps || 30 },
        facingMode: 'user'
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video!.srcObject = this.stream;
      
      // 等待视频元数据加载
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('视频元数据加载超时'));
        }, 10000);
        
        this.video!.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        
        this.video!.addEventListener('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`视频加载错误: ${error}`));
        }, { once: true });
      });
      
      // 开始播放
      await this.video!.play();
      
      // 等待视频就绪
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('视频就绪检查超时'));
        }, 5000);
        
        const checkReady = () => {
          if (this.video && this.video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        
        checkReady();
      });
      
    } catch (error) {
      throw this.handleCameraError(error);
    }
  }

  /**
   * 开始帧循环
   */
  private startFrameLoop(): void {
    const loop = () => {
      if (this.status === 'running') {
        const frame = this.getFrame();
        if (frame) {
          this.emit('frame', frame);
        }
        this.animationId = requestAnimationFrame(loop);
      }
    };
    
    this.animationId = requestAnimationFrame(loop);
  }

  /**
   * 处理摄像头错误
   */
  private handleCameraError(error: any): Error {
    let message = '摄像头访问失败';
    
    if (error.name === 'NotAllowedError') {
      message = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问权限';
    } else if (error.name === 'NotFoundError') {
      message = '未找到摄像头设备，请确保摄像头已正确连接';
    } else if (error.name === 'NotReadableError') {
      message = '摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试';
    } else if (error.name === 'OverconstrainedError') {
      message = '摄像头不支持请求的配置，将尝试使用默认设置';
    } else if (error.message) {
      message = `摄像头错误: ${error.message}`;
    }
    
    return new Error(message);
  }

  /**
   * 获取摄像头能力
   */
  async getCapabilities(): Promise<MediaTrackCapabilities | null> {
    if (!this.stream) return null;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    return videoTrack ? videoTrack.getCapabilities() : null;
  }

  /**
   * 获取当前设置
   */
  getSettings(): MediaTrackSettings | null {
    if (!this.stream) return null;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    return videoTrack ? videoTrack.getSettings() : null;
  }
}