/**
 * 统一的 TensorFlow.js 依赖配置管理器
 * 集中管理所有 TensorFlow.js 相关的 CDN 依赖配置
 */
/**
 * 统一的依赖版本配置
 * 所有模块都应该使用这个配置，确保版本一致性
 */
export class UnifiedDependencyConfig {
    /**
     * 获取完整的依赖配置
     */
    static getDependencyConfig() {
        return {
            tensorflow: {
                name: '@tensorflow/tfjs',
                version: this.TENSORFLOW_VERSION,
                primaryCdn: `${this.PRIMARY_CDN}/@tensorflow/tfjs@${this.TENSORFLOW_VERSION}/dist/tf.min.js`,
                fallbackCdn: `${this.FALLBACK_CDN}/@tensorflow/tfjs@${this.TENSORFLOW_VERSION}/dist/tf.min.js`
            },
            tensorflowWebGL: {
                name: '@tensorflow/tfjs-backend-webgl',
                version: this.TENSORFLOW_VERSION,
                primaryCdn: `${this.PRIMARY_CDN}/@tensorflow/tfjs-backend-webgl@${this.TENSORFLOW_VERSION}/dist/tf-backend-webgl.min.js`,
                fallbackCdn: `${this.FALLBACK_CDN}/@tensorflow/tfjs-backend-webgl@${this.TENSORFLOW_VERSION}/dist/tf-backend-webgl.min.js`
            },
            poseDetection: {
                name: '@tensorflow-models/pose-detection',
                version: this.POSE_DETECTION_VERSION,
                primaryCdn: `${this.PRIMARY_CDN}/@tensorflow-models/pose-detection@${this.POSE_DETECTION_VERSION}/dist/pose-detection.min.js`,
                fallbackCdn: `${this.FALLBACK_CDN}/@tensorflow-models/pose-detection@${this.POSE_DETECTION_VERSION}/dist/pose-detection.min.js`
            }
        };
    }
    /**
   * 获取主要 CDN URLs 数组（用于缓存等）
   */
    static getPrimaryCdnUrls() {
        const config = this.getDependencyConfig();
        return [
            config.tensorflow.primaryCdn,
            config.tensorflowWebGL.primaryCdn,
            config.poseDetection.primaryCdn
        ];
    }
    /**
     * 获取回退 CDN URLs 数组
     */
    static getFallbackCdnUrls() {
        const config = this.getDependencyConfig();
        return [
            config.tensorflow.fallbackCdn,
            config.tensorflowWebGL.fallbackCdn,
            config.poseDetection.fallbackCdn
        ];
    }
    /**
     * 获取所有 CDN URLs（主要 + 回退）
     */
    static getAllCdnUrls() {
        return [
            ...this.getPrimaryCdnUrls(),
            ...this.getFallbackCdnUrls()
        ];
    }
    /**
     * 获取版本信息
     */
    static getVersionInfo() {
        return {
            tensorflow: this.TENSORFLOW_VERSION,
            poseDetection: this.POSE_DETECTION_VERSION
        };
    }
    /**
     * 获取简化的依赖配置（向后兼容）
     */
    static getSimpleDependencyConfig() {
        const config = this.getDependencyConfig();
        return {
            tensorflow: config.tensorflow.primaryCdn,
            tensorflowWebGL: config.tensorflowWebGL.primaryCdn,
            poseDetection: config.poseDetection.primaryCdn
        };
    }
    /**
     * 获取简化的回退依赖配置（向后兼容）
     */
    static getSimpleFallbackConfig() {
        const config = this.getDependencyConfig();
        return {
            tensorflow: config.tensorflow.fallbackCdn,
            tensorflowWebGL: config.tensorflowWebGL.fallbackCdn,
            poseDetection: config.poseDetection.fallbackCdn
        };
    }
    /**
     * 验证依赖是否已加载
     */
    static validateDependencies() {
        return {
            tensorflow: typeof window.tf !== 'undefined',
            poseDetection: typeof window.poseDetection !== 'undefined',
            webglBackend: window.tf && window.tf.getBackend() === 'webgl'
        };
    }
    /**
     * 获取当前加载的版本信息
     */
    static getCurrentVersions() {
        const result = {};
        if (typeof window.tf !== 'undefined') {
            result.tensorflow = window.tf.version?.tfjs || 'unknown';
            result.loadedBackend = window.tf.getBackend?.() || 'unknown';
        }
        return result;
    }
}
// 统一使用的版本号
UnifiedDependencyConfig.TENSORFLOW_VERSION = '4.8.0';
UnifiedDependencyConfig.POSE_DETECTION_VERSION = '2.0.0';
// 主要 CDN 提供商
UnifiedDependencyConfig.PRIMARY_CDN = 'https://cdn.jsdelivr.net/npm';
UnifiedDependencyConfig.FALLBACK_CDN = 'https://unpkg.com';
// 导出单例配置
export const unifiedDependencyConfig = UnifiedDependencyConfig;
//# sourceMappingURL=UnifiedDependencyConfig.js.map