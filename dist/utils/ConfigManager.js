/**
 * 高级配置管理系统
 * 支持环境变量、动态配置、配置验证和热重载
 */
export class ConfigManager {
    constructor(initialConfig = {}) {
        this.config = {};
        this.schema = {};
        this.listeners = [];
        this.watchers = new Map();
        this.validationErrors = [];
        this.config = { ...initialConfig };
        this.setupDefaultSchema();
        this.loadFromEnvironment();
    }
    /**
     * 设置默认配置模式
     */
    setupDefaultSchema() {
        this.schema = {
            // TensorFlow.js 配置
            'tensorflow.backend': {
                type: 'string',
                default: 'webgl',
                validator: (value) => ['webgl', 'cpu', 'wasm'].includes(value),
                description: 'TensorFlow.js 后端类型',
                env: 'TFJS_BACKEND'
            },
            'tensorflow.debug': {
                type: 'boolean',
                default: false,
                description: '是否启用 TensorFlow.js 调试模式',
                env: 'TFJS_DEBUG'
            },
            // 模型配置
            'model.type': {
                type: 'string',
                default: 'MoveNet',
                validator: (value) => ['MoveNet', 'PoseNet', 'BlazePose'].includes(value),
                description: '默认姿态估计模型',
                env: 'MODEL_TYPE'
            },
            'model.precision': {
                type: 'string',
                default: 'lightning',
                validator: (value) => ['lightning', 'thunder'].includes(value),
                description: 'MoveNet 模型精度',
                env: 'MODEL_PRECISION'
            },
            'model.cacheSize': {
                type: 'number',
                default: 100,
                validator: (value) => value > 0 && value <= 1000,
                description: '模型缓存大小（MB）',
                env: 'MODEL_CACHE_SIZE'
            },
            // Worker 配置
            'worker.enabled': {
                type: 'boolean',
                default: true,
                description: '是否启用 Web Worker',
                env: 'WORKER_ENABLED'
            },
            'worker.poolSize': {
                type: 'number',
                default: 4,
                validator: (value) => value > 0 && value <= 16,
                description: 'Worker 池大小',
                env: 'WORKER_POOL_SIZE'
            },
            'worker.timeout': {
                type: 'number',
                default: 30000,
                validator: (value) => value > 0,
                description: 'Worker 超时时间（毫秒）',
                env: 'WORKER_TIMEOUT'
            },
            // 性能配置
            'performance.maxFPS': {
                type: 'number',
                default: 30,
                validator: (value) => value > 0 && value <= 60,
                description: '最大帧率',
                env: 'MAX_FPS'
            },
            'performance.enableProfiling': {
                type: 'boolean',
                default: false,
                description: '是否启用性能分析',
                env: 'ENABLE_PROFILING'
            },
            'performance.memoryThreshold': {
                type: 'number',
                default: 512,
                validator: (value) => value > 0,
                description: '内存使用阈值（MB）',
                env: 'MEMORY_THRESHOLD'
            },
            // UI 配置
            'ui.theme': {
                type: 'string',
                default: 'auto',
                validator: (value) => ['light', 'dark', 'auto'].includes(value),
                description: 'UI 主题',
                env: 'UI_THEME'
            },
            'ui.showDebugInfo': {
                type: 'boolean',
                default: false,
                description: '是否显示调试信息',
                env: 'SHOW_DEBUG_INFO'
            },
            // 分析配置
            'analysis.confidenceThreshold': {
                type: 'number',
                default: 0.3,
                validator: (value) => value >= 0 && value <= 1,
                description: '关键点置信度阈值',
                env: 'CONFIDENCE_THRESHOLD'
            },
            'analysis.smoothingEnabled': {
                type: 'boolean',
                default: true,
                description: '是否启用关键点平滑',
                env: 'SMOOTHING_ENABLED'
            },
            'analysis.oneEuroFilter.beta': {
                type: 'number',
                default: 0.007,
                validator: (value) => value > 0,
                description: 'One Euro Filter beta 参数',
                env: 'ONE_EURO_BETA'
            },
            // 网络配置
            'network.retryAttempts': {
                type: 'number',
                default: 3,
                validator: (value) => value >= 0 && value <= 10,
                description: '网络请求重试次数',
                env: 'RETRY_ATTEMPTS'
            },
            'network.timeout': {
                type: 'number',
                default: 10000,
                validator: (value) => value > 0,
                description: '网络请求超时时间（毫秒）',
                env: 'NETWORK_TIMEOUT'
            },
            // 开发配置
            'dev.enableHotReload': {
                type: 'boolean',
                default: false,
                description: '是否启用热重载',
                env: 'ENABLE_HOT_RELOAD'
            },
            'dev.logLevel': {
                type: 'string',
                default: 'info',
                validator: (value) => ['debug', 'info', 'warn', 'error'].includes(value),
                description: '日志级别',
                env: 'LOG_LEVEL'
            }
        };
    }
    /**
     * 从环境变量加载配置
     */
    loadFromEnvironment() {
        for (const [key, schema] of Object.entries(this.schema)) {
            if (schema.env) {
                const envValue = this.getEnvironmentVariable(schema.env);
                if (envValue !== undefined) {
                    const parsedValue = this.parseEnvironmentValue(envValue, schema.type);
                    this.set(key, parsedValue, false); // 不触发验证，稍后统一验证
                }
            }
        }
        this.validateAll();
    }
    /**
     * 获取环境变量
     */
    getEnvironmentVariable(name) {
        // 浏览器环境
        if (typeof window !== 'undefined' && window.ENV) {
            return window.ENV[name];
        }
        // Node.js 环境
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        return undefined;
    }
    /**
     * 解析环境变量值
     */
    parseEnvironmentValue(value, type) {
        switch (type) {
            case 'boolean':
                return value.toLowerCase() === 'true';
            case 'number':
                const num = Number(value);
                return isNaN(num) ? undefined : num;
            case 'object':
            case 'array':
                try {
                    return JSON.parse(value);
                }
                catch {
                    return undefined;
                }
            default:
                return value;
        }
    }
    /**
     * 设置配置值
     */
    set(key, value, validate = true) {
        const oldValue = this.config[key];
        if (validate && !this.validateValue(key, value)) {
            throw new Error(`Invalid value for config key "${key}": ${value}`);
        }
        this.config[key] = value;
        // 触发变更事件
        const event = {
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now()
        };
        this.listeners.forEach(listener => {
            try {
                listener(event);
            }
            catch (error) {
                console.error('Config change listener error:', error);
            }
        });
        // 触发特定键的监听器
        const keyWatchers = this.watchers.get(key);
        if (keyWatchers) {
            keyWatchers.forEach(watcher => {
                try {
                    watcher(value);
                }
                catch (error) {
                    console.error(`Config watcher error for key "${key}":`, error);
                }
            });
        }
    }
    /**
     * 获取配置值
     */
    get(key, defaultValue) {
        if (key in this.config) {
            return this.config[key];
        }
        // 从 schema 获取默认值
        const schema = this.schema[key];
        if (schema && 'default' in schema) {
            return schema.default;
        }
        return defaultValue;
    }
    /**
     * 检查配置键是否存在
     */
    has(key) {
        return key in this.config || key in this.schema;
    }
    /**
     * 批量设置配置
     */
    setMany(configs) {
        for (const [key, value] of Object.entries(configs)) {
            this.set(key, value);
        }
    }
    /**
     * 验证单个配置值
     */
    validateValue(key, value) {
        const schema = this.schema[key];
        if (!schema) {
            console.warn(`No schema found for config key: ${key}`);
            return true; // 允许未定义的配置
        }
        // 类型检查
        if (!this.checkType(value, schema.type)) {
            this.validationErrors.push(`Type mismatch for "${key}": expected ${schema.type}, got ${typeof value}`);
            return false;
        }
        // 自定义验证器
        if (schema.validator && !schema.validator(value)) {
            this.validationErrors.push(`Validation failed for "${key}": ${value}`);
            return false;
        }
        return true;
    }
    /**
     * 检查类型
     */
    checkType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            default:
                return true;
        }
    }
    /**
     * 验证所有配置
     */
    validateAll() {
        this.validationErrors = [];
        for (const [key, schema] of Object.entries(this.schema)) {
            if (schema.required && !(key in this.config)) {
                this.validationErrors.push(`Required config "${key}" is missing`);
                continue;
            }
            if (key in this.config) {
                this.validateValue(key, this.config[key]);
            }
        }
        if (this.validationErrors.length > 0) {
            console.error('Configuration validation errors:', this.validationErrors);
            return false;
        }
        return true;
    }
    /**
     * 获取验证错误
     */
    getValidationErrors() {
        return [...this.validationErrors];
    }
    /**
     * 监听配置变更
     */
    onChange(listener) {
        this.listeners.push(listener);
        // 返回取消监听的函数
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    /**
     * 监听特定键的变更
     */
    watch(key, watcher) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, []);
        }
        this.watchers.get(key).push(watcher);
        // 立即调用一次，传入当前值
        watcher(this.get(key));
        // 返回取消监听的函数
        return () => {
            const watchers = this.watchers.get(key);
            if (watchers) {
                const index = watchers.indexOf(watcher);
                if (index > -1) {
                    watchers.splice(index, 1);
                }
            }
        };
    }
    /**
     * 重置配置到默认值
     */
    reset(key) {
        if (key) {
            const schema = this.schema[key];
            if (schema && 'default' in schema) {
                this.set(key, schema.default);
            }
            else {
                delete this.config[key];
            }
        }
        else {
            // 重置所有配置
            this.config = {};
            for (const [configKey, schema] of Object.entries(this.schema)) {
                if ('default' in schema) {
                    this.config[configKey] = schema.default;
                }
            }
        }
    }
    /**
     * 导出配置
     */
    export(includeDefaults = false) {
        if (includeDefaults) {
            const result = {};
            for (const key of Object.keys(this.schema)) {
                result[key] = this.get(key);
            }
            return result;
        }
        return { ...this.config };
    }
    /**
     * 导入配置
     */
    import(configs, validate = true) {
        if (validate) {
            // 先验证所有配置
            const tempConfig = { ...this.config };
            for (const [key, value] of Object.entries(configs)) {
                if (!this.validateValue(key, value)) {
                    throw new Error(`Invalid configuration: ${this.validationErrors.join(', ')}`);
                }
                tempConfig[key] = value;
            }
        }
        // 批量设置
        this.setMany(configs);
    }
    /**
     * 获取配置模式信息
     */
    getSchema() {
        return { ...this.schema };
    }
    /**
     * 获取配置的可读描述
     */
    getDescription(key) {
        const schema = this.schema[key];
        return schema?.description || `Configuration for ${key}`;
    }
    /**
     * 生成配置文档
     */
    generateDocs() {
        let docs = '# Configuration Documentation\n\n';
        const categories = new Map();
        // 按类别分组
        for (const key of Object.keys(this.schema)) {
            const parts = key.split('.');
            const category = parts[0] || 'general'; // 明确类型注解，确保不为空
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(key);
        }
        // 生成文档
        for (const [category, keys] of categories) {
            docs += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
            for (const key of keys) {
                const schema = this.schema[key];
                if (!schema)
                    continue; // 跳过不存在的 schema
                docs += `### \`${key}\`\n\n`;
                docs += `- **Type**: ${schema.type}\n`;
                docs += `- **Default**: \`${JSON.stringify(schema.default)}\`\n`;
                docs += `- **Required**: ${schema.required ? 'Yes' : 'No'}\n`;
                if (schema.env) {
                    docs += `- **Environment Variable**: \`${schema.env}\`\n`;
                }
                if (schema.description) {
                    docs += `- **Description**: ${schema.description}\n`;
                }
                docs += '\n';
            }
        }
        return docs;
    }
}
// 全局配置管理器实例
export const globalConfig = new ConfigManager();
//# sourceMappingURL=ConfigManager.js.map