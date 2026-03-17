/**
 * Backup & Restore Utilities
 *
 * Handles export/import of budget data as gzip-compressed JSON files.
 *
 * Features:
 * - Export: Fetch all budgets, compress to gzip, trigger download
 * - Import: Read gzip file, decompress, validate, and batch-write to Firestore
 * - Backward compatibility: Supports both new and legacy backup formats
 * - Error handling: Validates file format and Firestore operations
 *
 * Supported Formats:
 * 1. New Format: Structured backup with version, metadata, and budgets array
 * 2. Legacy Format: Plain JSON array of budget objects (with optional "spent" field)
 */

import { User } from 'firebase/auth';
import { Budget } from '../types';
import { getAllBudgets, addBudget } from '../db/firestore-db';
import { getLogger } from './logger';

const log = getLogger('Backup');

/**
 * Backup file format - budgets without id or userId (reconstructed on import)
 */
interface BackupData {
  version: string;
  exportedAt: string;
  userEmail: string;
  budgets: Array<Omit<Budget, 'id' | 'userId'>>;
}

/**
 * Legacy backup format - plain JSON array of budgets
 * (older export format with "spent" field)
 */
interface LegacyBudgetData {
  name: string;
  amount: number;
  spent?: number; // Legacy field - not used in new format
  frequency: 'Weekly' | 'Monthly' | 'Yearly';
  currency: 'USD' | 'IDR';
  createdAt: number;
  id?: string; // May or may not be present
  excludeWeekends?: boolean;
}

/**
 * Export all budgets as a gzip-compressed JSON file
 *
 * @param user Current authenticated user
 * @throws Error if export fails
 */
export async function exportBudgets(user: User): Promise<void> {
  try {
    const userId = user.uid;
    if (!userId) {
      throw new Error('User ID is required to export budgets');
    }

    log.info('Starting budget export...');

    // Fetch all budgets for the current user
    const budgets = await getAllBudgets(userId);
    log.info(`Fetched ${budgets.length} budgets for export`);

    // Create backup data object
    const backupData: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userEmail: user.email || 'unknown',
      budgets: budgets.map(({ id, userId, ...rest }) => rest),
    };

    // Convert to JSON
    const jsonString = JSON.stringify(backupData, null, 2);
    log.info(`Created JSON backup (${jsonString.length} bytes)`);

    // Compress using pako (gzip)
    // Note: pako needs to be imported at runtime due to dynamic import
    const pakoModule = await import('pako');
    const compressed = pakoModule.gzip(jsonString);
    log.info(`Compressed to gzip (${compressed.length} bytes)`);

    // Create blob and download
    const blob = new Blob([compressed], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-backup-${new Date().toISOString().split('T')[0]}.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    log.info('✅ Budget export completed successfully');
  } catch (error) {
    log.error('Failed to export budgets:', error);
    throw error;
  }
}

/**
 * Import budgets from a gzip-compressed JSON file
 *
 * Supports both new and legacy backup formats:
 * - New format: BackupData with version, exportedAt, userEmail, budgets[]
 * - Legacy format: Plain array of budget objects
 *
 * @param file The backup file to import
 * @param user Current authenticated user
 * @throws Error if import fails or file is invalid
 */
export async function importBudgets(file: File, user: User): Promise<number> {
  try {
    const userId = user.uid;
    if (!userId) {
      throw new Error('User ID is required to import budgets');
    }

    log.info('Starting budget import...');

    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    log.info(`Read file (${arrayBuffer.byteLength} bytes)`);

    // Decompress using pako
    const pakoModule = await import('pako');
    const decompressed = pakoModule.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
    log.info('Decompressed gzip data');

    // Parse JSON
    const parsedData = JSON.parse(decompressed);

    let budgetsToImport: Array<Omit<Budget, 'id' | 'createdAt'> & { createdAt?: number; spent?: number }> = [];

    // Detect format: new format has version property, legacy is plain array
    if (Array.isArray(parsedData)) {
      // Legacy format: plain array of budgets
      log.info('Detected legacy backup format (array)');
      budgetsToImport = parsedData.map((budget: LegacyBudgetData) => ({
        name: budget.name,
        amount: budget.amount,
        frequency: budget.frequency,
        currency: budget.currency,
        excludeWeekends: budget.excludeWeekends || false,
        userId, // Add current user's ID
      }));
    } else if (parsedData.version && Array.isArray(parsedData.budgets)) {
      // New format: BackupData structure
      log.info(`Detected new backup format - version: ${parsedData.version}`);
      budgetsToImport = parsedData.budgets.map((budget: any) => ({
        ...budget,
        userId, // Add current user's ID
      }));
    } else {
      throw new Error('Invalid backup file format: could not detect format');
    }

    // Import budgets
    let importedCount = 0;
    for (const budget of budgetsToImport) {
      try {
        // Remove createdAt and spent from backup, add current userId
        // (addBudget will set createdAt to serverTimestamp)
        const { createdAt: _oldCreatedAt, spent: _spent, ...budgetData } = budget;
        const budgetToAdd: Omit<Budget, 'id' | 'createdAt'> = {
          ...budgetData,
          userId, // Override with current user's ID
        };

        await addBudget(budgetToAdd);
        importedCount++;
        log.info(`✅ Imported budget: ${budget.name}`);
      } catch (err) {
        log.error(`Failed to import budget "${budget.name}":`, err);
        // Continue with next budget instead of failing the entire import
      }
    }

    log.info(`✅ Budget import completed - imported ${importedCount}/${budgetsToImport.length} budgets`);
    return importedCount;
  } catch (error) {
    log.error('Failed to import budgets:', error);
    throw error;
  }
}
