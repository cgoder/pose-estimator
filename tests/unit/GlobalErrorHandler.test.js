/**
 * 全局错误处理器单元测试
 * 测试错误处理、恢复策略、用户通知等功能
 */

import { jest } from '@jest/globals';
import GlobalErrorHandler, {
  AppError,
  ErrorType,
  ErrorSeverity,
  RecoveryStrategy
} from '../../src/utils/GlobalErrorHandler.js';

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = jest.fn();

describe('GlobalErrorHandler', () => {
  let errorHandler;
  let mockCallback;

  beforeEach(() => {
    errorHandler = new GlobalErrorHandler();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    errorHandler.destroy();
  });

  describe('初始化', () => {
    test('应该正确初始化错误处理器', () => {
      expect(errorHandler).toBeInstanceOf(GlobalErrorHandler);
      expect(errorHandler.isInitialized).toBe(true);
    });

    test('应该设置全局错误监听器', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      new GlobalErrorHandler();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('AppError类', () => {
    test('应该正确创建AppError实例', () => {
      const error = new AppError(
        '测试错误',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.HIGH,
        { code: 500 }
      );

      expect(error.message).toBe('测试错误');
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context.code).toBe(500);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.id).toBeDefined();
    });

    test('应该正确序列化为JSON', () => {
      const error = new AppError('测试错误', ErrorType.MODEL_ERROR);
      const json = error.toJSON();

      expect(json.message).toBe('测试错误');
      expect(json.type).toBe(ErrorType.MODEL_ERROR);
      expect(json.id).toBe(error.id);
    });
  });

  describe('错误处理', () => {
    test('应该正确处理AppError', async () => {
      const error = new AppError(
        '网络错误',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM
      );

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false); // 默认没有恢复策略
      expect(console.error).toHaveBeenCalled();
    });

    test('应该正确处理普通Error', async () => {
      const error = new Error('普通错误');

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    test('应该执行恢复策略', async () => {
      const mockRecoveryFn = jest.fn().mockResolvedValue(true);
      
      errorHandler.setRecoveryStrategy(ErrorType.NETWORK_ERROR, {
        strategy: RecoveryStrategy.RETRY,
        maxAttempts: 3,
        retryDelay: 100,
        customRecovery: mockRecoveryFn
      });

      const error = new AppError(
        '网络错误',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM
      );

      const result = await errorHandler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(mockRecoveryFn).toHaveBeenCalled();
    });

    test('应该在恢复失败时重试', async () => {
      const mockRecoveryFn = jest.fn()
        .mockRejectedValueOnce(new Error('恢复失败'))
        .mockResolvedValueOnce(true);
      
      errorHandler.setRecoveryStrategy(ErrorType.MODEL_ERROR, {
        strategy: RecoveryStrategy.RETRY,
        maxAttempts: 3,
        retryDelay: 10,
        customRecovery: mockRecoveryFn
      });

      const error = new AppError(
        '模型错误',
        ErrorType.MODEL_ERROR,
        ErrorSeverity.HIGH
      );

      const result = await errorHandler.handleError(error);

      expect(result.recovered).toBe(true);
      expect(mockRecoveryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误报告', () => {
    test('应该将错误保存到本地存储', async () => {
      const error = new AppError('测试错误', ErrorType.VALIDATION_ERROR);

      await errorHandler.handleError(error);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pose_estimator_errors',
        expect.any(String)
      );
    });

    test('应该发送错误到服务器', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      errorHandler.setReportingEndpoint('https://api.example.com/errors');
      
      const error = new AppError(
        '严重错误',
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.CRITICAL
      );

      await errorHandler.handleError(error);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/errors',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.any(String)
        })
      );
    });

    test('应该在服务器报告失败时继续处理', async () => {
      fetch.mockRejectedValueOnce(new Error('网络错误'));

      errorHandler.setReportingEndpoint('https://api.example.com/errors');
      
      const error = new AppError('测试错误', ErrorType.NETWORK_ERROR);

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('错误报告失败')
      );
    });
  });

  describe('用户通知', () => {
    test('应该显示用户友好的错误消息', async () => {
      const error = new AppError(
        '网络连接失败',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM
      );

      await errorHandler.handleError(error);

      // 验证是否调用了用户通知方法
      // 这里需要根据实际的通知实现来验证
      expect(console.error).toHaveBeenCalled();
    });

    test('应该根据错误严重程度显示不同类型的通知', async () => {
      const criticalError = new AppError(
        '系统崩溃',
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.CRITICAL
      );

      const lowError = new AppError(
        '轻微警告',
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.LOW
      );

      await errorHandler.handleError(criticalError);
      await errorHandler.handleError(lowError);

      // 验证不同严重程度的错误处理
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误统计', () => {
    test('应该正确统计错误数量', async () => {
      const error1 = new AppError('错误1', ErrorType.NETWORK_ERROR);
      const error2 = new AppError('错误2', ErrorType.MODEL_ERROR);
      const error3 = new AppError('错误3', ErrorType.NETWORK_ERROR);

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);
      await errorHandler.handleError(error3);

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByType[ErrorType.MODEL_ERROR]).toBe(1);
    });

    test('应该正确统计错误严重程度', async () => {
      const highError = new AppError('高', ErrorType.SYSTEM_ERROR, ErrorSeverity.HIGH);
      const mediumError = new AppError('中', ErrorType.NETWORK_ERROR, ErrorSeverity.MEDIUM);
      const lowError = new AppError('低', ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW);

      await errorHandler.handleError(highError);
      await errorHandler.handleError(mediumError);
      await errorHandler.handleError(lowError);

      const stats = errorHandler.getErrorStatistics();

      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.LOW]).toBe(1);
    });

    test('应该计算错误率', async () => {
      // 模拟一些成功操作
      errorHandler.recordSuccess();
      errorHandler.recordSuccess();
      errorHandler.recordSuccess();

      // 添加一个错误
      const error = new AppError('测试错误', ErrorType.VALIDATION_ERROR);
      await errorHandler.handleError(error);

      const stats = errorHandler.getErrorStatistics();

      expect(stats.errorRate).toBeCloseTo(0.25); // 1 error out of 4 operations
    });
  });

  describe('事件监听', () => {
    test('应该触发错误处理事件', async () => {
      errorHandler.addEventListener('errorHandled', mockCallback);

      const error = new AppError('测试错误', ErrorType.VALIDATION_ERROR);
      await errorHandler.handleError(error);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(AppError),
          handled: true
        })
      );
    });

    test('应该触发恢复成功事件', async () => {
      const mockRecoveryFn = jest.fn().mockResolvedValue(true);
      
      errorHandler.setRecoveryStrategy(ErrorType.NETWORK_ERROR, {
        strategy: RecoveryStrategy.RETRY,
        customRecovery: mockRecoveryFn
      });

      errorHandler.addEventListener('recoverySuccess', mockCallback);

      const error = new AppError('网络错误', ErrorType.NETWORK_ERROR);
      await errorHandler.handleError(error);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(AppError),
          strategy: RecoveryStrategy.RETRY
        })
      );
    });

    test('应该移除事件监听器', () => {
      errorHandler.addEventListener('errorHandled', mockCallback);
      errorHandler.removeEventListener('errorHandled', mockCallback);

      const error = new AppError('测试错误', ErrorType.VALIDATION_ERROR);
      errorHandler.handleError(error);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('配置管理', () => {
    test('应该正确设置恢复策略', () => {
      const config = {
        strategy: RecoveryStrategy.FALLBACK,
        maxAttempts: 5,
        retryDelay: 200
      };

      errorHandler.setRecoveryStrategy(ErrorType.MODEL_ERROR, config);

      const retrievedConfig = errorHandler.getRecoveryStrategy(ErrorType.MODEL_ERROR);
      expect(retrievedConfig).toEqual(config);
    });

    test('应该正确设置报告端点', () => {
      const endpoint = 'https://api.example.com/errors';
      errorHandler.setReportingEndpoint(endpoint);

      expect(errorHandler.reportingEndpoint).toBe(endpoint);
    });

    test('应该正确设置用户通知配置', () => {
      const config = {
        showToast: true,
        toastDuration: 5000,
        showModal: false
      };

      errorHandler.setNotificationConfig(config);

      expect(errorHandler.notificationConfig).toEqual(
        expect.objectContaining(config)
      );
    });
  });

  describe('错误历史', () => {
    test('应该记录错误历史', async () => {
      const error1 = new AppError('错误1', ErrorType.NETWORK_ERROR);
      const error2 = new AppError('错误2', ErrorType.MODEL_ERROR);

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);

      const history = errorHandler.getErrorHistory();

      expect(history).toHaveLength(2);
      expect(history[0].error.message).toBe('错误1');
      expect(history[1].error.message).toBe('错误2');
    });

    test('应该限制历史记录数量', async () => {
      // 设置较小的历史记录限制
      errorHandler.setMaxHistorySize(3);

      for (let i = 0; i < 5; i++) {
        const error = new AppError(`错误${i}`, ErrorType.VALIDATION_ERROR);
        await errorHandler.handleError(error);
      }

      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(3);
      expect(history[0].error.message).toBe('错误2'); // 最旧的被移除
    });

    test('应该清除错误历史', async () => {
      const error = new AppError('测试错误', ErrorType.VALIDATION_ERROR);
      await errorHandler.handleError(error);

      expect(errorHandler.getErrorHistory()).toHaveLength(1);

      errorHandler.clearErrorHistory();
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('销毁和清理', () => {
    test('应该正确销毁错误处理器', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      errorHandler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(errorHandler.isInitialized).toBe(false);
      
      removeEventListenerSpy.mockRestore();
    });

    test('销毁后不应处理新错误', async () => {
      errorHandler.destroy();

      const error = new AppError('测试错误', ErrorType.VALIDATION_ERROR);
      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('应该处理null或undefined错误', async () => {
      const result1 = await errorHandler.handleError(null);
      const result2 = await errorHandler.handleError(undefined);

      expect(result1.handled).toBe(false);
      expect(result2.handled).toBe(false);
    });

    test('应该处理循环引用的错误对象', async () => {
      const error = new Error('循环引用错误');
      error.circular = error; // 创建循环引用

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
    });

    test('应该处理恢复策略中的异常', async () => {
      const mockRecoveryFn = jest.fn().mockImplementation(() => {
        throw new Error('恢复策略异常');
      });
      
      errorHandler.setRecoveryStrategy(ErrorType.NETWORK_ERROR, {
        strategy: RecoveryStrategy.CUSTOM,
        customRecovery: mockRecoveryFn
      });

      const error = new AppError('网络错误', ErrorType.NETWORK_ERROR);
      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('恢复策略执行失败')
      );
    });
  });
});

// 集成测试
describe('GlobalErrorHandler 集成测试', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new GlobalErrorHandler();
  });

  afterEach(() => {
    errorHandler.destroy();
  });

  test('应该处理完整的错误处理流程', async () => {
    const mockRecoveryFn = jest.fn().mockResolvedValue(true);
    const mockEventCallback = jest.fn();
    
    // 设置恢复策略
    errorHandler.setRecoveryStrategy(ErrorType.NETWORK_ERROR, {
      strategy: RecoveryStrategy.RETRY,
      maxAttempts: 2,
      retryDelay: 10,
      customRecovery: mockRecoveryFn
    });

    // 设置事件监听
    errorHandler.addEventListener('errorHandled', mockEventCallback);
    errorHandler.addEventListener('recoverySuccess', mockEventCallback);

    // 设置报告端点
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    errorHandler.setReportingEndpoint('https://api.example.com/errors');

    // 处理错误
    const error = new AppError(
      '网络连接失败',
      ErrorType.NETWORK_ERROR,
      ErrorSeverity.HIGH
    );

    const result = await errorHandler.handleError(error);

    // 验证结果
    expect(result.handled).toBe(true);
    expect(result.recovered).toBe(true);
    expect(mockRecoveryFn).toHaveBeenCalled();
    expect(mockEventCallback).toHaveBeenCalledTimes(2); // errorHandled + recoverySuccess
    expect(fetch).toHaveBeenCalled();
    expect(localStorageMock.setItem).toHaveBeenCalled();

    // 验证统计信息
    const stats = errorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(1);
    expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBe(1);
  });
});