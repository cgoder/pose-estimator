/**
 * DIContainer - 依赖注入容器
 * 提供依赖注入和服务定位功能，用于管理模块间的依赖关系
 */
class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.aliases = new Map();
        this.resolving = new Set(); // 防止循环依赖
    }

    /**
     * 注册单例服务
     * @param {string} name - 服务名称
     * @param {Function|Object} serviceOrFactory - 服务实例或工厂函数
     * @param {Object} options - 选项
     */
    singleton(name, serviceOrFactory, options = {}) {
        this.validateServiceName(name);
        
        const registration = {
            type: 'singleton',
            factory: typeof serviceOrFactory === 'function' ? serviceOrFactory : () => serviceOrFactory,
            dependencies: options.dependencies || [],
            lazy: options.lazy !== false, // 默认懒加载
            tags: options.tags || [],
            metadata: options.metadata || {}
        };

        this.services.set(name, registration);
        
        // 如果不是懒加载，立即创建实例
        if (!registration.lazy) {
            this.resolve(name);
        }

        return this;
    }

    /**
     * 注册瞬态服务（每次解析都创建新实例）
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     * @param {Object} options - 选项
     */
    transient(name, factory, options = {}) {
        this.validateServiceName(name);
        
        if (typeof factory !== 'function') {
            throw new Error(`DIContainer: Factory for transient service "${name}" must be a function`);
        }

        const registration = {
            type: 'transient',
            factory,
            dependencies: options.dependencies || [],
            tags: options.tags || [],
            metadata: options.metadata || {}
        };

        this.services.set(name, registration);
        return this;
    }

    /**
     * 注册工厂服务
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     * @param {Object} options - 选项
     */
    factory(name, factory, options = {}) {
        this.validateServiceName(name);
        
        if (typeof factory !== 'function') {
            throw new Error(`DIContainer: Factory for service "${name}" must be a function`);
        }

        const registration = {
            type: 'factory',
            factory,
            dependencies: options.dependencies || [],
            tags: options.tags || [],
            metadata: options.metadata || {}
        };

        this.services.set(name, registration);
        return this;
    }

    /**
     * 注册服务别名
     * @param {string} alias - 别名
     * @param {string} serviceName - 实际服务名称
     */
    alias(alias, serviceName) {
        this.validateServiceName(alias);
        this.aliases.set(alias, serviceName);
        return this;
    }

    /**
     * 解析服务
     * @param {string} name - 服务名称
     * @param {Object} context - 解析上下文
     * @returns {any} 服务实例
     */
    resolve(name, context = {}) {
        const actualName = this.aliases.get(name) || name;
        
        // 检查循环依赖
        if (this.resolving.has(actualName)) {
            throw new Error(`DIContainer: Circular dependency detected for service "${actualName}"`);
        }

        const registration = this.services.get(actualName);
        if (!registration) {
            throw new Error(`DIContainer: Service "${actualName}" not found`);
        }

        try {
            this.resolving.add(actualName);
            return this.createInstance(actualName, registration, context);
        } finally {
            this.resolving.delete(actualName);
        }
    }

    /**
     * 创建服务实例
     * @private
     */
    createInstance(name, registration, context) {
        switch (registration.type) {
            case 'singleton':
                if (this.singletons.has(name)) {
                    return this.singletons.get(name);
                }
                const singletonInstance = this.invokeFactory(registration, context);
                this.singletons.set(name, singletonInstance);
                return singletonInstance;

            case 'transient':
                return this.invokeFactory(registration, context);

            case 'factory':
                return registration.factory;

            default:
                throw new Error(`DIContainer: Unknown service type "${registration.type}"`);
        }
    }

    /**
     * 调用工厂函数
     * @private
     */
    invokeFactory(registration, context) {
        const dependencies = this.resolveDependencies(registration.dependencies, context);
        return registration.factory(...dependencies, context);
    }

    /**
     * 解析依赖项
     * @private
     */
    resolveDependencies(dependencies, context) {
        return dependencies.map(dep => {
            if (typeof dep === 'string') {
                return this.resolve(dep, context);
            } else if (typeof dep === 'object' && dep.name) {
                // 支持可选依赖
                try {
                    return this.resolve(dep.name, context);
                } catch (error) {
                    if (dep.optional) {
                        return dep.default || null;
                    }
                    throw error;
                }
            }
            return dep;
        });
    }

    /**
     * 检查服务是否已注册
     * @param {string} name - 服务名称
     * @returns {boolean}
     */
    has(name) {
        const actualName = this.aliases.get(name) || name;
        return this.services.has(actualName);
    }

    /**
     * 获取服务注册信息
     * @param {string} name - 服务名称
     * @returns {Object|null}
     */
    getRegistration(name) {
        const actualName = this.aliases.get(name) || name;
        return this.services.get(actualName) || null;
    }

    /**
     * 根据标签获取服务
     * @param {string} tag - 标签
     * @returns {Array} 服务名称数组
     */
    getServicesByTag(tag) {
        const services = [];
        for (const [name, registration] of this.services) {
            if (registration.tags.includes(tag)) {
                services.push(name);
            }
        }
        return services;
    }

    /**
     * 移除服务注册
     * @param {string} name - 服务名称
     */
    remove(name) {
        const actualName = this.aliases.get(name) || name;
        this.services.delete(actualName);
        this.singletons.delete(actualName);
        
        // 移除别名
        for (const [alias, serviceName] of this.aliases) {
            if (serviceName === actualName) {
                this.aliases.delete(alias);
            }
        }
    }

    /**
     * 清空容器
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
        this.aliases.clear();
        this.resolving.clear();
    }

    /**
     * 创建子容器
     * @returns {DIContainer} 子容器
     */
    createChild() {
        const child = new DIContainer();
        
        // 继承父容器的服务注册
        for (const [name, registration] of this.services) {
            child.services.set(name, { ...registration });
        }
        
        // 继承别名
        for (const [alias, serviceName] of this.aliases) {
            child.aliases.set(alias, serviceName);
        }
        
        // 不继承单例实例，子容器有自己的实例
        return child;
    }

    /**
     * 验证服务名称
     * @private
     */
    validateServiceName(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('DIContainer: Service name must be a non-empty string');
        }
    }

    /**
     * 获取容器统计信息
     * @returns {Object}
     */
    getStats() {
        const stats = {
            totalServices: this.services.size,
            singletons: this.singletons.size,
            aliases: this.aliases.size,
            servicesByType: {
                singleton: 0,
                transient: 0,
                factory: 0
            },
            tags: new Set()
        };

        for (const registration of this.services.values()) {
            stats.servicesByType[registration.type]++;
            registration.tags.forEach(tag => stats.tags.add(tag));
        }

        stats.tags = Array.from(stats.tags);
        return stats;
    }

    /**
     * 调试信息
     * @returns {Object}
     */
    debug() {
        const debug = {
            services: {},
            singletons: Array.from(this.singletons.keys()),
            aliases: Object.fromEntries(this.aliases),
            resolving: Array.from(this.resolving)
        };

        for (const [name, registration] of this.services) {
            debug.services[name] = {
                type: registration.type,
                dependencies: registration.dependencies,
                tags: registration.tags,
                metadata: registration.metadata,
                hasInstance: this.singletons.has(name)
            };
        }

        return debug;
    }
}

/**
 * 服务装饰器工厂
 * @param {string} name - 服务名称
 * @param {Object} options - 选项
 */
export function Service(name, options = {}) {
    return function(target) {
        // 为类添加服务元数据
        target._serviceName = name;
        target._serviceOptions = options;
        return target;
    };
}

/**
 * 依赖注入装饰器
 * @param {...string} dependencies - 依赖项名称
 */
export function Inject(...dependencies) {
    return function(target, propertyKey, parameterIndex) {
        if (parameterIndex !== undefined) {
            // 参数装饰器
            const existingDeps = Reflect.getMetadata('inject:dependencies', target) || [];
            existingDeps[parameterIndex] = dependencies[0];
            Reflect.defineMetadata('inject:dependencies', existingDeps, target);
        } else {
            // 属性装饰器
            Reflect.defineMetadata('inject:property', dependencies[0], target, propertyKey);
        }
    };
}

// 创建全局容器实例
const container = new DIContainer();

// 注册核心服务
container.singleton('eventBus', () => {
    const { eventBus } = require('./EventBus.js');
    return eventBus;
}, { tags: ['core'] });

container.singleton('configManager', () => {
    const { configManager } = require('./ConfigManager.js');
    return configManager;
}, { tags: ['core'] });

container.singleton('errorManager', () => {
    const { errorManager } = require('./ErrorManager.js');
    return errorManager;
}, { tags: ['core'] });

container.singleton('environmentManager', () => {
    const { environmentManager } = require('./EnvironmentManager.js');
    return environmentManager;
}, { tags: ['core'] });

// 导出容器和装饰器
export { DIContainer, container };
export default container;

// 便捷方法
export const resolve = (name, context) => container.resolve(name, context);
export const register = {
    singleton: (name, factory, options) => container.singleton(name, factory, options),
    transient: (name, factory, options) => container.transient(name, factory, options),
    factory: (name, factory, options) => container.factory(name, factory, options),
    alias: (alias, serviceName) => container.alias(alias, serviceName)
};