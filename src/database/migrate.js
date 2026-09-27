/**
 * A24by7 Database Migration Runner
 * Target: MySQL 8+
 *
 * Migrations:
 *   001_create_auth_schema.sql
 *   002_create_news_and_cricket_schema.sql
 *
 * The GoDaddy Hosted Database is already provisioned.
 * This script only applies and verifies the application schema.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS = [
  '001_create_auth_schema.sql',
  '002_create_news_and_cricket_schema.sql',
];

const REQUIRED_TABLES = [
  // Authentication
  'users',
  'email_verification_tokens',
  'password_reset_tokens',
  'sessions',

  // News
  'news_categories',
  'news_sources',
  'news_articles',
  'news_article_categories',
  'news_tags',
  'news_article_tags',

  // Cricket
  'cricket_series',
  'cricket_venues',
  'cricket_teams',
  'cricket_players',
  'cricket_team_players',
  'cricket_matches',
  'cricket_match_teams',
  'cricket_match_players',
  'cricket_innings',
  'cricket_batting',
  'cricket_bowling',
  'cricket_deliveries',
];

async function runMigration() {
  const targetDb = env.db.database || 'a24by7_dev';

  console.log(
    `[MIGRATE] Connecting to MySQL database "${targetDb}"...`
  );

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: targetDb,
    connectTimeout: env.db.connectionTimeoutMillis,
  });

  try {
    console.log(
      `[MIGRATE] Connected to "${targetDb}".`
    );

    // ========================================================================
    // Apply migrations in order
    // ========================================================================

    for (const migrationFile of MIGRATIONS) {
      const migrationPath = path.join(
        __dirname,
        'migrations',
        migrationFile
      );

      if (!fs.existsSync(migrationPath)) {
        throw new Error(
          `Migration file not found: ${migrationFile}`
        );
      }

      console.log(
        `\n[MIGRATE] Applying ${migrationFile}...`
      );

      const migrationSql = fs.readFileSync(
        migrationPath,
        'utf8'
      );

      /*
       * Each migration may contain multiple SQL statements.
       * multipleStatements is enabled ONLY for the migration connection.
       * The normal application database pool remains protected.
       */
      const migrationConnection = await mysql.createConnection({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        database: targetDb,
        connectTimeout: env.db.connectionTimeoutMillis,
        multipleStatements: true,
      });

      try {
        await migrationConnection.query(migrationSql);
      } finally {
        await migrationConnection.end();
      }

      console.log(
        `[MIGRATE] ${migrationFile} applied successfully.`
      );
    }

    // ========================================================================
    // Verify tables
    // ========================================================================

    console.log('\n[MIGRATE] Verifying database tables...');

    const [tables] = await connection.execute(
      `
      SELECT TABLE_NAME AS table_name
      FROM information_schema.tables
      WHERE table_schema = ?
        AND table_type = 'BASE TABLE'
        AND table_name IN (${REQUIRED_TABLES.map(() => '?').join(', ')})
      ORDER BY table_name;
      `,
      [targetDb, ...REQUIRED_TABLES]
    );

    const foundTables = tables.map(
      (row) => row.table_name
    );

    console.log(
      `[MIGRATE] Found ${foundTables.length}/${REQUIRED_TABLES.length} required tables.`
    );

    const missingTables = REQUIRED_TABLES.filter(
      (table) => !foundTables.includes(table)
    );

    if (missingTables.length > 0) {
      throw new Error(
        `Schema verification failed. Missing tables: ${missingTables.join(', ')}`
      );
    }

    // ========================================================================
    // Print table groups
    // ========================================================================

    const authTables = [
      'users',
      'email_verification_tokens',
      'password_reset_tokens',
      'sessions',
    ];

    const newsTables = [
      'news_categories',
      'news_sources',
      'news_articles',
      'news_article_categories',
      'news_tags',
      'news_article_tags',
    ];

    const cricketTables = [
      'cricket_series',
      'cricket_venues',
      'cricket_teams',
      'cricket_players',
      'cricket_team_players',
      'cricket_matches',
      'cricket_match_teams',
      'cricket_match_players',
      'cricket_innings',
      'cricket_batting',
      'cricket_bowling',
      'cricket_deliveries',
    ];

    console.log('\n[MIGRATE] Authentication tables:');
    authTables.forEach((table) => {
      console.log(`  ✓ ${table}`);
    });

    console.log('\n[MIGRATE] News tables:');
    newsTables.forEach((table) => {
      console.log(`  ✓ ${table}`);
    });

    console.log('\n[MIGRATE] Cricket tables:');
    cricketTables.forEach((table) => {
      console.log(`  ✓ ${table}`);
    });

    // ========================================================================
    // Verify Foreign Keys
    // ========================================================================

    console.log('\n[MIGRATE] Verifying foreign keys...');

    const [foreignKeys] = await connection.execute(
      `
      SELECT
        kcu.TABLE_NAME AS table_name,
        kcu.COLUMN_NAME AS column_name,
        kcu.REFERENCED_TABLE_NAME AS foreign_table_name,
        kcu.REFERENCED_COLUMN_NAME AS foreign_column_name,
        rc.DELETE_RULE AS delete_rule
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc
        ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND rc.TABLE_NAME = kcu.TABLE_NAME
      WHERE kcu.CONSTRAINT_SCHEMA = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY
        kcu.TABLE_NAME,
        kcu.COLUMN_NAME;
      `,
      [targetDb]
    );

    foreignKeys.forEach((row) => {
      console.log(
        `  ✓ ${row.table_name}.${row.column_name} -> ` +
        `${row.foreign_table_name}.${row.foreign_column_name} ` +
        `(${row.delete_rule})`
      );
    });

    // ========================================================================
    // Final verification
    // ========================================================================

    console.log('\n[MIGRATE] ====================================================');
    console.log('[MIGRATE] DATABASE MIGRATION COMPLETED SUCCESSFULLY');
    console.log('[MIGRATE] ====================================================');
    console.log(
      `[MIGRATE] Verified ${foundTables.length}/${REQUIRED_TABLES.length} tables.`
    );
    console.log('[MIGRATE] Authentication: 4 tables');
    console.log('[MIGRATE] News: 6 tables');
    console.log('[MIGRATE] Cricket: 12 tables');
    console.log('[MIGRATE] ====================================================');

    return {
      success: true,
      migrations: MIGRATIONS,
      tables: foundTables,
      foreignKeys,
    };
  } finally {
    await connection.end();
  }
}

async function main() {
  try {
    await runMigration();
  } catch (err) {
    console.error(
      '\n[MIGRATE_FATAL] Migration failed:',
      err.message
    );

    process.exit(1);
  }
}

main();