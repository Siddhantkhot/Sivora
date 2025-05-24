import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  isWebRTCSupported,
  createPeerConnection,
  createOffer,
  createAnswer,
  addTracksToConnection,
  handleIceCandidate,
  completeConnection,
  closePeerConnection
} from '../utils/webrtc-helper';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';
import { toast } from 'react-toastify';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { currentChat } = useChat();
  
  // Play ringtone with multiple fallback options
  const playRingtone = () => {
    // Array of audio sources to try in order
    const baseUrl = window.location.origin;
    const audioSources = [
      `${baseUrl}/sounds/ringtone.mp3`,
      `${baseUrl}/sounds/ringtone.wav`,
      `${baseUrl}/sounds/ringtone.ogg`,
      `${baseUrl}/assets/sounds/ringtone.mp3`,
      `${baseUrl}/assets/sounds/notification.mp3`,
      // Add more fallback paths
      `/sounds/ringtone.mp3`,
      `/assets/sounds/ringtone.mp3`,
      `${baseUrl}/ringtone.mp3`
    ];
    
    // Try to play the first source
    tryPlayAudio(audioSources, 0);
    
    // Recursive function to try each audio source until one works
    function tryPlayAudio(sources, index) {
      if (index >= sources.length) {
        console.warn('All audio formats failed');
        trySystemNotification();
        return;
      }
      
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = sources[index];
      audio.loop = true;
      
      console.log(`Attempting to play ringtone from: ${sources[index]}`);
      
      // Store reference globally for later cleanup
      window.ringtoneAudio = audio;
      
      // Add event listener for when audio is ready
      audio.addEventListener('canplaythrough', () => {
        console.log(`Audio ready: ${sources[index]}`);
      });
      
      // Add error event listener for better debugging
      audio.addEventListener('error', (e) => {
        console.error(`Audio error for ${sources[index]}:`, e);
      });
      
      // Try to play with error handling
      audio.play()
        .then(() => {
          console.log(`Successfully playing: ${sources[index]}`);
        })
        .catch(err => {
          console.error(`Failed to play ${sources[index]}:`, err);
          // Try the next source
          window.ringtoneAudio = null;
          tryPlayAudio(sources, index + 1);
        });
    }
    
    // Fallback to system notification if all audio fails
    function trySystemNotification() {
      try {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Incoming Call', { silent: false });
          } else if (Notification.permission !== 'denied') {
            // Request permission if not already denied
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Incoming Call', { silent: false });
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to show notification:', e);
      }
    }
  };
  
  // Helper function to get audio-only stream with robust error handling
  const getAudioOnlyStream = async () => {
    try {
      console.log('Attempting to get audio-only stream');
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      console.log('Audio-only stream acquired successfully');
      return {
        stream: audioStream,
        actualCallType: 'audio'
      };
    } catch (audioErr) {
      console.error('Audio-only access failed:', audioErr);
      throw new Error('Could not access microphone. Please check your device and permissions.');
    }
  };
  
  // Utility function to get media with fallback options
  const getMediaWithFallback = async (requestedCallType) => {
    // First, check available devices to make better decisions
    let videoDevices = [];
    let audioDevices = [];
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter(device => device.kind === 'videoinput');
      audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log(`Available devices - Video: ${videoDevices.length}, Audio: ${audioDevices.length}`);
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
      // Continue anyway, getUserMedia might still work
    }
    
    // Prepare constraints based on available devices
    const hasVideoDevices = videoDevices.length > 0;
    const hasAudioDevices = audioDevices.length > 0;
    
    // If video was requested but no video devices found, fall back to audio immediately
    if (requestedCallType === 'video' && !hasVideoDevices) {
      console.warn('Video call requested but no video devices found');
      toast.warning('No camera detected. Starting audio-only call.');
      return await getAudioOnlyStream();
    }
    
    // First try to get just audio to ensure we have basic functionality
    if (requestedCallType === 'video') {
      try {
        // Pre-check audio access to ensure basic functionality
        const audioTest = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Stop the test stream immediately
        audioTest.getTracks().forEach(track => track.stop());
        console.log('Audio pre-check successful');
      } catch (audioErr) {
        console.error('Audio pre-check failed:', audioErr);
        toast.error('Could not access microphone. Please check your device and permissions.');
        throw new Error('Microphone access required for calls');
      }
    }
    
    // Build constraints with explicit device selection if possible
    const constraints = {
      audio: hasAudioDevices ? { echoCancellation: true } : true,
      video: requestedCallType === 'video' ? 
        (hasVideoDevices ? { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false) : false
    };
    
    try {
      console.log('Attempting to access media with constraints:', JSON.stringify(constraints));
      
      // Try to get media with a timeout to prevent hanging
      const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Media access timed out')), 15000); // Increased timeout
      });
      
      const stream = await Promise.race([mediaPromise, timeoutPromise]);
      
      // Verify we got what we asked for
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      
      console.log('Media stream obtained:', { hasVideo, hasAudio });
      
      // Add event listeners to tracks
      if (hasVideo) {
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.addEventListener('ended', () => {
          console.log('Video track ended unexpectedly');
          toast.warning('Video source disconnected. Switching to audio only.');
          setMediaState(prev => ({ ...prev, isVideoOff: true }));
        });
      } else if (requestedCallType === 'video') {
        console.warn('Requested video but no video tracks were received');
        toast.warning('Camera not detected or disabled. Continuing with audio only.');
      }
      
      if (hasAudio) {
        const audioTrack = stream.getAudioTracks()[0];
        audioTrack.addEventListener('ended', () => {
          console.log('Audio track ended unexpectedly');
          toast.warning('Microphone disconnected.');
        });
      }
      
      return {
        stream,
        actualCallType: hasVideo ? 'video' : 'audio'
      };
    } catch (err) {
      console.error('Media access error:', err);
      
      // Handle specific errors with better error messages and fallbacks
      if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        console.error(`${err.name} details:`, err);
        // Handle camera in use or hardware errors
        if (requestedCallType === 'video') {
          console.log('Video device error, attempting audio-only fallback');
          toast.warning('Camera access failed. Falling back to audio-only call.');
          try {
            return await getAudioOnlyStream();
          } catch (audioErr) {
            console.error('Audio fallback also failed:', audioErr);
            throw new Error('Could not access any media devices. Please check your hardware and permissions.');
          }
        }
      }
      
      // If video was requested but failed for other reasons, try audio only
      if (requestedCallType === 'video') {
        console.log('Video access failed, attempting audio-only fallback');
        toast.warning('Camera access failed. Falling back to audio-only call.');
        try {
          return await getAudioOnlyStream();
        } catch (audioErr) {
          console.error('Audio fallback also failed:', audioErr);
          throw new Error('Could not access any media devices. Please check your hardware and permissions.');
        }
      }
      
      // Provide specific error messages based on error type
      const errorMessages = {
        NotAllowedError: 'Microphone/camera access denied. Please check your browser permissions.',
        NotFoundError: 'No microphone/camera found. Please check your device connections.',
        AbortError: 'Your microphone/camera is already in use by another application.',
        OverconstrainedError: 'Your camera does not support the requested video constraints. Try a different camera.',
        SecurityError: 'Media access blocked due to security restrictions in your browser.',
        TypeError: 'Invalid media constraints specified. Please reload the application.'
      };
      
      throw new Error(errorMessages[err.name] || `Media access error: ${err.name}. ${err.message}`);
    }
  };
  
  // Call state
  const [callState, setCallState] = useState({
    isReceivingCall: false,
    isCallInProgress: false,
    isCallMinimized: false,
    caller: null,
    callerSignal: null,
    callType: null, // 'audio' or 'video'
    callAccepted: false,
    callEnded: false,
    callRejected: false,
  });
  
  // Media state
  const [mediaState, setMediaState] = useState({
    stream: null,
    myVideo: null,
    userVideo: null,
    isAudioMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    originalStream: null,
  });

  // Refs
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // Initialize socket event listeners for call signaling
  useEffect(() => {
    if (!socket || !user) return;

    console.log('Setting up call socket listeners for user:', user._id);

    // Handle incoming call
    socket.on('call_user', ({ from, callerName, signal, callType }) => {
      // Enhanced logging to debug caller name issues
      console.log('Incoming call details:', {
        from: from,
        callerName: callerName,
        callType: callType,
        hasSignal: !!signal
      });
      
      // Ensure we have a fallback for the caller name
      const displayName = callerName || 'Unknown Caller';
      
      setCallState(prev => ({
        ...prev,
        isReceivingCall: true,
        caller: { _id: from, name: displayName },
        callerSignal: signal,
        callType
      }));
      
      playRingtone();
    });
    // Handle call accepted
    socket.on('call_accepted', ({ signal }) => {
      console.log('Call accepted, received answer:', signal);
      setCallState(prev => ({ ...prev, callAccepted: true }));
      
      // Update call status if it exists
      if (window.currentCall) {
        window.currentCall.status = 'answered';
      }
      
      // Set remote description with the received answer
      if (connectionRef.current) {
        completeConnection(connectionRef.current, signal)
          .catch(err => {
            console.error('Error setting remote description:', err);
            toast.error('Failed to establish connection');
          });
      }
    });

    // Handle received ICE candidate
    socket.on('ice_candidate', ({ candidate }) => {
      console.log('Received ICE candidate from remote peer');
      
      // Add the ICE candidate to the peer connection
      if (connectionRef.current && candidate) {
        try {
          connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
            console.error('Error adding received ICE candidate', err);
          });
        } catch (err) {
          console.error('Error creating or adding ICE candidate:', err);
        }
      } else {
        console.warn('Received ICE candidate but connection not ready');
      }
    });

    // Handle call rejected
    socket.on('call_rejected', () => {
      console.log('Call was rejected by recipient');
      
      // Update call record if it exists
      if (window.currentCall) {
        const callRecord = {
          ...window.currentCall,
          status: 'rejected',
          endTime: Date.now(),
          duration: window.currentCall.startTime ? 
            Math.floor((Date.now() - window.currentCall.startTime) / 1000) : 0
        };
        
        // Save the updated call record
        saveCallToHistory(callRecord);
        window.currentCall = null;
      }
      
      // Stop all media tracks
      if (mediaState.stream) {
        mediaState.stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
      }
      
      if (mediaState.originalStream) {
        mediaState.originalStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped original ${track.kind} track`);
        });
      }
      
      // Close peer connection
      if (connectionRef.current) {
        try {
          closePeerConnection(connectionRef.current);
          connectionRef.current = null;
          console.log('Closed peer connection');
        } catch (e) {
          console.error('Error closing peer connection:', e);
        }
      }
      
      // Reset video elements
      if (myVideo.current) {
        myVideo.current.srcObject = null;
      }
      
      if (userVideo.current) {
        userVideo.current.srcObject = null;
      }
      
      // Update call state
      setCallState(prev => ({ 
        ...prev, 
        callRejected: true,
        callEnded: true,
        isCallInProgress: false,
        isReceivingCall: false,
        callAccepted: false,
        caller: null,
        callSignal: null,
        callRecipient: null,
        callType: null
      }));
      
      // Reset media state
      setMediaState(prev => ({
        ...prev,
        stream: null,
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        originalStream: null
      }));
      
      toast.info('Call rejected');
      // Don't call endCall() here as we've already cleaned up everything
    });

    // Cleanup
    return () => {
      socket.off('call_user');
      socket.off('call_accepted');
      socket.off('ice_candidate');
      socket.off('call_rejected');
      socket.off('call_ended');
    };
  }, [socket, user]); // Removed callState dependency to prevent reconnection issues

  // Function to start a call
  const startCall = async (recipientId, callType = 'video') => {
    // Track resources for cleanup in case of errors
    let localStream = null;
    let peerConnection = null;
    let currentCallType = callType;
  
    try {
      // Validate inputs
      if (!recipientId) {
        throw new Error('No recipient specified for call');
      }
      
      console.log('Starting call to:', recipientId, 'type:', callType);
    
      // Check if socket is available
      if (!socket) {
        throw new Error('Cannot start call: No connection to server');
      }
      
      // Check if user is authenticated
      if (!user || !user._id) {
        throw new Error('Cannot start call: User not authenticated');
      }
    
      // Check if WebRTC is supported
      if (!isWebRTCSupported()) {
        throw new Error('WebRTC is not supported in this browser');
      }
    
      // Get media stream with fallback options
      localStream = await getMediaStreamForCall();
      if (!localStream) {
        throw new Error('Failed to get media stream');
      }
      
      // Set local stream in state
      setMediaState(prev => ({ ...prev, stream: localStream }));
    
      // Display local video
      if (myVideo.current) {
        myVideo.current.srcObject = localStream;
      }
    
      // Create and setup WebRTC peer connection
      peerConnection = await setupOutgoingPeerConnection(localStream, recipientId);
      
      // Create an offer
      const offer = await createOffer(peerConnection);
    
      // Send the offer to the remote peer via signaling server
      await sendCallOffer(offer, recipientId, currentCallType);
      
      // Set call start time and create call record
      window.callStartTime = Date.now();
      const recipientName = findRecipientName(recipientId);
      const callRecord = createOutgoingCallRecord(recipientId, recipientName, currentCallType);
      
      // Save to call history
      saveCallToHistory(callRecord);
    
      // Update call state
      setCallState(prev => ({
        ...prev,
        callRecipient: {
          _id: recipientId,
          name: recipientName
        },
        isCallInProgress: true,
        callType: currentCallType
      }));
      
      toast.info(`Calling ${recipientName}...`);
    
    } catch (error) {
      console.error('Error in startCall:', error);
      toast.error(error.message || 'Failed to start call');
      
      // Clean up resources
      cleanupCallResources(localStream, peerConnection);
    }
    
    // Helper function to get media stream for call
    async function getMediaStreamForCall() {
      try {
        console.log('Requesting media for call type:', callType);
        const mediaResult = await getMediaWithFallback(callType);
        currentCallType = mediaResult.actualCallType; // Update call type in case of fallback
      
        console.log('Media stream obtained:', {
          id: mediaResult.stream.id,
          audioTracks: mediaResult.stream.getAudioTracks().length,
          videoTracks: mediaResult.stream.getVideoTracks().length,
          callType: currentCallType
        });
        
        return mediaResult.stream;
      } catch (mediaError) {
        console.error('Media access error in startCall:', mediaError);
        toast.error(mediaError.message || 'Failed to access camera/microphone');
        return null;
      }
    }
    
    // Helper function to setup peer connection for outgoing call
    async function setupOutgoingPeerConnection(stream, targetId) {
      // Create WebRTC peer connection
      const pc = createPeerConnection();
    
      // Save peer connection reference
      connectionRef.current = pc;
    
      // Add local stream tracks to the connection
      addTracksToConnection(pc, stream);
    
      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
      
        // Use the first stream from the event
        const remoteStream = event.streams[0];
      
        // Display remote video
        if (userVideo.current && remoteStream) {
          userVideo.current.srcObject = remoteStream;
        }
      };
    
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('Sending ICE candidate to remote peer');
          // Send the ICE candidate to the remote peer via signaling server
          socket.emit('ice_candidate', {
            to: targetId,
            candidate: event.candidate
          });
        }
      };
    
      // Connection state change
      pc.onconnectionstatechange = () => {
        if (!pc) return;
      
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          toast.success('Call connected!');
        } else if (pc.connectionState === 'failed') {
          toast.error('Call connection failed');
          endCall();
        }
      };
      
      return pc;
    }
    
    // Helper function to send call offer
    async function sendCallOffer(offer, targetId, callTypeToSend) {
      // Make sure we have a valid caller name to send
      const callerName = user.name || user.username || user.displayName || user.email || 'Unknown User';
      console.log('Sending call with caller name:', callerName);
    
      socket.emit('call_user', {
        userToCall: targetId,
        signalData: offer,
        from: user._id,
        callerName: callerName,
        callType: callTypeToSend
      });
    }
    
    // Helper function to find recipient name
    function findRecipientName(targetId) {
      let recipientName = 'User';
      if (currentChat?.participants) {
        const recipient = currentChat.participants.find(p => p._id === targetId);
        if (recipient) {
          recipientName = recipient.username || recipient.name || 'User';
        }
      }
      return recipientName;
    }
    
    // Helper function to create call record
    function createOutgoingCallRecord(targetId, targetName, callTypeRecord) {
      return {
        id: Date.now().toString(),
        userId: targetId,
        userName: targetName,
        callType: callTypeRecord,
        direction: 'outgoing',
        status: 'dialing',
        timestamp: new Date().toISOString(),
        startTime: window.callStartTime,
        duration: null
      };
    }
  };



// Function to answer an incoming call
const answerCall = async () => {
  // Define variables in the outer scope so they're accessible in the catch block
  let localStream = null;
  let peerConnection = null;
  let currentCallType = callState.callType || 'video'; // Initialize with current call type
  
  try {
    // Validate we have caller information
    if (!callState.caller || !callState.caller._id) {
      throw new Error('Missing caller information');
    }
    
    console.log('Answering call from:', callState.caller.name || 'Unknown Caller');
    
    // Stop ringtone if playing
    stopRingtone();
    
    // Check if WebRTC is supported
    if (!isWebRTCSupported()) {
      toast.error('WebRTC is not supported in this browser');
      return;
    }
    
    // Get media stream with fallback options
    const mediaResult = await getMediaStreamWithFallback();
    if (!mediaResult) {
      // This shouldn't happen due to error handling in getMediaStreamWithFallback,
      // but as an extra safeguard
      throw new Error('Failed to get media stream');
    }
    
    // Extract the stream from the result
    localStream = mediaResult;
    
    // Set call start time for duration tracking
    window.callStartTime = Date.now();
    
    // Create call record for history
    const callRecord = createCallRecord();
    
    // Set local stream in state BEFORE creating peer connection
    setMediaState(prev => ({ ...prev, stream: localStream }));
    
    // Display local video
    if (myVideo.current) {
      myVideo.current.srcObject = localStream;
    }
    
    // Create and configure WebRTC peer connection
    peerConnection = await setupPeerConnection(localStream);
    
    // Create an answer to the offer
    if (!callState.callerSignal) {
      throw new Error('No caller signal available');
    }
    
    const answer = await createAnswer(peerConnection, callState.callerSignal);
    
    // Send the answer to the caller via signaling server
    if (!socket) {
      throw new Error('No socket connection available');
    }
    
    socket.emit('call_accepted', {
      signal: answer,
      to: callState.caller._id
    });
    
    // Update call state
    setCallState(prev => ({
      ...prev,
      callAccepted: true,
      isCallInProgress: true,
      isReceivingCall: false,
      callType: currentCallType // Use the potentially updated call type (in case of fallback)
    }));
    
    // Save to call history
    saveCallToHistory(callRecord);
    
  } catch(err) {
    console.error('Error in call setup:', err);
    toast.error(err.message || 'Failed to establish call');
    
    // Clean up resources
    cleanupCallResources(localStream, peerConnection);
  }
  
  // Helper function to stop ringtone
  function stopRingtone() {
    if (window.ringtoneAudio) {
      try {
        window.ringtoneAudio.pause();
        window.ringtoneAudio.src = '';
        window.ringtoneAudio = null;
      } catch (e) {
        console.error('Error stopping ringtone:', e);
      }
    }
  }
  
  // Helper function to get media stream with fallback
  async function getMediaStreamWithFallback() {
    try {
      // Use the utility function to get media with proper error handling
      const mediaResult = await getMediaWithFallback(callState.callType);
      
      // Update the current call type based on what was actually obtained
      // This handles cases where we requested video but only got audio
      currentCallType = mediaResult.actualCallType;
      
      console.log('Media access successful:', {
        type: currentCallType,
        audioTracks: mediaResult.stream.getAudioTracks().length,
        videoTracks: mediaResult.stream.getVideoTracks().length
      });
      
      // Return the stream from the result
      return mediaResult.stream;
    } catch (mediaError) {
      console.error('Media access error in answerCall:', mediaError);
      
      // Try one more time with audio only if this was a video call
      if (callState.callType === 'video') {
        try {
          toast.warning('Camera access failed. Falling back to audio-only call.');
          
          // Attempt to get audio-only stream as a fallback
          const audioResult = await getAudioOnlyStream();
          currentCallType = 'audio';
          console.log('Audio-only fallback successful');
          return audioResult.stream;
        } catch (audioErr) {
          console.error('Audio fallback also failed:', audioErr);
          toast.error('Could not access microphone. Please check your device and permissions.');
          rejectCall();
          return null;
        }
      } else {
        toast.error(mediaError.message || 'Failed to access microphone');
        rejectCall();
        return null;
      }
    }
  }
  
  // Helper function to create call record
  function createCallRecord() {
    return {
      id: Date.now().toString(),
      userId: callState.caller._id,
      userName: callState.caller.name || 'Unknown User',
      callType: currentCallType,
      direction: 'incoming',
      status: 'answered',
      timestamp: new Date().toISOString(),
      startTime: window.callStartTime,
      duration: null
    };
  }
  
  // Helper function to setup peer connection
  async function setupPeerConnection(stream) {
    try {
      console.log('Setting up peer connection with stream:', {
        hasStream: !!stream,
        audioTracks: stream ? stream.getAudioTracks().length : 0,
        videoTracks: stream ? stream.getVideoTracks().length : 0
      });
      
      // Create WebRTC peer connection
      const pc = createPeerConnection();
      
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }
      
      // Save peer connection reference
      connectionRef.current = pc;
      
      // Add local stream tracks to the connection
      if (stream) {
        addTracksToConnection(pc, stream);
      } else {
        throw new Error('No local stream available');
      }
      
      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        
        // Use the first stream from the event
        const remoteStream = event.streams[0];
        
        // Display remote video
        if (userVideo.current && remoteStream) {
          userVideo.current.srcObject = remoteStream;
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && callState.caller?._id) {
          console.log('Sending ICE candidate to caller');
          // Send the ICE candidate to the caller via signaling server
          socket.emit('ice_candidate', {
            to: callState.caller._id,
            candidate: event.candidate
          });
        }
      };
      
      // Connection state change
      pc.onconnectionstatechange = () => {
        if (!pc) return;
        
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          toast.success('Call connected!');
        } else if (pc.connectionState === 'failed') {
          toast.error('Call connection failed');
          endCall();
        }
      };
      
      return pc;
    } catch (error) {
      console.error('Error setting up peer connection:', error);
      throw new Error(`Failed to setup peer connection: ${error.message}`);
    }
  }
  
  // Helper function to clean up resources
  function cleanupCallResources(stream, pc) {
    // Clean up media stream
    if (stream) {
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('Error stopping tracks:', e);
      }
    }
    
    // Clean up peer connection
    if (pc) {
      try {
        closePeerConnection(pc);
      } catch (e) {
        console.error('Error closing peer connection:', e);
      }
    }
    
    // Clean up connection reference
    if (connectionRef.current) {
      try {
        closePeerConnection(connectionRef.current);
        connectionRef.current = null;
      } catch (e) {
        console.error('Error closing connection ref:', e);
      }
    }
    
    // Reset video elements
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    
    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }
    
    // Reset call state
    setCallState(prev => ({
      ...prev,
      callAccepted: false,
      isCallInProgress: false,
      isReceivingCall: false
    }));
  }
};

  // Function to end an ongoing call
  const endCall = () => {
    try {
      console.log('Ending call');
      
      // Update call history with duration
      updateCallHistory();
      
      // Notify the other party that the call has ended
      notifyCallEnded();
      
      // Clean up all media resources
      cleanupMediaResources();
      
      // Reset UI elements
      resetVideoElements();
      
      // Reset state
      resetCallState();
      
      console.log('Call ended successfully');
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Error ending call');
      
      // Still attempt to clean up resources even if there was an error
      try {
        cleanupMediaResources();
        resetVideoElements();
        resetCallState();
      } catch (cleanupError) {
        console.error('Error during cleanup after failed call end:', cleanupError);
      }
    }
  };
  
  // Helper function to update call history with duration
  const updateCallHistory = () => {
    if (!window.callStartTime) return;
    
    const duration = Math.round((Date.now() - window.callStartTime) / 1000);
    console.log(`Call duration: ${duration} seconds`);
    
    // Update call history with duration if applicable
    if (callState.callRecipient || callState.caller) {
      const callerId = callState.caller?._id;
      const recipientId = callState.callRecipient?._id;
      const participantId = callerId || recipientId;
      
      if (participantId && user?._id) {
        // Use user-specific storage key
        const storageKey = `callHistory_${user._id}`;
        const existingHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Find the most recent call to this participant
        const updatedHistory = existingHistory.map((call, index) => {
          if (index === 0 && call.userId === participantId && !call.duration) {
            return { ...call, duration, status: 'completed' };
          }
          return call;
        });
        
        localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      }
    }
    
    window.callStartTime = null;
  };
  
  // Helper function to notify the other party that the call has ended
  const notifyCallEnded = () => {
    if (!socket) return;
    
    const targetId = callState.callRecipient?._id || callState.caller?._id;
    if (targetId) {
      socket.emit('callEnded', { to: targetId });
    }
  };
  
  // Helper function to clean up all media resources
  const cleanupMediaResources = () => {
    // Stop ringtone if it's still playing
    if (window.ringtoneAudio) {
      try {
        window.ringtoneAudio.pause();
        window.ringtoneAudio.src = '';
        window.ringtoneAudio = null;
      } catch (e) {
        console.error('Error stopping ringtone:', e);
      }
    }
    
    // Stop all media tracks in main stream
    if (mediaState.stream) {
      try {
        mediaState.stream.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {
        console.error('Error stopping media tracks:', e);
      }
    }
    
    // Stop all media tracks in original stream (if screen sharing was active)
    if (mediaState.originalStream) {
      try {
        mediaState.originalStream.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {
        console.error('Error stopping original media tracks:', e);
      }
    }
    
    // Close peer connection
    if (connectionRef.current) {
      try {
        closePeerConnection(connectionRef.current);
        connectionRef.current = null;
      } catch (e) {
        console.error('Error closing peer connection:', e);
      }
    }
  };
  
  // Helper function to reset video elements
  const resetVideoElements = () => {
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    
    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }
  };
  
  // Helper function to reset call and media state
  const resetCallState = () => {
    // Reset call state
    setCallState(prev => ({
      ...prev,
      callAccepted: false,
      isCallInProgress: false,
      isReceivingCall: false,
      caller: null,
      callerSignal: null,
      callRecipient: null,
      callType: null,
      isCallMinimized: false,
      callEnded: true
    }));
    
    // Reset media state
    setMediaState(prev => ({
      ...prev,
      stream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      originalStream: null
    }));
  };
  
  // Function to toggle audio
  const toggleAudio = () => {
    try {
      if (!mediaState.stream) {
        console.warn('No media stream available');
        return;
      }
      
      const audioTracks = mediaState.stream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        console.warn('No audio tracks found in stream');
        return;
      }
      
      // Toggle enabled state for all audio tracks
      const newEnabledState = !mediaState.isAudioEnabled;
      audioTracks.forEach(track => {
        track.enabled = newEnabledState;
      });
      
      // Update state
      setMediaState(prev => ({
        ...prev,
        isAudioEnabled: newEnabledState
      }));
      
      console.log(`Audio ${newEnabledState ? 'enabled' : 'muted'}`);
    } catch (error) {
      console.error('Error toggling audio:', error);
      toast.error('Failed to toggle audio');
    }
  };
  
  // Function to toggle video
  const toggleVideo = () => {
    try {
      if (!mediaState.stream) {
        console.warn('No media stream available');
        return;
      }
      
      const videoTracks = mediaState.stream.getVideoTracks();
      
      if (videoTracks.length === 0) {
        console.warn('No video tracks found in stream');
        return;
      }
      
      // Toggle enabled state for all video tracks
      const newEnabledState = !mediaState.isVideoEnabled;
      videoTracks.forEach(track => {
        track.enabled = newEnabledState;
      });
      
      // Update state
      setMediaState(prev => ({
        ...prev,
        isVideoEnabled: newEnabledState
      }));
      
      console.log(`Video ${newEnabledState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling video:', error);
      toast.error('Failed to toggle video');
    }
  };
  
  // Function to toggle screen sharing
  const toggleScreenSharing = () => {
    if (!mediaState.isScreenSharing) {
      // Start screen sharing
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          toast.error('Screen sharing is not supported in this browser');
          return;
        }
        
        // Save original stream before replacing it
        const originalStream = mediaState.stream;
        
        // Request screen sharing
        navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always'
          },
          audio: false
        }).then(screenStream => {
          console.log('Screen sharing started');
          
          // Add event listener for when user stops sharing
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              console.log('User stopped screen sharing');
              toggleScreenSharing(); // Call this function again to revert back
            };
          }
          
          // Replace video track in the peer connection
          if (connectionRef.current) {
            if (typeof connectionRef.current.replaceTrack === 'function') {
              // Use replaceTrack if available (direct simple-peer method)
              connectionRef.current.replaceTrack(
                originalStream.getVideoTracks()[0],
                videoTrack,
                screenStream
              );
            } else if (connectionRef.current._pc && typeof connectionRef.current._pc.getSenders === 'function') {
              // Get all senders from the peer connection
              const senders = connectionRef.current._pc.getSenders();
              
              // Find the sender that's sending video
              const sender = senders.find(s => s.track && s.track.kind === 'video');
              
              if (sender && typeof sender.replaceTrack === 'function') {
                sender.replaceTrack(videoTrack);
              }
            }
          }
          
          // Update state
          setMediaState(prev => ({
            ...prev,
            stream: screenStream,
            originalStream: originalStream,
            isScreenSharing: true
          }));
          
          // Update local video display
          if (myVideo.current) {
            myVideo.current.srcObject = screenStream;
          }
          
          toast.info('Screen sharing started');
        }).catch(error => {
          console.error('Error starting screen sharing:', error);
          toast.error('Failed to start screen sharing');
        });
      } catch (error) {
        console.error('Error in screen sharing setup:', error);
        toast.error('Screen sharing failed');
      }
    } else {
      try {
        // Get original video track
        const videoTrack = mediaState.originalStream.getVideoTracks()[0];
        
        if (videoTrack) {
          if (typeof connectionRef.current.replaceTrack === 'function') {
            // Use replaceTrack if available (direct simple-peer method)
            connectionRef.current.replaceTrack(
              mediaState.stream.getVideoTracks()[0],
              videoTrack,
              mediaState.originalStream
            );
          } else if (connectionRef.current._pc && typeof connectionRef.current._pc.getSenders === 'function') {
            // Get all senders from the peer connection
            const senders = connectionRef.current._pc.getSenders();
            
            // Find the sender that's sending video
            const sender = senders.find(s => s.track && s.track.kind === 'video');
            
            if (sender && typeof sender.replaceTrack === 'function') {
              sender.replaceTrack(videoTrack);
            }
          }
        }
        
        // Stop all tracks in the screen sharing stream
        mediaState.stream.getTracks().forEach(track => track.stop());
        
        // Update state
        setMediaState(prev => ({
          ...prev,
          stream: prev.originalStream,
          originalStream: null,
          isScreenSharing: false
        }));
        
        // Update local video display
        if (myVideo.current) {
          myVideo.current.srcObject = mediaState.originalStream;
        }
      } catch (error) {
        console.error('Error stopping screen sharing:', error);
        toast.error('Error stopping screen sharing');
      }
    }
  };

  // Function to toggle call minimized state
  const toggleCallMinimized = () => {
    setCallState(prev => ({
      ...prev,
      isCallMinimized: !prev.isCallMinimized
    }));
  };

  // Function to save call to history
  const saveCallToHistory = (callRecord) => {
    try {
      if (!user?._id) {
        console.error('Cannot save call history: No user ID available');
        return;
      }
      
      // Use user-specific storage key
      const storageKey = `callHistory_${user._id}`;
      
      // Get existing call history from localStorage
      const existingHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Add new call record to history
      const updatedHistory = [callRecord, ...existingHistory].slice(0, 50); // Keep last 50 calls
      
      // Save updated history back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      
      console.log('Call saved to history:', callRecord);
    } catch (error) {
      console.error('Error saving call to history:', error);
    }
  };

  // Function to reject an incoming call
  const rejectCall = () => {
    try {
      if (!callState.caller) {
        console.warn('No caller information available to reject call');
        return;
      }

      console.log('Rejecting call from:', callState.caller);
      
      // Notify the caller that the call was rejected
      if (socket) {
        socket.emit('callRejected', { to: callState.caller.userId });
      }
      
      // Stop ringtone if playing
      if (window.ringtoneAudio) {
        window.ringtoneAudio.pause();
        window.ringtoneAudio.currentTime = 0;
      }
      
      // Reset call state
      setCallState(prev => ({
        ...prev,
        isReceivingCall: false,
        caller: null,
        callSignal: null
      }));
      
      console.log('Call rejected successfully');
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Failed to reject call');
    }
  };

  const value = {
    ...callState,
    ...mediaState,
    myVideoRef: myVideo,
    userVideoRef: userVideo,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenSharing,
    toggleCallMinimized,
    saveCallToHistory
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export default CallContext;
