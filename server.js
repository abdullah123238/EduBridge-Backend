require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database'); 
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const announcementRoutes = require('./routes/announcements');
const materialRoutes = require('./routes/materials');
const materialPageProgressRoutes = require('./routes/materialPageProgress');
const commentRoutes = require('./routes/comments');
const progressRoutes = require('./routes/progress');
const taskRoutes = require('./routes/tasks');
const submissionRoutes = require('./routes/submissions');

const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

app.use(morgan('combined'));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the API" });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Scholiax API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/material-progress', materialPageProgressRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/submissions', submissionRoutes);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduBridge API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 EduBridge server running on port ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
