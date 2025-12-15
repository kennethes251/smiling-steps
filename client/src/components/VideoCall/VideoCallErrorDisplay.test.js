import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoCallErrorDisplay from './VideoCallErrorDisplay';

// Mock the TroubleshootingGuide component
jest.mock('./TroubleshootingGuide', () => ({ open, onClose }) => 
  open ? <div data-testid="troubleshooting-guide"><button onClick={onClose}>Close Guide</button></div> : null
);

// Mock the video call errors utility
jest.mock('../../utils/videoCallErrors', () => ({
  formatErrorForDisplay: jest.fn((error) => ({
    title: 'Test Error',
    message: 'This is a test error message',
    severity: 'high',
    category: 'connection',
    solutions: ['Solution 1', 'Solution 2'],
    recoverable: true,
    showRetry: true,
    technicalDetails: 'Technical details about the error'
  })),
  getRetryDelay: jest.fn(() => 3000),
  shouldAutoRetry: jest.fn(() => true),
  generateErrorReport: jest.fn(() => ({ id: 'test-report' })),
  logError: jest.fn(() => ({ id: 'test-log' })),
  ERROR_SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

describe('VideoCallErrorDisplay', () => {
  const mockOnRetry = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnNavigateAway = jest.fn();
  const mockError = new Error('Test error');
  const mockContext = { sessionId: 'test-session' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders error display with basic error', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
  });

  test('shows solutions when available', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    expect(screen.getByText('How to fix this:')).toBeInTheDocument();
    expect(screen.getByText('Solution 1')).toBeInTheDocument();
    expect(screen.getByText('Solution 2')).toBeInTheDocument();
  });

  test('shows retry button when retry is available', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalled();
  });

  test('shows troubleshooting guide button', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    const troubleshootingButton = screen.getByText('Troubleshooting Guide');
    expect(troubleshootingButton).toBeInTheDocument();
    
    fireEvent.click(troubleshootingButton);
    expect(screen.getByTestId('troubleshooting-guide')).toBeInTheDocument();
  });

  test('shows navigate away button when provided', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        onNavigateAway={mockOnNavigateAway}
        context={mockContext}
      />
    );

    const navigateButton = screen.getByText('Return to Dashboard');
    expect(navigateButton).toBeInTheDocument();
    
    fireEvent.click(navigateButton);
    expect(mockOnNavigateAway).toHaveBeenCalled();
  });

  test('expands and collapses technical details', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    const detailsButton = screen.getByText('Show Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Technical Information')).toBeInTheDocument();
    expect(screen.getByText('Technical details about the error')).toBeInTheDocument();

    const hideButton = screen.getByText('Hide Details');
    fireEvent.click(hideButton);

    expect(screen.queryByText('Technical Information')).not.toBeInTheDocument();
  });

  test('copies error report to clipboard', async () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    // Expand details first
    const detailsButton = screen.getByText('Show Details');
    fireEvent.click(detailsButton);

    const copyButton = screen.getByText('Copy Error Report');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  test('renders as dialog when showAsDialog is true', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
        showAsDialog={true}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Video Call Error')).toBeInTheDocument();
  });

  test('handles auto-retry countdown', async () => {
    jest.useFakeTimers();
    
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
        autoRetry={true}
      />
    );

    // Should show countdown
    await waitFor(() => {
      expect(screen.getByText(/Automatically retrying in/)).toBeInTheDocument();
    });

    // Fast forward the countdown
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  test('disables retry button during retry', async () => {
    const slowRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={slowRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
    expect(retryButton).toBeDisabled();
  });

  test('handles retry failure gracefully', async () => {
    const failingRetry = jest.fn(() => Promise.reject(new Error('Retry failed')));
    
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={failingRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    const retryButton = screen.getByText('Try Again');
    
    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Should not crash and should re-enable the button
    await waitFor(() => {
      expect(screen.getByText('Try Again')).not.toBeDisabled();
    });
  });

  test('does not show retry button when showRetry is false', () => {
    const { formatErrorForDisplay } = require('../../utils/videoCallErrors');
    formatErrorForDisplay.mockReturnValue({
      title: 'Test Error',
      message: 'This is a test error message',
      severity: 'high',
      category: 'connection',
      solutions: ['Solution 1'],
      recoverable: false,
      showRetry: false,
      technicalDetails: 'Technical details'
    });

    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  test('does not auto-retry when autoRetry is false', () => {
    jest.useFakeTimers();
    
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
        autoRetry={false}
      />
    );

    // Should not show countdown
    expect(screen.queryByText(/Automatically retrying in/)).not.toBeInTheDocument();

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockOnRetry).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('closes troubleshooting guide', () => {
    render(
      <VideoCallErrorDisplay
        error={mockError}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    // Open troubleshooting guide
    const troubleshootingButton = screen.getByText('Troubleshooting Guide');
    fireEvent.click(troubleshootingButton);

    expect(screen.getByTestId('troubleshooting-guide')).toBeInTheDocument();

    // Close troubleshooting guide
    const closeGuideButton = screen.getByText('Close Guide');
    fireEvent.click(closeGuideButton);

    expect(screen.queryByTestId('troubleshooting-guide')).not.toBeInTheDocument();
  });

  test('renders null when no error is provided', () => {
    const { container } = render(
      <VideoCallErrorDisplay
        error={null}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
        context={mockContext}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});