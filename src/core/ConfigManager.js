/**
 * 配置管理器模块
 * 负责应用配置的管理、验证、持久化和同步
 */

export class ConfigManager {
    constructor(options = {}) {
        // 默认配置
        this.defaultConfig = {
            // 模型配置
            model: {
                type: 'MoveNet', // 'MoveNet', 'PoseNet', 'BlazePose'
                variant: 'Lightning', // 'Lightning', 'Thunder', 'MultiPose', 'SinglePose'
                inputResolution: 192,
                scoreThreshold: 0.3,
                maxDetections: 1,
                enableSmoothing: true
            },
            
            // 渲染配置
            rendering: {
                showKeypoints: true,
                showSkeleton: true,
                showTrajectory: false,
                showBiomechanics: false,
                keypointRadius: 4,
                skeletonWidth: 2,
                trajectoryLength: 30,
                confidenceThreshold: 0.3,
                colors: {
                    keypoint: '#00ff00',
                    skeleton: '#ff0000',
                    trajectory: '#0080ff',
                    biomechanics: '#ff8000'
                }
            },
            
            // 滤波器配置
            filter: {
                enabled: true,
                type: 'OneEuro', // 'OneEuro', 'Kalman'
                oneEuro: {
                    frequency: 30,
                    minCutoff: 1.0,
                    beta: 0.007,
                    derivateCutoff: 1.0
                },
                kalman: {
                    processNoise: 0.01,
                    measurementNoise: 0.1,
                    errorCovariance: 1.0
                }
            },
            
            // 性能配置
            performance: {
                enableGPU: true,
                enableWebGL: true,
                maxFPS: 60,
                enableProfiling: false,
                memoryLimit: 512, // MB
                enableOptimization: true
            },
            
            // UI配置
            ui: {
                theme: 'dark', // 'light', 'dark', 'auto'
                language: 'zh-CN', // 'en', 'zh-CN', 'ja', 'ko'
                showFPS: true,
                showStats: true,
                enableKeyboardShortcuts: true,
                enableTooltips: true,
                autoHideControls: false,
                controlsTimeout: 3000
            },
            
            // 摄像头配置
            camera: {
                deviceId: 'default',
                width: 640,
                height: 480,
                frameRate: 30,
                facingMode: 'user', // 'user', 'environment'
                enableAutoFocus: true,
                enableTorch: false
            },
            
            // 数据配置
            data: {
                enableRecording: false,
                recordingFormat: 'json', // 'json', 'csv', 'binary'
                maxRecordingTime: 300, // 秒
                enableExport: true,
                exportFormat: 'json',
                enableCloudSync: false,
                cloudProvider: 'none' // 'none', 'firebase', 'aws', 'azure'
            },
            
            // 分析配置
            analysis: {
                enableBiomechanics: false,
                enableTrajectory: false,
                enableAI: false,
                biomechanics: {
                    enableAngleCalculation: true,
                    enableVelocityCalculation: true,
                    enableAccelerationCalculation: false,
                    enableForceEstimation: false
                },
                trajectory: {
                    enablePrediction: false,
                    predictionSteps: 5,
                    enableSmoothing: true,
                    smoothingWindow: 10
                },
                ai: {
                    enablePostureClassification: false,
                    enableMovementAnalysis: false,
                    enableAnomalyDetection: false,
                    modelEndpoint: ''
                }
            },
            
            // 调试配置
            debug: {
                enableLogging: true,
                logLevel: 'info', // 'debug', 'info', 'warn', 'error'
                enableConsoleOutput: true,
                enableRemoteLogging: false,
                remoteEndpoint: '',
                enablePerformanceMonitoring: true,
                enableErrorReporting: true
            },
            
            // 高级配置
            advanced: {
                enableExperimentalFeatures: false,
                enableBetaFeatures: false,
                customModelPath: '',
                enableCustomShaders: false,
                enableWorkerThreads: true,
                maxWorkerThreads: 4
            }
        };
        
        // 配置选项
        this.options = {
            // 存储设置
            storageKey: options.storageKey || 'pose_estimator_config',
            enablePersistence: options.enablePersistence !== false,
            enableValidation: options.enableValidation !== false,
            enableWatching: options.enableWatching !== false,
            
            // 同步设置
            enableAutoSave: options.enableAutoSave !== false,
            autoSaveInterval: options.autoSaveInterval || 5000, // 5秒
            
            // 验证设置
            strictValidation: options.strictValidation || false,
            enableTypeChecking: options.enableTypeChecking !== false,
            
            // 调试设置
            debug: options.debug || false,
            
            ...options
        };
        
        // 当前配置
        this.config = {};
        
        // 配置监听器
        this.watchers = new Map();
        
        // 配置历史
        this.history = [];
        this.maxHistorySize = 50;
        
        // 验证规则
        this.validationRules = new Map();
        
        // 配置预设
        this.presets = new Map();
        
        // 自动保存定时器
        this.autoSaveTimer = null;
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 统计信息
        this.stats = {
            configChanges: 0,
            validationErrors: 0,
            saveOperations: 0,
            loadOperations: 0
        };
        
        this.init();
    }
    
    /**
     * 初始化配置管理器
     */
    async init() {
        // 设置默认验证规则
        this.setupValidationRules();
        
        // 设置默认预设
        this.setupDefaultPresets();
        
        // 加载配置
        await this.load();
        
        // 启动自动保存
        if (this.options.enableAutoSave) {
            this.startAutoSave();
        }
        
        if (this.options.debug) {
            console.log('ConfigManager已初始化', {
                config: this.config,
                options: this.options
            });
        }
    }
    
    /**
     * 设置验证规则
     */
    setupValidationRules() {
        // 模型配置验证
        this.addValidationRule('model.type', (value) => {
            const validTypes = ['MoveNet', 'PoseNet', 'BlazePose'];
            return validTypes.includes(value);
        }, '模型类型必须是 MoveNet、PoseNet 或 BlazePose');
        
        this.addValidationRule('model.scoreThreshold', (value) => {
            return typeof value === 'number' && value >= 0 && value <= 1;
        }, '置信度阈值必须是 0-1 之间的数字');
        
        this.addValidationRule('model.inputResolution', (value) => {
            const validResolutions = [96, 192, 256, 320, 480, 640];
            return validResolutions.includes(value);
        }, '输入分辨率必须是有效值');
        
        // 性能配置验证
        this.addValidationRule('performance.maxFPS', (value) => {
            return typeof value === 'number' && value > 0 && value <= 120;
        }, 'FPS限制必须是 1-120 之间的数字');
        
        this.addValidationRule('performance.memoryLimit', (value) => {
            return typeof value === 'number' && value >= 128 && value <= 2048;
        }, '内存限制必须是 128-2048 MB');
        
        // 摄像头配置验证
        this.addValidationRule('camera.width', (value) => {
            return typeof value === 'number' && value >= 320 && value <= 1920;
        }, '摄像头宽度必须是 320-1920 像素');
        
        this.addValidationRule('camera.height', (value) => {
            return typeof value === 'number' && value >= 240 && value <= 1080;
        }, '摄像头高度必须是 240-1080 像素');
        
        // 滤波器配置验证
        this.addValidationRule('filter.oneEuro.frequency', (value) => {
            return typeof value === 'number' && value > 0 && value <= 120;
        }, '滤波器频率必须是正数且不超过 120');
        
        this.addValidationRule('filter.oneEuro.minCutoff', (value) => {
            return typeof value === 'number' && value > 0;
        }, '最小截止频率必须是正数');
    }
    
    /**
     * 设置默认预设
     */
    setupDefaultPresets() {
        // 高性能预设
        this.addPreset('high-performance', {
            model: {
                type: 'MoveNet',
                variant: 'Lightning',
                inputResolution: 192,
                scoreThreshold: 0.3
            },
            performance: {
                enableGPU: true,
                enableWebGL: true,
                maxFPS: 60,
                enableOptimization: true
            },
            filter: {
                enabled: true,
                type: 'OneEuro'
            }
        }, '高性能模式');
        
        // 高精度预设
        this.addPreset('high-accuracy', {
            model: {
                type: 'MoveNet',
                variant: 'Thunder',
                inputResolution: 256,
                scoreThreshold: 0.5
            },
            performance: {
                enableGPU: true,
                maxFPS: 30
            },
            filter: {
                enabled: true,
                type: 'Kalman'
            }
        }, '高精度模式');
        
        // 低功耗预设
        this.addPreset('low-power', {
            model: {
                type: 'MoveNet',
                variant: 'Lightning',
                inputResolution: 96,
                scoreThreshold: 0.2
            },
            performance: {
                enableGPU: false,
                maxFPS: 15,
                enableOptimization: true
            },
            filter: {
                enabled: false
            }
        }, '低功耗模式');
        
        // 调试预设
        this.addPreset('debug', {
            debug: {
                enableLogging: true,
                logLevel: 'debug',
                enableConsoleOutput: true,
                enablePerformanceMonitoring: true
            },
            ui: {
                showFPS: true,
                showStats: true
            },
            performance: {
                enableProfiling: true
            }
        }, '调试模式');
    }
    
    /**
     * 获取配置值
     * @param {string} path - 配置路径（如 'model.type'）
     * @param {any} defaultValue - 默认值
     * @returns {any} 配置值
     */
    get(path, defaultValue = undefined) {
        if (!path) {
            return this.config;
        }
        
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
     * @param {any} value - 配置值
     * @param {Object} options - 选项
     * @returns {boolean} 是否设置成功
     */
    set(path, value, options = {}) {
        if (!path) {
            throw new Error('配置路径不能为空');
        }
        
        // 验证配置
        if (this.options.enableValidation && !this.validate(path, value)) {
            if (this.options.strictValidation) {
                throw new Error(`配置验证失败: ${path}`);
            }
            return false;
        }
        
        // 记录旧值
        const oldValue = this.get(path);
        
        // 设置新值
        const keys = path.split('.');
        let target = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        const lastKey = keys[keys.length - 1];
        target[lastKey] = value;
        
        // 记录历史
        this.recordChange(path, oldValue, value);
        
        // 触发监听器
        if (this.options.enableWatching) {
            this.notifyWatchers(path, value, oldValue);
        }
        
        // 触发事件
        this.emit('change', { path, value, oldValue });
        this.emit(`change:${path}`, { value, oldValue });
        
        // 更新统计
        this.stats.configChanges++;
        
        if (this.options.debug) {
            console.log(`配置已更新: ${path}`, { oldValue, newValue: value });
        }
        
        return true;
    }
    
    /**
     * 批量设置配置
     * @param {Object} config - 配置对象
     * @param {Object} options - 选项
     * @returns {boolean} 是否设置成功
     */
    setMultiple(config, options = {}) {
        const changes = [];
        
        try {
            // 收集所有变更
            this.collectChanges(config, '', changes);
            
            // 验证所有变更
            if (this.options.enableValidation) {
                for (const { path, value } of changes) {
                    if (!this.validate(path, value)) {
                        if (this.options.strictValidation) {
                            throw new Error(`配置验证失败: ${path}`);
                        }
                        return false;
                    }
                }
            }
            
            // 应用所有变更
            for (const { path, value } of changes) {
                this.set(path, value, { ...options, skipValidation: true });
            }
            
            return true;
            
        } catch (error) {
            console.error('批量设置配置失败:', error);
            return false;
        }
    }
    
    /**
     * 收集配置变更
     * @param {Object} config - 配置对象
     * @param {string} prefix - 路径前缀
     * @param {Array} changes - 变更数组
     */
    collectChanges(config, prefix, changes) {
        for (const [key, value] of Object.entries(config)) {
            const path = prefix ? `${prefix}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.collectChanges(value, path, changes);
            } else {
                changes.push({ path, value });
            }
        }
    }
    
    /**
     * 验证配置值
     * @param {string} path - 配置路径
     * @param {any} value - 配置值
     * @returns {boolean} 是否有效
     */
    validate(path, value) {
        // 检查特定路径的验证规则
        if (this.validationRules.has(path)) {
            const rule = this.validationRules.get(path);
            try {
                const isValid = rule.validator(value);
                if (!isValid) {
                    console.warn(`配置验证失败: ${path} - ${rule.message}`);
                    this.stats.validationErrors++;
                }
                return isValid;
            } catch (error) {
                console.error(`配置验证出错: ${path}`, error);
                this.stats.validationErrors++;
                return false;
            }
        }
        
        // 类型检查
        if (this.options.enableTypeChecking) {
            const defaultValue = this.getDefault(path);
            if (defaultValue !== undefined && typeof value !== typeof defaultValue) {
                console.warn(`配置类型不匹配: ${path}`, {
                    expected: typeof defaultValue,
                    actual: typeof value
                });
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 获取默认配置值
     * @param {string} path - 配置路径
     * @returns {any} 默认值
     */
    getDefault(path) {
        const keys = path.split('.');
        let value = this.defaultConfig;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }
    
    /**
     * 重置配置到默认值
     * @param {string} path - 配置路径（可选）
     */
    reset(path = null) {
        if (path) {
            // 重置特定路径
            const defaultValue = this.getDefault(path);
            if (defaultValue !== undefined) {
                this.set(path, defaultValue);
            }
        } else {
            // 重置所有配置
            this.config = this.deepClone(this.defaultConfig);
            this.emit('reset', { config: this.config });
        }
        
        if (this.options.debug) {
            console.log('配置已重置', { path });
        }
    }
    
    /**
     * 添加配置监听器
     * @param {string} path - 配置路径
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听的函数
     */
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, []);
        }
        
        const watcher = {
            id: this.generateId(),
            callback,
            addedAt: Date.now()
        };
        
        this.watchers.get(path).push(watcher);
        
        if (this.options.debug) {
            console.log(`添加配置监听器: ${path}`);
        }
        
        // 返回取消监听的函数
        return () => {
            const watchers = this.watchers.get(path);
            if (watchers) {
                const index = watchers.findIndex(w => w.id === watcher.id);
                if (index > -1) {
                    watchers.splice(index, 1);
                    if (watchers.length === 0) {
                        this.watchers.delete(path);
                    }
                }
            }
        };
    }
    
    /**
     * 通知监听器
     * @param {string} path - 配置路径
     * @param {any} newValue - 新值
     * @param {any} oldValue - 旧值
     */
    notifyWatchers(path, newValue, oldValue) {
        // 通知精确路径的监听器
        if (this.watchers.has(path)) {
            const watchers = this.watchers.get(path);
            for (const watcher of watchers) {
                try {
                    watcher.callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('配置监听器执行出错:', error);
                }
            }
        }
        
        // 通知父路径的监听器
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.watchers.has(parentPath)) {
                const watchers = this.watchers.get(parentPath);
                for (const watcher of watchers) {
                    try {
                        watcher.callback(this.get(parentPath), undefined, parentPath);
                    } catch (error) {
                        console.error('配置监听器执行出错:', error);
                    }
                }
            }
        }
    }
    
    /**
     * 记录配置变更
     * @param {string} path - 配置路径
     * @param {any} oldValue - 旧值
     * @param {any} newValue - 新值
     */
    recordChange(path, oldValue, newValue) {
        const change = {
            id: this.generateId(),
            path,
            oldValue: this.deepClone(oldValue),
            newValue: this.deepClone(newValue),
            timestamp: Date.now(),
            iso: new Date().toISOString()
        };
        
        this.history.push(change);
        
        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * 获取配置历史
     * @param {Object} options - 选项
     * @returns {Array} 历史记录数组
     */
    getHistory(options = {}) {
        let history = [...this.history];
        
        // 按路径过滤
        if (options.path) {
            history = history.filter(change => change.path === options.path);
        }
        
        // 按时间范围过滤
        if (options.since) {
            history = history.filter(change => change.timestamp >= options.since);
        }
        
        if (options.until) {
            history = history.filter(change => change.timestamp <= options.until);
        }
        
        // 限制数量
        if (options.limit) {
            history = history.slice(-options.limit);
        }
        
        return history;
    }
    
    /**
     * 添加验证规则
     * @param {string} path - 配置路径
     * @param {Function} validator - 验证函数
     * @param {string} message - 错误消息
     */
    addValidationRule(path, validator, message) {
        this.validationRules.set(path, { validator, message });
    }
    
    /**
     * 移除验证规则
     * @param {string} path - 配置路径
     */
    removeValidationRule(path) {
        this.validationRules.delete(path);
    }
    
    /**
     * 添加配置预设
     * @param {string} name - 预设名称
     * @param {Object} config - 配置对象
     * @param {string} description - 描述
     */
    addPreset(name, config, description = '') {
        this.presets.set(name, {
            name,
            config: this.deepClone(config),
            description,
            createdAt: Date.now()
        });
        
        if (this.options.debug) {
            console.log(`添加配置预设: ${name}`);
        }
    }
    
    /**
     * 应用配置预设
     * @param {string} name - 预设名称
     * @returns {boolean} 是否应用成功
     */
    applyPreset(name) {
        const preset = this.presets.get(name);
        if (!preset) {
            console.warn(`配置预设不存在: ${name}`);
            return false;
        }
        
        const success = this.setMultiple(preset.config);
        
        if (success) {
            this.emit('presetApplied', { name, preset });
            
            if (this.options.debug) {
                console.log(`应用配置预设: ${name}`);
            }
        }
        
        return success;
    }
    
    /**
     * 获取所有预设
     * @returns {Array} 预设数组
     */
    getPresets() {
        return Array.from(this.presets.values());
    }
    
    /**
     * 保存配置到存储
     * @returns {Promise<boolean>} 是否保存成功
     */
    async save() {
        if (!this.options.enablePersistence) {
            return true;
        }
        
        try {
            const data = {
                config: this.config,
                history: this.history,
                stats: this.stats,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.options.storageKey, JSON.stringify(data));
            }
            
            this.stats.saveOperations++;
            this.emit('saved', { config: this.config });
            
            if (this.options.debug) {
                console.log('配置已保存到存储');
            }
            
            return true;
            
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }
    
    /**
     * 从存储加载配置
     * @returns {Promise<boolean>} 是否加载成功
     */
    async load() {
        if (!this.options.enablePersistence) {
            this.config = this.deepClone(this.defaultConfig);
            return true;
        }
        
        try {
            let data = null;
            
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(this.options.storageKey);
                if (stored) {
                    data = JSON.parse(stored);
                }
            }
            
            if (data && data.config) {
                // 合并默认配置和存储的配置
                this.config = this.mergeConfig(this.defaultConfig, data.config);
                
                // 恢复历史记录
                if (data.history && Array.isArray(data.history)) {
                    this.history = data.history;
                }
                
                // 恢复统计信息
                if (data.stats) {
                    this.stats = { ...this.stats, ...data.stats };
                }
                
                this.stats.loadOperations++;
                this.emit('loaded', { config: this.config });
                
                if (this.options.debug) {
                    console.log('配置已从存储加载');
                }
            } else {
                // 使用默认配置
                this.config = this.deepClone(this.defaultConfig);
            }
            
            return true;
            
        } catch (error) {
            console.error('加载配置失败:', error);
            this.config = this.deepClone(this.defaultConfig);
            return false;
        }
    }
    
    /**
     * 合并配置
     * @param {Object} defaultConfig - 默认配置
     * @param {Object} userConfig - 用户配置
     * @returns {Object} 合并后的配置
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = this.deepClone(defaultConfig);
        
        function merge(target, source) {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key] || typeof target[key] !== 'object') {
                            target[key] = {};
                        }
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
        }
        
        merge(merged, userConfig);
        return merged;
    }
    
    /**
     * 导出配置
     * @param {string} format - 导出格式 ('json' | 'yaml')
     * @returns {string} 导出的配置字符串
     */
    export(format = 'json') {
        const exportData = {
            config: this.config,
            presets: Object.fromEntries(this.presets),
            exportTime: new Date().toISOString(),
            version: '1.0.0'
        };
        
        switch (format) {
            case 'yaml':
                // 简单的YAML导出（实际项目中可能需要yaml库）
                return this.toYAML(exportData);
            default:
                return JSON.stringify(exportData, null, 2);
        }
    }
    
    /**
     * 导入配置
     * @param {string} data - 配置数据
     * @param {string} format - 数据格式
     * @returns {boolean} 是否导入成功
     */
    import(data, format = 'json') {
        try {
            let importData;
            
            switch (format) {
                case 'yaml':
                    importData = this.fromYAML(data);
                    break;
                default:
                    importData = JSON.parse(data);
            }
            
            if (importData.config) {
                const success = this.setMultiple(importData.config);
                
                if (success) {
                    // 导入预设
                    if (importData.presets) {
                        for (const [name, preset] of Object.entries(importData.presets)) {
                            this.addPreset(name, preset.config, preset.description);
                        }
                    }
                    
                    this.emit('imported', { data: importData });
                    
                    if (this.options.debug) {
                        console.log('配置导入成功');
                    }
                }
                
                return success;
            }
            
            return false;
            
        } catch (error) {
            console.error('导入配置失败:', error);
            return false;
        }
    }
    
    /**
     * 简单的YAML转换（实际项目中建议使用专门的YAML库）
     */
    toYAML(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 1)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                for (const item of value) {
                    yaml += `${spaces}  - ${item}\n`;
                }
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        
        return yaml;
    }
    
    /**
     * 简单的YAML解析（实际项目中建议使用专门的YAML库）
     */
    fromYAML(yaml) {
        // 这里只是一个简单的实现，实际项目中应该使用js-yaml等库
        console.warn('YAML解析功能需要专门的库支持');
        return {};
    }
    
    /**
     * 启动自动保存
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            this.save();
        }, this.options.autoSaveInterval);
        
        if (this.options.debug) {
            console.log('自动保存已启动');
        }
    }
    
    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        if (this.options.debug) {
            console.log('自动保存已停止');
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            watchersCount: this.watchers.size,
            validationRulesCount: this.validationRules.size,
            presetsCount: this.presets.size,
            historySize: this.history.length
        };
    }
    
    /**
     * 深度克隆对象
     * @param {any} obj - 要克隆的对象
     * @returns {any} 克隆后的对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} listener - 监听器函数
     */
    off(event, listener) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error('配置事件监听器执行出错:', error);
                }
            }
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopAutoSave();
        this.watchers.clear();
        this.eventListeners.clear();
        this.validationRules.clear();
        this.presets.clear();
        this.history = [];
        
        if (this.options.debug) {
            console.log('ConfigManager资源已清理');
        }
    }
}

export default ConfigManager;