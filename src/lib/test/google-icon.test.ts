import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GoogleIcon } from '@/components/auth/GoogleIcon';

describe('GoogleIcon Component (Official Google Brand Guidelines)', () => {
  it('renders valid SVG with official viewBox 0 0 24 24', () => {
    const html = renderToString(React.createElement(GoogleIcon));
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders all four official Google brand colors (Red, Blue, Yellow, Green)', () => {
    const html = renderToString(React.createElement(GoogleIcon));
    expect(html).toContain('fill="#EA4335"'); // Google Red
    expect(html).toContain('fill="#4285F4"'); // Google Blue
    expect(html).toContain('fill="#FBBC05"'); // Google Yellow
    expect(html).toContain('fill="#34A853"'); // Google Green
  });

  it('renders custom size and title when provided', () => {
    const html = renderToString(
      React.createElement(GoogleIcon, { size: 24, title: 'Google Logo' })
    );
    expect(html).toContain('width:24px');
    expect(html).toContain('height:24px');
    expect(html).toContain('<title>Google Logo</title>');
    expect(html).toContain('role="img"');
  });

  it('contains the official Google G path geometry', () => {
    const html = renderToString(React.createElement(GoogleIcon));
    // Check key characteristic coordinates of the official Google G logo
    expect(html).toContain('M22.56 12.25'); // Blue crossbar start
    expect(html).toContain('M12 23c2.97 0'); // Green bottom base arc
    expect(html).toContain('M5.84 14.09'); // Yellow left arc
    expect(html).toContain('M12 5.38c1.62'); // Red top crown arc
  });
});
