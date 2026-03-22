# 🧪 ProjectHub Backend Testing Guide

Welcome to the testing guide! This file is written in **simple words** to help you understand how testing works in this backend, what each file does, and how you can add new test files as you build more features.

## 🚀 How to Run the Tests

To test the backend, open your terminal (make sure you are inside the `Backend` folder) and simply run:
```bash
npm run test
``` 22/03/2026
> **Current Result: ✅ 53/53 tests passing across 3 test suites.**

If you want to see a detailed report of exactly which lines of code were tested (a "coverage" report), run:
```bash
npm run test:coverage
```

### ⚙️ How the Test Command Works
The test script has a few important pieces:
```
cross-env NODE_ENV=test   → Sets environment to "test" (disables rate limiters)
--runInBand               → Runs tests sequentially (not parallel) to avoid DB conflicts
--forceExit               → Forces Jest to close after tests (DB pool stays alive otherwise)
```

---

## 📂 What Each Test File Does

All of our automated tests live inside the `tests/` folder. Here is the breakdown:

### 1. `tests/db.test.js` (The Database Setup Test)
*   **What it does:** This file purely tests if the backend can successfully connect to your Neon PostgreSQL database.
*   **Why it matters:** If this test fails, it means your database credentials in the `.env` file are wrong, or the database is currently offline.

### 2. `tests/auth.test.js` (The Login & Security Test)
*   **What it does:** This file acts like a fake user. It tries to sign up, verify an OTP, log in to get a token, and log out. It also tests bad behavior (like entering wrong passwords or invalid emails) to make sure the backend correctly stops them.
*   **Why it matters:** It guarantees your app is completely secure and nobody can bypass your login system.

### 3. `tests/projects.test.js` (The Project Module Test)
*   **What it does:** This file logs in as a user and tries to create, fetch, update, and delete projects. It tests the core rule: **You cannot see or delete someone else's project.**
*   **Why it matters:** It ensures your main app features work flawlessly before you connect them to the React frontend.

---

## 🔒 Why Rate Limiters Don't Block Tests

All production rate limiters (auth limits, daily quotas) include this line:
```javascript
skip: () => process.env.NODE_ENV === "test"
```
This is a **permanent, industry-standard pattern** — NOT a temporary workaround. In production and development, the limiters run normally. During `npm run test`, they are skipped so the fast-running tests don't hit 429 false failures. **Never remove these lines.**

---

## ✨ How to Add New Tests for New Features

Whenever you build a new route or feature (for example, if you wanted to heavily test the Kanban boards in a new file), you should create a test file for it so you can verify it automatically!

### Step-by-step:
1.  **Create a new file**: In the `tests/` folder, create a file named after the feature, for example: `tasks.test.js` or `comments.test.js`.
2.  **Copy a template**: The easiest trick is to open `projects.test.js` and copy the top few lines (the imports and the `beforeAll` database logic).
3.  **Write a test using `supertest`**: The `supertest` library acts exactly like your frontend clicking buttons. You tell it to send data, and see what comes back.
    
    \`\`\`javascript
    import request from "supertest";
    import app from "../app.js";

    test("It should create a new task correctly", async () => {
        const response = await request(app)
            .post("/api/projects/123/tasks")
            .set("Authorization", "Bearer YOUR_TEST_TOKEN") // Fake login
            .send({ content: "Buy milk", priority: "high" }); // Data you send

        // We EXPECT the backend to reply with a 201 Created status!
        expect(response.statusCode).toBe(201);
    });
    \`\`\`
4.  **Update this guide!** Once you create a new test file, come right back to this `TESTING.md` file and add it to the list above so you never lose track of what it does!
