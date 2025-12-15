// WebRTC Configuration
module.exports = {
  iceServers: [
    // Free public STUN servers (for development and testing)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Self-hosted TURN server (production - configure when ready)
    // Uncomment and configure when you setup Coturn
    /*
    {
      urls: `turn:${process.env.TURN_SERVER_IP}:3478`,
      username: process.env.TURN_USERNAME || 'smilinguser',
      credential: process.env.TURN_PASSWORD || 'smilingpass123'
    },
    {
      urls: `turns:${process.env.TURN_SERVER_IP}:5349`,
      username: process.env.TURN_USERNAME || 'smilinguser',
      credential: process.env.TURN_PASSWORD || 'smilingpass123'
    }
    */
  ],
  
  // Additional WebRTC configuration
  sdpSemantics: 'unified-plan',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all' // Use 'relay' to force TURN for testing
};
