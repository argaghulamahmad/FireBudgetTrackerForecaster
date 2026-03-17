/**
 * Tests for Currency Utilities
 *
 * Validates:
 * - Currency formatting
 * - Symbol retrieval
 * - Input parsing
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';

describe('Currency Utilities', () => {
  describe('getCurrencySymbol', () => {
    it('should return $ for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('should return Rp for IDR', () => {
      expect(getCurrencySymbol('IDR')).toBe('Rp');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    });

    it('should format IDR with Rp symbol', () => {
      const formatted = formatCurrency(1000000, 'IDR');
      expect(formatted).toContain('Rp');
      expect(formatted).toContain('1');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('should handle small decimal amounts', () => {
      expect(formatCurrency(10.5, 'USD')).toBe('$10.50');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
    });
  });
});
