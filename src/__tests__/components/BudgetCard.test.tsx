/**
 * Tests for BudgetCard Component
 *
 * Validates:
 * - Component rendering with various props
 * - Callback handlers (onDelete, onEdit)
 * - View mode variations (compact vs detailed)
 * - Proper display of budget information
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetCard } from '../../components/BudgetCard';
import { PreferencesProvider } from '../../context/PreferencesContext';
import { Budget } from '../../types';
import { translations } from '../../utils/i18n';

const mockBudget: Budget = {
  id: '1',
  userId: 'user123',
  name: 'Groceries',
  amount: 500,
  frequency: 'Monthly',
  currency: 'USD',
  excludeWeekends: false,
  createdAt: new Date('2026-01-01').getTime(),
};

const mockTranslations = translations.en;

// Helper to wrap component with PreferencesProvider
const renderWithPreferences = (component: React.ReactElement) => {
  return render(
    <PreferencesProvider
      currency="USD"
      language="en"
      viewMode="detailed"
      onCurrencyChange={vi.fn()}
      onLanguageChange={vi.fn()}
      onViewModeChange={vi.fn()}
    >
      {component}
    </PreferencesProvider>
  );
};

describe('BudgetCard Component', () => {
  it('should render budget name', () => {
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    renderWithPreferences(
      <BudgetCard
        budget={mockBudget}
        t={mockTranslations}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        onUpdateBalance={vi.fn()}
      />
    );

    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('should render frequency badge', () => {
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    renderWithPreferences(
      <BudgetCard
        budget={mockBudget}
        t={mockTranslations}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        onUpdateBalance={vi.fn()}
      />
    );

    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    renderWithPreferences(
      <BudgetCard
        budget={mockBudget}
        t={mockTranslations}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        onUpdateBalance={vi.fn()}
      />
    );

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons[0]; // First button is edit

    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockBudget);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    renderWithPreferences(
      <BudgetCard
        budget={mockBudget}
        t={mockTranslations}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        onUpdateBalance={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons[1]; // Second button is delete

    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockBudget.id);
  });

  it('should render in compact view mode', () => {
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    render(
      <PreferencesProvider
        currency="USD"
        language="en"
        viewMode="compact"
        onCurrencyChange={vi.fn()}
        onLanguageChange={vi.fn()}
        onViewModeChange={vi.fn()}
      >
        <BudgetCard
          budget={mockBudget}
          t={mockTranslations}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
          onUpdateBalance={vi.fn()}
        />
      </PreferencesProvider>
    );

    // Compact view should have fewer elements
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    // In compact mode, some detailed info is hidden
  });
});
