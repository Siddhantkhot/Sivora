import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';
import { useCall } from '../context/CallContext';
import { FaVideo,FaPhone, FaHistory } from 'react-icons/fa';
import CallHistory from './CallHistory';
import { toast } from 'react-toastify';
import api from '../api/axios';

// Memoized ChatPreview component for better performance
const ChatPreview = memo(({ chat, user, isSelected, onSelect, formatTime, isUserOnline, unreadCount ,onVideoCall,onAudioCall}) => {
  const chatUser = chat.isGroupChat
    ? null
    : chat.users.find((u) => u._id !== user?._id);
  const chatName = chat.isGroupChat ? chat.chatName : chatUser?.username;
  const chatImage = chat.isGroupChat ? chat.groupPicture : chatUser?.profilePicture;
  const isOnline = !chat.isGroupChat && isUserOnline(chatUser?._id);

  return (
    <div
      className={`p-2 rounded-md  md:p-4 flex items-center cursor-pointer transition-all duration-200 hover:bg-gray-700 ${
        isSelected ? 'bg-gray-600  border-l-4 border-l-indigo-500' : ''
      }`}
      onClick={() => onSelect(chat)}
    >
      <div className="relative">
        <img
          src={chatImage}
          alt={chatName}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm"
          loading="lazy"
        />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-accent-DEFAULT rounded-full border-2 border-white" />
        )}
        {chat.isGroupChat && (
          <span className="absolute -bottom-1 -right-1 bg-secondary-light text-white p-0.5 md:p-1 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 md:h-3 md:w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </span>
        )}
      </div>
      <div className="ml-2 md:ml-4 flex-1 min-w-0">
        <div className="flex flex-row items-center justify-between mb-1 md:mb-2">
          <h4 className="font-medium text-white text-md md:text-base truncate max-w-[100px] md:max-w-[180px]">{chatName}</h4>
          <span className="text-[10px] md:text-xs text-gray-300 font-medium ml-1 flex-shrink-0">
            {chat.latestMessage && formatTime(chat.latestMessage.createdAt)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs md:text-sm text-gray-200 truncate max-w-[120px] md:max-w-[180px]">
            {chat.latestMessage
              ? chat.latestMessage.fileUrl
                ? <FilePreview fileType={chat.latestMessage.fileType} />
                : chat.latestMessage.content
              : 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] md:text-xs rounded-full px-1.5 md:px-2 py-0.5 md:py-1 min-w-[16px] md:min-w-[20px] text-center font-medium shadow-sm flex-shrink-0 ml-1">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// Memoized FilePreview component
const FilePreview = memo(({ fileType }) => (
  <span className="flex items-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
    </svg>
    {fileType}
  </span>
));

// Main Sidebar component
const Sidebar = () => {
  // Check if mobile on initial render
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Add responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { user, logout, updateProfile } = useAuth();
  const { chats, selectedChat, setSelectedChat, fetchMessages, unreadMessages } = useChat();
  const { isUserOnline } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    profilePicture: '',
    password: ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const fileInputRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const searchInputRef = useRef(null);

  // Memoized format time function
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return format(date, 'EEE');
    }
    
    return format(date, 'MM/dd/yy');
  }, []);

  // Memoized filtered chats
  const filteredChats = useCallback(() => {
    return chats.filter((chat) => {
      const searchLower = searchTerm.toLowerCase();
      if (chat.isGroupChat) {
        return chat.chatName.toLowerCase().includes(searchLower);
      }
      const chatUser = chat.users.find((u) => u._id !== user?._id);
      return chatUser?.username.toLowerCase().includes(searchLower);
    });
  }, [chats, searchTerm, user]);

  // Profile modal handlers
  const handleOpenProfileModal = useCallback(() => {
    setProfileData({
      profilePicture: user?.profilePicture || '',
      username: user?.username || '',
      email: user?.email || '',
      password: ''
    });
    setShowProfileModal(true);
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      // The profileData already contains the base64 image data if a new image was selected
      // So we can directly update the profile
      const result = await updateProfile(profileData);
      
      if (result.success) {
        setShowProfileModal(false);
        setProfileImageFile(null);
        setProfileImagePreview('');
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store the file for later use
      setProfileImageFile(file);
      
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setProfileImagePreview(previewUrl);
      
      // Compress and convert the image to base64
      compressAndConvertToBase64(file);
    }
  };
  
  // Function to compress image and convert to base64
  const compressAndConvertToBase64 = (file) => {
    // Create an image element to load the file
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      // Create a canvas to draw and compress the image
      const canvas = document.createElement('canvas');
      
      // Calculate new dimensions (max 500px width/height while maintaining aspect ratio)
      let width = img.width;
      let height = img.height;
      const maxSize = 500;
      
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw image on canvas with new dimensions
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with reduced quality (0.7 = 70% quality)
      const base64String = canvas.toDataURL('image/jpeg', 0.7);
      
      // Update profile data with compressed base64 string
      setProfileData(prev => ({
        ...prev,
        profilePicture: base64String
      }));
      
      // Clean up
      URL.revokeObjectURL(img.src);
    };
  };
  
  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  // Chat selection handler
  const handleChatSelect = useCallback((chat) => {
    setSelectedChat(chat);
    fetchMessages(chat._id);
  }, [setSelectedChat, fetchMessages]);

  return (
    <>
      {/* Main sidebar content */}
      <div className="w-full h-full flex flex-col bg-white/90 backdrop-blur-sm shadow-md relative overflow-hidden">
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-gray-800">
          <div className="flex items-center">
            <button 
              className="w-10 h-10 rounded-full overflow-hidden mr-3 shadow-md cursor-pointer border-2 border-white" 
              onClick={handleOpenProfileModal}
            >
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user?.username} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Just hide the image on error
                    e.target.style.display = 'none';
                    // Show the fallback content
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-semibold">{user?.username?.charAt(0) || '?'}</span>
                </div>
              )}
            </button>
            <div className="ml-3">
            <h3 className="font-semibold text-white">{user?.username}</h3>
            <p className="text-xs text-white/80 font-medium">Online</p>
          </div>
          </div>
      <div className="flex space-x-1 md:space-x-2">
        <button
          onClick={() => setShowCallHistory(true)}
          className="text-red-500 hover:text-white/80 bg-white/20 p-1.5 md:p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
          title="Call History"
          aria-label="Call History"
        >
          <FaHistory className="h-4 w-4 md:h-5 md:w-5" />
        </button>
        <button
          onClick={logout}
          className="text-blue-500 hover:text-white/80 bg-white/20 p-1.5 md:p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
          title="Logout"
          aria-label="Logout"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 md:h-5 md:w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>

    {/* Search */}
    <div className="p-2 bg-gray-700 pt-3">
      <div className=" relative mb-2 md:mb-2">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search conversations... (Ctrl + K)"
          className="w-full pl-10 pr-4 py-3.5 bg-gray-200 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-200 hover:bg-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg
          className="absolute left-3 top-3 mt-1 h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>

    {/* Chat list */}
    <div className="p-2 md:p-2 bg-gray-800 text-white flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {filteredChats().length === 0 ? (
        <EmptyState searchTerm={searchTerm} />
      ) : (
        filteredChats().map((chat) => (
          <ChatPreview
            key={chat._id}
            chat={chat}
            user={user}
            isSelected={selectedChat?._id === chat._id}
            onSelect={handleChatSelect}
            formatTime={formatTime}
            isUserOnline={isUserOnline}
            unreadCount={unreadMessages[chat._id] || 0}
          />
        ))
      )}
    </div>
  </div>

  {/* Profile Modal */}
  {showProfileModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl shadow-2xl backdrop-blur-sm  p-4 md:p-6 w-[90%] md:w-96 max-w-md mx-4">
        <div className="p-6">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-center">Edit Profile</h3>
        </div>
        <form onSubmit={handleProfileUpdate} className="p-6">
          <div className="flex justify-center mb-4 w-full">
            <div className="relative">
              <img
                src={profileImagePreview || profileData.profilePicture || 'https://via.placeholder.com/100'}
                alt="Profile Preview"
                className="w-20 h-20 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={handleSelectImage}
                className="absolute bottom-0 right-0 bg-indigo-500 text-white p-1 rounded-full hover:bg-indigo-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <div className="mb-4">
            <label className="block bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={profileData.username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-sm font-medium mb-2">New Password (leave blank to keep current)</label>
            <input
              type="password"
              name="password"
              value={profileData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text rounded-md border-2 border-red-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text border-blue-500 border-2 rounded-md hover:opacity-90 transition-colors disabled:opacity-70"
            >
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Call History Modal */}
      {showCallHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CallHistory onClose={() => setShowCallHistory(false)} />
        </div>
      )}
    </>
  );
};

// Memoized empty state component
const EmptyState = memo(({ searchTerm }) => (
  <div className="text-center  py-10 px-4">
    <div className="flex justify-center mb-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
    <p className="bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text font-medium">
      {searchTerm ? 'No conversations found' : 'No conversations yet'}
    </p>
    <p className="bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-sm mt-1">
      {searchTerm ? 'Try different search terms' : 'Start a new chat to begin messaging'}
    </p>
  </div>
));

export default memo(Sidebar);