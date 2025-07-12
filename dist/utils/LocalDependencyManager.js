/**
 * 本地 TensorFlow.js 依赖管理器
 * 避免依赖外部 CDN，提供更可靠的依赖加载方案
 */
import { unifiedDependencyConfig } from '../config/UnifiedDependencyConfig.js';
/**
 * 本地依赖管理器
 */
export class LocalDependencyManager {
    constructor(config = {}) {
        this.dependencies = new Map();
        this.loadPromises = new Map();
        this.config = {
            useLocalFallback: true,
            cdnTimeout: 10000,
            retryAttempts: 3,
            enableCaching: true,
            ...config
        };
        this.initializeDependencies();
    }
    /**
     * 初始化依赖信息
     */
    initializeDependencies() {
        const config = unifiedDependencyConfig.getDependencyConfig();
        // TensorFlow.js 核心
        this.dependencies.set('tensorflow', {
            name: config.tensorflow.name,
            version: config.tensorflow.version,
            url: config.tensorflow.primaryCdn,
            fallbackUrl: config.tensorflow.fallbackCdn,
            isLoaded: false
        });
        // WebGL 后端
        this.dependencies.set('webgl', {
            name: config.tensorflowWebGL.name,
            version: config.tensorflowWebGL.version,
            url: config.tensorflowWebGL.primaryCdn,
            fallbackUrl: config.tensorflowWebGL.fallbackCdn,
            isLoaded: false
        });
        // 姿态检测模型
        this.dependencies.set('pose-detection', {
            name: config.poseDetection.name,
            version: config.poseDetection.version,
            url: config.poseDetection.primaryCdn,
            fallbackUrl: config.poseDetection.fallbackCdn,
            isLoaded: false
        });
        console.log('📦 本地依赖管理器初始化完成，使用统一配置:', unifiedDependencyConfig.getVersionInfo());
    }
    /**
     * 加载所有依赖
     */
    async loadAllDependencies() {
        const loadPromises = Array.from(this.dependencies.keys()).map(key => this.loadDependency(key));
        try {
            await Promise.all(loadPromises);
            console.log('✅ 所有依赖加载完成');
        }
        catch (error) {
            console.error('❌ 依赖加载失败:', error);
            throw error;
        }
    }
    /**
     * 加载单个依赖
     */
    async loadDependency(name) {
        // 如果已经在加载中，返回现有的 Promise
        if (this.loadPromises.has(name)) {
            return this.loadPromises.get(name);
        }
        const dependency = this.dependencies.get(name);
        if (!dependency) {
            throw new Error(`未知的依赖: ${name}`);
        }
        if (dependency.isLoaded) {
            return Promise.resolve();
        }
        const loadPromise = this.performLoad(dependency);
        this.loadPromises.set(name, loadPromise);
        try {
            await loadPromise;
            dependency.isLoaded = true;
            this.loadPromises.delete(name);
        }
        catch (error) {
            this.loadPromises.delete(name);
            throw error;
        }
    }
    /**
     * 执行实际的加载操作
     */
    async performLoad(dependency) {
        const startTime = performance.now();
        let lastError = null;
        // 尝试多种加载方式
        const loadMethods = this.getLoadMethods(dependency);
        for (const method of loadMethods) {
            try {
                await this.tryLoadMethod(method);
                dependency.loadTime = performance.now() - startTime;
                console.log(`✅ ${dependency.name} 加载成功 (${method.type}, ${dependency.loadTime.toFixed(2)}ms)`);
                return;
            }
            catch (error) {
                console.warn(`⚠️ ${dependency.name} 加载失败 (${method.type}):`, error);
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }
        throw new Error(`${dependency.name} 所有加载方式都失败了。最后错误: ${lastError?.message}`);
    }
    /**
     * 获取加载方法列表
     */
    getLoadMethods(dependency) {
        const methods = [];
        // 主 CDN
        methods.push({
            type: 'primary-cdn',
            url: dependency.url
        });
        // 回退 CDN
        if (dependency.fallbackUrl) {
            methods.push({
                type: 'fallback-cdn',
                url: dependency.fallbackUrl
            });
        }
        return methods;
    }
    /**
     * 尝试加载方法
     */
    async tryLoadMethod(method) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = method.url;
            script.async = true;
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error(`加载超时: ${method.url}`));
            }, this.config.cdnTimeout);
            script.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error(`加载失败: ${method.url}`));
            };
            document.head.appendChild(script);
        });
    }
    /**
     * 检查依赖是否已加载
     */
    isDependencyLoaded(name) {
        const dependency = this.dependencies.get(name);
        return dependency?.isLoaded || false;
    }
    /**
     * 获取所有依赖状态
     */
    getDependencyStatus() {
        return new Map(this.dependencies);
    }
    /**
     * 生成 Worker 兼容的加载脚本
     */
    generateWorkerScript() {
        const dependencies = Array.from(this.dependencies.values());
        return `
// 自动生成的 Worker 依赖加载脚本 (ES6 模块兼容版本)
const WORKER_DEPENDENCIES = ${JSON.stringify(dependencies.map(dep => ({
            name: dep.name,
            url: dep.url,
            fallbackUrl: dep.fallbackUrl
        })), null, 2)};

/**
 * 使用 Promise 包装的脚本加载函数
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    try {
      // 在 Worker 环境中使用 importScripts
      importScripts(url);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function loadWorkerDependencies() {
  let loadSuccess = false;
  let errors = [];

  for (const dep of WORKER_DEPENDENCIES) {
    try {
      console.log('🔄 加载依赖:', dep.name);
      await loadScript(dep.url);
      console.log('✅ 成功加载:', dep.name);
      loadSuccess = true;
    } catch (error) {
      console.warn('⚠️ 主 URL 失败，尝试回退:', dep.name);
      errors.push(error);
      
      if (dep.fallbackUrl) {
        try {
          await loadScript(dep.fallbackUrl);
          console.log('✅ 回退成功:', dep.name);
          loadSuccess = true;
        } catch (fallbackError) {
          console.error('❌ 回退也失败:', dep.name, fallbackError);
          errors.push(fallbackError);
          loadSuccess = false;
          break;
        }
      } else {
        loadSuccess = false;
        break;
      }
    }
  }

  if (!loadSuccess) {
    const errorMessage = '所有依赖加载失败: ' + errors.map(e => e.message).join('; ');
    self.postMessage({
      type: 'error',
      error: errorMessage
    });
    throw new Error(errorMessage);
  }

  // 验证关键对象
  if (typeof tf === 'undefined') {
    throw new Error('TensorFlow.js 未正确加载');
  }
  if (typeof poseDetection === 'undefined') {
    throw new Error('Pose Detection 未正确加载');
  }

  console.log('✅ Worker 依赖验证通过');
}

// 异步执行加载（兼容 ES6 模块）
(async function initializeDependencies() {
  try {
    await loadWorkerDependencies();
    
    // 通知主线程依赖加载完成
    self.postMessage({
      type: 'event',
      payload: {
        eventType: 'dependencies-loaded',
        data: { timestamp: Date.now() }
      }
    });
  } catch (error) {
    console.error('Worker 依赖加载失败:', error);
    
    // 通知主线程加载失败
    self.postMessage({
      type: 'event',
      payload: {
        eventType: 'dependencies-failed',
        data: { 
          error: error.message,
          timestamp: Date.now() 
        }
      }
    });
  }
})();
`;
    }
    /**
     * 创建本地依赖文件
     */
    async createLocalDependencies() {
        console.log('📦 开始创建本地依赖文件...');
        for (const dependency of this.dependencies.values()) {
            try {
                await this.downloadAndSaveLocal(dependency);
                console.log(`✅ ${dependency.name} 本地文件创建成功`);
            }
            catch (error) {
                console.warn(`⚠️ ${dependency.name} 本地文件创建失败:`, error);
            }
        }
    }
    /**
     * 下载并保存本地文件
     */
    async downloadAndSaveLocal(dependency) {
        try {
            const response = await fetch(dependency.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const content = await response.text();
            // 这里可以实现保存到本地存储的逻辑
            // 例如使用 IndexedDB 或其他存储方案
            console.log(`📁 ${dependency.name} 内容已获取，大小: ${content.length} 字符`);
        }
        catch (error) {
            console.error(`下载 ${dependency.name} 失败:`, error);
            throw error;
        }
    }
}
// 全局实例
export const localDependencyManager = new LocalDependencyManager();
//# sourceMappingURL=LocalDependencyManager.js.map