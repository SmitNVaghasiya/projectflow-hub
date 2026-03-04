import pool from './db.js';

async function run() {
    try {
        const result = await pool.query("SELECT id, project_id, user_id, role FROM project_members;");
        console.log("PROJECT MEMBERS:");
        console.dir(result.rows, { depth: null });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
