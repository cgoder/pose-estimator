/**
 * 性能仪表板单元测试
 * 测试实时性能监控、数据可视化和警报功能
 */

import { jest } from '@jest/globals';
import {
  MetricType,
  AlertLevel,
  ChartType,
  PerformanceMetric,
  PerformanceDashboard
} from '../../src/components/PerformanceDashboard.js';

// Mock Chart.js
const mockChart = {
  update: jest.fn(),
  destroy: jest.fn(),
  resize: jest.fn(),
  data: {
    labels: [],
    datasets: []
  },
  options: {}
};

global.Chart = jest.fn(() => mockChart);
Chart.register = jest.fn();

// Mock DOM elements
const mockElement = {
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
    toggle: jest.fn()
  },
  style: {},
  innerHTML: '',
  textContent: '',
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  remove: jest.fn(),
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [mockElement]),
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn()
  }))
};

global.document = {
  createElement: jest.fn(() => mockElement),
  getElementById: jest.fn(() => mockElement),
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [mockElement]),
  body: mockElement
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

describe('PerformanceMetric', () => {
  let metric;

  beforeEach(() => {
    metric = new PerformanceMetric(MetricType.FPS, 'FPS', 60);
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化性能指标', () => {
      expect(metric.type).toBe(MetricType.FPS);
      expect(metric.name).toBe('FPS');
      expect(metric.target).toBe(60);
      expect(metric.values).toEqual([]);
      expect(metric.alertLevel).toBe(AlertLevel.NORMAL);
    });

    test('应该设置默认配置', () => {
      expect(metric.maxValues).toBe(100);
      expect(metric.thresholds.warning).toBe(48); // 80% of 60
      expect(metric.thresholds.critical).toBe(36); // 60% of 60
    });
  });

  describe('数值管理', () => {
    test('应该正确添加新值', () => {
      const timestamp = Date.now();
      metric.addValue(55, timestamp);

      expect(metric.values).toHaveLength(1);
      expect(metric.values[0]).toEqual({
        value: 55,
        timestamp
      });
      expect(metric.currentValue).toBe(55);
    });

    test('应该限制存储的值数量', () => {
      metric.setMaxValues(3);

      for (let i = 0; i < 5; i++) {
        metric.addValue(i * 10);
      }

      expect(metric.values).toHaveLength(3);
      expect(metric.values[0].value).toBe(20); // 最旧的值被移除
      expect(metric.values[2].value).toBe(40);
    });

    test('应该获取最近的值', () => {
      metric.addValue(10);
      metric.addValue(20);
      metric.addValue(30);

      const recent = metric.getRecentValues(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].value).toBe(20);
      expect(recent[1].value).toBe(30);
    });

    test('应该获取时间范围内的值', () => {
      const now = Date.now();
      metric.addValue(10, now - 3000);
      metric.addValue(20, now - 2000);
      metric.addValue(30, now - 1000);
      metric.addValue(40, now);

      const rangeValues = metric.getValuesInRange(now - 2500, now - 500);
      expect(rangeValues).toHaveLength(2);
      expect(rangeValues[0].value).toBe(20);
      expect(rangeValues[1].value).toBe(30);
    });
  });

  describe('统计计算', () => {
    beforeEach(() => {
      metric.addValue(10);
      metric.addValue(20);
      metric.addValue(30);
      metric.addValue(40);
      metric.addValue(50);
    });

    test('应该计算平均值', () => {
      const stats = metric.getStatistics();
      expect(stats.average).toBe(30);
    });

    test('应该计算最小值和最大值', () => {
      const stats = metric.getStatistics();
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
    });

    test('应该计算标准差', () => {
      const stats = metric.getStatistics();
      expect(stats.standardDeviation).toBeCloseTo(15.81, 2);
    });

    test('应该计算百分位数', () => {
      const stats = metric.getStatistics();
      expect(stats.percentiles.p50).toBe(30); // 中位数
      expect(stats.percentiles.p95).toBe(50);
      expect(stats.percentiles.p99).toBe(50);
    });
  });

  describe('警报级别', () => {
    test('应该根据阈值更新警报级别', () => {
      // 正常值
      metric.addValue(55);
      expect(metric.alertLevel).toBe(AlertLevel.NORMAL);

      // 警告值
      metric.addValue(45);
      expect(metric.alertLevel).toBe(AlertLevel.WARNING);

      // 严重值
      metric.addValue(30);
      expect(metric.alertLevel).toBe(AlertLevel.CRITICAL);
    });

    test('应该自定义阈值', () => {
      metric.setThresholds({ warning: 50, critical: 30 });

      metric.addValue(45);
      expect(metric.alertLevel).toBe(AlertLevel.WARNING);

      metric.addValue(25);
      expect(metric.alertLevel).toBe(AlertLevel.CRITICAL);
    });
  });

  describe('数据聚合', () => {
    test('应该按时间间隔聚合数据', () => {
      const now = Date.now();
      const interval = 1000; // 1秒

      // 添加不同时间的数据
      metric.addValue(10, now - 2500);
      metric.addValue(15, now - 2000);
      metric.addValue(20, now - 1500);
      metric.addValue(25, now - 1000);
      metric.addValue(30, now - 500);
      metric.addValue(35, now);

      const aggregated = metric.aggregateByInterval(interval);

      expect(aggregated.length).toBeGreaterThan(0);
      expect(aggregated[0]).toHaveProperty('timestamp');
      expect(aggregated[0]).toHaveProperty('value');
      expect(aggregated[0]).toHaveProperty('count');
    });

    test('应该支持不同的聚合方法', () => {
      const now = Date.now();
      metric.addValue(10, now - 500);
      metric.addValue(20, now - 400);
      metric.addValue(30, now - 300);

      const avgAggregated = metric.aggregateByInterval(1000, 'average');
      const maxAggregated = metric.aggregateByInterval(1000, 'max');
      const minAggregated = metric.aggregateByInterval(1000, 'min');

      expect(avgAggregated[0].value).toBe(20);
      expect(maxAggregated[0].value).toBe(30);
      expect(minAggregated[0].value).toBe(10);
    });
  });

  describe('重置功能', () => {
    test('应该重置所有数据', () => {
      metric.addValue(10);
      metric.addValue(20);
      metric.addValue(30);

      expect(metric.values).toHaveLength(3);
      expect(metric.currentValue).toBe(30);

      metric.reset();

      expect(metric.values).toHaveLength(0);
      expect(metric.currentValue).toBeNull();
      expect(metric.alertLevel).toBe(AlertLevel.NORMAL);
    });
  });
});

describe('PerformanceDashboard', () => {
  let dashboard;
  let mockContainer;
  let mockCallback;

  beforeEach(() => {
    mockContainer = mockElement;
    dashboard = new PerformanceDashboard(mockContainer);
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    dashboard.destroy();
  });

  describe('初始化', () => {
    test('应该正确初始化仪表板', () => {
      expect(dashboard.container).toBe(mockContainer);
      expect(dashboard.metrics).toBeInstanceOf(Map);
      expect(dashboard.charts).toBeInstanceOf(Map);
      expect(dashboard.alerts).toBeInstanceOf(Map);
      expect(dashboard.isInitialized).toBe(true);
    });

    test('应该创建默认指标', () => {
      expect(dashboard.metrics.has(MetricType.FPS)).toBe(true);
      expect(dashboard.metrics.has(MetricType.MEMORY_USAGE)).toBe(true);
      expect(dashboard.metrics.has(MetricType.CPU_USAGE)).toBe(true);
      expect(dashboard.metrics.has(MetricType.INFERENCE_TIME)).toBe(true);
    });

    test('应该创建UI元素', () => {
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });
  });

  describe('指标管理', () => {
    test('应该添加自定义指标', () => {
      const customMetric = new PerformanceMetric(
        'CUSTOM_METRIC',
        '自定义指标',
        100
      );

      dashboard.addMetric(customMetric);

      expect(dashboard.metrics.has('CUSTOM_METRIC')).toBe(true);
      expect(dashboard.metrics.get('CUSTOM_METRIC')).toBe(customMetric);
    });

    test('应该移除指标', () => {
      dashboard.removeMetric(MetricType.FPS);

      expect(dashboard.metrics.has(MetricType.FPS)).toBe(false);
    });

    test('应该更新指标数据', () => {
      dashboard.updateMetric(MetricType.FPS, 58);

      const fpsMetric = dashboard.metrics.get(MetricType.FPS);
      expect(fpsMetric.currentValue).toBe(58);
    });

    test('应该批量更新指标', () => {
      const updates = {
        [MetricType.FPS]: 55,
        [MetricType.MEMORY_USAGE]: 75,
        [MetricType.CPU_USAGE]: 45
      };

      dashboard.updateMetrics(updates);

      expect(dashboard.metrics.get(MetricType.FPS).currentValue).toBe(55);
      expect(dashboard.metrics.get(MetricType.MEMORY_USAGE).currentValue).toBe(75);
      expect(dashboard.metrics.get(MetricType.CPU_USAGE).currentValue).toBe(45);
    });
  });

  describe('图表管理', () => {
    test('应该创建指标图表', () => {
      const chartConfig = {
        type: ChartType.LINE,
        title: '帧率监控',
        showLegend: true,
        showGrid: true
      };

      dashboard.createChart(MetricType.FPS, chartConfig);

      expect(dashboard.charts.has(MetricType.FPS)).toBe(true);
      expect(Chart).toHaveBeenCalled();
    });

    test('应该更新图表数据', () => {
      dashboard.createChart(MetricType.FPS, { type: ChartType.LINE });
      dashboard.updateMetric(MetricType.FPS, 58);

      dashboard._updateCharts();

      const chart = dashboard.charts.get(MetricType.FPS);
      expect(chart.update).toHaveBeenCalled();
    });

    test('应该支持不同类型的图表', () => {
      dashboard.createChart(MetricType.FPS, { type: ChartType.LINE });
      dashboard.createChart(MetricType.MEMORY_USAGE, { type: ChartType.BAR });
      dashboard.createChart(MetricType.CPU_USAGE, { type: ChartType.AREA });

      expect(dashboard.charts.size).toBe(3);
    });

    test('应该调整图表大小', () => {
      dashboard.createChart(MetricType.FPS, { type: ChartType.LINE });
      
      dashboard._resizeCharts();

      const chart = dashboard.charts.get(MetricType.FPS);
      expect(chart.resize).toHaveBeenCalled();
    });
  });

  describe('警报管理', () => {
    test('应该创建警报', () => {
      const alertConfig = {
        title: 'FPS过低警报',
        message: '帧率低于预期值',
        level: AlertLevel.WARNING,
        persistent: false
      };

      const alertId = dashboard.createAlert(MetricType.FPS, alertConfig);

      expect(alertId).toBeDefined();
      expect(dashboard.alerts.has(alertId)).toBe(true);
    });

    test('应该根据指标状态自动创建警报', () => {
      dashboard.updateMetric(MetricType.FPS, 30); // 触发严重警报

      dashboard._updateAlerts();

      // 检查是否创建了警报
      const fpsMetric = dashboard.metrics.get(MetricType.FPS);
      expect(fpsMetric.alertLevel).toBe(AlertLevel.CRITICAL);
    });

    test('应该隐藏警报', () => {
      const alertId = dashboard.createAlert(MetricType.FPS, {
        title: '测试警报',
        level: AlertLevel.WARNING
      });

      dashboard.hideAlert(alertId);

      expect(dashboard.alerts.has(alertId)).toBe(false);
    });

    test('应该清除所有警报', () => {
      dashboard.createAlert(MetricType.FPS, { title: '警报1' });
      dashboard.createAlert(MetricType.MEMORY_USAGE, { title: '警报2' });

      expect(dashboard.alerts.size).toBe(2);

      dashboard.clearAlerts();

      expect(dashboard.alerts.size).toBe(0);
    });
  });

  describe('自动刷新', () => {
    test('应该启动自动刷新', () => {
      dashboard.startAutoRefresh(100);

      expect(dashboard.autoRefreshInterval).toBeDefined();
      expect(dashboard.isAutoRefreshing).toBe(true);
    });

    test('应该停止自动刷新', () => {
      dashboard.startAutoRefresh(100);
      dashboard.stopAutoRefresh();

      expect(dashboard.autoRefreshInterval).toBeNull();
      expect(dashboard.isAutoRefreshing).toBe(false);
    });

    test('应该暂停和恢复自动刷新', () => {
      dashboard.startAutoRefresh(100);
      
      dashboard.pauseAutoRefresh();
      expect(dashboard.isAutoRefreshing).toBe(false);
      
      dashboard.resumeAutoRefresh();
      expect(dashboard.isAutoRefreshing).toBe(true);
    });
  });

  describe('数据导出', () => {
    test('应该导出指标数据', () => {
      dashboard.updateMetric(MetricType.FPS, 58);
      dashboard.updateMetric(MetricType.MEMORY_USAGE, 75);

      const exportData = dashboard.exportData();

      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData.metrics[MetricType.FPS]).toBeDefined();
      expect(exportData.metrics[MetricType.MEMORY_USAGE]).toBeDefined();
    });

    test('应该导出特定时间范围的数据', () => {
      const now = Date.now();
      const startTime = now - 5000;
      const endTime = now;

      dashboard.updateMetric(MetricType.FPS, 58, now - 4000);
      dashboard.updateMetric(MetricType.FPS, 60, now - 2000);
      dashboard.updateMetric(MetricType.FPS, 55, now);

      const exportData = dashboard.exportData({
        startTime,
        endTime,
        metrics: [MetricType.FPS]
      });

      expect(exportData.metrics[MetricType.FPS].values.length).toBeGreaterThan(0);
    });

    test('应该导出为不同格式', () => {
      dashboard.updateMetric(MetricType.FPS, 58);

      const jsonData = dashboard.exportData({ format: 'json' });
      const csvData = dashboard.exportData({ format: 'csv' });

      expect(typeof jsonData).toBe('object');
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('timestamp');
    });
  });

  describe('配置管理', () => {
    test('应该更新仪表板配置', () => {
      const config = {
        refreshInterval: 500,
        maxDataPoints: 200,
        showGrid: false,
        theme: 'dark'
      };

      dashboard.updateConfig(config);

      expect(dashboard.config.refreshInterval).toBe(500);
      expect(dashboard.config.maxDataPoints).toBe(200);
      expect(dashboard.config.showGrid).toBe(false);
      expect(dashboard.config.theme).toBe('dark');
    });

    test('应该应用主题配置', () => {
      dashboard.setTheme('dark');

      expect(dashboard.config.theme).toBe('dark');
      expect(mockContainer.classList.add).toHaveBeenCalledWith('dark-theme');
    });
  });

  describe('事件处理', () => {
    test('应该触发指标更新事件', () => {
      dashboard.addEventListener('metricUpdated', mockCallback);

      dashboard.updateMetric(MetricType.FPS, 58);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MetricType.FPS,
          value: 58,
          metric: expect.any(PerformanceMetric)
        })
      );
    });

    test('应该触发警报事件', () => {
      dashboard.addEventListener('alertCreated', mockCallback);

      dashboard.updateMetric(MetricType.FPS, 30); // 触发严重警报
      dashboard._updateAlerts();

      expect(mockCallback).toHaveBeenCalled();
    });

    test('应该移除事件监听器', () => {
      dashboard.addEventListener('metricUpdated', mockCallback);
      dashboard.removeEventListener('metricUpdated', mockCallback);

      dashboard.updateMetric(MetricType.FPS, 58);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    test('应该限制数据点数量', () => {
      dashboard.updateConfig({ maxDataPoints: 5 });

      for (let i = 0; i < 10; i++) {
        dashboard.updateMetric(MetricType.FPS, 50 + i);
      }

      const fpsMetric = dashboard.metrics.get(MetricType.FPS);
      expect(fpsMetric.values.length).toBeLessThanOrEqual(5);
    });

    test('应该批量更新以提高性能', () => {
      const updateChartsSpy = jest.spyOn(dashboard, '_updateCharts');
      
      dashboard.startBatchUpdate();
      
      dashboard.updateMetric(MetricType.FPS, 58);
      dashboard.updateMetric(MetricType.MEMORY_USAGE, 75);
      dashboard.updateMetric(MetricType.CPU_USAGE, 45);
      
      dashboard.endBatchUpdate();

      expect(updateChartsSpy).toHaveBeenCalledTimes(1); // 只调用一次
    });
  });

  describe('响应式设计', () => {
    test('应该监听容器大小变化', () => {
      expect(ResizeObserver).toHaveBeenCalled();
      
      const resizeObserver = ResizeObserver.mock.instances[0];
      expect(resizeObserver.observe).toHaveBeenCalledWith(mockContainer);
    });

    test('应该在容器大小变化时调整布局', () => {
      const resizeChartsSpy = jest.spyOn(dashboard, '_resizeCharts');
      
      // 模拟容器大小变化
      const resizeObserver = ResizeObserver.mock.instances[0];
      const callback = ResizeObserver.mock.calls[0][0];
      
      callback([{ target: mockContainer }]);
      
      expect(resizeChartsSpy).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的指标类型', () => {
      expect(() => {
        dashboard.updateMetric('INVALID_METRIC', 100);
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('未知的指标类型')
      );
    });

    test('应该处理图表创建失败', () => {
      Chart.mockImplementationOnce(() => {
        throw new Error('图表创建失败');
      });

      expect(() => {
        dashboard.createChart(MetricType.FPS, { type: ChartType.LINE });
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('图表创建失败')
      );
    });

    test('应该处理数据导出错误', () => {
      // 模拟序列化错误
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('序列化失败');
      });

      const result = dashboard.exportData();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();

      // 恢复原始方法
      JSON.stringify = originalStringify;
    });
  });

  describe('内存管理', () => {
    test('应该正确清理资源', () => {
      dashboard.createChart(MetricType.FPS, { type: ChartType.LINE });
      dashboard.createChart(MetricType.MEMORY_USAGE, { type: ChartType.BAR });
      
      dashboard.destroy();

      // 验证图表被销毁
      dashboard.charts.forEach(chart => {
        expect(chart.destroy).toHaveBeenCalled();
      });

      // 验证事件监听器被移除
      const resizeObserver = ResizeObserver.mock.instances[0];
      expect(resizeObserver.disconnect).toHaveBeenCalled();

      expect(dashboard.isInitialized).toBe(false);
    });

    test('应该清理定时器', () => {
      dashboard.startAutoRefresh(100);
      
      const intervalId = dashboard.autoRefreshInterval;
      
      dashboard.destroy();
      
      expect(dashboard.autoRefreshInterval).toBeNull();
    });
  });
});

// 集成测试
describe('PerformanceDashboard 集成测试', () => {
  let dashboard;
  let mockContainer;

  beforeEach(() => {
    mockContainer = mockElement;
    dashboard = new PerformanceDashboard(mockContainer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    dashboard.destroy();
  });

  test('应该完整地监控性能指标', async () => {
    // 配置仪表板
    dashboard.updateConfig({
      refreshInterval: 100,
      maxDataPoints: 50
    });

    // 创建图表
    dashboard.createChart(MetricType.FPS, {
      type: ChartType.LINE,
      title: 'FPS监控'
    });

    dashboard.createChart(MetricType.MEMORY_USAGE, {
      type: ChartType.AREA,
      title: '内存使用率'
    });

    // 启动自动刷新
    dashboard.startAutoRefresh(50);

    // 模拟性能数据更新
    const updates = [
      { [MetricType.FPS]: 60, [MetricType.MEMORY_USAGE]: 45 },
      { [MetricType.FPS]: 58, [MetricType.MEMORY_USAGE]: 50 },
      { [MetricType.FPS]: 55, [MetricType.MEMORY_USAGE]: 55 },
      { [MetricType.FPS]: 30, [MetricType.MEMORY_USAGE]: 80 } // 触发警报
    ];

    for (const update of updates) {
      dashboard.updateMetrics(update);
      await new Promise(resolve => setTimeout(resolve, 60));
    }

    // 验证数据被正确记录
    const fpsMetric = dashboard.metrics.get(MetricType.FPS);
    const memoryMetric = dashboard.metrics.get(MetricType.MEMORY_USAGE);

    expect(fpsMetric.values.length).toBe(4);
    expect(memoryMetric.values.length).toBe(4);
    expect(fpsMetric.currentValue).toBe(30);
    expect(memoryMetric.currentValue).toBe(80);

    // 验证警报被触发
    expect(fpsMetric.alertLevel).toBe(AlertLevel.CRITICAL);
    expect(memoryMetric.alertLevel).toBe(AlertLevel.WARNING);

    // 验证图表被更新
    dashboard.charts.forEach(chart => {
      expect(chart.update).toHaveBeenCalled();
    });

    // 导出数据验证
    const exportData = dashboard.exportData();
    expect(exportData.metrics[MetricType.FPS].values.length).toBe(4);
    expect(exportData.metrics[MetricType.MEMORY_USAGE].values.length).toBe(4);

    dashboard.stopAutoRefresh();
  });

  test('应该处理复杂的警报场景', () => {
    const alertCallback = jest.fn();
    dashboard.addEventListener('alertCreated', alertCallback);
    dashboard.addEventListener('alertResolved', alertCallback);

    // 触发警报
    dashboard.updateMetric(MetricType.FPS, 30); // 严重警报
    dashboard.updateMetric(MetricType.MEMORY_USAGE, 85); // 严重警报
    dashboard.updateMetric(MetricType.CPU_USAGE, 45); // 警告

    dashboard._updateAlerts();

    // 验证警报被创建
    expect(alertCallback).toHaveBeenCalled();

    // 恢复正常值
    dashboard.updateMetric(MetricType.FPS, 60);
    dashboard.updateMetric(MetricType.MEMORY_USAGE, 40);
    dashboard.updateMetric(MetricType.CPU_USAGE, 20);

    dashboard._updateAlerts();

    // 验证警报级别恢复正常
    expect(dashboard.metrics.get(MetricType.FPS).alertLevel).toBe(AlertLevel.NORMAL);
    expect(dashboard.metrics.get(MetricType.MEMORY_USAGE).alertLevel).toBe(AlertLevel.NORMAL);
    expect(dashboard.metrics.get(MetricType.CPU_USAGE).alertLevel).toBe(AlertLevel.NORMAL);
  });
});