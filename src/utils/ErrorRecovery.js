/**
 * 错误恢复机制
 * 提供自动错误恢复、降级策略和系统状态管理
 */

import { ErrorType, ErrorSeverity, RecoveryStrategy } from './GlobalErrorHandler.js';

// 系统状态枚举
export const SystemState = {
  NORMAL: 'normal',
  DEGRADED: 'degraded',
  RECOVERY: 'recovery',
  CRITICAL: 'critical',
  OFFLINE: 'offline'
};

// 恢复模式枚举
export const RecoveryMode = {
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
  HYBRID: 'hybrid'
};

/**
 * 系统状态管理器
 */
class SystemStateManager {
  constructor() {
    this.currentState = SystemState.NORMAL;
    this.stateHistory = [];
    this.stateChangeListeners = [];
    this.degradationLevel = 0; // 0-100，降级程度
    this.maxDegradationLevel = 80;
  }

  setState(newState, reason = '') {
    const previousState = this.currentState;
    this.currentState = newState;
    
    // 记录状态变化历史
    this.stateHistory.push({
      from: previousState,
      to: newState,
      reason,
      timestamp: new Date().toISOString()
    });

    // 限制历史记录数量
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    // 通知监听器
    this.notifyStateChange(previousState, newState, reason);
    
    console.log(`系统状态变化: ${previousState} -> ${newState} (${reason})`);
  }

  getState() {
    return this.currentState;
  }

  isHealthy() {
    return this.currentState === SystemState.NORMAL;
  }

  isDegraded() {
    return this.currentState === SystemState.DEGRADED;
  }

  isRecovering() {
    return this.currentState === SystemState.RECOVERY;
  }

  isCritical() {
    return this.currentState === SystemState.CRITICAL;
  }

  increaseDegradation(amount = 10) {
    this.degradationLevel = Math.min(100, this.degradationLevel + amount);
    
    if (this.degradationLevel >= this.maxDegradationLevel && this.currentState === SystemState.NORMAL) {
      this.setState(SystemState.DEGRADED, `降级程度达到 ${this.degradationLevel}%`);
    }
  }

  decreaseDegradation(amount = 5) {
    this.degradationLevel = Math.max(0, this.degradationLevel - amount);
    
    if (this.degradationLevel < 20 && this.currentState === SystemState.DEGRADED) {
      this.setState(SystemState.NORMAL, '系统恢复正常');
    }
  }

  addStateChangeListener(listener) {
    this.stateChangeListeners.push(listener);
  }

  removeStateChangeListener(listener) {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  notifyStateChange(from, to, reason) {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener({ from, to, reason, degradationLevel: this.degradationLevel });
      } catch (error) {
        console.error('状态变化监听器错误:', error);
      }
    });
  }

  getStateStats() {
    return {
      currentState: this.currentState,
      degradationLevel: this.degradationLevel,
      stateHistory: this.stateHistory.slice(-10),
      totalStateChanges: this.stateHistory.length
    };
  }
}

/**
 * 自动恢复策略管理器
 */
class AutoRecoveryManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.recoveryStrategies = new Map();
    this.activeRecoveries = new Set();
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
    this.recoveryTimeout = 30000; // 30秒
    
    this.initializeStrategies();
  }

  initializeStrategies() {
    // 网络恢复策略
    this.recoveryStrategies.set(ErrorType.NETWORK, {
      immediate: () => this.checkNetworkConnectivity(),
      delayed: () => this.enableOfflineMode(),
      timeout: 10000
    });

    // 模型恢复策略
    this.recoveryStrategies.set(ErrorType.MODEL, {
      immediate: () => this.reloadModel(),
      delayed: () => this.loadFallbackModel(),
      timeout: 15000
    });

    // 摄像头恢复策略
    this.recoveryStrategies.set(ErrorType.CAMERA, {
      immediate: () => this.reinitializeCamera(),
      delayed: () => this.enableFileInputMode(),
      timeout: 5000
    });

    // 渲染恢复策略
    this.recoveryStrategies.set(ErrorType.RENDERING, {
      immediate: () => this.resetRenderingContext(),
      delayed: () => this.enableBasicRendering(),
      timeout: 3000
    });

    // 分析恢复策略
    this.recoveryStrategies.set(ErrorType.ANALYSIS, {
      immediate: () => this.restartAnalysisEngine(),
      delayed: () => this.enableBasicAnalysis(),
      timeout: 8000
    });

    // 缓存恢复策略
    this.recoveryStrategies.set(ErrorType.CACHE, {
      immediate: () => this.clearCorruptedCache(),
      delayed: () => this.disableCache(),
      timeout: 2000
    });
  }

  async executeRecovery(error) {
    const errorKey = `${error.type}_${error.id}`;
    
    // 检查是否已在恢复中
    if (this.activeRecoveries.has(errorKey)) {
      console.log('恢复已在进行中:', errorKey);
      return false;
    }

    // 检查恢复尝试次数
    const attempts = this.recoveryAttempts.get(error.type) || 0;
    if (attempts >= this.maxRecoveryAttempts) {
      console.log('恢复尝试次数已达上限:', error.type);
      return false;
    }

    this.activeRecoveries.add(errorKey);
    this.recoveryAttempts.set(error.type, attempts + 1);
    this.stateManager.setState(SystemState.RECOVERY, `正在恢复 ${error.type} 错误`);

    try {
      const strategy = this.recoveryStrategies.get(error.type);
      if (!strategy) {
        console.log('未找到恢复策略:', error.type);
        return false;
      }

      // 执行立即恢复
      const immediateResult = await this.executeWithTimeout(
        strategy.immediate,
        strategy.timeout
      );

      if (immediateResult) {
        console.log('立即恢复成功:', error.type);
        this.onRecoverySuccess(error.type);
        return true;
      }

      // 立即恢复失败，执行延迟恢复
      console.log('立即恢复失败，执行延迟恢复:', error.type);
      const delayedResult = await this.executeWithTimeout(
        strategy.delayed,
        strategy.timeout
      );

      if (delayedResult) {
        console.log('延迟恢复成功:', error.type);
        this.onRecoverySuccess(error.type, true);
        return true;
      }

      console.log('恢复失败:', error.type);
      this.onRecoveryFailure(error.type);
      return false;

    } catch (recoveryError) {
      console.error('恢复过程中出现错误:', recoveryError);
      this.onRecoveryFailure(error.type);
      return false;
    } finally {
      this.activeRecoveries.delete(errorKey);
    }
  }

  async executeWithTimeout(fn, timeout) {
    return new Promise(async (resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      
      try {
        const result = await fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        console.error('恢复策略执行错误:', error);
        resolve(false);
      }
    });
  }

  onRecoverySuccess(errorType, isDegraded = false) {
    // 重置恢复尝试计数
    this.recoveryAttempts.delete(errorType);
    
    // 更新系统状态
    if (isDegraded) {
      this.stateManager.setState(SystemState.DEGRADED, `${errorType} 恢复到降级模式`);
      this.stateManager.increaseDegradation(20);
    } else {
      this.stateManager.decreaseDegradation(30);
      if (this.stateManager.degradationLevel === 0) {
        this.stateManager.setState(SystemState.NORMAL, `${errorType} 完全恢复`);
      }
    }
  }

  onRecoveryFailure(errorType) {
    this.stateManager.increaseDegradation(30);
    
    if (this.stateManager.degradationLevel >= 90) {
      this.stateManager.setState(SystemState.CRITICAL, `${errorType} 恢复失败，系统进入临界状态`);
    }
  }

  // 具体恢复策略实现
  async checkNetworkConnectivity() {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async enableOfflineMode() {
    console.log('启用离线模式');
    // 实现离线模式逻辑
    return true;
  }

  async reloadModel() {
    try {
      // 重新加载当前模型
      console.log('重新加载模型');
      return true;
    } catch {
      return false;
    }
  }

  async loadFallbackModel() {
    try {
      console.log('加载备用模型');
      // 加载轻量级备用模型
      return true;
    } catch {
      return false;
    }
  }

  async reinitializeCamera() {
    try {
      console.log('重新初始化摄像头');
      // 重新初始化摄像头
      return true;
    } catch {
      return false;
    }
  }

  async enableFileInputMode() {
    console.log('启用文件输入模式');
    // 切换到文件输入模式
    return true;
  }

  async resetRenderingContext() {
    try {
      console.log('重置渲染上下文');
      // 重置WebGL上下文
      return true;
    } catch {
      return false;
    }
  }

  async enableBasicRendering() {
    console.log('启用基础渲染模式');
    // 切换到Canvas 2D渲染
    return true;
  }

  async restartAnalysisEngine() {
    try {
      console.log('重启分析引擎');
      // 重启分析引擎
      return true;
    } catch {
      return false;
    }
  }

  async enableBasicAnalysis() {
    console.log('启用基础分析模式');
    // 切换到基础分析模式
    return true;
  }

  async clearCorruptedCache() {
    try {
      console.log('清理损坏的缓存');
      // 清理缓存
      localStorage.removeItem('corrupted_cache');
      return true;
    } catch {
      return false;
    }
  }

  async disableCache() {
    console.log('禁用缓存');
    // 禁用缓存功能
    return true;
  }

  getRecoveryStats() {
    return {
      activeRecoveries: Array.from(this.activeRecoveries),
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
      availableStrategies: Array.from(this.recoveryStrategies.keys())
    };
  }
}

/**
 * 健康检查管理器
 */
class HealthCheckManager {
  constructor(stateManager, autoRecoveryManager) {
    this.stateManager = stateManager;
    this.autoRecoveryManager = autoRecoveryManager;
    this.healthChecks = new Map();
    this.checkInterval = 30000; // 30秒
    this.isRunning = false;
    this.intervalId = null;
    
    this.initializeHealthChecks();
  }

  initializeHealthChecks() {
    // 网络健康检查
    this.healthChecks.set('network', {
      check: () => this.checkNetworkHealth(),
      threshold: 3, // 连续失败3次触发恢复
      failures: 0
    });

    // 内存健康检查
    this.healthChecks.set('memory', {
      check: () => this.checkMemoryHealth(),
      threshold: 2,
      failures: 0
    });

    // 性能健康检查
    this.healthChecks.set('performance', {
      check: () => this.checkPerformanceHealth(),
      threshold: 5,
      failures: 0
    });

    // 渲染健康检查
    this.healthChecks.set('rendering', {
      check: () => this.checkRenderingHealth(),
      threshold: 3,
      failures: 0
    });
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.runHealthChecks();
    }, this.checkInterval);
    
    console.log('健康检查已启动');
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('健康检查已停止');
  }

  async runHealthChecks() {
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const isHealthy = await healthCheck.check();
        
        if (isHealthy) {
          healthCheck.failures = 0;
        } else {
          healthCheck.failures++;
          
          if (healthCheck.failures >= healthCheck.threshold) {
            console.warn(`健康检查失败: ${name} (连续 ${healthCheck.failures} 次)`);
            await this.handleHealthCheckFailure(name);
            healthCheck.failures = 0; // 重置计数
          }
        }
      } catch (error) {
        console.error(`健康检查错误 ${name}:`, error);
      }
    }
  }

  async handleHealthCheckFailure(checkName) {
    const errorTypeMap = {
      network: ErrorType.NETWORK,
      memory: ErrorType.SYSTEM,
      performance: ErrorType.SYSTEM,
      rendering: ErrorType.RENDERING
    };

    const errorType = errorTypeMap[checkName] || ErrorType.SYSTEM;
    
    // 触发自动恢复
    const mockError = {
      type: errorType,
      id: `health_check_${checkName}_${Date.now()}`
    };
    
    await this.autoRecoveryManager.executeRecovery(mockError);
  }

  async checkNetworkHealth() {
    try {
      const start = performance.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const duration = performance.now() - start;
      
      return response.ok && duration < 3000;
    } catch {
      return false;
    }
  }

  checkMemoryHealth() {
    if ('memory' in performance) {
      const memInfo = performance.memory;
      const usedRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      return usedRatio < 0.9; // 内存使用率低于90%
    }
    return true; // 无法检测时假设健康
  }

  checkPerformanceHealth() {
    // 检查帧率
    const fps = this.getCurrentFPS();
    return fps > 20; // 帧率高于20fps
  }

  checkRenderingHealth() {
    // 检查WebGL上下文是否丢失
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl && !gl.isContextLost();
    }
    return true;
  }

  getCurrentFPS() {
    // 简化的FPS检测，实际应用中需要更精确的实现
    return 30; // 占位符
  }

  getHealthStatus() {
    const status = {};
    for (const [name, healthCheck] of this.healthChecks) {
      status[name] = {
        failures: healthCheck.failures,
        threshold: healthCheck.threshold,
        isHealthy: healthCheck.failures === 0
      };
    }
    return status;
  }
}

/**
 * 错误恢复主类
 */
export class ErrorRecovery {
  constructor() {
    this.stateManager = new SystemStateManager();
    this.autoRecoveryManager = new AutoRecoveryManager(this.stateManager);
    this.healthCheckManager = new HealthCheckManager(this.stateManager, this.autoRecoveryManager);
    this.recoveryMode = RecoveryMode.AUTOMATIC;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    // 启动健康检查
    this.healthCheckManager.start();
    
    // 监听系统状态变化
    this.stateManager.addStateChangeListener((stateChange) => {
      this.onSystemStateChange(stateChange);
    });
    
    this.isInitialized = true;
    console.log('错误恢复系统已初始化');
  }

  async handleError(error) {
    console.log('错误恢复处理:', error);
    
    // 根据恢复模式决定处理方式
    switch (this.recoveryMode) {
      case RecoveryMode.AUTOMATIC:
        return await this.autoRecoveryManager.executeRecovery(error);
      
      case RecoveryMode.MANUAL:
        return this.requestManualRecovery(error);
      
      case RecoveryMode.HYBRID:
        // 先尝试自动恢复，失败后请求手动干预
        const autoResult = await this.autoRecoveryManager.executeRecovery(error);
        if (!autoResult) {
          return this.requestManualRecovery(error);
        }
        return autoResult;
      
      default:
        return false;
    }
  }

  requestManualRecovery(error) {
    // 发送手动恢复请求事件
    const event = new CustomEvent('manualRecoveryRequired', {
      detail: { error, systemState: this.stateManager.getState() }
    });
    window.dispatchEvent(event);
    return false;
  }

  onSystemStateChange(stateChange) {
    console.log('系统状态变化:', stateChange);
    
    // 根据状态变化调整策略
    if (stateChange.to === SystemState.CRITICAL) {
      this.handleCriticalState();
    } else if (stateChange.to === SystemState.NORMAL && stateChange.from !== SystemState.NORMAL) {
      this.handleRecoveryComplete();
    }
  }

  handleCriticalState() {
    console.warn('系统进入临界状态，启用紧急恢复模式');
    
    // 发送临界状态事件
    const event = new CustomEvent('systemCritical', {
      detail: { 
        state: this.stateManager.getState(),
        degradationLevel: this.stateManager.degradationLevel
      }
    });
    window.dispatchEvent(event);
  }

  handleRecoveryComplete() {
    console.log('系统恢复完成');
    
    // 发送恢复完成事件
    const event = new CustomEvent('recoveryComplete', {
      detail: { state: this.stateManager.getState() }
    });
    window.dispatchEvent(event);
  }

  setRecoveryMode(mode) {
    this.recoveryMode = mode;
    console.log('恢复模式设置为:', mode);
  }

  getSystemStatus() {
    return {
      state: this.stateManager.getStateStats(),
      recovery: this.autoRecoveryManager.getRecoveryStats(),
      health: this.healthCheckManager.getHealthStatus(),
      mode: this.recoveryMode
    };
  }

  forceRecovery(errorType) {
    const mockError = {
      type: errorType,
      id: `forced_recovery_${Date.now()}`
    };
    return this.autoRecoveryManager.executeRecovery(mockError);
  }

  resetSystem() {
    this.stateManager.setState(SystemState.NORMAL, '手动重置');
    this.stateManager.degradationLevel = 0;
    this.autoRecoveryManager.recoveryAttempts.clear();
    console.log('系统已重置');
  }

  destroy() {
    this.healthCheckManager.stop();
    this.isInitialized = false;
    console.log('错误恢复系统已销毁');
  }
}

// 创建全局实例
export const errorRecovery = new ErrorRecovery();

// 默认导出
export default ErrorRecovery;