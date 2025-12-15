import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Typography, Grid, Box, CircularProgress, Alert, Chip, Button } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import BlogCard from '../components/BlogCard';
import Logo from '../components/Logo';

const BlogListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'all',
    'Mental Health',
    'Addiction Recovery',
    'Therapy Tips',
    'Self-Care',
    'Relationships',
    'Wellness',
    'Success Stories',
    'Research & Studies',
    'Recovery Guide',
    'Community Education',
    'Support Tool'
  ];

  useEffect(() => {
    // Check if there's a category in the URL
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
    fetchBlogs();
  }, [searchParams]);

  const fetchBlogs = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/public/blogs`);
      setBlogs(response.data.blogs || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setLoading(false);
    }
  };

  const filteredBlogs = selectedCategory === 'all'
    ? blogs
    : blogs.filter(blog => blog.category === selectedCategory);

  if (loading) {
    return (
      <>
        {/* Navigation Menu */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: '#663399', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/')}
              >
                <Logo size={32} />
                Smiling Steps
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button color="inherit" onClick={() => navigate('/')}>
                  Home
                </Button>
                <Button color="inherit" onClick={() => navigate('/learn-more')}>
                  About
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    borderRadius: '25px',
                    px: 3,
                    background: 'linear-gradient(45deg, #1976D2, #42A5F5)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565C0, #1976D2)'
                    }
                  }}
                >
                  Book Session
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" sx={{ pt: 10 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <Box>
      {/* Navigation Menu */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#663399', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                cursor: 'pointer'
              }}
              onClick={() => navigate('/')}
            >
              <Logo size={32} />
              Smiling Steps
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button color="inherit" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button color="inherit" onClick={() => navigate('/learn-more')}>
                About
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{
                  borderRadius: '25px',
                  px: 3,
                  background: 'linear-gradient(45deg, #1976D2, #42A5F5)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1565C0, #1976D2)'
                  }
                }}
              >
                Book Session
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 12, mb: 8 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <ArticleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            {selectedCategory === 'Recovery Guide' ? 'Recovery Guides' :
             selectedCategory === 'Community Education' ? 'Community Education' :
             selectedCategory === 'Support Tool' ? 'Support Tools' :
             'Blog & Articles'}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {selectedCategory === 'Recovery Guide' ? 'Downloadable guides and resources to support your recovery journey' :
             selectedCategory === 'Community Education' ? 'Educational materials and workshops for communities and families' :
             selectedCategory === 'Support Tool' ? 'Digital tools and resources to support your mental health' :
             'Insights, tips, and stories about mental health and wellness'}
          </Typography>
        </Box>

      {/* Category Filter */}
      <Box sx={{ mb: 4, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat === 'all' ? 'All Posts' : cat}
            onClick={() => setSelectedCategory(cat)}
            color={selectedCategory === cat ? 'primary' : 'default'}
            variant={selectedCategory === cat ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* Blog Grid */}
      {filteredBlogs.length === 0 ? (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          No blog posts available yet. Check back soon!
        </Alert>
      ) : (
        <Grid container spacing={4}>
          {filteredBlogs.map((blog) => (
            <Grid item xs={12} sm={6} md={4} key={blog.id}>
              <BlogCard blog={blog} />
            </Grid>
          ))}
        </Grid>
      )}
      </Container>
    </Box>
  );
};

export default BlogListPage;
