/**
 * Projects Route Tests — ProjectHub Backend
 *
 * Tests CRUD operations on projects with a focus on:
 * - User isolation (User A cannot see/edit/delete User B's projects)
 * - Input validation (zod schema enforcement)
 * - Auth protection (all routes require a valid JWT)
 */

import request from "supertest";
import pool from "../db.js";
import { signToken } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import app from "../app.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createUser(email) {
    const client = await pool.connect();
    try {
        const id = uuidv4();
        const hash = await bcrypt.hash("TestPassword123!", 12);
        await client.query(
            "INSERT INTO users (id, email, password_hash, email_verified) VALUES ($1, $2, $3, TRUE)",
            [id, email, hash]
        );
        return { id, email, token: signToken({ id, email }) };
    } finally {
        client.release();
    }
}

async function deleteUser(id) {
    const client = await pool.connect();
    try {
        await client.query("DELETE FROM users WHERE id = $1", [id]);
    } finally {
        client.release();
    }
}

// ─── GET /api/projects ────────────────────────────────────────────────────────
describe("GET /api/projects", () => {
    let userA;

    beforeAll(async () => {
        userA = await createUser(`ga_${Date.now()}@test.com`);
    });
    afterAll(async () => await deleteUser(userA.id));

    it("should return 401 without an auth token", async () => {
        const res = await request(app).get("/api/projects");
        expect(res.status).toBe(401);
    });

    it("should return 200 and empty array for a new user with no projects", async () => {
        const res = await request(app)
            .get("/api/projects")
            .set("Authorization", `Bearer ${userA.token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });

    it("should return only the authenticated user's projects (isolation)", async () => {
        const userB = await createUser(`gb_${Date.now()}@test.com`);

        // Create project for userB
        await request(app)
            .post("/api/projects")
            .set("Authorization", `Bearer ${userB.token}`)
            .send({ name: "User B Project" });

        // userA should see 0 projects
        const res = await request(app)
            .get("/api/projects")
            .set("Authorization", `Bearer ${userA.token}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);

        await deleteUser(userB.id);
    });
});

// ─── POST /api/projects ──────────────────────────────────────────────────────
describe("POST /api/projects", () => {
    let user;

    beforeAll(async () => {
        user = await createUser(`pc_${Date.now()}@test.com`);
    });
    afterAll(async () => await deleteUser(user.id));

    it("should create a project and return 201 with project data", async () => {
        const res = await request(app)
            .post("/api/projects")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ name: "My Test Project", description: "A test", priority: "high" });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe("My Test Project");
        expect(res.body.priority).toBe("high");
        expect(res.body.user_id).toBe(user.id);
    });

    it("should return 400 when project name is missing", async () => {
        const res = await request(app)
            .post("/api/projects")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ description: "No name provided" });
        expect(res.status).toBe(400);
    });

    it("should return 400 for invalid priority value", async () => {
        const res = await request(app)
            .post("/api/projects")
            .set("Authorization", `Bearer ${user.token}`)
            .send({ name: "Bad Priority", priority: "critical" });
        expect(res.status).toBe(400);
    });
});

// ─── PUT /api/projects/:id ───────────────────────────────────────────────────
describe("PUT /api/projects/:id", () => {
    let userA, userB, projectId;

    beforeAll(async () => {
        userA = await createUser(`pu_a_${Date.now()}@test.com`);
        userB = await createUser(`pu_b_${Date.now()}@test.com`);

        // Create a project for userA
        const res = await request(app)
            .post("/api/projects")
            .set("Authorization", `Bearer ${userA.token}`)
            .send({ name: "UserA Project" });
        projectId = res.body.id;
    });
    afterAll(async () => {
        await deleteUser(userA.id);
        await deleteUser(userB.id);
    });

    it("should update owner's own project and return 200", async () => {
        const res = await request(app)
            .put(`/api/projects/${projectId}`)
            .set("Authorization", `Bearer ${userA.token}`)
            .send({ name: "Updated Name", status: "in_progress" });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Updated Name");
        expect(res.body.status).toBe("in_progress");
    });

    it("should return 403 when userB tries to edit userA's project", async () => {
        const res = await request(app)
            .put(`/api/projects/${projectId}`)
            .set("Authorization", `Bearer ${userB.token}`)
            .send({ name: "Stolen!" });
        expect(res.status).toBe(403);
    });
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
describe("DELETE /api/projects/:id", () => {
    let userA, userB, projectId;

    beforeAll(async () => {
        userA = await createUser(`del_a_${Date.now()}@test.com`);
        userB = await createUser(`del_b_${Date.now()}@test.com`);

        const res = await request(app)
            .post("/api/projects")
            .set("Authorization", `Bearer ${userA.token}`)
            .send({ name: "To Be Deleted" });
        projectId = res.body.id;
    });
    afterAll(async () => {
        await deleteUser(userA.id);
        await deleteUser(userB.id);
    });

    it("should return 403 when userB tries to delete userA's project", async () => {
        const res = await request(app)
            .delete(`/api/projects/${projectId}`)
            .set("Authorization", `Bearer ${userB.token}`);
        expect(res.status).toBe(403);
    });

    it("should return 200 and delete the project for the owner", async () => {
        const res = await request(app)
            .delete(`/api/projects/${projectId}`)
            .set("Authorization", `Bearer ${userA.token}`);
        expect(res.status).toBe(200);

        // Verify it's gone
        const check = await request(app)
            .get(`/api/projects/${projectId}`)
            .set("Authorization", `Bearer ${userA.token}`);
        expect(check.status).toBe(404);
    });
});
