# Video Call Feature - Requirements

## Overview
Implement production-ready WebRTC-based video calling functionality for the Smiling Steps teletherapy platform, enabling secure 1-on-1 video sessions between clients and psychologists.

## Business Goals
- Enable remote therapy sessions via video calls
- Provide HIPAA-equivalent secure communication
- Reduce no-show rates with easy-to-access video calls
- Improve user experience with professional video interface
- Support zero-cost deployment using free/open-source tools

## User Stories

### US-1: Client Joins Video Call
**As a** client  
**I want to** join a video call with my psychologist  
**So that** I can attend my therapy session remotely

**Acceptance Criteria:**
- AC-1.1: Client can see "Join Call" button on confirmed sessions
- AC-1.2: Button is enabled 15 minutes before scheduled time
- AC-1.3: Button is disabled if payment is not confirmed
- AC-1.4: Client can access video call up to 2 hours after scheduled time
- AC-1.5: Client sees clear error messages if unable to join

### US-2: Psychologist Joins Video Call
**As a** psychologist  
**I want to** join a video call with my client  
**So that** I can conduct therapy sessions remotely

**Acceptance Criteria:**
- AC-2.1: Psychologist can see "Join Call" button on confirmed sessions
- AC-2.2: Button is enabled 15 minutes before scheduled time
- AC-2.3: Psychologist can access video call up to 2 hours after scheduled time
- AC-2.4: Psychologist sees participant information before joining

### US-3: Video Call Controls
**As a** session participant  
**I want to** control my video and audio during the call  
**So that** I can manage my privacy and communication

**Acceptance Criteria:**
- AC-3.1: User can toggle video on/off
- AC-3.2: User can mute/unmute microphone
- AC-3.3: User can see their own video feed (picture-in-picture)
- AC-3.4: User can see remote participant's video feed (main view)
- AC-3.5: User can see call duration timer
- AC-3.6: User can end the call at any time

### US-4: Screen Sharing
**As a** session participant  
**I want to** share my screen during the call  
**So that** I can show documents or resources

**Acceptance Criteria:**
- AC-4.1: User can start screen sharing
- AC-4.2: User can stop screen sharing
- AC-4.3: Other participant sees shared screen
- AC-4.4: User can switch back to camera after screen share

### US-5: Connection Status
**As a** session participant  
**I want to** see the connection status  
**So that** I know if the call is working properly

**Acceptance Criteria:**
- AC-5.1: User sees "Connecting..." when initializing
- AC-5.2: User sees "Waiting for participant..." when alone
- AC-5.3: User sees "Connected" indicator when call is active
- AC-5.4: User sees "Disconnected" if participant leaves
- AC-5.5: User sees error messages for connection failures

### US-6: Call Duration Tracking
**As a** psychologist  
**I want** call duration to be automatically tracked  
**So that** I can bill accurately and maintain records

**Acceptance Criteria:**
- AC-6.1: System records call start time
- AC-6.2: System records call end time
- AC-6.3: System calculates duration in minutes
- AC-6.4: Duration is saved to session record
- AC-6.5: Duration is visible in session history

## Functional Requirements

### FR-1: Authentication & Authorization
- FR-1.1: Only authenticated users can access video calls
- FR-1.2: Only session participants (client, psychologist, admin) can join
- FR-1.3: Payment must be confirmed before joining
- FR-1.4: Session must not be cancelled or declined

### FR-2: WebRTC Implementation
- FR-2.1: Use peer-to-peer WebRTC connections
- FR-2.2: Support STUN servers for NAT traversal
- FR-2.3: Support TURN servers for relay (production)
- FR-2.4: Use Socket.io for signaling
- FR-2.5: Support ICE candidate exchange

### FR-3: Media Handling
- FR-3.1: Request camera and microphone permissions
- FR-3.2: Support 720p video quality (ideal)
- FR-3.3: Support audio with echo cancellation
- FR-3.4: Support screen sharing via getDisplayMedia
- FR-3.5: Handle media track replacement for screen share

### FR-4: Session Management
- FR-4.1: Generate unique room ID for each session
- FR-4.2: Store room ID in session record
- FR-4.3: Update session status to "In Progress" on call start
- FR-4.4: Update session status to "Completed" on call end
- FR-4.5: Clean up resources on disconnect

### FR-5: Error Handling
- FR-5.1: Handle camera/microphone permission denied
- FR-5.2: Handle WebRTC connection failures
- FR-5.3: Handle Socket.io disconnections
- FR-5.4: Handle network errors
- FR-5.5: Display user-friendly error messages

## Non-Functional Requirements

### NFR-1: Performance
- Video latency < 500ms
- Audio latency < 200ms
- Connection establishment < 5 seconds
- Support 720p video at 24-30 fps

### NFR-2: Security
- End-to-end encryption (DTLS-SRTP)
- Secure WebSocket connections (WSS)
- JWT authentication for API calls
- No video/audio recording without consent
- Session data encrypted in database

### NFR-3: Reliability
- Automatic reconnection on brief disconnects
- Graceful degradation on poor network
- 99% uptime for signaling server
- Handle concurrent sessions (100+)

### NFR-4: Usability
- Intuitive UI with clear controls
- Responsive design (desktop/tablet)
- Accessible controls (keyboard navigation)
- Clear status indicators
- Professional appearance

### NFR-5: Compatibility
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (macOS/iOS latest 2 versions)
- HTTPS required in production
- WebRTC-capable browsers only

## Technical Constraints

### TC-1: Zero-Cost Deployment
- Use free STUN servers (Google)
- Self-host TURN server (Oracle Cloud free tier)
- No paid WebRTC services (Twilio, Daily.co, etc.)
- Use open-source libraries only

### TC-2: Technology Stack
- Backend: Node.js, Express, Socket.io
- Frontend: React, Material-UI, simple-peer
- Database: MongoDB (existing)
- Signaling: Socket.io WebSockets

### TC-3: Existing System Integration
- Integrate with existing auth system (JWT)
- Use existing Session model
- Use existing payment validation
- Use existing user roles (client, psychologist, admin)

## Out of Scope (Future Enhancements)

- Group video calls (3+ participants)
- Call recording functionality
- In-call text chat
- Virtual backgrounds
- Network quality indicators
- Bandwidth adaptation
- Mobile app support
- Call analytics dashboard
- Waiting room feature
- Post-call feedback/rating

## Success Metrics

- 95%+ successful call connections
- < 5% call drop rate
- < 3 seconds average connection time
- 90%+ user satisfaction rating
- Zero security incidents
- 100% payment validation before calls

## Dependencies

- Existing authentication system
- Existing session booking system
- Existing payment system (M-Pesa)
- MongoDB database
- Socket.io server
- STUN/TURN servers

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| NAT traversal failures | High | Medium | Deploy TURN server |
| Browser compatibility | Medium | Low | Test on all major browsers |
| Network quality issues | High | Medium | Implement quality indicators |
| Security vulnerabilities | High | Low | Use HTTPS, encrypt data |
| Scalability limits | Medium | Low | Monitor concurrent connections |

## Compliance Requirements

- HIPAA-equivalent data protection
- End-to-end encryption for media
- Secure storage of session metadata
- No unauthorized recording
- Data retention policies (6 months)
- Audit logging for access

## Timeline

- Phase 1: Backend API & Signaling (Week 1) ✅ COMPLETE
- Phase 2: Frontend Component (Week 2) ✅ COMPLETE
- Phase 3: Dashboard Integration (Week 2)
- Phase 4: Testing & QA (Week 3)
- Phase 5: Production Deployment (Week 4)

## Approval

**Product Owner:** _________________  
**Technical Lead:** _________________  
**Date:** December 11, 2025
