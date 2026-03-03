# ProjectHub — Backend Test Suite

## Why We Test

Tests are the safety net that lets you change code with confidence. Every bug caught in a test is a bug that never reached a real user. Good tests also serve as living documentation — they show exactly what each route is expected to do under every condition.

**The three rules of this test suite:**
1. Every route must have a happy path test
2. Every validation input must have a failure test
3. Every security boundary must have a breach attempt test

---

## Test Coverage Philosophy

We test five categories of scenarios:

| Category | What It Covers | Why |
|---|---|---|
| **Happy Path** | Expected input → expected output | Confirms the feature works at all |
| **Validation Errors** | Missing/wrong fields → 400 | Prevents bad data reaching the DB |
| **Auth Errors** | Missing/invalid token → 401 | Ensures protected routes are actually protected |
| **Permission Errors** | User A accessing User B data → 403 | Ensures row-level isolation between users |
| **Edge Cases** | Replay attacks, expired tokens, duplicate data | Prevents subtle security holes |

---

## Test Scenarios Explained

### `auth.test.js`

| Scenario | Why It Matters | Risk If Not Tested |
|---|---|---|
| Signup with valid data | Confirms the whole signup flow works | Core feature could be silently broken |
| Signup with duplicate email | Users shouldn't be able to register twice | Could corrupt user data |
| Signup with missing fields | Input sanitization must reject bad data | Could crash DB with null constraint |
| Signup with weak password | Weak passwords are a security risk | Users could register with "123" |
| Send OTP to valid email | Core of the email verification flow | Signup would be impossible |
| Send OTP 4 times in 10 min | OTP rate limiting per email | Attacker could spam someone's email |
| Verify OTP — correct code | Confirms verification works | Users could never complete signup |
| Verify OTP — wrong code | Must reject bad guesses | Attacker could brute-force 000000–999999 |
| Verify OTP — expired code | Expired codes must be rejected | Old codes could be used hours later |
| Verify OTP — already used code | **Replay attack prevention** | Intercepted code reused a second time |
| Login with correct credentials | Core login must work | Users couldn't log in at all |
| Login with wrong password | Must return 401, not crash | Guess attacks or bad UX otherwise |
| Login with unverified email | Unverified users must not log in | Security bypass: skip OTP step |
| Logout | Token must be blacklisted after logout | User logs out but token still works |

### `projects.test.js`

| Scenario | Why It Matters | Risk If Not Tested |
|---|---|---|
| GET projects without token | Unauthenticated access must be blocked | Anonymous users could read all projects |
| GET projects with valid token | Core feature must work | Projects page would be empty |
| GET projects for new user | Empty array, not null or error | Frontend crash on undefined.map() |
| POST project with valid data | Core create flow must work | No way to add projects |
| POST project with missing name | Validation must reject empty names | Empty-named projects in the DB |
| POST project with invalid priority | Enum validation must fire | DB constraint error exposed to client |
| PUT project — own project | Editing your own project must work | Core feature broken |
| PUT project — another user's project | **403, not 404** | User A could overwrite User B's projects |
| DELETE project — own project | Core delete must work | Projects pile up, can't clean |
| DELETE project — another user's | **403, not 404** | User A could delete User B's data |
| User isolation (RLS check) | User A cannot see User B's projects at all | Data privacy breach |

### `db.test.js`

| Scenario | Why It Matters | Risk If Not Tested |
|---|---|---|
| DB connection succeeds | Basic connectivity must work | All other tests meaningless if DB down |
| All tables exist | Tables might not be created on first run | 500 errors on every request |
| Required columns exist | Columns might be missing in older DBs | Runtime errors on INSERT/SELECT |
| Indexes exist | Missing indexes = slow queries at scale | App slows down as data grows |

---

## How To Run Tests

```bash
# Run all tests
npm test

# Run a specific file
npm test -- auth.test.js

# Run with coverage report
npm run test:coverage
```

---

## How To Add New Tests

1. Create a file in `Backend/tests/` named `<feature>.test.js`
2. Import `supertest` and your Express `app`
3. Follow the pattern: describe block → beforeAll (setup) → it blocks → afterAll (cleanup)
4. Every test must clean up after itself (delete test users/projects created during the test)
5. Never share state between tests — each `it` block must be self-contained

```js
// Example pattern
describe("POST /api/auth/login", () => {
    it("should return 401 for wrong password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "test@test.com", password: "wrongpassword" });
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });
});
```
