// server/server.js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Serwuj statyczne pliki z klienta (po buildzie)
app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("BŁĄD: Nie znaleziono klucza GOOGLE_API_KEY w pliku .env");
    process.exit(1);
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

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { history, message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Brak wiadomości (message) w zapytaniu.' });
        }

        // Format the history for the API, ensuring correct roles
        const chatHistory = (history || []).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // **Crucial Change:** Ensure the first message in history (if it exists) is a user message.
        // This is likely already handled by your frontend, but adding a check here for robustness.
        if (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
            console.warn("Otrzymano historię czatu, która nie zaczyna się od wiadomości użytkownika. Sprawdź logikę frontendu.");
            // You might want to handle this differently, e.g., by clearing the history or adjusting roles.
            // For now, we'll proceed as is, assuming the frontend will eventually send a user message.
        }

        // Start the chat session with the provided history
        const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: chatHistory,
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
            const blockReason = response.promptFeedback?.blockReason;
            console.warn("Odpowiedź AI została zablokowana.", blockReason ? `Powód: ${blockReason}` : '');
            return res.status(500).json({ error: 'Odpowiedź AI została zablokowana z powodu ustawień bezpieczeństwa.', details: blockReason });
        }

        const aiResponseText = response.text();

        res.json({ response: aiResponseText });

    } catch (error) {
        console.error("Błąd podczas komunikacji z API Gemini:", error);
        res.status(500).json({ error: 'Wystąpił błąd serwera podczas przetwarzania zapytania.' });
    }
});

app.listen(port, () => {
    console.log(`Serwer backendu nasłuchuje na http://localhost:${port}`);
});