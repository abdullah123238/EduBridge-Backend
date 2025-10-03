const fs = require('fs');
const path = require('path');

console.log('🔧 MongoDB Setup Helper');
console.log('=======================');
console.log('');

console.log('Option 1: MongoDB Atlas (Recommended)');
console.log('1. Go to https://www.mongodb.com/atlas');
console.log('2. Create a free account');
console.log('3. Create a new cluster');
console.log('4. Click "Connect" → "Connect your application"');
console.log('5. Copy the connection string');
console.log('');

console.log('Option 2: Local MongoDB');
console.log('1. Install MongoDB Community Server');
console.log('2. Start MongoDB service');
console.log('3. Use: mongodb://localhost:27017/scholaria');
console.log('');

console.log('After getting your MongoDB URI, create a .env file in the backend folder with:');
console.log('');
console.log('MONGO_URI=your_mongodb_connection_string_here');
console.log('PORT=5000');
console.log('NODE_ENV=development');
console.log('JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random');
console.log('JWT_EXPIRE=30d');
console.log('CORS_ORIGIN=http://localhost:3000');
console.log('MAX_FILE_SIZE=10485760');
console.log('');

console.log('Then restart your backend server with: npm start'); 