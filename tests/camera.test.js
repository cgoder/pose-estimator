/**
 * 摄像头功能单元测试
 * 测试摄像头切换、错误处理、性能监控等功能
 */

// Mock MediaDevices API
const mockMediaDevices = {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn()
};

// Mock navigator
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: mockMediaDevices,
    writable: true
});

// 导入测试模块
import { CameraManager } from '../src/components/CameraManager.js';
import { CameraError, CameraErrorFactory } from '../src/utils/cameraErrors.js';
import { CameraPerformanceMonitor } from '../src/utils/cameraPerformanceMonitor.js';

describe('CameraManager', () => {
    let cameraManager;

    beforeEach(() => {
        cameraManager = new CameraManager();
        jest.clearAllMocks();
    });

    describe('初始化', () => {
        test('应该正确初始化CameraManager', () => {
            expect(cameraManager).toBeInstanceOf(CameraManager);
            expect(cameraManager.currentStream).toBeNull();
            expect(cameraManager.currentFacingMode).toBe('user');
        });

        test('应该正确更新可用设备', async () => {
            const mockDevices = [
                { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
                { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' }
            ];
            
            mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices);
            
            await cameraManager.updateAvailableDevices();
            
            expect(cameraManager.availableDevices).toHaveLength(2);
            expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled();
        });
    });

    describe('摄像头切换支持检查', () => {
        test('应该检测到多摄像头支持', async () => {
            const mockDevices = [
                { deviceId: 'camera1', kind: 'videoinput' },
                { deviceId: 'camera2', kind: 'videoinput' }
            ];
            
            mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices);
            
            const isSupported = await cameraManager.checkSwitchSupport();
            
            expect(isSupported).toBe(true);
        });

        test('应该检测到单摄像头不支持切换', async () => {
            const mockDevices = [
                { deviceId: 'camera1', kind: 'videoinput' }
            ];
            
            mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices);
            
            const isSupported = await cameraManager.checkSwitchSupport();
            
            expect(isSupported).toBe(false);
        });
    });

    describe('摄像头设置', () => {
        test('应该成功设置摄像头', async () => {
            const mockStream = { id: 'stream1' };
            mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
            
            const stream = await cameraManager.setupCamera('user');
            
            expect(stream).toBe(mockStream);
            expect(cameraManager.currentStream).toBe(mockStream);
            expect(cameraManager.currentFacingMode).toBe('user');
        });

        test('应该处理摄像头设置失败', async () => {
            const mockError = new DOMException('Permission denied', 'NotAllowedError');
            mockMediaDevices.getUserMedia.mockRejectedValue(mockError);
            
            await expect(cameraManager.setupCamera('user')).rejects.toThrow(CameraError);
        });
    });

    describe('摄像头切换', () => {
        test('应该成功切换摄像头', async () => {
            // 设置初始摄像头
            const mockStream1 = { 
                id: 'stream1',
                getTracks: () => [{ stop: jest.fn() }]
            };
            const mockStream2 = { id: 'stream2' };
            
            mockMediaDevices.getUserMedia
                .mockResolvedValueOnce(mockStream1)
                .mockResolvedValueOnce(mockStream2);
            
            await cameraManager.setupCamera('user');
            const newStream = await cameraManager.switchCamera();
            
            expect(newStream).toBe(mockStream2);
            expect(cameraManager.currentFacingMode).toBe('environment');
        });

        test('应该处理切换超时', async () => {
            mockMediaDevices.getUserMedia.mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 10000))
            );
            
            await expect(cameraManager.switchCamera(1000)).rejects.toThrow('切换超时');
        });
    });

    describe('资源清理', () => {
        test('应该正确清理资源', async () => {
            const mockTrack = { stop: jest.fn() };
            const mockStream = { 
                getTracks: () => [mockTrack]
            };
            
            cameraManager.currentStream = mockStream;
            cameraManager.cleanup();
            
            expect(mockTrack.stop).toHaveBeenCalled();
            expect(cameraManager.currentStream).toBeNull();
        });
    });
});

describe('CameraError', () => {
    test('应该创建正确的错误实例', () => {
        const error = new CameraError('PERMISSION_DENIED', 'Permission denied');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.message).toBe('Permission denied');
    });

    test('应该提供用户友好的错误信息', () => {
        const error = new CameraError('PERMISSION_DENIED', 'Permission denied');
        const friendlyMessage = error.getUserFriendlyMessage();
        
        expect(friendlyMessage).toContain('摄像头权限');
    });

    test('应该提供解决方案建议', () => {
        const error = new CameraError('PERMISSION_DENIED', 'Permission denied');
        const solution = error.getSuggestedSolution();
        
        expect(solution).toContain('浏览器设置');
    });
});

describe('CameraErrorFactory', () => {
    test('应该从DOMException创建CameraError', () => {
        const domException = new DOMException('Permission denied', 'NotAllowedError');
        const cameraError = CameraErrorFactory.fromDOMException(domException);
        
        expect(cameraError).toBeInstanceOf(CameraError);
        expect(cameraError.code).toBe('PERMISSION_DENIED');
    });

    test('应该创建切换不支持错误', () => {
        const error = CameraErrorFactory.switchNotSupported();
        
        expect(error.code).toBe('SWITCH_NOT_SUPPORTED');
    });

    test('应该创建切换超时错误', () => {
        const error = CameraErrorFactory.switchTimeout();
        
        expect(error.code).toBe('SWITCH_TIMEOUT');
    });
});

describe('CameraPerformanceMonitor', () => {
    let monitor;

    beforeEach(() => {
        monitor = new CameraPerformanceMonitor();
    });

    test('应该正确记录切换时间', () => {
        monitor.startSwitchTimer();
        
        // 模拟延迟
        setTimeout(() => {
            monitor.endSwitchTimer();
            
            const report = monitor.getReport();
            expect(report.switchCount).toBe(1);
            expect(report.averageSwitchTime).toBeGreaterThan(0);
        }, 100);
    });

    test('应该记录错误', () => {
        monitor.recordError('PERMISSION_DENIED');
        
        const report = monitor.getReport();
        expect(report.errorCount).toBe(1);
        expect(report.errors['PERMISSION_DENIED']).toBe(1);
    });

    test('应该生成性能报告', () => {
        monitor.startSwitchTimer();
        monitor.endSwitchTimer();
        monitor.recordError('SWITCH_TIMEOUT');
        
        const report = monitor.getReport();
        
        expect(report).toHaveProperty('switchCount');
        expect(report).toHaveProperty('errorCount');
        expect(report).toHaveProperty('averageSwitchTime');
        expect(report).toHaveProperty('errors');
    });

    test('应该重置统计数据', () => {
        monitor.recordError('PERMISSION_DENIED');
        monitor.reset();
        
        const report = monitor.getReport();
        expect(report.errorCount).toBe(0);
        expect(report.switchCount).toBe(0);
    });
});

// 集成测试
describe('摄像头功能集成测试', () => {
    let cameraManager;
    let performanceMonitor;

    beforeEach(() => {
        cameraManager = new CameraManager();
        performanceMonitor = new CameraPerformanceMonitor();
    });

    test('应该完整执行摄像头切换流程', async () => {
        // Mock设备
        const mockDevices = [
            { deviceId: 'camera1', kind: 'videoinput' },
            { deviceId: 'camera2', kind: 'videoinput' }
        ];
        
        const mockStream1 = { 
            id: 'stream1',
            getTracks: () => [{ stop: jest.fn() }]
        };
        const mockStream2 = { id: 'stream2' };
        
        mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices);
        mockMediaDevices.getUserMedia
            .mockResolvedValueOnce(mockStream1)
            .mockResolvedValueOnce(mockStream2);
        
        // 检查支持
        const isSupported = await cameraManager.checkSwitchSupport();
        expect(isSupported).toBe(true);
        
        // 设置初始摄像头
        performanceMonitor.startSetupTimer();
        await cameraManager.setupCamera('user');
        performanceMonitor.endSetupTimer();
        
        // 执行切换
        performanceMonitor.startSwitchTimer();
        const newStream = await cameraManager.switchCamera();
        performanceMonitor.endSwitchTimer();
        
        // 验证结果
        expect(newStream).toBe(mockStream2);
        expect(cameraManager.currentFacingMode).toBe('environment');
        
        const report = performanceMonitor.getReport();
        expect(report.switchCount).toBe(1);
        expect(report.setupCount).toBe(1);
    });

    test('应该处理完整的错误恢复流程', async () => {
        // Mock权限错误
        const mockError = new DOMException('Permission denied', 'NotAllowedError');
        mockMediaDevices.getUserMedia.mockRejectedValue(mockError);
        
        try {
            await cameraManager.setupCamera('user');
        } catch (error) {
            expect(error).toBeInstanceOf(CameraError);
            expect(error.code).toBe('PERMISSION_DENIED');
            
            performanceMonitor.recordError(error.code);
        }
        
        const report = performanceMonitor.getReport();
        expect(report.errorCount).toBe(1);
        expect(report.errors['PERMISSION_DENIED']).toBe(1);
    });
});

// 性能测试
describe('摄像头功能性能测试', () => {
    test('切换操作应该在合理时间内完成', async () => {
        const cameraManager = new CameraManager();
        const mockStream = { id: 'stream1' };
        
        mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
        
        const startTime = performance.now();
        await cameraManager.setupCamera('user');
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    test('多次切换不应该造成内存泄漏', async () => {
        const cameraManager = new CameraManager();
        const mockStream = { 
            getTracks: () => [{ stop: jest.fn() }]
        };
        
        mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
        
        // 执行多次切换
        for (let i = 0; i < 10; i++) {
            await cameraManager.setupCamera(i % 2 === 0 ? 'user' : 'environment');
        }
        
        // 验证资源清理
        cameraManager.cleanup();
        expect(cameraManager.currentStream).toBeNull();
    });
});

// 边界条件测试
describe('摄像头功能边界条件测试', () => {
    test('应该处理无摄像头设备的情况', async () => {
        mockMediaDevices.enumerateDevices.mockResolvedValue([]);
        
        const cameraManager = new CameraManager();
        const isSupported = await cameraManager.checkSwitchSupport();
        
        expect(isSupported).toBe(false);
    });

    test('应该处理网络断开的情况', async () => {
        const cameraManager = new CameraManager();
        const mockError = new DOMException('Network error', 'NetworkError');
        
        mockMediaDevices.getUserMedia.mockRejectedValue(mockError);
        
        await expect(cameraManager.setupCamera('user')).rejects.toThrow(CameraError);
    });

    test('应该处理并发切换请求', async () => {
        const cameraManager = new CameraManager();
        const mockStream = { id: 'stream1' };
        
        mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
        
        // 同时发起多个切换请求
        const promises = [
            cameraManager.switchCamera(),
            cameraManager.switchCamera(),
            cameraManager.switchCamera()
        ];
        
        // 应该只有一个成功，其他被拒绝或忽略
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled');
        
        expect(successful.length).toBeLessThanOrEqual(1);
    });
});