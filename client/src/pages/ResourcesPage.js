import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [selectedCategory, searchQuery, resources]);

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/resources/public/list`);
      setResources(response.data.resources || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.resources.map(r => r.category))];
      setCategories(uniqueCategories);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources');
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = resources;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredResources(filtered);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Guide':
        return <DescriptionIcon />;
      case 'Worksheet':
        return <AssignmentIcon />;
      case 'Tool':
        return <BuildIcon />;
      case 'Article':
        return <ArticleIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Guide':
        return 'primary';
      case 'Worksheet':
        return 'secondary';
      case 'Tool':
        return 'success';
      case 'Article':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleDownload = async (resource) => {
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { 'x-auth-token': token } } : {};
      
      // Download the file
      const response = await axios.get(
        `${API_ENDPOINTS.BASE_URL}/api/resources/${resource._id}/download`,
        {
          ...config,
          responseType: 'blob'
        }
      );
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resource.fileName || `${resource.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading resource:', err);
      if (err.response?.status === 401) {
        alert('Please log in to download this resource');
      } else {
        alert('Error downloading resource. Please try again.');
      }
    }
  };

  const handleView = (resource) => {
    const token = localStorage.getItem('token');
    const url = `${API_ENDPOINTS.BASE_URL}/api/resources/${resource._id}/view`;
    
    if (token) {
      // Open in new tab with auth token in URL (not ideal but works for viewing)
      window.open(url, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Recovery Resources
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Free guides, worksheets, and tools to support your mental health and recovery journey
        </Typography>
      </Box>

      {/* Search Bar */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Category Tabs */}
      <Box mb={4}>
        <Tabs
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Resources" value="all" />
          {categories.map(category => (
            <Tab key={category} label={category} value={category} />
          ))}
        </Tabs>
      </Box>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <Alert severity="info">
          No resources found. Try adjusting your search or category filter.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredResources.map((resource) => (
            <Grid item xs={12} md={6} key={resource._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Type Badge */}
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Chip
                      icon={getTypeIcon(resource.type)}
                      label={resource.type}
                      color={getTypeColor(resource.type)}
                      size="small"
                    />
                    {resource.downloadable && (
                      <Chip
                        icon={<DownloadIcon />}
                        label="Downloadable"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {/* Title */}
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {resource.title}
                  </Typography>

                  {/* Description */}
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {resource.description}
                  </Typography>

                  {/* Tags */}
                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={2}>
                    {resource.tags.slice(0, 4).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>

                  {/* Stats */}
                  <Box display="flex" gap={2} mt={2} flexWrap="wrap">
                    <Typography variant="caption" color="textSecondary">
                      {resource.views || 0} views
                    </Typography>
                    {resource.downloadable && (
                      <Typography variant="caption" color="textSecondary">
                        {resource.downloads || 0} downloads
                      </Typography>
                    )}
                    {resource.fileSize && (
                      <Typography variant="caption" color="textSecondary">
                        {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  {resource.filePath ? (
                    <>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleView(resource)}
                      >
                        View PDF
                      </Button>
                      {resource.downloadable && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(resource)}
                        >
                          Download
                        </Button>
                      )}
                    </>
                  ) : resource.url && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ViewIcon />}
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      View Resource
                    </Button>
                  )}
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Info Box */}
      <Box mt={6}>
        <Alert severity="info">
          <Typography variant="body2">
            All resources are free and designed to support your mental health journey. 
            If you need immediate help, please contact the crisis helpline at 1199 (Kenya Red Cross) 
            or 0722 178 177 (Befrienders Kenya).
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
};

export default ResourcesPage;
