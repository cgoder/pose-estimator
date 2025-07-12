import { EventBusImpl } from '../../src/core/EventBus';

describe('EventBus', () => {
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('事件订阅和发布', () => {
    test('应该能够订阅和触发事件', () => {
      const mockCallback = jest.fn();
      const testData = { message: 'test' };

      eventBus.on('test-event', mockCallback);
      eventBus.emit('test-event', testData);

      expect(mockCallback).toHaveBeenCalledWith(testData);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('应该能够订阅多个监听器', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const testData = { message: 'test' };

      eventBus.on('test-event', mockCallback1);
      eventBus.on('test-event', mockCallback2);
      eventBus.emit('test-event', testData);

      expect(mockCallback1).toHaveBeenCalledWith(testData);
      expect(mockCallback2).toHaveBeenCalledWith(testData);
    });

    test('应该能够取消订阅特定监听器', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      eventBus.on('test-event', mockCallback1);
      eventBus.on('test-event', mockCallback2);
      eventBus.off('test-event', mockCallback1);
      eventBus.emit('test-event', { message: 'test' });

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });

    test('应该能够取消订阅所有监听器', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      eventBus.on('test-event', mockCallback1);
      eventBus.on('another-event', mockCallback2);
      eventBus.clear();
      
      eventBus.emit('test-event', { message: 'test' });
      eventBus.emit('another-event', { message: 'test' });

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    test('监听器抛出错误时不应影响其他监听器', () => {
      // 模拟console.error以避免测试输出中的错误信息
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockCallback1 = jest.fn(() => {
        throw new Error('Test error');
      });
      const mockCallback2 = jest.fn();

      eventBus.on('test-event', mockCallback1);
      eventBus.on('test-event', mockCallback2);

      // 应该不会抛出错误
      expect(() => {
        eventBus.emit('test-event', { message: 'test' });
      }).not.toThrow();

      expect(mockCallback1).toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('事件处理器错误'),
        expect.any(Error)
      );
      
      // 恢复console.error
      consoleSpy.mockRestore();
    });
  });

  describe('类型安全', () => {
    test('应该支持类型化的事件数据', () => {
      interface TestEventData {
        id: number;
        name: string;
      }

      const mockCallback = jest.fn<void, [TestEventData]>();
      const testData: TestEventData = { id: 1, name: 'test' };

      eventBus.on('typed-event', mockCallback);
      eventBus.emit('typed-event', testData);

      expect(mockCallback).toHaveBeenCalledWith(testData);
    });
  });
});