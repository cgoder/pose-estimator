/**
 * 用户错误处理器单元测试
 * 测试用户友好的错误提示、解决方案建议和用户交互功能
 */

import { jest } from '@jest/globals';
import {
  UserActionType,
  ErrorDisplayMode,
  ErrorMessageLocalizer,
  ErrorUIManager,
  UserActionHandler,
  UserErrorHandler
} from '../../src/utils/UserErrorHandler.js';

// Mock DOM elements
const mockElement = {
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  style: {},
  innerHTML: '',
  textContent: '',
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  remove: jest.fn()
};

global.document = {
  createElement: jest.fn(() => mockElement),
  getElementById: jest.fn(() => mockElement),
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [mockElement]),
  body: mockElement
};

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

// Mock window methods
global.window = {
  ...global.window,
  location: {
    reload: jest.fn(),
    href: 'http://localhost:3000'
  },
  open: jest.fn()
};

describe('ErrorMessageLocalizer', () => {
  let localizer;

  beforeEach(() => {
    localizer = new ErrorMessageLocalizer();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该以默认语言初始化', () => {
      expect(localizer.getCurrentLanguage()).toBe('zh-CN');
    });

    test('应该正确设置语言', () => {
      localizer.setLanguage('en-US');
      expect(localizer.getCurrentLanguage()).toBe('en-US');
    });
  });

  describe('消息本地化', () => {
    test('应该返回本地化的错误消息', () => {
      const message = localizer.getMessage('NETWORK_ERROR');
      expect(message).toBe('网络连接失败，请检查您的网络设置');
    });

    test('应该返回英文错误消息', () => {
      localizer.setLanguage('en-US');
      const message = localizer.getMessage('NETWORK_ERROR');
      expect(message).toBe('Network connection failed. Please check your network settings.');
    });

    test('应该返回带参数的消息', () => {
      const message = localizer.getMessage('VALIDATION_ERROR', { field: '用户名' });
      expect(message).toContain('用户名');
    });

    test('应该在消息不存在时返回默认消息', () => {
      const message = localizer.getMessage('UNKNOWN_ERROR');
      expect(message).toBe('发生了未知错误，请稍后重试');
    });
  });

  describe('解决方案建议', () => {
    test('应该返回本地化的解决方案', () => {
      const solutions = localizer.getSolutions('NETWORK_ERROR');
      expect(solutions).toBeInstanceOf(Array);
      expect(solutions.length).toBeGreaterThan(0);
      expect(solutions[0]).toContain('检查网络连接');
    });

    test('应该返回英文解决方案', () => {
      localizer.setLanguage('en-US');
      const solutions = localizer.getSolutions('NETWORK_ERROR');
      expect(solutions[0]).toContain('Check your internet connection');
    });

    test('应该在解决方案不存在时返回通用建议', () => {
      const solutions = localizer.getSolutions('UNKNOWN_ERROR');
      expect(solutions).toContain('请刷新页面重试');
    });
  });

  describe('自定义消息', () => {
    test('应该正确添加自定义消息', () => {
      localizer.addCustomMessage('CUSTOM_ERROR', {
        'zh-CN': '自定义错误消息',
        'en-US': 'Custom error message'
      });

      expect(localizer.getMessage('CUSTOM_ERROR')).toBe('自定义错误消息');
      
      localizer.setLanguage('en-US');
      expect(localizer.getMessage('CUSTOM_ERROR')).toBe('Custom error message');
    });

    test('应该正确添加自定义解决方案', () => {
      localizer.addCustomSolutions('CUSTOM_ERROR', {
        'zh-CN': ['解决方案1', '解决方案2'],
        'en-US': ['Solution 1', 'Solution 2']
      });

      localizer.setLanguage('zh-CN');
      const solutions = localizer.getSolutions('CUSTOM_ERROR');
      expect(solutions).toEqual(['解决方案1', '解决方案2']);
    });
  });
});

describe('ErrorUIManager', () => {
  let uiManager;
  let mockCallback;

  beforeEach(() => {
    uiManager = new ErrorUIManager();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    uiManager.destroy();
  });

  describe('Toast 通知', () => {
    test('应该显示 Toast 通知', () => {
      const config = {
        message: '测试消息',
        type: 'error',
        duration: 3000
      };

      const toastId = uiManager.showToast(config);

      expect(toastId).toBeDefined();
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.classList.add).toHaveBeenCalledWith('error-toast');
    });

    test('应该自动隐藏 Toast', (done) => {
      const config = {
        message: '自动隐藏测试',
        duration: 100
      };

      const toastId = uiManager.showToast(config);

      setTimeout(() => {
        expect(uiManager.activeToasts.has(toastId)).toBe(false);
        done();
      }, 150);
    });

    test('应该手动隐藏 Toast', () => {
      const toastId = uiManager.showToast({ message: '手动隐藏测试' });
      
      expect(uiManager.activeToasts.has(toastId)).toBe(true);
      
      uiManager.hideToast(toastId);
      
      expect(uiManager.activeToasts.has(toastId)).toBe(false);
    });

    test('应该限制同时显示的 Toast 数量', () => {
      uiManager.setMaxToasts(2);

      const toast1 = uiManager.showToast({ message: 'Toast 1' });
      const toast2 = uiManager.showToast({ message: 'Toast 2' });
      const toast3 = uiManager.showToast({ message: 'Toast 3' });

      expect(uiManager.activeToasts.size).toBe(2);
      expect(uiManager.activeToasts.has(toast1)).toBe(false); // 最旧的被移除
      expect(uiManager.activeToasts.has(toast3)).toBe(true);
    });
  });

  describe('Modal 对话框', () => {
    test('应该显示 Modal 对话框', () => {
      const config = {
        title: '错误标题',
        message: '错误消息',
        actions: [
          { text: '确定', action: mockCallback, primary: true },
          { text: '取消', action: mockCallback }
        ]
      };

      const modalId = uiManager.showModal(config);

      expect(modalId).toBeDefined();
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.classList.add).toHaveBeenCalledWith('error-modal');
    });

    test('应该处理 Modal 按钮点击', () => {
      const config = {
        title: '测试 Modal',
        message: '测试消息',
        actions: [
          { text: '确定', action: mockCallback }
        ]
      };

      const modalId = uiManager.showModal(config);
      
      // 模拟按钮点击
      const modal = uiManager.activeModals.get(modalId);
      modal.actions[0].action();

      expect(mockCallback).toHaveBeenCalled();
    });

    test('应该关闭 Modal 对话框', () => {
      const modalId = uiManager.showModal({
        title: '测试',
        message: '测试消息'
      });

      expect(uiManager.activeModals.has(modalId)).toBe(true);

      uiManager.hideModal(modalId);

      expect(uiManager.activeModals.has(modalId)).toBe(false);
    });
  });

  describe('Inline 错误显示', () => {
    test('应该显示 Inline 错误', () => {
      const config = {
        targetElement: 'input-field',
        message: '输入错误',
        position: 'bottom'
      };

      const inlineId = uiManager.showInline(config);

      expect(inlineId).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith('input-field');
    });

    test('应该清除 Inline 错误', () => {
      const inlineId = uiManager.showInline({
        targetElement: 'test-element',
        message: '测试错误'
      });

      expect(uiManager.activeInlines.has(inlineId)).toBe(true);

      uiManager.hideInline(inlineId);

      expect(uiManager.activeInlines.has(inlineId)).toBe(false);
    });
  });

  describe('Banner 横幅', () => {
    test('应该显示 Banner 横幅', () => {
      const config = {
        message: '系统维护通知',
        type: 'warning',
        persistent: true,
        actions: [
          { text: '了解更多', action: mockCallback }
        ]
      };

      const bannerId = uiManager.showBanner(config);

      expect(bannerId).toBeDefined();
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.classList.add).toHaveBeenCalledWith('error-banner');
    });

    test('应该隐藏 Banner 横幅', () => {
      const bannerId = uiManager.showBanner({
        message: '测试横幅',
        persistent: false
      });

      expect(uiManager.activeBanners.has(bannerId)).toBe(true);

      uiManager.hideBanner(bannerId);

      expect(uiManager.activeBanners.has(bannerId)).toBe(false);
    });
  });

  describe('Sidebar 侧边栏', () => {
    test('应该显示 Sidebar 侧边栏', () => {
      const config = {
        title: '错误详情',
        content: '详细错误信息',
        position: 'right',
        width: '400px'
      };

      const sidebarId = uiManager.showSidebar(config);

      expect(sidebarId).toBeDefined();
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.classList.add).toHaveBeenCalledWith('error-sidebar');
    });

    test('应该隐藏 Sidebar 侧边栏', () => {
      const sidebarId = uiManager.showSidebar({
        title: '测试侧边栏',
        content: '测试内容'
      });

      expect(uiManager.activeSidebars.has(sidebarId)).toBe(true);

      uiManager.hideSidebar(sidebarId);

      expect(uiManager.activeSidebars.has(sidebarId)).toBe(false);
    });
  });

  describe('通用显示方法', () => {
    test('应该根据模式显示错误', () => {
      const showToastSpy = jest.spyOn(uiManager, 'showToast');
      const showModalSpy = jest.spyOn(uiManager, 'showModal');

      uiManager.showError({
        mode: ErrorDisplayMode.TOAST,
        message: 'Toast 错误'
      });

      uiManager.showError({
        mode: ErrorDisplayMode.MODAL,
        title: 'Modal 错误',
        message: 'Modal 消息'
      });

      expect(showToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Toast 错误' })
      );
      expect(showModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Modal 消息' })
      );
    });

    test('应该清除所有错误显示', () => {
      // 创建各种类型的错误显示
      uiManager.showToast({ message: 'Toast' });
      uiManager.showModal({ title: 'Modal', message: 'Modal' });
      uiManager.showBanner({ message: 'Banner' });

      expect(uiManager.activeToasts.size).toBeGreaterThan(0);
      expect(uiManager.activeModals.size).toBeGreaterThan(0);
      expect(uiManager.activeBanners.size).toBeGreaterThan(0);

      uiManager.clearAll();

      expect(uiManager.activeToasts.size).toBe(0);
      expect(uiManager.activeModals.size).toBe(0);
      expect(uiManager.activeBanners.size).toBe(0);
    });
  });

  describe('事件处理', () => {
    test('应该触发显示事件', () => {
      uiManager.addEventListener('errorShown', mockCallback);

      uiManager.showToast({ message: '测试消息' });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'toast',
          config: expect.objectContaining({ message: '测试消息' })
        })
      );
    });

    test('应该触发隐藏事件', () => {
      uiManager.addEventListener('errorHidden', mockCallback);

      const toastId = uiManager.showToast({ message: '测试消息' });
      uiManager.hideToast(toastId);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'toast',
          id: toastId
        })
      );
    });
  });
});

describe('UserActionHandler', () => {
  let actionHandler;
  let mockCallback;

  beforeEach(() => {
    actionHandler = new UserActionHandler();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  describe('用户操作执行', () => {
    test('应该执行重试操作', async () => {
      const retryFn = jest.fn().mockResolvedValue('重试成功');
      actionHandler.setRetryFunction(retryFn);

      const result = await actionHandler.executeAction(UserActionType.RETRY, {
        maxAttempts: 3,
        delay: 100
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('重试成功');
      expect(retryFn).toHaveBeenCalled();
    });

    test('应该执行刷新操作', async () => {
      const result = await actionHandler.executeAction(UserActionType.REFRESH);

      expect(result.success).toBe(true);
      expect(window.location.reload).toHaveBeenCalled();
    });

    test('应该执行设置操作', async () => {
      const settingsFn = jest.fn();
      actionHandler.setSettingsFunction(settingsFn);

      const result = await actionHandler.executeAction(UserActionType.SETTINGS, {
        section: 'network'
      });

      expect(result.success).toBe(true);
      expect(settingsFn).toHaveBeenCalledWith({ section: 'network' });
    });

    test('应该执行帮助操作', async () => {
      const helpFn = jest.fn();
      actionHandler.setHelpFunction(helpFn);

      const result = await actionHandler.executeAction(UserActionType.HELP, {
        topic: 'network-issues'
      });

      expect(result.success).toBe(true);
      expect(helpFn).toHaveBeenCalledWith({ topic: 'network-issues' });
    });

    test('应该执行报告操作', async () => {
      const reportFn = jest.fn().mockResolvedValue({ reportId: '12345' });
      actionHandler.setReportFunction(reportFn);

      const result = await actionHandler.executeAction(UserActionType.REPORT, {
        error: { type: 'NETWORK_ERROR', message: '网络错误' },
        userDescription: '用户描述'
      });

      expect(result.success).toBe(true);
      expect(result.result.reportId).toBe('12345');
      expect(reportFn).toHaveBeenCalled();
    });

    test('应该执行联系操作', async () => {
      const result = await actionHandler.executeAction(UserActionType.CONTACT, {
        method: 'email',
        subject: '技术支持请求'
      });

      expect(result.success).toBe(true);
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('mailto:')
      );
    });

    test('应该执行忽略操作', async () => {
      const result = await actionHandler.executeAction(UserActionType.IGNORE, {
        errorId: 'error-123'
      });

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ignored_errors',
        expect.any(String)
      );
    });
  });

  describe('操作历史', () => {
    test('应该记录操作历史', async () => {
      await actionHandler.executeAction(UserActionType.RETRY);
      await actionHandler.executeAction(UserActionType.REFRESH);

      const history = actionHandler.getActionHistory();

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe(UserActionType.RETRY);
      expect(history[1].action).toBe(UserActionType.REFRESH);
    });

    test('应该限制历史记录数量', async () => {
      actionHandler.setMaxHistorySize(3);

      for (let i = 0; i < 5; i++) {
        await actionHandler.executeAction(UserActionType.IGNORE, { errorId: `error-${i}` });
      }

      const history = actionHandler.getActionHistory();
      expect(history).toHaveLength(3);
    });

    test('应该清除操作历史', async () => {
      await actionHandler.executeAction(UserActionType.RETRY);
      
      expect(actionHandler.getActionHistory()).toHaveLength(1);
      
      actionHandler.clearHistory();
      
      expect(actionHandler.getActionHistory()).toHaveLength(0);
    });
  });

  describe('操作统计', () => {
    test('应该统计操作次数', async () => {
      await actionHandler.executeAction(UserActionType.RETRY);
      await actionHandler.executeAction(UserActionType.RETRY);
      await actionHandler.executeAction(UserActionType.REFRESH);

      const stats = actionHandler.getStatistics();

      expect(stats.totalActions).toBe(3);
      expect(stats.actionCounts[UserActionType.RETRY]).toBe(2);
      expect(stats.actionCounts[UserActionType.REFRESH]).toBe(1);
    });

    test('应该统计成功率', async () => {
      const failingRetryFn = jest.fn().mockRejectedValue(new Error('重试失败'));
      actionHandler.setRetryFunction(failingRetryFn);

      await actionHandler.executeAction(UserActionType.RETRY).catch(() => {});
      await actionHandler.executeAction(UserActionType.REFRESH);

      const stats = actionHandler.getStatistics();

      expect(stats.successRate).toBe(0.5); // 1 成功 / 2 总数
    });
  });
});

describe('UserErrorHandler 集成测试', () => {
  let userErrorHandler;
  let mockCallback;

  beforeEach(() => {
    userErrorHandler = new UserErrorHandler();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    userErrorHandler.destroy();
  });

  describe('初始化和配置', () => {
    test('应该正确初始化所有组件', () => {
      expect(userErrorHandler.localizer).toBeDefined();
      expect(userErrorHandler.uiManager).toBeDefined();
      expect(userErrorHandler.actionHandler).toBeDefined();
    });

    test('应该正确配置组件', () => {
      const config = {
        language: 'en-US',
        maxToasts: 5,
        retryFunction: jest.fn(),
        customMessages: {
          'CUSTOM_ERROR': {
            'zh-CN': '自定义错误',
            'en-US': 'Custom error'
          }
        }
      };

      userErrorHandler.configure(config);

      expect(userErrorHandler.localizer.getCurrentLanguage()).toBe('en-US');
      expect(userErrorHandler.uiManager.maxToasts).toBe(5);
    });
  });

  describe('错误处理流程', () => {
    test('应该显示用户友好的错误消息', () => {
      const showErrorSpy = jest.spyOn(userErrorHandler.uiManager, 'showError');

      const error = {
        type: 'NETWORK_ERROR',
        message: '网络连接失败',
        severity: 'high'
      };

      userErrorHandler.handleError(error, {
        mode: ErrorDisplayMode.TOAST,
        showSolutions: true,
        showActions: true
      });

      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: ErrorDisplayMode.TOAST,
          message: expect.stringContaining('网络连接失败'),
          solutions: expect.any(Array),
          actions: expect.any(Array)
        })
      );
    });

    test('应该根据错误严重程度选择显示模式', () => {
      const showErrorSpy = jest.spyOn(userErrorHandler.uiManager, 'showError');

      // 高严重程度错误应该显示为 Modal
      userErrorHandler.handleError({
        type: 'SYSTEM_ERROR',
        severity: 'critical'
      });

      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: ErrorDisplayMode.MODAL
        })
      );

      // 低严重程度错误应该显示为 Toast
      userErrorHandler.handleError({
        type: 'VALIDATION_ERROR',
        severity: 'low'
      });

      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: ErrorDisplayMode.TOAST
        })
      );
    });

    test('应该提供相关的解决方案', () => {
      const error = {
        type: 'NETWORK_ERROR',
        message: '网络错误'
      };

      const result = userErrorHandler.handleError(error, {
        showSolutions: true
      });

      expect(result.solutions).toBeInstanceOf(Array);
      expect(result.solutions.length).toBeGreaterThan(0);
      expect(result.solutions[0]).toContain('检查网络连接');
    });

    test('应该提供用户操作选项', () => {
      const error = {
        type: 'MODEL_ERROR',
        message: '模型加载失败'
      };

      const result = userErrorHandler.handleError(error, {
        showActions: true
      });

      expect(result.actions).toBeInstanceOf(Array);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions.some(action => action.type === UserActionType.RETRY)).toBe(true);
    });
  });

  describe('用户交互处理', () => {
    test('应该处理用户重试操作', async () => {
      const retryFn = jest.fn().mockResolvedValue('重试成功');
      userErrorHandler.configure({ retryFunction: retryFn });

      userErrorHandler.addEventListener('actionExecuted', mockCallback);

      const result = await userErrorHandler.executeUserAction(UserActionType.RETRY, {
        maxAttempts: 3
      });

      expect(result.success).toBe(true);
      expect(retryFn).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: UserActionType.RETRY,
          success: true
        })
      );
    });

    test('应该处理错误报告', async () => {
      const reportFn = jest.fn().mockResolvedValue({ reportId: 'R12345' });
      userErrorHandler.configure({ reportFunction: reportFn });

      const error = {
        type: 'SYSTEM_ERROR',
        message: '系统错误',
        stack: 'Error stack trace'
      };

      const result = await userErrorHandler.reportError(error, {
        userDescription: '用户描述的问题',
        includeSystemInfo: true
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBe('R12345');
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          userDescription: '用户描述的问题',
          systemInfo: expect.any(Object)
        })
      );
    });
  });

  describe('错误统计和分析', () => {
    test('应该记录错误统计信息', () => {
      userErrorHandler.handleError({ type: 'NETWORK_ERROR' });
      userErrorHandler.handleError({ type: 'MODEL_ERROR' });
      userErrorHandler.handleError({ type: 'NETWORK_ERROR' });

      const stats = userErrorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType['NETWORK_ERROR']).toBe(2);
      expect(stats.errorsByType['MODEL_ERROR']).toBe(1);
    });

    test('应该分析用户行为模式', async () => {
      // 模拟用户操作
      await userErrorHandler.executeUserAction(UserActionType.RETRY);
      await userErrorHandler.executeUserAction(UserActionType.REFRESH);
      await userErrorHandler.executeUserAction(UserActionType.RETRY);

      const analysis = userErrorHandler.getUserBehaviorAnalysis();

      expect(analysis.mostUsedAction).toBe(UserActionType.RETRY);
      expect(analysis.totalActions).toBe(3);
      expect(analysis.actionFrequency[UserActionType.RETRY]).toBe(2);
    });
  });

  describe('多语言支持', () => {
    test('应该支持语言切换', () => {
      userErrorHandler.setLanguage('en-US');

      const error = {
        type: 'NETWORK_ERROR',
        message: 'Network error'
      };

      const result = userErrorHandler.handleError(error);

      expect(result.localizedMessage).toContain('Network connection failed');
    });

    test('应该支持自定义消息本地化', () => {
      userErrorHandler.addCustomMessage('CUSTOM_ERROR', {
        'zh-CN': '自定义错误消息',
        'en-US': 'Custom error message'
      });

      userErrorHandler.setLanguage('zh-CN');
      let result = userErrorHandler.handleError({ type: 'CUSTOM_ERROR' });
      expect(result.localizedMessage).toBe('自定义错误消息');

      userErrorHandler.setLanguage('en-US');
      result = userErrorHandler.handleError({ type: 'CUSTOM_ERROR' });
      expect(result.localizedMessage).toBe('Custom error message');
    });
  });

  describe('配置和自定义', () => {
    test('应该支持自定义UI主题', () => {
      const theme = {
        primaryColor: '#ff0000',
        backgroundColor: '#ffffff',
        textColor: '#000000'
      };

      userErrorHandler.setTheme(theme);

      expect(userErrorHandler.uiManager.theme).toEqual(theme);
    });

    test('应该支持自定义操作处理器', () => {
      const customHandler = jest.fn().mockResolvedValue({ success: true });
      
      userErrorHandler.setCustomActionHandler('CUSTOM_ACTION', customHandler);

      userErrorHandler.executeUserAction('CUSTOM_ACTION', { param: 'value' });

      expect(customHandler).toHaveBeenCalledWith({ param: 'value' });
    });
  });

  describe('清理和销毁', () => {
    test('应该正确清理所有组件', () => {
      const uiManagerDestroySpy = jest.spyOn(userErrorHandler.uiManager, 'destroy');
      
      userErrorHandler.destroy();

      expect(uiManagerDestroySpy).toHaveBeenCalled();
    });

    test('应该清除所有错误显示', () => {
      userErrorHandler.handleError({ type: 'TEST_ERROR' });
      
      const clearAllSpy = jest.spyOn(userErrorHandler.uiManager, 'clearAll');
      
      userErrorHandler.clearAllErrors();
      
      expect(clearAllSpy).toHaveBeenCalled();
    });
  });
});