import { StateManagerImpl } from '../../src/core/StateManager';
import { AppState } from '../../src/types';

describe('StateManager', () => {
  let stateManager: StateManagerImpl;

  beforeEach(() => {
    stateManager = new StateManagerImpl();
  });

  describe('状态更新', () => {
    it('应该能够更新状态', () => {
      const newState = {
        analysis: {
          isRunning: true,
          currentPose: null,
          repetitionCount: 5,
          currentExercise: 'squat',
          quality: {
            score: 85,
            feedback: ['Good form']
          }
        }
      };

      stateManager.setState(newState);
      const state = stateManager.getState();

      expect(state.analysis.isRunning).toBe(true);
      expect(state.analysis.repetitionCount).toBe(5);
      expect(state.analysis.currentExercise).toBe('squat');
      expect(state.analysis.quality.score).toBe(85);
    });

    it('应该保持未更新的状态不变', () => {
      const initialState = stateManager.getState();
      
      stateManager.setState({
        analysis: {
          isRunning: true,
          currentPose: null,
          repetitionCount: 0,
          currentExercise: null,
          quality: {
            score: 0,
            feedback: []
          }
        }
      });

      const updatedState = stateManager.getState();
      
      // 其他状态应该保持不变
      expect(updatedState.render).toEqual(initialState.render);
      expect(updatedState.ui).toEqual(initialState.ui);
    });
  });

  describe('状态订阅', () => {
    it('应该能够订阅状态变更', () => {
      const mockCallback = jest.fn();
      
      stateManager.subscribe(mockCallback);
      stateManager.setState({ 
        analysis: {
          isRunning: true,
          currentPose: null,
          repetitionCount: 0,
          currentExercise: null,
          quality: {
            score: 0,
            feedback: []
          }
        }
      });

      expect(mockCallback).toHaveBeenCalled();
    });

    it('应该能够取消订阅', () => {
      const mockCallback = jest.fn();
      
      const unsubscribe = stateManager.subscribe(mockCallback);
      unsubscribe();
      
      stateManager.setState({ 
        analysis: {
          isRunning: true,
          currentPose: null,
          repetitionCount: 0,
          currentExercise: null,
          quality: {
            score: 0,
            feedback: []
          }
        }
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('多个订阅者应该都能收到状态变更', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      stateManager.subscribe(mockCallback1);
      stateManager.subscribe(mockCallback2);
      stateManager.setState({ 
        analysis: {
          isRunning: true,
          currentPose: null,
          repetitionCount: 0,
          currentExercise: null,
          quality: {
            score: 0,
            feedback: []
          }
        }
      });

      expect(mockCallback1).toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });
  });

  describe('性能状态更新', () => {
    it('应该能够更新性能指标', () => {
      const performanceData = {
        frameRate: 30,
        inferenceTime: 16.7,
        totalTime: 33.3,
        memoryUsage: 128
      };

      stateManager.setState({ performance: performanceData });
      const state = stateManager.getState();

      expect(state.performance).toEqual(performanceData);
    });
  });

  describe('错误状态管理', () => {
    it('应该能够设置和清除错误状态', () => {
      const errorMessage = 'Test error';

      // 使用部分更新来设置错误
      stateManager.setState({ 
        ui: {
          error: errorMessage
        }
      });
      
      const stateWithError = stateManager.getState();
      expect(stateWithError.ui.error).toBe(errorMessage);
      // 确保其他ui属性仍然存在
      expect(stateWithError.ui.showControls).toBe(true);

      // 清除错误状态
      stateManager.setState({ 
        ui: {
          error: null
        }
      });
      
      const stateWithoutError = stateManager.getState();
      expect(stateWithoutError.ui.error).toBe(null);
      expect(stateWithoutError.ui.showControls).toBe(true);
    });
  });
});