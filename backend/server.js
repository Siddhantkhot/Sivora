const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const uploadRoutes = require('./routes/upload.routes');
const { socketHandler } = require('./socket');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Allowed origins - supports both local dev and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

// Set up Socket.IO with shared CORS config
const io = socketIo(server, {
  cors: corsOptions
});

console.log('Socket.IO server initialized');

// Middleware - CORS
app.use(cors(corsOptions));

console.log('Express CORS configured for origins:', allowedOrigins);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Root route
app.get('/', (req, res) => {
  res.send('MERN Chat API is running');
});

// Socket.IO connection handler
socketHandler(io);

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
console.log('Connection string:', process.env.MONGODB_URI ? 'Using env variable' : 'Using fallback string');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-chat')
  .then(() => {
    console.log('Connected to MongoDB successfully');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error details:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);

    // Fallback to local MongoDB if Atlas fails
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv')) {
      console.log('Attempting to connect to local MongoDB as fallback...');
      mongoose.connect('mongodb://localhost:27017/mern-chat', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
        .then(() => {
          console.log('Connected to local MongoDB successfully');
          const PORT = process.env.PORT || 5000;
          server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
          });
        })
        .catch(localErr => {
          console.error('Local MongoDB connection error:', localErr);
          console.error('Unable to connect to any MongoDB instance. Please check your configuration.');
        });
    }
  });