# Implementation Plan: Chat Room Feature

## Overview

This implementation plan breaks down the Chat Room feature into discrete coding tasks. The approach prioritizes core functionality first (models, services, routes), followed by real-time features (Socket.io), and finally UI components.

## Tasks

- [x] 1. Create database models
  - [x] 1.1 Create ChatRoom model with participants, moderators, settings, and scheduled sessions
    - Define schema with all fields from design document
    - Add indexes for efficient queries
    - _Requirements: 1.1, 1.2, 1.3, 5.2_

  - [x] 1.2 Create RoomMessage model with mentions and read receipts
    - Define schema with sender, content, mentions, readBy
    - Add compound indexes for room + timestamp queries
    - Add text index for search functionality
    - _Requirements: 3.2, 7.2_

  - [x] 1.3 Create ModerationLog model for audit trail
    - Define schema with moderator, target, action, reason
    - _Requirements: 4.6_

- [x] 2. Implement ChatRoomService
  - [x] 2.1 Implement room creation with owner assignment
    - Create room with validated data
    - Set creator as owner and first participant
    - Generate unique room ID
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ]* 2.2 Write property tests for room creation
    - **Property 1: Room Creation Sets Owner Correctly**
    - **Property 2: Room Creation Requires All Fields**
    - **Property 3: Room IDs Are Unique**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.3 Implement room listing and discovery
    - List public/community rooms for clients
    - Filter by room type, search by name
    - Include participant count
    - _Requirements: 2.1, 2.6_

  - [ ]* 2.4 Write property test for room visibility
    - **Property 5: Public Room Visibility**
    - **Validates: Requirements 2.1**

  - [x] 2.5 Implement join/leave room functionality
    - Add participant to room on join
    - Remove participant on leave
    - Check participant limits
    - Check ban status
    - _Requirements: 2.2, 2.3, 2.5, 6.1_

  - [ ]* 2.6 Write property tests for participant management
    - **Property 6: Participant Limit Enforcement**
    - **Property 7: Ban Prevents Rejoin**
    - **Property 20: Leave Removes From Participant List**
    - **Validates: Requirements 2.3, 2.5, 6.1**

  - [x] 2.7 Implement room settings update
    - Allow owner to update settings
    - Validate participant limit bounds (1-100)
    - Toggle joinable and visibility
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.8 Write property tests for settings
    - **Property 15: Settings Updates Apply Immediately**
    - **Property 16: Participant Limit Bounds**
    - **Property 17: Joinable Toggle Works**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 3. Checkpoint - Ensure room management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement ModerationService
  - [x] 4.1 Implement mute/unmute functionality
    - Mute participant for specified duration
    - Unmute participant
    - Check mute status before allowing messages
    - _Requirements: 4.1, 4.2_

  - [ ]* 4.2 Write property tests for mute functionality
    - **Property 10: Mute Prevents Messaging**
    - **Property 11: Mute/Unmute Round Trip**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 4.3 Implement kick and ban functionality
    - Remove participant from room (kick)
    - Add to banned list (ban)
    - Prevent banned users from rejoining
    - _Requirements: 4.3, 4.4_

  - [ ]* 4.4 Write property tests for kick/ban
    - **Property 12: Kick Removes Participant**
    - **Property 7: Ban Prevents Rejoin** (if not already covered)
    - **Validates: Requirements 4.3, 4.4**

  - [x] 4.5 Implement moderator assignment
    - Allow owner to assign/remove moderators
    - Verify moderator permissions for actions
    - _Requirements: 5.5_

  - [ ]* 4.6 Write property test for moderator permissions
    - **Property 18: Moderator Can Moderate**
    - **Validates: Requirements 5.5**

  - [x] 4.7 Implement moderation logging
    - Log all moderation actions
    - Include moderator, target, action, reason, timestamp
    - _Requirements: 4.6_

  - [ ]* 4.8 Write property test for moderation logging
    - **Property 14: Moderation Actions Are Logged**
    - **Validates: Requirements 4.6**

- [ ] 5. Checkpoint - Ensure moderation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement RoomMessageService
  - [x] 6.1 Implement message sending with validation
    - Validate sender is participant
    - Check mute status
    - Parse mentions (@username)
    - Store message with timestamp
    - _Requirements: 3.1, 3.2, 4.1_

  - [ ]* 6.2 Write property test for message fields
    - **Property 8: Message Contains Required Fields**
    - **Validates: Requirements 3.2**

  - [x] 6.3 Implement message retrieval with pagination
    - Get messages for room with cursor-based pagination
    - Return in chronological order
    - Support before/after cursors
    - _Requirements: 3.5, 3.6, 7.1_

  - [ ]* 6.4 Write property tests for message retrieval
    - **Property 9: Messages Are Chronologically Ordered**
    - **Property 22: Message Pagination Works**
    - **Validates: Requirements 3.6, 7.1**

  - [x] 6.5 Implement message deletion
    - Mark message as deleted
    - Record who deleted and when
    - Hide from subsequent retrievals
    - _Requirements: 4.5_

  - [ ]* 6.6 Write property test for message deletion
    - **Property 13: Message Deletion Hides Content**
    - **Validates: Requirements 4.5**

  - [x] 6.7 Implement message search
    - Search messages by content
    - Return with context and timestamp
    - Respect room membership
    - _Requirements: 7.2, 7.3_

  - [ ]* 6.8 Write property test for search
    - **Property 23: Search Returns Matching Messages**
    - **Validates: Requirements 7.2**

  - [x] 6.9 Implement unread count tracking
    - Track last read timestamp per participant
    - Calculate unread count
    - _Requirements: 6.5_

  - [ ]* 6.10 Write property test for unread counts
    - **Property 21: Unread Count Accuracy**
    - **Validates: Requirements 6.5**

- [ ] 7. Checkpoint - Ensure messaging tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement API routes
  - [x] 8.1 Create chat room routes with authentication
    - POST /api/chat-rooms (create)
    - GET /api/chat-rooms (list)
    - GET /api/chat-rooms/:id (get details)
    - PUT /api/chat-rooms/:id (update)
    - DELETE /api/chat-rooms/:id (delete/archive)
    - _Requirements: 1.1, 2.1, 5.1_

  - [x] 8.2 Create participant management routes
    - POST /api/chat-rooms/:id/join
    - POST /api/chat-rooms/:id/leave
    - GET /api/chat-rooms/:id/participants
    - _Requirements: 2.2, 6.1, 6.3_

  - [x] 8.3 Create messaging routes
    - GET /api/chat-rooms/:id/messages
    - POST /api/chat-rooms/:id/messages
    - DELETE /api/chat-rooms/:id/messages/:messageId
    - GET /api/chat-rooms/:id/messages/search
    - _Requirements: 3.1, 4.5, 7.2_

  - [x] 8.4 Create moderation routes
    - POST /api/chat-rooms/:id/mute/:userId
    - POST /api/chat-rooms/:id/unmute/:userId
    - POST /api/chat-rooms/:id/kick/:userId
    - POST /api/chat-rooms/:id/ban/:userId
    - GET /api/chat-rooms/:id/moderation-logs
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [ ]* 8.5 Write property tests for authorization
    - **Property 25: Authentication Required**
    - **Property 26: Permission Validation**
    - **Property 27: Non-Participant Cannot View Messages**
    - **Validates: Requirements 9.1, 9.2, 9.4**

- [x] 9. Implement rate limiting
  - [x] 9.1 Add rate limiting middleware for messages
    - Limit to 10 messages per minute per user
    - Return 429 when exceeded
    - _Requirements: 9.6_

  - [ ]* 9.2 Write property test for rate limiting
    - **Property 28: Rate Limiting Enforced**
    - **Validates: Requirements 9.6**

- [ ] 10. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 11. Implement Socket.io real-time features
  - [x] 11.1 Set up Socket.io room management
    - Join socket room on room join
    - Leave socket room on room leave
    - Handle reconnection
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 11.2 Implement real-time message broadcasting
    - Broadcast new messages to room participants
    - Emit typing indicators
    - Emit participant join/leave events
    - _Requirements: 3.1, 2.4, 6.2, 6.4_

  - [ ] 11.3 Implement real-time moderation events
    - Emit mute/kick/ban events
    - Emit message deletion events
    - Emit room settings update events
    - _Requirements: 4.1, 4.3, 4.5, 5.1_

- [ ] 12. Implement scheduled sessions
  - [ ] 12.1 Create session scheduling functionality
    - Schedule sessions with start/end times
    - Store session data in room
    - _Requirements: 10.1, 10.4_

  - [ ]* 12.2 Write property test for session creation
    - **Property 29: Scheduled Session Creates Event**
    - **Validates: Requirements 10.1**

  - [ ] 12.3 Implement session start/end logic
    - Mark session as active on start
    - Optionally lock room on end
    - _Requirements: 10.2, 10.3_

  - [ ]* 12.4 Write property test for session state
    - **Property 30: Session Start Changes Room State**
    - **Validates: Requirements 10.2**

- [ ] 13. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Create React components
  - [ ] 14.1 Create ChatRoomList component
    - Display available rooms
    - Show room name, description, participant count
    - Filter by room type
    - _Requirements: 2.1, 2.6_

  - [ ] 14.2 Create ChatRoom component
    - Display room header with info
    - Show participant list
    - Handle join/leave actions
    - _Requirements: 2.2, 6.1, 6.3_

  - [ ] 14.3 Create ChatMessages component
    - Display messages with sender and timestamp
    - Auto-scroll to new messages
    - Load older messages on scroll
    - _Requirements: 3.1, 3.2, 3.6, 7.1_

  - [ ] 14.4 Create ChatInput component
    - Text input with send button
    - Typing indicator emission
    - Mention autocomplete (@username)
    - _Requirements: 3.1, 6.4, 8.2_

  - [ ] 14.5 Create ModerationPanel component
    - Mute/kick/ban controls for moderators
    - View moderation logs
    - _Requirements: 4.1, 4.3, 4.4, 4.6_

  - [ ] 14.6 Create RoomSettings component
    - Edit room settings for owners
    - Manage moderators
    - _Requirements: 5.1, 5.5_

- [ ] 15. Integrate with existing navigation
  - [ ] 15.1 Add chat rooms to navigation
    - Add "Chat Rooms" link to header/sidebar
    - Add routes to App.js
    - _Requirements: 2.1_

  - [ ] 15.2 Add unread indicators
    - Show unread count badges
    - Update on new messages
    - _Requirements: 6.5_

- [ ] 16. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify real-time messaging works
  - Test moderation workflow end-to-end

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Socket.io integration should be tested manually for real-time behavior
