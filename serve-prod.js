import { preview } from 'vite'

const server = await preview({
    preview: {
        port: 1610,
        host: true,
        allowedHosts: [
            'overlay.cbst.shyyluna.dev',
            '3af09.artemis.shyyluna.dev',
            'localhost',
            '127.0.0.1'
        ]
    }
})