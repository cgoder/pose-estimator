import { StateManager, AppState, StateChangeCallback } from '../types/index.js';
/**
 * 状态管理器实现
 * 提供集中式的应用状态管理
 */
export declare class StateManagerImpl implements StateManager {
    private state;
    private subscribers;
    constructor();
    /**
     * 创建初始状态
     */
    private createInitialState;
    /**
     * 获取当前状态
     */
    getState(): AppState;
    /**
     * 深拷贝对象
     */
    private deepClone;
    /**
     * 更新状态
     * @param newState 新状态（部分更新）
     */
    setState(newState: Partial<AppState>): void;
    /**
     * 订阅状态变更
     * @param callback 回调函数
     * @returns 取消订阅函数
     */
    subscribe(callback: StateChangeCallback): () => void;
    /**
     * 重置状态
     */
    reset(): void;
    /**
     * 通知所有订阅者
     */
    private notifySubscribers;
    /**
     * 深度合并对象
     */
    private deepMerge;
    /**
     * 获取特定路径的状态值
     * @param path 状态路径，如 'dataSource.status'
     */
    getStateByPath(path: string): any;
    /**
     * 设置特定路径的状态值
     * @param path 状态路径
     * @param value 新值
     */
    setStateByPath(path: string, value: any): void;
    /**
     * 获取订阅者数量
     */
    getSubscriberCount(): number;
}
export declare const stateManager: StateManagerImpl;
//# sourceMappingURL=StateManager.d.ts.map