import { useState, useEffect } from 'react';
import { Container, Typography, Grid, Box, CircularProgress, Alert, Chip } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import BlogCard from '../components/BlogCard';

const BlogListPage = () => {
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
    'Research & Studies'
  ];

  useEffect(() => {
    fetchBlogs();
  }, []);

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <ArticleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Our Blog
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Insights, tips, and stories about mental health and wellness
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
  );
};

export default BlogListPage;
