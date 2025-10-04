// Base UI Components
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Icon, IconButton } from './Icon';

// Re-export common MUI components with our theme applied
export { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Divider, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Chip,
  Badge,
  Tooltip,
  Skeleton,
  CircularProgress,
  LinearProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Menu,
  MenuItem,
  Select,
  FormControl,
  FormLabel,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Slider,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Drawer,
  useMediaQuery,
  useTheme,
  styled,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';

// Re-export common MUI icons
export * from '@mui/icons-material';

// Re-export framer-motion for animations
export { motion, AnimatePresence } from 'framer-motion';

// Re-export notistack for toast notifications
export { useSnackbar } from 'notistack';
