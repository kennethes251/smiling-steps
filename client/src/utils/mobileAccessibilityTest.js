/**
 * Mobile Accessibility Testing Utilities
 * Validates CTA touch target sizes and spacing across mobile viewports
 * Requirements: 3.3 - Mobile-first CTA accessibility
 */

import { mobileAccessibility } from './designSystem';

/**
 * Test if an element meets minimum touch target requirements
 * @param {HTMLElement} element - The element to test
 * @returns {Object} Test results with pass/fail status
 */
export const testTouchTargetSize = (element) => {
  if (!element) {
    return { pass: false, error: 'Element not found' };
  }

  const rect = element.getBoundingClientRect();
  const minSize = mobileAccessibility.touchTarget.minimum;
  
  const results = {
    width: rect.width,
    height: rect.height,
    minRequired: minSize,
    widthPass: rect.width >= minSize,
    heightPass: rect.height >= minSize,
    pass: rect.width >= minSize && rect.height >= minSize
  };

  return results;
};

/**
 * Test spacing between touch targets
 * @param {HTMLElement[]} elements - Array of elements to test spacing
 * @returns {Object} Spacing test results
 */
export const testTouchTargetSpacing = (elements) => {
  if (!elements || elements.length < 2) {
    return { pass: false, error: 'Need at least 2 elements to test spacing' };
  }

  const minSpacing = mobileAccessibility.touchTarget.spacing;
  const results = [];

  for (let i = 0; i < elements.length - 1; i++) {
    const rect1 = elements[i].getBoundingClientRect();
    const rect2 = elements[i + 1].getBoundingClientRect();
    
    // Calculate distance between elements
    const horizontalDistance = Math.abs(rect2.left - rect1.right);
    const verticalDistance = Math.abs(rect2.top - rect1.bottom);
    
    // Use the smaller distance (elements could be side by side or stacked)
    const actualSpacing = Math.min(horizontalDistance, verticalDistance);
    
    results.push({
      elementIndex: i,
      spacing: actualSpacing,
      minRequired: minSpacing,
      pass: actualSpacing >= minSpacing
    });
  }

  return {
    results,
    pass: results.every(result => result.pass)
  };
};

/**
 * Test CTA accessibility across different viewport sizes
 * @param {string} ctaSelector - CSS selector for CTA elements
 * @returns {Promise<Object>} Test results for different viewports
 */
export const testCTAAccessibilityAcrossViewports = async (ctaSelector = '[data-testid="cta-button"]') => {
  const viewports = mobileAccessibility.viewports;
  const results = {};

  // Test mobile viewports
  for (const [size, width] of Object.entries(viewports.mobile)) {
    // Simulate viewport resize (in a real test environment)
    // This would be done with testing tools like Cypress or Playwright
    results[`mobile_${size}`] = {
      viewport: width,
      // In actual implementation, would test at this viewport size
      touchTargets: await testCTAsAtViewport(ctaSelector, width)
    };
  }

  return results;
};

/**
 * Helper function to test CTAs at specific viewport
 * @param {string} selector - CTA selector
 * @param {string} viewportWidth - Viewport width to test
 * @returns {Promise<Object>} Test results
 */
const testCTAsAtViewport = async (selector, viewportWidth) => {
  // In a real test environment, this would:
  // 1. Set viewport to specified width
  // 2. Find all CTA elements
  // 3. Test each for touch target size and spacing
  // 4. Return comprehensive results
  
  const elements = document.querySelectorAll(selector);
  const touchTargetResults = Array.from(elements).map(testTouchTargetSize);
  const spacingResults = testTouchTargetSpacing(Array.from(elements));

  return {
    elementCount: elements.length,
    touchTargetResults,
    spacingResults,
    allPass: touchTargetResults.every(r => r.pass) && spacingResults.pass
  };
};

/**
 * Validate focus indicators for accessibility
 * @param {HTMLElement} element - Element to test focus on
 * @returns {Object} Focus indicator test results
 */
export const testFocusIndicator = (element) => {
  if (!element) {
    return { pass: false, error: 'Element not found' };
  }

  // Simulate focus
  element.focus();
  
  const computedStyle = window.getComputedStyle(element, ':focus');
  const outline = computedStyle.outline;
  const outlineOffset = computedStyle.outlineOffset;

  return {
    hasOutline: outline && outline !== 'none',
    outline,
    outlineOffset,
    pass: outline && outline !== 'none' && outline.includes('3px')
  };
};

/**
 * Comprehensive CTA accessibility audit
 * @param {string} containerSelector - Container holding CTAs
 * @returns {Object} Complete accessibility audit results
 */
export const auditCTAAccessibility = (containerSelector = '[data-testid="cta-container"]') => {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return { pass: false, error: 'CTA container not found' };
  }

  const ctaElements = container.querySelectorAll('button, [role="button"]');
  
  const audit = {
    containerFound: true,
    ctaCount: ctaElements.length,
    touchTargetTests: Array.from(ctaElements).map(testTouchTargetSize),
    spacingTest: testTouchTargetSpacing(Array.from(ctaElements)),
    focusTests: Array.from(ctaElements).map(testFocusIndicator),
    ariaLabels: Array.from(ctaElements).map(el => ({
      hasAriaLabel: !!el.getAttribute('aria-label'),
      ariaLabel: el.getAttribute('aria-label'),
      textContent: el.textContent.trim()
    }))
  };

  // Calculate overall pass status
  audit.pass = (
    audit.touchTargetTests.every(t => t.pass) &&
    audit.spacingTest.pass &&
    audit.focusTests.every(t => t.pass) &&
    audit.ariaLabels.every(a => a.hasAriaLabel || a.textContent.length > 0)
  );

  return audit;
};

/**
 * Generate accessibility report
 * @param {Object} auditResults - Results from auditCTAAccessibility
 * @returns {string} Human-readable report
 */
export const generateAccessibilityReport = (auditResults) => {
  if (!auditResults.containerFound) {
    return 'ERROR: CTA container not found';
  }

  let report = `CTA Accessibility Audit Report\n`;
  report += `=====================================\n\n`;
  report += `CTAs Found: ${auditResults.ctaCount}\n`;
  report += `Overall Status: ${auditResults.pass ? 'PASS' : 'FAIL'}\n\n`;

  // Touch target results
  report += `Touch Target Tests:\n`;
  auditResults.touchTargetTests.forEach((test, index) => {
    report += `  CTA ${index + 1}: ${test.pass ? 'PASS' : 'FAIL'} `;
    report += `(${test.width}x${test.height}px, min: ${test.minRequired}px)\n`;
  });

  // Spacing results
  report += `\nSpacing Tests:\n`;
  report += `  Overall: ${auditResults.spacingTest.pass ? 'PASS' : 'FAIL'}\n`;
  if (auditResults.spacingTest.results) {
    auditResults.spacingTest.results.forEach((test, index) => {
      report += `  Gap ${index + 1}: ${test.pass ? 'PASS' : 'FAIL'} `;
      report += `(${test.spacing}px, min: ${test.minRequired}px)\n`;
    });
  }

  // Focus indicator results
  report += `\nFocus Indicator Tests:\n`;
  auditResults.focusTests.forEach((test, index) => {
    report += `  CTA ${index + 1}: ${test.pass ? 'PASS' : 'FAIL'} `;
    report += `(outline: ${test.outline || 'none'})\n`;
  });

  // Aria label results
  report += `\nAccessible Labels:\n`;
  auditResults.ariaLabels.forEach((label, index) => {
    const hasLabel = label.hasAriaLabel || label.textContent.length > 0;
    report += `  CTA ${index + 1}: ${hasLabel ? 'PASS' : 'FAIL'} `;
    report += `(${label.ariaLabel || label.textContent || 'No label'})\n`;
  });

  return report;
};

export default {
  testTouchTargetSize,
  testTouchTargetSpacing,
  testCTAAccessibilityAcrossViewports,
  testFocusIndicator,
  auditCTAAccessibility,
  generateAccessibilityReport
};