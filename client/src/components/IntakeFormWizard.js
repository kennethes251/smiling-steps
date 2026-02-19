/**
 * Intake Form Wizard Component
 * 
 * Multi-step form interface with:
 * - Client-side validation
 * - Progress indicator
 * - Save and continue later
 * - Section-by-section completion
 * 
 * Requirements: 5.3 from Forms & Agreements System
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stepper, Step, StepLabel,
  FormControlLabel, Checkbox, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, LinearProgress
} from '@mui/material';
import { Save, Send, ArrowBack, ArrowForward } from '@mui/icons-material';
import axios from 'axios';
import API_URL from '../config/api';

const IntakeFormWizard = ({ sessionId, onComplete }) => {
  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedFormId, setSavedFormId] = useState(null);

  useEffect(() => {
    fetchTemplate();
    fetchExistingForm();
  }, [sessionId]);

  const fetchTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/intake-forms/template`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplate(response.data.template);
    } catch (err) {
      setError('Failed to load form template');
    }
  };

  const fetchExistingForm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/intake-forms/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.form) {
        setFormData(response.data.form);
        setSavedFormId(response.data.form._id);
      }
    } catch (err) {
      // No existing form, that's okay
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (savedFormId) {
        await axios.put(`${API_URL}/api/intake-forms/${savedFormId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        const response = await axios.post(`${API_URL}/api/intake-forms`, 
          { sessionId, ...formData, isComplete: false },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSavedFormId(response.data.form?.id);
      }
    } catch (err) {
      setError('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (savedFormId) {
        await axios.put(`${API_URL}/api/intake-forms/${savedFormId}`, 
          { ...formData, isComplete: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`${API_URL}/api/intake-forms`,
          { sessionId, ...formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const validateSection = (sectionIndex) => {
    if (!template) return true;
    const section = template.sections[sectionIndex];
    return section.fields.every(field => {
      if (!field.required) return true;
      if (field.conditional && !formData[field.conditional]) return true;
      return formData[field.name] !== undefined && formData[field.name] !== '';
    });
  };

  const renderField = (field) => {
    if (field.conditional && !formData[field.conditional]) return null;
    
    switch (field.type) {
      case 'textarea':
        return (
          <TextField key={field.name} fullWidth multiline rows={3} label={field.label}
            value={formData[field.name] || ''} onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required} sx={{ mb: 2 }} />
        );
      case 'boolean':
        return (
          <FormControlLabel key={field.name}
            control={<Checkbox checked={formData[field.name] || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)} />}
            label={field.label} sx={{ mb: 2, display: 'block' }} />
        );
      case 'select':
        return (
          <FormControl key={field.name} fullWidth sx={{ mb: 2 }}>
            <InputLabel>{field.label}</InputLabel>
            <Select value={formData[field.name] || ''} label={field.label}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}>
              {field.options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </Select>
          </FormControl>
        );
      default:
        return (
          <TextField key={field.name} fullWidth label={field.label} type={field.type || 'text'}
            value={formData[field.name] || ''} onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required} sx={{ mb: 2 }} />
        );
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
  if (!template) return <Alert severity="error">Failed to load form</Alert>;

  const progress = ((activeStep + 1) / template.sections.length) * 100;
  const currentSection = template.sections[activeStep];
  const isLastStep = activeStep === template.sections.length - 1;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Intake Form</Typography>
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, height: 8, borderRadius: 4 }} />
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {template.sections.map((section, index) => (
          <Step key={section.id} completed={index < activeStep || (index === activeStep && validateSection(index))}>
            <StepLabel>{section.title}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Typography variant="h6" gutterBottom>{currentSection.title}</Typography>
      <Box>{currentSection.fields.map(renderField)}</Box>
      
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button startIcon={<ArrowBack />} onClick={() => setActiveStep(s => s - 1)} disabled={activeStep === 0}>
          Back
        </Button>
        <Box>
          <Button startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ mr: 1 }}>
            {saving ? 'Saving...' : 'Save Progress'}
          </Button>
          {isLastStep ? (
            <Button variant="contained" startIcon={<Send />} onClick={handleSubmit}
              disabled={submitting || !validateSection(activeStep)}>
              {submitting ? 'Submitting...' : 'Submit Form'}
            </Button>
          ) : (
            <Button variant="contained" endIcon={<ArrowForward />}
              onClick={() => setActiveStep(s => s + 1)} disabled={!validateSection(activeStep)}>
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default IntakeFormWizard;
