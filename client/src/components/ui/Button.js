import React from 'react';
import { Button as MuiButton, CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledButton = styled(MuiButton)(({ theme, variant, color = 'primary', size = 'medium', fullWidth, loading }) => ({
  textTransform: 'none',
  fontWeight: 600,
  letterSpacing: '0.5px',
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.2s ease-in-out',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
  ...(variant === 'contained' && {
    backgroundColor: theme.palette[color]?.main || theme.palette.primary.main,
    color: theme.palette[color]?.contrastText || theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette[color]?.dark || theme.palette.primary.dark,
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
    },
  }),
  ...(variant === 'outlined' && {
    border: `2px solid ${theme.palette[color]?.main || theme.palette.primary.main}`,
    color: theme.palette[color]?.main || theme.palette.primary.main,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: `${theme.palette[color]?.main}0a`,
      borderColor: theme.palette[color]?.dark || theme.palette.primary.dark,
      color: theme.palette[color]?.dark || theme.palette.primary.dark,
    },
    '&.Mui-disabled': {
      borderColor: theme.palette.action.disabled,
      color: theme.palette.action.disabled,
    },
  }),
  ...(variant === 'text' && {
    color: theme.palette[color]?.main || theme.palette.primary.main,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: `${theme.palette[color]?.main}0a`,
    },
    '&.Mui-disabled': {
      color: theme.palette.action.disabled,
    },
  }),
  ...(size === 'small' && {
    padding: '6px 12px',
    fontSize: '0.875rem',
  }),
  ...(size === 'medium' && {
    padding: '8px 16px',
    fontSize: '1rem',
  }),
  ...(size === 'large' && {
    padding: '12px 24px',
    fontSize: '1.125rem',
  }),
  ...(fullWidth && {
    width: '100%',
  }),
  ...(loading && {
    '& .MuiButton-label': {
      visibility: 'hidden',
    },
  }),
}));

const LoadingWrapper = styled(Box)({
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  left: 0,
  top: 0,
});

const Button = ({
  children,
  loading = false,
  loadingText = 'Loading...',
  startIcon,
  endIcon,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      disabled={disabled || loading}
      startIcon={!loading ? startIcon : undefined}
      endIcon={!loading ? endIcon : undefined}
      {...props}
    >
      {loading ? (
        <>
          <span style={{ visibility: 'hidden' }}>{children}</span>
          <LoadingWrapper>
            <CircularProgress 
              size={20} 
              color="inherit" 
              thickness={4}
              sx={{
                color: props.variant === 'contained' 
                  ? 'white' 
                  : props.color === 'primary' 
                    ? 'primary.main' 
                    : `${props.color || 'primary'}.main`
              }}
            />
          </LoadingWrapper>
        </>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default Button;
