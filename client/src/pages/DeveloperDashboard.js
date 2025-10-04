import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Alert,
  Divider,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Article as ArticleIcon,
  LibraryBooks as ResourcesIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Psychology as PsychologyIcon,
  AdminPanelSettings as AdminIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const DeveloperDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [psychologists, setPsychologists] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [resources, setResources] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPsychologists: 0,
    totalSessions: 0,
    totalBlogs: 0
  });

  // Dialog states
  const [openPsychDialog, setOpenPsychDialog] = useState(false);
  const [openBlogDialog, setOpenBlogDialog] = useState(false);
  const [openResourceDialog, setOpenResourceDialog] = useState(false);

  // Form states
  const [psychForm, setPsychForm] = useState({
    name: '',
    email: '',
    password: '',
    specializations: [],
    experience: '',
    education: '',
    bio: ''
  });

  const [blogForm, setBlogForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: [],
    published: false
  });

  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    type: '',
    url: '',
    category: '',
    downloadable: false
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const specializationOptions = [
    'Addiction Counseling',
    'Anxiety Disorders',
    'Depression',
    'PTSD',
    'Relationship Issues',
    'Eating Disorders',
    'Grief Counseling',
    'Child Psychology',
    'Adolescent Therapy',
    'Cognitive Behavioral Therapy',
    'Family Therapy',
    'Group Therapy'
  ];

  const blogCategories = [
    'Mental Health',
    'Addiction Recovery',
    'Therapy Tips',
    'Self-Care',
    'Relationships',
    'Wellness',
    'Success Stories',
    'Research & Studies'
  ];

  const resourceTypes = [
    'Worksheet',
    'Guide',
    'Video',
    'Audio',
    'Assessment',
    'Article',
    'Tool',
    'Template'
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      // Fetch real-time statistics
      const [statsRes, psychologistsRes, blogsRes, resourcesRes] = await Promise.all([
        axios.get(`${API_ENDPOINTS.ADMIN}/stats`, config),
        axios.get(`${API_ENDPOINTS.ADMIN}/psychologists`, config),
        axios.get(`${API_ENDPOINTS.ADMIN}/blogs`, config),
        axios.get(`${API_ENDPOINTS.ADMIN}/resources`, config)
      ]);

      setStats(statsRes.data);
      setPsychologists(psychologistsRes.data);
      setBlogs(blogsRes.data.blogs || blogsRes.data);
      setResources(resourcesRes.data.resources || resourcesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setMessage({ type: 'error', text: 'Error loading dashboard data' });
    }
  };

  const handleCreatePsychologist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.post(`${API_ENDPOINTS.ADMIN}/psychologists`, psychForm, config);
      setMessage({ type: 'success', text: 'Psychologist created successfully!' });
      setOpenPsychDialog(false);
      setPsychForm({
        name: '',
        email: '',
        password: '',
        specializations: [],
        experience: '',
        education: '',
        bio: ''
      });
      fetchDashboardData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating psychologist: ' + error.message });
    }
    setLoading(false);
  };

  const handleCreateBlog = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await axios.post(`${API_ENDPOINTS.ADMIN}/blogs`, blogForm, config);
      setMessage({ type: 'success', text: 'Blog post created successfully!' });
      setOpenBlogDialog(false);
      setBlogForm({
        title: '',
        content: '',
        excerpt: '',
        category: '',
        tags: [],
        published: false
      });
      fetchDashboardData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating blog: ' + error.message });
    }
    setLoading(false);
  };

  const handleCreateResource = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await axios.post(`${API_ENDPOINTS.ADMIN}/resources`, resourceForm, config);
      setMessage({ type: 'success', text: 'Resource created successfully!' });
      setOpenResourceDialog(false);
      setResourceForm({
        title: '',
        description: '',
        type: '',
        url: '',
        category: '',
        downloadable: false
      });
      fetchDashboardData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating resource: ' + error.message });
    }
    setLoading(false);
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: color }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          <Box sx={{ color: color, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
          🛠️ Developer Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage your Smiling Steps platform
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            color="#663399"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Psychologists"
            value={stats.totalPsychologists}
            icon={<PsychologyIcon sx={{ fontSize: 40 }} />}
            color="#9C27B0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Sessions"
            value={stats.totalSessions}
            icon={<AnalyticsIcon sx={{ fontSize: 40 }} />}
            color="#2E7D32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Blog Posts"
            value={stats.totalBlogs}
            icon={<ArticleIcon sx={{ fontSize: 40 }} />}
            color="#F57C00"
          />
        </Grid>
      </Grid>

      {/* Message Alert */}
      {message.text && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DashboardIcon />} label="Overview" />
          <Tab icon={<PsychologyIcon />} label="Psychologists" />
          <Tab icon={<ArticleIcon />} label="Blog Management" />
          <Tab icon={<ResourcesIcon />} label="Resources" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" />
          <Tab icon={<SettingsIcon />} label="Settings" />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h5" gutterBottom>Platform Overview</Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => setOpenPsychDialog(true)}
                          fullWidth
                        >
                          Add New Psychologist
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<ArticleIcon />}
                          onClick={() => setOpenBlogDialog(true)}
                          fullWidth
                        >
                          Create Blog Post
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<ResourcesIcon />}
                          onClick={() => setOpenResourceDialog(true)}
                          fullWidth
                        >
                          Add Resource
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                      <List>
                        <ListItem>
                          <ListItemText 
                            primary="New user registration" 
                            secondary="2 hours ago"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Session completed" 
                            secondary="4 hours ago"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Blog post published" 
                            secondary="1 day ago"
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Psychologists Tab */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Psychologist Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenPsychDialog(true)}
                >
                  Add Psychologist
                </Button>
              </Box>
              
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Active Psychologists</Typography>
                  <List>
                    {/* Sample psychologist data - replace with real data */}
                    <ListItem>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <PsychologyIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary="Dr. Sarah Johnson"
                        secondary="Addiction Counseling, Anxiety Disorders"
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end">
                          <EditIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <PsychologyIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary="Dr. Michael Chen"
                        secondary="Depression, PTSD, Family Therapy"
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end">
                          <EditIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Blog Management Tab */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Blog Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenBlogDialog(true)}
                >
                  Create Blog Post
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                {/* Sample blog posts */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Understanding Addiction Recovery
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        A comprehensive guide to the stages of addiction recovery...
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip label="Addiction Recovery" size="small" />
                        <Chip label="Published" color="success" size="small" />
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button size="small" startIcon={<ViewIcon />}>View</Button>
                      <Button size="small" startIcon={<EditIcon />}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />}>Delete</Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Coping Strategies for Anxiety
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Practical techniques for managing anxiety in daily life...
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip label="Mental Health" size="small" />
                        <Chip label="Draft" color="warning" size="small" />
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button size="small" startIcon={<ViewIcon />}>View</Button>
                      <Button size="small" startIcon={<EditIcon />}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />}>Delete</Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Resources Tab */}
          {activeTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Resource Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenResourceDialog(true)}
                >
                  Add Resource
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                {/* Sample resources */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Anxiety Assessment Worksheet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Self-assessment tool for anxiety levels
                      </Typography>
                      <Chip label="Worksheet" size="small" sx={{ mr: 1 }} />
                      <Chip label="Downloadable" color="primary" size="small" />
                    </CardContent>
                    <CardActions>
                      <Button size="small">Download</Button>
                      <Button size="small" startIcon={<EditIcon />}>Edit</Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Meditation Guide Video
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        10-minute guided meditation for beginners
                      </Typography>
                      <Chip label="Video" size="small" sx={{ mr: 1 }} />
                      <Chip label="Streaming" color="secondary" size="small" />
                    </CardContent>
                    <CardActions>
                      <Button size="small">Watch</Button>
                      <Button size="small" startIcon={<EditIcon />}>Edit</Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Analytics Tab */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h5" gutterBottom>Platform Analytics</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>User Growth</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Analytics dashboard coming soon...
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Session Statistics</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Session analytics coming soon...
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Settings Tab */}
          {activeTab === 5 && (
            <Box>
              <Typography variant="h5" gutterBottom>Platform Settings</Typography>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>General Settings</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Allow new user registrations"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Enable email notifications"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Maintenance mode"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Psychologist Creation Dialog */}
      <Dialog open={openPsychDialog} onClose={() => setOpenPsychDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Psychologist</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={psychForm.name}
                onChange={(e) => setPsychForm({ ...psychForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={psychForm.email}
                onChange={(e) => setPsychForm({ ...psychForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={psychForm.password}
                onChange={(e) => setPsychForm({ ...psychForm, password: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Specializations</InputLabel>
                <Select
                  multiple
                  value={psychForm.specializations}
                  onChange={(e) => setPsychForm({ ...psychForm, specializations: e.target.value })}
                  input={<OutlinedInput label="Specializations" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {specializationOptions.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Years of Experience"
                value={psychForm.experience}
                onChange={(e) => setPsychForm({ ...psychForm, experience: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Education"
                value={psychForm.education}
                onChange={(e) => setPsychForm({ ...psychForm, education: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Bio"
                value={psychForm.bio}
                onChange={(e) => setPsychForm({ ...psychForm, bio: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPsychDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePsychologist} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Psychologist'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Blog Creation Dialog */}
      <Dialog open={openBlogDialog} onClose={() => setOpenBlogDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create Blog Post</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Blog Title"
                value={blogForm.title}
                onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={blogForm.category}
                  onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                  label="Category"
                >
                  {blogCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={blogForm.published}
                    onChange={(e) => setBlogForm({ ...blogForm, published: e.target.checked })}
                  />
                }
                label="Publish immediately"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Excerpt"
                value={blogForm.excerpt}
                onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                helperText="Brief description for blog preview"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={10}
                label="Content"
                value={blogForm.content}
                onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                helperText="Full blog content (Markdown supported)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBlogDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateBlog} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create Blog Post'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resource Creation Dialog */}
      <Dialog open={openResourceDialog} onClose={() => setOpenResourceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Resource</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resource Title"
                value={resourceForm.title}
                onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                  label="Type"
                >
                  {resourceTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                value={resourceForm.category}
                onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL or File Path"
                value={resourceForm.url}
                onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                helperText="Link to resource or file upload path"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={resourceForm.description}
                onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={resourceForm.downloadable}
                    onChange={(e) => setResourceForm({ ...resourceForm, downloadable: e.target.checked })}
                  />
                }
                label="Downloadable resource"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResourceDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateResource} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Add Resource'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DeveloperDashboard;