/**
 * 结果格式化器
 * 负责将AI处理结果格式化为不同的输出格式
 */

import { IDataProcessor, DATA_FORMATS } from '../interfaces/IDataProcessor.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * 结果格式化器类
 * 提供多种输出格式的转换功能
 */
export class ResultFormatter extends IDataProcessor {
    constructor(options = {}) {
        super();
        
        // 配置选项
        this.options = {
            defaultFormat: options.defaultFormat || DATA_FORMATS.JSON,
            includeMetadata: options.includeMetadata !== false,
            includeTimestamp: options.includeTimestamp !== false,
            precision: options.precision || 3, // 数值精度
            enableCompression: options.enableCompression || false,
            ...options
        };
        
        // 格式化器映射
        this.formatters = new Map();
        this._initFormatters();
        
        // 统计信息
        this.stats = {
            formattedResults: 0,
            formatCounts: new Map(),
            totalFormatTime: 0,
            averageFormatTime: 0
        };
        
        console.log('📋 结果格式化器已创建');
    }
    
    /**
     * 格式化结果
     * @param {any} data - 输入数据
     * @param {string} format - 输出格式
     * @param {Object} options - 格式化选项
     * @returns {any} 格式化后的结果
     */
    format(data, format = null, options = {}) {
        const startTime = performance.now();
        
        try {
            if (!data) {
                return null;
            }
            
            const targetFormat = format || this.options.defaultFormat;
            const formatter = this.formatters.get(targetFormat);
            
            if (!formatter) {
                throw new Error(`不支持的格式: ${targetFormat}`);
            }
            
            // 合并选项
            const mergedOptions = { ...this.options, ...options };
            
            // 执行格式化
            const result = formatter(data, mergedOptions);
            
            // 添加元数据
            const finalResult = this._addMetadata(result, targetFormat, mergedOptions);
            
            // 更新统计信息
            const formatTime = performance.now() - startTime;
            this._updateStats(targetFormat, formatTime);
            
            return finalResult;
            
        } catch (error) {
            console.error('❌ 结果格式化失败:', error);
            throw ErrorHandler.createError('ResultFormatter', `格式化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 批量格式化
     * @param {Array} dataArray - 数据数组
     * @param {string} format - 输出格式
     * @param {Object} options - 格式化选项
     * @returns {Array} 格式化后的结果数组
     */
    formatBatch(dataArray, format = null, options = {}) {
        if (!Array.isArray(dataArray)) {
            throw new Error('输入必须是数组');
        }
        
        return dataArray.map(data => this.format(data, format, options));
    }
    
    /**
     * 注册自定义格式化器
     * @param {string} formatName - 格式名称
     * @param {Function} formatter - 格式化函数
     */
    registerFormatter(formatName, formatter) {
        if (typeof formatter !== 'function') {
            throw new Error('格式化器必须是函数');
        }
        
        this.formatters.set(formatName, formatter);
        console.log(`📋 已注册自定义格式化器: ${formatName}`);
    }
    
    /**
     * 获取支持的格式列表
     * @returns {Array<string>} 支持的格式列表
     */
    getSupportedFormats() {
        return Array.from(this.formatters.keys());
    }
    
    /**
     * 获取格式化器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            supportedFormats: this.getSupportedFormats(),
            stats: {
                ...this.stats,
                formatCounts: Object.fromEntries(this.stats.formatCounts)
            },
            options: { ...this.options }
        };
    }
    
    /**
     * 初始化内置格式化器
     * @private
     */
    _initFormatters() {
        // JSON格式化器
        this.formatters.set(DATA_FORMATS.JSON, (data, options) => {
            return this._formatAsJSON(data, options);
        });
        
        // 数组格式化器
        this.formatters.set(DATA_FORMATS.ARRAY, (data, options) => {
            return this._formatAsArray(data, options);
        });
        
        // CSV格式化器
        this.formatters.set(DATA_FORMATS.CSV, (data, options) => {
            return this._formatAsCSV(data, options);
        });
        
        // XML格式化器
        this.formatters.set(DATA_FORMATS.XML, (data, options) => {
            return this._formatAsXML(data, options);
        });
        
        // 标准化格式化器
        this.formatters.set('normalized', (data, options) => {
            return this._formatAsNormalized(data, options);
        });
        
        // 关键点格式化器
        this.formatters.set('keypoints', (data, options) => {
            return this._formatAsKeypoints(data, options);
        });
        
        // 骨架格式化器
        this.formatters.set('skeleton', (data, options) => {
            return this._formatAsSkeleton(data, options);
        });
        
        // 绘制格式化器
        this.formatters.set('drawing', (data, options) => {
            return this._formatForDrawing(data, options);
        });
        
        // 压缩格式化器
        this.formatters.set('compressed', (data, options) => {
            return this._formatAsCompressed(data, options);
        });
    }
    
    /**
     * JSON格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {string} JSON字符串
     */
    _formatAsJSON(data, options) {
        const processedData = this._processNumericPrecision(data, options.precision);
        
        if (options.pretty !== false) {
            return JSON.stringify(processedData, null, options.indent || 2);
        }
        
        return JSON.stringify(processedData);
    }
    
    /**
     * 数组格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {Array} 数组格式
     */
    _formatAsArray(data, options) {
        if (!data) {
            return [];
        }
        
        if (data.keypoints && Array.isArray(data.keypoints)) {
            return data.keypoints.map(kp => {
                const coords = [kp.x, kp.y, kp.confidence];
                return this._roundArray(coords, options.precision);
            });
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this._processNumericPrecision(item, options.precision));
        }
        
        return [data];
    }
    
    /**
     * CSV格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {string} CSV字符串
     */
    _formatAsCSV(data, options) {
        if (!data || !data.keypoints) {
            return '';
        }
        
        const headers = ['keypoint_id', 'name', 'x', 'y', 'confidence'];
        const rows = [headers.join(',')];
        
        data.keypoints.forEach((kp, index) => {
            const row = [
                index,
                kp.name || `keypoint_${index}`,
                this._roundNumber(kp.x, options.precision),
                this._roundNumber(kp.y, options.precision),
                this._roundNumber(kp.confidence, options.precision)
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }
    
    /**
     * XML格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {string} XML字符串
     */
    _formatAsXML(data, options) {
        if (!data) {
            return '<pose></pose>';
        }
        
        let xml = '<pose>';
        
        if (data.score !== undefined) {
            xml += `<score>${this._roundNumber(data.score, options.precision)}</score>`;
        }
        
        if (data.keypoints && Array.isArray(data.keypoints)) {
            xml += '<keypoints>';
            
            data.keypoints.forEach((kp, index) => {
                xml += `<keypoint id="${index}">`;
                xml += `<name>${kp.name || `keypoint_${index}`}</name>`;
                xml += `<x>${this._roundNumber(kp.x, options.precision)}</x>`;
                xml += `<y>${this._roundNumber(kp.y, options.precision)}</y>`;
                xml += `<confidence>${this._roundNumber(kp.confidence, options.precision)}</confidence>`;
                xml += '</keypoint>';
            });
            
            xml += '</keypoints>';
        }
        
        xml += '</pose>';
        
        return xml;
    }
    
    /**
     * 标准化格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 标准化数据
     */
    _formatAsNormalized(data, options) {
        if (!data || !data.keypoints) {
            return { keypoints: [], score: 0 };
        }
        
        const normalizedKeypoints = data.keypoints.map((kp, index) => ({
            id: index,
            name: kp.name || `keypoint_${index}`,
            position: {
                x: this._roundNumber(kp.x, options.precision),
                y: this._roundNumber(kp.y, options.precision)
            },
            confidence: this._roundNumber(kp.confidence, options.precision),
            visible: kp.confidence > (options.visibilityThreshold || 0.3)
        }));
        
        return {
            keypoints: normalizedKeypoints,
            score: this._roundNumber(data.score || 0, options.precision),
            timestamp: options.includeTimestamp ? Date.now() : undefined
        };
    }
    
    /**
     * 关键点格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {Array} 关键点数组
     */
    _formatAsKeypoints(data, options) {
        if (!data || !data.keypoints) {
            return [];
        }
        
        return data.keypoints.map((kp, index) => ({
            id: index,
            name: kp.name || `keypoint_${index}`,
            x: this._roundNumber(kp.x, options.precision),
            y: this._roundNumber(kp.y, options.precision),
            confidence: this._roundNumber(kp.confidence, options.precision)
        }));
    }
    
    /**
     * 骨架格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 骨架数据
     */
    _formatAsSkeleton(data, options) {
        const keypoints = this._formatAsKeypoints(data, options);
        
        // 默认连接定义
        const connections = [
            [0, 1], [0, 2], [1, 3], [2, 4], // 头部
            [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // 上身
            [5, 11], [6, 12], [11, 12], // 躯干
            [11, 13], [13, 15], [12, 14], [14, 16] // 下身
        ];
        
        return {
            keypoints: keypoints,
            connections: connections,
            score: this._roundNumber(data.score || 0, options.precision)
        };
    }
    
    /**
     * 绘制格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 绘制数据
     */
    _formatForDrawing(data, options) {
        if (!data || !data.keypoints) {
            return { points: [], lines: [] };
        }
        
        const points = data.keypoints
            .filter(kp => kp.confidence > (options.visibilityThreshold || 0.3))
            .map((kp, index) => ({
                id: index,
                x: Math.round(kp.x),
                y: Math.round(kp.y),
                confidence: this._roundNumber(kp.confidence, 2),
                color: this._getKeypointColor(index, options),
                radius: options.pointRadius || 3
            }));
        
        const lines = this._generateDrawingLines(data.keypoints, options);
        
        return {
            points: points,
            lines: lines,
            score: this._roundNumber(data.score || 0, options.precision)
        };
    }
    
    /**
     * 压缩格式化
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {Object} 压缩数据
     */
    _formatAsCompressed(data, options) {
        if (!data || !data.keypoints) {
            return { k: [], s: 0 };
        }
        
        // 压缩关键点数据
        const compressedKeypoints = data.keypoints.map(kp => [
            Math.round(kp.x * 100) / 100, // 保留2位小数
            Math.round(kp.y * 100) / 100,
            Math.round(kp.confidence * 100) / 100
        ]);
        
        return {
            k: compressedKeypoints, // keypoints
            s: Math.round((data.score || 0) * 100) / 100, // score
            t: options.includeTimestamp ? Date.now() : undefined // timestamp
        };
    }
    
    /**
     * 添加元数据
     * @private
     * @param {any} result - 结果数据
     * @param {string} format - 格式
     * @param {Object} options - 选项
     * @returns {any} 带元数据的结果
     */
    _addMetadata(result, format, options) {
        if (!options.includeMetadata) {
            return result;
        }
        
        // 对于字符串格式（如JSON、CSV、XML），不添加元数据
        if (typeof result === 'string') {
            return result;
        }
        
        const metadata = {
            format: format,
            timestamp: options.includeTimestamp ? Date.now() : undefined,
            version: '1.0',
            precision: options.precision
        };
        
        if (Array.isArray(result)) {
            return {
                data: result,
                metadata: metadata
            };
        }
        
        return {
            ...result,
            metadata: metadata
        };
    }
    
    /**
     * 处理数值精度
     * @private
     * @param {any} data - 数据
     * @param {number} precision - 精度
     * @returns {any} 处理后的数据
     */
    _processNumericPrecision(data, precision) {
        if (typeof data === 'number') {
            return this._roundNumber(data, precision);
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this._processNumericPrecision(item, precision));
        }
        
        if (data && typeof data === 'object') {
            const processed = {};
            for (const [key, value] of Object.entries(data)) {
                processed[key] = this._processNumericPrecision(value, precision);
            }
            return processed;
        }
        
        return data;
    }
    
    /**
     * 四舍五入数字
     * @private
     * @param {number} num - 数字
     * @param {number} precision - 精度
     * @returns {number} 四舍五入后的数字
     */
    _roundNumber(num, precision) {
        if (typeof num !== 'number' || isNaN(num)) {
            return num;
        }
        
        const factor = Math.pow(10, precision || 3);
        return Math.round(num * factor) / factor;
    }
    
    /**
     * 四舍五入数组
     * @private
     * @param {Array} arr - 数组
     * @param {number} precision - 精度
     * @returns {Array} 四舍五入后的数组
     */
    _roundArray(arr, precision) {
        return arr.map(num => this._roundNumber(num, precision));
    }
    
    /**
     * 获取关键点颜色
     * @private
     * @param {number} index - 关键点索引
     * @param {Object} options - 选项
     * @returns {string} 颜色值
     */
    _getKeypointColor(index, options) {
        const colors = options.colors || [
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00',
            '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF',
            '#FF00FF', '#FF0080', '#FF4040', '#FF8040', '#FFFF40',
            '#80FF40', '#40FF40'
        ];
        
        return colors[index % colors.length];
    }
    
    /**
     * 生成绘制线条
     * @private
     * @param {Array} keypoints - 关键点数组
     * @param {Object} options - 选项
     * @returns {Array} 线条数组
     */
    _generateDrawingLines(keypoints, options) {
        const connections = [
            [0, 1], [0, 2], [1, 3], [2, 4], // 头部
            [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // 上身
            [5, 11], [6, 12], [11, 12], // 躯干
            [11, 13], [13, 15], [12, 14], [14, 16] // 下身
        ];
        
        const threshold = options.visibilityThreshold || 0.3;
        const lines = [];
        
        connections.forEach(([startIdx, endIdx]) => {
            const startKp = keypoints[startIdx];
            const endKp = keypoints[endIdx];
            
            if (startKp && endKp && 
                startKp.confidence > threshold && 
                endKp.confidence > threshold) {
                lines.push({
                    start: { x: Math.round(startKp.x), y: Math.round(startKp.y) },
                    end: { x: Math.round(endKp.x), y: Math.round(endKp.y) },
                    color: options.lineColor || '#00FF00',
                    width: options.lineWidth || 2
                });
            }
        });
        
        return lines;
    }
    
    /**
     * 更新统计信息
     * @private
     * @param {string} format - 格式
     * @param {number} formatTime - 格式化时间
     */
    _updateStats(format, formatTime) {
        this.stats.formattedResults++;
        this.stats.totalFormatTime += formatTime;
        this.stats.averageFormatTime = this.stats.totalFormatTime / this.stats.formattedResults;
        
        const currentCount = this.stats.formatCounts.get(format) || 0;
        this.stats.formatCounts.set(format, currentCount + 1);
    }
}

// 导出数据格式枚举
export { DATA_FORMATS };