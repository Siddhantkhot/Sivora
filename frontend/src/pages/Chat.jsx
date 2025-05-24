import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { FaArrowLeft, FaUsers, FaComments, FaBars, FaTimes } from 'react-icons/fa';

const Chat = () => {
  const { user } = useAuth();
  const { selectedChat, accessChat, createGroupChat } = useChat();
  const { joinChatRoom, leaveChatRoom } = useSocket();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Sidebar visibility state - default to true on desktop, false on mobile
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    if (selectedChat) {
      joinChatRoom(selectedChat._id);
      // On mobile, hide sidebar when a chat is selected
      if (isMobile) {
        setShowSidebar(false);
      }
    }
    
    return () => {
      if (selectedChat) {
        leaveChatRoom(selectedChat._id);
      }
    };
  }, [selectedChat, isMobile]);
  
  // Add responsive handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop, always show sidebar
      if (!mobile) {
        setShowSidebar(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

const fetchAllUsers = async () => {
  try {
    setIsLoading(true);
    const { data } = await api.get('/api/users');
    // Filter out the current user from the list
    const filteredUsers = data.filter(u => u._id !== user._id);
    setAllUsers(filteredUsers);
    setSearchResults(filteredUsers); // Show all users initially
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    setIsLoading(false);
  }
};
  // Modify the useEffect for showNewGroupModal
useEffect(() => {
  if (showNewGroupModal) {
    fetchAllUsers();
    // setSearchResults(allUsers); // Show all users initially
  }
}, [showNewGroupModal]);

  // Toggle sidebar for mobile
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  // Handle user search for new chat
 const handleSearch = () => {
  if (!searchTerm.trim()) {
    setSearchResults(allUsers); // Show all users when search is empty
    return;
  }
  
  const filtered = allUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  setSearchResults(filtered);
};

  // Handle starting a new chat with a user
  const handleStartChat = async (userId) => {
    await accessChat(userId);
    setShowNewChatModal(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Handle user selection for group chat
  const handleUserSelect = (user) => {
    // Check if user is already selected
    if (selectedUsers.some(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Handle group chat creation
  const handleCreateGroup = async (e) => {
  e.preventDefault();
  
  if (!groupName.trim() || selectedUsers.length < 2) {
    return;
  }
  
  try {
    setIsLoading(true);
    const userIds = selectedUsers.map(user => user._id);
    await createGroupChat(userIds, groupName);
    
    // Clear form and close modal
    setShowNewGroupModal(false);
    setGroupName('');
    setSelectedUsers([]);
    setSearchTerm('');
    setSearchResults([]);
    
    // Optional: Show success message
    toast.success('Group chat created successfully!');
  } catch (error) {
    console.error('Error creating group:', error);
    // Optional: Show error message
    toast.error(error.response?.data?.message || 'Failed to create group chat');
  } finally {
    setIsLoading(false);
  }
};



  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden relative">
      {/* Mobile sidebar toggle button */}
      {isMobile && !showSidebar && selectedChat && (
        <button 
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-50 bg-white p-2 rounded-full shadow-md text-primary-dark"
        >
          <FaBars size={20} />
        </button>
      )}
      
      {/* Sidebar - responsive */}
      <div 
        className={`${isMobile ? 'absolute inset-y-0 left-0 w-full md:w-1/3' : 'w-1/4'} 
          bg-black border-r border-gray-200 shadow-md z-20 flex flex-col
          transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`
        }
      >
        {/* Mobile close button */}
        {isMobile && (
         
            <button 
              onClick={toggleSidebar}
              className="p-2 text-red-500 hover:text-blue-700"
            >
              <FaTimes size={20} />
            </button>
          
        )}
        <Sidebar />
        
        {/* New Chat and Group Chat buttons */}
        <div className="p-4 bg-gray-900 space-x-3 flex">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-black font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            New Chat
          </button>
          <button
            onClick={() => setShowNewGroupModal(true)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-black font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
              />
            </svg>
            New Group
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${isMobile && showSidebar ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            <ChatHeader 
              chat={selectedChat} 
              isMobile={isMobile} 
              onBackClick={isMobile ? () => setShowSidebar(true) : undefined} 
            />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className=" flex-1 flex items-center justify-center ">
            <div className="text-center p-6 max-w-sm bg-gray-900 border-4 border-t-blue-500 border-e-green-500 border-b-yellow-500 border-s-red-500 rounded-xl">
              <div className="flex justify-center mb-4">
               <img src="chat-bg.png"/> 
              </div>
              <h3 className=" text-xl font-medium mb-2 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text">No chat selected</h3>
              <p className=" bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text">Choose a conversation from the sidebar or start a new chat.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 bg-gray-800 p-6 rounded-xl shadow-xl w-[90%] md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-hidden flex flex-col ">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-inherit to-inherit  shadow-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className=" bg-gradient-to-r from-inherit to-inherit text-transparent bg-clip-text text-2xl font-bold ">New Chat</h2>
            </div>
            <div className="mt-6">
              <div className="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-primary-light transition-all duration-200 shadow-sm">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  onClick={handleSearch}
                  className="h-full p-4 rounded-lg bg-gradient-to-r from-inherit to-inherit  font-medium transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching
                    </span>
                  ) : 'Search'}
                </button>
              </div>
              
              <div className="mt-6 max-h-60 overflow-y-auto rounded-xl bg-white shadow-inner">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    {searchTerm ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No users found matching <span className="font-semibold">"{searchTerm}"</span></p>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">Search for users to start a conversation</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {searchResults.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center p-4 cursor-pointer hover:bg-purple-200 transition-colors duration-200"
                        onClick={() => handleStartChat(user._id)}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-light/20 to-secondary-light/20 flex items-center justify-center mr-4 overflow-hidden">
                          {user.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-semibold text-primary-DEFAULT">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{user.username}</h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-inherit to-inherit font-medium rounded-xl transition-colors duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="fixed  inset-0 bg-black  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-[90%] md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 shadow-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text">Create Group Chat</h2>
            </div>
            <form onSubmit={handleCreateGroup} className="mt-6">
              <div className="mb-6">
                <label className="block text-sm font-medium bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Enter group name"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text mb-2">
                  Add Members (at least 2)
                </label>
                <div className="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-primary-light transition-all duration-200 shadow-sm">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="h-full p-4 rounded-lg bg-gradient-to-r from-red-500 to-blue-500 text-white font-medium transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching
                      </span>
                    ) : 'Search'}
                  </button>
                </div>
              </div>
              
              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Users ({selectedUsers.length})
                  </label>
                  <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    {selectedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="bg-white rounded-full px-3 py-1.5 flex items-center shadow-sm border border-gray-100"
                      >
                        <span className="text-sm font-medium text-gray-700">{user.username}</span>
                        <button
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="ml-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search results */}
              <div className="max-h-48 overflow-y-auto mb-6 rounded-xl bg-white shadow-inner border border-gray-100">
  <div className="divide-y divide-gray-100">
    {(searchResults.length > 0 ? searchResults : allUsers).map((user) => (
      <div
        key={user._id}
        className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
          selectedUsers.some(u => u._id === user._id) ? 'bg-gray-50' : ''
        }`}
        onClick={() => handleUserSelect(user)}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-light/20 to-secondary-light/20 flex items-center justify-center mr-4 overflow-hidden">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-primary-DEFAULT">
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-800">{user.username}</h4>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        {selectedUsers.some(u => u._id === user._id) && (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    ))}
  </div>
</div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewGroupModal(false);
                    setGroupName('');
                    setSelectedUsers([]);
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
  type="submit"
  className={`px-6 py-3 bg-purple-800 text-white font-medium rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 
    ${(!groupName.trim() || selectedUsers.length < 2) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
  disabled={!groupName.trim() || selectedUsers.length < 2 || isLoading}
>
  {isLoading ? (
    <span className="flex items-center">
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Creating...
    </span>
  ) : 'Create Group'}
</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
