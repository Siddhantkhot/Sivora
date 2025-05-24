import { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import EmojiPicker from 'emoji-picker-react';

const MessageInput = () => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const { user } = useAuth();
  const { socket } = useSocket();
  const {
    selectedChat,
    sendMessage,
    uploadFile
  } = useChat();

  // Clear message when selected chat changes
  useEffect(() => {
    setMessage('');
    setSelectedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedChat]);

  // Typing indicator functionality removed

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!selectedChat || (!message.trim() && !fileInputRef.current?.files[0])) {
      return;
    }
    
    try {
      const messageContent = message.trim();
      setMessage(''); // Clear input immediately for better UX
      
      // Check if there's a file to upload
      if (fileInputRef.current?.files[0]) {
        setIsUploading(true);
        const file = fileInputRef.current.files[0];
        const fileData = await uploadFile(file);
  
        if (fileData) {
          // Emit socket event for file message before API call
          if (socket) {
            // The fileUrl should already be an absolute URL from the ChatContext
            // We don't need to modify it here
            const tempMessage = {
              content: messageContent,
              sender: user,
              chat: selectedChat,
              fileUrl: fileData.fileUrl, // Already an absolute URL from uploadFile
              fileType: fileData.fileType,
              fileName: selectedFileName, // Include the original filename
              createdAt: new Date().toISOString(),
              tempId: Date.now().toString(),
              isOptimistic: true
            };
            
            console.log('Sending file message via socket:', tempMessage);
            
            // Emit to socket for real-time delivery to other users
            socket.emit('new message', tempMessage);
          }
          
          // Then make the API call
          await sendMessage(
            messageContent,
            selectedChat._id,
            fileData.fileUrl,
            fileData.fileType,
            selectedFileName // Pass the original filename to the sendMessage function
          );
        }
  
        // Reset file input
        fileInputRef.current.value = '';
        setSelectedFileName('');
        setIsUploading(false);
      } else {
        // For text messages, emit socket event first for instant delivery
        if (socket) {
          const tempMessage = {
            content: messageContent,
            sender: user,
            chat: selectedChat,
            createdAt: new Date().toISOString(),
            tempId: Date.now().toString(),
            isOptimistic: true
          };
          
          // Emit to socket for real-time delivery to other users
          socket.emit('new message', tempMessage);
        }
        
        // Then make the API call with optimistic update
        await sendMessage(messageContent, selectedChat._id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      setMessage(file.name);
    } else {
      setSelectedFileName('');
      setMessage('');
    }
  };

  const handleEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!selectedChat) {
    return null;
  }

  return (
    <div className="p-3.5 bg-gray-900 backdrop-blur-sm shadow-md z-50">
      <form 
        onSubmit={handleSubmit} 
        className="flex items-center space-x-2">
      
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleFileClick}
            className="p-2.5 bg-gray-800 rounded-full text-red-500 hover:text-red-500 hover:bg-slate-400 transition-colors duration-200 flex items-center justify-center"
            title="Attach file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
               <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 bg-gray-800 rounded-full text-green-500 hover:text-red-500 hover:bg-slate-500 transition-colors duration-200 flex items-center justify-center"
              title="Emoji"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          <div ref={emojiPickerRef}>
            {showEmojiPicker && (
              <div
                className="absolute bottom-12 left-0 z-10 shadow-xl rounded-lg overflow-hidden"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  searchDisabled={false}
                  skinTonesDisabled
                  width={window.innerWidth < 768 ? 250 : 300}
                  height={window.innerWidth < 768 ? 300 : 400}
                  previewConfig={{ showPreview: false }}
                  theme="dark"
                  lazyLoadEmojis={true}
                />
              </div>
            )}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
        />

        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full py-2.5 md:py-3.5 px-3 md:px-4 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 hover:bg-white text-sm md:text-base"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {fileInputRef.current?.files[0] && (
            <div className="absolute right-12 md:right-20 top-1/2 transform -translate-y-1/2 bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-full text-xs flex items-center">
              <span className="truncate max-w-[60px] md:max-w-[100px]">
                {fileInputRef.current.files[0].name}
              </span>
              <button
                type="button"
                className="ml-1 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    setSelectedFileName('');
                    setMessage('');
                  }
                }}
                aria-label="Remove file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`p-2 md:p-3 rounded-full shadow-sm flex items-center justify-center transition-all duration-200 ${
            isUploading ||
            (!message.trim() && !fileInputRef.current?.files[0])
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-md transform hover:-translate-y-0.5'
          }`}
          disabled={
            isUploading || (!message.trim() && !fileInputRef.current?.files[0])
          }
          aria-label="Send message"
        >
          {isUploading ? (
            <div className="animate-spin h-4 w-4 md:h-5 md:w-5">
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          ) : (
            <img
              src="https://cdn-icons-png.flaticon.com/128/876/876777.png"
              alt="Send"
              className="h-4 w-4"
            />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;