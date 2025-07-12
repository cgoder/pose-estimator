/**
 * OneEuroFilterManager 单元测试
 * 测试 TypeScript 版本的 OneEuroFilterManager 实现
 */

import { OneEuroFilterManager } from '../../src/components/OneEuroFilterManager';

// 模拟 CONFIG 对象
const mockConfig = {
    UI: {
        CONFIDENCE_THRESHOLD: 0.5
    }
};

// 模拟全局 CONFIG
(global as any).CONFIG = mockConfig;

describe('OneEuroFilterManager', () => {
    let manager: OneEuroFilterManager;

    beforeEach(() => {
        manager = new OneEuroFilterManager();
    });

    test('应该正确初始化', () => {
        expect(manager).toBeDefined();
        expect(manager.getStats().enabled).toBe(true);
        expect(manager.getStats().filterCount).toBe(0);
    });

    test('应该正确过滤姿态关键点', () => {
        const keypoints = [
            { x: 100, y: 200, score: 0.9 },
            { x: 150, y: 250, score: 0.8 },
            { x: 200, y: 300, score: 0.3 } // 低置信度
        ];

        const filtered = manager.filterPose(keypoints, 0);
        
        expect(filtered).toHaveLength(3);
        expect(filtered[0].x).toBe(100); // 第一次调用应该返回原值
        expect(filtered[0].y).toBe(200);
        expect(filtered[2]).toStrictEqual(keypoints[2]); // 低置信度应该跳过滤波
    });

    test('应该正确处理连续的姿态数据', () => {
        const keypoints1 = [{ x: 100, y: 200, score: 0.9 }];
        const keypoints2 = [{ x: 102, y: 198, score: 0.9 }];

        const filtered1 = manager.filterPose(keypoints1, 0);
        const filtered2 = manager.filterPose(keypoints2, 33);

        expect(filtered1[0].x).toBe(100);
        expect(filtered2[0].x).toBeCloseTo(102, 0); // 应该接近新值
        expect(manager.getStats().filterCount).toBe(2); // x 和 y 滤波器
    });

    test('应该正确更新参数', () => {
        const newParams = {
            frequency: 60.0,
            minCutoff: 2.0,
            beta: 0.01
        };

        manager.updateParameters(newParams);
        const params = manager.getParameters();

        expect(params.frequency).toBe(60.0);
        expect(params.minCutoff).toBe(2.0);
        expect(params.beta).toBe(0.01);
    });

    test('应该正确启用/禁用滤波器', () => {
        const keypoints = [{ x: 100, y: 200, score: 0.9 }];

        manager.setEnabled(false);
        const unfiltered = manager.filterPose(keypoints, 0);
        
        expect(unfiltered).toBe(keypoints); // 应该返回原始数据
        expect(manager.getStats().enabled).toBe(false);

        manager.setEnabled(true);
        expect(manager.getStats().enabled).toBe(true);
    });

    test('应该正确重置滤波器', () => {
        const keypoints = [{ x: 100, y: 200, score: 0.9 }];
        
        // 创建一些滤波器
        manager.filterPose(keypoints, 0);
        expect(manager.getStats().filterCount).toBe(2);

        // 重置滤波器
        manager.resetFilters();
        expect(manager.getStats().filterCount).toBe(0);
    });

    test('应该正确应用预设', () => {
        const success = manager.applyPreset('smooth');
        expect(success).toBe(true);

        const params = manager.getParameters();
        expect(params.frequency).toBe(30.0);
        expect(params.minCutoff).toBe(0.5);
    });

    test('应该正确处理无效预设', () => {
        const success = manager.applyPreset('invalid_preset');
        expect(success).toBe(false);
    });

    test('应该正确导出和导入配置', () => {
        // 修改一些参数
        manager.updateParameters({ frequency: 45.0, beta: 0.01 });
        manager.setEnabled(false);

        // 导出配置
        const configJson = manager.exportConfig();
        expect(configJson).toContain('45');
        expect(configJson).toContain('false');

        // 创建新的管理器并导入配置
        const newManager = new OneEuroFilterManager();
        const success = newManager.importConfig(configJson);

        expect(success).toBe(true);
        expect(newManager.getParameters().frequency).toBe(45.0);
        expect(newManager.getStats().enabled).toBe(false);
    });

    test('应该正确处理无效的导入配置', () => {
        const success = manager.importConfig('invalid json');
        expect(success).toBe(false);
    });

    test('应该正确验证参数', () => {
        const validParams = { frequency: 30.0, minCutoff: 1.0 };
        const validation = OneEuroFilterManager.validateParameters(validParams);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        const invalidParams = { frequency: -10, minCutoff: 0 };
        const invalidValidation = OneEuroFilterManager.validateParameters(invalidParams);
        expect(invalidValidation.isValid).toBe(false);
        expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });

    test('应该正确获取推荐参数', () => {
        const smoothPreset = OneEuroFilterManager.getRecommendedParameters('smooth');
        expect(smoothPreset).toBeDefined();
        expect(smoothPreset?.frequency).toBe(30.0);

        const invalidPreset = OneEuroFilterManager.getRecommendedParameters('invalid');
        expect(invalidPreset).toBeNull();
    });

    test('应该正确处理空的关键点数组', () => {
        const emptyKeypoints: any[] = [];
        const filtered = manager.filterPose(emptyKeypoints, 0);
        expect(filtered).toEqual(emptyKeypoints);
    });

    test('应该正确处理 undefined 关键点', () => {
        const keypoints = [
            { x: 100, y: 200, score: 0.9 },
            undefined,
            { x: 200, y: 300, score: 0.8 }
        ];

        const filtered = manager.filterPose(keypoints as any, 0);
        expect(filtered[1]).toBeUndefined();
        expect(filtered[0].x).toBe(100);
        expect(filtered[2].x).toBe(200);
    });
});