/**
 * 错误恢复机制单元测试
 * 测试系统状态管理、自动恢复策略和健康检查功能
 */

import { jest } from '@jest/globals';
import {
  SystemState,
  RecoveryMode,
  SystemStateManager,
  AutoRecoveryManager,
  HealthCheckManager,
  ErrorRecovery
} from '../../src/utils/ErrorRecovery.js';

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn()
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('SystemStateManager', () => {
  let stateManager;
  let mockCallback;

  beforeEach(() => {
    stateManager = new SystemStateManager();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    stateManager.destroy();
  });

  describe('初始化', () => {
    test('应该以正常状态初始化', () => {
      expect(stateManager.getCurrentState()).toBe(SystemState.NORMAL);
      expect(stateManager.getStateHistory()).toHaveLength(1);
    });

    test('应该正确设置初始状态', () => {
      const customStateManager = new SystemStateManager(SystemState.DEGRADED);
      expect(customStateManager.getCurrentState()).toBe(SystemState.DEGRADED);
      customStateManager.destroy();
    });
  });

  describe('状态转换', () => {
    test('应该正确转换状态', () => {
      const result = stateManager.transitionTo(SystemState.DEGRADED, '性能下降');
      
      expect(result).toBe(true);
      expect(stateManager.getCurrentState()).toBe(SystemState.DEGRADED);
      expect(stateManager.getStateHistory()).toHaveLength(2);
    });

    test('应该验证状态转换的有效性', () => {
      // 从正常状态不能直接转换到离线状态
      const result = stateManager.transitionTo(SystemState.OFFLINE, '直接离线');
      
      expect(result).toBe(false);
      expect(stateManager.getCurrentState()).toBe(SystemState.NORMAL);
    });

    test('应该记录状态转换历史', () => {
      stateManager.transitionTo(SystemState.DEGRADED, '性能问题');
      stateManager.transitionTo(SystemState.RECOVERING, '开始恢复');
      
      const history = stateManager.getStateHistory();
      expect(history).toHaveLength(3);
      expect(history[1].state).toBe(SystemState.DEGRADED);
      expect(history[1].reason).toBe('性能问题');
      expect(history[2].state).toBe(SystemState.RECOVERING);
    });

    test('应该限制历史记录数量', () => {
      stateManager.setMaxHistorySize(3);
      
      for (let i = 0; i < 5; i++) {
        stateManager.transitionTo(
          i % 2 === 0 ? SystemState.DEGRADED : SystemState.NORMAL,
          `转换${i}`
        );
      }
      
      expect(stateManager.getStateHistory()).toHaveLength(3);
    });
  });

  describe('状态监听', () => {
    test('应该触发状态变更事件', () => {
      stateManager.addEventListener('stateChanged', mockCallback);
      
      stateManager.transitionTo(SystemState.DEGRADED, '测试转换');
      
      expect(mockCallback).toHaveBeenCalledWith({
        previousState: SystemState.NORMAL,
        currentState: SystemState.DEGRADED,
        reason: '测试转换',
        timestamp: expect.any(Date)
      });
    });

    test('应该移除事件监听器', () => {
      stateManager.addEventListener('stateChanged', mockCallback);
      stateManager.removeEventListener('stateChanged', mockCallback);
      
      stateManager.transitionTo(SystemState.DEGRADED, '测试');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('状态查询', () => {
    test('应该正确判断系统是否健康', () => {
      expect(stateManager.isHealthy()).toBe(true);
      
      stateManager.transitionTo(SystemState.DEGRADED, '性能下降');
      expect(stateManager.isHealthy()).toBe(false);
      
      stateManager.transitionTo(SystemState.CRITICAL, '严重问题');
      expect(stateManager.isHealthy()).toBe(false);
    });

    test('应该正确判断系统是否可用', () => {
      expect(stateManager.isAvailable()).toBe(true);
      
      stateManager.transitionTo(SystemState.DEGRADED, '降级');
      expect(stateManager.isAvailable()).toBe(true);
      
      stateManager.transitionTo(SystemState.OFFLINE, '离线');
      expect(stateManager.isAvailable()).toBe(false);
    });

    test('应该获取状态持续时间', () => {
      const startTime = Date.now();
      performance.now.mockReturnValue(startTime);
      
      stateManager.transitionTo(SystemState.DEGRADED, '测试');
      
      performance.now.mockReturnValue(startTime + 5000);
      
      const duration = stateManager.getStateDuration();
      expect(duration).toBe(5000);
    });
  });
});

describe('AutoRecoveryManager', () => {
  let recoveryManager;
  let mockRecoveryFn;
  let mockCallback;

  beforeEach(() => {
    recoveryManager = new AutoRecoveryManager();
    mockRecoveryFn = jest.fn().mockResolvedValue(true);
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    recoveryManager.destroy();
  });

  describe('恢复策略管理', () => {
    test('应该正确注册恢复策略', () => {
      const strategy = {
        name: '网络重连',
        condition: (error) => error.type === 'NETWORK_ERROR',
        action: mockRecoveryFn,
        maxAttempts: 3,
        delay: 1000,
        backoff: 2
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const strategies = recoveryManager.getStrategies();
      expect(strategies).toHaveLength(1);
      expect(strategies[0].name).toBe('网络重连');
    });

    test('应该正确移除恢复策略', () => {
      const strategy = {
        name: '测试策略',
        condition: () => true,
        action: mockRecoveryFn
      };
      
      recoveryManager.registerStrategy(strategy);
      expect(recoveryManager.getStrategies()).toHaveLength(1);
      
      recoveryManager.removeStrategy('测试策略');
      expect(recoveryManager.getStrategies()).toHaveLength(0);
    });
  });

  describe('自动恢复执行', () => {
    test('应该执行匹配的恢复策略', async () => {
      const strategy = {
        name: '测试恢复',
        condition: (error) => error.type === 'TEST_ERROR',
        action: mockRecoveryFn,
        maxAttempts: 1
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const error = { type: 'TEST_ERROR', message: '测试错误' };
      const result = await recoveryManager.attemptRecovery(error);
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('测试恢复');
      expect(mockRecoveryFn).toHaveBeenCalledWith(error);
    });

    test('应该在恢复失败时重试', async () => {
      mockRecoveryFn
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockRejectedValueOnce(new Error('第二次失败'))
        .mockResolvedValueOnce(true);
      
      const strategy = {
        name: '重试策略',
        condition: () => true,
        action: mockRecoveryFn,
        maxAttempts: 3,
        delay: 10
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const error = { type: 'TEST_ERROR' };
      const result = await recoveryManager.attemptRecovery(error);
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockRecoveryFn).toHaveBeenCalledTimes(3);
    });

    test('应该在达到最大重试次数后停止', async () => {
      mockRecoveryFn.mockRejectedValue(new Error('持续失败'));
      
      const strategy = {
        name: '失败策略',
        condition: () => true,
        action: mockRecoveryFn,
        maxAttempts: 2,
        delay: 10
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const error = { type: 'TEST_ERROR' };
      const result = await recoveryManager.attemptRecovery(error);
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(mockRecoveryFn).toHaveBeenCalledTimes(2);
    });

    test('应该应用指数退避延迟', async () => {
      const startTime = Date.now();
      let callTimes = [];
      
      mockRecoveryFn.mockImplementation(() => {
        callTimes.push(Date.now() - startTime);
        return Promise.reject(new Error('失败'));
      });
      
      const strategy = {
        name: '退避策略',
        condition: () => true,
        action: mockRecoveryFn,
        maxAttempts: 3,
        delay: 100,
        backoff: 2
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const error = { type: 'TEST_ERROR' };
      await recoveryManager.attemptRecovery(error);
      
      // 验证延迟时间递增
      expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(100);
      expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(200);
    });
  });

  describe('恢复模式', () => {
    test('应该在自动模式下自动执行恢复', async () => {
      recoveryManager.setMode(RecoveryMode.AUTO);
      
      const strategy = {
        name: '自动恢复',
        condition: () => true,
        action: mockRecoveryFn
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const error = { type: 'AUTO_ERROR' };
      const result = await recoveryManager.attemptRecovery(error);
      
      expect(result.success).toBe(true);
      expect(mockRecoveryFn).toHaveBeenCalled();
    });

    test('应该在手动模式下不自动执行恢复', async () => {
      recoveryManager.setMode(RecoveryMode.MANUAL);
      
      const strategy = {
        name: '手动恢复',
        condition: () => true,
        action: mockRecoveryFn
      };
      
      recoveryManager.registerStrategy(strategy);
      
      const error = { type: 'MANUAL_ERROR' };
      const result = await recoveryManager.attemptRecovery(error);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('手动模式');
      expect(mockRecoveryFn).not.toHaveBeenCalled();
    });
  });

  describe('恢复统计', () => {
    test('应该记录恢复统计信息', async () => {
      const strategy = {
        name: '统计测试',
        condition: () => true,
        action: mockRecoveryFn
      };
      
      recoveryManager.registerStrategy(strategy);
      
      await recoveryManager.attemptRecovery({ type: 'TEST1' });
      await recoveryManager.attemptRecovery({ type: 'TEST2' });
      
      const stats = recoveryManager.getStatistics();
      
      expect(stats.totalAttempts).toBe(2);
      expect(stats.successfulRecoveries).toBe(2);
      expect(stats.successRate).toBe(1.0);
    });

    test('应该按策略统计恢复情况', async () => {
      const strategy1 = {
        name: '策略1',
        condition: (error) => error.type === 'TYPE1',
        action: mockRecoveryFn
      };
      
      const strategy2 = {
        name: '策略2',
        condition: (error) => error.type === 'TYPE2',
        action: jest.fn().mockRejectedValue(new Error('失败'))
      };
      
      recoveryManager.registerStrategy(strategy1);
      recoveryManager.registerStrategy(strategy2);
      
      await recoveryManager.attemptRecovery({ type: 'TYPE1' });
      await recoveryManager.attemptRecovery({ type: 'TYPE2' });
      
      const stats = recoveryManager.getStatistics();
      
      expect(stats.strategiesUsed['策略1']).toBe(1);
      expect(stats.strategiesUsed['策略2']).toBe(1);
    });
  });
});

describe('HealthCheckManager', () => {
  let healthManager;
  let mockHealthCheck;
  let mockCallback;

  beforeEach(() => {
    healthManager = new HealthCheckManager();
    mockHealthCheck = jest.fn().mockResolvedValue({ healthy: true, latency: 100 });
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    healthManager.destroy();
  });

  describe('健康检查注册', () => {
    test('应该正确注册健康检查', () => {
      const check = {
        name: '数据库连接',
        check: mockHealthCheck,
        interval: 5000,
        timeout: 3000,
        critical: true
      };
      
      healthManager.registerCheck(check);
      
      const checks = healthManager.getChecks();
      expect(checks).toHaveLength(1);
      expect(checks[0].name).toBe('数据库连接');
    });

    test('应该正确移除健康检查', () => {
      const check = {
        name: '测试检查',
        check: mockHealthCheck
      };
      
      healthManager.registerCheck(check);
      expect(healthManager.getChecks()).toHaveLength(1);
      
      healthManager.removeCheck('测试检查');
      expect(healthManager.getChecks()).toHaveLength(0);
    });
  });

  describe('健康检查执行', () => {
    test('应该执行单个健康检查', async () => {
      const check = {
        name: 'API检查',
        check: mockHealthCheck,
        timeout: 1000
      };
      
      healthManager.registerCheck(check);
      
      const result = await healthManager.runCheck('API检查');
      
      expect(result.name).toBe('API检查');
      expect(result.healthy).toBe(true);
      expect(result.latency).toBe(100);
      expect(mockHealthCheck).toHaveBeenCalled();
    });

    test('应该处理健康检查超时', async () => {
      const slowCheck = jest.fn(() => new Promise(resolve => 
        setTimeout(() => resolve({ healthy: true }), 2000)
      ));
      
      const check = {
        name: '慢检查',
        check: slowCheck,
        timeout: 100
      };
      
      healthManager.registerCheck(check);
      
      const result = await healthManager.runCheck('慢检查');
      
      expect(result.healthy).toBe(false);
      expect(result.error).toContain('超时');
    });

    test('应该处理健康检查异常', async () => {
      const failingCheck = jest.fn().mockRejectedValue(new Error('检查失败'));
      
      const check = {
        name: '失败检查',
        check: failingCheck
      };
      
      healthManager.registerCheck(check);
      
      const result = await healthManager.runCheck('失败检查');
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBe('检查失败');
    });

    test('应该执行所有健康检查', async () => {
      const check1 = {
        name: '检查1',
        check: jest.fn().mockResolvedValue({ healthy: true, latency: 50 })
      };
      
      const check2 = {
        name: '检查2',
        check: jest.fn().mockResolvedValue({ healthy: false, error: '服务不可用' })
      };
      
      healthManager.registerCheck(check1);
      healthManager.registerCheck(check2);
      
      const results = await healthManager.runAllChecks();
      
      expect(results).toHaveLength(2);
      expect(results[0].healthy).toBe(true);
      expect(results[1].healthy).toBe(false);
    });
  });

  describe('定期健康检查', () => {
    test('应该启动定期健康检查', async () => {
      const check = {
        name: '定期检查',
        check: mockHealthCheck,
        interval: 100
      };
      
      healthManager.registerCheck(check);
      healthManager.addEventListener('checkCompleted', mockCallback);
      
      healthManager.startPeriodicChecks();
      
      // 等待检查执行
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockHealthCheck).toHaveBeenCalled();
      
      healthManager.stopPeriodicChecks();
    });

    test('应该停止定期健康检查', async () => {
      const check = {
        name: '停止测试',
        check: mockHealthCheck,
        interval: 50
      };
      
      healthManager.registerCheck(check);
      
      healthManager.startPeriodicChecks();
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const callCountBefore = mockHealthCheck.mock.calls.length;
      
      healthManager.stopPeriodicChecks();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const callCountAfter = mockHealthCheck.mock.calls.length;
      
      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('健康状态监控', () => {
    test('应该触发健康状态变更事件', async () => {
      healthManager.addEventListener('healthChanged', mockCallback);
      
      const check = {
        name: '状态检查',
        check: jest.fn().mockResolvedValue({ healthy: false, error: '服务异常' }),
        critical: true
      };
      
      healthManager.registerCheck(check);
      
      await healthManager.runCheck('状态检查');
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          overall: false,
          critical: true
        })
      );
    });

    test('应该正确计算整体健康状态', async () => {
      const healthyCheck = {
        name: '健康检查',
        check: jest.fn().mockResolvedValue({ healthy: true })
      };
      
      const unhealthyCheck = {
        name: '不健康检查',
        check: jest.fn().mockResolvedValue({ healthy: false }),
        critical: true
      };
      
      healthManager.registerCheck(healthyCheck);
      healthManager.registerCheck(unhealthyCheck);
      
      await healthManager.runAllChecks();
      
      const status = healthManager.getOverallHealth();
      
      expect(status.healthy).toBe(false);
      expect(status.critical).toBe(true);
    });
  });
});

describe('ErrorRecovery 集成测试', () => {
  let errorRecovery;
  let mockCallback;

  beforeEach(() => {
    errorRecovery = new ErrorRecovery();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    errorRecovery.destroy();
  });

  describe('初始化和配置', () => {
    test('应该正确初始化所有组件', () => {
      expect(errorRecovery.stateManager).toBeDefined();
      expect(errorRecovery.recoveryManager).toBeDefined();
      expect(errorRecovery.healthManager).toBeDefined();
      expect(errorRecovery.isInitialized).toBe(true);
    });

    test('应该正确配置恢复策略', () => {
      const config = {
        mode: RecoveryMode.AUTO,
        strategies: [
          {
            name: '网络重连',
            condition: (error) => error.type === 'NETWORK_ERROR',
            action: jest.fn().mockResolvedValue(true)
          }
        ],
        healthChecks: [
          {
            name: 'API健康检查',
            check: jest.fn().mockResolvedValue({ healthy: true }),
            interval: 30000
          }
        ]
      };
      
      errorRecovery.configure(config);
      
      expect(errorRecovery.recoveryManager.getMode()).toBe(RecoveryMode.AUTO);
      expect(errorRecovery.recoveryManager.getStrategies()).toHaveLength(1);
      expect(errorRecovery.healthManager.getChecks()).toHaveLength(1);
    });
  });

  describe('错误处理和恢复流程', () => {
    test('应该执行完整的错误恢复流程', async () => {
      const mockRecoveryAction = jest.fn().mockResolvedValue(true);
      
      // 配置恢复策略
      errorRecovery.configure({
        mode: RecoveryMode.AUTO,
        strategies: [
          {
            name: '自动恢复',
            condition: (error) => error.type === 'RECOVERABLE_ERROR',
            action: mockRecoveryAction
          }
        ]
      });
      
      // 监听状态变更
      errorRecovery.addEventListener('stateChanged', mockCallback);
      
      // 处理错误
      const error = {
        type: 'RECOVERABLE_ERROR',
        message: '可恢复的错误',
        severity: 'medium'
      };
      
      const result = await errorRecovery.handleError(error);
      
      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
      expect(mockRecoveryAction).toHaveBeenCalledWith(error);
      expect(mockCallback).toHaveBeenCalled();
    });

    test('应该在恢复失败时转换到适当状态', async () => {
      const mockRecoveryAction = jest.fn().mockRejectedValue(new Error('恢复失败'));
      
      errorRecovery.configure({
        strategies: [
          {
            name: '失败恢复',
            condition: () => true,
            action: mockRecoveryAction,
            maxAttempts: 1
          }
        ]
      });
      
      const error = {
        type: 'CRITICAL_ERROR',
        severity: 'critical'
      };
      
      await errorRecovery.handleError(error);
      
      expect(errorRecovery.stateManager.getCurrentState()).toBe(SystemState.CRITICAL);
    });
  });

  describe('健康监控集成', () => {
    test('应该根据健康检查结果调整系统状态', async () => {
      const unhealthyCheck = jest.fn().mockResolvedValue({
        healthy: false,
        error: '服务不可用'
      });
      
      errorRecovery.configure({
        healthChecks: [
          {
            name: '关键服务检查',
            check: unhealthyCheck,
            critical: true,
            interval: 100
          }
        ]
      });
      
      errorRecovery.addEventListener('stateChanged', mockCallback);
      
      errorRecovery.startHealthMonitoring();
      
      // 等待健康检查执行
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockCallback).toHaveBeenCalled();
      expect(errorRecovery.stateManager.getCurrentState()).toBe(SystemState.DEGRADED);
      
      errorRecovery.stopHealthMonitoring();
    });
  });

  describe('强制恢复', () => {
    test('应该执行强制恢复操作', async () => {
      // 设置系统为降级状态
      errorRecovery.stateManager.transitionTo(SystemState.DEGRADED, '测试降级');
      
      const result = await errorRecovery.forceRecovery();
      
      expect(result.success).toBe(true);
      expect(errorRecovery.stateManager.getCurrentState()).toBe(SystemState.NORMAL);
    });

    test('应该在强制恢复失败时保持当前状态', async () => {
      // 模拟恢复失败
      const originalMethod = errorRecovery.recoveryManager.attemptRecovery;
      errorRecovery.recoveryManager.attemptRecovery = jest.fn().mockRejectedValue(
        new Error('强制恢复失败')
      );
      
      errorRecovery.stateManager.transitionTo(SystemState.CRITICAL, '严重错误');
      
      const result = await errorRecovery.forceRecovery();
      
      expect(result.success).toBe(false);
      expect(errorRecovery.stateManager.getCurrentState()).toBe(SystemState.CRITICAL);
      
      // 恢复原方法
      errorRecovery.recoveryManager.attemptRecovery = originalMethod;
    });
  });

  describe('统计和监控', () => {
    test('应该提供综合统计信息', async () => {
      const mockRecoveryAction = jest.fn().mockResolvedValue(true);
      
      errorRecovery.configure({
        strategies: [
          {
            name: '测试策略',
            condition: () => true,
            action: mockRecoveryAction
          }
        ]
      });
      
      // 处理几个错误
      await errorRecovery.handleError({ type: 'ERROR1' });
      await errorRecovery.handleError({ type: 'ERROR2' });
      
      const stats = errorRecovery.getStatistics();
      
      expect(stats.recovery.totalAttempts).toBe(2);
      expect(stats.recovery.successfulRecoveries).toBe(2);
      expect(stats.state.currentState).toBe(SystemState.NORMAL);
      expect(stats.health.totalChecks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('重置和清理', () => {
    test('应该正确重置所有组件', () => {
      // 添加一些状态
      errorRecovery.stateManager.transitionTo(SystemState.DEGRADED, '测试');
      
      errorRecovery.reset();
      
      expect(errorRecovery.stateManager.getCurrentState()).toBe(SystemState.NORMAL);
      expect(errorRecovery.stateManager.getStateHistory()).toHaveLength(1);
    });

    test('应该正确销毁所有组件', () => {
      const stateManagerDestroySpy = jest.spyOn(errorRecovery.stateManager, 'destroy');
      const recoveryManagerDestroySpy = jest.spyOn(errorRecovery.recoveryManager, 'destroy');
      const healthManagerDestroySpy = jest.spyOn(errorRecovery.healthManager, 'destroy');
      
      errorRecovery.destroy();
      
      expect(stateManagerDestroySpy).toHaveBeenCalled();
      expect(recoveryManagerDestroySpy).toHaveBeenCalled();
      expect(healthManagerDestroySpy).toHaveBeenCalled();
      expect(errorRecovery.isInitialized).toBe(false);
    });
  });
});