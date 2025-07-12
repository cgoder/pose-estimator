/**
 * Worker 通用类型定义
 * 避免在多个 Worker 文件中重复定义相同的接口
 */

// Worker消息类型定义
export interface WorkerMessage {
  id?: string;
  type: 'initialize' | 'loadModel' | 'predict' | 'ping';
  payload?: any;
}

export interface WorkerResponse {
  id?: string;
  type: 'response' | 'error' | 'event';
  payload?: any;
  error?: string;
}

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
}

// Worker 状态接口
export interface WorkerState {
  isInitialized: boolean;
  model: any;
  modelType: string | null;
}

// 模型配置接口
export interface ModelConfig {
  modelType: 'MoveNet' | 'PoseNet' | 'BlazePose';
  modelUrl?: string;
  inputResolution?: { width: number; height: number };
  scoreThreshold?: number;
  [key: string]: any;
}