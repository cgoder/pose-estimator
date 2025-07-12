/**
 * 获取统一的依赖配置
 */
export function getUnifiedDependencyConfig(): {
    tensorflow: string;
    tensorflowWebGL: string;
    poseDetection: string;
};
/**
 * 获取回退依赖配置
 */
export function getUnifiedFallbackConfig(): {
    tensorflow: string;
    tensorflowWebGL: string;
    poseDetection: string;
};
/**
 * 获取版本信息
 */
export function getVersionInfo(): {
    tensorflow: string;
    poseDetection: string;
    generatedAt: string;
};
/**
 * Worker 环境的统一依赖配置
 * 🤖 此文件由构建脚本自动生成，请勿手动编辑
 *
 * 生成时间: 2025-07-12T14:52:04.235Z
 * 生成脚本: scripts/generate-worker-config.js
 * 数据源: src/config/UnifiedDependencyConfig.ts
 */
export const TENSORFLOW_VERSION: "4.8.0";
export const POSE_DETECTION_VERSION: "2.0.0";
//# sourceMappingURL=worker-dependency-config.d.ts.map