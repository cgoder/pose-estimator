/**
 * 代码质量检查工具
 * 提供运行时代码质量监控和分析功能
 */

import { eventBus } from '../core/EventBus.js';

export interface CodeQualityMetrics {
  memoryLeaks: MemoryLeakInfo[];
  performanceIssues: PerformanceIssue[];
  errorPatterns: ErrorPattern[];
  codeSmells: CodeSmell[];
  securityIssues: SecurityIssue[];
  timestamp: number;
}

export interface MemoryLeakInfo {
  type: 'tensor' | 'dom' | 'event-listener' | 'worker' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  suggestions: string[];
  memoryUsage?: number;
}

export interface PerformanceIssue {
  type: 'slow-function' | 'blocking-operation' | 'inefficient-loop' | 'large-payload';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration?: number;
  location?: string;
  suggestions: string[];
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  lastOccurrence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestions: string[];
}

export interface CodeSmell {
  type: 'long-function' | 'deep-nesting' | 'duplicate-code' | 'large-class' | 'god-object';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
  suggestions: string[];
}

export interface SecurityIssue {
  type: 'xss' | 'unsafe-eval' | 'insecure-random' | 'data-exposure';
  description: string;
  severity: 'medium' | 'high' | 'critical';
  location?: string;
  suggestions: string[];
}

export interface QualityCheckConfig {
  enableMemoryLeakDetection: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorPatternAnalysis: boolean;
  enableSecurityChecks: boolean;
  checkInterval: number;
  memoryThreshold: number;
  performanceThreshold: number;
}

/**
 * 代码质量检查器
 */
export class CodeQualityChecker {
  private config: QualityCheckConfig;
  private checkInterval: number | null = null;
  private errorHistory = new Map<string, ErrorPattern>();
  private performanceHistory: PerformanceEntry[] = [];
  private memorySnapshots: number[] = [];
  private startTime = Date.now();

  constructor(config: Partial<QualityCheckConfig> = {}) {
    this.config = {
      enableMemoryLeakDetection: true,
      enablePerformanceMonitoring: true,
      enableErrorPatternAnalysis: true,
      enableSecurityChecks: true,
      checkInterval: 60000, // 1分钟
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      performanceThreshold: 1000, // 1秒
      ...config
    };

    this.setupGlobalErrorHandling();
    this.setupPerformanceMonitoring();
  }

  /**
   * 开始质量检查
   */
  startChecking(): void {
    if (this.checkInterval) return;

    this.checkInterval = window.setInterval(() => {
      this.performQualityCheck();
    }, this.config.checkInterval);

    // 立即执行一次检查
    this.performQualityCheck();
    console.log('🔍 代码质量检查已启动');
  }

  /**
   * 停止质量检查
   */
  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ 代码质量检查已停止');
    }
  }

  /**
   * 执行质量检查
   */
  async performQualityCheck(): Promise<CodeQualityMetrics> {
    const metrics: CodeQualityMetrics = {
      memoryLeaks: [],
      performanceIssues: [],
      errorPatterns: Array.from(this.errorHistory.values()),
      codeSmells: [],
      securityIssues: [],
      timestamp: Date.now()
    };

    // 内存泄漏检测
    if (this.config.enableMemoryLeakDetection) {
      metrics.memoryLeaks = await this.detectMemoryLeaks();
    }

    // 性能问题检测
    if (this.config.enablePerformanceMonitoring) {
      metrics.performanceIssues = this.detectPerformanceIssues();
    }

    // 安全问题检测
    if (this.config.enableSecurityChecks) {
      metrics.securityIssues = this.detectSecurityIssues();
    }

    // 代码异味检测
    metrics.codeSmells = this.detectCodeSmells();

    // 发布质量检查事件
    eventBus.emit('code-quality-check', metrics);

    // 如果发现严重问题，发出警告
    const criticalIssues = this.getCriticalIssues(metrics);
    if (criticalIssues.length > 0) {
      eventBus.emit('code-quality-warning', { issues: criticalIssues });
      console.warn('⚠️ 发现严重代码质量问题:', criticalIssues);
    }

    return metrics;
  }

  /**
   * 检测内存泄漏
   */
  private async detectMemoryLeaks(): Promise<MemoryLeakInfo[]> {
    const leaks: MemoryLeakInfo[] = [];

    try {
      // 检查 JavaScript 堆内存
      const memInfo = (performance as any).memory;
      if (memInfo) {
        const currentMemory = memInfo.usedJSHeapSize;
        this.memorySnapshots.push(currentMemory);

        // 保留最近10个快照
        if (this.memorySnapshots.length > 10) {
          this.memorySnapshots.shift();
        }

        // 检查内存增长趋势
        if (this.memorySnapshots.length >= 5) {
          const trend = this.calculateMemoryTrend();
          if (trend > this.config.memoryThreshold / 10) { // 每次检查增长超过阈值的10%
            leaks.push({
              type: 'other',
              description: `检测到内存持续增长: ${(trend / 1024 / 1024).toFixed(2)}MB/检查`,
              severity: trend > this.config.memoryThreshold / 5 ? 'critical' : 'high',
              memoryUsage: currentMemory,
              suggestions: [
                '检查是否有未释放的对象引用',
                '使用 tf.dispose() 清理 TensorFlow.js 张量',
                '移除不需要的事件监听器',
                '清理定时器和间隔器'
              ]
            });
          }
        }

        // 检查绝对内存使用量
        if (currentMemory > this.config.memoryThreshold) {
          leaks.push({
            type: 'other',
            description: `内存使用量过高: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`,
            severity: 'critical',
            memoryUsage: currentMemory,
            suggestions: [
              '立即释放不需要的资源',
              '减少同时加载的模型数量',
              '优化图像处理流程'
            ]
          });
        }
      }

      // 检查 TensorFlow.js 张量泄漏
      if (typeof (window as any).tf !== 'undefined') {
        const tf = (window as any).tf;
        const numTensors = tf.memory().numTensors;
        const numBytes = tf.memory().numBytes;

        if (numTensors > 1000) {
          leaks.push({
            type: 'tensor',
            description: `TensorFlow.js 张量数量过多: ${numTensors}`,
            severity: numTensors > 5000 ? 'critical' : 'high',
            suggestions: [
              '使用 tf.tidy() 包装计算',
              '手动调用 tensor.dispose()',
              '检查模型加载和释放逻辑'
            ]
          });
        }

        if (numBytes > 500 * 1024 * 1024) { // 500MB
          leaks.push({
            type: 'tensor',
            description: `TensorFlow.js 内存使用过多: ${(numBytes / 1024 / 1024).toFixed(2)}MB`,
            severity: 'critical',
            suggestions: [
              '释放不需要的模型',
              '使用更小的模型变体',
              '批量处理时减少批次大小'
            ]
          });
        }
      }

      // 检查 DOM 节点泄漏
      const domNodeCount = document.querySelectorAll('*').length;
      if (domNodeCount > 10000) {
        leaks.push({
          type: 'dom',
          description: `DOM 节点数量过多: ${domNodeCount}`,
          severity: domNodeCount > 50000 ? 'critical' : 'medium',
          suggestions: [
            '清理不需要的 DOM 节点',
            '使用虚拟滚动优化长列表',
            '避免创建过多的临时元素'
          ]
        });
      }

    } catch (error) {
      console.error('内存泄漏检测失败:', error);
    }

    return leaks;
  }

  /**
   * 计算内存增长趋势
   */
  private calculateMemoryTrend(): number {
    if (this.memorySnapshots.length < 2) return 0;

    const recent = this.memorySnapshots.slice(-5);
    const sum = recent.reduce((acc, val, index) => acc + val * index, 0);
    const sumIndex = recent.reduce((acc, _, index) => acc + index, 0);
    const sumValue = recent.reduce((acc, val) => acc + val, 0);
    const sumIndexSquared = recent.reduce((acc, _, index) => acc + index * index, 0);

    const n = recent.length;
    const slope = (n * sum - sumIndex * sumValue) / (n * sumIndexSquared - sumIndex * sumIndex);

    return slope;
  }

  /**
   * 检测性能问题
   */
  private detectPerformanceIssues(): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    try {
      // 检查长任务
      const longTasks = this.performanceHistory.filter(
        entry => entry.duration > this.config.performanceThreshold
      );

      longTasks.forEach(task => {
        issues.push({
          type: 'slow-function',
          description: `检测到长任务: ${task.name} 耗时 ${task.duration.toFixed(2)}ms`,
          severity: task.duration > 5000 ? 'critical' : task.duration > 2000 ? 'high' : 'medium',
          duration: task.duration,
          suggestions: [
            '将长任务分解为小任务',
            '使用 Web Workers 进行计算密集型操作',
            '使用 requestIdleCallback 进行非关键操作',
            '优化算法复杂度'
          ]
        });
      });

      // 检查主线程阻塞
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        const domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart;
        if (domContentLoaded > 1000) {
          issues.push({
            type: 'blocking-operation',
            description: `DOM 内容加载时间过长: ${domContentLoaded.toFixed(2)}ms`,
            severity: domContentLoaded > 3000 ? 'critical' : 'high',
            duration: domContentLoaded,
            suggestions: [
              '减少同步脚本执行',
              '延迟加载非关键资源',
              '优化 CSS 和 JavaScript 大小'
            ]
          });
        }
      }

      // 检查资源加载性能
      const resourceTimings = performance.getEntriesByType('resource');
      const slowResources = resourceTimings.filter(
        (resource: any) => resource.duration > 2000
      );

      slowResources.forEach((resource: any) => {
        issues.push({
          type: 'large-payload',
          description: `资源加载缓慢: ${resource.name} 耗时 ${resource.duration.toFixed(2)}ms`,
          severity: resource.duration > 10000 ? 'critical' : 'medium',
          duration: resource.duration,
          location: resource.name,
          suggestions: [
            '启用资源压缩',
            '使用 CDN 加速',
            '实施资源缓存策略',
            '考虑资源预加载'
          ]
        });
      });

    } catch (error) {
      console.error('性能问题检测失败:', error);
    }

    return issues;
  }

  /**
   * 检测安全问题
   */
  private detectSecurityIssues(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    try {
      // 检查不安全的 eval 使用
      const originalEval = window.eval;
      if (originalEval.toString().includes('native code')) {
        // eval 没有被重写，可能存在安全风险
        issues.push({
          type: 'unsafe-eval',
          description: '检测到可能的 eval 使用，存在代码注入风险',
          severity: 'high',
          suggestions: [
            '避免使用 eval() 函数',
            '使用 JSON.parse() 解析数据',
            '实施内容安全策略 (CSP)'
          ]
        });
      }

      // 检查不安全的随机数生成
      if (typeof (window as any).crypto === 'undefined') {
        issues.push({
          type: 'insecure-random',
          description: 'Web Crypto API 不可用，可能使用不安全的随机数生成',
          severity: 'medium',
          suggestions: [
            '使用 crypto.getRandomValues() 生成安全随机数',
            '避免使用 Math.random() 进行安全相关操作'
          ]
        });
      }

      // 检查潜在的数据暴露
      const globalVars = Object.keys(window).filter(key => 
        key.includes('token') || 
        key.includes('key') || 
        key.includes('secret') ||
        key.includes('password')
      );

      if (globalVars.length > 0) {
        issues.push({
          type: 'data-exposure',
          description: `检测到可能的敏感数据暴露: ${globalVars.join(', ')}`,
          severity: 'critical',
          suggestions: [
            '避免在全局作用域存储敏感数据',
            '使用安全的存储机制',
            '实施数据加密'
          ]
        });
      }

    } catch (error) {
      console.error('安全问题检测失败:', error);
    }

    return issues;
  }

  /**
   * 检测代码异味
   */
  private detectCodeSmells(): CodeSmell[] {
    const smells: CodeSmell[] = [];

    try {
      // 检查全局变量过多
      const globalVarCount = Object.keys(window).filter(key => 
        !key.startsWith('webkit') && 
        !key.startsWith('moz') && 
        !key.startsWith('ms') &&
        typeof (window as any)[key] !== 'function' ||
        key.includes('tf') ||
        key.includes('pose')
      ).length;

      if (globalVarCount > 50) {
        smells.push({
          type: 'god-object',
          description: `全局变量过多: ${globalVarCount}`,
          severity: globalVarCount > 100 ? 'high' : 'medium',
          suggestions: [
            '使用模块化设计减少全局变量',
            '实施命名空间模式',
            '使用依赖注入'
          ]
        });
      }

      // 检查事件监听器过多
      const eventTargets = document.querySelectorAll('*');
      let totalListeners = 0;
      eventTargets.forEach(element => {
        const listeners = (element as any)._listeners;
        if (listeners) {
          totalListeners += Object.keys(listeners).length;
        }
      });

      if (totalListeners > 1000) {
        smells.push({
          type: 'large-class',
          description: `事件监听器过多: ${totalListeners}`,
          severity: 'medium',
          suggestions: [
            '使用事件委托减少监听器数量',
            '及时移除不需要的监听器',
            '使用弱引用避免内存泄漏'
          ]
        });
      }

    } catch (error) {
      console.error('代码异味检测失败:', error);
    }

    return smells;
  }

  /**
   * 获取严重问题
   */
  private getCriticalIssues(metrics: CodeQualityMetrics): string[] {
    const issues: string[] = [];

    metrics.memoryLeaks.forEach(leak => {
      if (leak.severity === 'critical') {
        issues.push(`内存泄漏: ${leak.description}`);
      }
    });

    metrics.performanceIssues.forEach(issue => {
      if (issue.severity === 'critical') {
        issues.push(`性能问题: ${issue.description}`);
      }
    });

    metrics.securityIssues.forEach(issue => {
      if (issue.severity === 'critical') {
        issues.push(`安全问题: ${issue.description}`);
      }
    });

    return issues;
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.recordError(event.error?.message || event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(event.reason?.message || String(event.reason));
    });
  }

  /**
   * 记录错误模式
   */
  private recordError(errorMessage: string): void {
    if (!this.config.enableErrorPatternAnalysis) return;

    const pattern = this.extractErrorPattern(errorMessage);
    const existing = this.errorHistory.get(pattern);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = Date.now();
    } else {
      this.errorHistory.set(pattern, {
        pattern,
        count: 1,
        lastOccurrence: Date.now(),
        severity: this.categorizeErrorSeverity(pattern),
        suggestions: this.getErrorSuggestions(pattern)
      });
    }
  }

  /**
   * 提取错误模式
   */
  private extractErrorPattern(errorMessage: string): string {
    // 简化错误消息，提取模式
    return errorMessage
      .replace(/\d+/g, 'N') // 替换数字
      .replace(/https?:\/\/[^\s]+/g, 'URL') // 替换URL
      .replace(/['"]/g, '') // 移除引号
      .toLowerCase();
  }

  /**
   * 分类错误严重程度
   */
  private categorizeErrorSeverity(pattern: string): ErrorPattern['severity'] {
    if (pattern.includes('network') || pattern.includes('fetch')) {
      return 'medium';
    }
    if (pattern.includes('memory') || pattern.includes('out of')) {
      return 'critical';
    }
    if (pattern.includes('worker') || pattern.includes('importscripts')) {
      return 'high';
    }
    return 'low';
  }

  /**
   * 获取错误建议
   */
  private getErrorSuggestions(pattern: string): string[] {
    const suggestions: string[] = [];

    if (pattern.includes('network')) {
      suggestions.push('检查网络连接', '实施重试机制', '添加离线支持');
    }
    if (pattern.includes('memory')) {
      suggestions.push('释放未使用的资源', '优化内存使用', '实施内存监控');
    }
    if (pattern.includes('worker')) {
      suggestions.push('检查 Worker 脚本路径', '验证 Worker 兼容性', '添加 Worker 错误处理');
    }

    return suggestions;
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // 监控长任务
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          this.performanceHistory.push(...entries);
          
          // 保留最近100个条目
          if (this.performanceHistory.length > 100) {
            this.performanceHistory = this.performanceHistory.slice(-100);
          }
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('性能监控设置失败:', error);
      }
    }
  }

  /**
   * 生成质量报告
   */
  generateQualityReport(metrics: CodeQualityMetrics): string {
    const report = ['# 代码质量报告\n'];
    
    report.push(`**检查时间**: ${new Date(metrics.timestamp).toLocaleString()}`);
    report.push(`**运行时间**: ${Math.round((metrics.timestamp - this.startTime) / 1000 / 60)} 分钟\n`);

    // 内存泄漏
    if (metrics.memoryLeaks.length > 0) {
      report.push('## 🔴 内存泄漏');
      metrics.memoryLeaks.forEach(leak => {
        report.push(`- **${leak.type}**: ${leak.description} (${leak.severity})`);
        leak.suggestions.forEach(suggestion => {
          report.push(`  - ${suggestion}`);
        });
      });
      report.push('');
    }

    // 性能问题
    if (metrics.performanceIssues.length > 0) {
      report.push('## ⚡ 性能问题');
      metrics.performanceIssues.forEach(issue => {
        report.push(`- **${issue.type}**: ${issue.description} (${issue.severity})`);
        issue.suggestions.forEach(suggestion => {
          report.push(`  - ${suggestion}`);
        });
      });
      report.push('');
    }

    // 安全问题
    if (metrics.securityIssues.length > 0) {
      report.push('## 🔒 安全问题');
      metrics.securityIssues.forEach(issue => {
        report.push(`- **${issue.type}**: ${issue.description} (${issue.severity})`);
        issue.suggestions.forEach(suggestion => {
          report.push(`  - ${suggestion}`);
        });
      });
      report.push('');
    }

    // 错误模式
    if (metrics.errorPatterns.length > 0) {
      report.push('## 🐛 错误模式');
      metrics.errorPatterns.forEach(pattern => {
        report.push(`- **${pattern.pattern}**: 出现 ${pattern.count} 次 (${pattern.severity})`);
        pattern.suggestions.forEach(suggestion => {
          report.push(`  - ${suggestion}`);
        });
      });
      report.push('');
    }

    // 代码异味
    if (metrics.codeSmells.length > 0) {
      report.push('## 👃 代码异味');
      metrics.codeSmells.forEach(smell => {
        report.push(`- **${smell.type}**: ${smell.description} (${smell.severity})`);
        smell.suggestions.forEach(suggestion => {
          report.push(`  - ${suggestion}`);
        });
      });
    }

    if (metrics.memoryLeaks.length === 0 && 
        metrics.performanceIssues.length === 0 && 
        metrics.securityIssues.length === 0 && 
        metrics.errorPatterns.length === 0 && 
        metrics.codeSmells.length === 0) {
      report.push('## ✅ 未发现质量问题\n代码质量良好！');
    }

    return report.join('\n');
  }
}

/**
 * 全局代码质量检查器实例
 */
export const codeQualityChecker = new CodeQualityChecker();