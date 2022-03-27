import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    build: {
        sourcemap: 'hidden' // They are uploaded to sentry in production
                            // The browser doesn't need to know about theses files
    },
    plugins: [
        vue({}),
    ],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        },
    },

    server: {
        https: false,
    }
})
