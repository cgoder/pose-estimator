declare function loadMoveNetModel(config: any): Promise<any>;
declare function loadMoveNetModel(config?: any): Promise<any>;
declare function loadMoveNetModel(config?: any): Promise<any>;
/**
 * 共享的模型加载函数
 * 避免在多个 Worker 文件中重复实现相同的模型加载逻辑
 */
/**
 * 加载MoveNet模型
 */
declare function loadMoveNetModel(config: any): any;
declare function loadPoseNetModel(config: any): Promise<any>;
declare function loadPoseNetModel(config?: any): Promise<any>;
declare function loadPoseNetModel(config?: any): Promise<any>;
/**
 * 加载PoseNet模型
 */
declare function loadPoseNetModel(config: any): any;
declare function loadBlazePoseModel(config: any): Promise<any>;
declare function loadBlazePoseModel(config?: any): Promise<any>;
declare function loadBlazePoseModel(config?: any): Promise<any>;
/**
 * 加载BlazePose模型
 */
declare function loadBlazePoseModel(config: any): any;
//# sourceMappingURL=shared-model-loaders.d.ts.map