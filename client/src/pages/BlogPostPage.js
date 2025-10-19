import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';
import { ArrowBack, AccessTime, Visibility } from '@mui/icons-material';
import SocialShare from '../components/SocialShare';
import Logo from '../components/Logo';
import API_BASE_URL from '../config/api';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/blogs/${slug}`);
      const data = await response.json();
      if (data.success) {
        setBlog(data.blog);
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', pt: 10 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (!blog) {
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
        <Container sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>Blog post not found</Typography>
          <Button onClick={() => navigate('/blog')} startIcon={<ArrowBack />}>
            Back to Blog
          </Button>
        </Container>
      </>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
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

      <Container maxWidth="md" sx={{ pt: 12, pb: 8 }}>
        <Button
          onClick={() => navigate('/blog')}
          startIcon={<ArrowBack />}
          sx={{ mb: 3 }}
        >
          Back to Blog
        </Button>

        {blog.featuredImage && (
          <Box
            component="img"
            src={blog.featuredImage}
            alt={blog.title}
            sx={{
              width: '100%',
              height: 400,
              objectFit: 'cover',
              borderRadius: 2,
              mb: 4
            }}
          />
        )}

        <Chip
          label={blog.category}
          sx={{
            mb: 2,
            backgroundColor: '#663399',
            color: 'white',
            fontWeight: 600
          }}
        />

        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
          {blog.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: '#663399' }}>
            {blog.author?.name?.charAt(0) || 'A'}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {blog.author?.name || 'Admin'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {new Date(blog.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 16 }} />
                <Typography variant="caption">{blog.readTime} min read</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility sx={{ fontSize: 16 }} />
                <Typography variant="caption">{blog.views} views</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Typography
          variant="body1"
          sx={{
            lineHeight: 1.8,
            fontSize: '1.1rem',
            mb: 4,
            '& p': { mb: 2 },
            '& h2': { mt: 4, mb: 2, fontWeight: 'bold' },
            '& h3': { mt: 3, mb: 2, fontWeight: 'bold' },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& li': { mb: 1 }
          }}
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {blog.tags && blog.tags.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Tags:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {blog.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Share this article
          </Typography>
          <SocialShare
            url={window.location.href}
            title={blog.title}
            description={blog.excerpt}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default BlogPostPage;
