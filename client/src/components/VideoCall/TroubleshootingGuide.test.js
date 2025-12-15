import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TroubleshootingGuide from './TroubleshootingGuide';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn(),
    href: 'https://example.com/video-call'
  },
  writable: true
});

describe('TroubleshootingGuide', () => {
  const mockOnClose = jest.fn();
  const mockError = new Error('Test error');
  const mockContext = { sessionId: 'test-session' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders when open is true', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Video Call Troubleshooting Guide')).toBeInTheDocument();
    expect(screen.getByText('Step-by-Step Troubleshooting')).toBeInTheDocument();
  });

  test('does not render when open is false', () => {
    render(
      <TroubleshootingGuide
        open={false}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.queryByText('Video Call Troubleshooting Guide')).not.toBeInTheDocument();
  });

  test('shows all troubleshooting steps', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Check Browser Compatibility')).toBeInTheDocument();
    expect(screen.getByText('Check Camera and Microphone')).toBeInTheDocument();
    expect(screen.getByText('Check Internet Connection')).toBeInTheDocument();
    expect(screen.getByText('Clear Browser Data')).toBeInTheDocument();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  test('shows browser compatibility information', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText(/Supported Browsers:/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome 80\+, Firefox 75\+, Safari 13\+, Edge 80\+/)).toBeInTheDocument();
    expect(screen.getByText(/Current Browser:/)).toBeInTheDocument();
  });

  test('allows marking steps as complete', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    const markCompleteButton = screen.getByText('Mark as Complete');
    fireEvent.click(markCompleteButton);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  test('shows common issues section', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Common Issues & Solutions')).toBeInTheDocument();
    expect(screen.getByText('Camera Permission Denied')).toBeInTheDocument();
    expect(screen.getByText('No Audio or Video')).toBeInTheDocument();
    expect(screen.getByText('Poor Video Quality')).toBeInTheDocument();
    expect(screen.getByText('Echo or Audio Feedback')).toBeInTheDocument();
  });

  test('expands common issue accordion', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    const cameraIssueAccordion = screen.getByText('Camera Permission Denied');
    fireEvent.click(cameraIssueAccordion);

    expect(screen.getByText(/Click the camera icon in your browser's address bar/)).toBeInTheDocument();
  });

  test('shows support contact information', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Email Support')).toBeInTheDocument();
    expect(screen.getByText('Copy Error Report')).toBeInTheDocument();
  });

  test('copies error report to clipboard', async () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    const copyButton = screen.getByText('Copy Error Report');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  test('closes dialog when close button is clicked', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('refreshes page when refresh button is clicked', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);

    expect(window.location.reload).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows camera and microphone troubleshooting steps', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Check device connections')).toBeInTheDocument();
    expect(screen.getByText('Close other applications')).toBeInTheDocument();
    expect(screen.getByText('Test in system settings')).toBeInTheDocument();
    expect(screen.getByText('Grant browser permissions')).toBeInTheDocument();
  });

  test('shows internet connection troubleshooting steps', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Test your internet speed')).toBeInTheDocument();
    expect(screen.getByText('Move closer to WiFi router')).toBeInTheDocument();
    expect(screen.getByText('Use wired connection')).toBeInTheDocument();
    expect(screen.getByText('Close bandwidth-heavy apps')).toBeInTheDocument();
  });

  test('shows browser data clearing steps', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText('Clear browser cache')).toBeInTheDocument();
    expect(screen.getByText('Clear cookies for this site')).toBeInTheDocument();
    expect(screen.getByText('Restart your browser')).toBeInTheDocument();
    expect(screen.getByText('Try incognito/private mode')).toBeInTheDocument();
  });

  test('shows additional resources links', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText(/Additional Resources:/)).toBeInTheDocument();
    expect(screen.getByText(/Quick Fixes Guide/)).toBeInTheDocument();
    expect(screen.getByText(/FAQ/)).toBeInTheDocument();
    expect(screen.getByText(/Complete Troubleshooting Guide/)).toBeInTheDocument();
  });

  test('advances through troubleshooting steps', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    // Mark first step as complete
    const firstCompleteButton = screen.getByText('Mark as Complete');
    fireEvent.click(firstCompleteButton);

    // Should show completed chip
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // Should advance to next step (Check Camera and Microphone should be active)
    expect(screen.getByText('Check Camera and Microphone')).toBeInTheDocument();
  });

  test('handles missing error gracefully', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={null}
        context={mockContext}
      />
    );

    // Should still render the guide
    expect(screen.getByText('Video Call Troubleshooting Guide')).toBeInTheDocument();
  });

  test('handles missing context gracefully', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={null}
      />
    );

    // Should still render the guide
    expect(screen.getByText('Video Call Troubleshooting Guide')).toBeInTheDocument();
  });

  test('shows warning alerts for important information', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText(/If you're using an external camera or microphone/)).toBeInTheDocument();
    expect(screen.getByText(/You may need to log in again after clearing cookies/)).toBeInTheDocument();
  });

  test('shows info alerts for helpful tips', () => {
    render(
      <TroubleshootingGuide
        open={true}
        onClose={mockOnClose}
        error={mockError}
        context={mockContext}
      />
    );

    expect(screen.getByText(/If your connection is slow, try turning off video/)).toBeInTheDocument();
  });
});