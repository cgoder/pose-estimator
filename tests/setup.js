/**
 * Jest 测试环境设置文件
 * 配置全局模拟、测试工具和环境变量
 */

import { jest } from '@jest/globals';
import 'jest-canvas-mock';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.TZ = 'UTC';

// 全局测试超时
jest.setTimeout(10000);

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // 保留 log 用于调试
  log: jest.fn(),
  // 静默 warn 和 error，除非在调试模式
  warn: process.env.DEBUG ? originalConsole.warn : jest.fn(),
  error: process.env.DEBUG ? originalConsole.error : jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // 60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now() + 1000
    }
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.reduce((acc, item) => acc + item.length, 0) : 0,
  type: options?.type || '',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn().mockResolvedValue(content ? content.join('') : ''),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
}));

// Mock File
global.File = jest.fn().mockImplementation((content, name, options) => ({
  ...new Blob(content, options),
  name,
  lastModified: Date.now(),
  webkitRelativePath: ''
}));

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  readAsBinaryString: jest.fn(),
  abort: jest.fn(),
  result: null,
  error: null,
  readyState: 0,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null
}));

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
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
      rect: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      canvas: {
        width: 800,
        height: 600
      }
    };
  }
  
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return {
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      drawArrays: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      viewport: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      getProgramParameter: jest.fn(() => true),
      getShaderInfoLog: jest.fn(() => ''),
      getProgramInfoLog: jest.fn(() => ''),
      getAttribLocation: jest.fn(() => 0),
      getUniformLocation: jest.fn(() => {}),
      uniform1f: jest.fn(),
      uniform2f: jest.fn(),
      uniform3f: jest.fn(),
      uniform4f: jest.fn(),
      uniformMatrix4fv: jest.fn()
    };
  }
  
  return null;
});

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get: jest.fn(() => 640)
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get: jest.fn(() => 480)
});

HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue();
HTMLVideoElement.prototype.pause = jest.fn();
HTMLVideoElement.prototype.load = jest.fn();

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn(() => [{
        stop: jest.fn(),
        getSettings: jest.fn(() => ({ width: 640, height: 480 }))
      }]),
      getVideoTracks: jest.fn(() => [{
        stop: jest.fn(),
        getSettings: jest.fn(() => ({ width: 640, height: 480 }))
      }]),
      getAudioTracks: jest.fn(() => [])
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Mock Camera 1',
        groupId: 'group1'
      },
      {
        deviceId: 'camera2',
        kind: 'videoinput',
        label: 'Mock Camera 2',
        groupId: 'group2'
      }
    ])
  }
});

// Mock WebRTC APIs
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockResolvedValue({}),
  createAnswer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue(),
  setRemoteDescription: jest.fn().mockResolvedValue(),
  addIceCandidate: jest.fn().mockResolvedValue(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock Worker API
global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onmessage: null,
  onerror: null
}));

// Mock WebAssembly (if needed)
global.WebAssembly = {
  instantiate: jest.fn().mockResolvedValue({
    instance: {
      exports: {}
    }
  }),
  compile: jest.fn().mockResolvedValue({})
};

// Mock Notification API
global.Notification = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

Notification.permission = 'granted';
Notification.requestPermission = jest.fn().mockResolvedValue('granted');

// Mock Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: Date.now()
      });
    }),
    watchPosition: jest.fn(() => 1),
    clearWatch: jest.fn()
  }
});

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000')
  }
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn((str) => new Uint8Array(str.split('').map(c => c.charCodeAt(0))))
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn((arr) => String.fromCharCode(...arr))
}));

// 测试工具函数
global.testUtils = {
  // 等待异步操作完成
  waitFor: async (callback, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const result = await callback();
        if (result) return result;
      } catch (error) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`waitFor timeout after ${timeout}ms`);
  },
  
  // 创建模拟事件
  createMockEvent: (type, properties = {}) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, properties);
    return event;
  },
  
  // 创建模拟关键点数据
  createMockKeypoints: (overrides = {}) => {
    const defaultKeypoints = {
      nose: { x: 320, y: 100, confidence: 0.9 },
      leftEye: { x: 310, y: 90, confidence: 0.8 },
      rightEye: { x: 330, y: 90, confidence: 0.8 },
      leftShoulder: { x: 280, y: 150, confidence: 0.9 },
      rightShoulder: { x: 360, y: 150, confidence: 0.9 },
      leftElbow: { x: 250, y: 200, confidence: 0.8 },
      rightElbow: { x: 390, y: 200, confidence: 0.8 },
      leftWrist: { x: 220, y: 250, confidence: 0.8 },
      rightWrist: { x: 420, y: 250, confidence: 0.8 },
      leftHip: { x: 290, y: 300, confidence: 0.9 },
      rightHip: { x: 350, y: 300, confidence: 0.9 },
      leftKnee: { x: 285, y: 400, confidence: 0.8 },
      rightKnee: { x: 355, y: 400, confidence: 0.8 },
      leftAnkle: { x: 280, y: 500, confidence: 0.8 },
      rightAnkle: { x: 360, y: 500, confidence: 0.8 }
    };
    return { ...defaultKeypoints, ...overrides };
  },
  
  // 创建模拟视频流
  createMockVideoStream: () => ({
    getTracks: jest.fn(() => [{
      stop: jest.fn(),
      getSettings: jest.fn(() => ({ width: 640, height: 480 }))
    }]),
    getVideoTracks: jest.fn(() => [{
      stop: jest.fn(),
      getSettings: jest.fn(() => ({ width: 640, height: 480 }))
    }]),
    getAudioTracks: jest.fn(() => [])
  }),
  
  // 模拟延迟
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 创建模拟DOM元素
  createMockElement: (tagName, properties = {}) => {
    const element = document.createElement(tagName);
    Object.assign(element, properties);
    return element;
  }
};

// 清理函数
beforeEach(() => {
  // 清除所有模拟调用
  jest.clearAllMocks();
  
  // 重置localStorage和sessionStorage
  localStorageMock.clear.mockClear();
  sessionStorageMock.clear.mockClear();
  
  // 重置console模拟
  global.console.log.mockClear();
  global.console.warn.mockClear();
  global.console.error.mockClear();
  global.console.info.mockClear();
  global.console.debug.mockClear();
});

// 全局清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers();
  
  // 清理DOM
  document.body.innerHTML = '';
  
  // 重置模拟
  jest.resetAllMocks();
});

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// 导出测试工具
export { testUtils };