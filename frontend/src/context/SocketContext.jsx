import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChats, setActiveChats] = useState(new Set());

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (user) {
      // Create socket connection with basic settings
      const socketUrl = import.meta.env.VITE_SOCKET_ENDPOINT || 'http://localhost:5000';
      console.log('Attempting to connect to socket server at:', socketUrl);
      
      const newSocket = io(socketUrl, {
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      // Setup connection event handlers with detailed logging
      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully:', newSocket.id);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        console.error('Error details:', error.message);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
      });
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Socket reconnection attempt:', attemptNumber);
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
      });
      
      newSocket.on('error', (error) => {
        console.error('⚠️ Socket error:', error);
      });
      
      setSocket(newSocket);
      
      // Cleanup function
      return () => {
        // Leave all chat rooms before disconnecting
        activeChats.forEach(chatId => {
          newSocket.emit('leave_chat', { chatId });
        });
        newSocket.disconnect();
      };
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        // Leave all chat rooms before disconnecting
        activeChats.forEach(chatId => {
          socket.emit('leave_chat', { chatId });
        });
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user, activeChats]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Connect user
    socket.emit('user_connected', user._id);

    // Listen for active users
    socket.on('active_users', (users) => {
      setOnlineUsers(users);
    });

    // Listen for user status changes
    socket.on('user_status', ({ userId, status }) => {
      if (status === 'online') {
        setOnlineUsers((prev) => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });
      } else {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      }
    });

    // Cleanup function
    return () => {
      socket.off('active_users');
      socket.off('user_status');
    };
  }, [socket, user]);

  // Function to join a chat room
  const joinChatRoom = (chatId) => {
    if (!socket || !chatId) return;
    
    socket.emit('join_chat', { chatId });
    setActiveChats(prev => new Set(prev).add(chatId));
  };
  
  // Function to leave a chat room
  const leaveChatRoom = (chatId) => {
    if (!socket || !chatId) return;
    
    socket.emit('leave_chat', { chatId });
    setActiveChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
  };

  const value = {
    socket,
    onlineUsers,
    isUserOnline: (userId) => onlineUsers.includes(userId),
    joinChatRoom,
    leaveChatRoom,
    activeChats: Array.from(activeChats)
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
