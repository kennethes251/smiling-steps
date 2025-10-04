import React, { forwardRef, useCallback, useMemo } from 'react';
import { Snackbar, Alert, AlertTitle, IconButton, Slide } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Slide transition for toast
const SlideTransition = forwardRef(function Transition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});

// Default toast options
const defaultOptions = {
  position: {
    vertical: 'top',
    horizontal: 'right',
  },
  autoHideDuration: 6000,
  transition: SlideTransition,
  elevation: 6,
  variant: 'filled',
  closeButton: true,
  showTitle: false,
  maxWidth: '400px',
  width: '100%',
};

// Toast component
const Toast = ({
  open,
  message,
  onClose,
  severity = 'info',
  title,
  options = {},
}) => {
  const theme = useTheme();
  
  // Merge default options with provided options
  const mergedOptions = useMemo(() => ({
    ...defaultOptions,
    ...options,
    position: {
      ...defaultOptions.position,
      ...(options.position || {}),
    },
  }), [options]);

  const {
    position,
    autoHideDuration,
    transition: Transition,
    elevation,
    variant,
    closeButton,
    showTitle,
    maxWidth,
    width,
  } = mergedOptions;

  // Handle close action
  const handleClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose(event, reason);
  }, [onClose]);

  // Action to show close button
  const action = useCallback((
    <IconButton
      size="small"
      aria-label="close"
      color="inherit"
      onClick={onClose}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: variant === 'filled' ? 'common.white' : 'text.primary',
        opacity: 0.7,
        '&:hover': {
          opacity: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  ), [onClose, variant]);

  // Alert title component
  const alertTitle = useMemo(() => {
    if (!title && !showTitle) return null;
    const displayTitle = title || 
      (severity === 'error' ? 'Error' : 
       severity === 'success' ? 'Success' : 
       severity === 'warning' ? 'Warning' : 'Info');
    
    return <AlertTitle>{displayTitle}</AlertTitle>;
  }, [title, showTitle, severity]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={position}
      TransitionComponent={Transition}
      sx={{
        maxWidth: maxWidth,
        width: width,
        '& .MuiPaper-root': {
          width: '100%',
          maxWidth: '100%',
          boxShadow: theme.shadows[elevation],
        },
      }}
    >
      <Alert
        severity={severity}
        onClose={closeButton ? handleClose : undefined}
        variant={variant}
        action={closeButton ? action : null}
        sx={{
          width: '100%',
          alignItems: 'center',
          '& .MuiAlert-message': {
            width: '100%',
            py: 1.5,
          },
        }}
      >
        {alertTitle}
        {message}
      </Alert>
    </Snackbar>
  );
};

// Toast provider context
const ToastContext = React.createContext(null);

// Toast provider component
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = React.useState({
    open: false,
    message: '',
    severity: 'info',
    options: {},
  });

  const showToast = useCallback((message, severity = 'info', options = {}) => {
    setToast({
      open: true,
      message,
      severity,
      options: {
        ...defaultOptions,
        ...options,
        position: {
          ...defaultOptions.position,
          ...(options.position || {}),
        },
      },
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      showToast,
      hideToast,
      toast: showToast, // Alias for showToast for backward compatibility
    }),
    [showToast, hideToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
        options={toast.options}
      />
    </ToastContext.Provider>
  );
};

// Custom hook to use toast
const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Higher-order component for class components
const withToast = (Component) => {
  const WithToast = (props) => {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
  return WithToast;
};

export { Toast as default, Toast, useToast, withToast };
