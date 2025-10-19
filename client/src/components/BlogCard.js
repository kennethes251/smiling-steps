import { Card, CardContent, CardMedia, CardActions, Typography, Chip, Box, Button } from '@mui/material';
import { AccessTime as TimeIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const BlogCard = ({ blog }) => {
  const navigate = useNavigate();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 6 } }}>
      {blog.featuredImage && (
        <CardMedia
          component="img"
          height="200"
          image={blog.featuredImage}
          alt={blog.title}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={blog.category} size="small" color="primary" />
          <Chip
            icon={<TimeIcon />}
            label={`${blog.readTime} min read`}
            size="small"
            variant="outlined"
          />
          {blog.views > 0 && (
            <Chip
              icon={<ViewIcon />}
              label={`${blog.views} views`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
          {blog.title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {blog.excerpt}
        </Typography>

        {blog.tags && blog.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {blog.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          onClick={() => navigate(`/blogs/${blog.slug}`)}
          sx={{ ml: 'auto' }}
        >
          Read More →
        </Button>
      </CardActions>
    </Card>
  );
};

export default BlogCard;
