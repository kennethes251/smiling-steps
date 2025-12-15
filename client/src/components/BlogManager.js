import { useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
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
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Article as ArticleIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  CloudUpload as UploadIcon,
  Description as TemplateIcon
} from '@mui/icons-material';

const CONTENT_TEMPLATES = {
  'Mental Health': {
    title: 'Understanding [Mental Health Topic]',
    excerpt: 'Learn about [topic], its symptoms, causes, and effective coping strategies for better mental wellness.',
    content: `# Understanding [Mental Health Topic]

## Introduction
Brief introduction to the mental health topic and why it matters...

## What is [Topic]?
Clear definition and explanation...

## Common Signs and Symptoms
- Symptom 1
- Symptom 2
- Symptom 3

## Causes and Risk Factors
Discuss what contributes to this condition...

## Impact on Daily Life
How this affects work, relationships, and well-being...

## Coping Strategies
### Professional Help
- Therapy options
- Medication considerations
- Support groups

### Self-Care Practices
- Daily habits
- Mindfulness techniques
- Lifestyle changes

## When to Seek Help
Warning signs that professional help is needed...

## Resources and Support
Links to helpful resources, hotlines, and support services...

## Conclusion
Encouraging message about recovery and hope...`,
    tags: ['mental health', 'wellness', 'self-care']
  },
  'Addiction Recovery': {
    title: 'Recovery Journey: [Addiction Type]',
    excerpt: 'A comprehensive guide to understanding addiction, the recovery process, and building a sustainable path to sobriety.',
    content: `# Recovery Journey: [Addiction Type]

## Understanding Addiction
What addiction is and how it affects the brain and body...

## The Recovery Process
### Early Recovery (0-90 days)
- Detoxification
- Withdrawal management
- Initial therapy

### Ongoing Recovery (3-12 months)
- Building new habits
- Addressing underlying issues
- Developing coping skills

### Long-term Recovery (1+ years)
- Maintaining sobriety
- Personal growth
- Giving back

## Treatment Options
- Inpatient rehabilitation
- Outpatient programs
- 12-step programs
- Alternative therapies

## Building Your Support System
- Family involvement
- Peer support groups
- Sponsorship
- Professional counseling

## Relapse Prevention
### Triggers to Watch For
- Emotional triggers
- Environmental triggers
- Social triggers

### Prevention Strategies
- Coping mechanisms
- Emergency plans
- Support network activation

## Life After Addiction
Rebuilding relationships, career, and self-esteem...

## Resources
- Hotlines
- Support groups
- Treatment centers
- Online communities`,
    tags: ['addiction', 'recovery', 'sobriety', 'support']
  },
  'Recovery Guide': {
    title: '[Comprehensive Recovery Guide Title]',
    excerpt: 'A detailed, step-by-step guide to help you navigate your recovery journey with practical tools, strategies, and support resources.',
    content: `# [Recovery Guide Title]

## Welcome to Your Recovery Journey
Personal, encouraging introduction to the guide...

## Part 1: Understanding Your Journey
### What to Expect
Realistic overview of the recovery process...

### Setting Realistic Goals
- Short-term goals (1-3 months)
- Medium-term goals (3-12 months)
- Long-term goals (1+ years)

## Part 2: Building Your Foundation
### Physical Health
- Nutrition guidelines
- Exercise recommendations
- Sleep hygiene
- Medical care

### Mental Health
- Therapy options
- Medication management
- Stress reduction
- Emotional regulation

### Social Support
- Family relationships
- Peer support
- Community resources
- Professional help

## Part 3: Daily Recovery Practices
### Morning Routine
Step-by-step morning practices...

### Throughout the Day
- Mindfulness check-ins
- Healthy coping strategies
- Trigger management

### Evening Routine
Reflection and preparation for tomorrow...

## Part 4: Overcoming Challenges
### Common Obstacles
- Cravings
- Emotional difficulties
- Relationship issues
- Financial stress

### Problem-Solving Strategies
Practical solutions for each challenge...

## Part 5: Measuring Progress
### Recovery Milestones
- Week 1
- Month 1
- Month 3
- Month 6
- Year 1

### Tracking Tools
- Journals
- Apps
- Check-ins
- Assessments

## Part 6: Long-Term Success
### Maintaining Recovery
Strategies for lifelong wellness...

### Personal Growth
- Education
- Career development
- Hobbies and interests
- Giving back

## Resources and Tools
### Emergency Contacts
- Crisis hotlines
- Support groups
- Treatment centers

### Downloadable Resources
- Worksheets
- Trackers
- Guides
- Templates

## Conclusion
Inspiring message about hope and possibility...`,
    tags: ['recovery guide', 'comprehensive', 'step-by-step', 'resources']
  },
  'Community Education': {
    title: 'Community Guide: [Educational Topic]',
    excerpt: 'Educational resource designed to inform and empower our community about [topic] with evidence-based information and practical guidance.',
    content: `# Community Guide: [Educational Topic]

## Why This Matters to Our Community
Explain the relevance and importance...

## Understanding the Basics
### Key Concepts
Clear, accessible explanations...

### Common Misconceptions
Debunking myths with facts...

## Impact on Our Community
### Statistics and Data
Relevant local or national statistics...

### Real Stories
Anonymous community member experiences...

## What You Can Do
### For Yourself
- Self-assessment tools
- Personal action steps
- Resources for help

### For Your Family
- Family discussions
- Supporting loved ones
- Creating safe spaces

### For Your Community
- Advocacy opportunities
- Volunteer options
- Spreading awareness

## Educational Resources
### For Different Audiences
- Youth resources
- Adult resources
- Senior resources
- Professional resources

### Learning Formats
- Videos
- Podcasts
- Workshops
- Reading materials

## Getting Involved
### Local Programs
List of community programs...

### Support Services
Available support in the community...

### Events and Workshops
Upcoming educational opportunities...

## Frequently Asked Questions
Common questions with clear answers...

## Additional Resources
- Websites
- Books
- Organizations
- Hotlines

## Take Action Today
Clear call-to-action with next steps...`,
    tags: ['education', 'community', 'awareness', 'resources']
  },
  'Support Tool': {
    title: '[Tool Name]: Your Guide to [Purpose]',
    excerpt: 'A practical tool designed to help you [achieve specific goal] with step-by-step instructions and helpful resources.',
    content: `# [Tool Name]: Your Guide to [Purpose]

## What This Tool Does
Clear explanation of the tool's purpose and benefits...

## Who This Tool Is For
- Target audience 1
- Target audience 2
- Target audience 3

## How to Use This Tool
### Step 1: [First Step]
Detailed instructions...

### Step 2: [Second Step]
Detailed instructions...

### Step 3: [Third Step]
Detailed instructions...

## Features and Components
### Main Features
- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

### How Each Feature Helps
Practical examples of use...

## Getting Started
### What You'll Need
- Requirement 1
- Requirement 2
- Requirement 3

### Initial Setup
Step-by-step setup instructions...

## Practical Examples
### Example 1: [Scenario]
How to use the tool in this situation...

### Example 2: [Scenario]
How to use the tool in this situation...

### Example 3: [Scenario]
How to use the tool in this situation...

## Tips for Success
- Tip 1
- Tip 2
- Tip 3
- Tip 4

## Troubleshooting
### Common Issues
- Issue 1: Solution
- Issue 2: Solution
- Issue 3: Solution

## Tracking Your Progress
How to measure effectiveness and improvement...

## Additional Resources
### Related Tools
- Tool 1
- Tool 2
- Tool 3

### Further Reading
- Resource 1
- Resource 2
- Resource 3

## Get Support
Where to find help if you need it...

## Conclusion
Encouraging message about using the tool effectively...`,
    tags: ['tool', 'guide', 'practical', 'support']
  },
  'Therapy Tips': {
    title: 'Therapy Tips: [Specific Topic]',
    excerpt: 'Professional insights and practical advice to help you get the most out of therapy and your mental health journey.',
    content: `# Therapy Tips: [Specific Topic]

## Introduction
Why this therapy tip matters...

## The Concept Explained
Clear explanation of the therapeutic concept...

## How It Works
The psychology and science behind it...

## Practical Application
### In Therapy Sessions
How to use this during therapy...

### Between Sessions
Homework and practice...

### In Daily Life
Real-world application...

## Step-by-Step Guide
1. Step one with details
2. Step two with details
3. Step three with details

## Common Challenges
- Challenge 1: How to overcome
- Challenge 2: How to overcome
- Challenge 3: How to overcome

## Tips from Therapists
Professional advice and insights...

## Client Success Stories
Anonymous examples of effectiveness...

## When to Use This Technique
Best situations and timing...

## Combining with Other Approaches
How this works with other therapy methods...

## Measuring Progress
How to know if it's working...

## Resources
- Books
- Apps
- Worksheets
- Videos

## Conclusion
Encouragement to try and persist...`,
    tags: ['therapy', 'tips', 'mental health', 'techniques']
  },
  'Self-Care': {
    title: 'Self-Care Guide: [Specific Area]',
    excerpt: 'Practical self-care strategies to nurture your wellbeing and build resilience in [specific area].',
    content: `# Self-Care Guide: [Specific Area]

## Why Self-Care Matters
The importance of prioritizing yourself...

## Understanding Self-Care
What it is and what it isn't...

## The Five Dimensions of Self-Care
### Physical Self-Care
- Exercise
- Nutrition
- Sleep
- Medical care

### Emotional Self-Care
- Processing feelings
- Setting boundaries
- Seeking support

### Mental Self-Care
- Learning
- Creativity
- Mental stimulation

### Social Self-Care
- Relationships
- Community
- Connection

### Spiritual Self-Care
- Purpose
- Values
- Meaning

## Creating Your Self-Care Plan
### Assess Your Needs
Self-assessment questions...

### Set Priorities
What needs attention first...

### Schedule It
Making time for self-care...

## Daily Self-Care Practices
### Morning (5-10 minutes)
Quick practices to start your day...

### Midday (5 minutes)
Brief check-ins and resets...

### Evening (10-15 minutes)
Wind-down routines...

## Weekly Self-Care Activities
Longer practices for deeper restoration...

## Self-Care on a Budget
Free and low-cost options...

## Overcoming Barriers
### "I Don't Have Time"
Time management strategies...

### "I Feel Guilty"
Reframing self-care as necessary...

### "I Don't Know Where to Start"
Simple first steps...

## Self-Care Emergency Kit
Quick tools for tough moments...

## Tracking Your Self-Care
Simple ways to stay accountable...

## Resources
- Apps
- Books
- Websites
- Communities

## Conclusion
Commitment to ongoing self-care...`,
    tags: ['self-care', 'wellness', 'mental health', 'balance']
  },
  'Wellness': {
    title: 'Wellness Guide: [Topic]',
    excerpt: 'Holistic approach to wellness covering mind, body, and spirit for a balanced and fulfilling life.',
    content: `# Wellness Guide: [Topic]

## What is Wellness?
Comprehensive definition and importance...

## The Wellness Wheel
### Physical Wellness
- Exercise
- Nutrition
- Sleep
- Preventive care

### Emotional Wellness
- Self-awareness
- Stress management
- Resilience

### Social Wellness
- Relationships
- Communication
- Community

### Intellectual Wellness
- Learning
- Creativity
- Critical thinking

### Occupational Wellness
- Career satisfaction
- Work-life balance
- Purpose

### Spiritual Wellness
- Values
- Meaning
- Connection

## Assessing Your Wellness
Self-assessment tools and questions...

## Creating Balance
How to address all dimensions...

## Practical Wellness Strategies
### Daily Habits
Small actions with big impact...

### Weekly Practices
Deeper wellness activities...

### Monthly Check-ins
Reviewing and adjusting...

## Wellness Challenges
### Common Obstacles
- Time constraints
- Motivation
- Resources
- Support

### Solutions
Practical ways to overcome each...

## Building a Wellness Routine
Step-by-step guide to sustainable habits...

## Wellness Resources
- Apps
- Books
- Courses
- Communities

## Measuring Progress
How to track your wellness journey...

## Conclusion
Long-term commitment to wellness...`,
    tags: ['wellness', 'holistic health', 'balance', 'lifestyle']
  }
};

const BlogManager = ({ onSave, initialData = null }) => {
  const [showTemplates, setShowTemplates] = useState(!initialData);
  const [blogData, setBlogData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [],
    published: false,
    featuredImage: '',
    metaTitle: '',
    metaDescription: '',
    ...initialData
  });

  const [tagInput, setTagInput] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);

  const categoryGroups = {
    'Blogs': [
      'Mental Health',
      'Addiction Recovery',
      'Therapy Tips',
      'Self-Care',
      'Relationships',
      'Wellness',
      'Success Stories',
      'Research & Studies'
    ],
    'Recovery Guides': ['Recovery Guide'],
    'Community Education': ['Community Education'],
    'Support Tools': ['Support Tool']
  };

  const handleChange = (field, value) => {
    setBlogData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (category) => {
    const template = CONTENT_TEMPLATES[category];
    if (template) {
      setBlogData(prev => ({
        ...prev,
        category: category,
        title: template.title,
        excerpt: template.excerpt,
        content: template.content,
        tags: template.tags
      }));
    } else {
      setBlogData(prev => ({
        ...prev,
        category: category
      }));
    }
    setShowTemplates(false);
  };

  const handleStartFromScratch = () => {
    setShowTemplates(false);
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

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('blogImage', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_ENDPOINTS.BASE_URL}/api/upload/blog-image`,
        formData,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const imageUrl = `${API_ENDPOINTS.BASE_URL}${response.data.imageUrl}`;
      handleChange('featuredImage', imageUrl);
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
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

  // Template Selection Dialog
  if (showTemplates) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TemplateIcon /> Choose a Template
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a category-specific template to get started quickly, or start from scratch
          </Typography>
        </Box>

        {Object.entries(categoryGroups).map(([groupName, categories]) => (
          <Box key={groupName} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              {groupName === 'Blogs' ? '📝 ' : groupName === 'Recovery Guides' ? '📖 ' : groupName === 'Community Education' ? '🎓 ' : '🛠️ '}
              {groupName}
            </Typography>
            <Grid container spacing={2}>
              {categories.map((category) => {
                const hasTemplate = CONTENT_TEMPLATES[category];
                return (
                  <Grid item xs={12} sm={6} md={4} key={category}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4
                        },
                        border: hasTemplate ? '2px solid' : '1px solid',
                        borderColor: hasTemplate ? 'primary.main' : 'divider'
                      }}
                      onClick={() => handleTemplateSelect(category)}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {category}
                        </Typography>
                        {hasTemplate && (
                          <Chip 
                            label="Template Available" 
                            size="small" 
                            color="primary" 
                            sx={{ mb: 1 }}
                          />
                        )}
                        <Typography variant="body2" color="text.secondary">
                          {hasTemplate 
                            ? 'Pre-filled template with structure and guidance'
                            : 'Start with a blank canvas'
                          }
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}

        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleStartFromScratch}
            sx={{ py: 1.5 }}
          >
            Start from Scratch (No Template)
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArticleIcon /> {initialData ? 'Edit Content' : 'Create New Content'}
        </Typography>
        {!initialData && (
          <Button
            size="small"
            startIcon={<TemplateIcon />}
            onClick={() => setShowTemplates(true)}
          >
            Change Template
          </Button>
        )}
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
              {Object.entries(categoryGroups).map(([groupName, categories]) => [
                <MenuItem key={groupName} disabled sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {groupName}
                </MenuItem>,
                ...categories.map((cat) => (
                  <MenuItem key={cat} value={cat} sx={{ pl: 4 }}>
                    {cat} {CONTENT_TEMPLATES[cat] && '✨'}
                  </MenuItem>
                ))
              ])}
            </Select>
          </FormControl>
        </Grid>

        {/* Featured Image Upload */}
        <Grid item xs={12}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Featured Image</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Or enter URL manually below (Max 5MB, JPG/PNG)
              </Typography>
            </Box>
            <TextField
              fullWidth
              size="small"
              label="Featured Image URL"
              value={blogData.featuredImage}
              onChange={(e) => handleChange('featuredImage', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {blogData.featuredImage && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={blogData.featuredImage}
                  alt="Featured preview"
                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </Box>
            )}
          </Box>
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
