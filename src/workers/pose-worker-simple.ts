/**
 * 姿态估计 Worker - 简化版本
 * 提供基础的姿态估计功能，专注于性能和稳定性
 * 使用经典 Worker 脚本模式以支持 importScripts
 */

// 引用共享的全局声明
/// <reference path="./worker-globals.d.ts" />

// 内联类型定义（避免 ES 模块导入）
interface WorkerMessage {
  id?: string;
  type: 'initialize' | 'loadModel' | 'predict' | 'ping';
  payload?: any;
}

interface WorkerResponse {
  id?: string;
  type?: string;
  payload?: any;
  error?: string;
}

console.log('📦 简化 Worker 启动，使用统一依赖配置');

/**
 * 动态加载脚本的函数
 */
function loadScript(url: string): Promise<void> {
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

/**
 * 异步加载统一依赖配置
 */
async function loadUnifiedDependencyConfig(): Promise<void> {
  try {
    // 首先加载统一依赖配置文件（使用相对路径）
    await loadScript('../config/worker-dependency-config.js');
    console.log('✅ 统一依赖配置加载成功');
  } catch (error) {
    console.error('❌ 统一依赖配置加载失败:', error);
    throw new Error('无法加载统一依赖配置');
  }
}

/**
 * 安全的依赖加载函数 - 使用统一配置
 */
async function loadDependenciesSafely(): Promise<void> {
  console.log('🔄 Worker 开始加载依赖...');
  
  // 首先加载统一配置
  await loadUnifiedDependencyConfig();
  
  // 获取统一配置的依赖信息
  const primaryConfig = (self as any).UNIFIED_DEPENDENCY_CONFIG;
  const fallbackConfig = (self as any).UNIFIED_FALLBACK_CONFIG;
  const versionInfo = (self as any).VERSION_INFO;
  
  if (!primaryConfig || !fallbackConfig) {
    throw new Error('统一依赖配置未正确加载');
  }
  
  console.log('📦 使用统一依赖配置:', versionInfo);
  
  try {
    // 尝试主要依赖
    console.log('📦 尝试加载主要依赖...');
    await loadScript(primaryConfig.tensorflow);
    await loadScript(primaryConfig.tensorflowWebGL);
    await loadScript(primaryConfig.poseDetection);
    console.log('✅ 主要依赖加载成功');
    
    // 验证加载
    if (typeof tf !== 'undefined' && typeof poseDetection !== 'undefined') {
      console.log('✅ 依赖验证通过，版本:', versionInfo);
      return;
    } else {
      throw new Error('依赖验证失败');
    }
    
  } catch (primaryError: unknown) {
    const primaryErrorMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn('⚠️ 主要依赖加载失败，尝试回退依赖:', primaryErrorMsg);
    
    try {
      console.log('📦 尝试加载回退依赖...');
      await loadScript(fallbackConfig.tensorflow);
      await loadScript(fallbackConfig.tensorflowWebGL);
      await loadScript(fallbackConfig.poseDetection);
      console.log('✅ 回退依赖加载成功');
      
      // 再次验证
      if (typeof tf !== 'undefined' && typeof poseDetection !== 'undefined') {
        console.log('✅ 回退依赖验证通过，版本:', versionInfo);
        return;
      } else {
        throw new Error('回退依赖验证失败');
      }
      
    } catch (fallbackError: unknown) {
      const fallbackErrorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error('❌ 所有依赖加载失败');
      
      // 发送错误消息到主线程
      self.postMessage({
        type: 'error',
        error: `Worker 依赖加载失败: 主要错误=${primaryErrorMsg}, 回退错误=${fallbackErrorMsg}`
      } as WorkerResponse);
      
      throw new Error(`依赖加载完全失败: ${fallbackErrorMsg}`);
    }
  }
}

// 内联模型加载器（来自 shared-model-loaders.js）
async function loadMoveNetModel(config: any = {}) {
  const modelConfig = {
    modelType: config.modelType || poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: config.enableSmoothing || false,
    ...config
  };
  return await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, modelConfig);
}

async function loadPoseNetModel(config: any = {}) {
  const modelConfig = {
    architecture: config.architecture || 'MobileNetV1',
    outputStride: config.outputStride || 16,
    inputResolution: config.inputResolution || { width: 513, height: 513 },
    multiplier: config.multiplier || 0.75,
    quantBytes: config.quantBytes || 2,
    ...config
  };
  return await poseDetection.createDetector(poseDetection.SupportedModels.PoseNet, modelConfig);
}

async function loadBlazePoseModel(config: any = {}) {
  const modelConfig = {
    runtime: config.runtime || 'tfjs',
    enableSmoothing: config.enableSmoothing || false,
    modelType: config.modelType || 'full',
    ...config
  };
  return await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, modelConfig);
}

// Worker 状态
let workerInitialized = false;
let dependenciesLoaded = false;
let poseModel: any = null;
let currentModelType: string | null = null;

// 异步加载依赖
(async () => {
  try {
    await loadDependenciesSafely();
    dependenciesLoaded = true;
    console.log('✅ Worker 依赖加载完成');
  } catch (error) {
    console.error('❌ Worker 依赖加载失败:', error);
    dependenciesLoaded = false;
  }
})();

/**
 * 消息处理器
 */
self.onmessage = async function(event: MessageEvent<WorkerMessage>) {
  const { id, type, payload } = event.data;

  try {
    // 检查依赖是否已加载
    if (!dependenciesLoaded && type !== 'ping') {
      throw new Error('Worker 依赖尚未加载完成');
    }

    let result: any = null;

    switch (type) {
      case 'ping':
        result = { pong: true, dependenciesLoaded, workerInitialized };
        break;
        
      case 'initialize':
        result = await initializeWorker();
        break;
      
      case 'loadModel':
        result = await loadPoseModel(payload.modelType, payload.config);
        break;
      
      case 'predict':
        result = await predictPose(payload.imageData);
        break;
      
      default:
        throw new Error(`未知的消息类型: ${type}`);
    }

    // 发送成功响应
    self.postMessage({
      id,
      type: 'response',
      payload: result
    } as WorkerResponse);

  } catch (error) {
    // 发送错误响应
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Worker 处理错误:', errorMessage);
    
    self.postMessage({
      id,
      type: 'error',
      error: errorMessage
    } as WorkerResponse);
  }
};

/**
 * 初始化 Worker
 */
async function initializeWorker(): Promise<{ success: boolean; info: any }> {
  try {
    console.log('🔧 初始化 TensorFlow.js...');
    
    // 检查依赖是否可用
    if (typeof tf === 'undefined') {
      throw new Error('TensorFlow.js 不可用');
    }
    
    if (typeof poseDetection === 'undefined') {
      throw new Error('Pose Detection 不可用');
    }
    
    // 等待 TensorFlow.js 准备就绪
    await tf.ready();
    console.log('✅ TensorFlow.js 准备就绪');
    
    // 设置后端
    await tf.setBackend('webgl');
    console.log('✅ WebGL 后端设置完成');
    
    workerInitialized = true;
    
    const info = {
      backend: tf.getBackend(),
      version: tf.version?.tfjs || 'unknown',
      memory: tf.memory()
    };
    
    console.log('✅ Worker 初始化完成:', info);
    
    // 发送初始化事件
    self.postMessage({
      type: 'event',
      payload: {
        eventType: 'initialized',
        data: info
      }
    } as WorkerResponse);

    return { success: true, info };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Worker 初始化失败:', errorMessage);
    throw new Error(`Worker 初始化失败: ${errorMessage}`);
  }
}

/**
 * 加载姿态估计模型
 */
async function loadPoseModel(modelTypeParam: string, config: any = {}): Promise<{ success: boolean; modelType: string }> {
  if (!workerInitialized) {
    throw new Error('Worker 未初始化');
  }

  try {
    console.log(`🤖 加载模型: ${modelTypeParam}`);
    
    // 释放之前的模型
    if (poseModel) {
      poseModel.dispose();
      poseModel = null;
    }

    currentModelType = modelTypeParam;

    // 根据模型类型加载对应的模型
    switch (currentModelType) {
      case 'MoveNet':
        poseModel = await loadMoveNetModel(config);
        break;
      case 'PoseNet':
        poseModel = await loadPoseNetModel(config);
        break;
      case 'BlazePose':
        poseModel = await loadBlazePoseModel(config);
        break;
      default:
        throw new Error(`不支持的模型类型: ${currentModelType}`);
    }

    console.log(`✅ 模型加载成功: ${currentModelType}`);

    // 发送模型加载事件
    self.postMessage({
      type: 'event',
      payload: {
        eventType: 'model-loaded',
        data: { modelType: currentModelType }
      }
    } as WorkerResponse);

    return { success: true, modelType: currentModelType };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 模型加载失败:', errorMessage);
    throw new Error(`模型加载失败: ${errorMessage}`);
  }
}

/**
 * 执行姿态预测
 */
async function predictPose(imageData: ImageData): Promise<any> {
  if (!poseModel) {
    throw new Error('模型未加载');
  }

  try {
    const startTime = performance.now();
    
    // 将 ImageData 转换为 Tensor
    const tensor = tf.browser.fromPixels(imageData);
    
    // 执行预测
    const poses = await poseModel.estimatePoses(tensor);
    
    // 清理 tensor
    tensor.dispose();
    
    const inferenceTime = performance.now() - startTime;
    
    return {
      poses,
      inferenceTime,
      modelType: currentModelType,
      timestamp: Date.now()
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 姿态预测失败:', errorMessage);
    throw new Error(`姿态预测失败: ${errorMessage}`);
  }
}

// 错误处理
self.onerror = function(error) {
  console.error('Worker 全局错误:', error);
  const errorMessage = error instanceof ErrorEvent ? error.message : String(error);
  self.postMessage({
    type: 'error',
    error: `Worker 全局错误: ${errorMessage}`
  } as WorkerResponse);
};

self.onunhandledrejection = function(event) {
  console.error('Worker 未处理的 Promise 拒绝:', event.reason);
  self.postMessage({
    type: 'error',
    error: `Worker 未处理的 Promise 拒绝: ${event.reason}`
  } as WorkerResponse);
};

console.log('🚀 Pose Worker 已启动');