/**
 * Simple-peer wrapper for WebRTC in browser environments
 * This implementation is specifically designed to work with Vite and modern browsers
 */

// Direct import of simple-peer
import Peer from 'simple-peer';

// Required for simple-peer to work in browser environment
import { Buffer } from 'buffer';
window.Buffer = Buffer;

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
 * Default STUN/TURN servers for WebRTC connections
 */
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
 * Creates a new WebRTC peer connection
 * @param {Object} options - Options for the peer connection
 * @returns {Object} The peer connection object
 */
export const createPeer = (options = {}) => {
  // Check WebRTC support
  if (!isWebRTCSupported()) {
    throw new Error('WebRTC is not supported in this browser');
  }
  
  try {
    // Prepare peer options with defaults
    const peerOptions = {
      initiator: options.initiator || false,
      trickle: options.trickle !== undefined ? options.trickle : true,
      stream: options.stream || null,
      config: {
        iceServers: DEFAULT_ICE_SERVERS
      }
    };
    
    // Use custom ICE servers if provided
    if (options.config?.iceServers?.length) {
      peerOptions.config.iceServers = options.config.iceServers;
    }
    
    // Log peer creation (without the stream for cleaner logs)
    console.log('Creating WebRTC peer:', {
      ...peerOptions,
      stream: options.stream ? `MediaStream with ${options.stream.getTracks().length} tracks` : null
    });
    
    // Create the peer instance
    const peer = new Peer(peerOptions);
    
    return peer;
  } catch (error) {
    console.error('Failed to create peer connection:', error);
    throw error;
  }
};

// Export the Peer constructor for direct usage if needed
export default Peer;
