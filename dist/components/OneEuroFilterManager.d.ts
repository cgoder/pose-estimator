import { OneEuroFilter, FilterConfig } from '../utils/OneEuroFilter.js';
/**
 * 关键点接口定义
 */
interface Keypoint {
    x: number;
    y: number;
    score?: number;
    name?: string;
}
/**
 * 滤波器统计信息接口
 */
interface FilterStats {
    enabled: boolean;
    filterCount: number;
    parameters: FilterConfig;
    keypointNames: readonly string[];
}
/**
 * 参数验证结果接口
 */
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * 预设配置接口
 */
interface PresetConfig extends FilterConfig {
    description: string;
}
/**
 * One Euro Filter 管理器
 * 管理所有关键点的滤波器实例和参数
 */
export declare class OneEuroFilterManager {
    private filterParams;
    private filters;
    private isEnabled;
    constructor(filterParams?: Partial<FilterConfig>);
    /**
     * 获取或创建关键点的滤波器
     * @param {number} keypointIndex - 关键点索引
     * @param {string} axis - 坐标轴 ('x' 或 'y')
     * @returns {OneEuroFilter} 滤波器实例
     */
    _getOrCreateFilter(keypointIndex: number, axis: string): OneEuroFilter;
    /**
     * 过滤姿态关键点
     * @param {Keypoint[]} keypoints - 原始关键点数组
     * @param {number} timestamp - 时间戳
     * @returns {Keypoint[]} 过滤后的关键点数组
     */
    filterPose(keypoints: Keypoint[], timestamp?: number): Keypoint[];
    /**
     * 更新滤波器参数
     * @param {Partial<FilterConfig>} newParams - 新的滤波器参数
     */
    updateParameters(newParams: Partial<FilterConfig>): void;
    /**
     * 更新所有现有滤波器的参数
     * @private
     */
    private updateExistingFilters;
    /**
     * 重置所有滤波器
     */
    resetFilters(): void;
    /**
     * 重置为默认参数
     */
    resetToDefaults(): void;
    /**
     * 启用/禁用滤波器
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled: boolean): void;
    /**
     * 获取当前参数
     * @returns {FilterConfig} 当前滤波器参数
     */
    getParameters(): FilterConfig;
    /**
     * 获取滤波器统计信息
     * @returns {FilterStats} 统计信息
     */
    getStats(): FilterStats;
    /**
     * 验证参数有效性
     * @param {Partial<FilterConfig>} params - 要验证的参数
     * @returns {ValidationResult} 验证结果
     */
    static validateParameters(params: Partial<FilterConfig>): ValidationResult;
    /**
     * 获取推荐参数配置
     * @param {string} scenario - 使用场景
     * @returns {PresetConfig | null} 推荐参数
     */
    static getRecommendedParameters(scenario?: string): PresetConfig | null;
    /**
     * 应用预设配置
     * @param {string} presetName - 预设名称
     * @returns {boolean} 是否成功应用
     */
    applyPreset(presetName: string): boolean;
    /**
     * 导出配置
     * @returns {string} JSON 格式的配置
     */
    exportConfig(): string;
    /**
     * 导入配置
     * @param {string} configJson - JSON 格式的配置
     * @returns {boolean} 是否成功导入
     */
    importConfig(configJson: string): boolean;
}
export {};
//# sourceMappingURL=OneEuroFilterManager.d.ts.map