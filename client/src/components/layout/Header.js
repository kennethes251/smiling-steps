import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider, 
  ListItemIcon, 
  Badge,
  useTheme,
  useMediaQuery,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useThemeMode } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onDrawerToggle, drawerOpen }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleColorMode } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for user menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Handle user menu open
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle user menu close
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle navigation to profile
  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  // Handle settings
  const handleSettings = () => {
    navigate('/settings');
    handleClose();
  };

  return (
    <AppBar 
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
      elevation={0}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{
            mr: 2,
            color: 'text.primary',
            ...(drawerOpen && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography 
          variant="h6" 
          noWrap 
          component="div"
          sx={{
            fontWeight: 700,
            background: theme.palette.mode === 'dark' 
              ? `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`
              : `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            flexGrow: 1,
          }}
        >
          Teletherapy Pro
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Theme Toggle */}
          <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton 
              onClick={toggleColorMode}
              size="large"
              sx={{
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              size="large"
              aria-label="show 3 new notifications"
              color="inherit"
              sx={{
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleMenu}
                size="small"
                sx={{ ml: 1 }}
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <Avatar 
                  alt={user?.name || 'User'} 
                  src={user?.avatar}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    border: `2px solid ${theme.palette.background.paper}`,
                    boxShadow: theme.shadows[1],
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
                    },
                  }}
                >
                  {user?.name?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* User Menu Dropdown */}
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
