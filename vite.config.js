import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [
        vue({}),
    ],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        },
    },

    optimizeDeps: {
        entries: ['@googlemaps/js-api-loader']
    },

    server: {
        https: false,
    }
})
