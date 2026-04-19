import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { Telegraf } from "telegraf";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const GROQ_API_KEY = "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"; 
const TELEGRAM_TOKEN = "8691129739:AAGE2tw45-3zmda-ZTHI12QRsxRmmdmvu4k";

const bot = new Telegraf(TELEGRAM_TOKEN);

// Database sementara (RAM) - Untuk simpan task dari Telegram sebelum sync ke Web
let teleInbox = [];

// Helper AI
async function askAI(text) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Extract tasks from chat. Return ONLY JSON array: [{\"type\":\"HW\",\"task\":\"name\",\"date\":\"date\"}]" },
        { role: "user", content: text },
      ],
    }),
  });
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content || "[]");
}

// 🤖 LOGIC TELEGRAM BOT
bot.on('text', async (ctx) => {
  ctx.reply("Sedang memproses maklumat... ⏳");
  try {
    const tasks = await askAI(ctx.message.text);
    if (tasks.length > 0) {
      teleInbox = [...tasks, ...teleInbox];
      ctx.reply(`✅ Berjaya! ${tasks.length} tugasan telah dihantar ke dashboard ClassMate AI.`);
    } else {
      ctx.reply("❌ Tiada tugasan dikesan dalam mesej ni.");
    }
  } catch (err) {
    ctx.reply("⚠️ Gagal hubungi AI.");
  }
});

bot.launch(); // Start bot

// 📱 ENDPOINT UNTUK WEB SYNC
app.get("/sync-tele", (req, res) => {
  res.json(teleInbox);
  teleInbox = []; // Clear inbox lepas sync supaya tak duplicate
});

// Endpoint analyze sedia ada
app.post("/analyze", async (req, res) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Extract tasks. Return JSON only." },
          { role: "user", content: req.body.message }
        ]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Fail" }); }
});

app.listen(3001, () => console.log("🚀 Server & Bot sedang berjalan..."));