# 🍯 HoneyTrap

> *Turn the tables on scammers — detect, flag, and waste their time.*

HoneyTrap is an AI-powered scam detection and disruption tool that analyzes calls,
texts, emails, and URLs for fraudulent activity. When a scam is detected, HoneyTrap
doesn't just warn you — it fights back by generating realistic decoy responses to
waste scammers' time and protect potential victims.

Built for the Buckeye Black Box Hackathon · March 2026

Using the prompt: "Develop a bot or agent that detects likely scams across calls, texts, emails, or websites, then helps protect users by flagging risk, and safely disrupting scam attempts through decoys, or time-wasting interactions." 

---

## 🚨 The Problem

Scam fraud costs Americans over **$10 billion per year**. Existing tools only
*detect* scams — they don't fight back. HoneyTrap goes further by disrupting the
scam pipeline itself through intelligent decoys and time-wasting interactions.

---

## ✨ Features

- 🔍 **Multi-channel Detection** — Analyze SMS, emails, phone call scripts, and URLs
- 🧠 **AI Risk Scoring** — LLM-powered classification with a 0–100 risk score and
  detailed red flag breakdown
- 🪤 **Decoy Generator** — Auto-generates fake personal info (names, addresses,
  card numbers) to feed back to scammers
- 🤖 **Scam Staller** — Drafts lengthy, confusing reply emails to waste scammer time
- 🌐 **Community Scam Feed** — Crowdsourced scam submissions with trending alerts
  by region

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Frontend    | React + Vite + Tailwind CSS          |
| Backend     | FastAPI (Python)                     |
| AI Engine   | Ollama (local LLM, no API key needed)|
| Fake Data   | Python Faker library                 |
| Hosting     | Vercel (frontend) + Render (backend) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- [Ollama](https://ollama.com) installed and running locally

### 1. Pull a model

```bash
ollama pull llama3.2
```

Any model that follows instructions well works. Recommended options:

| Model | Notes |
|-------|-------|
| `llama3.2` | Default — good balance of speed and quality |
| `llama3.1:8b` | More capable, slightly slower |
| `mistral` | Lightweight, very fast |

### 2. Install dependencies

```bash
# Clone the repository
git clone https://github.com/asonnekar/honeytrap.git
cd honeytrap

# Frontend
cd client
npm install

# Backend
cd ../server
pip install -r requirements.txt
```

### 3. Configure environment

The default `.env` in `/server` works out of the box with Ollama:

```env
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2
```

Change `OLLAMA_MODEL` to swap models without restarting the server.

### 4. Run the app

```bash
# Terminal 1 — make sure Ollama is running
ollama serve

# Terminal 2 — start the backend
cd server
uvicorn main:app --reload

# Terminal 3 — start the frontend
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 How It Works

1. **Paste** a suspicious email, text message, phone script, or URL into HoneyTrap
2. **Analyze** — the AI engine scores it 0–100 for scam likelihood and highlights
   red flags (urgency language, spoofed domains, impersonation patterns)
3. **Disrupt** — with one click, generate a realistic fake identity package or a
   multi-paragraph stall reply to send back to the scammer
4. **Report** — anonymously submit the scam to the community feed to warn others

---

## 📁 Project Structure

```
honeytrap/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── AnalyzeTab.jsx
│           ├── DecoyTab.jsx
│           ├── FeedTab.jsx
│           └── RiskMeter.jsx
└── server/                  # FastAPI backend
    ├── main.py
    ├── models.py
    ├── llm.py               # Ollama client + JSON parser
    └── routers/
        ├── analyze.py       # POST /api/analyze
        ├── decoy.py         # POST /api/decoy/identity & /stall
        └── feed.py          # GET/POST /api/feed
```

---

## 📸 Screenshots

> *(Add screenshots or a demo GIF here)*

---

## 🗺️ Roadmap

- [x] Email & SMS scam detection
- [x] AI risk scoring with red flag highlights
- [x] Decoy identity generator
- [x] Scam staller email drafter
- [x] Community scam feed with upvoting
- [ ] Browser extension for real-time URL checking
- [ ] Voice call analysis
- [ ] Mobile app (React Native)
- [ ] Fine-tuned local model trained on community data

---

## 👥 Team

| Name |
|------|
| Aneesh Sonnekar |
| Dylan Jian |
| Luke Fenstermaker |
| Conlan Mayberry |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> *"In the time it takes to read this README, 3 Americans were scammed.
> HoneyTrap is how we fight back."*
