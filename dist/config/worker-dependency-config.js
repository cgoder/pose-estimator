"use strict";
/**
 * Worker 环境的统一依赖配置
 * 🤖 此文件由构建脚本自动生成，请勿手动编辑
 *
 * 生成时间: 2025-07-13T02:50:28.827Z
 * 生成脚本: scripts/generate-worker-config.js
 * 数据源: src/config/UnifiedDependencyConfig.ts
 */
// 统一的版本配置（自动同步）
const TENSORFLOW_VERSION = '4.8.0';
const POSE_DETECTION_VERSION = '2.0.0';
// 主要 CDN 提供商
const PRIMARY_CDN = 'https://cdn.jsdelivr.net/npm';
const FALLBACK_CDN = 'https://unpkg.com';
/**
 * 获取统一的依赖配置
 */
function getUnifiedDependencyConfig() {
    return {
        tensorflow: `${PRIMARY_CDN}/@tensorflow/tfjs@${TENSORFLOW_VERSION}/dist/tf.min.js`,
        tensorflowWebGL: `${PRIMARY_CDN}/@tensorflow/tfjs-backend-webgl@${TENSORFLOW_VERSION}/dist/tf-backend-webgl.min.js`,
        poseDetection: `${PRIMARY_CDN}/@tensorflow-models/pose-detection@${POSE_DETECTION_VERSION}/dist/pose-detection.min.js`
    };
}
/**
 * 获取回退依赖配置
 */
function getUnifiedFallbackConfig() {
    return {
        tensorflow: `${FALLBACK_CDN}/@tensorflow/tfjs@${TENSORFLOW_VERSION}/dist/tf.min.js`,
        tensorflowWebGL: `${FALLBACK_CDN}/@tensorflow/tfjs-backend-webgl@${TENSORFLOW_VERSION}/dist/tf-backend-webgl.min.js`,
        poseDetection: `${FALLBACK_CDN}/@tensorflow-models/pose-detection@${POSE_DETECTION_VERSION}/dist/pose-detection.min.js`
    };
}
/**
 * 获取版本信息
 */
function getVersionInfo() {
    return {
        tensorflow: TENSORFLOW_VERSION,
        poseDetection: POSE_DETECTION_VERSION,
        generatedAt: '2025-07-13T02:50:28.827Z'
    };
}
// 导出配置（Worker 环境使用）
if (typeof self !== 'undefined') {
    // Worker 环境
    self.UNIFIED_DEPENDENCY_CONFIG = getUnifiedDependencyConfig();
    self.UNIFIED_FALLBACK_CONFIG = getUnifiedFallbackConfig();
    self.VERSION_INFO = getVersionInfo();
    console.log('📦 Worker 依赖配置已加载:', self.VERSION_INFO);
}
// 也支持 CommonJS 导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getUnifiedDependencyConfig,
        getUnifiedFallbackConfig,
        getVersionInfo,
        TENSORFLOW_VERSION,
        POSE_DETECTION_VERSION
    };
}
//# sourceMappingURL=worker-dependency-config.js.map