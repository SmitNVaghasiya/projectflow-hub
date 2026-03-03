/**
 * Database Layer Tests — ProjectHub Backend
 *
 * Verifies the database schema is correctly set up:
 * - Connection succeeds
 * - All required tables exist
 * - Required columns exist on each table
 * - Performance indexes are in place
 */

import pool from "../db.js";

afterAll(async () => {
    await pool.end();
});

// ─── Connection ───────────────────────────────────────────────────────────────
describe("Database Connection", () => {
    it("should connect to Neon PostgreSQL successfully", async () => {
        const client = await pool.connect();
        try {
            const result = await client.query("SELECT 1 AS ok");
            expect(result.rows[0].ok).toBe(1);
        } finally {
            client.release();
        }
    });
});

// ─── Table Existence ──────────────────────────────────────────────────────────
describe("Required Tables", () => {
    const REQUIRED_TABLES = ["users", "projects", "tasks", "otp_codes", "revoked_tokens"];

    test.each(REQUIRED_TABLES)("table '%s' should exist", async (tableName) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = $1
                ) AS exists
            `, [tableName]);
            expect(result.rows[0].exists).toBe(true);
        } finally {
            client.release();
        }
    });
});

// ─── Column Existence ─────────────────────────────────────────────────────────
describe("Required Columns", () => {
    const COLUMN_CHECKS = [
        { table: "users", column: "id" },
        { table: "users", column: "email" },
        { table: "users", column: "password_hash" },
        { table: "users", column: "display_name" },
        { table: "users", column: "email_verified" },
        { table: "users", column: "created_at" },
        { table: "projects", column: "id" },
        { table: "projects", column: "user_id" },
        { table: "projects", column: "name" },
        { table: "projects", column: "status" },
        { table: "projects", column: "priority" },
        { table: "projects", column: "due_date" },
        { table: "otp_codes", column: "email" },
        { table: "otp_codes", column: "code" },
        { table: "otp_codes", column: "expires_at" },
        { table: "otp_codes", column: "used" },
        { table: "revoked_tokens", column: "jti" },
    ];

    test.each(COLUMN_CHECKS)("$table.$column should exist", async ({ table, column }) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
                ) AS exists
            `, [table, column]);
            expect(result.rows[0].exists).toBe(true);
        } finally {
            client.release();
        }
    });
});

// ─── Index Existence ──────────────────────────────────────────────────────────
describe("Performance Indexes", () => {
    const REQUIRED_INDEXES = [
        "idx_projects_user_id",
        "idx_tasks_project_id",
        "idx_otp_email",
        "idx_revoked_tokens_jti",
    ];

    test.each(REQUIRED_INDEXES)("index '%s' should exist", async (indexName) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname = 'public' AND indexname = $1
                ) AS exists
            `, [indexName]);
            expect(result.rows[0].exists).toBe(true);
        } finally {
            client.release();
        }
    });
});
