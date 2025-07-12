/**
 * 共享的模型加载函数
 * 避免在多个 Worker 文件中重复实现相同的模型加载逻辑
 */

/**
 * 加载MoveNet模型
 */
function loadMoveNetModel(config) {
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    ...config
  };
  
  return poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );
}

/**
 * 加载PoseNet模型
 */
function loadPoseNetModel(config) {
  const detectorConfig = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 640, height: 480 },
    multiplier: 0.75,
    ...config
  };
  
  return poseDetection.createDetector(
    poseDetection.SupportedModels.PoseNet,
    detectorConfig
  );
}

/**
 * 加载BlazePose模型
 */
function loadBlazePoseModel(config) {
  const detectorConfig = {
    runtime: 'tfjs',
    enableSmoothing: true,
    modelType: 'full',
    ...config
  };
  
  return poseDetection.createDetector(
    poseDetection.SupportedModels.BlazePose,
    detectorConfig
  );
}