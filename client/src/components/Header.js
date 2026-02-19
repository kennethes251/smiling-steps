import React, { useContext, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '@mui/material/styles';
import Logo from './Logo';

const Header = () => {
  const { isAuthenticated, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Mobile menu items
  const mobileMenuItems = isAuthenticated ? [
    { label: 'Home', path: '/' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Profile', path: '/profile' },
    { label: 'Logout', action: onLogout }
  ] : [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/learn-more' },
    { label: 'Therapists', path: '/therapists' },
    { label: 'Blog', path: '/blogs' },
    { label: 'Resources', path: '/resources' },
    { label: 'Login', path: '/login' },
    { label: 'Register', path: '/register' }
  ];

  return (
    <>
      <AppBar position="static" sx={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Logo size={32} />
            Smiling Steps
          </Typography>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/"
                sx={{ color: theme.palette.text.primary }}
              >
                Home
              </Button>
              
              {isAuthenticated ? (
                <>
                  <Chip 
                    label={`Welcome, ${user?.name || 'User'}`}
                    sx={{ 
                      backgroundColor: theme.palette.background.soft,
                      color: theme.palette.primary.main,
                      fontWeight: 600
                    }}
                  />
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/dashboard"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Dashboard
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/profile"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Profile
                  </Button>
                  <Button 
                    variant="outlined"
                    onClick={onLogout}
                    sx={{ 
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: 'rgba(102, 51, 153, 0.04)'
                      }
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/learn-more"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    About
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/therapists"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Therapists
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/blogs"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Blog
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/resources"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Resources
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/login"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Login
                  </Button>
                  <Button 
                    variant="contained"
                    component={RouterLink} 
                    to="/register"
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      '&:hover': {
                        background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                      }
                    }}
                  >
                    Register
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuToggle}
              sx={{ color: theme.palette.primary.main }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 250,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
            Menu
          </Typography>
          <IconButton onClick={handleMobileMenuToggle} sx={{ color: theme.palette.primary.main }}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        {isAuthenticated && user && (
          <>
            <Box sx={{ p: 2, backgroundColor: theme.palette.background.soft }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Logged in as
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                {user.name}
              </Typography>
            </Box>
            <Divider />
          </>
        )}
        
        <List>
          {mobileMenuItems.map((item, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton 
                onClick={() => item.action ? item.action() : handleMobileNavClick(item.path)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(102, 51, 153, 0.08)'
                  }
                }}
              >
                <ListItemText 
                  primary={item.label}
                  sx={{
                    '& .MuiTypography-root': {
                      color: item.label === 'Register' ? theme.palette.primary.main : theme.palette.text.primary,
                      fontWeight: item.label === 'Register' ? 600 : 400
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
};

export default Header;