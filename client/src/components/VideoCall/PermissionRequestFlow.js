import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Mic as MicIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Security as SecurityIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const PermissionRequestFlow = ({ 
  onPermissionsGranted, 
  onPermissionsDenied, 
  onClose,
  showAsDialog = true 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [permissions, setPermissions] = useState({
    camera: 'pending',
    microphone: 'pending'
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({
    cameras: [],
    microphones: []
  });

  useEffect(() => {
    checkExistingPermissions();
    enumerateDevices();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      // Check if permissions are already granted
      const cameraPermission = await navigator.permissions.query({ name: 'camera' });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
      
      setPermissions({
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      });

      // If both are granted, skip to success
      if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
        setActiveStep(2);
        if (onPermissionsGranted) {
          onPermissionsGranted();
        }
      }
    } catch (err) {
      console.log('Permission API not supported, will request directly');
    }
  };

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      setDeviceInfo({ cameras, microphones });
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);
    setActiveStep(1);

    try {
      // Request both camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Success - stop the stream and update state
      stream.getTracks().forEach(track => track.stop());
      
      setPermissions({
        camera: 'granted',
        microphone: 'granted'
      });
      
      setActiveStep(2);
      
      if (onPermissionsGranted) {
        onPermissionsGranted();
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      setError(err);
      
      // Update permission states based on error
      if (err.name === 'NotAllowedError') {
        setPermissions({
          camera: 'denied',
          microphone: 'denied'
        });
      } else if (err.name === 'NotFoundError') {
        setPermissions({
          camera: 'unavailable',
          microphone: 'unavailable'
        });
      }
      
      if (onPermissionsDenied) {
        onPermissionsDenied(err);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const getPermissionIcon = (status) => {
    switch (status) {
      case 'granted':
        return <CheckCircleIcon color="success" />;
      case 'denied':
        return <ErrorIcon color="error" />;
      case 'unavailable':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getPermissionText = (status) => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'unavailable':
        return 'Not Available';
      default:
        return 'Pending';
    }
  };

  const getPermissionColor = (status) => {
    switch (status) {
      case 'granted':
        return 'success';
      case 'denied':
        return 'error';
      case 'unavailable':
        return 'warning';
      default:
        return 'default';
    }
  };

  const steps = [
    {
      label: 'Permission Required',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            To join the video call, we need access to your camera and microphone.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Your privacy is important to us. We only access your camera and microphone during video calls, 
              and we never record or store your video or audio without your explicit consent.
            </Typography>
          </Alert>

          <List>
            <ListItem>
              <ListItemIcon>
                <VideocamIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Camera Access"
                secondary={`${deviceInfo.cameras.length} camera(s) detected`}
              />
              <Chip 
                label={getPermissionText(permissions.camera)}
                color={getPermissionColor(permissions.camera)}
                size="small"
                icon={getPermissionIcon(permissions.camera)}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <MicIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Microphone Access"
                secondary={`${deviceInfo.microphones.length} microphone(s) detected`}
              />
              <Chip 
                label={getPermissionText(permissions.microphone)}
                color={getPermissionColor(permissions.microphone)}
                size="small"
                icon={getPermissionIcon(permissions.microphone)}
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={requestPermissions}
              disabled={isRequesting}
              startIcon={isRequesting ? <RefreshIcon /> : <SecurityIcon />}
              fullWidth
            >
              {isRequesting ? 'Requesting Permissions...' : 'Grant Camera & Microphone Access'}
            </Button>
          </Box>
        </Box>
      )
    },
    {
      label: 'Requesting Access',
      content: (
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please allow access to your camera and microphone when prompted by your browser.
          </Typography>
          
          <Alert severity="info">
            <Typography variant="body2">
              Look for a permission popup in your browser's address bar or at the top of the page.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Ready to Join',
      content: (
        <Box sx={{ textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Permissions Granted!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You're all set to join the video call.
          </Typography>
        </Box>
      )
    }
  ];

  const TroubleshootingHelp = () => (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Having trouble? Try these steps:
      </Typography>
      <List dense>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText 
            primary="1. Look for a camera/microphone icon in your browser's address bar"
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText 
            primary="2. Click 'Allow' when prompted for permissions"
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText 
            primary="3. Make sure no other apps are using your camera/microphone"
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
        <ListItem sx={{ pl: 0 }}>
          <ListItemText 
            primary="4. Try refreshing the page if permissions were previously denied"
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
      </List>
    </Alert>
  );

  const PermissionContent = () => (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              {step.content}
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {error.name === 'NotAllowedError' 
              ? 'Camera and microphone access was denied. Please allow access and try again.'
              : error.name === 'NotFoundError'
              ? 'No camera or microphone was found. Please check your devices and try again.'
              : `Error: ${error.message}`
            }
          </Typography>
        </Alert>
      )}

      {(error || (permissions.camera === 'denied' || permissions.microphone === 'denied')) && (
        <TroubleshootingHelp />
      )}
    </Box>
  );

  if (showAsDialog) {
    return (
      <Dialog 
        open={true}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={activeStep !== 2}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Camera & Microphone Access
          {onClose && activeStep === 2 && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <PermissionContent />
        </DialogContent>
        <DialogActions>
          {activeStep === 2 && onClose && (
            <Button variant="contained" onClick={onClose}>
              Continue to Video Call
            </Button>
          )}
          {(error || activeStep === 0) && (
            <Button onClick={requestPermissions} disabled={isRequesting}>
              Try Again
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <CardContent>
        <PermissionContent />
      </CardContent>
    </Card>
  );
};

export default PermissionRequestFlow;