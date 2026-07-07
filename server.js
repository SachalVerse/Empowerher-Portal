require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin1234';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let database = [
    { id: 462, service: "Passport Application", applicant: "Maria", cnic: "32203-1111111-2", details: "Type: Urgent, Book Type: 36 Pages", docAttached: "passport_photo.jpg", status: "Pending Review", remarks: "Processing initiated." },
    { id: 742, service: "CNIC Renewal", applicant: "Ayesha Khan", cnic: "42101-2222222-2", details: "Type: Renewal, Address Match: Yes", docAttached: "old_cnic_scan.png", status: "Approved", remarks: "Card printed. Dispatched via national logistics." }
];

// Secure Gemini API Proxy Endpoint
app.post('/api/chat', async (req, res) => {
    const { message, language } = req.body;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are EmpowerBot, an intelligent helpdesk assistant for the EmpowerHer Portal. 
The portal allows women to apply for Digital Passports, CNIC Registration/Renewal, Women Business Micro-Loans, and Utility Bill Payments.

Context Rules:
1. Answer the user's question accurately based on public services or portals.
2. Keep your answer professional, empathetic, clear, and highly concise (maximum 2-3 sentences).
3. The current user interface language is: ${language === 'ur' ? 'Urdu' : 'English'}. You MUST respond completely in this language.

User Question: "${message}"`
                    }]
                }]
            })
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Diagnostic Payload Error:", data.error);
            return res.json({ 
                reply: language === 'ur' 
                    ? "معذرت، سرور ماڈل لوڈ کرنے میں ناکام رہا۔" 
                    : "The upstream model endpoint refused parsing setup parameters. Check backend keys." 
            });
        }

        const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
            (language === 'ur' ? "معذرت، میں اس وقت جواب دینے سے قاصر ہوں۔" : "I apologize, I am unable to process that response right now.");
        
        res.json({ reply: botReply.trim() });
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Gemini API Local Connection Error Logged:", error);
        res.json({ 
            reply: language === 'ur' 
                ? "نیٹ ورک کنکشن کا مسئلہ: براہ کرم انٹرنیٹ یا فائر وال چیک کریں۔" 
                : "Ecosystem engine timed out making outbound connection. Please check network/firewall configurations." 
        });
    }
});

// Endpoint: Submit an application
app.post('/api/apply', (req, res) => {
    const { serviceName, applicantName, cnicNumber, dynamicDetails, attachmentName, offlineId } = req.body;
    
    if (!serviceName || !applicantName || !cnicNumber) {
        return res.status(400).json({ error: "Compulsory registration structural parameters are missing." });
    }

    const targetId = offlineId ? parseInt(offlineId) : Math.floor(100 + Math.random() * 900);
    const existing = database.find(item => item.id === targetId);
    
    if (existing) {
        return res.json({ success: true, id: existing.id });
    }

    const newRecord = {
        id: targetId,
        service: serviceName,
        applicant: applicantName,
        cnic: cnicNumber,
        details: dynamicDetails || "Standard Verification parameters",
        docAttached: attachmentName || "No file uploaded",
        status: "Pending Review",
        remarks: "Awaiting administrator review panel checks."
    };

    database.unshift(newRecord);
    res.json({ success: true, id: newRecord.id });
});

app.post('/api/track', (req, res) => {
    const { applicantName, cnicNumber } = req.body;
    const records = database.filter(app => app.cnic.trim() === cnicNumber.trim() && app.applicant.toLowerCase().trim() === applicantName.toLowerCase().trim());
    res.json(records);
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        return res.json({ authenticated: true });
    }
    res.status(401).json({ authenticated: false, message: "Invalid credentials." });
});

app.get('/api/admin/applications', (req, res) => {
    res.json(database);
});

app.post('/api/admin/update', (req, res) => {
    const { id, status, remarks } = req.body;
    const item = database.find(app => app.id === parseInt(id));
    if (item) {
        item.status = status;
        item.remarks = remarks || "Updated by Administrator.";
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Application tracking ID not found." });
});

// NEW: Endpoint to delete unwanted application records
app.delete('/api/admin/delete/:id', (req, res) => {
    const idToDelete = parseInt(req.params.id);
    const initialLength = database.length;
    database = database.filter(app => app.id !== idToDelete);
    
    if (database.length < initialLength) {
        res.json({ success: true, message: "Application removed successfully." });
    } else {
        res.status(404).json({ error: "Application ID not found." });
    }
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 EmpowerHer Deep Ecosystem Engine Online: http://localhost:${PORT}`);
    console.log(`=======================================================`);
});