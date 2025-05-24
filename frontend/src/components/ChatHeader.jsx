import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { FaPhone, FaVideo, FaArrowLeft } from 'react-icons/fa';

const ChatHeader = ({ isMobile, onBackClick }) => {
  const { user } = useAuth();
  const { selectedChat, renameGroupChat } = useChat();
  const { isUserOnline } = useSocket();
  const { startCall } = useCall();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPicture, setGroupPicture] = useState('');

  if (!selectedChat) return null;

  // Determine chat name and image
  const isGroupChat = selectedChat.isGroupChat;
  const chatUser = isGroupChat
    ? null
    : selectedChat.users.find((u) => u._id !== user?._id);
  const chatName = isGroupChat ? selectedChat.chatName : chatUser?.username;
  const chatImage = isGroupChat
    ? selectedChat.groupPicture
    : chatUser?.profilePicture;
  const isOnline = !isGroupChat && isUserOnline(chatUser?._id);

  // Handle group chat rename
  const handleRenameGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) return;
    
    await renameGroupChat(selectedChat._id, groupName, groupPicture);
    setShowGroupModal(false);
    setGroupName('');
    setGroupPicture('');
  };

  return (
    <div className="p-3 flex justify-between items-center bg-gray-800 shadow-lg relative overflow-hidden">
      <div className="flex items-center relative z-10">
        {/* Back button for mobile */}
        {isMobile && onBackClick && (
          <button 
            onClick={onBackClick}
            className="mr-2 text-white p-2 rounded-full bg-white/20 backdrop-blur-sm"
            aria-label="Back to chat list"
          >
            <FaArrowLeft size={16} />
          </button>
        )}
        <div className="relative">
          <img
            src={chatImage}
            alt={chatName}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover cursor-pointer border-2 border-white/50 shadow-md transform transition-transform hover:scale-105 duration-300"
            onClick={() => setShowProfileModal(true)}
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
          )}
        </div>
        <div className="ml-3 max-w-[150px] md:max-w-xs">
          <h3 className="font-semibold text-white text-base md:text-lg truncate">{chatName}</h3>
          <p className="text-xs text-white/80 truncate">
            {isGroupChat
              ? `${selectedChat.users.length} members`
              : isOnline
              ? 'Online'
              : 'Offline'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-3 relative z-10">
        {/* Call buttons - only show for one-on-one chats */}
        {!isGroupChat && (
          <>
            <button
              onClick={() => startCall(chatUser?._id, 'audio')}
              className="text-green-500 hover:text-white/80 bg-white/20 p-1.5 md:p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
              title="Audio Call"
              aria-label="Start audio call"
            >
              <FaPhone className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              onClick={() => startCall(chatUser?._id, 'video')}
              className="text-blue-500 hover:text-white/80 bg-white/20 p-1.5 md:p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
              title="Video Call"
              aria-label="Start video call"
            >
              <FaVideo className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </>
        )}
        
        {/* Edit group button */}
        {isGroupChat && user?._id === selectedChat.groupAdmin?._id && (
          <button
            onClick={() => {
              setGroupName(selectedChat.chatName);
              setGroupPicture(selectedChat.groupPicture);
              setShowGroupModal(true);
            }}
            className="text-white hover:text-white/80 bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:bg-white/30"
            title="Edit Group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl backdrop-blur-sm bg-white/90 p-6 w-[90%] md:w-96 max-w-md mx-4">
            <div className="flex flex-col items-center">
              <div className="absolute -z-10 top-0 left-0 right-0 h-32 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl"></div>
            </div>
            <div className="text-center">
              <img
                src={chatImage}
                alt={chatName}
                className="w-24 h-24 rounded-full object-cover mx-auto"
              />
              <h3 className="text-xl font-semibold mt-4">{chatName}</h3>
              {!isGroupChat && (
                <p className="text-sm text-gray-500">{chatUser?.email}</p>
              )}
              {isGroupChat && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700">Members:</h4>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    {selectedChat.users.map((user) => (
                      <div key={user._id} className="flex items-center py-2">
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="ml-2 text-sm">{user.username}</span>
                        {user._id === selectedChat.groupAdmin?._id && (
                          <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="btn btn-secondary bg-red-400 px-5 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Group Edit Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl backdrop-blur-sm bg-white/90 p-6 w-[90%] md:w-96 border border-purple-100">
            <div className="absolute -z-10 top-0 left-0 right-0 h-32 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl"></div>
              <h3 className="text-xl font-semibold bg-white text-transparent bg-clip-text">Edit Group</h3>
            <form onSubmit={handleRenameGroup} className="mt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white mt-1"
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Group Picture URL (optional)
                </label>
                <input
                  type="text"
                  value={groupPicture}
                  onChange={(e) => setGroupPicture(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white mt-1"
                  placeholder="Enter image URL"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition-colors duration-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-red-500 to-secondary-light text-white font-medium rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
