/**
 * 运动分析器模块索引文件
 * 提供统一的导入接口
 */

// 导入主引擎
import ExerciseAnalysisEngine, { EXERCISE_TYPES } from './ExerciseAnalysisEngine.js';

// 导入基础分析器
import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

// 导入具体分析器
import SquatAnalyzer from './SquatAnalyzer.js';
import PushUpAnalyzer from './PushUpAnalyzer.js';
import PlankAnalyzer from './PlankAnalyzer.js';
import JumpingJackAnalyzer from './JumpingJackAnalyzer.js';
import LungeAnalyzer from './LungeAnalyzer.js';
import RunningAnalyzer from './RunningAnalyzer.js';
import WalkingAnalyzer from './WalkingAnalyzer.js';

// 默认导出主引擎
export default ExerciseAnalysisEngine;

// 导出运动类型常量
export { EXERCISE_TYPES };

// 导出基础分析器
export { BaseExerciseAnalyzer };

// 导出所有具体分析器
export {
    SquatAnalyzer,
    PushUpAnalyzer,
    PlankAnalyzer,
    JumpingJackAnalyzer,
    LungeAnalyzer,
    RunningAnalyzer,
    WalkingAnalyzer
};

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