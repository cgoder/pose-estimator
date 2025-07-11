/**
 * 数据处理器接口定义
 * 定义统一的数据处理接口，支持数据预处理、后处理和格式化
 */

/**
 * 数据处理器接口
 * @interface IDataProcessor
 */
export class IDataProcessor {
    /**
     * 预处理输入数据
     * @param {any} inputData - 原始输入数据
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 预处理后的数据
     */
    async preprocess(inputData, options = {}) {
        throw new Error('IDataProcessor.preprocess() must be implemented');
    }

    /**
     * 后处理输出数据
     * @param {any} outputData - 模型输出数据
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 后处理后的数据
     */
    async postprocess(outputData, options = {}) {
        throw new Error('IDataProcessor.postprocess() must be implemented');
    }

    /**
     * 格式化结果数据
     * @param {any} data - 待格式化数据
     * @param {string} format - 目标格式
     * @returns {any} 格式化后的数据
     */
    format(data, format = 'default') {
        throw new Error('IDataProcessor.format() must be implemented');
    }

    /**
     * 验证输入数据
     * @param {any} inputData - 输入数据
     * @returns {boolean} 验证结果
     */
    validate(inputData) {
        throw new Error('IDataProcessor.validate() must be implemented');
    }

    /**
     * 标准化数据
     * @param {any} data - 待标准化数据
     * @param {Object} options - 标准化选项
     * @returns {any} 标准化后的数据
     */
    normalize(data, options = {}) {
        throw new Error('IDataProcessor.normalize() must be implemented');
    }

    /**
     * 获取处理器支持的数据类型
     * @returns {Array<string>} 支持的数据类型列表
     */
    getSupportedTypes() {
        throw new Error('IDataProcessor.getSupportedTypes() must be implemented');
    }

    /**
     * 获取处理器配置
     * @returns {Object} 处理器配置
     */
    getConfig() {
        throw new Error('IDataProcessor.getConfig() must be implemented');
    }
}

/**
 * 数据类型枚举
 */
export const DATA_TYPES = {
    IMAGE: 'image',
    VIDEO: 'video',
    TENSOR: 'tensor',
    ARRAY: 'array',
    OBJECT: 'object',
    JSON: 'json'
};

/**
 * 数据格式枚举
 */
export const DATA_FORMATS = {
    RAW: 'raw',
    NORMALIZED: 'normalized',
    STANDARDIZED: 'standardized',
    JSON: 'json',
    ARRAY: 'array',
    TENSOR: 'tensor'
};

/**
 * 处理状态枚举
 */
export const PROCESSING_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

/**
 * 数据处理结果接口
 * @interface IProcessingResult
 */
export class IProcessingResult {
    constructor() {
        this.status = PROCESSING_STATUS.PENDING;
        this.data = null;
        this.originalData = null;
        this.metadata = {
            processingTime: 0,
            dataType: null,
            format: null,
            size: 0
        };
        this.error = null;
        this.timestamp = Date.now();
    }
}

/**
 * 数据处理配置接口
 * @interface IProcessingConfig
 */
export class IProcessingConfig {
    constructor() {
        this.inputType = null;
        this.outputType = null;
        this.options = {
            enableCache: true,
            enableValidation: true,
            enableNormalization: false
        };
        this.validation = {
            required: true,
            rules: []
        };
        this.normalization = {
            method: 'minmax',
            range: [0, 1]
        };
    }
}

/**
 * 滤波器接口
 * @interface IFilter
 */
export class IFilter {
    /**
     * 应用滤波
     * @param {any} data - 输入数据
     * @param {number} timestamp - 时间戳
     * @returns {any} 滤波后的数据
     */
    filter(data, timestamp = Date.now()) {
        throw new Error('IFilter.filter() must be implemented');
    }

    /**
     * 重置滤波器
     */
    reset() {
        throw new Error('IFilter.reset() must be implemented');
    }

    /**
     * 获取滤波器参数
     * @returns {Object} 滤波器参数
     */
    getParameters() {
        throw new Error('IFilter.getParameters() must be implemented');
    }

    /**
     * 设置滤波器参数
     * @param {Object} params - 新参数
     */
    setParameters(params) {
        throw new Error('IFilter.setParameters() must be implemented');
    }
}