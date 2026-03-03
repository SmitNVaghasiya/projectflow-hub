import http from 'http';
import https from 'https';
import fs from 'fs';

function req(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (data) headers['Content-Length'] = Buffer.byteLength(data);
        const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { resolve({ s: res.statusCode, b: JSON.parse(d) }); });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

function reqHttps(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    // -----------------------------------------------------
    // 1. PROJECT SEEDING
    // -----------------------------------------------------
    console.log("--- STARTING SEED ---");
    const loginRes = await req('POST', '/api/auth/login', { email: 'smitvaghasiya11280@gmail.com', password: '123456' });
    const token = loginRes.b.token;
    if (!token) return console.error('Login failed');

    const top20Str = `
1. Task Tracker App
2. LinkedIn/Fiverr Engagement Tool
3. RAG Memory System
4. AI Code Quality Checker
5. AI Review Analysis Dashboard
6. AI Product Description Generator
7. AI Email Triage & Reply Assistant
8. AI Customer Support Macro Creator
9. AI Keyword Clustering + Content Brief
10. AI Internal Semantic Search
11. AI Audience Monitoring & Lead Alert Tool
12. AI Employee Feedback Analyzer
13. AI Analytics Explainer
14. AI Content Planner & Repurposer
15. AI Ad Creative & Copy Optimizer
16. AI Appointment & Reminder Bot
17. AI Price Optimization Tool
18. AI Inventory & Demand Forecasting
19. AI Script & Content System (YouTube/Podcast)
20. Document Manager Mobile App
`;
    const txtPath = 'c:\\\\Users\\\\smitv\\\\OneDrive\\\\Desktop\\\\Projects\\\\Project_manager\\\\Project_ideas.txt';
    const txt = fs.readFileSync(txtPath, 'utf8');

    const projects = new Set();

    // Add top 20
    const top20Lines = top20Str.trim().split('\n');
    for (const line of top20Lines) {
        const name = line.replace(/^\d+\.\s*/, '').trim();
        if (name) projects.add(name);
    }

    // Add from original txt 
    const lines = txt.split('\n');
    for (const line of lines) {
        let trimmed = line.trim();
        let name = '';
        if (trimmed.startsWith('------- >')) name = trimmed.replace('------- >', '').trim();
        else if (trimmed.startsWith('--- >')) name = trimmed.replace('--- >', '').trim();
        else if (trimmed.startsWith('-- >')) name = trimmed.replace('-- >', '').trim();
        else if (trimmed.startsWith('-- ')) name = trimmed.replace('-- ', '').trim();

        if (name.includes('...')) name = name.split('...')[0].trim();
        if (name.includes('for ')) name = name.split('for ')[0].trim(); // clean it up a bit

        if (name && name.length > 5 && !name.toLowerCase().includes('good idea') && !name.toLowerCase().includes('this one')) {
            projects.add(name);
        }
    }

    const projectList = Array.from(projects).map(name => ({ name, status: 'todo' })).filter(p => p.name.length > 2);
    console.log('Found ' + projectList.length + ' unique projects to seed.');

    const existParams = await req('GET', '/api/projects', null, token);
    if (existParams.b && Array.isArray(existParams.b)) {
        for (const p of existParams.b) {
            await req('DELETE', '/api/projects/' + p.id, null, token);
        }
    }
    console.log('Wiped existing projects to start fresh');

    for (let i = 0; i < projectList.length; i += 20) {
        const chunk = projectList.slice(i, i + 20);
        const res = await req('POST', '/api/projects/seed', { projects: chunk }, token);
        console.log(`Seeded ${chunk.length} projects (Status: ${res.s})`);
    }

    // -----------------------------------------------------
    // 2. OTP EMAIL TESTING 
    // -----------------------------------------------------
    console.log("\n--- TESTING OTP EMAIL DELIVERY ---");
    try {
        // Generate random email
        const genRes = await reqHttps('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        const tempEmail = genRes[0];
        const [login, domain] = tempEmail.split('@');
        console.log(`Generated Temp Mail: ${tempEmail}`);

        // Trigger Send OTP
        console.log(`Triggering OTP to ${tempEmail}...`);
        const sendOtpRes = await req('POST', '/api/auth/send-otp', { email: tempEmail });
        console.log(`Send OTP Response: ${sendOtpRes.s}`, sendOtpRes.b);

        if (sendOtpRes.s !== 200) {
            console.error("Failed to trigger OTP email. Check SMTP credentials.");
            return;
        }

        console.log("Waiting for email to arrive in inbox (polling)...");
        let msgId = null;
        for (let i = 0; i < 20; i++) {
            await sleep(3000);
            const inboxRes = await reqHttps(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
            if (inboxRes && inboxRes.length > 0) {
                msgId = inboxRes[0].id;
                console.log(`📩 Email received! Subject: "${inboxRes[0].subject}"`);
                break;
            }
            process.stdout.write(".");
        }

        if (!msgId) {
            console.log("\n❌ Timeout waiting for email.");
            return;
        }

        // Read the actual body of the email to extract the OTP
        const msgDetails = await reqHttps(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${msgId}`);
        const htmlBody = msgDetails.htmlBody || msgDetails.body;

        // Find 6 digit code in HTML body
        const codeMatch = htmlBody.match(/>(\d{6})</);
        if (codeMatch && codeMatch[1]) {
            const otpCode = codeMatch[1];
            console.log(`\n✅ Successfully extracted OTP Code: [ ${otpCode} ]`);

            console.log(`Verifying OTP back to the server...`);
            const verifyRes = await req('POST', '/api/auth/verify-otp', { email: tempEmail, code: otpCode });
            console.log(`Verify OTP Response: ${verifyRes.s}`, verifyRes.b);
            if (verifyRes.s === 200) {
                console.log("🎉 SUCCESS! OTP Flow is verified working 100%");
            } else {
                console.log("❌ OTP Verification failed on server");
            }
        } else {
            console.log("❌ Could not find 6-digit code in email body:");
            console.log(htmlBody);
        }

    } catch (e) {
        console.error("Error during OTP test:", e);
    }
})();
