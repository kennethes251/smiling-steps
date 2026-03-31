import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import {
  Box, Container, TextField, Paper, Typography, Avatar,
  CircularProgress, Card, CardContent, IconButton, Chip,
  AppBar, Toolbar, Button
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  VideoCall as VideoCallIcon,
  MoreVert as MoreVertIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

const BASE_URL = API_ENDPOINTS.BASE_URL;

const ChatPage = () => {
  const { recipientId } = useParams();
  const { user } = useContext(AuthContext);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherParty, setOtherParty] = useState(null);
  const [error, setError] = useState(null);
  const [typingInfo, setTypingInfo] = useState(null); // { userName }
  const [isOtherOnline, setIsOtherOnline] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const conversationIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Initialize conversation then connect socket
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };

        // Find or create conversation
        const convRes = await axios.post(
          `${BASE_URL}/api/chat/conversations`,
          { targetUserId: recipientId },
          config
        );
        const conv = convRes.data;
        setConversation(conv);
        conversationIdRef.current = conv._id;

        // Determine other party
        let other = null;
        if (conv.participants?.length) {
          other = conv.participants.find((p) => p._id !== user.id && p._id !== user._id);
        } else {
          other = user.role === 'client' ? conv.psychologist : conv.client;
        }
        setOtherParty(other);

        // Load message history
        const msgRes = await axios.get(
          `${BASE_URL}/api/chat/conversations/${conv._id}/messages`,
          config
        );
        setMessages(msgRes.data);

        // Mark as read
        await axios.put(`${BASE_URL}/api/chat/conversations/${conv._id}/read`, {}, config);

        // Connect socket
        connectSocket(token, conv._id);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId, user]);

  const connectSocket = useCallback((token, conversationId) => {
    const socket = io(`${BASE_URL}/direct-messages`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('dm:join', { conversationId });
    });

    socket.on('dm:message', ({ message }) => {
      setMessages((prev) => {
        // Avoid duplicates (REST fallback may have already added it)
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    socket.on('dm:typing', ({ userId, userName, isTyping }) => {
      if (userId === user?.id || userId === user?._id) return;
      setTypingInfo(isTyping ? { userName } : null);
    });

    socket.on('dm:read', () => {
      // Could show "seen" indicator here
    });

    socket.on('dm:error', ({ error: errMsg }) => {
      console.error('DM socket error:', errMsg);
    });

    socketRef.current = socket;
  }, [user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    const text = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    if (socketRef.current) {
      socketRef.current.emit('dm:typing:stop', { conversationId: conversation._id });
    }

    // Send via socket (primary)
    if (socketRef.current?.connected) {
      socketRef.current.emit('dm:send', { conversationId: conversation._id, text });
    } else {
      // REST fallback
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(
          `${BASE_URL}/api/chat/conversations/${conversation._id}/messages`,
          { text },
          { headers: { 'x-auth-token': token } }
        );
        setMessages((prev) => [...prev, res.data]);
      } catch (err) {
        console.error('Failed to send message', err);
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socketRef.current || !conversation) return;

    socketRef.current.emit('dm:typing:start', { conversationId: conversation._id });

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('dm:typing:stop', { conversationId: conversation._id });
    }, 2000);
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 5 }} />;

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" variant="h6">{error}</Typography>
          <Button onClick={() => window.history.back()} sx={{ mt: 2 }}>Go Back</Button>
        </Paper>
      </Container>
    );
  }

  const displayName = otherParty?.role === 'psychologist'
    ? `Dr. ${otherParty?.name || 'Therapist'}`
    : otherParty?.name || 'User';

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={3} sx={{ height: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>

        {/* Header */}
        <AppBar position="static" sx={{ borderRadius: '12px 12px 0 0', bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => window.history.back()}>
              <ArrowBackIcon />
            </IconButton>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
              {otherParty?.name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{displayName}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircleIcon sx={{ fontSize: 10, color: isOtherOnline ? '#4caf50' : '#bdbdbd' }} />
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {typingInfo ? `${typingInfo.userName} is typing...` : isOtherOnline ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>
            <IconButton color="inherit"><VideoCallIcon /></IconButton>
            <IconButton color="inherit"><MoreVertIcon /></IconButton>
          </Toolbar>
        </AppBar>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Start your conversation with {displayName}
              </Typography>
              <Chip label="Messages are private" size="small" sx={{ mt: 1 }} />
            </Box>
          ) : (
            messages.map((msg, index) => {
              const senderId = msg.sender?._id || msg.sender;
              const isOwn = senderId === user?.id || senderId === user?._id;
              const showAvatar = index === 0 ||
                (messages[index - 1].sender?._id || messages[index - 1].sender) !== senderId;

              return (
                <Box
                  key={msg._id}
                  sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', mb: 1, alignItems: 'flex-end' }}
                >
                  {!isOwn && showAvatar && (
                    <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                      {otherParty?.name?.charAt(0) || 'U'}
                    </Avatar>
                  )}
                  {!isOwn && !showAvatar && <Box sx={{ width: 32, mr: 1 }} />}

                  <Card sx={{
                    maxWidth: '70%',
                    bgcolor: isOwn ? 'primary.main' : 'white',
                    color: isOwn ? 'primary.contrastText' : 'text.primary',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    boxShadow: 1,
                  }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, opacity: 0.7 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isOwn && msg.isRead && ' ✓✓'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e0e0e0', borderRadius: '0 0 12px 12px' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              variant="outlined"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', bgcolor: '#f5f5f5' } }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'grey.300' } }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatPage;
