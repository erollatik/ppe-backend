const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8082;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
    credentials: true
}));
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'PPE Bridge Server is running!' });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/detect', (req, res) => {
    res.json({
        success: true,
        message: 'Detection endpoint working'
    });
});

// Catch all
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        url: req.url
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
