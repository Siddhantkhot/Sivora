import React, { useEffect, useState, useCallback } from 'react';
import { useCall } from '../context/CallContext';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaExpand, FaCompress, FaDesktop, FaUserFriends, FaSignal } from 'react-icons/fa';

const CallInterface = () => {
  const {
    isCallInProgress,
    isCallMinimized,
    callType,
    callAccepted,
    caller,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    myVideoRef,
    userVideoRef,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenSharing,
    toggleCallMinimized
  } = useCall();
  
  // Call duration state
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good'); // 'poor', 'fair', 'good'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Handle responsive layout
  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  
  // Start call timer when call is accepted
  useEffect(() => {
    let timer;
    if (callAccepted) {
      // Start timer
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      // Simulate connection quality changes (in a real app, this would be based on actual metrics)
      const qualityTimer = setInterval(() => {
        const qualities = ['good', 'fair', 'poor'];
        const randomQuality = qualities[Math.floor(Math.random() * 3)];
        setConnectionQuality(randomQuality);
      }, 10000);
      
      return () => {
        clearInterval(timer);
        clearInterval(qualityTimer);
      };
    }
    return () => clearInterval(timer);
  }, [callAccepted]);
  
  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Stop ringtone when component unmounts or call is accepted/rejected
  useEffect(() => {
    if (callAccepted && window.ringtoneAudio) {
      window.ringtoneAudio.pause();
      window.ringtoneAudio = null;
    }
    
    return () => {
      if (window.ringtoneAudio) {
        window.ringtoneAudio.pause();
        window.ringtoneAudio = null;
      }
    };
  }, [callAccepted]);

  // If no call is in progress, don't render anything
  if (!isCallInProgress) return null;

  // Fixed size for call interface regardless of state
  const interfaceClasses = 'fixed inset-0 z-50 bg-gray-900 flex flex-col';

  return (
    <div className={interfaceClasses}>
      {/* Call header */}
      <div className="bg-gray-800 p-2 md:p-3 flex justify-between items-center">
        <div className="text-white font-medium flex items-center text-sm md:text-base">
          {callAccepted ? (
            <>
              <span className="mr-1 md:mr-2 truncate max-w-[120px] md:max-w-full">{caller?.name || 'User'}</span>
              <span className="text-[10px] md:text-xs text-gray-400">{formatDuration(callDuration)}</span>
              {/* Connection quality indicator */}
              <span className="ml-1 md:ml-2">
                {connectionQuality === 'good' && <FaSignal className="text-green-500" size={isMobile ? 10 : 14} />}
                {connectionQuality === 'fair' && <FaSignal className="text-yellow-500" size={isMobile ? 10 : 14} />}
                {connectionQuality === 'poor' && <FaSignal className="text-red-500" size={isMobile ? 10 : 14} />}
              </span>
              {/* Screen sharing indicator - hide on very small screens */}
              {isScreenSharing && !isMobile && (
                <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                  <FaDesktop className="inline mr-1" size={10} /> Sharing
                </span>
              )}
            </>
          ) : (
            'Calling...'
          )}
        </div>
        <button
          onClick={toggleCallMinimized}
          className="text-gray-300 hover:text-white"
          aria-label={isCallMinimized ? 'Expand call' : 'Minimize call'}
        >
          {isCallMinimized ? <FaExpand size={isMobile ? 16 : 20} /> : <FaCompress size={isMobile ? 16 : 20} />}
        </button>
      </div>

      {/* Video container */}
      <div className={`relative ${isCallMinimized ? 'h-full' : 'flex-1 flex'}`}>
        {/* Remote video (full screen) */}
        {callAccepted && (
          <div className={`${isCallMinimized ? 'h-full w-full' : 'flex-1'}`}>
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              className={`${callType === 'video' ? 'h-full w-full object-cover' : 'hidden'}`}
            />
            {callType === 'audio' && (
              <div className="h-full w-full flex items-center justify-center bg-gray-800">
                <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-3xl text-white font-bold">
                    {caller?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Local video (picture-in-picture) - smaller on mobile */}
        {callType === 'video' && (
          <div className={`absolute bottom-4 right-4 ${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-lg overflow-hidden border-2 border-white shadow-lg`}>
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Calling spinner (when call is not yet accepted) */}
        {!callAccepted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className={`${isMobile ? 'w-12 h-12 border-3' : 'w-16 h-16 border-4'} border-indigo-500 border-t-transparent rounded-full animate-spin mb-3 md:mb-4`}></div>
              <p className="text-white text-base md:text-lg">Calling...</p>
            </div>
          </div>
        )}
      </div>

      {/* Call controls - smaller on mobile */}
      <div className="bg-gray-800 p-2 md:p-3 flex justify-center gap-2 md:gap-4">
        <button
          onClick={toggleAudio}
          className={`p-2 md:p-3 rounded-full ${isAudioMuted ? 'bg-red-500' : 'bg-gray-600'} hover:opacity-80 transition-opacity`}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
          aria-label={isAudioMuted ? 'Unmute' : 'Mute'}
        >
          {isAudioMuted ? <FaMicrophoneSlash size={isMobile ? 16 : 20} /> : <FaMicrophone size={isMobile ? 16 : 20} />}
        </button>
        
        {callType === 'video' && (
          <>
            <button
              onClick={toggleVideo}
              className={`p-2 md:p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'} hover:opacity-80 transition-opacity`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <FaVideoSlash size={isMobile ? 16 : 20} /> : <FaVideo size={isMobile ? 16 : 20} />}
            </button>
            
            <button
              onClick={toggleScreenSharing}
              className={`p-2 md:p-3 rounded-full ${isScreenSharing ? 'bg-blue-600' : 'bg-gray-600'} hover:opacity-80 transition-opacity`}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
              <FaDesktop size={isMobile ? 16 : 20} />
            </button>
          </>
        )}
        
        <button
          onClick={endCall}
          className="p-2 md:p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          title="End call"
          aria-label="End call"
        >
          <FaPhoneSlash size={isMobile ? 16 : 20} />
        </button>
      </div>

      {/* No minimized controls */}
    </div>
  );
};

export default CallInterface;
