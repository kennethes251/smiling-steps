import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PermissionRequestFlow from './PermissionRequestFlow';

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices
  }
});

// Mock navigator.permissions
const mockPermissionsQuery = jest.fn();
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: mockPermissionsQuery
  }
});

describe('PermissionRequestFlow', () => {
  const mockOnPermissionsGranted = jest.fn();
  const mockOnPermissionsDenied = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera1', label: 'Camera 1' },
      { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone 1' }
    ]);

    mockPermissionsQuery.mockImplementation((permission) => {
      return Promise.resolve({ state: 'prompt' });
    });
  });

  test('renders permission request interface', async () => {
    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    expect(screen.getByText('Camera & Microphone Access')).toBeInTheDocument();
    expect(screen.getByText('Permission Required')).toBeInTheDocument();
    expect(screen.getByText('Camera Access')).toBeInTheDocument();
    expect(screen.getByText('Microphone Access')).toBeInTheDocument();
  });

  test('shows device count information', async () => {
    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('1 camera(s) detected')).toBeInTheDocument();
      expect(screen.getByText('1 microphone(s) detected')).toBeInTheDocument();
    });
  });

  test('requests permissions when button is clicked', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    await waitFor(() => {
      expect(mockOnPermissionsGranted).toHaveBeenCalled();
    });
  });

  test('handles permission denial', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(permissionError);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(mockOnPermissionsDenied).toHaveBeenCalledWith(permissionError);
    });

    expect(screen.getByText(/Camera and microphone access was denied/)).toBeInTheDocument();
  });

  test('handles device not found error', async () => {
    const deviceError = new Error('Device not found');
    deviceError.name = 'NotFoundError';
    mockGetUserMedia.mockRejectedValue(deviceError);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/No camera or microphone was found/)).toBeInTheDocument();
    });
  });

  test('shows requesting state during permission request', async () => {
    let resolvePromise;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockGetUserMedia.mockReturnValue(pendingPromise);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    expect(screen.getByText('Requesting Access')).toBeInTheDocument();
    expect(screen.getByText('Please allow access to your camera and microphone when prompted by your browser.')).toBeInTheDocument();

    // Resolve the promise
    const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) };
    await act(async () => {
      resolvePromise(mockStream);
    });
  });

  test('shows success state when permissions are granted', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Ready to Join')).toBeInTheDocument();
      expect(screen.getByText('Permissions Granted!')).toBeInTheDocument();
    });
  });

  test('shows troubleshooting help after error', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(permissionError);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Having trouble? Try these steps:')).toBeInTheDocument();
      expect(screen.getByText(/Look for a camera\/microphone icon/)).toBeInTheDocument();
    });
  });

  test('allows retry after error', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(permissionError);

    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    
    await act(async () => {
      fireEvent.click(retryButton);
    });

    await waitFor(() => {
      expect(mockOnPermissionsGranted).toHaveBeenCalled();
    });
  });

  test('renders as card when showAsDialog is false', async () => {
    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
          showAsDialog={false}
        />
      );
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Camera & Microphone Access')).toBeInTheDocument();
  });

  test('closes dialog when close button is clicked', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
          showAsDialog={true}
        />
      );
    });

    // Grant permissions first to get to success state
    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Continue to Video Call')).toBeInTheDocument();
    });

    const continueButton = screen.getByText('Continue to Video Call');
    fireEvent.click(continueButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('checks existing permissions on mount', async () => {
    mockPermissionsQuery.mockImplementation((permission) => {
      if (permission.name === 'camera') {
        return Promise.resolve({ state: 'granted' });
      }
      if (permission.name === 'microphone') {
        return Promise.resolve({ state: 'granted' });
      }
      return Promise.resolve({ state: 'prompt' });
    });

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    await waitFor(() => {
      expect(mockOnPermissionsGranted).toHaveBeenCalled();
    });
  });

  test('handles permissions API not supported', async () => {
    // Mock permissions API not being available
    Object.defineProperty(navigator, 'permissions', {
      writable: true,
      value: undefined
    });

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    // Should still render the interface
    expect(screen.getByText('Permission Required')).toBeInTheDocument();
  });

  test('disables button during permission request', async () => {
    let resolvePromise;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockGetUserMedia.mockReturnValue(pendingPromise);

    await act(async () => {
      render(
        <PermissionRequestFlow
          onPermissionsGranted={mockOnPermissionsGranted}
          onPermissionsDenied={mockOnPermissionsDenied}
          onClose={mockOnClose}
        />
      );
    });

    const grantButton = screen.getByText('Grant Camera & Microphone Access');
    
    await act(async () => {
      fireEvent.click(grantButton);
    });

    expect(screen.getByText('Requesting Permissions...')).toBeInTheDocument();
    expect(screen.getByText('Requesting Permissions...')).toBeDisabled();

    // Resolve the promise
    const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) };
    await act(async () => {
      resolvePromise(mockStream);
    });
  });
});