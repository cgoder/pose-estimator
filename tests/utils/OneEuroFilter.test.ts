/**
 * OneEuroFilter 单元测试
 * 测试 TypeScript 版本的 One Euro Filter 实现
 */

import { OneEuroFilter, LowPassFilter } from '../../src/utils/OneEuroFilter';

describe('LowPassFilter', () => {
    let filter: LowPassFilter;

    beforeEach(() => {
        filter = new LowPassFilter(1.0); // alpha = 1.0 (无滤波)
    });

    test('应该正确初始化', () => {
        expect(filter).toBeDefined();
    });

    test('第一次调用应该返回输入值', () => {
        const result = filter.filter(10.0);
        expect(result).toBe(10.0);
    });

    test('alpha=1.0 时应该无滤波效果', () => {
        filter.filter(10.0);
        const result = filter.filter(20.0);
        expect(result).toBe(20.0);
    });

    test('alpha=0.0 时应该完全滤波', () => {
        const zeroFilter = new LowPassFilter(0.0);
        zeroFilter.filter(10.0);
        const result = zeroFilter.filter(20.0);
        expect(result).toBe(10.0);
    });

    test('应该正确更新 alpha 值', () => {
        filter.filter(10.0);
        filter.setAlpha(0.5);
        const result = filter.filter(20.0);
        expect(result).toBe(15.0); // 10 + 0.5 * (20 - 10)
    });
});

describe('OneEuroFilter', () => {
    let filter: OneEuroFilter;

    beforeEach(() => {
        filter = new OneEuroFilter({
            frequency: 30.0,
            minCutoff: 1.0,
            beta: 0.007,
            dCutoff: 1.0
        });
    });

    test('应该正确初始化', () => {
        expect(filter).toBeDefined();
    });

    test('第一次调用应该返回输入值', () => {
        const result = filter.filter(10.0, 0);
        expect(result).toBe(10.0);
    });

    test('应该处理连续的输入值', () => {
        const timestamp1 = 0;
        const timestamp2 = 33; // ~30fps

        const result1 = filter.filter(10.0, timestamp1);
        const result2 = filter.filter(12.0, timestamp2);

        expect(result1).toBe(10.0);
        expect(result2).toBeCloseTo(12.0, 1); // 应该接近输入值
    });

    test('应该正确处理高频噪声', () => {
        const baseValue = 10.0;
        const noise = 0.1;
        let timestamp = 0;

        // 添加基准值
        filter.filter(baseValue, timestamp);

        // 添加噪声值
        timestamp += 33;
        const noisyResult = filter.filter(baseValue + noise, timestamp);

        // 滤波后的值应该比原始噪声值更接近基准值
        expect(Math.abs(noisyResult - baseValue)).toBeLessThan(noise);
    });

    test('应该正确更新参数', () => {
        const newConfig = {
            frequency: 60.0,
            minCutoff: 2.0,
            beta: 0.01,
            dCutoff: 2.0
        };

        filter.updateConfig(newConfig);
        
        // 测试参数是否更新（通过行为变化来验证）
        const result1 = filter.filter(10.0, 0);
        const result2 = filter.filter(20.0, 16); // ~60fps

        expect(result1).toBe(10.0);
        expect(result2).toBeCloseTo(20.0, 1);
    });

    test('应该处理部分参数更新', () => {
        filter.updateConfig({ frequency: 60.0 });
        
        // 应该不会抛出错误
        expect(() => {
            filter.filter(10.0, 0);
            filter.filter(15.0, 16);
        }).not.toThrow();
    });

    test('应该处理零时间差', () => {
        const result1 = filter.filter(10.0, 100);
        expect(result1).toBe(10.0); // 第一次调用返回输入值
        
        // 相同时间戳时，频率保持不变，滤波器仍会处理新输入
        const result2 = filter.filter(20.0, 100);
        expect(result2).toBeGreaterThan(10.0); // 应该大于前一个值
        expect(result2).toBeLessThan(20.0); // 但小于新输入值（因为滤波效果）
    });

    test('应该处理负时间差', () => {
        filter.filter(10.0, 100);
        
        // 负时间差应该使用默认频率
        expect(() => {
            filter.filter(20.0, 50);
        }).not.toThrow();
    });
});

describe('OneEuroFilter 边界情况', () => {
    test('应该处理极小的 cutoff 值', () => {
        const filter = new OneEuroFilter({
            frequency: 30.0,
            minCutoff: 0.001,
            beta: 0.007,
            dCutoff: 0.001
        });

        expect(() => {
            filter.filter(10.0, 0);
            filter.filter(20.0, 33);
        }).not.toThrow();
    });

    test('应该处理极大的 beta 值', () => {
        const filter = new OneEuroFilter({
            frequency: 30.0,
            minCutoff: 1.0,
            beta: 10.0,
            dCutoff: 1.0
        });

        expect(() => {
            filter.filter(10.0, 0);
            filter.filter(20.0, 33);
        }).not.toThrow();
    });

    test('应该处理零频率', () => {
        const filter = new OneEuroFilter({
            frequency: 0,
            minCutoff: 1.0,
            beta: 0.007,
            dCutoff: 1.0
        });

        // 应该使用默认频率而不是崩溃
        expect(() => {
            filter.filter(10.0, 0);
            filter.filter(20.0, 33);
        }).not.toThrow();
    });
});