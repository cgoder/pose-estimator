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
    target: number;
    tolerance: number;
    unit: string;
}
export declare class AutomatedTestRunner {
    private testSuites;
    private results;
    private benchmarks;
    private isRunning;
    constructor();
    /**
     * 设置默认性能基准
     */
    private setupDefaultBenchmarks;
    /**
     * 设置默认测试用例
     */
    private setupDefaultTests;
    /**
     * 检查性能基准
     */
    private checkBenchmark;
    /**
     * 添加测试套件
     */
    addTestSuite(name: string, suite: TestSuite): void;
    /**
     * 运行单个测试
     */
    runTest(test: TestCase): Promise<TestResult>;
    /**
     * 运行测试套件
     */
    runTestSuite(suiteName: string): Promise<Map<string, TestResult>>;
    /**
     * 运行所有测试
     */
    runAllTests(): Promise<Map<string, Map<string, TestResult>>>;
    /**
     * 生成测试报告
     */
    generateReport(results: Map<string, Map<string, TestResult>>): void;
    /**
     * 添加性能基准
     */
    addBenchmark(name: string, benchmark: PerformanceBenchmark): void;
    /**
     * 获取测试历史
     */
    getTestHistory(): Map<string, TestResult>;
    /**
     * 清除测试历史
     */
    clearHistory(): void;
    /**
     * 导出测试报告
     */
    exportReport(results: Map<string, Map<string, TestResult>>): string;
}
export declare const globalTestRunner: AutomatedTestRunner;
//# sourceMappingURL=AutomatedTestRunner.d.ts.map