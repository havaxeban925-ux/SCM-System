import app from './app';

const PORT = Number(process.env.PORT) || 3001;

// 404 Handler (only for standalone server)
app.use((req, res) => {
    res.status(404).send(`Cannot ${req.method} ${req.url}`);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server (PID: ${process.pid}) running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Server startup error:', err);
});
