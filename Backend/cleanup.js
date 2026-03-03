import db from "./db.js";

// Delete test projects
db.prepare("DELETE FROM projects WHERE name = 'Test Project' OR name = 'Browser Test Project'").run();

const remaining = db.prepare("SELECT name, priority, status FROM projects ORDER BY created_at DESC").all();
console.log(`Projects (${remaining.length}):`);
remaining.forEach((p, i) => console.log(`  ${i + 1}. [${p.priority}] ${p.name} (${p.status})`));
