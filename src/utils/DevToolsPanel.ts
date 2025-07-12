/**
 * 开发者工具面板
 * 提供实时监控、调试和诊断功能的可视化界面
 */

import { eventBus } from '../core/EventBus.js';
import { CodeQualityChecker } from './CodeQualityChecker.js';
import { WorkerLifecycleManager } from './WorkerLifecycleManager.js';

// 创建实例
const codeQualityChecker = new CodeQualityChecker();
const workerLifecycleManager = new WorkerLifecycleManager();

export interface DevToolsConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme: 'light' | 'dark' | 'auto';
  autoOpen: boolean;
  enableKeyboardShortcuts: boolean;
  enableNotifications: boolean;
}

export interface DevToolsPanelItem {
  id: string;
  title: string;
  icon: string;
  content: HTMLElement;
  isActive: boolean;
}

/**
 * 开发者工具面板管理器
 */
export class DevToolsPanel {
  private container: HTMLElement | null = null;
  private panels = new Map<string, DevToolsPanelItem>();
  private config: DevToolsConfig;
  private isVisible = false;
  private updateInterval: number | null = null;

  constructor(config: Partial<DevToolsConfig> = {}) {
    this.config = {
      position: 'bottom-right',
      theme: 'dark',
      autoOpen: false,
      enableKeyboardShortcuts: true,
      enableNotifications: true,
      ...config
    };

    this.init();
  }

  /**
   * 初始化开发者工具
   */
  private init(): void {
    this.createContainer();
    this.createPanels();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();

    if (this.config.autoOpen) {
      this.show();
    }

    console.log('🛠️ 开发者工具面板已初始化');
  }

  /**
   * 创建容器
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'dev-tools-panel';
    this.container.className = `dev-tools ${this.config.theme} ${this.config.position}`;
    
    this.container.innerHTML = `
      <div class="dev-tools-header">
        <div class="dev-tools-tabs"></div>
        <div class="dev-tools-controls">
          <button class="dev-tools-minimize" title="最小化">−</button>
          <button class="dev-tools-close" title="关闭">×</button>
        </div>
      </div>
      <div class="dev-tools-content"></div>
    `;

    // 添加样式
    this.addStyles();
    
    document.body.appendChild(this.container);
  }

  /**
   * 添加样式
   */
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .dev-tools {
        position: fixed;
        width: 400px;
        height: 300px;
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        z-index: 10000;
        display: none;
        flex-direction: column;
        resize: both;
        overflow: hidden;
        min-width: 300px;
        min-height: 200px;
      }

      .dev-tools.dark {
        --bg-color: #1e1e1e;
        --text-color: #d4d4d4;
        --border-color: #3e3e3e;
        --tab-bg: #2d2d2d;
        --tab-active-bg: #007acc;
        --button-hover: #3e3e3e;
      }

      .dev-tools.light {
        --bg-color: #ffffff;
        --text-color: #333333;
        --border-color: #cccccc;
        --tab-bg: #f0f0f0;
        --tab-active-bg: #007acc;
        --button-hover: #e0e0e0;
      }

      .dev-tools.top-left { top: 20px; left: 20px; }
      .dev-tools.top-right { top: 20px; right: 20px; }
      .dev-tools.bottom-left { bottom: 20px; left: 20px; }
      .dev-tools.bottom-right { bottom: 20px; right: 20px; }

      .dev-tools-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: var(--tab-bg);
        border-bottom: 1px solid var(--border-color);
        cursor: move;
      }

      .dev-tools-tabs {
        display: flex;
        gap: 4px;
      }

      .dev-tools-tab {
        padding: 4px 8px;
        background: var(--tab-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        color: var(--text-color);
        font-size: 11px;
        transition: background 0.2s;
      }

      .dev-tools-tab:hover {
        background: var(--button-hover);
      }

      .dev-tools-tab.active {
        background: var(--tab-active-bg);
        color: white;
      }

      .dev-tools-controls {
        display: flex;
        gap: 4px;
      }

      .dev-tools-controls button {
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: var(--text-color);
        cursor: pointer;
        border-radius: 2px;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dev-tools-controls button:hover {
        background: var(--button-hover);
      }

      .dev-tools-content {
        flex: 1;
        overflow: auto;
        padding: 8px;
        color: var(--text-color);
        background: var(--bg-color);
      }

      .dev-tools-panel {
        display: none;
        height: 100%;
      }

      .dev-tools-panel.active {
        display: block;
      }

      .metric-item {
        display: flex;
        justify-content: space-between;
        padding: 2px 0;
        border-bottom: 1px solid var(--border-color);
      }

      .metric-label {
        font-weight: bold;
      }

      .metric-value {
        font-family: monospace;
      }

      .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
      }

      .status-healthy { background: #4caf50; }
      .status-warning { background: #ff9800; }
      .status-critical { background: #f44336; }

      .log-entry {
        padding: 2px 0;
        border-bottom: 1px solid var(--border-color);
        font-size: 11px;
      }

      .log-timestamp {
        color: #888;
        margin-right: 8px;
      }

      .log-level {
        margin-right: 8px;
        font-weight: bold;
      }

      .log-error { color: #f44336; }
      .log-warn { color: #ff9800; }
      .log-info { color: #2196f3; }
      .log-debug { color: #9c27b0; }

      .action-button {
        padding: 4px 8px;
        margin: 2px;
        background: var(--tab-active-bg);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }

      .action-button:hover {
        opacity: 0.8;
      }

      .chart-container {
        height: 100px;
        margin: 8px 0;
        position: relative;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 创建面板
   */
  private createPanels(): void {
    // 系统监控面板
    this.addPanel('monitor', '监控', '📊', this.createMonitorPanel());
    
    // 性能分析面板
    this.addPanel('performance', '性能', '⚡', this.createPerformancePanel());
    
    // Worker 管理面板
    this.addPanel('workers', 'Workers', '👷', this.createWorkersPanel());
    
    // 日志面板
    this.addPanel('logs', '日志', '📝', this.createLogsPanel());
    
    // 质量检查面板
    this.addPanel('quality', '质量', '🔍', this.createQualityPanel());

    // 默认激活第一个面板
    this.activatePanel('monitor');
  }

  /**
   * 添加面板
   */
  private addPanel(id: string, title: string, icon: string, content: HTMLElement): void {
    const panel: DevToolsPanelItem = {
      id,
      title,
      icon,
      content,
      isActive: false
    };

    this.panels.set(id, panel);

    // 添加标签
    const tab = document.createElement('button');
    tab.className = 'dev-tools-tab';
    tab.textContent = `${icon} ${title}`;
    tab.onclick = () => this.activatePanel(id);

    const tabsContainer = this.container?.querySelector('.dev-tools-tabs');
    tabsContainer?.appendChild(tab);

    // 添加内容
    content.className = 'dev-tools-panel';
    content.id = `panel-${id}`;

    const contentContainer = this.container?.querySelector('.dev-tools-content');
    contentContainer?.appendChild(content);
  }

  /**
   * 激活面板
   */
  private activatePanel(panelId: string): void {
    // 取消激活所有面板
    this.panels.forEach((panel, id) => {
      panel.isActive = false;
      panel.content.classList.remove('active');
      
      const tab = this.container?.querySelector(`.dev-tools-tab:nth-child(${Array.from(this.panels.keys()).indexOf(id) + 1})`);
      tab?.classList.remove('active');
    });

    // 激活指定面板
    const panel = this.panels.get(panelId);
    if (panel) {
      panel.isActive = true;
      panel.content.classList.add('active');
      
      const tabIndex = Array.from(this.panels.keys()).indexOf(panelId) + 1;
      const tab = this.container?.querySelector(`.dev-tools-tab:nth-child(${tabIndex})`);
      tab?.classList.add('active');
      

    }
  }

  /**
   * 创建监控面板
   */
  private createMonitorPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="monitor-section">
        <h4>系统状态</h4>
        <div id="system-status"></div>
      </div>
      <div class="monitor-section">
        <h4>内存使用</h4>
        <div id="memory-usage"></div>
      </div>
      <div class="monitor-section">
        <h4>实时指标</h4>
        <div id="real-time-metrics"></div>
      </div>
    `;
    return panel;
  }

  /**
   * 创建性能面板
   */
  private createPerformancePanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="performance-section">
        <h4>性能统计</h4>
        <div id="performance-stats"></div>
      </div>
      <div class="performance-section">
        <h4>响应时间</h4>
        <div class="chart-container" id="response-time-chart"></div>
      </div>
      <div class="performance-section">
        <button class="action-button" onclick="window.devTools.clearPerformanceData()">清除数据</button>
        <button class="action-button" onclick="window.devTools.exportPerformanceData()">导出数据</button>
      </div>
    `;
    return panel;
  }

  /**
   * 创建 Workers 面板
   */
  private createWorkersPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="workers-section">
        <h4>Worker 状态</h4>
        <div id="workers-status"></div>
      </div>
      <div class="workers-section">
        <h4>Worker 操作</h4>
        <button class="action-button" onclick="window.devTools.restartAllWorkers()">重启所有</button>
        <button class="action-button" onclick="window.devTools.terminateAllWorkers()">终止所有</button>
      </div>
    `;
    return panel;
  }

  /**
   * 创建日志面板
   */
  private createLogsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="logs-section">
        <div class="logs-controls">
          <button class="action-button" onclick="window.devTools.clearLogs()">清除日志</button>
          <button class="action-button" onclick="window.devTools.exportLogs()">导出日志</button>
          <select id="log-level-filter">
            <option value="all">所有级别</option>
            <option value="error">错误</option>
            <option value="warn">警告</option>
            <option value="info">信息</option>
            <option value="debug">调试</option>
          </select>
        </div>
        <div id="logs-container" style="height: 200px; overflow-y: auto; border: 1px solid var(--border-color); padding: 4px;"></div>
      </div>
    `;
    return panel;
  }

  /**
   * 创建质量检查面板
   */
  private createQualityPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="quality-section">
        <h4>代码质量</h4>
        <div id="quality-status"></div>
      </div>
      <div class="quality-section">
        <h4>质量操作</h4>
        <button class="action-button" onclick="window.devTools.runQualityCheck()">运行检查</button>
        <button class="action-button" onclick="window.devTools.generateQualityReport()">生成报告</button>
      </div>
      <div class="quality-section">
        <h4>检查结果</h4>
        <div id="quality-results"></div>
      </div>
    `;
    return panel;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // 关闭按钮
    const closeBtn = this.container.querySelector('.dev-tools-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // 最小化按钮
    const minimizeBtn = this.container.querySelector('.dev-tools-minimize');
    minimizeBtn?.addEventListener('click', () => this.minimize());

    // 拖拽功能
    this.setupDragAndDrop();

    // 监听事件
    eventBus.on('health-check', () => this.updateHealthStatus());
    eventBus.on('worker-error', (data) => this.logWorkerError(data));
    eventBus.on('performance-update', () => this.updatePerformanceData());
    eventBus.on('code-quality-check', (data) => this.updateQualityStatus(data));
  }

  /**
   * 设置拖拽功能
   */
  private setupDragAndDrop(): void {
    const header = this.container?.querySelector('.dev-tools-header') as HTMLElement;
    if (!header || !this.container) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.container!.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.container) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.container.style.left = `${startLeft + deltaX}px`;
      this.container.style.top = `${startTop + deltaY}px`;
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  /**
   * 设置键盘快捷键
   */
  private setupKeyboardShortcuts(): void {
    if (!this.config.enableKeyboardShortcuts) return;

    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + D 切换开发者工具
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
      
      // Ctrl/Cmd + Shift + R 运行质量检查
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.runQualityCheck();
      }
    });
  }

  /**
   * 显示面板
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
      this.isVisible = true;
      this.startUpdating();
    }
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
      this.stopUpdating();
    }
  }

  /**
   * 切换显示状态
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 最小化
   */
  minimize(): void {
    if (this.container) {
      const content = this.container.querySelector('.dev-tools-content') as HTMLElement;
      if (content.style.display === 'none') {
        content.style.display = 'block';
        this.container.style.height = '300px';
      } else {
        content.style.display = 'none';
        this.container.style.height = 'auto';
      }
    }
  }

  /**
   * 开始更新数据
   */
  private startUpdating(): void {
    if (this.updateInterval) return;

    this.updateInterval = window.setInterval(() => {
      this.updateAllPanels();
    }, 1000);

    // 立即更新一次
    this.updateAllPanels();
  }

  /**
   * 停止更新数据
   */
  private stopUpdating(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 更新所有面板
   */
  private updateAllPanels(): void {
    this.updateSystemStatus();
    this.updateMemoryUsage();
    this.updateWorkersStatus();
    this.updatePerformanceStats();
  }

  /**
   * 更新系统状态
   */
  private updateSystemStatus(): void {
    const container = this.container?.querySelector('#system-status');
    if (!container) return;

    // 使用 workerLifecycleManager 获取系统状态
    const stats = workerLifecycleManager.getStatistics();
    const overallStatus = stats.totalErrors === 0 ? 'healthy' : 'warning';
    const uptime = Date.now() - (window as any).startTime || 0;

    const statusHtml = `
      <div class="metric-item">
        <span class="metric-label">
          <span class="status-indicator status-${overallStatus}"></span>
          整体状态
        </span>
        <span class="metric-value">${overallStatus.toUpperCase()}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">运行时间</span>
        <span class="metric-value">${Math.round(uptime / 1000 / 60)}分钟</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Worker数量</span>
        <span class="metric-value">${stats.totalWorkers}</span>
      </div>
    `;

    container.innerHTML = statusHtml;
  }

  /**
   * 更新内存使用
   */
  private updateMemoryUsage(): void {
    const container = this.container?.querySelector('#memory-usage');
    if (!container) return;

    const memInfo = (performance as any).memory;
    if (!memInfo) {
      container.innerHTML = '<div>内存信息不可用</div>';
      return;
    }

    const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
    const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);

    const memoryHtml = `
      <div class="metric-item">
        <span class="metric-label">已使用</span>
        <span class="metric-value">${usedMB}MB</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">总计</span>
        <span class="metric-value">${totalMB}MB</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">限制</span>
        <span class="metric-value">${limitMB}MB</span>
      </div>
    `;

    container.innerHTML = memoryHtml;
  }

  /**
   * 更新 Workers 状态
   */
  private updateWorkersStatus(): void {
    const container = this.container?.querySelector('#workers-status');
    if (!container) return;

    const stats = workerLifecycleManager.getStatistics();
    const workersHtml = `
      <div class="metric-item">
        <span class="metric-label">总数</span>
        <span class="metric-value">${stats.totalWorkers}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">活跃</span>
        <span class="metric-value">${stats.activeWorkers}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">总请求</span>
        <span class="metric-value">${stats.totalRequests}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">错误数</span>
        <span class="metric-value">${stats.totalErrors}</span>
      </div>
    `;

    container.innerHTML = workersHtml;
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(): void {
    const container = this.container?.querySelector('#performance-stats');
    if (!container) return;

    // 这里可以集成 PerformanceProfiler 的数据
    const performanceHtml = `
      <div class="metric-item">
        <span class="metric-label">FPS</span>
        <span class="metric-value">60</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">平均响应时间</span>
        <span class="metric-value">45ms</span>
      </div>
    `;

    container.innerHTML = performanceHtml;
  }

  /**
   * 更新健康状态
   */
  private updateHealthStatus(): void {
    // 实现健康状态更新逻辑
  }

  /**
   * 记录 Worker 错误
   */
  private logWorkerError(data: any): void {
    this.addLogEntry('error', `Worker错误: ${data.error}`);
  }

  /**
   * 更新性能数据
   */
  private updatePerformanceData(): void {
    // 实现性能数据更新逻辑
  }

  /**
   * 更新质量状态
   */
  private updateQualityStatus(data: any): void {
    const container = this.container?.querySelector('#quality-status');
    if (!container) return;

    const issues = data.memoryLeaks.length + data.performanceIssues.length + 
                  data.securityIssues.length + data.codeSmells.length;

    container.innerHTML = `
      <div class="metric-item">
        <span class="metric-label">问题总数</span>
        <span class="metric-value">${issues}</span>
      </div>
    `;
  }

  /**
   * 添加日志条目
   */
  private addLogEntry(level: string, message: string): void {
    const container = this.container?.querySelector('#logs-container');
    if (!container) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-level log-${level}">[${level.toUpperCase()}]</span>
      <span class="log-message">${message}</span>
    `;

    container.appendChild(logEntry);
    container.scrollTop = container.scrollHeight;

    // 限制日志条目数量
    const entries = container.querySelectorAll('.log-entry');
    if (entries.length > 100) {
      const firstEntry = entries[0];
      if (firstEntry) {
        firstEntry.remove();
      }
    }
  }

  /**
   * 运行质量检查
   */
  async runQualityCheck(): Promise<void> {
    try {
      const metrics = await codeQualityChecker.performQualityCheck();
      this.updateQualityStatus(metrics);
      this.addLogEntry('info', '质量检查完成');
    } catch (error) {
      this.addLogEntry('error', `质量检查失败: ${error}`);
    }
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    const container = this.container?.querySelector('#logs-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * 导出日志
   */
  exportLogs(): void {
    const container = this.container?.querySelector('#logs-container');
    if (!container) return;

    const logs = Array.from(container.querySelectorAll('.log-entry'))
      .map(entry => entry.textContent)
      .join('\n');

    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-tools-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 全局实例
declare global {
  interface Window {
    devTools: DevToolsPanel;
  }
}

/**
 * 初始化开发者工具
 */
export function initDevTools(config?: Partial<DevToolsConfig>): DevToolsPanel {
  const devTools = new DevToolsPanel(config);
  window.devTools = devTools;
  return devTools;
}