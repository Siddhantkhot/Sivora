import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { format } from 'date-fns';
import useIntersectionObserver from '../hooks/useIntersectionObserver'; // Create this hook
import { FaTrash, FaEllipsisV, FaTrashAlt, FaEdit } from 'react-icons/fa';

// Message component for better performance
const Message = memo(({ message, isCurrentUser, showAvatar, formatTime, previousMessage, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const shouldGroupMessages = previousMessage?.sender._id === message.sender._id 
    && (new Date(message.createdAt) - new Date(previousMessage.createdAt)) < 300000; // 5 minutes
    
  // Add responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete(message._id);
    }
    setShowOptions(false);
  };

  return (
    <div key={`message-${message._id}`} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${shouldGroupMessages ? 'mt-1' : 'mt-3 md:mt-4'}`}>
      {!isCurrentUser && showAvatar && (
        <img
          key="avatar-img"
          src={message.sender.profilePicture}
          alt={message.sender.username}
          className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover mr-1 md:mr-2 mt-1"
          loading="lazy"
        />
      )}
      {!isCurrentUser && !showAvatar && <div key="avatar-spacer" className="w-6 md:w-8 mr-1 md:mr-2" />}
      
      <div key={`message-content-${message._id}`} className="max-w-[75%] md:max-w-[70%] group relative">
        {isCurrentUser && (
          <div className={`absolute right-0 top-0 -mt-1 ${isMobile ? '-mr-6' : '-mr-8'} ${isMobile ? 'opacity-0 active:opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              aria-label="Message options"
            >
              <FaEllipsisV size={isMobile ? 10 : 12} />
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-1 bg-white rounded-md shadow-lg z-10 overflow-hidden w-24 md:w-32">
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-red-600 hover:bg-gray-100 flex items-center"
                >
                  <FaTrash className="mr-1 md:mr-2" size={isMobile ? 10 : 12} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
        <div
          key={`message-bubble-${message._id}`}
          className={`rounded-xl px-3 md:px-4 py-1.5 md:py-2 inline-block transition-all duration-200 ${
            isCurrentUser
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-tr-none shadow-md hover:shadow-lg'
              : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-tl-none shadow-md hover:shadow-lg border border-gray-200/50'
          }`}
        >
          {message.fileUrl ? (
            <MessageAttachment key={`attachment-${message._id}`} message={message} />
          ) : (
            <p key={`content-${message._id}`} className="whitespace-pre-wrap break-words text-sm md:text-base">{message.content}</p>
          )}
        </div>
        
        <MessageMetadata 
          key={`metadata-${message._id}`}
          message={message} 
          isCurrentUser={isCurrentUser} 
          formatTime={formatTime}
        />
      </div>
    </div>
  );
});

// Separate component for attachments
const MessageAttachment = memo(({ message }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Make sure we have an absolute URL for images pointing to the backend server
  const getBackendUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    
    // Use the backend URL, not the frontend URL
    const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${backendBaseUrl}${url}`;
  };

  if (message.fileType === 'image') {
    const imageUrl = getBackendUrl(message.fileUrl);
    
    return (
      <div className="relative">
        {isLoading && !imgError && (
          <div key="loading-spinner" className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        {imgError ? (
          <div key="error-message" className="bg-gray-100 rounded p-3 text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Image failed to load
          </div>
        ) : (
          <img
            key="attachment-image"
            src={imageUrl}
            alt="Shared image"
            className={`rounded w-96 cursor-zoom-in transition-opacity duration-200 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={() => window.open(imageUrl, '_blank')}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setImgError(true);
              console.error('Image failed to load:', imageUrl);
            }}
            loading="lazy"
          />
        )}
      </div>
    );
  }

  if (message.fileType === 'audio') {
    const audioUrl = getBackendUrl(message.fileUrl);
    return (
      <audio controls className="max-w-full">
        <source src={audioUrl} />
        Your browser does not support the audio element.
      </audio>
    );
  }

  const documentUrl = getBackendUrl(message.fileUrl);
  return (
    <a
      href={documentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center text-blue-500 hover:underline group-hover:text-blue-600 transition-colors duration-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Document
    </a>
  );
});

// Separate component for message metadata
const MessageMetadata = memo(({ message, isCurrentUser, formatTime }) => (
  <div className={`mt-0.5 md:mt-1 flex items-center ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
    <span className="text-[10px] md:text-xs text-gray-500">{formatTime(message.createdAt)}</span>
    {message.sender && message.sender.isVerified && (
      <span className="ml-1 text-blue-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 md:h-3 md:w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </span>
    )}
  </div>
));

// Main MessageList component
const MessageList = memo(() => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const { messages, selectedChat, deleteMessage } = useChat();
  const { user } = useAuth();
  const [autoScroll, setAutoScroll] = useState(true);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Add responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatMessageTime = useCallback((timestamp) => {
    return format(new Date(timestamp), 'h:mm a');
  }, []);

  // Intersection observer for auto-scrolling
  const isAtBottom = useIntersectionObserver(messagesEndRef, {
    threshold: 0,
    root: containerRef.current,
  });

  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    }
  }, [messages, autoScroll]);

  // Update autoScroll based on user's scroll position
  useEffect(() => {
    setAutoScroll(isAtBottom);
  }, [isAtBottom]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex justify-center items-center bg-white/90 backdrop-blur-sm rounded-xl">
        <p className="text-gray-500">Select a chat to start messaging</p>
      </div>
    );
  }

  // Removed the loading screen that was causing the white flash
  // We'll show messages even while loading new ones

  const handleDeleteMessage = useCallback((messageId) => {
    deleteMessage(messageId);
  }, [deleteMessage]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    setShowClearChatModal(true);
  }, [messages.length]);

  const confirmClearChat = useCallback(() => {
    // Delete all messages one by one
    messages.forEach(message => {
      deleteMessage(message._id);
    });
    setShowClearChatModal(false);
  }, [messages, deleteMessage]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 p-4 overflow-y-auto bg-chat-pattern relative  mb-0 scroll-smooth"
    >
      {/* Clear chat button */}
      {messages.length > 0 && (
        <div className="sticky top-0 z-20 flex justify-end mb-2">
          <button
            onClick={handleClearChat}
            className="bg-white/80 backdrop-blur-sm text-red-600 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium flex items-center shadow-md hover:bg-white transition-colors"
            aria-label="Clear all messages"
          >
            <FaTrashAlt className="mr-1" size={isMobile ? 10 : 12} /> {isMobile ? 'Clear All' : 'Clear All Messages'}
          </button>
        </div>
      )}
      
      {messages.length === 0 ? (
        <div key="no-messages" className="flex justify-center items-center h-full relative z-10">
          <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg">
            <p className="text-gray-700 font-medium text-sm md:text-base">No messages yet. Start the conversation!</p>
          </div>
        </div>
      ) : (
        <div key="message-list" className="space-y-4 relative z-10">
          {messages.map((message, index) => (
            <Message
              key={message._id}
              message={message}
              isCurrentUser={message.sender._id === user?._id}
              showAvatar={index === 0 || messages[index - 1].sender._id !== message.sender._id}
              formatTime={formatMessageTime}
              previousMessage={index > 0 ? messages[index - 1] : null}
              onDelete={handleDeleteMessage}
            />
          ))}
          <div key="messages-end-ref" ref={messagesEndRef} />
          
          {!autoScroll && (
            <button
              key="scroll-to-bottom"
              onClick={() => {
                setAutoScroll(true);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="fixed bottom-20 right-4 md:right-8 bg-indigo-600 text-white p-1.5 md:p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors duration-200"
              aria-label="Scroll to bottom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      {/* Clear Chat Confirmation Modal */}
      {showClearChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-700 rounded-lg shadow-xl p-4 md:p-6 max-w-sm w-[90%] md:w-full mx-4">
            <h3 className="text-base md:text-lg font-semibold text-black mb-2 md:mb-4">Clear All Messages</h3>
            <p className="text-sm md:text-base text-gray-200 mb-4 md:mb-6">Are you sure you want to delete all messages from this chat? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2 md:space-x-3">
              <button
                onClick={() => setShowClearChatModal(false)}
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Clear Messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MessageList;