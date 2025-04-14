// server/server.js - Using ES Module approach with system instruction
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';

// In ES modules, __dirname is not available, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Define the system instruction for JaqBot
const systemInstruction = "You are JaqBot, a friendly crypto-native AI assistant with knowledge of Web3, blockchain, and development. Respond in a conversational tone with occasional crypto slang.";

// API routes should come before the catch-all route
app.post('/api/chat', async (req, res) => {
    try {
        const { history, message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'No message in request.' });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("ERROR: API_KEY not found in .env file");
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        // Format the history for the API, ensuring correct roles
        const chatHistory = (history || []).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Ensure the first message in history (if it exists) is a user message.
        if (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
            console.warn("Received chat history that doesn't start with user message. Check frontend logic.");
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
        });

        const generationConfig = {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        };

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // Start the chat session with the provided history AND system instruction
        const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: chatHistory,
            systemInstruction: systemInstruction, // Add the system instruction here
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
            const blockReason = response.promptFeedback?.blockReason;
            console.warn("AI response was blocked.", blockReason ? `Reason: ${blockReason}` : '');
            return res.status(500).json({ error: 'AI response was blocked due to safety settings.', details: blockReason });
        }

        const aiResponseText = response.text();

        res.json({ response: aiResponseText });

    } catch (error) {
        console.error("Error communicating with Gemini API:", error);
        res.status(500).json({ error: 'Server error while processing request.' });
    }
});

// Serve static files from the client (after build)
app.use(express.static(path.join(__dirname, "./dist")));

// This should be the LAST route - catch-all for client-side routing
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./dist/index.html"));
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});