/**
 * 配置管理器
 * 统一管理应用配置，支持环境变量和动态配置
 */
export class ConfigManager {
    constructor() {
        this.config = this.getDefaultConfig();
        this.environmentConfig = {};
        this.runtimeConfig = {};
    }

    /**
     * 获取默认配置
     * @returns {Object} 默认配置
     */
    getDefaultConfig() {
        return {
            // 应用基础配置
            app: {
                name: 'Pose Estimator',
                version: '2.0.0',
                debug: false
            },

            // 功能开关配置
            features: {
                tensorflow: {
                    enabled: false,        // 默认关闭TensorFlow
                    autoLoad: false,       // 不自动加载
                    lazyLoad: true,        // 支持懒加载
                    dependsOn: []          // 无依赖
                },
                filter: {
                    enabled: false,        // 默认关闭Filter
                    autoLoad: false,       // 不自动加载
                    lazyLoad: true,        // 支持懒加载
                    dependsOn: ['tensorflow'] // 依赖TensorFlow
                },
                camera: {
                    enabled: true,         // 默认开启摄像头
                    autoLoad: true,        // 自动加载
                    lazyLoad: false,       // 不需要懒加载
                    dependsOn: []          // 无依赖
                },
                pose: {
                    enabled: false,        // 默认关闭姿态估计
                    autoLoad: false,       // 不自动加载
                    lazyLoad: true,        // 支持懒加载
                    dependsOn: ['tensorflow'] // 依赖TensorFlow
                }
            },

            // 输入源配置
            input: {
                defaultSource: 'camera', // camera | video | image
                sources: {
                    camera: {
                        enabled: true,
                        priority: 1
                    },
                    video: {
                        enabled: true,
                        priority: 2,
                        supportedFormats: ['mp4', 'webm', 'ogg']
                    },
                    image: {
                        enabled: true,
                        priority: 3,
                        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
                    }
                }
            },

            // 开发模式配置
            development: {
                skipHTTPSCheck: true,
                logLevel: 'info',
                enableDebugUI: false,
                mockCamera: false
            },

            // 摄像头配置
            camera: {
                width: 640,
                height: 480,
                timeout: 10000,
                frameRate: 30,
                constraints: {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user',
                        frameRate: { ideal: 30 }
                    }
                }
            },

            // AI模型配置
            model: {
                cacheVersion: '1.0.0',
                preloadTimeout: 30000,
                defaultType: 'MoveNet',
                urls: {
                    moveNet: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
                    poseNet: 'https://tfhub.dev/google/tfjs-model/posenet/mobilenet/float/075/1/default/1'
                },
                backends: ['webgl', 'cpu'],
                preferredBackend: 'webgl'
            },

            // One Euro Filter 参数
            filter: {
                defaultFrequency: 30.0,
                defaultMinCutoff: 1.0,
                defaultBeta: 0.5,
                defaultDCutoff: 1.0,
                ranges: {
                    frequency: { min: 1, max: 120 },
                    minCutoff: { min: 0.1, max: 10 },
                    beta: { min: 0, max: 5 },
                    dCutoff: { min: 0.1, max: 10 }
                }
            },

            // 性能监控配置
            performance: {
                fpsUpdateInterval: 1000,
                memoryCheckInterval: 5000,
                maxFrameTime: 33.33, // 30 FPS
                bufferSize: 60,
                enableProfiling: false
            },

            // UI配置
            ui: {
                skeleton: {
                    color: '#00ff00',
                    lineWidth: 2,
                    keypointRadius: 4,
                    confidenceThreshold: 0.3
                },
                loading: {
                    timeout: 30000,
                    showProgress: true
                },
                controls: {
                    autoHide: true,
                    autoHideDelay: 3000
                }
            },

            // 缓存配置
            cache: {
                database: {
                    name: 'PoseEstimatorCache',
                    version: 1,
                    storeName: 'models'
                },
                memory: {
                    maxSize: 5,
                    ttl: 7 * 24 * 60 * 60 * 1000 // 7天
                },
                strategy: 'cache-first'
            },

            // 网络配置
            network: {
                timeout: 30000,
                retryAttempts: 3,
                retryDelay: 1000,
                offlineMode: false
            }
        };
    }

    /**
     * 初始化配置管理器
     * @param {Object} options - 初始化选项
     */
    init(options = {}) {
        // 检测环境
        this.detectEnvironment();
        
        // 合并用户配置
        if (options.config) {
            this.mergeConfig(options.config);
        }
        
        // 应用环境特定配置
        this.applyEnvironmentConfig();
        
        // 验证配置
        this.validateConfig();
    }

    /**
     * 检测运行环境
     */
    detectEnvironment() {
        const isDevelopment = location.hostname === 'localhost' || 
                            location.hostname === '127.0.0.1' || 
                            location.search.includes('debug=true');
        
        const isHTTPS = location.protocol === 'https:';
        const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        this.environmentConfig = {
            isDevelopment,
            isProduction: !isDevelopment,
            isHTTPS,
            isLocalhost,
            canAccessCamera: isHTTPS || isLocalhost,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        };
    }

    /**
     * 应用环境特定配置
     */
    applyEnvironmentConfig() {
        if (this.environmentConfig.isDevelopment) {
            // 开发环境配置
            this.config.app.debug = true;
            this.config.development.enableDebugUI = true;
            this.config.performance.enableProfiling = true;
        }
        
        if (!this.environmentConfig.canAccessCamera) {
            // 无法访问摄像头时的配置
            this.config.development.mockCamera = true;
        }
    }

    /**
     * 合并配置
     * @param {Object} userConfig - 用户配置
     */
    mergeConfig(userConfig) {
        this.config = this.deepMerge(this.config, userConfig);
    }

    /**
     * 深度合并对象
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并后的对象
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * 验证配置
     */
    validateConfig() {
        const errors = [];
        
        // 验证摄像头配置
        if (this.config.camera.width <= 0 || this.config.camera.height <= 0) {
            errors.push('摄像头分辨率配置无效');
        }
        
        // 验证滤波器参数
        const filter = this.config.filter;
        if (filter.defaultFrequency < filter.ranges.frequency.min || 
            filter.defaultFrequency > filter.ranges.frequency.max) {
            errors.push('滤波器频率参数超出范围');
        }
        
        // 验证性能配置
        if (this.config.performance.maxFrameTime <= 0) {
            errors.push('最大帧时间配置无效');
        }
        
        if (errors.length > 0) {
            console.warn('配置验证失败:', errors);
        }
    }

    /**
     * 获取配置值
     * @param {string} path - 配置路径（如 'camera.width'）
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * 设置配置值
     * @param {string} path - 配置路径
     * @param {*} value - 配置值
     */
    set(path, value) {
        const keys = path.split('.');
        let target = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[keys[keys.length - 1]] = value;
        
        // 触发配置变更事件
        this.notifyConfigChange(path, value);
    }

    /**
     * 获取完整配置
     * @returns {Object} 完整配置
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * 获取环境信息
     * @returns {Object} 环境信息
     */
    getEnvironment() {
        return { ...this.environmentConfig };
    }

    /**
     * 检查是否为开发模式
     * @returns {boolean} 是否为开发模式
     */
    isDevelopment() {
        return this.environmentConfig.isDevelopment;
    }

    /**
     * 检查是否为生产模式
     * @returns {boolean} 是否为生产模式
     */
    isProduction() {
        return this.environmentConfig.isProduction;
    }

    /**
     * 检查是否可以访问摄像头
     * @returns {boolean} 是否可以访问摄像头
     */
    canAccessCamera() {
        return this.environmentConfig.canAccessCamera;
    }

    /**
     * 获取摄像头约束
     * @param {Object} overrides - 覆盖参数
     * @returns {Object} 摄像头约束
     */
    getCameraConstraints(overrides = {}) {
        const baseConstraints = this.get('camera.constraints');
        return this.deepMerge(baseConstraints, overrides);
    }

    /**
     * 获取模型URL
     * @param {string} modelType - 模型类型
     * @returns {string} 模型URL
     */
    getModelUrl(modelType) {
        const urls = this.get('model.urls');
        return urls[modelType.toLowerCase()] || urls.moveNet;
    }

    /**
     * 获取滤波器参数
     * @returns {Object} 滤波器参数
     */
    getFilterParams() {
        return {
            frequency: this.get('filter.defaultFrequency'),
            minCutoff: this.get('filter.defaultMinCutoff'),
            beta: this.get('filter.defaultBeta'),
            dCutoff: this.get('filter.defaultDCutoff')
        };
    }

    /**
     * 检查功能是否启用
     * @param {string} featureName - 功能名称
     * @returns {boolean} 是否启用
     */
    isFeatureEnabled(featureName) {
        return this.get(`features.${featureName}.enabled`, false);
    }

    /**
     * 启用功能
     * @param {string} featureName - 功能名称
     * @returns {boolean} 是否成功启用
     */
    enableFeature(featureName) {
        // 检查功能是否存在
        if (!this.get(`features.${featureName}`)) {
            console.warn(`⚠️ 功能 '${featureName}' 不存在`);
            return false;
        }

        // 检查依赖是否满足
        if (!this.checkFeatureDependencies(featureName)) {
            const dependencies = this.get(`features.${featureName}.dependsOn`, []);
            console.warn(`⚠️ 功能 '${featureName}' 的依赖未满足: ${dependencies.join(', ')}`);
            return false;
        }

        this.set(`features.${featureName}.enabled`, true);
        this.notifyFeatureChange(featureName, true);
        console.log(`✅ 功能 '${featureName}' 已启用`);
        return true;
    }

    /**
     * 禁用功能
     * @param {string} featureName - 功能名称
     * @returns {boolean} 是否成功禁用
     */
    disableFeature(featureName) {
        // 检查功能是否存在
        if (!this.get(`features.${featureName}`)) {
            console.warn(`⚠️ 功能 '${featureName}' 不存在`);
            return false;
        }

        // 检查是否有其他功能依赖此功能
        const dependentFeatures = this.getFeatureDependents(featureName);
        if (dependentFeatures.length > 0) {
            const enabledDependents = dependentFeatures.filter(f => this.isFeatureEnabled(f));
            if (enabledDependents.length > 0) {
                console.warn(`⚠️ 无法禁用功能 '${featureName}'，以下功能依赖它: ${enabledDependents.join(', ')}`);
                return false;
            }
        }

        this.set(`features.${featureName}.enabled`, false);
        this.notifyFeatureChange(featureName, false);
        console.log(`🔴 功能 '${featureName}' 已禁用`);
        return true;
    }

    /**
     * 检查功能依赖是否满足
     * @param {string} featureName - 功能名称
     * @returns {boolean} 依赖是否满足
     */
    checkFeatureDependencies(featureName) {
        const dependencies = this.get(`features.${featureName}.dependsOn`, []);
        return dependencies.every(dep => this.isFeatureEnabled(dep));
    }

    /**
     * 获取依赖某个功能的其他功能列表
     * @param {string} featureName - 功能名称
     * @returns {Array} 依赖功能列表
     */
    getFeatureDependents(featureName) {
        const features = this.get('features', {});
        const dependents = [];
        
        for (const [name, config] of Object.entries(features)) {
            if (config.dependsOn && config.dependsOn.includes(featureName)) {
                dependents.push(name);
            }
        }
        
        return dependents;
    }

    /**
     * 获取所有功能的状态
     * @returns {Object} 功能状态映射
     */
    getFeatureStates() {
        const features = this.get('features', {});
        const states = {};
        
        for (const [name, config] of Object.entries(features)) {
            states[name] = {
                enabled: config.enabled,
                autoLoad: config.autoLoad,
                lazyLoad: config.lazyLoad,
                dependsOn: config.dependsOn || [],
                dependenciesMet: this.checkFeatureDependencies(name)
            };
        }
        
        return states;
    }

    /**
     * 批量启用功能（按依赖顺序）
     * @param {Array} featureNames - 功能名称列表
     * @returns {Object} 启用结果
     */
    enableFeatures(featureNames) {
        const results = { success: [], failed: [] };
        
        // 按依赖关系排序
        const sortedFeatures = this.sortFeaturesByDependencies(featureNames);
        
        for (const featureName of sortedFeatures) {
            if (this.enableFeature(featureName)) {
                results.success.push(featureName);
            } else {
                results.failed.push(featureName);
            }
        }
        
        return results;
    }

    /**
     * 按依赖关系排序功能
     * @param {Array} featureNames - 功能名称列表
     * @returns {Array} 排序后的功能列表
     */
    sortFeaturesByDependencies(featureNames) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        
        const visit = (featureName) => {
            if (visiting.has(featureName)) {
                throw new Error(`检测到循环依赖: ${featureName}`);
            }
            
            if (visited.has(featureName)) {
                return;
            }
            
            visiting.add(featureName);
            
            const dependencies = this.get(`features.${featureName}.dependsOn`, []);
            for (const dep of dependencies) {
                if (featureNames.includes(dep)) {
                    visit(dep);
                }
            }
            
            visiting.delete(featureName);
            visited.add(featureName);
            sorted.push(featureName);
        };
        
        for (const featureName of featureNames) {
            if (!visited.has(featureName)) {
                visit(featureName);
            }
        }
        
        return sorted;
    }

    /**
     * 通知功能状态变更
     * @param {string} featureName - 功能名称
     * @param {boolean} enabled - 是否启用
     */
    notifyFeatureChange(featureName, enabled) {
        // 触发功能变更事件
        if (typeof window !== 'undefined' && window.eventBus) {
            window.eventBus.emit('FEATURE_CHANGED', {
                feature: featureName,
                enabled,
                timestamp: Date.now()
            });
        }
        
        // 调用原有的配置变更通知
        this.notifyConfigChange(`features.${featureName}.enabled`, enabled);
    }

    /**
     * 通知配置变更
     * @param {string} path - 配置路径
     * @param {*} value - 新值
     */
    notifyConfigChange(path, value) {
        // 可以在这里添加配置变更监听器
        if (this.config.app.debug) {
            console.log(`配置变更: ${path} = ${JSON.stringify(value)}`);
        }
    }

    /**
     * 重置配置为默认值
     */
    reset() {
        this.config = this.getDefaultConfig();
        this.applyEnvironmentConfig();
    }

    /**
     * 导出配置
     * @returns {string} JSON格式的配置
     */
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * 导入配置
     * @param {string} configJson - JSON格式的配置
     */
    import(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            this.mergeConfig(importedConfig);
            this.validateConfig();
        } catch (error) {
            console.error('配置导入失败:', error);
            throw new Error('无效的配置格式');
        }
    }
}

// 创建全局配置管理器实例
export const configManager = new ConfigManager();

// 兼容性导出（保持与原constants.js的兼容性）
// 创建一个动态CONFIG对象，确保包含所有必要的属性
export const CONFIG = {
    get MODEL() {
        return {
            DEFAULT_TYPE: configManager.get('model.defaultType', 'MoveNet'),
            URLS: configManager.get('model.urls', {}),
            BACKENDS: configManager.get('model.backends', ['webgl', 'cpu']),
            PREFERRED_BACKEND: configManager.get('model.preferredBackend', 'webgl')
        };
    },
    get CAMERA() {
        return {
            WIDTH: configManager.get('camera.width', 640),
            HEIGHT: configManager.get('camera.height', 480),
            FRAME_RATE: configManager.get('camera.frameRate', 30),
            TIMEOUT: configManager.get('camera.timeout', 10000)
        };
    },
    get UI() {
        return {
            SKELETON_COLOR: configManager.get('ui.skeleton.color', '#00ff00'),
            SKELETON_LINE_WIDTH: configManager.get('ui.skeleton.lineWidth', 2),
            KEYPOINT_RADIUS: configManager.get('ui.skeleton.keypointRadius', 4),
            CONFIDENCE_THRESHOLD: configManager.get('ui.skeleton.confidenceThreshold', 0.3)
        };
    },
    get ui() {
        return {
            skeleton: {
                color: configManager.get('ui.skeleton.color', '#00ff00'),
                lineWidth: configManager.get('ui.skeleton.lineWidth', 2),
                keypointRadius: configManager.get('ui.skeleton.keypointRadius', 4),
                confidenceThreshold: configManager.get('ui.skeleton.confidenceThreshold', 0.3)
            }
        };
    },
    get FILTER() {
        return {
            DEFAULT_FREQUENCY: configManager.get('filter.defaultFrequency', 30.0),
            DEFAULT_MIN_CUTOFF: configManager.get('filter.defaultMinCutoff', 1.0),
            DEFAULT_BETA: configManager.get('filter.defaultBeta', 0.5),
            DEFAULT_DCUTOFF: configManager.get('filter.defaultDCutoff', 1.0)
        };
    },
    get filter() {
        return {
            defaultFrequency: configManager.get('filter.defaultFrequency', 30.0),
            defaultMinCutoff: configManager.get('filter.defaultMinCutoff', 1.0),
            defaultBeta: configManager.get('filter.defaultBeta', 0.5),
            defaultDCutoff: configManager.get('filter.defaultDCutoff', 1.0),
            ranges: {
                frequency: { min: 1.0, max: 120.0 },
                minCutoff: { min: 0.001, max: 10.0 },
                beta: { min: 0.0, max: 10.0 },
                dCutoff: { min: 0.001, max: 10.0 }
            }
        };
    },
    get PERFORMANCE() {
        return {
            FPS_UPDATE_INTERVAL: configManager.get('performance.fpsUpdateInterval', 1000),
            MEMORY_CHECK_INTERVAL: configManager.get('performance.memoryCheckInterval', 5000),
            MAX_FRAME_TIME: configManager.get('performance.maxFrameTime', 33.33)
        };
    }
};

// 姿态关键点连接定义
export const POSE_CONNECTIONS = [
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12], [11, 13], [13, 15],
    [12, 14], [14, 16]
];

// 关键点名称映射
export const KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];