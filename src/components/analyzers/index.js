/**
 * 运动分析器模块索引文件
 * 提供统一的导入接口
 */

// 导出主要分析管理器（推荐使用）
export { default as AnalysisManager } from './AnalysisManager.js';

// 导出核心分析引擎
export { default as ExerciseAnalysisEngine } from './ExerciseAnalysisEngine.js';

// 导出高级分析模块
export { default as AdvancedQualityAssessment } from './AdvancedQualityAssessment.js';
export { default as BiomechanicsAnalyzer } from './BiomechanicsAnalyzer.js';
export { default as KinematicsAnalyzer } from './KinematicsAnalyzer.js';
export { default as PerformanceMonitor } from './PerformanceMonitor.js';

// 导出基础分析器
export { default as BaseExerciseAnalyzer } from './BaseExerciseAnalyzer.js';

// 导出具体运动分析器
export { default as SquatAnalyzer } from './SquatAnalyzer.js';
export { default as PushUpAnalyzer } from './PushUpAnalyzer.js';
export { default as LungeAnalyzer } from './LungeAnalyzer.js';
export { default as JumpingJackAnalyzer } from './JumpingJackAnalyzer.js';
export { default as PlankAnalyzer } from './PlankAnalyzer.js';
export { default as BurpeeAnalyzer } from './BurpeeAnalyzer.js';
export { default as RunningAnalyzer } from './RunningAnalyzer.js';
export { default as DeadliftAnalyzer } from './DeadliftAnalyzer.js';
export { default as BicepCurlAnalyzer } from './BicepCurlAnalyzer.js';
export { default as ShoulderPressAnalyzer } from './ShoulderPressAnalyzer.js';

// 导出运动类型常量
export { EXERCISE_TYPES } from './ExerciseAnalysisEngine.js';

// 默认导出分析管理器
export default AnalysisManager;

// 导出分析器映射表（便于动态创建）
export const ANALYZER_MAP = {
    [EXERCISE_TYPES.SQUAT]: SquatAnalyzer,
    [EXERCISE_TYPES.PUSHUP]: PushUpAnalyzer,
    [EXERCISE_TYPES.PLANK]: PlankAnalyzer,
    [EXERCISE_TYPES.JUMPING_JACK]: JumpingJackAnalyzer,
    [EXERCISE_TYPES.LUNGE]: LungeAnalyzer,
    [EXERCISE_TYPES.RUNNING]: RunningAnalyzer,
    [EXERCISE_TYPES.WALKING]: WalkingAnalyzer
};

// 工厂函数：创建分析器实例
export function createAnalyzer(type) {
    const AnalyzerClass = ANALYZER_MAP[type];
    if (!AnalyzerClass) {
        throw new Error(`未知的分析器类型: ${type}`);
    }
    return new AnalyzerClass();
}

// 获取所有支持的运动类型
export function getSupportedExerciseTypes() {
    return Object.values(EXERCISE_TYPES);
}

// 验证运动类型是否支持
export function isExerciseTypeSupported(type) {
    return Object.values(EXERCISE_TYPES).includes(type);
}

/**
 * 使用示例：
 * 
 * // 基本使用
 * import ExerciseAnalysisEngine from './analyzers';
 * const engine = new ExerciseAnalysisEngine();
 * 
 * // 使用特定分析器
 * import { SquatAnalyzer, EXERCISE_TYPES } from './analyzers';
 * const squatAnalyzer = new SquatAnalyzer();
 * 
 * // 动态创建分析器
 * import { createAnalyzer, EXERCISE_TYPES } from './analyzers';
 * const analyzer = createAnalyzer(EXERCISE_TYPES.SQUAT);
 */