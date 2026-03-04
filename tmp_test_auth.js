async function testAuth() {
    const BASE_URL = 'http://localhost:3001/api';
    console.log("1. Testing Send OTP for Signup with existing email");
    try {
        const signupRes = await fetch(`${BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'smitvaghasiya44@gmail.com', context: 'signup' })
        });
        console.log("Signup OTP Status:", signupRes.status);
        console.log("Signup OTP Body:", await signupRes.json());
    } catch (e) { console.error('Signup fetch error:', e.message); }

    console.log("\\n2. Testing Send OTP for Reset with fake email");
    try {
        const resetRes = await fetch(`${BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'fake@fake.com', context: 'reset' })
        });
        console.log("Reset OTP Status:", resetRes.status);
        console.log("Reset OTP Body:", await resetRes.json());
    } catch (e) { console.error('Reset fetch error:', e.message); }

    process.exit(0);
}

testAuth();
