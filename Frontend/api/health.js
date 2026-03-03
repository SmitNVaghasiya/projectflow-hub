import { cors } from "./middleware/auth.js";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
}
