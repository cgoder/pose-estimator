"use strict";
/**
 * 姿态估计 Worker - 完整版本
 * 提供完整的姿态估计功能，包括多种模型支持和高级配置
 * 使用经典 Worker 脚本模式以支持 importScripts
 */
/// <reference path="./worker-globals.d.ts" />
// 内联模型加载器（来自 shared-model-loaders.js）
async function loadMoveNetModel(config = {}) {
    const modelConfig = {
        modelType: config.modelType || poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: config.enableSmoothing || false,
        ...config
    };
    return await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, modelConfig);
}
async function loadPoseNetModel(config = {}) {
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
async function loadBlazePoseModel(config = {}) {
    const modelConfig = {
        runtime: config.runtime || 'tfjs',
        enableSmoothing: config.enableSmoothing || false,
        modelType: config.modelType || 'full',
        ...config
    };
    return await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, modelConfig);
}
/**
 * 使用 Promise 包装的脚本加载函数
 */
function loadScriptFull(url) {
    return new Promise((resolve, reject) => {
        try {
            // 在 Worker 环境中使用 importScripts
            importScripts(url);
            resolve();
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 * 异步加载统一依赖配置
 */
async function loadUnifiedDependencyConfigFull() {
    try {
        // 首先加载统一依赖配置文件（使用相对路径）
        await loadScriptFull('../config/worker-dependency-config.js');
        console.log('✅ 统一依赖配置加载成功');
    }
    catch (error) {
        console.error('❌ 统一依赖配置加载失败:', error);
        throw new Error('无法加载统一依赖配置');
    }
}
/**
 * 异步加载 CDN 依赖 - 使用统一配置
 */
async function loadDependenciesSafelyFull() {
    // 首先加载统一配置
    await loadUnifiedDependencyConfigFull();
    // 获取统一配置的依赖信息
    const primaryConfig = self.UNIFIED_DEPENDENCY_CONFIG;
    const fallbackConfig = self.UNIFIED_FALLBACK_CONFIG;
    const versionInfo = self.VERSION_INFO;
    if (!primaryConfig || !fallbackConfig) {
        throw new Error('统一依赖配置未正确加载');
    }
    console.log('📦 使用统一依赖配置:', versionInfo);
    let loadSuccess = false;
    let lastError = null;
    // 尝试主 CDN
    try {
        console.log('🔄 尝试从主 CDN 加载依赖...');
        await loadScriptFull(primaryConfig.tensorflow);
        await loadScriptFull(primaryConfig.tensorflowWebGL);
        await loadScriptFull(primaryConfig.poseDetection);
        console.log('✅ 成功从主 CDN 加载依赖');
        loadSuccess = true;
    }
    catch (error) {
        console.warn('⚠️ 主 CDN 加载失败:', error);
        lastError = error;
    }
    // 如果主 CDN 失败，尝试回退 CDN
    if (!loadSuccess) {
        try {
            console.log('🔄 尝试从回退 CDN 加载依赖...');
            await loadScriptFull(fallbackConfig.tensorflow);
            await loadScriptFull(fallbackConfig.tensorflowWebGL);
            await loadScriptFull(fallbackConfig.poseDetection);
            console.log('✅ 成功从回退 CDN 加载依赖');
            loadSuccess = true;
        }
        catch (fallbackError) {
            console.error('❌ 回退 CDN 也加载失败:', fallbackError);
            lastError = fallbackError;
        }
    }
    // 如果所有 CDN 都失败了
    if (!loadSuccess) {
        const errorMessage = `所有 CDN 依赖加载失败。主 CDN 错误: ${lastError}`;
        console.error('❌ Worker 依赖加载完全失败');
        // 向主线程报告错误
        self.postMessage({
            type: 'error',
            error: errorMessage
        });
        throw new Error(errorMessage);
    }
    // 验证依赖是否正确加载
    try {
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js 未正确加载');
        }
        if (typeof poseDetection === 'undefined') {
            throw new Error('Pose Detection 模型未正确加载');
        }
        console.log('✅ 所有依赖验证通过，版本:', versionInfo);
    }
    catch (validationError) {
        console.error('❌ 依赖验证失败:', validationError);
        self.postMessage({
            type: 'error',
            error: `依赖验证失败: ${validationError}`
        });
        throw validationError;
    }
}
/**
 * Worker状态
 */
let fullWorkerInitialized = false;
let fullDependenciesLoaded = false;
let isInitialized = false;
let model = null;
let modelType = null;
/**
 * 消息处理器
 */
self.onmessage = async function (event) {
    const { id, type, payload } = event.data;
    try {
        // 检查依赖是否已加载
        if (!fullDependenciesLoaded && type !== 'ping') {
            self.postMessage({
                id,
                type: 'error',
                error: 'Worker 依赖尚未加载完成，请稍后重试'
            });
            return;
        }
        let result = null;
        switch (type) {
            case 'ping':
                result = {
                    status: 'alive',
                    dependenciesLoaded: fullDependenciesLoaded,
                    workerInitialized: fullWorkerInitialized
                };
                break;
            case 'initialize':
                result = await initialize();
                break;
            case 'loadModel':
                result = await loadModel(payload.modelType, payload.config);
                break;
            case 'predict':
                result = await predict(payload.imageData);
                break;
            default:
                throw new Error(`未知的消息类型: ${type}`);
        }
        // 发送成功响应
        self.postMessage({
            id,
            type: 'response',
            payload: result
        });
    }
    catch (error) {
        // 发送错误响应
        const errorMessage = error instanceof Error ? error.message : String(error);
        self.postMessage({
            id,
            type: 'error',
            error: errorMessage
        });
    }
};
/**
 * 初始化Worker
 */
async function initialize() {
    try {
        // 等待TensorFlow.js加载
        await tf.ready();
        // 设置后端
        await tf.setBackend('webgl');
        isInitialized = true;
        // 发送初始化事件
        self.postMessage({
            type: 'event',
            payload: {
                eventType: 'initialized',
                data: {
                    backend: tf.getBackend(),
                    version: tf.version.tfjs
                }
            }
        });
        return { success: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Worker初始化失败: ${errorMessage}`);
    }
}
/**
 * 加载姿态估计模型
 */
async function loadModel(modelTypeParam, config = {}) {
    if (!isInitialized) {
        throw new Error('Worker未初始化');
    }
    try {
        // 释放之前的模型
        if (model) {
            model.dispose();
            model = null;
        }
        modelType = modelTypeParam;
        // 根据模型类型加载对应的模型
        switch (modelType) {
            case 'MoveNet':
                model = await loadMoveNetModel(config);
                break;
            case 'PoseNet':
                model = await loadPoseNetModel(config);
                break;
            case 'BlazePose':
                model = await loadBlazePoseModel(config);
                break;
            default:
                throw new Error(`不支持的模型类型: ${modelType}`);
        }
        // 发送模型加载事件
        self.postMessage({
            type: 'event',
            payload: {
                eventType: 'model-loaded',
                data: { modelType }
            }
        });
        return { success: true, modelType };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`模型加载失败: ${errorMessage}`);
    }
}
/**
 * 执行姿态估计推理
 */
async function predict(imageData) {
    if (!model) {
        throw new Error('模型未加载');
    }
    try {
        const startTime = performance.now();
        // 将ImageData转换为Canvas
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('无法获取Canvas上下文');
        }
        ctx.putImageData(imageData, 0, 0);
        // 执行推理
        const poses = await model.estimatePoses(canvas);
        const inferenceTime = performance.now() - startTime;
        // 后处理结果
        const processedPoses = poses.map(pose => ({
            ...pose,
            keypoints: pose.keypoints?.filter((kp) => (kp.score || 0) > 0.3) || [],
            normalizedKeypoints: normalizeKeypoints(pose.keypoints || [])
        }));
        const result = {
            poses: processedPoses,
            inferenceTime,
            modelType,
            timestamp: Date.now(),
            inputDimensions: {
                width: imageData.width,
                height: imageData.height
            }
        };
        // 发送推理事件
        self.postMessage({
            type: 'event',
            payload: {
                eventType: 'inference-complete',
                data: {
                    inferenceTime,
                    poseCount: poses.length
                }
            }
        });
        return { result };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`推理失败: ${errorMessage}`);
    }
}
/**
 * 标准化关键点坐标
 */
function normalizeKeypoints(keypoints) {
    return keypoints.map((kp) => ({
        ...kp,
        x: Math.max(0, Math.min(1, kp.x)),
        y: Math.max(0, Math.min(1, kp.y))
    }));
}
/**
 * 错误处理
 */
self.onerror = function (message, filename, lineno, _colno, _error) {
    const errorData = typeof message === 'string' ? {
        message,
        filename: filename || '',
        lineno: lineno || 0
    } : {
        message: 'Unknown error',
        filename: '',
        lineno: 0
    };
    self.postMessage({
        type: 'event',
        payload: {
            eventType: 'error',
            data: errorData
        }
    });
};
/**
 * 未处理的Promise拒绝
 */
self.onunhandledrejection = function (event) {
    self.postMessage({
        type: 'event',
        payload: {
            eventType: 'unhandled-rejection',
            data: {
                reason: event.reason
            }
        }
    });
};
// ============================================================================
// 异步依赖加载初始化
// ============================================================================
/**
 * Worker 启动时异步加载依赖
 */
(async function initializeWorker() {
    try {
        console.log('🚀 Worker 开始异步加载依赖...');
        // 异步加载依赖
        await loadDependenciesSafelyFull();
        // 标记依赖已加载
        fullDependenciesLoaded = true;
        fullWorkerInitialized = true;
        console.log('✅ Worker 依赖加载完成，准备就绪');
        // 通知主线程 Worker 已准备就绪
        self.postMessage({
            type: 'event',
            payload: {
                eventType: 'worker-ready',
                data: {
                    dependenciesLoaded: true,
                    timestamp: Date.now()
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Worker 依赖加载失败:', error);
        // 通知主线程加载失败
        self.postMessage({
            type: 'event',
            payload: {
                eventType: 'worker-failed',
                data: {
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: Date.now()
                }
            }
        });
    }
})();
//# sourceMappingURL=pose-worker.js.map