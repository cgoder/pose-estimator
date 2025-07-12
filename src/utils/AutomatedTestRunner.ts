/**
 * 自动化测试工具
 * 提供端到端测试、性能测试和回归测试功能
 */

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'unit' | 'integration' | 'performance' | 'visual';
  setup?: () => Promise<void>;
  test: () => Promise<TestResult>;
  cleanup?: () => Promise<void>;
  timeout?: number;
  retries?: number;
}

export interface TestResult {
  passed: boolean;
  duration: number;
  error?: string;
  metrics?: Record<string, number>;
  screenshots?: string[];
  logs?: string[];
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
}

export interface PerformanceBenchmark {
  name: string;
  target: number; // 目标值
  tolerance: number; // 容差百分比
  unit: string;
}

export class AutomatedTestRunner {
  private testSuites: Map<string, TestSuite> = new Map();
  private results: Map<string, TestResult> = new Map();
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private isRunning = false;

  constructor() {
    this.setupDefaultBenchmarks();
    this.setupDefaultTests();
  }

  /**
   * 设置默认性能基准
   */
  private setupDefaultBenchmarks(): void {
    this.benchmarks.set('model_load_time', {
      name: '模型加载时间',
      target: 3000, // 3秒
      tolerance: 20, // 20%容差
      unit: 'ms'
    });

    this.benchmarks.set('inference_time', {
      name: '推理时间',
      target: 50, // 50ms
      tolerance: 30,
      unit: 'ms'
    });

    this.benchmarks.set('fps', {
      name: '帧率',
      target: 30,
      tolerance: 10,
      unit: 'fps'
    });

    this.benchmarks.set('memory_usage', {
      name: '内存使用',
      target: 512, // 512MB
      tolerance: 25,
      unit: 'MB'
    });
  }

  /**
   * 设置默认测试用例
   */
  private setupDefaultTests(): void {
    // 基础功能测试套件
    const basicTests: TestSuite = {
      name: '基础功能测试',
      tests: [
        {
          id: 'app_initialization',
          name: '应用初始化',
          description: '测试应用是否能正确初始化',
          category: 'integration',
          test: async () => {
            const startTime = performance.now();
            
            try {
              // 检查关键组件是否存在
              const app = (window as any).poseApp;
              if (!app) {
                throw new Error('PoseApp 未初始化');
              }

              // 检查 UI 元素
              const canvas = document.querySelector('canvas');
              if (!canvas) {
                throw new Error('Canvas 元素未找到');
              }

              const duration = performance.now() - startTime;
              return {
                passed: true,
                duration,
                metrics: { initTime: duration }
              };
            } catch (error) {
              return {
                passed: false,
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          }
        },
        {
          id: 'worker_creation',
          name: 'Worker 创建',
          description: '测试 Web Worker 是否能正确创建',
          category: 'unit',
          test: async () => {
            const startTime = performance.now();
            
            try {
              const worker = new Worker(new URL('../workers/pose-worker.js', import.meta.url));
              
              // 测试 Worker 通信
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Worker 响应超时')), 5000);
                
                worker.onmessage = (event) => {
                  clearTimeout(timeout);
                  worker.terminate();
                  resolve(event.data);
                };
                
                worker.onerror = (error) => {
                  clearTimeout(timeout);
                  worker.terminate();
                  reject(error);
                };
                
                worker.postMessage({ id: 'test', type: 'initialize' });
              });

              const duration = performance.now() - startTime;
              return {
                passed: true,
                duration,
                metrics: { workerInitTime: duration }
              };
            } catch (error) {
              return {
                passed: false,
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          }
        }
      ]
    };

    // 性能测试套件
    const performanceTests: TestSuite = {
      name: '性能测试',
      tests: [
        {
          id: 'model_loading_performance',
          name: '模型加载性能',
          description: '测试模型加载时间是否在可接受范围内',
          category: 'performance',
          timeout: 30000,
          test: async () => {
            const startTime = performance.now();
            
            try {
              // 模拟模型加载
              const app = (window as any).poseApp;
              if (!app || !app.workerManager) {
                throw new Error('应用或 Worker 管理器未初始化');
              }

              await app.workerManager.loadModel('MoveNet');
              const duration = performance.now() - startTime;
              
              const benchmark = this.benchmarks.get('model_load_time')!;
              const passed = this.checkBenchmark(duration, benchmark);

              return {
                passed,
                duration,
                metrics: { 
                  loadTime: duration,
                  benchmark: benchmark.target,
                  tolerance: benchmark.tolerance
                }
              };
            } catch (error) {
              return {
                passed: false,
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          }
        },
        {
          id: 'inference_performance',
          name: '推理性能',
          description: '测试单次推理时间',
          category: 'performance',
          test: async () => {
            const startTime = performance.now();
            
            try {
              // 创建测试图像数据
              const canvas = document.createElement('canvas');
              canvas.width = 640;
              canvas.height = 480;
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = 'rgb(100, 100, 100)';
              ctx.fillRect(0, 0, 640, 480);
              
              const imageData = ctx.getImageData(0, 0, 640, 480);
              
              const app = (window as any).poseApp;
              if (!app || !app.workerManager) {
                throw new Error('应用或 Worker 管理器未初始化');
              }

              const inferenceStart = performance.now();
              await app.workerManager.predict(imageData);
              const inferenceTime = performance.now() - inferenceStart;
              
              const benchmark = this.benchmarks.get('inference_time')!;
              const passed = this.checkBenchmark(inferenceTime, benchmark);

              return {
                passed,
                duration: performance.now() - startTime,
                metrics: { 
                  inferenceTime,
                  benchmark: benchmark.target,
                  tolerance: benchmark.tolerance
                }
              };
            } catch (error) {
              return {
                passed: false,
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          }
        }
      ]
    };

    // 视觉回归测试套件
    const visualTests: TestSuite = {
      name: '视觉回归测试',
      tests: [
        {
          id: 'ui_layout',
          name: 'UI 布局',
          description: '测试 UI 布局是否正确',
          category: 'visual',
          test: async () => {
            const startTime = performance.now();
            
            try {
              // 检查关键 UI 元素的位置和大小
              const canvas = document.querySelector('canvas');
              const controls = document.querySelector('.controls');
              
              if (!canvas || !controls) {
                throw new Error('关键 UI 元素缺失');
              }

              const canvasRect = canvas.getBoundingClientRect();
              const controlsRect = controls.getBoundingClientRect();
              
              // 检查布局合理性
              const layoutValid = canvasRect.width > 0 && 
                                canvasRect.height > 0 && 
                                controlsRect.width > 0;

              return {
                passed: layoutValid,
                duration: performance.now() - startTime,
                metrics: {
                  canvasWidth: canvasRect.width,
                  canvasHeight: canvasRect.height,
                  controlsWidth: controlsRect.width
                }
              };
            } catch (error) {
              return {
                passed: false,
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          }
        }
      ]
    };

    this.testSuites.set('basic', basicTests);
    this.testSuites.set('performance', performanceTests);
    this.testSuites.set('visual', visualTests);
  }

  /**
   * 检查性能基准
   */
  private checkBenchmark(value: number, benchmark: PerformanceBenchmark): boolean {
    const tolerance = benchmark.target * (benchmark.tolerance / 100);
    return value <= benchmark.target + tolerance;
  }

  /**
   * 添加测试套件
   */
  addTestSuite(name: string, suite: TestSuite): void {
    this.testSuites.set(name, suite);
  }

  /**
   * 运行单个测试
   */
  async runTest(test: TestCase): Promise<TestResult> {
    const timeout = test.timeout || 10000;
    const retries = test.retries || 0;
    
    let lastError: string | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 设置超时
        const timeoutPromise = new Promise<TestResult>((_, reject) => {
          setTimeout(() => reject(new Error('测试超时')), timeout);
        });

        // 执行设置
        if (test.setup) {
          await test.setup();
        }

        // 运行测试
        const testPromise = test.test();
        const result = await Promise.race([testPromise, timeoutPromise]);

        // 执行清理
        if (test.cleanup) {
          await test.cleanup();
        }

        // 如果测试通过，返回结果
        if (result.passed || attempt === retries) {
          return result;
        }
        
        lastError = result.error;
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        // 执行清理（即使测试失败）
        if (test.cleanup) {
          try {
            await test.cleanup();
          } catch (cleanupError) {
            console.warn('测试清理失败:', cleanupError);
          }
        }
        
        if (attempt === retries) {
          return {
            passed: false,
            duration: 0,
            error: lastError
          };
        }
      }
      
      // 重试前等待
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      passed: false,
      duration: 0,
      error: lastError || '未知错误'
    };
  }

  /**
   * 运行测试套件
   */
  async runTestSuite(suiteName: string): Promise<Map<string, TestResult>> {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`测试套件 "${suiteName}" 不存在`);
    }

    const results = new Map<string, TestResult>();

    try {
      // 执行套件前置操作
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // 运行所有测试
      for (const test of suite.tests) {
        console.log(`🧪 运行测试: ${test.name}`);
        const result = await this.runTest(test);
        results.set(test.id, result);
        
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${result.duration.toFixed(2)}ms`);
        
        if (!result.passed) {
          console.error(`   错误: ${result.error}`);
        }
      }

      // 执行套件后置操作
      if (suite.afterAll) {
        await suite.afterAll();
      }

    } catch (error) {
      console.error(`测试套件 "${suiteName}" 执行失败:`, error);
    }

    return results;
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<Map<string, Map<string, TestResult>>> {
    if (this.isRunning) {
      throw new Error('测试正在运行中');
    }

    this.isRunning = true;
    const allResults = new Map<string, Map<string, TestResult>>();

    try {
      console.log('🚀 开始运行所有测试...');
      
      for (const [suiteName, suite] of this.testSuites) {
        console.log(`\n📋 运行测试套件: ${suite.name}`);
        const suiteResults = await this.runTestSuite(suiteName);
        allResults.set(suiteName, suiteResults);
      }

      console.log('\n📊 测试完成，生成报告...');
      this.generateReport(allResults);

    } finally {
      this.isRunning = false;
    }

    return allResults;
  }

  /**
   * 生成测试报告
   */
  generateReport(results: Map<string, Map<string, TestResult>>): void {
    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;

    console.log('\n📈 测试报告');
    console.log('='.repeat(50));

    for (const [suiteName, suiteResults] of results) {
      const suite = this.testSuites.get(suiteName)!;
      let suitePassed = 0;
      let suiteDuration = 0;

      console.log(`\n📋 ${suite.name}`);
      console.log('-'.repeat(30));

      for (const [testId, result] of suiteResults) {
        const test = suite.tests.find(t => t.id === testId)!;
        const status = result.passed ? '✅' : '❌';
        
        console.log(`${status} ${test.name}: ${result.duration.toFixed(2)}ms`);
        
        if (result.metrics) {
          for (const [metric, value] of Object.entries(result.metrics)) {
            console.log(`   📊 ${metric}: ${value}`);
          }
        }
        
        if (!result.passed && result.error) {
          console.log(`   ❌ 错误: ${result.error}`);
        }

        totalTests++;
        suiteDuration += result.duration;
        
        if (result.passed) {
          passedTests++;
          suitePassed++;
        }
      }

      totalDuration += suiteDuration;
      console.log(`\n套件统计: ${suitePassed}/${suiteResults.size} 通过, 耗时: ${suiteDuration.toFixed(2)}ms`);
    }

    console.log('\n🎯 总体统计');
    console.log('-'.repeat(30));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过数: ${passedTests}`);
    console.log(`失败数: ${totalTests - passedTests}`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`总耗时: ${totalDuration.toFixed(2)}ms`);

    // 性能基准检查
    console.log('\n⚡ 性能基准检查');
    console.log('-'.repeat(30));
    for (const [, benchmark] of this.benchmarks) {
      console.log(`${benchmark.name}: 目标 ${benchmark.target}${benchmark.unit} (±${benchmark.tolerance}%)`);
    }
  }

  /**
   * 添加性能基准
   */
  addBenchmark(name: string, benchmark: PerformanceBenchmark): void {
    this.benchmarks.set(name, benchmark);
  }

  /**
   * 获取测试历史
   */
  getTestHistory(): Map<string, TestResult> {
    return new Map(this.results);
  }

  /**
   * 清除测试历史
   */
  clearHistory(): void {
    this.results.clear();
  }

  /**
   * 导出测试报告
   */
  exportReport(results: Map<string, Map<string, TestResult>>): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: results.size,
        totalTests: Array.from(results.values()).reduce((sum, suite) => sum + suite.size, 0),
        passedTests: Array.from(results.values()).reduce((sum, suite) => 
          sum + Array.from(suite.values()).filter(r => r.passed).length, 0
        )
      },
      suites: Object.fromEntries(
        Array.from(results.entries()).map(([name, suiteResults]) => [
          name,
          Object.fromEntries(suiteResults)
        ])
      ),
      benchmarks: Object.fromEntries(this.benchmarks)
    };

    return JSON.stringify(report, null, 2);
  }
}

// 全局测试运行器实例
export const globalTestRunner = new AutomatedTestRunner();