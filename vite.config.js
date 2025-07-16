import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';
import eslint from 'vite-plugin-eslint';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 基础配置
  base: './',
  root: '.',
  publicDir: 'public',
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    https: false, // 可以设置为 true 启用 HTTPS
    hmr: {
      overlay: true
    },
    // 代理配置（如果需要）
    proxy: {
      // '/api': {
      //   target: 'http://localhost:8080',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, '')
      // }
    }
  },
  
  // 预览服务器配置
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    target: 'es2015',
    
    // 代码分割配置
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // 手动分割代码块
        manualChunks: {
          // TensorFlow.js 相关
          'tensorflow': [
            '@tensorflow/tfjs',
            '@tensorflow/tfjs-core',
            '@tensorflow/tfjs-backend-webgl',
            '@tensorflow/tfjs-converter',
            '@tensorflow-models/pose-detection'
          ],
          // MediaPipe 相关
          'mediapipe': [
            '@mediapipe/pose',
            '@mediapipe/camera_utils',
            '@mediapipe/control_utils',
            '@mediapipe/drawing_utils'
          ],
          // 图表和可视化
          'charts': [
            'chart.js',
            'chartjs-adapter-date-fns',
            'three',
            'stats.js'
          ],
          // 工具库
          'utils': [
            'lodash-es',
            'uuid',
            'date-fns',
            'file-saver',
            'jszip',
            'papaparse'
          ],
          // 机器学习和数学
          'ml': [
            'ml-matrix',
            'ml-regression',
            'kalman-filter',
            'simple-statistics'
          ]
        },
        // 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `assets/media/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[ext]/[name]-[hash].${ext}`;
        }
      }
    },
    
    // Terser 压缩配置
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      },
      mangle: {
        safari10: true
      }
    },
    
    // 资源内联阈值
    assetsInlineLimit: 4096,
    
    // CSS 代码分割
    cssCodeSplit: true,
    
    // 生成清单文件
    manifest: true,
    
    // 报告压缩详情
    reportCompressedSize: true,
    
    // 警告阈值
    chunkSizeWarningLimit: 1000
  },
  
  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@tests': resolve(__dirname, 'tests')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.vue']
  },
  
  // CSS 配置
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@styles/variables.scss";`
      }
    },
    modules: {
      localsConvention: 'camelCase'
    }
  },
  
  // 插件配置
  plugins: [
    // ESLint 插件
    eslint({
      include: ['src/**/*.js', 'src/**/*.jsx'],
      exclude: ['node_modules', 'dist'],
      cache: false
    }),
    
    // 传统浏览器支持
    legacy({
      targets: ['defaults', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: [
        'es.symbol',
        'es.array.filter',
        'es.promise',
        'es.promise.finally',
        'es/map',
        'es/set',
        'es.array.for-each',
        'es.object.define-properties',
        'es.object.define-property',
        'es.object.get-own-property-descriptor',
        'es.object.get-own-property-descriptors',
        'es.object.keys',
        'es.object.to-string',
        'web.dom-collections.for-each',
        'esnext.global-this',
        'esnext.string.match-all'
      ]
    }),
    
    // PWA 插件
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Pose Estimator',
        short_name: 'PoseEst',
        description: 'Advanced pose estimation application with real-time analysis',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  
  // 依赖优化
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow-models/pose-detection',
      'chart.js',
      'three',
      'lodash-es'
    ],
    exclude: [
      // 排除一些可能导致问题的依赖
    ]
  },
  
  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  
  // 实验性功能
  experimental: {
    // renderBuiltUrl: (filename, { hostType }) => {
    //   if (hostType === 'js') {
    //     return { js: `https://cdn.example.com/${filename}` }
    //   } else {
    //     return { relative: true }
    //   }
    // }
  },
  
  // 日志级别
  logLevel: 'info',
  
  // 清除屏幕
  clearScreen: false
});