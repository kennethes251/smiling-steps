import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  Button,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import {
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  VideoCall as VideoCallIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Assignment as AssignmentIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';

const MessagesHub = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      // Fetch conversations, notifications, and sessions
      const [conversationsRes, sessionsRes] = await Promise.all([
        axios.get(`${API_ENDPOINTS.BASE_URL}/api/chat/conversations`, config).catch(() => ({ data: [] })),
        axios.get(`${API_ENDPOINTS.SESSIONS}`, config).catch(() => ({ data: [] }))
      ]);

      setConversations(conversationsRes.data || []);
      setUpcomingSessions(sessionsRes.data?.filter(s => s.status === 'Booked') || []);
      
      // Mock notifications for now
      setNotifications([
        {
          id: 1,
          type: 'session_reminder',
          title: 'Session Reminder',
          message: 'Your session with Dr. Smith is in 1 hour',
          time: new Date(),
          read: false
        },
        {
          id: 2,
          type: 'message',
          title: 'New Message',
          message: 'You have a new message from your therapist',
          time: new Date(Date.now() - 3600000),
          read: true
        }
      ]);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const QuickActions = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={() => navigate('/chat')}
              sx={{ py: 1.5 }}
            >
              New Chat
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => navigate('/bookings')}
              sx={{ py: 1.5 }}
            >
              Book Session
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<VideoCallIcon />}
              sx={{ py: 1.5 }}
            >
              Video Call
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AssignmentIcon />}
              onClick={() => navigate('/assessments')}
              sx={{ py: 1.5 }}
            >
              Assessments
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const ConversationsList = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Recent Conversations
      </Typography>
      {conversations.length > 0 ? (
        <List>
          {conversations.map((conversation, index) => (
            <ListItem
              key={conversation._id || index}
              button
              onClick={() => navigate(`/chat/${conversation._id}`)}
              sx={{
                borderRadius: 1,
                mb: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ListItemAvatar>
                <Badge badgeContent={2} color="primary">
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PsychologyIcon />
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary="Dr. Smith"
                secondary="How are you feeling today? Let's discuss..."
                secondaryTypographyProps={{
                  noWrap: true,
                  sx: { maxWidth: 200 }
                }}
              />
              <Typography variant="caption" color="text.secondary">
                2h ago
              </Typography>
            </ListItem>
          ))}
        </List>
      ) : (
        <Alert severity="info">
          No conversations yet. Start by booking a session or sending a message.
        </Alert>
      )}
    </Paper>
  );

  const NotificationsList = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Notifications
      </Typography>
      <List>
        {notifications.map((notification) => (
          <ListItem key={notification.id} sx={{ borderRadius: 1, mb: 1 }}>
            <ListItemAvatar>
              <Avatar sx={{ 
                bgcolor: notification.read ? 'grey.300' : 'primary.main',
                width: 40,
                height: 40
              }}>
                {notification.type === 'session_reminder' ? <ScheduleIcon /> : <ChatIcon />}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={notification.title}
              secondary={notification.message}
            />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                {notification.time.toLocaleTimeString()}
              </Typography>
              {!notification.read && (
                <Chip size="small" label="New" color="primary" sx={{ ml: 1 }} />
              )}
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const UpcomingSessions = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Upcoming Sessions
      </Typography>
      {upcomingSessions.length > 0 ? (
        <List>
          {upcomingSessions.map((session) => (
            <ListItem key={session._id} sx={{ borderRadius: 1, mb: 1, bgcolor: 'action.hover' }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <ScheduleIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${session.sessionType} Session`}
                secondary={`${new Date(session.sessionDate).toLocaleDateString()} at ${new Date(session.sessionDate).toLocaleTimeString()}`}
              />
              <Box>
                <IconButton color="primary" size="small">
                  <VideoCallIcon />
                </IconButton>
                <IconButton color="primary" size="small">
                  <ChatIcon />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      ) : (
        <Alert severity="info">
          No upcoming sessions. Book a session to get started.
        </Alert>
      )}
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Messages & Communication Hub
      </Typography>
      
      <QuickActions />

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<ChatIcon />} label="Conversations" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<ScheduleIcon />} label="Sessions" />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {activeTab === 0 && <ConversationsList />}
          {activeTab === 1 && <NotificationsList />}
          {activeTab === 2 && <UpcomingSessions />}
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Contact Support
            </Typography>
            <Button
              fullWidth
              variant="contained"
              startIcon={<EmailIcon />}
              sx={{ mb: 1 }}
            >
              Email Support
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PhoneIcon />}
            >
              Call Support
            </Button>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resources
            </Typography>
            <List dense>
              <ListItem button>
                <ListItemText primary="Crisis Support" />
              </ListItem>
              <ListItem button>
                <ListItemText primary="Self-Help Resources" />
              </ListItem>
              <ListItem button>
                <ListItemText primary="FAQ" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MessagesHub;