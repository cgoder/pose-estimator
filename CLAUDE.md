# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TensorFlow.js-based pose estimation application with One Euro Filter smoothing, supporting real-time human pose detection and analysis. Features MoveNet/PoseNet models, intelligent caching, performance optimization, and exercise analysis capabilities.

## Quick Commands

### Development
```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:8080)
npm run serve            # Start HTTPS dev server (https://localhost:8080)
npm run build            # Build TypeScript
npm run build:watch      # Build with watch mode
```

### Quality & Testing
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Deployment
```bash
npm run clean            # Clean dist folder
npm run generate-cert    # Generate SSL certificates
npm run deploy           # Build and deploy to GitHub Pages
```

## Architecture Overview

### Core Components
- **PoseEstimator** (`src/components/PoseEstimator.js`): Main pose detection engine
- **CameraManager** (`src/components/CameraManager.js`): Webcam/video input handling
- **UIManager** (`src/components/UIManager.js`): UI controls and panels
- **HybridCacheManager** (`src/components/HybridCacheManager.js`): Multi-tier caching system
- **OneEuroFilterManager** (`src/components/OneEuroFilterManager.js`): Pose smoothing

### Analysis System
- **Exercise Analysis Engine** (`src/components/analyzers/`): Specialized analyzers for different exercises
  - `SquatAnalyzer.js`, `PushUpAnalyzer.js`, `LungeAnalyzer.js`, etc.
  - `RunningAnalyzer.js`: Running form analysis
  - `PerformanceMonitor.js`: Real-time performance tracking

### Performance & Optimization
- **AdaptiveFrameController** (`src/utils/adaptiveFrameController.js`): Dynamic FPS adjustment
- **PerformanceMonitor** (`src/utils/performance.js`): Real-time metrics
- **OffscreenRenderManager** (`src/utils/offscreenRenderManager.js`): Web Worker rendering
- **Hybrid Cache Strategy**: Memory → IndexedDB → Cache API → Network

## Key Files

### Entry Points
- `src/main.js`: Main application orchestrator
- `main.html`: Primary HTML interface
- `src/components/analyzers/demo-comprehensive-analysis.html`: Analysis demo

### Configuration
- `src/utils/constants.js`: Global configuration values
- `tsconfig.json`: TypeScript configuration
- `package.json`: Dependencies and scripts

### Testing
- `tests/camera.test.js`: Camera functionality tests
- `src/components/analyzers/quick-test.html`: Quick analyzer tests

## Development Workflow

1. **Start development**: `npm run dev` for HTTP, `npm run serve` for HTTPS
2. **Check browser console**: App exposes `window.poseApp` for debugging
3. **Use keyboard shortcuts**: `Ctrl+H` for controls, `Space` to pause/resume
4. **Monitor performance**: Enable performance overlay in UI controls
5. **Test analyzers**: Open analyzer-specific test HTML files

## Browser Requirements
- HTTPS required for camera access
- WebGL support for TensorFlow.js
- getUserMedia API support
- Modern Chrome/Firefox/Safari/Edge

## Common Debugging
```javascript
// Access app instance in browser console
window.poseApp.getAppStatus()
window.poseApp.restart()
window.performanceMonitor.getMetrics()
```