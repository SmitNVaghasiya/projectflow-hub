import 'dotenv/config';
import { getDb, query } from './api/db.js';

(async () => {
    try {
        const res = await query`SELECT * FROM users WHERE email = ${'depiwek651@pazuric.com'}`;
        console.log("USER RECORD:");
        console.log(JSON.stringify(res, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
