import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';

/**
 * AdminCreatedBadge Component
 * Displays a visual indicator for admin-created sessions
 * Shows admin name and reason on hover/click
 * Requirements: 15.7
 */
const AdminCreatedBadge = ({ 
  session, 
  size = 'small', 
  showLabel = true,
  variant = 'outlined'
}) => {
  // Don't render if session is not admin-created
  if (!session?.createdByAdmin) {
    return null;
  }

  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        Admin Booking
      </Typography>
      {session.adminName && (
        <Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
          <strong>Created by:</strong> {session.adminName}
        </Typography>
      )}
      {session.admin?.name && !session.adminName && (
        <Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
          <strong>Created by:</strong> {session.admin.name}
        </Typography>
      )}
      {session.adminBookingReason && (
        <Typography variant="caption" display="block">
          <strong>Reason:</strong> {session.adminBookingReason}
        </Typography>
      )}
      {session.createdAt && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {new Date(session.createdAt).toLocaleString()}
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={<AdminIcon fontSize="small" />}
        label={showLabel ? 'Admin Booked' : undefined}
        size={size}
        color="secondary"
        variant={variant}
        sx={{ 
          cursor: 'help',
          '& .MuiChip-icon': {
            color: 'secondary.main'
          }
        }}
      />
    </Tooltip>
  );
};

export default AdminCreatedBadge;
