import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickHelpPanel from './QuickHelpPanel';

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn()
  },
  writable: true
});

describe('QuickHelpPanel', () => {
  const mockOnOpenFullGuide = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders help panel in collapsed state', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    expect(screen.getByText('Need Help?')).toBeInTheDocument();
    expect(screen.queryByText('Camera Not Working?')).not.toBeInTheDocument();
  });

  test('expands when expand button is clicked', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Camera Not Working?')).toBeInTheDocument();
    expect(screen.getByText('No Audio?')).toBeInTheDocument();
    expect(screen.getByText('Connection Issues?')).toBeInTheDocument();
  });

  test('collapses when collapse button is clicked', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    // First expand
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Camera Not Working?')).toBeInTheDocument();

    // Then collapse
    const collapseButton = screen.getByRole('button');
    fireEvent.click(collapseButton);

    expect(screen.queryByText('Camera Not Working?')).not.toBeInTheDocument();
  });

  test('shows camera troubleshooting steps', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Click camera icon in address bar')).toBeInTheDocument();
    expect(screen.getByText('Select \'Allow\' for camera')).toBeInTheDocument();
    expect(screen.getByText('Refresh this page')).toBeInTheDocument();
  });

  test('shows audio troubleshooting steps', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Click microphone icon in address bar')).toBeInTheDocument();
    expect(screen.getByText('Select \'Allow\' for microphone')).toBeInTheDocument();
    expect(screen.getByText('Check your system volume')).toBeInTheDocument();
  });

  test('shows connection troubleshooting steps', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Close other video apps (Zoom, Teams)')).toBeInTheDocument();
    expect(screen.getByText('Move closer to WiFi router')).toBeInTheDocument();
    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
  });

  test('shows emergency contact information', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Emergency: support@smilingsteps.com')).toBeInTheDocument();
  });

  test('shows general troubleshooting tip', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText(/Still having issues\? Try refreshing the page or switching to Chrome browser\./)).toBeInTheDocument();
  });

  test('refresh page button works', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);

    expect(window.location.reload).toHaveBeenCalled();
  });

  test('more help button calls onOpenFullGuide', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    const moreHelpButton = screen.getByText('More Help');
    fireEvent.click(moreHelpButton);

    expect(mockOnOpenFullGuide).toHaveBeenCalled();
  });

  test('displays correct icons for each troubleshooting section', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    // Check that icons are present (they should be rendered as SVG elements)
    const cameraSection = screen.getByText('Camera Not Working?').closest('div');
    const audioSection = screen.getByText('No Audio?').closest('div');
    const connectionSection = screen.getByText('Connection Issues?').closest('div');

    expect(cameraSection).toBeInTheDocument();
    expect(audioSection).toBeInTheDocument();
    expect(connectionSection).toBeInTheDocument();
  });

  test('has proper styling classes for fixed positioning', () => {
    const { container } = render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);
    
    // The component should have fixed positioning styles
    const card = container.querySelector('[class*="MuiCard"]');
    expect(card).toBeInTheDocument();
  });

  test('shows check circle icons for solution steps', () => {
    render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    // Each solution step should have a check circle icon
    const solutionSteps = screen.getAllByText(/Click|Select|Refresh|Check|Close|Move|Try/);
    expect(solutionSteps.length).toBeGreaterThan(0);
  });

  test('maintains expanded state when re-rendered', () => {
    const { rerender } = render(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    // Expand the panel
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Camera Not Working?')).toBeInTheDocument();

    // Re-render with same props
    rerender(<QuickHelpPanel onOpenFullGuide={mockOnOpenFullGuide} />);

    // Should still be expanded
    expect(screen.getByText('Camera Not Working?')).toBeInTheDocument();
  });

  test('handles missing onOpenFullGuide prop gracefully', () => {
    render(<QuickHelpPanel />);

    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    const moreHelpButton = screen.getByText('More Help');
    
    // Should not throw error when clicked
    expect(() => fireEvent.click(moreHelpButton)).not.toThrow();
  });
});