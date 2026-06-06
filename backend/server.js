import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    appName: 'VendorBridge ERP API Service',
    database: mongoose.connection.readyState === 1 ? 'Connected (MongoDB Atlas)' : 'In-Memory Fallback Mode'
  });
});

// Try to connect to MongoDB, but fall back gracefully if it fails
if (MONGO_URI) {
  console.log('Attempting connection to MongoDB Atlas...');
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('🚀 Connected successfully to MongoDB Atlas database!');
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB Connection Failed. Running in In-Memory Demo Mode.');
      console.warn('Error details:', err.message);
    });
} else {
  console.warn('⚠️ MONGO_URI environment variable is missing.');
  console.warn('👉 Running in In-Memory Demo Mode. All actions will be persistent in memory only for this session.');
}

// Start Server
app.listen(PORT, () => {
  console.log(`🌐 VendorBridge API Server running on port ${PORT}`);
  console.log(`🔗 Health check available at: http://localhost:${PORT}/`);
  console.log('------------------------------------------------------------');
});
