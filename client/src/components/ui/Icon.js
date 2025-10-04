import React from 'react';
import { styled } from '@mui/material/styles';
import MuiIconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// Base Icon Component
const Icon = ({
  component: IconComponent,
  color = 'inherit',
  size = 'medium',
  sx = {},
  ...props
}) => {
  const sizeMap = {
    small: 20,
    medium: 24,
    large: 28,
  };

  const StyledIcon = styled(IconComponent)(({ theme }) => ({
    fontSize: sizeMap[size] || sizeMap.medium,
    color: theme.palette[color]?.main || 
           (theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary),
    transition: 'color 0.2s ease-in-out, transform 0.2s ease-in-out',
    ...sx,
  }));

  return <StyledIcon {...props} />;
};

// Icon Button Component
const IconButton = ({
  children,
  color = 'default',
  size = 'medium',
  tooltip = '',
  tooltipPlacement = 'top',
  edge = false,
  disabled = false,
  onClick,
  sx = {},
  ...props
}) => {
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const StyledIconButton = styled(MuiIconButton)(({ theme }) => ({
    width: sizeMap[size] || sizeMap.medium,
    height: sizeMap[size] || sizeMap.medium,
    color: color === 'default' ? theme.palette.text.secondary : theme.palette[color]?.main,
    backgroundColor: 'transparent',
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      color: color === 'default' ? theme.palette.text.primary : theme.palette[color]?.dark,
    },
    '&:active': {
      backgroundColor: theme.palette.action.selected,
    },
    '&.Mui-disabled': {
      color: theme.palette.action.disabled,
      backgroundColor: 'transparent',
    },
    ...(edge && {
      marginLeft: theme.spacing(-1),
      marginRight: theme.spacing(-1),
    }),
    ...sx,
  }));

  const button = (
    <StyledIconButton 
      size={size} 
      color={color} 
      disabled={disabled}
      onClick={onClick}
      aria-label={tooltip}
      {...props}
    >
      {children}
    </StyledIconButton>
  );

  return tooltip && !disabled ? (
    <Tooltip title={tooltip} placement={tooltipPlacement} arrow>
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  );
};

export { Icon, IconButton };
export default Icon;
