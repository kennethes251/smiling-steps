import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Collapse, 
  Divider, 
  Toolbar, 
  useTheme, 
  useMediaQuery,
  Typography,
  Avatar
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Chat as ChatIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/dashboard' 
  },
  { 
    text: 'Book Session', 
    icon: <CalendarIcon />, 
    path: '/bookings' 
  },
  { 
    text: 'Messages', 
    icon: <ChatIcon />, 
    path: '/messages' 
  },
  { 
    text: 'Assessments', 
    icon: <AssessmentIcon />, 
    path: '/assessments',
    children: [
      { text: 'Take Assessment', path: '/assessments' },
      { text: 'My Results', path: '/assessment-results' },
    ]
  },
];

const Sidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [expandedItems, setExpandedItems] = useState({});

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleItemClick = (item) => {
    if (item.children) {
      setExpandedItems(prev => ({
        ...prev,
        [item.text]: !prev[item.text]
      }));
    } else {
      navigate(item.path);
      if (isMobile) setOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path) && path !== '/');
  };

  const drawer = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: theme.palette.background.paper,
      borderRight: `1px solid ${theme.palette.divider}`,
    }}>
      {/* User Profile Section */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        minHeight: 64
      }}>
        <Avatar 
          sx={{ 
            width: 40, 
            height: 40,
            mr: 2,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          {user?.name?.charAt(0) || 'U'}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" noWrap>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.role === 'psychologist' ? 'Therapist' : 'Client'}
          </Typography>
        </Box>
      </Box>

      {/* Navigation Items */}
      <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleItemClick(item)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.light + '1a',
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.light + '33',
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {React.cloneElement(item.icon, {
                    color: isActive(item.path) ? 'primary' : 'inherit'
                  })}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
                {item.children && (
                  expandedItems[item.text] ? <ExpandLess /> : <ExpandMore />
                )}
              </ListItemButton>
            </ListItem>
            
            {item.children && (
              <Collapse in={expandedItems[item.text]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.text} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          navigate(child.path);
                          if (isMobile) setOpen(false);
                        }}
                        selected={isActive(child.path)}
                        sx={{
                          pl: 6,
                          py: 1,
                          borderRadius: 1,
                          mx: 1,
                          '&.Mui-selected': {
                            backgroundColor: theme.palette.primary.light + '1a',
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: theme.palette.primary.light + '33',
                            },
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <ListItemText 
                          primary={child.text} 
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: isActive(child.path) ? 500 : 400,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>

      {/* Bottom Section */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: theme.palette.error.light + '1a',
                  color: theme.palette.error.main,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.error.main,
                  },
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              boxShadow: theme.shadows[8],
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              backgroundColor: theme.palette.background.paper,
            },
          }}
          open={open}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
