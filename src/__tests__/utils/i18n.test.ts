/**
 * Tests for i18n (Internationalization) Utilities
 *
 * Validates:
 * - Translation key types
 * - Language availability
 * - Translation completeness
 */

import { describe, it, expect } from 'vitest';
import { translations, type TranslationKeys } from '../../utils/i18n';

describe('i18n Utilities', () => {
  describe('translations object', () => {
    it('should have en and id language objects', () => {
      expect(translations).toHaveProperty('en');
      expect(translations).toHaveProperty('id');
    });

    it('should have matching keys in en and id', () => {
      const enKeys = Object.keys(translations.en);
      const idKeys = Object.keys(translations.id);

      // All English keys should have Indonesian translations
      enKeys.forEach((key) => {
        expect(idKeys).toContain(key);
      });

      // All Indonesian keys should have English translations
      idKeys.forEach((key) => {
        expect(enKeys).toContain(key);
      });
    });

    it('should have no empty translation values', () => {
      Object.entries(translations.en).forEach(([key, value]) => {
        expect(value).not.toBe('');
        expect(typeof value).toBe('string');
      });

      Object.entries(translations.id).forEach(([key, value]) => {
        expect(value).not.toBe('');
        expect(typeof value).toBe('string');
      });
    });

    it('should include common UI keys', () => {
      const commonKeys: TranslationKeys[] = [
        'home',
        'settings',
        'budgets',
        'login',
        'logout',
        'cancel',
        'delete',
      ];

      commonKeys.forEach((key) => {
        expect(translations.en).toHaveProperty(key);
        expect(translations.id).toHaveProperty(key);
      });
    });
  });

  describe('TranslationKeys type', () => {
    it('should represent valid translation keys', () => {
      const validKey: TranslationKeys = 'home';
      expect(validKey).toBe('home');
    });
  });
});
