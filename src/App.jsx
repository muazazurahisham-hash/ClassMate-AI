import { useState, useEffect } from "react"

// 🌐 TUKAR KAT SINI: 
// Guna "http://localhost:3001" masa tengah buat kat laptop.
// Ganti dengan link Render kau (e.g., https://classmate-backend.onrender.com) bila dah deploy.
const BACKEND_URL = "https://classmate-backend-rirr.onrender.com";

export default function App() {
  const [message, setMessage] = useState("")
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("classmate_tasks")
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")

  // --- SIMPAN DATA KE STORAGE ---
  useEffect(() => {
    localStorage.setItem("classmate_tasks", JSON.stringify(tasks))
  }, [tasks])

  // --- AUTO-SYNC TELEGRAM (SETIAP 5 SAAT) ---
  useEffect(() => {
    syncTelegram(); // Check masa mula-mula buka
    const interval = setInterval(() => {
      syncTelegram();
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  function showToast(msg) {
    setToast(msg); setTimeout(() => setToast(""), 3000)
  }

  // 🔥 FUNGSI UTAMA: Analisis Teks (Smart Paste / Upload)
  async function processText(textToAnalyze) {
    if (!textToAnalyze.trim()) return;
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToAnalyze })
      })
      const data = await res.json()
      
      // AI selalunya pulangkan string JSON, kita extract array dia
      const content = data.choices[0].message.content
      const newTasks = JSON.parse(content.match(/\[.*\]/s)[0])
      
      setTasks(prev => [...newTasks, ...prev])
      showToast(`✅ ${newTasks.length} tugasan baru ditambah!`)
    } catch (err) {
      showToast("❌ Gagal. Pastikan Backend (server.js) sedang berjalan.")
    }
    setLoading(false)
  }

  // ✈️ TELEGRAM SYNC: Tarik data dari Bot secara senyap
  async function syncTelegram() {
    try {
      const res = await fetch(`${BACKEND_URL}/sync-tele`)
      const teleTasks = await res.json()
      
      if (teleTasks && teleTasks.length > 0) {
        setTasks(prev => [...teleTasks, ...prev])
        showToast(`⚡ ${teleTasks.length} task baru masuk dari Telegram!`)
      }
    } catch (err) {
      console.log("Auto-sync error. Server mungkin offline.");
    }
  }

  // 📂 EXPORT CHAT: Baca file .txt WhatsApp
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const recentChat = event.target.result.slice(-15000)
      processText("Log WhatsApp: " + recentChat)
    }
    reader.readAsText(file)
  }

  const deleteTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  return (
    <div style={{ padding: "20px", background: "#0f172a", color: "white", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "600px", margin: "auto" }}>
        
        <header style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "5px", letterSpacing: "-1px" }}>🤖 ClassMate AI</h1>
          <p style={{ color: "#94a3b8" }}>Urus tugasan sekolah dengan kuasa AI</p>
        </header>

        {/* --- INPUT BOX --- */}
        <div style={{ background: "#1e293b", padding: "25px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", marginBottom: "30px" }}>
          <h4 style={{ marginTop: 0, color: "#818cf8" }}>📋 Smart Paste</h4>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            placeholder="Paste pesanan cikgu kat sini..."
            style={{ width: "100%", height: "80px", padding: "12px", borderRadius: "10px", background: "#334155", color: "white", border: "1px solid #475569", resize: "none" }}
          />
          <button onClick={() => { processText(message); setMessage(""); }} disabled={loading}
            style={{ width: "100%", marginTop: "12px", padding: "12px", background: "#6366f1", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "Tengah Scan..." : "Check Tugasan ✨"}
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
            <div style={{ background: "#0088cc", color: "white", padding: "10px", borderRadius: "8px", fontSize: "12px", textAlign: "center", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✈️ Tele Auto-Sync ON
            </div>
            <label style={{ background: "#334155", color: "white", padding: "10px", borderRadius: "8px", textAlign: "center", cursor: "pointer", fontSize: "12px", fontWeight: "bold", border: "1px solid #475569" }}>
              📂 Upload .txt
              <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {/* --- CHECKLIST --- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ margin: 0 }}>📝 Tugasan Saya ({tasks.length})</h3>
          <button onClick={() => { if(window.confirm("Padam semua?")) setTasks([]) }} style={{ background: "none", border: "1px solid #ef4444", color: "#ef4444", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
            Reset
          </button>
        </div>

        {tasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", background: "#1e293b", borderRadius: "16px", color: "#64748b", border: "2px dashed #334155" }}>
            Belum ada tugasan dikesan. Cuba hantar mesej ke bot Telegram!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {tasks.map((t, i) => (
            <div key={i} style={{ 
              background: "#1e293b", padding: "18px", borderRadius: "14px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderLeft: `6px solid ${t.type === 'HW' ? '#6366f1' : '#f59e0b'}`,
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "17px" }}>{t.task}</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                  📅 {t.date || "Tiada tarikh"} | <span style={{ background: "#334155", padding: "2px 6px", borderRadius: "4px" }}>{t.type}</span>
                </div>
              </div>
              <button onClick={() => deleteTask(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "18px" }}>
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: "30px", right: "30px", background: "#10b981", color: "white", padding: "15px 25px", borderRadius: "12px", fontWeight: "bold", boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
