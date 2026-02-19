/**
 * RescheduleButton Component
 * 
 * A button that opens the reschedule dialog for a session.
 * Can be added to any session card/list item.
 * 
 * Requirements: 9.1, 9.2 from Cancellation & Rescheduling
 */

import React, { useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import RescheduleDialog from './RescheduleDialog';

const RescheduleButton = ({ 
  session, 
  variant = 'outlined', 
  size = 'small', 
  iconOnly = false,
  onRescheduleComplete 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const handleComplete = (result) => {
    if (onRescheduleComplete) {
      onRescheduleComplete(result);
    }
  };

  // Only show for sessions that can potentially be rescheduled
  const reschedulableStatuses = ['Approved', 'Payment Submitted', 'Confirmed', 'Booked'];
  if (!reschedulableStatuses.includes(session?.status)) {
    return null;
  }

  if (iconOnly) {
    return (
      <>
        <Tooltip title="Reschedule Session">
          <IconButton 
            onClick={handleClick} 
            size={size}
            color="primary"
          >
            <ScheduleIcon />
          </IconButton>
        </Tooltip>
        <RescheduleDialog
          open={dialogOpen}
          onClose={handleClose}
          session={session}
          onRescheduleComplete={handleComplete}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        color="primary"
        startIcon={<ScheduleIcon />}
        onClick={handleClick}
      >
        Reschedule
      </Button>
      <RescheduleDialog
        open={dialogOpen}
        onClose={handleClose}
        session={session}
        onRescheduleComplete={handleComplete}
      />
    </>
  );
};

export default RescheduleButton;
