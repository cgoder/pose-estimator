/**
 * 姿态数据处理器
 * 负责姿态数据的预处理、后处理和格式化
 */

import { IDataProcessor, DATA_TYPES, PROCESSING_STATUS, IProcessingResult } from '../interfaces/IDataProcessor.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * 姿态数据处理器类
 * 实现姿态数据的各种处理功能
 */
export class PoseProcessor extends IDataProcessor {
    constructor(options = {}) {
        super();
        
        // 配置选项
        this.options = {
            enableNormalization: options.enableNormalization !== false,
            enableValidation: options.enableValidation !== false,
            enableSmoothing: options.enableSmoothing || false,
            confidenceThreshold: options.confidenceThreshold || 0.3,
            maxKeypoints: options.maxKeypoints || 17,
            inputImageSize: options.inputImageSize || { width: 640, height: 480 },
            outputImageSize: options.outputImageSize || null,
            ...options
        };
        
        // 关键点名称映射
        this.keypointNames = [
            'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ];
        
        // 关键点连接定义
        this.connections = [
            [0, 1], [0, 2], [1, 3], [2, 4], // 头部
            [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // 上身
            [5, 11], [6, 12], [11, 12], // 躯干
            [11, 13], [13, 15], [12, 14], [14, 16] // 下身
        ];
        
        // 统计信息
        this.stats = {
            processedFrames: 0,
            validFrames: 0,
            invalidFrames: 0,
            averageConfidence: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0
        };
        
        console.log('🔧 姿态数据处理器已创建');
    }
    
    /**
     * 预处理输入数据
     * @param {any} inputData - 输入数据（图像、视频帧等）
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 预处理后的数据
     */
    async preprocess(inputData, options = {}) {
        const startTime = performance.now();
        
        try {
            // 数据验证
            if (!this._validateInput(inputData)) {
                throw new Error('输入数据验证失败');
            }
            
            let processedData = inputData;
            
            // 图像预处理
            if (this._isImageData(inputData)) {
                processedData = await this._preprocessImage(inputData, options);
            }
            
            // 张量预处理
            if (this._isTensorData(inputData)) {
                processedData = await this._preprocessTensor(inputData, options);
            }
            
            // 更新统计信息
            const processingTime = performance.now() - startTime;
            this._updateStats(processingTime);
            
            return processedData;
            
        } catch (error) {
            console.error('❌ 姿态数据预处理失败:', error);
            throw ErrorHandler.createError('PoseProcessor', `预处理失败: ${error.message}`, error);
        }
    }
    
    /**
     * 后处理模型输出
     * @param {any} modelOutput - 模型输出数据
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 后处理后的数据
     */
    async postprocess(modelOutput, options = {}) {
        const startTime = performance.now();
        
        try {
            if (!modelOutput) {
                return null;
            }
            
            let processedData = modelOutput;
            
            // 解析模型输出
            if (this._isTensorOutput(modelOutput)) {
                processedData = await this._parseTensorOutput(modelOutput, options);
            }
            
            // 数据验证和清理
            if (this.options.enableValidation) {
                processedData = this._validateAndCleanPoseData(processedData, options);
            }
            
            // 坐标归一化
            if (this.options.enableNormalization) {
                processedData = this._normalizePoseData(processedData, options);
            }
            
            // 置信度过滤
            processedData = this._filterByConfidence(processedData, options);
            
            // 更新统计信息
            const processingTime = performance.now() - startTime;
            this._updateStats(processingTime);
            
            return processedData;
            
        } catch (error) {
            console.error('❌ 姿态数据后处理失败:', error);
            throw ErrorHandler.createError('PoseProcessor', `后处理失败: ${error.message}`, error);
        }
    }
    
    /**
     * 格式化输出数据
     * @param {any} data - 输入数据
     * @param {string} format - 输出格式
     * @param {Object} options - 格式化选项
     * @returns {any} 格式化后的数据
     */
    format(data, format = 'default', options = {}) {
        try {
            if (!data) {
                return null;
            }
            
            switch (format) {
                case 'keypoints':
                    return this._formatAsKeypoints(data, options);
                case 'skeleton':
                    return this._formatAsSkeleton(data, options);
                case 'normalized':
                    return this._formatAsNormalized(data, options);
                case 'json':
                    return this._formatAsJSON(data, options);
                case 'array':
                    return this._formatAsArray(data, options);
                default:
                    return this._formatDefault(data, options);
            }
            
        } catch (error) {
            console.error('❌ 数据格式化失败:', error);
            return data; // 出错时返回原始数据
        }
    }
    
    /**
     * 验证数据
     * @param {any} data - 数据
     * @param {string} expectedType - 期望类型
     * @returns {boolean} 验证结果
     */
    validate(data, expectedType = DATA_TYPES.POSE) {
        try {
            switch (expectedType) {
                case DATA_TYPES.POSE:
                    return this._validatePoseData(data);
                case DATA_TYPES.KEYPOINTS:
                    return this._validateKeypointsData(data);
                case DATA_TYPES.IMAGE:
                    return this._validateImageData(data);
                default:
                    return true;
            }
        } catch (error) {
            console.error('❌ 数据验证失败:', error);
            return false;
        }
    }
    
    /**
     * 标准化数据
     * @param {any} data - 数据
     * @param {Object} options - 标准化选项
     * @returns {any} 标准化后的数据
     */
    normalize(data, options = {}) {
        try {
            if (!data) {
                return data;
            }
            
            if (data.keypoints && Array.isArray(data.keypoints)) {
                return this._normalizePoseData(data, options);
            }
            
            if (Array.isArray(data)) {
                return this._normalizeKeypointsArray(data, options);
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ 数据标准化失败:', error);
            return data;
        }
    }
    
    /**
     * 获取处理器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            options: { ...this.options },
            stats: { ...this.stats },
            keypointNames: [...this.keypointNames],
            connections: [...this.connections]
        };
    }
    
    /**
     * 验证输入数据
     * @private
     * @param {any} inputData - 输入数据
     * @returns {boolean} 验证结果
     */
    _validateInput(inputData) {
        if (!inputData) {
            return false;
        }
        
        // 检查是否为有效的图像数据
        if (this._isImageData(inputData)) {
            return true;
        }
        
        // 检查是否为有效的张量数据
        if (this._isTensorData(inputData)) {
            return true;
        }
        
        // 检查是否为Canvas元素
        if (inputData instanceof HTMLCanvasElement) {
            return true;
        }
        
        // 检查是否为Video元素
        if (inputData instanceof HTMLVideoElement) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 检查是否为图像数据
     * @private
     * @param {any} data - 数据
     * @returns {boolean} 检查结果
     */
    _isImageData(data) {
        return data instanceof HTMLImageElement ||
               data instanceof ImageData ||
               data instanceof HTMLCanvasElement ||
               data instanceof HTMLVideoElement;
    }
    
    /**
     * 检查是否为张量数据
     * @private
     * @param {any} data - 数据
     * @returns {boolean} 检查结果
     */
    _isTensorData(data) {
        return typeof window !== 'undefined' && 
               window.tf && 
               data instanceof window.tf.Tensor;
    }
    
    /**
     * 检查是否为张量输出
     * @private
     * @param {any} output - 输出数据
     * @returns {boolean} 检查结果
     */
    _isTensorOutput(output) {
        return this._isTensorData(output) || 
               (Array.isArray(output) && output.some(item => this._isTensorData(item)));
    }
    
    /**
     * 预处理图像数据
     * @private
     * @param {any} imageData - 图像数据
     * @param {Object} options - 选项
     * @returns {Promise<any>} 预处理后的数据
     */
    async _preprocessImage(imageData, options = {}) {
        // 这里可以添加图像预处理逻辑
        // 例如：调整大小、归一化、数据增强等
        return imageData;
    }
    
    /**
     * 预处理张量数据
     * @private
     * @param {any} tensorData - 张量数据
     * @param {Object} options - 选项
     * @returns {Promise<any>} 预处理后的数据
     */
    async _preprocessTensor(tensorData, options = {}) {
        // 这里可以添加张量预处理逻辑
        // 例如：形状调整、数值归一化等
        return tensorData;
    }
    
    /**
     * 解析张量输出
     * @private
     * @param {any} tensorOutput - 张量输出
     * @param {Object} options - 选项
     * @returns {Promise<any>} 解析后的数据
     */
    async _parseTensorOutput(tensorOutput, options = {}) {
        const tf = window.tf;
        
        if (!tf) {
            throw new Error('TensorFlow.js 不可用');
        }
        
        try {
            let tensor = tensorOutput;
            
            // 如果是数组，取第一个张量
            if (Array.isArray(tensorOutput)) {
                tensor = tensorOutput[0];
            }
            
            // 获取张量数据
            const data = await tensor.data();
            const shape = tensor.shape;
            
            // 根据形状解析数据
            if (shape.length === 3 && shape[2] === 3) {
                // [num_keypoints, 1, 3] 格式 (y, x, confidence)
                return this._parseKeypointsFromTensor(data, shape);
            } else if (shape.length === 2 && shape[1] === 3) {
                // [num_keypoints, 3] 格式
                return this._parseKeypointsFromTensor(data, shape);
            } else {
                // 其他格式，尝试通用解析
                return this._parseGenericTensorOutput(data, shape);
            }
            
        } catch (error) {
            console.error('❌ 张量输出解析失败:', error);
            throw error;
        }
    }
    
    /**
     * 从张量解析关键点
     * @private
     * @param {Float32Array} data - 张量数据
     * @param {Array<number>} shape - 张量形状
     * @returns {Object} 解析后的姿态数据
     */
    _parseKeypointsFromTensor(data, shape) {
        const numKeypoints = shape[0];
        const keypoints = [];
        
        for (let i = 0; i < numKeypoints; i++) {
            const baseIndex = i * 3;
            const y = data[baseIndex];
            const x = data[baseIndex + 1];
            const confidence = data[baseIndex + 2];
            
            keypoints.push({
                x: x,
                y: y,
                confidence: confidence,
                name: this.keypointNames[i] || `keypoint_${i}`
            });
        }
        
        return {
            keypoints: keypoints,
            score: this._calculateOverallScore(keypoints)
        };
    }
    
    /**
     * 解析通用张量输出
     * @private
     * @param {Float32Array} data - 张量数据
     * @param {Array<number>} shape - 张量形状
     * @returns {Object} 解析后的数据
     */
    _parseGenericTensorOutput(data, shape) {
        // 通用解析逻辑
        return {
            data: Array.from(data),
            shape: shape,
            type: 'generic'
        };
    }
    
    /**
     * 验证和清理姿态数据
     * @private
     * @param {Object} poseData - 姿态数据
     * @param {Object} options - 选项
     * @returns {Object} 清理后的数据
     */
    _validateAndCleanPoseData(poseData, options = {}) {
        if (!poseData || !poseData.keypoints) {
            return null;
        }
        
        const cleanedKeypoints = poseData.keypoints.filter(keypoint => {
            // 过滤无效的关键点
            return keypoint && 
                   typeof keypoint.x === 'number' && 
                   typeof keypoint.y === 'number' && 
                   typeof keypoint.confidence === 'number' &&
                   !isNaN(keypoint.x) && 
                   !isNaN(keypoint.y) && 
                   !isNaN(keypoint.confidence);
        });
        
        return {
            ...poseData,
            keypoints: cleanedKeypoints,
            score: this._calculateOverallScore(cleanedKeypoints)
        };
    }
    
    /**
     * 归一化姿态数据
     * @private
     * @param {Object} poseData - 姿态数据
     * @param {Object} options - 选项
     * @returns {Object} 归一化后的数据
     */
    _normalizePoseData(poseData, options = {}) {
        if (!poseData || !poseData.keypoints) {
            return poseData;
        }
        
        const inputSize = options.inputSize || this.options.inputImageSize;
        const outputSize = options.outputSize || this.options.outputImageSize || inputSize;
        
        const scaleX = outputSize.width / inputSize.width;
        const scaleY = outputSize.height / inputSize.height;
        
        const normalizedKeypoints = poseData.keypoints.map(keypoint => ({
            ...keypoint,
            x: keypoint.x * scaleX,
            y: keypoint.y * scaleY
        }));
        
        return {
            ...poseData,
            keypoints: normalizedKeypoints
        };
    }
    
    /**
     * 按置信度过滤关键点
     * @private
     * @param {Object} poseData - 姿态数据
     * @param {Object} options - 选项
     * @returns {Object} 过滤后的数据
     */
    _filterByConfidence(poseData, options = {}) {
        if (!poseData || !poseData.keypoints) {
            return poseData;
        }
        
        const threshold = options.confidenceThreshold || this.options.confidenceThreshold;
        
        const filteredKeypoints = poseData.keypoints.map(keypoint => {
            if (keypoint.confidence < threshold) {
                return {
                    ...keypoint,
                    x: 0,
                    y: 0,
                    confidence: 0
                };
            }
            return keypoint;
        });
        
        return {
            ...poseData,
            keypoints: filteredKeypoints
        };
    }
    
    /**
     * 计算整体置信度分数
     * @private
     * @param {Array} keypoints - 关键点数组
     * @returns {number} 整体分数
     */
    _calculateOverallScore(keypoints) {
        if (!keypoints || keypoints.length === 0) {
            return 0;
        }
        
        const validKeypoints = keypoints.filter(kp => kp.confidence > 0);
        if (validKeypoints.length === 0) {
            return 0;
        }
        
        const totalConfidence = validKeypoints.reduce((sum, kp) => sum + kp.confidence, 0);
        return totalConfidence / validKeypoints.length;
    }
    
    /**
     * 格式化为关键点格式
     * @private
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {Array} 关键点数组
     */
    _formatAsKeypoints(data, options = {}) {
        if (!data || !data.keypoints) {
            return [];
        }
        
        return data.keypoints.map((keypoint, index) => ({
            id: index,
            name: keypoint.name || this.keypointNames[index] || `keypoint_${index}`,
            x: keypoint.x,
            y: keypoint.y,
            confidence: keypoint.confidence
        }));
    }
    
    /**
     * 格式化为骨架格式
     * @private
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 骨架数据
     */
    _formatAsSkeleton(data, options = {}) {
        const keypoints = this._formatAsKeypoints(data, options);
        
        return {
            keypoints: keypoints,
            connections: this.connections,
            score: data.score || 0
        };
    }
    
    /**
     * 格式化为归一化格式
     * @private
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 归一化数据
     */
    _formatAsNormalized(data, options = {}) {
        const normalizedData = this.normalize(data, options);
        return this._formatDefault(normalizedData, options);
    }
    
    /**
     * 格式化为JSON格式
     * @private
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {string} JSON字符串
     */
    _formatAsJSON(data, options = {}) {
        const formattedData = this._formatDefault(data, options);
        return JSON.stringify(formattedData, null, options.indent || 2);
    }
    
    /**
     * 格式化为数组格式
     * @private
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {Array} 数组格式
     */
    _formatAsArray(data, options = {}) {
        if (!data || !data.keypoints) {
            return [];
        }
        
        return data.keypoints.map(keypoint => [keypoint.x, keypoint.y, keypoint.confidence]);
    }
    
    /**
     * 默认格式化
     * @private
     * @param {Object} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 格式化后的数据
     */
    _formatDefault(data, options = {}) {
        return data;
    }
    
    /**
     * 验证姿态数据
     * @private
     * @param {Object} data - 姿态数据
     * @returns {boolean} 验证结果
     */
    _validatePoseData(data) {
        return data && 
               typeof data === 'object' && 
               Array.isArray(data.keypoints) &&
               data.keypoints.every(kp => 
                   kp && 
                   typeof kp.x === 'number' && 
                   typeof kp.y === 'number' && 
                   typeof kp.confidence === 'number'
               );
    }
    
    /**
     * 验证关键点数据
     * @private
     * @param {Array} data - 关键点数据
     * @returns {boolean} 验证结果
     */
    _validateKeypointsData(data) {
        return Array.isArray(data) &&
               data.every(kp => 
                   kp && 
                   typeof kp.x === 'number' && 
                   typeof kp.y === 'number' && 
                   typeof kp.confidence === 'number'
               );
    }
    
    /**
     * 验证图像数据
     * @private
     * @param {any} data - 图像数据
     * @returns {boolean} 验证结果
     */
    _validateImageData(data) {
        return this._isImageData(data);
    }
    
    /**
     * 归一化关键点数组
     * @private
     * @param {Array} keypoints - 关键点数组
     * @param {Object} options - 选项
     * @returns {Array} 归一化后的关键点数组
     */
    _normalizeKeypointsArray(keypoints, options = {}) {
        const inputSize = options.inputSize || this.options.inputImageSize;
        const outputSize = options.outputSize || this.options.outputImageSize || inputSize;
        
        const scaleX = outputSize.width / inputSize.width;
        const scaleY = outputSize.height / inputSize.height;
        
        return keypoints.map(keypoint => ({
            ...keypoint,
            x: keypoint.x * scaleX,
            y: keypoint.y * scaleY
        }));
    }
    
    /**
     * 更新统计信息
     * @private
     * @param {number} processingTime - 处理时间
     */
    _updateStats(processingTime) {
        this.stats.processedFrames++;
        this.stats.totalProcessingTime += processingTime;
        this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.processedFrames;
    }
}

// 导出数据类型枚举
export { DATA_TYPES, PROCESSING_STATUS };