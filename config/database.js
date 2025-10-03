const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not defined in environment variables');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'Scholiax',
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('Continuing without database connection in production');
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
