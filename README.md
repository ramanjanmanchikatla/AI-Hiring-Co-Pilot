# AI Hiring Co-pilot 🚀

An intelligent resume screening platform that leverages AI to match candidates with job descriptions, generate detailed analysis reports, and suggest personalized interview questions.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)
![LangChain](https://img.shields.io/badge/LangChain-AI-green?style=flat-square)

---

## 🎯 Problem Statement

Recruiters spend **hours** manually screening resumes against job descriptions. This process is:
- Time-consuming and repetitive
- Prone to human bias and inconsistency
- Difficult to scale for high-volume hiring

## 💡 Solution

**AI Hiring Co-pilot** automates the initial screening process by:
1. **Semantic Matching** - Uses a fine-tuned Sentence Transformer model to calculate similarity scores between resumes and job descriptions
2. **AI-Powered Analysis** - Generates comprehensive candidate reports using Google's Gemini AI
3. **Interview Prep** - Suggests personalized interview questions based on each candidate's background

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React + Vite  │────▶│    FastAPI      │────▶│   SQLite DB     │
│   (Frontend)    │     │   (Backend)     │     │   (Storage)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌─────────────────┐      ┌─────────────────┐
           │ Sentence        │      │ Google Gemini   │
           │ Transformer     │      │ (LangChain)     │
           │ (Scoring)       │      │ (Analysis)      │
           └─────────────────┘      └─────────────────┘
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Secure user registration and login with token-based auth |
| **Resume Upload** | Drag-and-drop support for PDF and DOCX files |
| **Semantic Scoring** | Custom-trained model calculates candidate-job fit (0-100%) |
| **AI Reports** | Detailed analysis with skill matching and candidate summaries |
| **Interview Questions** | Auto-generated questions tailored to each candidate |
| **Modern UI** | Dark theme with glassmorphism, animations, and responsive design |

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - Async ORM with SQLite database
- **LangChain** - LLM orchestration framework
- **Google Gemini 2.5** - Large language model for report generation
- **Sentence Transformers** - Custom-trained embedding model for scoring
- **PyJWT & Passlib** - Secure authentication with bcrypt hashing

### Frontend
- **React 19** - Modern UI library with hooks
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Dropzone** - File upload handling

### ML/AI Pipeline
- **Fine-tuned Sentence Transformer** - Trained on recruitment data for semantic matching
- **Cosine Similarity** - Measures vector similarity between resume and job embeddings
- **Prompt Engineering** - Structured prompts for consistent AI analysis

---

## 📁 Project Structure

```
ai-hiring-copilot/
├── backend/
│   ├── main.py              # FastAPI application & routes
│   ├── database.py          # SQLAlchemy models & DB setup
│   ├── model.py             # Pydantic schemas
│   ├── output/              # Trained ML model weights
│   ├── hiring_copilot.ipynb # Model training notebook
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React application
│   │   ├── App.css          # Component styles
│   │   └── index.css        # Design system & tokens
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Build configuration
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google API Key (for Gemini)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
echo "GOOGLE_API_KEY=your_api_key" > .env

# Run the server
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create new user account |
| POST | `/token` | Login and get JWT token |
| GET | `/users/me` | Get current user profile |
| POST | `/analyze-resumes` | Upload resumes and get AI analysis |

---

## 🧠 How the Scoring Works

1. **Text Extraction** - Parse PDF/DOCX files to extract resume text
2. **Embedding Generation** - Convert job description and resume to 768-dim vectors
3. **Cosine Similarity** - Calculate semantic similarity score (0-100%)
4. **AI Enrichment** - Generate detailed analysis using LLM

```python
# Simplified scoring logic
jd_embedding = model.encode(job_description)
resume_embedding = model.encode(resume_text)
score = cosine_similarity(jd_embedding, resume_embedding) * 100
```

---

## 📊 Model Training

The scoring model was fine-tuned on a recruitment dataset:
- **Base Model**: `sentence-transformers/all-mpnet-base-v2`
- **Training Data**: 1M+ job-resume pairs
- **Objective**: Maximize similarity for good matches, minimize for poor fits

See `backend/hiring_copilot.ipynb` for training details.

---

## 🎨 UI Design

The frontend features a modern, premium design:
- **Dark Theme** with neon orange accents
- **Glassmorphism** cards with blur effects
- **Animated Gradients** in the background
- **Score Visualizations** with color-coded progress bars
- **Responsive Layout** for all screen sizes

---

## 🔮 Future Improvements

- [ ] Batch processing for large resume sets
- [ ] Email notifications for completed analyses
- [ ] Resume parsing with structured data extraction
- [ ] Comparison view for multiple candidates
- [ ] Integration with ATS platforms

---

## 👨‍💻 Author

Built as a demonstration of full-stack development skills combining:
- Modern web development (React, FastAPI)
- Machine learning (Sentence Transformers, fine-tuning)
- LLM integration (LangChain, Gemini)
- UI/UX design (Glassmorphism, animations)

---

## 📄 License

MIT License - Feel free to use and modify for your own projects.
