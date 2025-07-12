/**
 * Worker 全局声明文件
 * 避免在多个 Worker 文件中重复声明相同的全局变量和函数
 */

// 全局配置声明
declare const UNIFIED_DEPENDENCY_CONFIG: any;
declare const UNIFIED_FALLBACK_CONFIG: any;
declare const VERSION_INFO: any;

// TensorFlow.js 全局声明
declare const tf: any;
declare const poseDetection: any;
declare function importScripts(...urls: string[]): void;

// 通用模型加载函数声明
declare function loadMoveNetModel(config: any): Promise<any>;
declare function loadPoseNetModel(config: any): Promise<any>;
declare function loadBlazePoseModel(config: any): Promise<any>;