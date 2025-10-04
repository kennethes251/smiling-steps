import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { 
  Box, 
  Container, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Avatar, 
  Divider, 
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Chip,
  AppBar,
  Toolbar
} from '@mui/material';
import { 
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  VideoCall as VideoCallIcon,
  Phone as PhoneIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

const ChatPage = () => {
  const { assessmentId } = useParams();
  const { user } = useContext(AuthContext);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [psychologist, setPsychologist] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeConversation = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        
        // Find or create a conversation
        const res = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/chat/conversations`, { assessmentResultId: assessmentId }, config);
        setConversation(res.data);
        
        // Fetch messages for this conversation
        const messagesRes = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/chat/conversations/${res.data._id}/messages`, config);
        setMessages(messagesRes.data);

        // Fetch psychologist details
        const psychologistId = user.role === 'client' ? res.data.psychologist : res.data.client;
        const psychologistRes = await axios.get(`${API_ENDPOINTS.USERS}/${psychologistId}`, config);
        setPsychologist(psychologistRes.data);

      } catch (error) {
        console.error('Failed to initialize conversation', error);
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
  }, [assessmentId, user]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !conversation) return;

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/chat/conversations/${conversation._id}/messages`, { text: newMessage }, config);
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 5 }} />;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={3} sx={{ height: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
        {/* Enhanced Header */}
        <AppBar position="static" sx={{ borderRadius: '12px 12px 0 0', bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => window.history.back()}>
              <ArrowBackIcon />
            </IconButton>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
              {psychologist?.name?.charAt(0) || 'P'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Dr. {psychologist?.name || 'Psychologist'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Online • Responds within minutes
              </Typography>
            </Box>
            <IconButton color="inherit">
              <VideoCallIcon />
            </IconButton>
            <IconButton color="inherit">
              <PhoneIcon />
            </IconButton>
            <IconButton color="inherit">
              <MoreVertIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Box sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          p: 2, 
          bgcolor: '#f5f5f5',
          backgroundImage: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Start your conversation with Dr. {psychologist?.name}
              </Typography>
              <Chip label="Messages are encrypted" size="small" sx={{ mt: 1 }} />
            </Box>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.sender._id === user._id;
              const showAvatar = index === 0 || messages[index - 1].sender._id !== msg.sender._id;
              
              return (
                <Box
                  key={msg._id}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 1,
                    alignItems: 'flex-end'
                  }}
                >
                  {!isOwnMessage && showAvatar && (
                    <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                      {psychologist?.name?.charAt(0) || 'P'}
                    </Avatar>
                  )}
                  {!isOwnMessage && !showAvatar && (
                    <Box sx={{ width: 32, mr: 1 }} />
                  )}
                  
                  <Card
                    sx={{
                      maxWidth: '70%',
                      bgcolor: isOwnMessage ? 'primary.main' : 'white',
                      color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                      borderRadius: isOwnMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: 1,
                      '&:hover': { boxShadow: 2 }
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                        {msg.text}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block', 
                          textAlign: 'right', 
                          mt: 0.5,
                          opacity: 0.7
                        }}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Enhanced Input Area */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'white',
          borderTop: '1px solid #e0e0e0',
          borderRadius: '0 0 12px 12px'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              variant="outlined"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  bgcolor: '#f5f5f5'
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { bgcolor: 'grey.300' }
              }}
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
