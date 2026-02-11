import { config } from 'dotenv';
// Load .env first
config();
// Override with .env.local if exists
config({ path: '.env.local', override: true });

import express from 'express';
import cors from 'cors';
import stylesRouter from './routes/styles';
import developmentRouter from './routes/development';
import requestsRouter from './routes/requests';
import restockRouter from './routes/restock';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import spuRouter from './routes/spu';
import notificationsRouter from './routes/notifications'; // OPT-4

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// 路由
app.use('/api/styles', stylesRouter);
app.use('/api/development', developmentRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/restock', restockRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/spu', spuRouter);
app.use('/api/notifications', notificationsRouter); // OPT-4

// 根路由
app.get('/', (_, res) => {
    res.json({
        name: 'SCM System API',
        version: '1.0.0',
        endpoints: ['/api/styles', '/api/development', '/api/requests', '/api/restock', '/api/admin', '/api/auth', '/api/health']
    });
});

// 健康检查
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

export default app;
