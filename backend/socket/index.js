// Socket.IO handler for real-time chat functionality
let ioInstance;

const socketHandler = (io) => {
  // Store the io instance for external use
  ioInstance = io;
  
  // Store active users with multiple connections support
  const activeUsers = new Map(); // userId -> Set of socket IDs
  const userSockets = new Map(); // socketId -> userId
  
  // Store active calls
  const activeCalls = new Map(); // userId -> {callerId, callType}

  // Performance optimization: use Redis adapter in production
  // const redisAdapter = require('socket.io-redis');
  // io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let currentUserId;

    // Handle user connection
    socket.on('user_connected', (userId) => {
      currentUserId = userId;
      
      // Support multiple devices/tabs per user
      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId).add(socket.id);
      userSockets.set(socket.id, userId);
      
      console.log('User connected:', userId, 'socket:', socket.id);
      
      // Join user's personal room for direct messages
      socket.join(`user:${userId}`);
      
      // Fetch user's chats and join those rooms
      // This would typically come from a database query
      // For now we'll implement it when a user accesses a chat
      
      // Broadcast user online status to all connected clients
      io.emit('user_status', { userId, status: 'online' });
      
      // Send active users list to the newly connected user
      const onlineUsers = Array.from(activeUsers.keys());
      socket.emit('active_users', onlineUsers);
    });

    // Handle new message - optimized for speed
    socket.on('new message', (messageData) => {
      console.log('New message received via socket:', messageData);
      
      // Join chat room if not already joined
      const chatId = messageData.chat._id;
      socket.join(`chat:${chatId}`);
      
      // Emit to all users in the chat room
      socket.to(`chat:${chatId}`).emit('message received', messageData);
      
      // Also emit to all recipients' personal rooms for notifications
      if (messageData.chat.users) {
        messageData.chat.users.forEach(userId => {
          // Don't send to the sender
          if (userId.toString() !== messageData.sender._id.toString()) {
            io.to(`user:${userId}`).emit('message received', messageData);
          }
        });
      }
      
      // Send typing stopped notification
      io.to(`chat:${chatId}`).emit('stop typing', { 
        chatId, 
        userId: messageData.sender._id 
      });
    });

    // Handle typing notification - optimized with rooms
    socket.on('typing', ({ chatId, userId }) => {
      // Join chat room if not already joined
      socket.join(`chat:${chatId}`);
      
      // Broadcast to chat room - much more efficient
      socket.to(`chat:${chatId}`).emit('typing', { chatId, userId });
    });

    // Handle stopped typing notification - optimized with rooms
    socket.on('typing_stopped', ({ chatId, userId }) => {
      // Broadcast to chat room - much more efficient
      socket.to(`chat:${chatId}`).emit('typing_stopped', { chatId, userId });
    });

    // Handle read receipt - optimized with rooms
    socket.on('message_read', ({ messageId, chatId, userId }) => {
      // Join chat room if not already joined
      socket.join(`chat:${chatId}`);
      
      // Broadcast to chat room - much more efficient
      socket.to(`chat:${chatId}`).emit('message_read', { messageId, chatId, userId });
    });

    // Handle joining a chat room
    socket.on('join_chat', ({ chatId }) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${currentUserId} joined chat room: ${chatId}`);
    });
    
    // Handle leaving a chat room
    socket.on('leave_chat', ({ chatId }) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${currentUserId} left chat room: ${chatId}`);
    });
    
    // ===== WebRTC Call Signaling =====
    
    // Handle call request
    socket.on('call_user', ({ userToCall, signalData, from, callerName, callType }) => {
      console.log(`Call request from ${from} to ${userToCall}, type: ${callType}`);
      
      // Store call information
      activeCalls.set(userToCall, { callerId: from, callType });
      
      // Get recipient's socket IDs
      const recipientSockets = activeUsers.get(userToCall);
      
      if (recipientSockets && recipientSockets.size > 0) {
        // Emit to all recipient's devices
        io.to(`user:${userToCall}`).emit('call_user', {
          from,
          callerName,
          signal: signalData,
          callType
        });
      } else {
        // User is offline, notify caller
        socket.emit('call_error', { message: 'User is offline' });
      }
    });
    
    // Handle call answer
    socket.on('call_accepted', ({ signal, to }) => {
      console.log(`Call answered by ${currentUserId} to ${to}`);
      
      // Remove from active calls as it's now established
      activeCalls.delete(currentUserId);
      
      // Emit to caller
      io.to(`user:${to}`).emit('call_accepted', { signal });
    });
    
    // Handle ICE candidates
    socket.on('ice_candidate', ({ to, candidate }) => {
      console.log(`ICE candidate from ${currentUserId} to ${to}`);
      
      // Forward ICE candidate to the other peer
      io.to(`user:${to}`).emit('ice_candidate', { candidate });
    });
    
    // Handle call rejection
    socket.on('reject_call', ({ to }) => {
      console.log(`Call rejected by ${currentUserId}`);
      
      // Remove from active calls
      activeCalls.delete(currentUserId);
      
      // Emit to caller
      io.to(`user:${to}`).emit('call_rejected');
    });
    
    // Handle call end
    socket.on('end_call', ({ to }) => {
      console.log(`Call ended by ${currentUserId}`);
      
      // Emit to other user
      io.to(`user:${to}`).emit('call_ended');
    });

    // Handle disconnect - improved to support multiple connections per user
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Get user ID from socket mapping
      const userId = userSockets.get(socket.id);
      if (userId) {
        // Remove this socket from the user's active sockets
        const userSocketsSet = activeUsers.get(userId);
        if (userSocketsSet) {
          userSocketsSet.delete(socket.id);
          
          // If no more active sockets for this user, remove user and broadcast offline status
          if (userSocketsSet.size === 0) {
            activeUsers.delete(userId);
            io.emit('user_status', { userId, status: 'offline' });
            
            // End any active calls for this user
            const callInfo = activeCalls.get(userId);
            if (callInfo) {
              io.to(`user:${callInfo.callerId}`).emit('call_ended');
              activeCalls.delete(userId);
            }
          }
        }
        
        // Clean up socket mapping
        userSockets.delete(socket.id);
      }
    });
  });
};

// Export the io instance for external use
const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};

module.exports = { socketHandler, getIO, io: () => ioInstance };
