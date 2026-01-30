import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ancient-map-demo/',
  // 开发服务器配置
  server: {
    port: 3000,
    open: true, // 自动打开浏览器
    host: true, // 允许外部访问
    watch: {
      // 恢复监听数据文件
      ignored: []
    }
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true, // 生成 source map 便于调试
    rollupOptions: {
      output: {
        // 代码分割
        manualChunks: undefined
      }
    }
  },

  // [PERF] 生产构建时移除 console/debugger
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },

  // 资源处理
  publicDir: 'public',

  // 优化配置
  optimizeDeps: {
    exclude: [] // 排除不需要预构建的依赖
  }
});
