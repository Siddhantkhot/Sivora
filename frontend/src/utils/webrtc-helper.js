/**
 * Direct WebRTC implementation for audio/video calls
 * This avoids using simple-peer library which has compatibility issues
 */

// Default STUN/TURN servers for WebRTC connections
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

/**
 * Check if WebRTC is supported by the browser
 * @returns {boolean} True if WebRTC is supported
 */
export const isWebRTCSupported = () => {
  return Boolean(
    typeof window !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.RTCPeerConnection
  );
};

/**
 * Creates a WebRTC peer connection with event handlers
 * @param {Object} options - Configuration options
 * @returns {RTCPeerConnection} The RTCPeerConnection object
 */
export const createPeerConnection = (options = {}) => {
  const config = {
    iceServers: options.iceServers || DEFAULT_ICE_SERVERS
  };
  
  console.log('Creating RTCPeerConnection with config:', config);
  
  const pc = new RTCPeerConnection(config);
  
  // Add event logging
  pc.addEventListener('icecandidate', event => {
    console.log('ICE candidate:', event.candidate);
  });
  
  pc.addEventListener('icecandidateerror', event => {
    console.error('ICE candidate error:', event);
  });
  
  pc.addEventListener('iceconnectionstatechange', () => {
    console.log('ICE connection state:', pc.iceConnectionState);
  });
  
  pc.addEventListener('connectionstatechange', () => {
    console.log('Connection state:', pc.connectionState);
  });
  
  pc.addEventListener('signalingstatechange', () => {
    console.log('Signaling state:', pc.signalingState);
  });
  
  return pc;
};

/**
 * Create an offer for a WebRTC connection
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection
 * @returns {Promise<RTCSessionDescription>} The created offer
 */
export const createOffer = async (peerConnection) => {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

/**
 * Create an answer for a WebRTC connection
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection
 * @param {RTCSessionDescription} offer - The offer to respond to
 * @returns {Promise<RTCSessionDescription>} The created answer
 */
export const createAnswer = async (peerConnection, offer) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
};

/**
 * Add tracks from a media stream to a peer connection
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection
 * @param {MediaStream} stream - The media stream to add
 */
export const addTracksToConnection = (peerConnection, stream) => {
  if (!stream) return;
  
  stream.getTracks().forEach(track => {
    console.log('Adding track to connection:', track.kind);
    peerConnection.addTrack(track, stream);
  });
};

/**
 * Handle incoming ICE candidates
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection
 * @param {Object} candidate - The ICE candidate
 */
export const handleIceCandidate = async (peerConnection, candidate) => {
  try {
    if (candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
};

/**
 * Complete a WebRTC connection by setting the remote description
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection
 * @param {RTCSessionDescription} remoteDescription - The remote description to set
 */
export const completeConnection = async (peerConnection, remoteDescription) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDescription));
  } catch (error) {
    console.error('Error setting remote description:', error);
    throw error;
  }
};

/**
 * Close and cleanup a WebRTC connection
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection to close
 */
export const closePeerConnection = (peerConnection) => {
  if (!peerConnection) return;
  
  try {
    // Close all transceivers
    if (peerConnection.getTransceivers) {
      peerConnection.getTransceivers().forEach(transceiver => {
        if (transceiver.stop) {
          transceiver.stop();
        }
      });
    }
    
    // Close the connection
    peerConnection.close();
  } catch (error) {
    console.error('Error closing peer connection:', error);
  }
};
