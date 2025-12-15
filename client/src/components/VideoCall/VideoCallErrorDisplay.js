import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  BugReport as BugReportIcon,
  ContentCopy as CopyIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import TroubleshootingGuide from './TroubleshootingGuide';
import { 
  formatErrorForDisplay, 
  getRetryDelay, 
  shouldAutoRetry,
  generateErrorReport,
  logError,
  ERROR_SEVERITY 
} from '../../utils/videoCallErrors';

const VideoCallErrorDisplay = ({ 
  error, 
  onRetry, 
  onClose, 
  onNavigateAway,
  context = {},
  showAsDialog = false,
  autoRetry = true 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [errorReport, setErrorReport] = useState(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const errorInfo = error ? formatErrorForDisplay(error) : null;

  useEffect(() => {
    if (error) {
      // Log the error
      const report = logError(error, context);
      setErrorReport(report);

      // Auto-retry logic
      if (autoRetry && errorInfo && shouldAutoRetry(errorInfo, retryCount)) {
        const delay = getRetryDelay(errorInfo);
        setRetryCountdown(Math.ceil(delay / 1000));
        
        const countdownInterval = setInterval(() => {
          setRetryCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              handleRetry();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(countdownInterval);
      }
    }
  }, [error, retryCount, autoRetry]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopyErrorReport = () => {
    if (errorReport) {
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return <ErrorIcon color="error" />;
      case ERROR_SEVERITY.HIGH:
        return <ErrorIcon color="error" />;
      case ERROR_SEVERITY.MEDIUM:
        return <WarningIcon color="warning" />;
      case ERROR_SEVERITY.LOW:
        return <InfoIcon color="info" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return 'error';
      case ERROR_SEVERITY.HIGH:
        return 'error';
      case ERROR_SEVERITY.MEDIUM:
        return 'warning';
      case ERROR_SEVERITY.LOW:
        return 'info';
      default:
        return 'error';
    }
  };

  if (!error || !errorInfo) {
    return null;
  }

  const ErrorContent = () => (
    <Box>
      <Alert 
        severity={getSeverityColor(errorInfo.severity)}
        icon={getSeverityIcon(errorInfo.severity)}
        sx={{ mb: 2 }}
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {errorInfo.title}
          <Chip 
            label={errorInfo.category} 
            size="small" 
            variant="outlined" 
            sx={{ ml: 'auto' }}
          />
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {errorInfo.message}
        </Typography>

        {/* Auto-retry countdown */}
        {retryCountdown > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Automatically retrying in {retryCountdown} seconds...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(getRetryDelay(errorInfo) / 1000 - retryCountdown) / (getRetryDelay(errorInfo) / 1000) * 100}
              sx={{ mt: 1 }}
            />
          </Box>
        )}

        {/* Solutions */}
        {errorInfo.solutions && errorInfo.solutions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              How to fix this:
            </Typography>
            <List dense sx={{ pl: 0 }}>
              {errorInfo.solutions.map((solution, index) => (
                <ListItem key={index} sx={{ pl: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={solution}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          {errorInfo.showRetry && onRetry && (
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              disabled={isRetrying || retryCountdown > 0}
              size="small"
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<HelpIcon />}
            onClick={() => setShowTroubleshooting(true)}
            size="small"
          >
            Troubleshooting Guide
          </Button>

          {onNavigateAway && (
            <Button
              variant="outlined"
              onClick={onNavigateAway}
              size="small"
            >
              Return to Dashboard
            </Button>
          )}

          <Button
            variant="text"
            startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowDetails(!showDetails)}
            size="small"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </Box>

        {/* Technical Details */}
        <Collapse in={showDetails}>
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon fontSize="small" />
              Technical Information
            </Typography>
            
            <Typography variant="caption" component="div" sx={{ mb: 1 }}>
              <strong>Category:</strong> {errorInfo.category}
            </Typography>
            
            <Typography variant="caption" component="div" sx={{ mb: 1 }}>
              <strong>Severity:</strong> {errorInfo.severity}
            </Typography>
            
            <Typography variant="caption" component="div" sx={{ mb: 1 }}>
              <strong>Details:</strong> {errorInfo.technicalDetails}
            </Typography>
            
            {retryCount > 0 && (
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Retry Attempts:</strong> {retryCount}
              </Typography>
            )}

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CopyIcon />}
                onClick={handleCopyErrorReport}
              >
                Copy Error Report
              </Button>
            </Box>
          </Paper>
        </Collapse>
      </Alert>

      {/* Troubleshooting Guide */}
      <TroubleshootingGuide
        open={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
        error={error}
        context={context}
      />
    </Box>
  );

  if (showAsDialog) {
    return (
      <Dialog 
        open={Boolean(error)} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { m: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Video Call Error
          {onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <ErrorContent />
        </DialogContent>
        <DialogActions>
          {errorInfo.showRetry && onRetry && (
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              disabled={isRetrying || retryCountdown > 0}
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
          {onClose && (
            <Button onClick={onClose}>
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{ 
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: 600,
      zIndex: 9999,
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <ErrorContent />
    </Box>
  );
};

export default VideoCallErrorDisplay;