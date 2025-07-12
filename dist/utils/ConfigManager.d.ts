/**
 * 高级配置管理系统
 * 支持环境变量、动态配置、配置验证和热重载
 */
export interface ConfigSchema {
    [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
        required?: boolean;
        default?: any;
        validator?: (value: any) => boolean;
        description?: string;
        env?: string;
    };
}
export interface ConfigChangeEvent {
    key: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
}
export declare class ConfigManager {
    private config;
    private schema;
    private listeners;
    private watchers;
    private validationErrors;
    constructor(initialConfig?: Record<string, any>);
    /**
     * 设置默认配置模式
     */
    private setupDefaultSchema;
    /**
     * 从环境变量加载配置
     */
    private loadFromEnvironment;
    /**
     * 获取环境变量
     */
    private getEnvironmentVariable;
    /**
     * 解析环境变量值
     */
    private parseEnvironmentValue;
    /**
     * 设置配置值
     */
    set(key: string, value: any, validate?: boolean): void;
    /**
     * 获取配置值
     */
    get<T = any>(key: string, defaultValue?: T): T;
    /**
     * 检查配置键是否存在
     */
    has(key: string): boolean;
    /**
     * 批量设置配置
     */
    setMany(configs: Record<string, any>): void;
    /**
     * 验证单个配置值
     */
    private validateValue;
    /**
     * 检查类型
     */
    private checkType;
    /**
     * 验证所有配置
     */
    validateAll(): boolean;
    /**
     * 获取验证错误
     */
    getValidationErrors(): string[];
    /**
     * 监听配置变更
     */
    onChange(listener: (event: ConfigChangeEvent) => void): () => void;
    /**
     * 监听特定键的变更
     */
    watch(key: string, watcher: (value: any) => void): () => void;
    /**
     * 重置配置到默认值
     */
    reset(key?: string): void;
    /**
     * 导出配置
     */
    export(includeDefaults?: boolean): Record<string, any>;
    /**
     * 导入配置
     */
    import(configs: Record<string, any>, validate?: boolean): void;
    /**
     * 获取配置模式信息
     */
    getSchema(): ConfigSchema;
    /**
     * 获取配置的可读描述
     */
    getDescription(key: string): string;
    /**
     * 生成配置文档
     */
    generateDocs(): string;
}
export declare const globalConfig: ConfigManager;
//# sourceMappingURL=ConfigManager.d.ts.map