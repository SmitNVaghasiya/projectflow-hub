import 'dotenv/config';
import { getDb, query } from './api/db.js';

(async () => {
    try {
        // Verify smitvaghasiya11280@gmail.com
        await query`UPDATE users SET email_verified = TRUE WHERE email = ${'smitvaghasiya11280@gmail.com'}`;
        console.log("✅ Marked smitvaghasiya11280@gmail.com as verified");

        // Verify jetski123@test.com too
        await query`UPDATE users SET email_verified = TRUE WHERE email = ${'jetski123@test.com'}`;
        console.log("✅ Marked jetski123@test.com as verified");

        // Verify all remaining users
        await query`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE`;
        console.log("✅ Marked ALL existing users as verified (migration)");

        // Confirm
        const users = await query`SELECT email, email_verified FROM users`;
        console.log("\nAll users now:");
        console.log(JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
