import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: path.resolve(__dirname, '.'),
    server: {
        port: 3002,
    },
    resolve: {
        // 确保 admin 构建时也能从项目根目录的 node_modules 解析依赖
        alias: {
            'exceljs': path.resolve(__dirname, '../node_modules/exceljs'),
            'file-saver': path.resolve(__dirname, '../node_modules/file-saver'),
        },
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
        },
    },
});
