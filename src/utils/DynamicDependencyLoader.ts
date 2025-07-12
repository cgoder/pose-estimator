/**
 * 动态依赖加载管理器
 * 负责按需加载 TensorFlow.js 依赖，避免在主页面预加载
 */

import { unifiedDependencyConfig } from '../config/UnifiedDependencyConfig.js';

export interface DependencyConfig {
  tensorflow: string;
  tensorflowWebGL: string;
  poseDetection: string;
}

export interface LoadingOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 动态依赖加载器
 */
export class DynamicDependencyLoader {
  private static instance: DynamicDependencyLoader | null = null;
  private isLoading = false;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  // 使用统一配置管理器
  private readonly dependencies: DependencyConfig;
  private readonly fallbackDependencies: DependencyConfig;

  private constructor() {
    // 从统一配置获取依赖
    this.dependencies = unifiedDependencyConfig.getSimpleDependencyConfig();
    this.fallbackDependencies = unifiedDependencyConfig.getSimpleFallbackConfig();
    
    console.log('📦 使用统一依赖配置:', unifiedDependencyConfig.getVersionInfo());
  }

  /**
   * 获取单例实例
   */
  static getInstance(): DynamicDependencyLoader {
    if (!DynamicDependencyLoader.instance) {
      DynamicDependencyLoader.instance = new DynamicDependencyLoader();
    }
    return DynamicDependencyLoader.instance;
  }

  /**
   * 检查依赖是否已加载
   */
  isDependenciesLoaded(): boolean {
    const tfLoaded = typeof (window as any).tf !== 'undefined';
    const poseDetectionLoaded = typeof (window as any).poseDetection !== 'undefined';
    
    if (tfLoaded && poseDetectionLoaded) {
      console.log('📦 检测到 TensorFlow.js 依赖已加载，跳过重复加载');
      return true;
    }
    
    return false;
  }

  /**
   * 动态加载 TensorFlow.js 依赖
   */
  async loadDependencies(options: LoadingOptions = {}): Promise<void> {
    // 如果已经加载，直接返回
    if (this.isDependenciesLoaded()) {
      return;
    }

    // 如果正在加载，等待加载完成
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // 开始加载
    this.isLoading = true;
    this.loadPromise = this.performLoad(options);

    try {
      await this.loadPromise;
      this.isLoaded = true;
      console.log('✅ TensorFlow.js 依赖动态加载完成');
    } catch (error) {
      this.isLoaded = false;
      console.error('❌ TensorFlow.js 依赖加载失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 执行实际的加载过程
   */
  private async performLoad(options: LoadingOptions): Promise<void> {
    const {
      timeout = 30000,
      retryCount = 2,
      retryDelay = 1000
    } = options;

    let lastError: Error | null = null;

    // 尝试主要依赖
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        console.log(`🔄 尝试加载主要依赖 (第 ${attempt + 1} 次)...`);
        await this.loadScripts(this.dependencies, timeout);
        
        // 验证加载
        await this.validateDependencies();
        console.log('✅ 主要依赖加载成功');
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ 主要依赖加载失败 (第 ${attempt + 1} 次):`, lastError.message);
        
        if (attempt < retryCount) {
          await this.delay(retryDelay);
        }
      }
    }

    // 尝试回退依赖
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        console.log(`🔄 尝试加载回退依赖 (第 ${attempt + 1} 次)...`);
        await this.loadScripts(this.fallbackDependencies, timeout);
        
        // 验证加载
        await this.validateDependencies();
        console.log('✅ 回退依赖加载成功');
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ 回退依赖加载失败 (第 ${attempt + 1} 次):`, lastError.message);
        
        if (attempt < retryCount) {
          await this.delay(retryDelay);
        }
      }
    }

    throw new Error(`所有依赖加载尝试都失败了。最后错误: ${lastError?.message}`);
  }

  /**
   * 加载脚本 - 修复：按正确顺序加载依赖
   */
  private async loadScripts(dependencies: DependencyConfig, timeout: number): Promise<void> {
    // 1. 首先加载 TensorFlow.js 核心库
    console.log('📦 加载 TensorFlow.js 核心库...');
    await this.loadScript(dependencies.tensorflow, timeout);
    
    // 等待 TensorFlow.js 核心库初始化
    await this.waitForTensorFlowCore();
    
    // 2. 然后加载 WebGL 后端
    console.log('📦 加载 TensorFlow.js WebGL 后端...');
    await this.loadScript(dependencies.tensorflowWebGL, timeout);
    
    // 等待 WebGL 后端初始化
    await this.waitForWebGLBackend();
    
    // 3. 最后加载 Pose Detection 库
    console.log('📦 加载 Pose Detection 库...');
    await this.loadScript(dependencies.poseDetection, timeout);
  }

  /**
   * 等待 TensorFlow.js 核心库初始化完成
   */
  private async waitForTensorFlowCore(): Promise<void> {
    const maxWaitTime = 5000; // 最大等待 5 秒
    const checkInterval = 100; // 每 100ms 检查一次
    let waitTime = 0;

    while (waitTime < maxWaitTime) {
      if (typeof (window as any).tf !== 'undefined' && 
          typeof (window as any).tf.ready === 'function') {
        try {
          await (window as any).tf.ready();
          console.log('✅ TensorFlow.js 核心库初始化完成');
          return;
        } catch (error) {
          console.warn('⚠️ TensorFlow.js 核心库初始化中...', error);
        }
      }
      
      await this.delay(checkInterval);
      waitTime += checkInterval;
    }
    
    throw new Error('TensorFlow.js 核心库初始化超时');
  }

  /**
   * 等待 WebGL 后端初始化完成
   */
  private async waitForWebGLBackend(): Promise<void> {
    const maxWaitTime = 3000; // 最大等待 3 秒
    const checkInterval = 100; // 每 100ms 检查一次
    let waitTime = 0;

    while (waitTime < maxWaitTime) {
      try {
        if (typeof (window as any).tf !== 'undefined' && 
            (window as any).tf.getBackend) {
          // 尝试设置 WebGL 后端
          await (window as any).tf.setBackend('webgl');
          console.log('✅ WebGL 后端初始化完成');
          return;
        }
      } catch (error) {
        console.warn('⚠️ WebGL 后端初始化中...', error);
      }
      
      await this.delay(checkInterval);
      waitTime += checkInterval;
    }
    
    console.warn('⚠️ WebGL 后端初始化超时，将使用默认后端');
  }

  /**
   * 加载单个脚本
   */
  private loadScript(src: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`脚本加载超时: ${src}`));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutId);
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };

      const onLoad = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        document.head.removeChild(script);
        reject(new Error(`脚本加载失败: ${src}`));
      };

      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);

      document.head.appendChild(script);
    });
  }

  /**
   * 验证依赖是否正确加载
   */
  private async validateDependencies(): Promise<void> {
    // 等待一小段时间让脚本初始化
    await this.delay(100);

    if (typeof (window as any).tf === 'undefined') {
      throw new Error('TensorFlow.js 未正确加载');
    }

    if (typeof (window as any).poseDetection === 'undefined') {
      throw new Error('Pose Detection 库未正确加载');
    }

    // 等待 TensorFlow.js 准备就绪
    try {
      await (window as any).tf.ready();
      console.log('📦 TensorFlow.js 版本:', (window as any).tf.version.tfjs);
    } catch (error) {
      throw new Error(`TensorFlow.js 初始化失败: ${error}`);
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取加载状态
   */
  getLoadingStatus(): {
    isLoading: boolean;
    isLoaded: boolean;
    isDependenciesAvailable: boolean;
  } {
    return {
      isLoading: this.isLoading,
      isLoaded: this.isLoaded,
      isDependenciesAvailable: this.isDependenciesLoaded()
    };
  }

  /**
   * 重置加载状态（用于测试）
   */
  reset(): void {
    this.isLoading = false;
    this.isLoaded = false;
    this.loadPromise = null;
  }
}

// 导出单例实例
export const dynamicDependencyLoader = DynamicDependencyLoader.getInstance();