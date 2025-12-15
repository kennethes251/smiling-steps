import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Alert
} from '@mui/material';
import {
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Videocam as VideocamIcon,
  Mic as MicIcon,
  Wifi as WifiIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const QuickHelpPanel = ({ onOpenFullGuide }) => {
  const [expanded, setExpanded] = useState(false);

  const quickFixes = [
    {
      icon: <VideocamIcon color="primary" />,
      title: "Camera Not Working?",
      steps: [
        "Click camera icon in address bar",
        "Select 'Allow' for camera",
        "Refresh this page"
      ]
    },
    {
      icon: <MicIcon color="primary" />,
      title: "No Audio?",
      steps: [
        "Click microphone icon in address bar", 
        "Select 'Allow' for microphone",
        "Check your system volume"
      ]
    },
    {
      icon: <WifiIcon color="primary" />,
      title: "Connection Issues?",
      steps: [
        "Close other video apps (Zoom, Teams)",
        "Move closer to WiFi router",
        "Try refreshing the page"
      ]
    }
  ];

  return (
    <Card 
      sx={{ 
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: expanded ? 350 : 'auto',
        zIndex: 1000,
        boxShadow: 3
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpIcon color="primary" />
            <Typography variant="subtitle2">
              Need Help?
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {quickFixes.map((fix, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {fix.icon}
                  <Typography variant="body2" fontWeight="medium">
                    {fix.title}
                  </Typography>
                </Box>
                <List dense sx={{ pl: 2 }}>
                  {fix.steps.map((step, stepIndex) => (
                    <ListItem key={stepIndex} sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={step}
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}

            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="caption">
                Still having issues? Try refreshing the page or switching to Chrome browser.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={onOpenFullGuide}
              >
                More Help
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Emergency: support@smilingsteps.com
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default QuickHelpPanel;