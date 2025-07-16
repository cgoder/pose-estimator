/**
 * 全局错误处理器
 * 统一管理应用程序中的所有错误，提供错误恢复、降级策略和用户友好的错误提示
 */

// 错误类型枚举
export const ErrorType = {
  SYSTEM: 'system',
  NETWORK: 'network', 
  MODEL: 'model',
  CAMERA: 'camera',
  RENDERING: 'rendering',
  ANALYSIS: 'analysis',
  CACHE: 'cache',
  USER: 'user',
  UNKNOWN: 'unknown'
};

// 错误严重级别
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// 错误恢复策略
export const RecoveryStrategy = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  DEGRADE: 'degrade',
  RESTART: 'restart',
  IGNORE: 'ignore',
  USER_ACTION: 'user_action'
};

/**
 * 应用程序错误类
 */
export class AppError extends Error {
  constructor(message, type = ErrorType.UNKNOWN, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = this.generateErrorId();
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * 错误恢复策略配置
 */
class ErrorRecoveryConfig {
  constructor() {
    this.strategies = new Map([
      // 网络错误恢复策略
      [ErrorType.NETWORK, {
        strategy: RecoveryStrategy.RETRY,
        maxRetries: 3,
        retryDelay: 1000,
        fallbackAction: () => this.showOfflineMode()
      }],
      
      // 模型加载错误恢复策略
      [ErrorType.MODEL, {
        strategy: RecoveryStrategy.FALLBACK,
        fallbackModels: ['movenet-lightning', 'posenet'],
        fallbackAction: (error) => this.loadFallbackModel(error)
      }],
      
      // 摄像头错误恢复策略
      [ErrorType.CAMERA, {
        strategy: RecoveryStrategy.DEGRADE,
        fallbackAction: () => this.enableFileUploadMode()
      }],
      
      // 渲染错误恢复策略
      [ErrorType.RENDERING, {
        strategy: RecoveryStrategy.DEGRADE,
        fallbackAction: () => this.enableBasicRendering()
      }],
      
      // 分析错误恢复策略
      [ErrorType.ANALYSIS, {
        strategy: RecoveryStrategy.RETRY,
        maxRetries: 2,
        fallbackAction: () => this.enableBasicAnalysis()
      }],
      
      // 缓存错误恢复策略
      [ErrorType.CACHE, {
        strategy: RecoveryStrategy.IGNORE,
        fallbackAction: () => this.clearCorruptedCache()
      }]
    ]);
  }

  getStrategy(errorType) {
    return this.strategies.get(errorType) || {
      strategy: RecoveryStrategy.USER_ACTION,
      fallbackAction: () => this.showGenericError()
    };
  }

  // 恢复策略实现方法
  showOfflineMode() {
    console.log('切换到离线模式');
  }

  loadFallbackModel(error) {
    console.log('加载备用模型:', error.context?.failedModel);
  }

  enableFileUploadMode() {
    console.log('启用文件上传模式');
  }

  enableBasicRendering() {
    console.log('启用基础渲染模式');
  }

  enableBasicAnalysis() {
    console.log('启用基础分析模式');
  }

  clearCorruptedCache() {
    console.log('清理损坏的缓存');
  }

  showGenericError() {
    console.log('显示通用错误信息');
  }
}

/**
 * 错误报告器
 */
class ErrorReporter {
  constructor() {
    this.reportingEnabled = true;
    this.reportingEndpoint = '/api/errors';
    this.maxReportsPerSession = 50;
    this.reportCount = 0;
  }

  async reportError(error) {
    if (!this.reportingEnabled || this.reportCount >= this.maxReportsPerSession) {
      return;
    }

    try {
      const report = {
        error: error.toJSON(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        timestamp: new Date().toISOString()
      };

      // 发送错误报告（实际项目中应该发送到服务器）
      console.log('错误报告:', report);
      this.reportCount++;
      
      // 存储到本地以便离线时使用
      this.storeErrorLocally(report);
    } catch (reportError) {
      console.error('错误报告发送失败:', reportError);
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  storeErrorLocally(report) {
    try {
      const errors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      errors.push(report);
      
      // 只保留最近的100个错误报告
      if (errors.length > 100) {
        errors.splice(0, errors.length - 100);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(errors));
    } catch (e) {
      console.error('本地错误存储失败:', e);
    }
  }
}

/**
 * 用户通知管理器
 */
class UserNotificationManager {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
    this.notificationContainer = null;
    this.init();
  }

  init() {
    // 创建通知容器
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'error-notifications';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(this.notificationContainer);
  }

  showNotification(error, recoveryAction = null) {
    const notification = this.createNotification(error, recoveryAction);
    this.notifications.push(notification);
    
    // 限制通知数量
    if (this.notifications.length > this.maxNotifications) {
      const oldNotification = this.notifications.shift();
      oldNotification.remove();
    }
    
    this.notificationContainer.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
      this.removeNotification(notification);
    }, this.getNotificationDuration(error.severity));
  }

  createNotification(error, recoveryAction) {
    const notification = document.createElement('div');
    notification.className = `error-notification severity-${error.severity}`;
    notification.style.cssText = `
      background: ${this.getNotificationColor(error.severity)};
      color: white;
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `;

    const message = this.getLocalizedMessage(error);
    const actionButton = recoveryAction ? 
      `<button onclick="${recoveryAction}" style="margin-left: 10px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: none; border-radius: 3px; color: white; cursor: pointer;">重试</button>` : '';
    
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${message}</span>
        <div>
          ${actionButton}
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="margin-left: 8px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: none; border-radius: 3px; color: white; cursor: pointer;">×</button>
        </div>
      </div>
    `;

    return notification;
  }

  getNotificationColor(severity) {
    const colors = {
      [ErrorSeverity.LOW]: '#4CAF50',
      [ErrorSeverity.MEDIUM]: '#FF9800', 
      [ErrorSeverity.HIGH]: '#F44336',
      [ErrorSeverity.CRITICAL]: '#9C27B0'
    };
    return colors[severity] || '#757575';
  }

  getNotificationDuration(severity) {
    const durations = {
      [ErrorSeverity.LOW]: 3000,
      [ErrorSeverity.MEDIUM]: 5000,
      [ErrorSeverity.HIGH]: 8000,
      [ErrorSeverity.CRITICAL]: 0 // 不自动消失
    };
    return durations[severity] || 5000;
  }

  getLocalizedMessage(error) {
    const messages = {
      [ErrorType.NETWORK]: '网络连接出现问题，请检查网络设置',
      [ErrorType.MODEL]: '模型加载失败，正在尝试备用方案',
      [ErrorType.CAMERA]: '摄像头访问失败，请检查权限设置',
      [ErrorType.RENDERING]: '渲染出现问题，已切换到兼容模式',
      [ErrorType.ANALYSIS]: '分析功能暂时不可用，正在恢复中',
      [ErrorType.CACHE]: '缓存数据异常，已自动清理',
      [ErrorType.USER]: '操作无效，请重试',
      [ErrorType.SYSTEM]: '系统出现异常，请刷新页面'
    };
    return messages[error.type] || error.message || '发生未知错误';
  }

  removeNotification(notification) {
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
      notification.remove();
    }
  }
}

/**
 * 全局错误处理器主类
 */
export class GlobalErrorHandler {
  constructor() {
    this.recoveryConfig = new ErrorRecoveryConfig();
    this.reporter = new ErrorReporter();
    this.notificationManager = new UserNotificationManager();
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    // 监听全局错误
    window.addEventListener('error', (event) => {
      this.handleError(new AppError(
        event.message,
        ErrorType.SYSTEM,
        ErrorSeverity.HIGH,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      ));
    });

    // 监听Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new AppError(
        event.reason?.message || 'Promise rejection',
        ErrorType.SYSTEM,
        ErrorSeverity.MEDIUM,
        { reason: event.reason }
      ));
    });

    // 添加CSS动画
    this.addNotificationStyles();
    
    this.isInitialized = true;
    console.log('全局错误处理器已初始化');
  }

  addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 处理错误的主要方法
   */
  async handleError(error, context = {}) {
    try {
      // 确保错误是AppError实例
      if (!(error instanceof AppError)) {
        error = new AppError(
          error.message || 'Unknown error',
          ErrorType.UNKNOWN,
          ErrorSeverity.MEDIUM,
          { originalError: error, ...context }
        );
      }

      // 记录错误历史
      this.addToHistory(error);
      
      // 获取恢复策略
      const recoveryStrategy = this.recoveryConfig.getStrategy(error.type);
      
      // 执行恢复策略
      const recovered = await this.executeRecoveryStrategy(error, recoveryStrategy);
      
      // 报告错误
      await this.reporter.reportError(error);
      
      // 显示用户通知
      this.showUserNotification(error, recovered);
      
      // 触发错误事件
      this.dispatchErrorEvent(error, recovered);
      
      return recovered;
    } catch (handlerError) {
      console.error('错误处理器本身出现错误:', handlerError);
      this.showCriticalError();
    }
  }

  async executeRecoveryStrategy(error, strategy) {
    try {
      switch (strategy.strategy) {
        case RecoveryStrategy.RETRY:
          return await this.executeRetryStrategy(error, strategy);
        
        case RecoveryStrategy.FALLBACK:
        case RecoveryStrategy.DEGRADE:
          return await this.executeFallbackStrategy(error, strategy);
        
        case RecoveryStrategy.RESTART:
          return this.executeRestartStrategy(error, strategy);
        
        case RecoveryStrategy.IGNORE:
          return this.executeIgnoreStrategy(error, strategy);
        
        case RecoveryStrategy.USER_ACTION:
        default:
          return this.executeUserActionStrategy(error, strategy);
      }
    } catch (recoveryError) {
      console.error('恢复策略执行失败:', recoveryError);
      return false;
    }
  }

  async executeRetryStrategy(error, strategy) {
    const maxRetries = strategy.maxRetries || 3;
    const retryDelay = strategy.retryDelay || 1000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        
        if (strategy.retryAction) {
          await strategy.retryAction(error);
          return true;
        }
      } catch (retryError) {
        console.log(`重试 ${i + 1}/${maxRetries} 失败:`, retryError);
      }
    }
    
    // 重试失败，执行备用操作
    if (strategy.fallbackAction) {
      await strategy.fallbackAction(error);
    }
    
    return false;
  }

  async executeFallbackStrategy(error, strategy) {
    try {
      if (strategy.fallbackAction) {
        await strategy.fallbackAction(error);
        return true;
      }
    } catch (fallbackError) {
      console.error('备用策略执行失败:', fallbackError);
    }
    return false;
  }

  executeRestartStrategy(error, strategy) {
    if (confirm('系统需要重启以恢复正常，是否继续？')) {
      window.location.reload();
      return true;
    }
    return false;
  }

  executeIgnoreStrategy(error, strategy) {
    if (strategy.fallbackAction) {
      strategy.fallbackAction(error);
    }
    return true;
  }

  executeUserActionStrategy(error, strategy) {
    if (strategy.fallbackAction) {
      strategy.fallbackAction(error);
    }
    return false;
  }

  showUserNotification(error, recovered) {
    // 只显示中等及以上严重级别的错误
    if (error.severity === ErrorSeverity.LOW) {
      return;
    }
    
    const recoveryAction = recovered ? null : 'window.location.reload()';
    this.notificationManager.showNotification(error, recoveryAction);
  }

  showCriticalError() {
    const criticalError = new AppError(
      '系统出现严重错误，请刷新页面',
      ErrorType.SYSTEM,
      ErrorSeverity.CRITICAL
    );
    this.notificationManager.showNotification(criticalError, 'window.location.reload()');
  }

  addToHistory(error) {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  dispatchErrorEvent(error, recovered) {
    const event = new CustomEvent('appError', {
      detail: { error, recovered }
    });
    window.dispatchEvent(event);
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      bySeverity: {},
      recent: this.errorHistory.slice(-10)
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清理错误历史
   */
  clearHistory() {
    this.errorHistory = [];
  }

  /**
   * 销毁错误处理器
   */
  destroy() {
    if (this.notificationManager?.notificationContainer) {
      this.notificationManager.notificationContainer.remove();
    }
    this.isInitialized = false;
  }
}

// 创建全局实例
export const globalErrorHandler = new GlobalErrorHandler();

// 便捷方法
export const handleError = (error, context) => globalErrorHandler.handleError(error, context);
export const createError = (message, type, severity, context) => new AppError(message, type, severity, context);

// 默认导出
export default GlobalErrorHandler;