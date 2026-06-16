# 📚 LexiAI

LexiAI is an AI-powered PDF question-answering assistant that allows users to upload documents and have natural conversations with them. Using Retrieval-Augmented Generation (RAG), semantic search, and citation-based responses, LexiAI provides accurate answers grounded in the contents of uploaded PDFs.

## ✨ Features

* 🔐 User authentication (Sign Up/Login)
* 📄 PDF upload and management
* 🧠 Retrieval-Augmented Generation (RAG)
* 🔍 Semantic document search using embeddings
* 💬 AI-powered chat interface
* ⚡ Streaming responses with Server-Sent Events (SSE)
* 📌 Citation-based answers linked to relevant PDF pages
* 📚 Conversation history
* 🌙 Modern, responsive dark-mode UI

## 🏗️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router

### Backend

* FastAPI
* Python
* Server-Sent Events (SSE)

### Database

* PostgreSQL
* pgvector

### AI & Document Processing

* OpenAI API
* Semantic Chunking
* Vector Embeddings
* Retrieval-Augmented Generation (RAG)
* PDF Text Extraction

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/Balogun-Angel/lexi-ai.git
cd lexi-ai
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📂 Project Structure

```text
lexi-ai/
├── frontend/
├── backend/
├── docs/
│   ├── mockups/
│   ├── architecture.md
│   ├── roadmap.md
│   ├── api-spec.md
│   └── database-schema.md
├── docker/
├── .github/workflows/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🗺️ Roadmap

* [x] Project initialization
* [ ] Authentication
* [ ] PDF upload and processing
* [ ] Semantic chunking and embeddings
* [ ] Vector search with pgvector
* [ ] AI chat interface
* [ ] Citation-based answers
* [ ] Deployment

## 🎯 Motivation

I built LexiAI because I often work with long lecture notes, research papers, and technical documentation and wanted a way to simply ask questions and get grounded answers instead of manually searching through pages of information. This project allowed me to solve a problem I personally face while exploring modern AI engineering concepts and building a production-ready application from the ground up.

---

Built by **Angel Balogun** 🚀
