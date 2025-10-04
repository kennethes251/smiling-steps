import React, { useState, useCallback } from 'react';
import { styled, useTheme, Box, Toolbar, useMediaQuery } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from './Header';
import { ToastProvider } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';

// Styled components
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
  drawerWidth: number;
}>(({ theme, open, drawerWidth }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: `${drawerWidth}px`,
  }),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(2),
    marginLeft: 0,
    ...(open && {
      marginLeft: 0,
    }),
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Layout = ({ children }) => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const drawerWidth = 240;

  // Handle drawer toggle
  const handleDrawerToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  }, [isMobile, mobileOpen, sidebarOpen]);

  // Close mobile drawer when route changes
  React.useEffect(() => {
    if (isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [location, isMobile, mobileOpen]);

  // Don't show layout for auth pages
  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {children}
      </Box>
    );
  }

  return (
    <ToastProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {isAuthenticated && (
          <>
            <Header 
              onDrawerToggle={handleDrawerToggle} 
              drawerOpen={isMobile ? mobileOpen : sidebarOpen}
            />
            <Sidebar 
              open={isMobile ? mobileOpen : sidebarOpen}
              onClose={handleDrawerToggle}
              variant={isMobile ? 'temporary' : 'persistent'}
              drawerWidth={drawerWidth}
            />
          </>
        )}
        
        <Main 
          component="main" 
          open={!isMobile && sidebarOpen}
          drawerWidth={drawerWidth}
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)` },
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            ...(sidebarOpen && !isMobile && {
              transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          }}
        >
          {isAuthenticated && <Toolbar />}
          <Box sx={{ 
            maxWidth: 1440,
            mx: 'auto',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}>
            {children}
          </Box>
        </Main>
      </Box>
    </ToastProvider>
  );
};

export default Layout;
