import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import BlogManager from '../components/BlogManager';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const BlogManagementPage = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.get(`${API_ENDPOINTS.ADMIN}/blogs`, config);
      setBlogs(response.data.blogs || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setMessage({ type: 'error', text: 'Failed to load blogs' });
      setLoading(false);
    }
  };

  const handleSaveBlog = async (blogData) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      if (editingBlog) {
        await axios.put(`${API_ENDPOINTS.ADMIN}/blogs/${editingBlog.id}`, blogData, config);
        setMessage({ type: 'success', text: 'Blog updated successfully!' });
      } else {
        await axios.post(`${API_ENDPOINTS.ADMIN}/blogs`, blogData, config);
        setMessage({ type: 'success', text: 'Blog created successfully!' });
      }

      setShowForm(false);
      setEditingBlog(null);
      fetchBlogs();
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to save blog');
    }
  };

  const handleDelete = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.delete(`${API_ENDPOINTS.ADMIN}/blogs/${blogId}`, config);
      setMessage({ type: 'success', text: 'Blog deleted successfully!' });
      fetchBlogs();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete blog' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (showForm) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button onClick={() => { setShowForm(false); setEditingBlog(null); }} sx={{ mb: 2 }}>
          ← Back to Blogs
        </Button>
        <BlogManager onSave={handleSaveBlog} initialData={editingBlog} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Blog Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(true)}
        >
          Create New Blog
        </Button>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {blogs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No blogs yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first blog post to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowForm(true)}
            >
              Create First Blog
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {blogs.map((blog) => (
            <Grid item xs={12} md={6} lg={4} key={blog.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {blog.featuredImage && (
                  <Box
                    component="img"
                    src={blog.featuredImage}
                    alt={blog.title}
                    sx={{ width: '100%', height: 200, objectFit: 'cover' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" gap={1} mb={1}>
                    <Chip label={blog.category} size="small" color="primary" />
                    <Chip
                      label={blog.published ? 'Published' : 'Draft'}
                      size="small"
                      color={blog.published ? 'success' : 'default'}
                    />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {blog.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {blog.excerpt}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {blog.readTime} min read • {blog.views} views
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<ViewIcon />}>
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setEditingBlog(blog);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(blog.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default BlogManagementPage;
