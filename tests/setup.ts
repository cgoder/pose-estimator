// 测试环境设置
import 'jest-canvas-mock';

// 模拟 TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  loadLayersModel: jest.fn(),
  tensor: jest.fn(),
  dispose: jest.fn(),
  tidy: jest.fn((fn) => fn()),
  browser: {
    fromPixels: jest.fn()
  },
  ready: jest.fn(() => Promise.resolve())
}));

// 模拟 MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }]
    }))
  }
});

// 模拟 Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 }))
}));

// 全局测试工具
global.createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  return canvas;
};

global.createMockVideoElement = () => {
  const video = document.createElement('video');
  video.width = 640;
  video.height = 480;
  return video;
};