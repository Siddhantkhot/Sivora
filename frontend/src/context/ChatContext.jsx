import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const { socket } = useSocket();
  const typingTimeoutRef = useRef({});
  
  
  // Function to sort chats by latest message timestamp
  const sortChatsByLatestMessage = useCallback((chatsArray) => {
    return [...chatsArray].sort((a, b) => {
      const timeA = a.latestMessage?.createdAt ? new Date(a.latestMessage.createdAt) : new Date(0);
      const timeB = b.latestMessage?.createdAt ? new Date(b.latestMessage.createdAt) : new Date(0);
      return timeB - timeA; // Sort in descending order (newest first)
    });
  }, []);

  
  // Add the missing API functions
  const accessChat = useCallback(async (userId) => {
    try {
      setChatLoading(true);
      const { data } = await api.post('/api/chats', { userId });
      
      setChats(prev => {
        const chatExists = prev.find(chat => chat._id === data._id);
        if (!chatExists) {
          return sortChatsByLatestMessage([...prev, data]);
        }
        return prev;
      });

      setSelectedChat(data);
      return data;
    } catch (error) {
      toast.error('Failed to access chat');
      console.error('Error accessing chat:', error);
      return null;
    } finally {
      setChatLoading(false);
    }
  }, [sortChatsByLatestMessage]);

  const retryMessage = useCallback(async (failedMessage) => {
    try {
      const { data } = await api.post('/api/messages', {
        content: failedMessage.content,
        chatId: failedMessage.chatId,
        fileUrl: failedMessage.fileUrl,
        fileType: failedMessage.fileType
      });

      setMessages(prev => prev.map(msg => 
        msg._id === failedMessage._id ? data : msg
      ));

      return data;
    } catch (error) {
      toast.error('Failed to retry sending message');
      return null;
    }
  }, []);

  const createGroupChat = async (userIds, groupName) => {
  try {
    const { data } = await api.post('/api/chat/group', {
      users: userIds,
      name: groupName,  
    });
    setChats((prevChats) => [data, ...prevChats]);
    setSelectedChat(data);
    return data;
  } catch (error) {
    console.error('Error creating group chat:', error);
    throw error;
  }
};

  const renameGroupChat = useCallback(async (chatId, newName) => {
    try {
      const { data } = await api.put(`/api/chats/group/${chatId}`, { name: newName });
      setChats(prev => prev.map(chat => chat._id === chatId ? data : chat));
      if (selectedChat?._id === chatId) {
        setSelectedChat(data);
      }
      return data;
    } catch (error) {
      toast.error('Failed to rename group');
      console.error('Error renaming group:', error);
      return null;
    }
  }, [selectedChat]);
  

  const addToGroupChat = useCallback(async (chatId, userId) => {
    try {
      const { data } = await api.put(`/api/chats/group/${chatId}/add`, { userId });
      setChats(prev => prev.map(chat => chat._id === chatId ? data : chat));
      if (selectedChat?._id === chatId) {
        setSelectedChat(data);
      }
      return data;
    } catch (error) {
      toast.error('Failed to add user to group');
      console.error('Error adding user:', error);
      return null;
    }
  }, [selectedChat]);

  
  const removeFromGroupChat = useCallback(async (chatId, userId) => {
    try {
      const { data } = await api.put(`/api/chats/group/${chatId}/remove`, { userId });
      setChats(prev => prev.map(chat => chat._id === chatId ? data : chat));
      if (selectedChat?._id === chatId) {
        setSelectedChat(data);
      }
      return data;
    } catch (error) {
      toast.error('Failed to remove user from group');
      console.error('Error removing user:', error);
      return null;
    }
  }, [selectedChat]);

  const sendMessage = useCallback(async (content, chatId, fileUrl, fileType, fileName) => {
    try {
      setMessageLoading(true);
      
      // Create an optimistic message for immediate display
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        content,
        chat: { _id: chatId },
        sender: { ...user },
        createdAt: new Date().toISOString(),
        fileUrl,
        fileType,
        fileName,
        isOptimistic: true
      };
      
      // Add optimistic message to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Make the actual API call
      const { data } = await api.post('/api/messages', {
        content,
        chatId,
        fileUrl,
        fileType,
        fileName
      });
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.isOptimistic && msg._id === optimisticMessage._id ? data : msg
      ));
      
      // Update chats with latest message
      setChats(prev => {
        const updated = prev.map(chat => 
          chat._id === chatId 
            ? { ...chat, latestMessage: data }
            : chat
        );
        return sortChatsByLatestMessage(updated);
      });
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    } finally {
      setMessageLoading(false);
    }
  }, [sortChatsByLatestMessage, user]);

  const deleteMessage = useCallback(async (messageId) => {
    try {
      await api.delete(`/api/messages/delete/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      // Update chats if this affected the latest message
      setChats(prev => {
        // Find chats that might have this message as latest message
        return prev.map(chat => {
          if (chat.latestMessage && chat.latestMessage._id === messageId) {
            // Find the new latest message from our current messages list
            const chatMessages = messages.filter(msg => 
              msg.chat._id === chat._id && msg._id !== messageId
            );
            
            // Sort to find the latest message
            const sortedMessages = [...chatMessages].sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            // Update the chat with the new latest message or null
            return {
              ...chat,
              latestMessage: sortedMessages.length > 0 ? sortedMessages[0] : null
            };
          }
          return chat;
        });
      });
      
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  }, [messages]);
  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      const { data } = await api.put(`/api/messages/${messageId}`, {
        content: newContent
      });
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? data : msg
      ));
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to update message');
    }
  }, []);

  const fetchMessages = useCallback(async (chatId) => {
    try {
      setMessageLoading(true);
      const { data } = await api.get(`/api/messages/chat/${chatId}`);
      setMessages(data);
      return data;
    } catch (error) {
      toast.error('Failed to fetch messages');
      console.error('Error fetching messages:', error);
      return [];
    } finally {
      setMessageLoading(false);
    }
  }, []);

  // Helper function to convert relative URLs to absolute backend URLs
  const getBackendUrl = useCallback((relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Use the API base URL from your axios config
    const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${backendBaseUrl}${relativeUrl}`;
  }, []);

  const uploadFile = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setFileUploadProgress(progress);
        }
      });
      
      setFileUploadProgress(0);
      
      // Convert the relative URL to an absolute backend URL
      const absoluteFileUrl = getBackendUrl(data.url);
      console.log('File uploaded, URL:', absoluteFileUrl);

      return {
        fileUrl: absoluteFileUrl, // Use the absolute URL
        fileType: file.type.split('/')[0],
        fileName: file.name,
        fileSize: file.size
      };
    } catch (error) {
      setFileUploadProgress(0);
      toast.error('Failed to upload file');
      console.error('Error uploading file:', error);
      return null;
    }
  }, [getBackendUrl]);
  const debouncedTyping = useCallback(
    debounce((chatId) => {
      sendTypingStoppedIndicator(chatId);
    }, 2000),
    []
  );


  const markMessageAsRead = useCallback(async (chatId) => {
    try {
      await api.put(`/api/messages/read/${chatId}`);
      setUnreadMessages(prev => ({
        ...prev,
        [chatId]: 0
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/chats');
      setChats(sortChatsByLatestMessage(data));
      return data;
    } catch (error) {
      toast.error('Failed to fetch chats');
      console.error('Error fetching chats:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [sortChatsByLatestMessage]);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket || !user) return;
    
    // Fetch chats when component mounts
    fetchChats();
    
    // Setup socket event listeners with improved handling
    const messageReceivedHandler = (newMessage) => {
      console.log('New message received via socket:', newMessage);
      
      // Check if this is a message we already have (from optimistic update)
      const isExistingMessage = messages.some(msg => 
        msg.isOptimistic && 
        msg.content === newMessage.content && 
        msg.sender._id === newMessage.sender._id &&
        Math.abs(new Date(msg.createdAt) - new Date(newMessage.createdAt)) < 5000 // Within 5 seconds
      );
      
      if (!isExistingMessage) {
        if (selectedChat?._id !== newMessage.chat._id) {
          // If not in the chat where message was received, update unread count
          setUnreadMessages(prev => ({
            ...prev,
            [newMessage.chat._id]: (prev[newMessage.chat._id] || 0) + 1
          }));
          
          // Play notification sound for new messages
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Update messages if we're in the relevant chat
        if (selectedChat?._id === newMessage.chat._id) {
          setMessages(prev => [...prev, newMessage]);
        }
        
        // Always update chats list with latest message
        setChats(prev => {
          // Check if chat exists in the list
          const chatExists = prev.some(chat => chat._id === newMessage.chat._id);
          
          let updated;
          if (chatExists) {
            // Update existing chat
            updated = prev.map(chat => 
              chat._id === newMessage.chat._id 
                ? { ...chat, latestMessage: newMessage }
                : chat
            );
          } else {
            // If chat doesn't exist (new chat), fetch all chats
            fetchChats();
            return prev;
          }
          
          return sortChatsByLatestMessage(updated);
        });
      } else {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => 
          (msg.isOptimistic && 
           msg.content === newMessage.content && 
           msg.sender._id === newMessage.sender._id) ? newMessage : msg
        ));
      }
    };
    
    // Add socket event listeners
    socket.on('message received', messageReceivedHandler);
    
    socket.on('new chat', (chat) => {
      console.log('New chat received:', chat);
      // Add the new chat to the list
      setChats(prev => {
        // Check if chat already exists
        const chatExists = prev.some(c => c._id === chat._id);
        if (!chatExists) {
          return sortChatsByLatestMessage([...prev, chat]);
        }
        return prev;
      });
    });
    
    socket.on('chat updated', (updatedChat) => {
      console.log('Chat updated:', updatedChat);
      setChats(prev => {
        const updated = prev.map(chat => 
          chat._id === updatedChat._id ? updatedChat : chat
        );
        return sortChatsByLatestMessage(updated);
      });
      
      // Update selected chat if it's the one that was updated
      if (selectedChat?._id === updatedChat._id) {
        setSelectedChat(updatedChat);
      }
    });
    
    socket.on('typing', ({ chatId, userId }) => {
      if (userId !== user._id) {
        setTypingUsers(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), userId]
        }));
      }
    });
    
    socket.on('stop typing', ({ chatId, userId }) => {
      if (userId !== user._id) {
        setTypingUsers(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).filter(id => id !== userId)
        }));
      }
    });
    
    // Cleanup function
    return () => {
      socket.off('message received', messageReceivedHandler);
      socket.off('new chat');
      socket.off('chat updated');
      socket.off('typing');
      socket.off('stop typing');
    };
  }, [socket, user, selectedChat, messages, sortChatsByLatestMessage, fetchChats]);
  
  // Typing indicator functions
  const sendTypingIndicator = useCallback((chatId) => {
    if (!socket || !chatId) return;
    socket.emit('typing', { chatId });
  }, [socket]);
  
  const sendTypingStoppedIndicator = useCallback((chatId) => {
    if (!socket || !chatId) return;
    socket.emit('stop typing', { chatId });
    
    // Clear any existing typing timeout
    if (typingTimeoutRef.current[chatId]) {
      clearTimeout(typingTimeoutRef.current[chatId]);
    }
  }, [socket]);
  

  const value = {
    chats,
    selectedChat,
    setSelectedChat,
    messages,
    loading,
    chatLoading,
    messageLoading,
    typingUsers,
    unreadMessages,
    fetchChats,
    accessChat,
    createGroupChat,
    renameGroupChat,
    addToGroupChat,
    removeFromGroupChat,
    fetchMessages,
    sendMessage,
    uploadFile,
    markMessageAsRead,
    sendTypingIndicator,
    sendTypingStoppedIndicator,
    fileUploadProgress,
    retryMessage,
    deleteMessage,
    editMessage,
    error,
    debouncedTyping
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;