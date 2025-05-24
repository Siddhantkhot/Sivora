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

// Set up Socket.IO with basic configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Log socket server initialization
console.log('Socket.IO server initialized');

// Middleware - CORS configuration to match Socket.IO
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

console.log('Express CORS configured');

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
    
    // Start server
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
