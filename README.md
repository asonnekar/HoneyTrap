# 🍯 HoneyTrap

> *Turn the tables on scammers — detect, flag, and waste their time.*

HoneyTrap is an AI-powered scam detection and disruption tool that analyzes calls,
texts, emails, and URLs for fraudulent activity. When a scam is detected, HoneyTrap
doesn't just warn you — it fights back by generating realistic decoy responses to
waste scammers' time and protect potential victims.

Built for the Buckeye Black Box Hackathon · March 2026

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
- 🔊 **Call Decoy Scripts** — Generates realistic dialogue users can play during
  suspected scam calls
- 🌐 **Community Scam Feed** — Crowdsourced scam submissions with trending alerts
  by region

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Frontend    | React + Tailwind CSS                 |
| Backend     | FastAPI (Python)                     |
| AI Engine   | OpenAI GPT-4o API / Google Gemini    |
| Fake Data   | Python Faker library                 |
| URL Safety  | Google Safe Browsing API             |
| SMS Layer   | Twilio Sandbox (free tier)           |
| Hosting     | Vercel (frontend) + Render (backend) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- OpenAI or Gemini API key
- Google Safe Browsing API key (free)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-team/honeytrap.git
cd honeytrap

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in `/server`:

```env
OPENAI_API_KEY=your_openai_key
GOOGLE_SAFE_BROWSING_KEY=your_google_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### Running the App

```bash
# Start backend
cd server
uvicorn main:app --reload

# Start frontend (in a new terminal)
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

## 📸 Screenshots

> *(Add screenshots or a demo GIF here)*

---

## 🗺️ Roadmap

- [ ] Email & SMS scam detection
- [ ] AI risk scoring with red flag highlights
- [ ] Decoy identity generator
- [ ] Scam staller email drafter
- [ ] Browser extension for real-time URL checking
- [ ] Voice call analysis via Twilio
- [ ] Mobile app (React Native)
- [ ] Scam pattern ML model trained on community data

---

## 👥 Team

| Name | Role |
|------|------|
| [Aneesh Sonnekar] 
| [Dylan Jian]
| [Luke Fenstermaker]
| [Conlan Mayberry]

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> *"In the time it takes to read this README, 3 Americans were scammed.
> HoneyTrap is how we fight back."*