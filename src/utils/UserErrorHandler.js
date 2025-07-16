/**
 * 用户错误处理器
 * 专门处理用户友好的错误提示、解决方案建议和用户交互
 */

import { ErrorType, ErrorSeverity } from './GlobalErrorHandler.js';
import { SystemState } from './ErrorRecovery.js';

// 用户操作类型
export const UserActionType = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  SETTINGS: 'settings',
  HELP: 'help',
  REPORT: 'report',
  IGNORE: 'ignore',
  CONTACT: 'contact'
};

// 错误展示模式
export const ErrorDisplayMode = {
  TOAST: 'toast',
  MODAL: 'modal',
  INLINE: 'inline',
  BANNER: 'banner',
  SIDEBAR: 'sidebar'
};

/**
 * 错误消息本地化管理器
 */
class ErrorMessageLocalizer {
  constructor() {
    this.currentLanguage = 'zh-CN';
    this.messages = this.initializeMessages();
    this.fallbackLanguage = 'en-US';
  }

  initializeMessages() {
    return {
      'zh-CN': {
        [ErrorType.NETWORK]: {
          title: '网络连接问题',
          message: '无法连接到服务器，请检查您的网络连接',
          solutions: [
            '检查网络连接是否正常',
            '尝试刷新页面',
            '检查防火墙设置',
            '联系网络管理员'
          ],
          actions: [
            { type: UserActionType.RETRY, label: '重试连接' },
            { type: UserActionType.REFRESH, label: '刷新页面' },
            { type: UserActionType.SETTINGS, label: '网络设置' }
          ]
        },
        [ErrorType.MODEL]: {
          title: 'AI模型加载失败',
          message: '人工智能模型无法正常加载，这可能影响分析功能',
          solutions: [
            '等待模型重新加载',
            '尝试使用备用模型',
            '检查浏览器兼容性',
            '清理浏览器缓存'
          ],
          actions: [
            { type: UserActionType.RETRY, label: '重新加载' },
            { type: UserActionType.SETTINGS, label: '模型设置' },
            { type: UserActionType.HELP, label: '获取帮助' }
          ]
        },
        [ErrorType.CAMERA]: {
          title: '摄像头访问失败',
          message: '无法访问您的摄像头，请检查权限设置',
          solutions: [
            '点击地址栏的摄像头图标，允许访问',
            '检查摄像头是否被其他应用占用',
            '尝试使用不同的浏览器',
            '重启浏览器或设备'
          ],
          actions: [
            { type: UserActionType.RETRY, label: '重新尝试' },
            { type: UserActionType.SETTINGS, label: '权限设置' },
            { type: UserActionType.HELP, label: '设置帮助' }
          ]
        },
        [ErrorType.RENDERING]: {
          title: '图像渲染问题',
          message: '图像显示出现问题，已切换到兼容模式',
          solutions: [
            '更新浏览器到最新版本',
            '启用硬件加速',
            '关闭其他占用GPU的应用',
            '降低显示质量设置'
          ],
          actions: [
            { type: UserActionType.RETRY, label: '重新渲染' },
            { type: UserActionType.SETTINGS, label: '显示设置' },
            { type: UserActionType.REFRESH, label: '刷新页面' }
          ]
        },
        [ErrorType.ANALYSIS]: {
          title: '分析功能异常',
          message: '运动分析功能暂时不可用，正在尝试恢复',
          solutions: [
            '等待系统自动恢复',
            '尝试重新开始分析',
            '检查输入视频质量',
            '降低分析精度设置'
          ],
          actions: [
            { type: UserActionType.RETRY, label: '重新分析' },
            { type: UserActionType.SETTINGS, label: '分析设置' },
            { type: UserActionType.HELP, label: '使用帮助' }
          ]
        },
        [ErrorType.CACHE]: {
          title: '缓存数据异常',
          message: '应用缓存出现问题，已自动清理',
          solutions: [
            '重新加载应用',
            '清理浏览器缓存',
            '检查存储空间',
            '重启浏览器'
          ],
          actions: [
            { type: UserActionType.REFRESH, label: '重新加载' },
            { type: UserActionType.SETTINGS, label: '存储设置' }
          ]
        },
        [ErrorType.USER]: {
          title: '操作无效',
          message: '您的操作无法完成，请检查输入或重试',
          solutions: [
            '检查输入是否正确',
            '确认操作步骤',
            '查看使用说明',
            '联系技术支持'
          ],
          actions: [
            { type: UserActionType.RETRY, label: '重试操作' },
            { type: UserActionType.HELP, label: '查看帮助' }
          ]
        },
        [ErrorType.SYSTEM]: {
          title: '系统错误',
          message: '系统出现异常，请尝试刷新页面或联系支持',
          solutions: [
            '刷新页面重试',
            '清理浏览器缓存',
            '尝试使用其他浏览器',
            '联系技术支持'
          ],
          actions: [
            { type: UserActionType.REFRESH, label: '刷新页面' },
            { type: UserActionType.REPORT, label: '报告问题' },
            { type: UserActionType.CONTACT, label: '联系支持' }
          ]
        },
        [ErrorType.UNKNOWN]: {
          title: '未知错误',
          message: '发生了未知错误，我们正在调查此问题',
          solutions: [
            '刷新页面重试',
            '检查浏览器控制台',
            '尝试使用其他浏览器',
            '报告此问题'
          ],
          actions: [
            { type: UserActionType.REFRESH, label: '刷新页面' },
            { type: UserActionType.REPORT, label: '报告问题' }
          ]
        }
      },
      'en-US': {
        [ErrorType.NETWORK]: {
          title: 'Network Connection Issue',
          message: 'Unable to connect to server, please check your network connection',
          solutions: [
            'Check if network connection is working',
            'Try refreshing the page',
            'Check firewall settings',
            'Contact network administrator'
          ],
          actions: [
            { type: UserActionType.RETRY, label: 'Retry Connection' },
            { type: UserActionType.REFRESH, label: 'Refresh Page' },
            { type: UserActionType.SETTINGS, label: 'Network Settings' }
          ]
        },
        // 其他英文消息...
      }
    };
  }

  getMessage(errorType, severity = ErrorSeverity.MEDIUM) {
    const languageMessages = this.messages[this.currentLanguage] || this.messages[this.fallbackLanguage];
    const errorMessage = languageMessages[errorType] || languageMessages[ErrorType.UNKNOWN];
    
    return {
      ...errorMessage,
      severity,
      timestamp: new Date().toISOString()
    };
  }

  setLanguage(language) {
    if (this.messages[language]) {
      this.currentLanguage = language;
    }
  }

  addCustomMessage(errorType, language, message) {
    if (!this.messages[language]) {
      this.messages[language] = {};
    }
    this.messages[language][errorType] = message;
  }
}

/**
 * 错误UI组件管理器
 */
class ErrorUIManager {
  constructor() {
    this.activeErrors = new Map();
    this.displayMode = ErrorDisplayMode.TOAST;
    this.maxActiveErrors = 3;
    this.autoHideDelay = {
      [ErrorSeverity.LOW]: 3000,
      [ErrorSeverity.MEDIUM]: 5000,
      [ErrorSeverity.HIGH]: 8000,
      [ErrorSeverity.CRITICAL]: 0 // 不自动隐藏
    };
    
    this.initializeStyles();
  }

  initializeStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .error-container {
        position: fixed;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .error-toast-container {
        top: 20px;
        right: 20px;
        max-width: 400px;
      }
      
      .error-banner-container {
        top: 0;
        left: 0;
        right: 0;
        max-width: none;
      }
      
      .error-modal-container {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 500px;
        width: 90%;
      }
      
      .error-item {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 12px;
        overflow: hidden;
        animation: errorSlideIn 0.3s ease-out;
      }
      
      .error-item.modal {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        margin-bottom: 0;
      }
      
      .error-item.banner {
        border-radius: 0;
        margin-bottom: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .error-header {
        padding: 16px;
        border-left: 4px solid;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .error-header.low { border-left-color: #4CAF50; background: #E8F5E8; }
      .error-header.medium { border-left-color: #FF9800; background: #FFF3E0; }
      .error-header.high { border-left-color: #F44336; background: #FFEBEE; }
      .error-header.critical { border-left-color: #9C27B0; background: #F3E5F5; }
      
      .error-icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        flex-shrink: 0;
      }
      
      .error-content {
        flex: 1;
      }
      
      .error-title {
        font-weight: 600;
        font-size: 16px;
        margin: 0 0 4px 0;
        color: #333;
      }
      
      .error-message {
        font-size: 14px;
        color: #666;
        margin: 0;
        line-height: 1.4;
      }
      
      .error-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
        padding: 4px;
        margin-left: 12px;
      }
      
      .error-close:hover {
        color: #666;
      }
      
      .error-body {
        padding: 0 16px 16px 16px;
      }
      
      .error-solutions {
        margin: 12px 0;
      }
      
      .error-solutions-title {
        font-weight: 600;
        font-size: 14px;
        color: #333;
        margin: 0 0 8px 0;
      }
      
      .error-solutions-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .error-solutions-list li {
        font-size: 13px;
        color: #666;
        margin: 4px 0;
        padding-left: 16px;
        position: relative;
      }
      
      .error-solutions-list li:before {
        content: '•';
        position: absolute;
        left: 0;
        color: #999;
      }
      
      .error-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      
      .error-action-btn {
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .error-action-btn:hover {
        background: #f5f5f5;
        border-color: #bbb;
      }
      
      .error-action-btn.primary {
        background: #2196F3;
        color: white;
        border-color: #2196F3;
      }
      
      .error-action-btn.primary:hover {
        background: #1976D2;
        border-color: #1976D2;
      }
      
      .error-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes errorSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  showError(errorData, actions = []) {
    // 限制同时显示的错误数量
    if (this.activeErrors.size >= this.maxActiveErrors) {
      const oldestError = this.activeErrors.keys().next().value;
      this.hideError(oldestError);
    }

    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorElement = this.createErrorElement(errorId, errorData, actions);
    
    this.activeErrors.set(errorId, {
      element: errorElement,
      data: errorData,
      timestamp: Date.now()
    });

    this.appendErrorToContainer(errorElement);
    
    // 自动隐藏
    const hideDelay = this.autoHideDelay[errorData.severity];
    if (hideDelay > 0) {
      setTimeout(() => {
        this.hideError(errorId);
      }, hideDelay);
    }

    return errorId;
  }

  createErrorElement(errorId, errorData, actions) {
    const errorElement = document.createElement('div');
    errorElement.className = `error-item ${this.displayMode}`;
    errorElement.dataset.errorId = errorId;

    const icon = this.getErrorIcon(errorData.severity);
    const actionsHtml = this.createActionsHtml(errorId, actions);
    const solutionsHtml = this.createSolutionsHtml(errorData.solutions);

    errorElement.innerHTML = `
      <div class="error-header ${errorData.severity}">
        <div class="error-icon">${icon}</div>
        <div class="error-content">
          <h4 class="error-title">${errorData.title}</h4>
          <p class="error-message">${errorData.message}</p>
        </div>
        <button class="error-close" onclick="userErrorHandler.hideError('${errorId}')">&times;</button>
      </div>
      ${errorData.solutions ? `<div class="error-body">${solutionsHtml}${actionsHtml}</div>` : ''}
    `;

    return errorElement;
  }

  getErrorIcon(severity) {
    const icons = {
      [ErrorSeverity.LOW]: '✓',
      [ErrorSeverity.MEDIUM]: '⚠',
      [ErrorSeverity.HIGH]: '⚠',
      [ErrorSeverity.CRITICAL]: '✕'
    };
    return icons[severity] || '!';
  }

  createSolutionsHtml(solutions) {
    if (!solutions || solutions.length === 0) return '';
    
    const solutionItems = solutions.map(solution => `<li>${solution}</li>`).join('');
    return `
      <div class="error-solutions">
        <h5 class="error-solutions-title">解决方案：</h5>
        <ul class="error-solutions-list">${solutionItems}</ul>
      </div>
    `;
  }

  createActionsHtml(errorId, actions) {
    if (!actions || actions.length === 0) return '';
    
    const actionButtons = actions.map((action, index) => {
      const isPrimary = index === 0 ? 'primary' : '';
      return `<button class="error-action-btn ${isPrimary}" onclick="userErrorHandler.executeAction('${errorId}', '${action.type}')">${action.label}</button>`;
    }).join('');
    
    return `<div class="error-actions">${actionButtons}</div>`;
  }

  appendErrorToContainer(errorElement) {
    let container = this.getOrCreateContainer();
    
    if (this.displayMode === ErrorDisplayMode.MODAL) {
      this.createModalBackdrop();
    }
    
    container.appendChild(errorElement);
  }

  getOrCreateContainer() {
    let container = document.getElementById(`error-${this.displayMode}-container`);
    
    if (!container) {
      container = document.createElement('div');
      container.id = `error-${this.displayMode}-container`;
      container.className = `error-container error-${this.displayMode}-container`;
      document.body.appendChild(container);
    }
    
    return container;
  }

  createModalBackdrop() {
    if (document.getElementById('error-modal-backdrop')) return;
    
    const backdrop = document.createElement('div');
    backdrop.id = 'error-modal-backdrop';
    backdrop.className = 'error-modal-backdrop';
    backdrop.onclick = () => this.hideAllErrors();
    document.body.appendChild(backdrop);
  }

  hideError(errorId) {
    const errorInfo = this.activeErrors.get(errorId);
    if (!errorInfo) return;
    
    errorInfo.element.style.animation = 'errorSlideIn 0.3s ease-out reverse';
    
    setTimeout(() => {
      errorInfo.element.remove();
      this.activeErrors.delete(errorId);
      
      // 如果是最后一个模态错误，移除背景
      if (this.displayMode === ErrorDisplayMode.MODAL && this.activeErrors.size === 0) {
        const backdrop = document.getElementById('error-modal-backdrop');
        if (backdrop) backdrop.remove();
      }
    }, 300);
  }

  hideAllErrors() {
    for (const errorId of this.activeErrors.keys()) {
      this.hideError(errorId);
    }
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
  }

  getActiveErrors() {
    return Array.from(this.activeErrors.entries()).map(([id, info]) => ({
      id,
      data: info.data,
      timestamp: info.timestamp
    }));
  }
}

/**
 * 用户操作处理器
 */
class UserActionHandler {
  constructor() {
    this.actionHandlers = new Map();
    this.initializeDefaultHandlers();
  }

  initializeDefaultHandlers() {
    this.actionHandlers.set(UserActionType.RETRY, (errorId, context) => {
      console.log('用户选择重试:', errorId);
      window.location.reload();
    });

    this.actionHandlers.set(UserActionType.REFRESH, (errorId, context) => {
      console.log('用户选择刷新:', errorId);
      window.location.reload();
    });

    this.actionHandlers.set(UserActionType.SETTINGS, (errorId, context) => {
      console.log('用户选择设置:', errorId);
      this.openSettings(context);
    });

    this.actionHandlers.set(UserActionType.HELP, (errorId, context) => {
      console.log('用户选择帮助:', errorId);
      this.openHelp(context);
    });

    this.actionHandlers.set(UserActionType.REPORT, (errorId, context) => {
      console.log('用户选择报告:', errorId);
      this.openReportDialog(context);
    });

    this.actionHandlers.set(UserActionType.CONTACT, (errorId, context) => {
      console.log('用户选择联系:', errorId);
      this.openContactDialog(context);
    });

    this.actionHandlers.set(UserActionType.IGNORE, (errorId, context) => {
      console.log('用户选择忽略:', errorId);
      // 仅隐藏错误，不执行其他操作
    });
  }

  executeAction(errorId, actionType, context = {}) {
    const handler = this.actionHandlers.get(actionType);
    if (handler) {
      try {
        handler(errorId, context);
      } catch (error) {
        console.error('用户操作执行失败:', error);
      }
    } else {
      console.warn('未知的用户操作类型:', actionType);
    }
  }

  registerActionHandler(actionType, handler) {
    this.actionHandlers.set(actionType, handler);
  }

  openSettings(context) {
    // 打开设置页面或模态框
    console.log('打开设置页面');
  }

  openHelp(context) {
    // 打开帮助页面或文档
    window.open('/help', '_blank');
  }

  openReportDialog(context) {
    // 打开错误报告对话框
    const reportData = {
      error: context.error,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    console.log('错误报告数据:', reportData);
    // 实际应用中应该发送到服务器
  }

  openContactDialog(context) {
    // 打开联系支持对话框
    console.log('打开联系支持对话框');
  }
}

/**
 * 用户错误处理主类
 */
export class UserErrorHandler {
  constructor() {
    this.localizer = new ErrorMessageLocalizer();
    this.uiManager = new ErrorUIManager();
    this.actionHandler = new UserActionHandler();
    this.isInitialized = false;
    
    // 绑定到全局对象以便HTML中调用
    window.userErrorHandler = this;
  }

  init() {
    if (this.isInitialized) return;
    
    // 监听应用错误事件
    window.addEventListener('appError', (event) => {
      this.handleAppError(event.detail.error, event.detail.recovered);
    });

    // 监听系统状态变化
    window.addEventListener('systemCritical', (event) => {
      this.handleCriticalState(event.detail);
    });

    // 监听恢复完成事件
    window.addEventListener('recoveryComplete', (event) => {
      this.handleRecoveryComplete(event.detail);
    });

    this.isInitialized = true;
    console.log('用户错误处理器已初始化');
  }

  handleAppError(error, recovered = false) {
    // 获取本地化错误消息
    const errorMessage = this.localizer.getMessage(error.type, error.severity);
    
    // 如果已恢复且是低严重性错误，可能不需要显示
    if (recovered && error.severity === ErrorSeverity.LOW) {
      return;
    }

    // 显示错误UI
    const errorId = this.uiManager.showError(errorMessage, errorMessage.actions);
    
    // 记录用户错误处理统计
    this.recordErrorDisplay(error, errorId);
  }

  handleCriticalState(stateInfo) {
    // 显示临界状态警告
    const criticalMessage = {
      title: '系统临界状态',
      message: '系统出现严重问题，建议立即刷新页面或联系技术支持',
      severity: ErrorSeverity.CRITICAL,
      solutions: [
        '立即刷新页面',
        '清理浏览器缓存',
        '联系技术支持',
        '报告此问题'
      ],
      actions: [
        { type: UserActionType.REFRESH, label: '立即刷新' },
        { type: UserActionType.REPORT, label: '报告问题' },
        { type: UserActionType.CONTACT, label: '联系支持' }
      ]
    };

    // 强制使用模态框显示
    const originalMode = this.uiManager.displayMode;
    this.uiManager.setDisplayMode(ErrorDisplayMode.MODAL);
    this.uiManager.showError(criticalMessage, criticalMessage.actions);
    this.uiManager.setDisplayMode(originalMode);
  }

  handleRecoveryComplete(stateInfo) {
    // 显示恢复成功消息
    const recoveryMessage = {
      title: '系统已恢复',
      message: '系统已成功恢复正常运行',
      severity: ErrorSeverity.LOW,
      solutions: [],
      actions: []
    };

    this.uiManager.showError(recoveryMessage);
  }

  showCustomError(title, message, severity = ErrorSeverity.MEDIUM, solutions = [], actions = []) {
    const customError = {
      title,
      message,
      severity,
      solutions,
      actions
    };

    return this.uiManager.showError(customError, actions);
  }

  hideError(errorId) {
    this.uiManager.hideError(errorId);
  }

  executeAction(errorId, actionType) {
    this.actionHandler.executeAction(errorId, actionType);
    // 执行操作后隐藏错误
    this.hideError(errorId);
  }

  setDisplayMode(mode) {
    this.uiManager.setDisplayMode(mode);
  }

  setLanguage(language) {
    this.localizer.setLanguage(language);
  }

  registerActionHandler(actionType, handler) {
    this.actionHandler.registerActionHandler(actionType, handler);
  }

  recordErrorDisplay(error, errorId) {
    // 记录错误显示统计，用于分析用户体验
    const record = {
      errorId,
      errorType: error.type,
      severity: error.severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // 存储到本地统计
    try {
      const stats = JSON.parse(localStorage.getItem('errorDisplayStats') || '[]');
      stats.push(record);
      
      // 只保留最近100条记录
      if (stats.length > 100) {
        stats.splice(0, stats.length - 100);
      }
      
      localStorage.setItem('errorDisplayStats', JSON.stringify(stats));
    } catch (e) {
      console.error('错误统计记录失败:', e);
    }
  }

  getErrorStats() {
    return {
      activeErrors: this.uiManager.getActiveErrors(),
      displayStats: JSON.parse(localStorage.getItem('errorDisplayStats') || '[]')
    };
  }

  clearErrorHistory() {
    localStorage.removeItem('errorDisplayStats');
    this.uiManager.hideAllErrors();
  }

  destroy() {
    this.uiManager.hideAllErrors();
    delete window.userErrorHandler;
    this.isInitialized = false;
    console.log('用户错误处理器已销毁');
  }
}

// 创建全局实例
export const userErrorHandler = new UserErrorHandler();

// 默认导出
export default UserErrorHandler;