/**
 * Migration safety tests: verify that the Issue Memory migration is additive-only.
 * Tests for DROP TABLE, DROP COLUMN, ALTER TYPE, and other destructive patterns.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');

function getMigrationFolders(): string[] {
  const entries = readdirSync(MIGRATIONS_DIR);
  return entries
    .filter((name) => {
      const fullPath = join(MIGRATIONS_DIR, name);
      return statSync(fullPath).isDirectory() && /^\d{14}_/.test(name);
    })
    .sort();
}

function readMigrationSql(folder: string): string {
  const sqlPath = join(MIGRATIONS_DIR, folder, 'migration.sql');
  try {
    return readFileSync(sqlPath, 'utf-8');
  } catch {
    return '';
  }
}

describe('Migration Safety Tests', () => {
  it('should have at least one migration', () => {
    const folders = getMigrationFolders();
    assert.ok(folders.length > 0, 'Expected at least one migration folder');
  });

  it('os_issue_memory migration should be additive only', () => {
    const migrationFolder = '20260919120000_os_issue_memory';
    const sql = readMigrationSql(migrationFolder);

    assert.ok(sql.length > 0, `Migration ${migrationFolder} should exist`);

    // Should have CREATE TABLE statements for all new tables
    assert.ok(/CREATE TABLE os_issues\b/i.test(sql), 'Should create os_issues table');
    assert.ok(/CREATE TABLE os_issue_references\b/i.test(sql), 'Should create os_issue_references table');
    assert.ok(
      /CREATE TABLE os_issue_journal_entries\b/i.test(sql),
      'Should create os_issue_journal_entries table',
    );
    assert.ok(/CREATE TABLE os_issue_work_links\b/i.test(sql), 'Should create os_issue_work_links table');
    assert.ok(/CREATE TABLE os_issue_relations\b/i.test(sql), 'Should create os_issue_relations table');
    assert.ok(
      /CREATE TABLE os_issue_resolution_cycles\b/i.test(sql),
      'Should create os_issue_resolution_cycles table',
    );
    assert.ok(/CREATE TABLE os_product_feedback\b/i.test(sql), 'Should create os_product_feedback table');
    assert.ok(
      /CREATE TABLE os_issue_ownership_history\b/i.test(sql),
      'Should create os_issue_ownership_history table',
    );

    // Should use ADD COLUMN IF NOT EXISTS for the commitment column
    assert.ok(
      /ADD COLUMN IF NOT EXISTS fulfilled_by_member_id/i.test(sql),
      'Should add fulfilled_by_member_id column using IF NOT EXISTS',
    );

    // Should NOT contain DROP statements (check actual SQL statements, not comments)
    // Filter to non-comment lines for destructive pattern checks
    const sqlLines = sql.split('\n').filter((line) => !line.trim().startsWith('--'));
    const sqlWithoutComments = sqlLines.join('\n');

    assert.ok(!/\bDROP\s+TABLE\b/i.test(sqlWithoutComments), 'Should not contain DROP TABLE');
    assert.ok(!/\bDROP\s+COLUMN\b/i.test(sqlWithoutComments), 'Should not contain DROP COLUMN');
    assert.ok(!/\bALTER\s+COLUMN\s+\w+\s+TYPE\b/i.test(sqlWithoutComments), 'Should not contain ALTER COLUMN TYPE');
    assert.ok(!/\bTRUNCATE\b/i.test(sqlWithoutComments), 'Should not contain TRUNCATE');
    assert.ok(!/\bDELETE\s+FROM\b/i.test(sqlWithoutComments), 'Should not contain DELETE FROM');
    assert.ok(!/\bUPDATE\s+\w+\s+SET\b/i.test(sqlWithoutComments), 'Should not contain UPDATE SET');
  });

  it('os_issue_memory migration should have proper foreign keys', () => {
    const migrationFolder = '20260919120000_os_issue_memory';
    const sql = readMigrationSql(migrationFolder);

    // Count REFERENCES os_organizations
    const fkMatches = sql.match(/REFERENCES os_organizations/gi) || [];
    // We have 8 tables: issues, references, journal entries, work links, relations, resolution cycles, product feedback, ownership history
    assert.ok(
      fkMatches.length >= 8,
      `Expected at least 8 foreign keys to os_organizations, found ${fkMatches.length}`,
    );

    // Check foreign keys to os_issues
    const issueFkMatches = sql.match(/REFERENCES os_issues/gi) || [];
    // journal entries, references, work links, relations (2x from/to), resolution cycles, ownership history = 8
    assert.ok(
      issueFkMatches.length >= 7,
      `Expected at least 7 foreign keys to os_issues, found ${issueFkMatches.length}`,
    );
  });

  it('os_issue_memory migration should have proper indexes', () => {
    const migrationFolder = '20260919120000_os_issue_memory';
    const sql = readMigrationSql(migrationFolder);

    // Check for key indexes
    assert.ok(/CREATE INDEX os_issues_org_status_idx/i.test(sql), 'Should have org+status index on issues');
    assert.ok(/CREATE INDEX os_issues_org_owner_idx/i.test(sql), 'Should have org+owner index on issues');
    assert.ok(/CREATE INDEX os_product_feedback_org_created_idx/i.test(sql), 'Should have org+created index on feedback');
  });
});
