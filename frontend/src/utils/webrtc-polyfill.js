// Polyfills for WebRTC and simple-peer
import { Buffer } from 'buffer';

// Add Buffer to window
window.Buffer = Buffer;

// Add process.nextTick polyfill
if (typeof window !== 'undefined' && !window.process) {
  window.process = {};
}

if (typeof window !== 'undefined' && !window.process.nextTick) {
  window.process.nextTick = function(callback) {
    setTimeout(callback, 0);
  };
}

// Add process.env polyfill
if (typeof window !== 'undefined' && !window.process.env) {
  window.process.env = {};
}

// Add global polyfill
if (typeof window !== 'undefined' && !window.global) {
  window.global = window;
}

export default {};
