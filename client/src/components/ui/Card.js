import React from 'react';
import { styled } from '@mui/material/styles';
import MuiCard from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const StyledCard = styled(MuiCard)(({ theme, variant = 'elevation', hover = false }) => ({
  borderRadius: theme.shape.borderRadius * 1.5,
  overflow: 'hidden',
  transition: 'all 0.3s ease-in-out',
  border: '1px solid',
  borderColor: theme.palette.divider,
  backgroundColor: theme.palette.background.paper,
  ...(variant === 'elevation' && {
    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
    '&:hover': hover ? {
      boxShadow: '0 8px 30px 0 rgba(0, 0, 0, 0.1)',
      transform: 'translateY(-2px)',
    } : {},
  }),
  ...(variant === 'outlined' && {
    boxShadow: 'none',
    border: '1px solid',
    borderColor: theme.palette.divider,
    '&:hover': hover ? {
      borderColor: theme.palette.primary.main,
      boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.05)',
    } : {},
  }),
}));

const StyledCardHeader = styled(CardHeader)(({ theme }) => ({
  padding: theme.spacing(2, 3, 0, 3),
  '& .MuiCardHeader-title': {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  '& .MuiCardHeader-subheader': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  '& .MuiCardHeader-avatar': {
    marginRight: theme.spacing(2),
  },
}));

const StyledCardContent = styled(CardContent)(({ theme, padding = 'normal' }) => ({
  padding: padding === 'dense' ? theme.spacing(2) : theme.spacing(3),
  '&:last-child': {
    paddingBottom: padding === 'dense' ? theme.spacing(2) : theme.spacing(3),
  },
}));

const StyledCardActions = styled(CardActions)(({ theme, alignment = 'right' }) => ({
  padding: theme.spacing(0, 2, 2, 2),
  display: 'flex',
  justifyContent: alignment === 'center' ? 'center' : 
               alignment === 'left' ? 'flex-start' : 'flex-end',
  gap: theme.spacing(1),
  '& > *': {
    margin: 0,
  },
}));

const Card = ({
  children,
  title,
  subheader,
  avatar,
  action,
  actions,
  actionsAlignment = 'right',
  contentPadding = 'normal',
  variant = 'elevation',
  hover = false,
  sx = {},
  ...props
}) => {
  return (
    <StyledCard variant={variant} hover={hover} sx={sx} {...props}>
      {(title || subheader || avatar || action) && (
        <StyledCardHeader
          avatar={avatar}
          title={title}
          subheader={subheader}
          action={action}
        />
      )}
      <StyledCardContent padding={contentPadding}>
        {typeof children === 'string' ? (
          <Typography variant="body1" color="text.primary">
            {children}
          </Typography>
        ) : (
          children
        )}
      </StyledCardContent>
      {actions && (
        <StyledCardActions alignment={actionsAlignment}>
          {Array.isArray(actions) ? (
            actions.map((action, index) => (
              <Box key={index}>
                {action}
              </Box>
            ))
          ) : (
            actions
          )}
        </StyledCardActions>
      )}
    </StyledCard>
  );
};

// Export subcomponents for flexible composition
export {
  StyledCard as CardRoot,
  StyledCardHeader as CardHeader,
  StyledCardContent as CardContent,
  StyledCardActions as CardActions,
};

export default Card;
