import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("channel_binding");
console.log("Host:", url.hostname);

const sql = neon(url.toString());

try {
    const result = await sql`SELECT 1 as test`;
    console.log("SUCCESS:", JSON.stringify(result));
} catch (e) {
    console.error("ERROR:", e.message);
}

process.exit(0);
