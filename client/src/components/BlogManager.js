import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Typography,
  Paper,
  Alert
} from '@mui/material';
import {
  Article as ArticleIcon,
  Save as SaveIcon,
  Publish as PublishIcon
} from '@mui/icons-material';

const BlogManager = ({ onSave, initialData = null }) => {
  const [blogData, setBlogData] = useState(initialData || {
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [],
    published: false,
    featuredImage: '',
    metaTitle: '',
    metaDescription: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const categories = [
    'Mental Health',
    'Addiction Recovery',
    'Therapy Tips',
    'Self-Care',
    'Relationships',
    'Wellness',
    'Success Stories',
    'Research & Studies'
  ];

  const handleChange = (field, value) => {
    setBlogData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !blogData.tags.includes(tagInput.trim())) {
      setBlogData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setBlogData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (publish = false) => {
    try {
      const dataToSave = {
        ...blogData,
        published: publish
      };

      await onSave(dataToSave);
      
      setMessage({
        type: 'success',
        text: publish ? 'Blog published successfully!' : 'Blog saved as draft!'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save blog'
      });
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArticleIcon /> {initialData ? 'Edit Blog Post' : 'Create New Blog Post'}
        </Typography>
      </Box>

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Title */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Blog Title"
            value={blogData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            helperText={`${blogData.title.length}/200 characters`}
            inputProps={{ maxLength: 200 }}
          />
        </Grid>

        {/* Category */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={blogData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              label="Category"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Featured Image URL */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Featured Image URL"
            value={blogData.featuredImage}
            onChange={(e) => handleChange('featuredImage', e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </Grid>

        {/* Excerpt */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Excerpt (Brief Summary)"
            value={blogData.excerpt}
            onChange={(e) => handleChange('excerpt', e.target.value)}
            helperText={`${blogData.excerpt.length}/500 characters - This appears in blog previews`}
            inputProps={{ maxLength: 500 }}
          />
        </Grid>

        {/* Content */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={15}
            label="Blog Content"
            value={blogData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            required
            helperText="Supports Markdown formatting"
          />
        </Grid>

        {/* Tags */}
        <Grid item xs={12}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Tags</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                label="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {blogData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Grid>

        {/* SEO Meta Title */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Meta Title (SEO)"
            value={blogData.metaTitle}
            onChange={(e) => handleChange('metaTitle', e.target.value)}
            helperText={`${blogData.metaTitle.length}/60 characters`}
            inputProps={{ maxLength: 60 }}
          />
        </Grid>

        {/* SEO Meta Description */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Meta Description (SEO)"
            value={blogData.metaDescription}
            onChange={(e) => handleChange('metaDescription', e.target.value)}
            helperText={`${blogData.metaDescription.length}/160 characters`}
            inputProps={{ maxLength: 160 }}
          />
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => handleSubmit(false)}
            >
              Save as Draft
            </Button>
            <Button
              variant="contained"
              startIcon={<PublishIcon />}
              onClick={() => handleSubmit(true)}
            >
              Publish Now
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BlogManager;
