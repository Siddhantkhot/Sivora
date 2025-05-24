import React, { useState, useEffect } from 'react';
import { FaPhone, FaVideo, FaPhoneSlash, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { format } from 'date-fns';

const CallHistory = ({ onClose }) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [callHistory, setCallHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'incoming', 'outgoing', 'missed'
  
  // Fetch call history from localStorage on component mount
  useEffect(() => {
    const storedHistory = localStorage.getItem(`callHistory_${user?._id}`);
    if (storedHistory) {
      setCallHistory(JSON.parse(storedHistory));
    }
  }, [user]);
  
  // The call history visibility is controlled by the parent component
  // No need for local state to control visibility
  // Filter call history based on selected filter
  const filteredHistory = callHistory.filter(call => {
    if (filter === 'all') return true;
    if (filter === 'incoming') return call.direction === 'incoming' && call.status !== 'missed';
    if (filter === 'outgoing') return call.direction === 'outgoing';
    if (filter === 'missed') return call.status === 'missed';
    return true;
  });
  
  // Sort call history by date (newest first)
  const sortedHistory = [...filteredHistory].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  // Handle initiating a call from history
  const handleCallUser = (userId, callType) => {
    startCall(userId, callType);
    onClose();
  };
  
  // Format call duration
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Clear call history
  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your call history?')) {
      localStorage.removeItem(`callHistory_${user?._id}`);
      setCallHistory([]);
    }
  };

  return (
    <><div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40" 
      onClick={onClose}
    />
    <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full max-h-[80vh] flex flex-col z-50 ">
      <div className="bg-black p-4">
        <h2 className="bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-xl font-semibold">Call History</h2>
      </div>
      
      {/* Filter tabs */}
      <div className="flex border-b">
        {['all', 'incoming', 'outgoing', 'missed'].map((option) => (
          <button
            key={option}
            className={`flex-1 py-2 px-4 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text text-sm font-medium ${
              filter === option
                ? 'text-primary-light border-b-2 border-primary-light'
                : 'text-gray-900 hover:text-gray-700'
            }`}
            onClick={() => setFilter(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Call list */}
      <div className="overflow-y-auto flex-1">
        {sortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 ">
            <FaInfoCircle className="text-4xl mb-2" />
            <p>No call history found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sortedHistory.map((call) => (
              <li key={call.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      call.status === 'missed' && call.direction === 'incoming' 
                        ? 'bg-red-100 text-red-500' 
                        : call.direction === 'incoming' 
                          ? 'bg-green-100 text-green-500' 
                          : 'bg-blue-100 text-blue-500'
                    }`}>
                      {call.callType === 'video' ? (
                        <FaVideo />
                      ) : call.status === 'missed' ? (
                        <FaPhoneSlash />
                      ) : (
                        <FaPhone />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{call.userName}</h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className={`mr-2 ${
                          call.status === 'missed' ? 'text-red-500' : ''
                        }`}>
                          {call.direction === 'incoming' ? 'Incoming' : 'Outgoing'} 
                          {call.status === 'missed' ? ' (Missed)' : ''}
                        </span>
                        <span>{format(new Date(call.timestamp), 'MMM d, h:mm a')}</span>
                      </div>
                      {call.status !== 'missed' && (
                        <div className="text-xs text-gray-500">
                          Duration: {formatDuration(call.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCallUser(call.userId, 'audio')}
                      className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                      title="Audio call"
                    >
                      <FaPhone size={14} />
                    </button>
                    <button
                      onClick={() => handleCallUser(call.userId, 'video')}
                      className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                      title="Video call"
                    >
                      <FaVideo size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t p-3 flex bg-black justify-between">
        <button
          onClick={clearHistory}
          className="bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text"
          disabled={callHistory.length === 0}
        >
          Clear History
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text rounded-md text-md hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
    </>
  );
};

export default CallHistory;
