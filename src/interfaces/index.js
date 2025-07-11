// Main interfaces export
// This file provides a unified entry point for all interfaces

// Core interfaces
export * from './core/index.js';

// Component interfaces
export * from './components/index.js';

// AI interfaces
export * from './ai/index.js';

// Input interfaces
export * from './input/index.js';

// Config interfaces
export * from './config/index.js';

// Legacy support - re-export from old IModuleInterfaces.js
// This ensures backward compatibility during the transition period
export * from './IModuleInterfaces.js';

// Convenience exports for commonly used interfaces
export { IBaseModule } from './core/IBaseModule.js';
export { InterfaceValidator } from './core/InterfaceValidator.js';
export { IAppManager } from './core/IAppManager.js';
export { IEventBus } from './core/IEventBus.js';
export { IDIContainer } from './core/IDIContainer.js';

// Component interfaces shortcuts
export { ICameraManager } from './components/ICameraManager.js';
export { ILoadingManager } from './components/ILoadingManager.js';
export { IErrorManager } from './components/IErrorManager.js';
export { IControlsManager } from './components/IControlsManager.js';
export { IStatusManager } from './components/IStatusManager.js';
export { IPanelManager } from './components/IPanelManager.js';
export { IPoseEstimator } from './components/IPoseEstimator.js';

// AI interfaces shortcuts
export { IAIModelManager } from './ai/IAIModelManager.js';
export { IFilterManager } from './ai/IFilterManager.js';

// Input interfaces shortcuts
export { IInputManager } from './input/IInputManager.js';
export { IVideoInputManager } from './input/IVideoInputManager.js';
export { IImageInputManager } from './input/IImageInputManager.js';

// Config interfaces shortcuts
export { IConfigManager } from './config/IConfigManager.js';
export { IEnvironmentManager } from './config/IEnvironmentManager.js';