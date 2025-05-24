import React, { useEffect, useState, useCallback } from 'react';
import { FaPhone, FaPhoneSlash, FaVideo, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useCall } from '../context/CallContext';

const IncomingCallNotification = () => {
  const { isReceivingCall, caller, callType, answerCall, rejectCall } = useCall();
  
  // Debug caller information
  useEffect(() => {
    if (isReceivingCall && caller) {
      console.log('Incoming call notification with caller:', caller);
    }
  }, [isReceivingCall, caller]);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Handle responsive layout
  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  
  // Handle ringtone muting
  const toggleMute = () => {
    if (window.ringtoneAudio) {
      window.ringtoneAudio.muted = !window.ringtoneAudio.muted;
      setIsMuted(!isMuted);
    }
  };
  
  // Start timer when call notification appears
  useEffect(() => {
    let timer;
    if (isReceivingCall) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    
    return () => clearInterval(timer);
  }, [isReceivingCall]);
  
  // Auto-reject call after 30 seconds if not answered
  useEffect(() => {
    if (elapsedTime >= 30 && isReceivingCall) {
      rejectCall();
    }
  }, [elapsedTime, isReceivingCall, rejectCall]);

  if (!isReceivingCall) return null;

  // Format remaining time
  const remainingTime = 30 - elapsedTime;
  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed ${isMobile ? 'top-2 right-2 left-2 w-auto' : 'top-4 right-4 w-80'} z-50 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl overflow-hidden animate-slideIn`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-700">
        <div 
          className="h-full bg-red-500 transition-all duration-1000 ease-linear" 
          style={{ width: `${(remainingTime / 30) * 100}%` }}
        />
      </div>
      
      <div className="p-3 md:p-5">
        {/* Pulsing avatar for incoming call */}
        <div className="flex items-center mb-3 md:mb-4">
          <div className="relative mr-3 md:mr-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-indigo-600 flex items-center justify-center z-10 relative animate-pulse">
              <span className="text-lg md:text-xl text-white font-bold">
                {caller?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-75 animate-ping-slow"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-base md:text-lg truncate">
              {caller && typeof caller === 'object' ? 
                (caller.name || caller.username || caller.displayName || 'Unknown Caller') : 
                'Someone'}
            </h3>
            <p className="text-gray-300 text-xs md:text-sm flex items-center">
              {callType === 'video' ? (
                <>
                  <FaVideo className="mr-1" size={isMobile ? 12 : 14} /> Video Call
                </>
              ) : (
                <>
                  <FaPhone className="mr-1" size={isMobile ? 12 : 14} /> Audio Call
                </>
              )}
              <span className="ml-2 text-gray-400">{formatTime(remainingTime)}</span>
            </p>
          </div>
          
          {/* Mute button */}
          <button 
            onClick={toggleMute} 
            className="ml-2 md:ml-auto p-1.5 md:p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title={isMuted ? 'Unmute ringtone' : 'Mute ringtone'}
            aria-label={isMuted ? 'Unmute ringtone' : 'Mute ringtone'}
          >
            {isMuted ? 
              <FaVolumeMute className="text-red-500" size={isMobile ? 14 : 16} /> : 
              <FaVolumeUp className="text-white" size={isMobile ? 14 : 16} />
            }
          </button>
        </div>

        <div className="flex justify-between gap-2 md:gap-3 mt-2">
          <button
            onClick={rejectCall}
            className="flex-1 py-2 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-md text-sm md:text-base"
            aria-label="Decline call"
          >
            <FaPhoneSlash className="mr-1 md:mr-2" size={isMobile ? 14 : 16} /> Decline
          </button>
          <button
            onClick={answerCall}
            className="flex-1 py-2 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-md text-sm md:text-base"
            aria-label="Answer call"
          >
            <FaPhone className="mr-1 md:mr-2" size={isMobile ? 14 : 16} /> Answer
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
