/**
 * 统一的 TensorFlow.js 依赖配置管理器
 * 集中管理所有 TensorFlow.js 相关的 CDN 依赖配置
 */
export interface TensorFlowDependency {
    name: string;
    version: string;
    primaryCdn: string;
    fallbackCdn: string;
    integrity?: string;
}
export interface TensorFlowDependencyConfig {
    tensorflow: TensorFlowDependency;
    tensorflowWebGL: TensorFlowDependency;
    poseDetection: TensorFlowDependency;
}
/**
 * 统一的依赖版本配置
 * 所有模块都应该使用这个配置，确保版本一致性
 */
export declare class UnifiedDependencyConfig {
    private static readonly TENSORFLOW_VERSION;
    private static readonly POSE_DETECTION_VERSION;
    private static readonly PRIMARY_CDN;
    private static readonly FALLBACK_CDN;
    /**
     * 获取完整的依赖配置
     */
    static getDependencyConfig(): TensorFlowDependencyConfig;
    /**
   * 获取主要 CDN URLs 数组（用于缓存等）
   */
    static getPrimaryCdnUrls(): string[];
    /**
     * 获取回退 CDN URLs 数组
     */
    static getFallbackCdnUrls(): string[];
    /**
     * 获取所有 CDN URLs（主要 + 回退）
     */
    static getAllCdnUrls(): string[];
    /**
     * 获取版本信息
     */
    static getVersionInfo(): {
        tensorflow: string;
        poseDetection: string;
    };
    /**
     * 获取简化的依赖配置（向后兼容）
     */
    static getSimpleDependencyConfig(): {
        tensorflow: string;
        tensorflowWebGL: string;
        poseDetection: string;
    };
    /**
     * 获取简化的回退依赖配置（向后兼容）
     */
    static getSimpleFallbackConfig(): {
        tensorflow: string;
        tensorflowWebGL: string;
        poseDetection: string;
    };
    /**
     * 验证依赖是否已加载
     */
    static validateDependencies(): {
        tensorflow: boolean;
        poseDetection: boolean;
        webglBackend: boolean;
    };
    /**
     * 获取当前加载的版本信息
     */
    static getCurrentVersions(): {
        tensorflow?: string;
        loadedBackend?: string;
    };
}
export declare const unifiedDependencyConfig: typeof UnifiedDependencyConfig;
//# sourceMappingURL=UnifiedDependencyConfig.d.ts.map