import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Videocam as VideocamIcon,
  Mic as MicIcon,
  Wifi as WifiIcon,
  Computer as ComputerIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Phone as PhoneIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

const TroubleshootingGuide = ({ open, onClose, error, context = {} }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const handleStepComplete = (stepIndex) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
    if (stepIndex < troubleshootingSteps.length - 1) {
      setActiveStep(stepIndex + 1);
    }
  };

  const troubleshootingSteps = [
    {
      label: 'Check Browser Compatibility',
      icon: <ComputerIcon />,
      content: (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ensure you're using a supported browser with the latest version.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Supported Browsers:</strong> Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
            </Typography>
          </Alert>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Update your browser to the latest version"
                secondary="Go to browser settings and check for updates"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Enable JavaScript"
                secondary="Video calls require JavaScript to be enabled"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Disable browser extensions"
                secondary="Some extensions may interfere with video calls"
              />
            </ListItem>
          </List>

          <Typography variant="caption" color="text.secondary">
            Current Browser: {navigator.userAgent.split(' ')[0]}
          </Typography>
        </Box>
      )
    },
    {
      label: 'Check Camera and Microphone',
      icon: <VideocamIcon />,
      content: (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Verify your camera and microphone are working properly.
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Check device connections"
                secondary="Ensure camera and microphone are properly connected"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Close other applications"
                secondary="Close Zoom, Teams, Skype, or other video apps"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Test in system settings"
                secondary="Test your camera/microphone in your OS settings"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Grant browser permissions"
                secondary="Allow camera and microphone access when prompted"
              />
            </ListItem>
          </List>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              If you're using an external camera or microphone, try unplugging and reconnecting it.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Check Internet Connection',
      icon: <WifiIcon />,
      content: (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            A stable internet connection is essential for video calls.
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Test your internet speed"
                secondary="Minimum: 1 Mbps upload/download for video calls"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Move closer to WiFi router"
                secondary="Improve signal strength by reducing distance"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Use wired connection"
                secondary="Ethernet connection is more stable than WiFi"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Close bandwidth-heavy apps"
                secondary="Stop downloads, streaming, or other internet-heavy activities"
              />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              If your connection is slow, try turning off video and using audio-only mode.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Clear Browser Data',
      icon: <SettingsIcon />,
      content: (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Clear browser cache and cookies to resolve potential conflicts.
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Clear browser cache"
                secondary="Remove temporary files that might cause issues"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Clear cookies for this site"
                secondary="Reset any stored preferences that might conflict"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Restart your browser"
                secondary="Close all browser windows and reopen"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Try incognito/private mode"
                secondary="Test if extensions or stored data are causing issues"
              />
            </ListItem>
          </List>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              You may need to log in again after clearing cookies.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Contact Support',
      icon: <PhoneIcon />,
      content: (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            If the issue persists, contact our support team for assistance.
          </Typography>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Before contacting support, please have this information ready:
              </Typography>
              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText 
                    primary="• Your browser name and version"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText 
                    primary="• Operating system (Windows, Mac, etc.)"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText 
                    primary="• Error message (if any)"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText 
                    primary="• Steps you've already tried"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PhoneIcon />}
              href="mailto:support@smilingsteps.com"
            >
              Email Support
            </Button>
            <Button
              variant="outlined"
              startIcon={<BugReportIcon />}
              onClick={() => {
                const errorReport = {
                  timestamp: new Date().toISOString(),
                  error: error?.toString(),
                  context,
                  userAgent: navigator.userAgent,
                  url: window.location.href
                };
                navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
              }}
            >
              Copy Error Report
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Additional Resources:</strong><br />
              • <a href="/docs/video-call-quick-fixes" target="_blank">Quick Fixes Guide</a> - 30-second solutions<br />
              • <a href="/docs/video-call-faq" target="_blank">FAQ</a> - Common questions answered<br />
              • <a href="/docs/video-call-troubleshooting" target="_blank">Complete Troubleshooting Guide</a> - Detailed solutions
            </Typography>
          </Alert>
        </Box>
      )
    }
  ];

  const commonIssues = [
    {
      title: 'Camera Permission Denied',
      severity: 'error',
      description: 'Browser blocked access to camera/microphone',
      solutions: [
        'Click the camera icon in your browser\'s address bar',
        'Select "Allow" for camera and microphone permissions',
        'Refresh the page after granting permissions',
        'Check if another app is using your camera'
      ]
    },
    {
      title: 'No Audio or Video',
      severity: 'warning',
      description: 'Can\'t see or hear the other participant',
      solutions: [
        'Check your internet connection',
        'Ensure the other participant has joined the call',
        'Try refreshing the page',
        'Check if your microphone/camera is muted'
      ]
    },
    {
      title: 'Poor Video Quality',
      severity: 'info',
      description: 'Video is pixelated or choppy',
      solutions: [
        'Move closer to your WiFi router',
        'Close other applications using internet',
        'Turn off video to improve audio quality',
        'Use a wired internet connection if possible'
      ]
    },
    {
      title: 'Echo or Audio Feedback',
      severity: 'warning',
      description: 'Hearing echo or feedback during the call',
      solutions: [
        'Use headphones instead of speakers',
        'Reduce your speaker volume',
        'Move away from your microphone',
        'Ask the other participant to mute when not speaking'
      ]
    }
  ];

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Video Call Troubleshooting Guide
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Step-by-Step Troubleshooting
          </Typography>
          
          <Stepper activeStep={activeStep} orientation="vertical">
            {troubleshootingSteps.map((step, index) => (
              <Step key={step.label} completed={completedSteps.has(index)}>
                <StepLabel
                  icon={step.icon}
                  optional={
                    completedSteps.has(index) && (
                      <Chip label="Completed" size="small" color="success" />
                    )
                  }
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {step.content}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleStepComplete(index)}
                      size="small"
                      startIcon={<CheckCircleIcon />}
                    >
                      Mark as Complete
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Common Issues & Solutions
          </Typography>
          
          {commonIssues.map((issue, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getSeverityIcon(issue.severity)}
                  <Box>
                    <Typography variant="subtitle2">
                      {issue.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {issue.description}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {issue.solutions.map((solution, solutionIndex) => (
                    <ListItem key={solutionIndex}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={solution} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => {
            onClose();
            window.location.reload();
          }}
        >
          Refresh Page
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TroubleshootingGuide;