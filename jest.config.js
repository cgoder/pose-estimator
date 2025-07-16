/**
 * Jest 测试配置文件
 * 配置单元测试和集成测试环境
 */

export default {
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 模块类型
  preset: 'es6',
  
  // 支持 ES6 模块
  extensionsToTreatAsEsm: ['.js'],
  
  // 模块名映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // 覆盖率收集
  collectCoverage: true,
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // 覆盖率收集文件
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/index.js',
    '!src/main.js'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'ts',
    'tsx'
  ],
  
  // 转换配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(some-es6-module)/)',
    '\\.pnp\\.[^\\]+$'
  ],
  
  // 模块目录
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // 全局变量
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  
  // 清除模拟
  clearMocks: true,
  
  // 重置模拟
  resetMocks: true,
  
  // 恢复模拟
  restoreMocks: true,
  
  // 详细输出
  verbose: true,
  
  // 测试超时
  testTimeout: 10000,
  
  // 错误时停止
  bail: false,
  
  // 最大工作进程
  maxWorkers: '50%',
  
  // 缓存目录
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // 监听插件
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // 通知配置
  notify: true,
  notifyMode: 'failure-change',
  
  // 错误报告
  errorOnDeprecated: true,
  
  // 快照序列化器
  snapshotSerializers: [
    'jest-serializer-html'
  ],
  
  // 自定义解析器
  resolver: undefined,
  
  // 运行器
  runner: 'jest-runner',
  
  // 测试结果处理器
  testResultsProcessor: undefined,
  
  // 自定义环境选项
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // 强制退出
  forceExit: false,
  
  // 检测打开句柄
  detectOpenHandles: true,
  
  // 检测泄漏
  detectLeaks: false,
  
  // 项目配置（用于多项目设置）
  projects: undefined,
  
  // 依赖提取器
  dependencyExtractor: undefined,
  
  // 全局设置
  globalSetup: undefined,
  
  // 全局清理
  globalTeardown: undefined,
  
  // 哈希算法
  haste: {
    computeSha1: true,
    throwOnModuleCollision: true
  },
  
  // 最大并发数
  maxConcurrency: 5,
  
  // 预设
  preset: undefined,
  
  // 漂亮打印
  prettierPath: 'prettier',
  
  // 报告器
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true
      }
    ]
  ],
  
  // 根目录
  rootDir: undefined,
  
  // 根路径
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // 运行串行
  runInBand: false,
  
  // 设置文件
  setupFiles: [],
  
  // 慢测试阈值
  slowTestThreshold: 5,
  
  // 快照格式
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true
  },
  
  // 快照解析器
  snapshotResolver: undefined,
  
  // 测试位置在结果中
  testLocationInResults: false,
  
  // 测试名称模式
  testNamePattern: undefined,
  
  // 测试路径模式
  testPathPattern: [],
  
  // 测试正则表达式
  testRegex: [],
  
  // 测试运行器
  testRunner: 'jest-circus/runner',
  
  // 测试序列化器
  testSequencer: '@jest/test-sequencer',
  
  // 测试URL
  testURL: 'http://localhost',
  
  // 计时器
  timers: 'real',
  
  // 取消映射覆盖率
  unmockedModulePathPatterns: undefined,
  
  // 更新快照
  updateSnapshot: false,
  
  // 使用stderr
  useStderr: false,
  
  // 监听
  watch: false,
  
  // 监听所有
  watchAll: false,
  
  // 监听路径忽略模式
  watchPathIgnorePatterns: [],
  
  // 监听man
  watchman: true
};