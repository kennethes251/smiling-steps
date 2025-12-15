import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

const ResourceManager = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Worksheet',
    category: 'Mental Health',
    tags: '',
    difficulty: 'beginner',
    requiresAuth: false,
    accessLevel: 'client'
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching resources with token:', token ? 'Present' : 'Missing');
      console.log('API endpoint:', `${API_ENDPOINTS.RESOURCES}`);
      
      const response = await axios.get(`${API_ENDPOINTS.RESOURCES}`, {
        headers: { 'x-auth-token': token }
      });
      
      console.log('Resources response:', response.data);
      setResources(response.data.resources || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching resources:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showSnackbar(error.response?.data?.message || 'Error loading resources', 'error');
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showSnackbar('Please select a PDF file', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showSnackbar('File size must be less than 10MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showSnackbar('Please select a file', 'error');
      return;
    }

    if (!formData.title || !formData.description) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('title', formData.title);
    uploadFormData.append('description', formData.description);
    uploadFormData.append('type', formData.type);
    uploadFormData.append('category', formData.category);
    uploadFormData.append('tags', formData.tags);
    uploadFormData.append('difficulty', formData.difficulty);
    uploadFormData.append('requiresAuth', formData.requiresAuth);
    uploadFormData.append('accessLevel', formData.accessLevel);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_ENDPOINTS.RESOURCES}/upload`, uploadFormData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      showSnackbar('Resource uploaded successfully', 'success');
      setUploadDialog(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      showSnackbar(error.response?.data?.message || 'Error uploading resource', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    setUploading(true);
    const updateFormData = new FormData();
    
    if (selectedFile) {
      updateFormData.append('file', selectedFile);
    }
    updateFormData.append('title', formData.title);
    updateFormData.append('description', formData.description);
    updateFormData.append('type', formData.type);
    updateFormData.append('category', formData.category);
    updateFormData.append('tags', formData.tags);
    updateFormData.append('difficulty', formData.difficulty);
    updateFormData.append('requiresAuth', formData.requiresAuth);
    updateFormData.append('accessLevel', formData.accessLevel);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_ENDPOINTS.RESOURCES}/${selectedResource._id}`, updateFormData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      showSnackbar('Resource updated successfully', 'success');
      setEditDialog(false);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error('Error updating resource:', error);
      showSnackbar(error.response?.data?.message || 'Error updating resource', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_ENDPOINTS.RESOURCES}/${selectedResource._id}`, {
        headers: { 'x-auth-token': token }
      });
      showSnackbar('Resource deleted successfully', 'success');
      setDeleteDialog(false);
      setSelectedResource(null);
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      showSnackbar('Error deleting resource', 'error');
    }
  };

  const openEditDialog = (resource) => {
    setSelectedResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      tags: resource.tags?.join(', ') || '',
      difficulty: resource.difficulty || 'beginner',
      requiresAuth: resource.requiresAuth || false,
      accessLevel: resource.accessLevel || 'client'
    });
    setEditDialog(true);
  };

  const openDeleteDialog = (resource) => {
    setSelectedResource(resource);
    setDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'guide',
      category: 'Mental Health',
      tags: '',
      difficulty: 'beginner',
      requiresAuth: false,
      accessLevel: 'client'
    });
    setSelectedFile(null);
    setSelectedResource(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const ResourceForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Button
          variant="outlined"
          component="label"
          fullWidth
          startIcon={<UploadIcon />}
        >
          {selectedFile ? selectedFile.name : 'Select PDF File'}
          <input
            type="file"
            hidden
            accept="application/pdf"
            onChange={handleFileSelect}
          />
        </Button>
        {selectedFile && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Size: {formatFileSize(selectedFile.size)}
          </Typography>
        )}
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          multiline
          rows={3}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            value={formData.type}
            label="Type"
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <MenuItem value="Worksheet">Worksheet</MenuItem>
            <MenuItem value="Guide">Guide</MenuItem>
            <MenuItem value="Video">Video</MenuItem>
            <MenuItem value="Audio">Audio</MenuItem>
            <MenuItem value="Assessment">Assessment</MenuItem>
            <MenuItem value="Article">Article</MenuItem>
            <MenuItem value="Tool">Tool</MenuItem>
            <MenuItem value="Template">Template</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            label="Category"
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <MenuItem value="Mental Health">Mental Health</MenuItem>
            <MenuItem value="Anxiety">Anxiety</MenuItem>
            <MenuItem value="Depression">Depression</MenuItem>
            <MenuItem value="Stress Management">Stress Management</MenuItem>
            <MenuItem value="Self-Care">Self-Care</MenuItem>
            <MenuItem value="Relationships">Relationships</MenuItem>
            <MenuItem value="Recovery Guide">Recovery Guide</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Difficulty</InputLabel>
          <Select
            value={formData.difficulty}
            label="Difficulty"
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
          >
            <MenuItem value="beginner">Beginner</MenuItem>
            <MenuItem value="intermediate">Intermediate</MenuItem>
            <MenuItem value="advanced">Advanced</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Access Level</InputLabel>
          <Select
            value={formData.accessLevel}
            label="Access Level"
            onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
          >
            <MenuItem value="client">Client</MenuItem>
            <MenuItem value="psychologist">Psychologist</MenuItem>
            <MenuItem value="both">Both</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Tags (comma-separated)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="anxiety, coping, mindfulness"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.requiresAuth}
              onChange={(e) => setFormData({ ...formData, requiresAuth: e.target.checked })}
            />
          }
          label="Requires Authentication"
        />
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Resource Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialog(true)}
        >
          Upload Resource
        </Button>
      </Box>

      {/* Resources Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Downloads</TableCell>
              <TableCell>Views</TableCell>
              <TableCell>Auth Required</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No resources uploaded yet</Typography>
                </TableCell>
              </TableRow>
            ) : (
              resources.map((resource) => (
                <TableRow key={resource._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {resource.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={resource.type} size="small" />
                  </TableCell>
                  <TableCell>{resource.category}</TableCell>
                  <TableCell>
                    {resource.fileName ? (
                      <Box>
                        <Typography variant="caption" display="block">
                          {resource.fileName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatFileSize(resource.fileSize)}
                        </Typography>
                      </Box>
                    ) : resource.url ? (
                      <Chip label="External URL" size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        No file
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{resource.downloads || 0}</TableCell>
                  <TableCell>{resource.views || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={resource.requiresAuth ? 'Yes' : 'No'}
                      size="small"
                      color={resource.requiresAuth ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => window.open(`${API_ENDPOINTS.RESOURCES}/${resource._id}/view`, '_blank')}
                      title="View"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(resource)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog(resource)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload New Resource</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <ResourceForm />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !selectedFile}
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => !uploading && setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Resource</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload a new file to replace the existing one, or leave empty to keep the current file.
            </Alert>
            <ResourceForm />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <EditIcon />}
          >
            {uploading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Resource</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedResource?.title}"? This will permanently remove the file from the server.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ResourceManager;
