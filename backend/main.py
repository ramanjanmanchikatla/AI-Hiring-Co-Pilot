from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import os
import re
import pypdf
import docx
import tempfile
import shutil
from markdown import markdown
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from sentence_transformers import SentenceTransformer, util
from typing import List
from fastapi import UploadFile
from database import init_db, get_db, User, ResumeReport

# Initialize FastAPI
app = FastAPI()

# CORS middleware - must be added before routes
# Allow both production Vercel frontend and localhost for development
origins = [
    "https://ai-hiring-co-pilot-three.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models will be loaded lazily on first request to avoid Render timeout
_scoring_model = None
_llm = None

def get_scoring_model():
    global _scoring_model
    if _scoring_model is None:
        print("Loading embedding model (first request)...")
        _scoring_model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
    return _scoring_model

def get_llm():
    global _llm
    if _llm is None:
        print("Initializing LLM (first request)...")
        _llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.6,
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
    return _llm

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: int
    disabled: bool

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AnalyzeRequest(BaseModel):
    job_description: str

class CandidateReport(BaseModel):
    filename: str
    score: float
    report: str

# Helper functions
def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(db: AsyncSession, username: str):
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()

async def authenticate_user(db: AsyncSession, username: str, password: str):
    user = await get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

def extract_text_from_file(file_path: str) -> str:
    """Extracts text from a PDF or DOCX file."""
    if file_path.endswith('.pdf'):
        try:
            reader = pypdf.PdfReader(file_path)
            return "".join(page.extract_text() for page in reader.pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading PDF: {e}")
    elif file_path.endswith('.docx'):
        try:
            doc = docx.Document(file_path)
            return "\n".join(paragraph.text for paragraph in doc.paragraphs)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading DOCX: {e}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX.")

def score_resume(job_description: str, resume_text: str, model) -> float:
    """Calculates the semantic similarity score between a job description and a resume."""
    jd_embedding = model.encode(job_description, convert_to_tensor=True)
    resume_embedding = model.encode(resume_text, convert_to_tensor=True)
    return float(util.cos_sim(jd_embedding, resume_embedding).item() * 100)

def extract_gemini_score(report_text: str) -> float:
    """Extract the match score from Gemini's response."""
    # Look for patterns like "SCORE: 75%" or "SCORE: 85 %" 
    match = re.search(r'SCORE:\s*(\d+)\s*%', report_text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    # Fallback: look for any percentage in the first 200 chars
    match = re.search(r'(\d+)\s*%', report_text[:200])
    if match:
        return float(match.group(1))
    return 0.0

def create_enrichment_chain(llm_model):
    prompt_template = """
    You are an expert AI Hiring Assistant reviewing a candidate for a job role.
    Your task is to create a detailed, structured analysis report based on the provided Job Description and the Candidate's Resume.

    *Job Description:*
    {job_description}

    *Candidate's Resume:*
    {resume_text}

    ---
    *Instructions:*
    Based on the information above, generate the following report with markdown formatting. Ensure all sections are present.

    ### *Overall Match Score*
    SCORE: [X]%
    (Replace [X] with a number from 0-100 representing how well this candidate matches the job requirements based on skills, experience, and qualifications. Be objective and realistic.)

    ### *1. Candidate Summary*
    - Provide 3 concise bullet points highlighting the candidate's strongest qualifications, relevant experience, and key skills that align with the job.

    ### *2. Skill Match Analysis*
    - List the key skills from the job description (e.g., LangChain, Python, PyTorch, Cloud).
    - For each skill, indicate if a match was found in the resume using these emojis:
        - ✅ *Match Found:* If the skill is clearly present.
        - ⚠ *Partial/Indirect Match:* If related experience is mentioned but not the exact skill.
        - ❌ *Not Mentioned:* If the skill is missing.
    - Briefly state the evidence from the resume.

    ### *3. Personalized Interview Questions*
    - Create a list of 3 insightful questions that probe deeper into the candidate's specific projects or roles mentioned in their resume.
    """
    return PromptTemplate(
        template=prompt_template,
        input_variables=["job_description", "resume_text"]
    ) | llm_model

# Routes
@app.on_event("startup")
async def on_startup():
    await init_db()

@app.get("/")
async def read_root():
    return {"message": "AI Hiring Co-pilot Backend is running"}

@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=UserInDB)
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.get("/users/me/", response_model=UserInDB)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/analyze-resumes", response_model=List[CandidateReport])
async def analyze_resumes(
    job_description: str = Form(...),
    resume_files: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    candidate_scores = []
    
    with tempfile.TemporaryDirectory() as temp_dir:
        for resume_file in resume_files:
            file_path = os.path.join(temp_dir, resume_file.filename)
            
            # Save the uploaded file temporarily
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(resume_file.file, buffer)
            
            try:
                # Extract and process the resume
                resume_text = extract_text_from_file(file_path)
                
                # Get lazy-loaded models
                model = get_scoring_model()
                llm = get_llm()
                enrichment_chain = create_enrichment_chain(llm)
                
                score = score_resume(job_description, resume_text, model)
                
                # Generate AI report
                enrichment_result = await enrichment_chain.ainvoke({
                    "job_description": job_description,
                    "resume_text": resume_text
                })
                
                # Convert markdown to HTML
                html_report = markdown(
                    enrichment_result.content,
                    extensions=['fenced_code', 'tables', 'nl2br']
                )
                
                # Extract Gemini's score for display (more accurate skill-based score)
                gemini_score = extract_gemini_score(enrichment_result.content)
                # Use Gemini score for display, semantic score for sorting
                display_score = gemini_score if gemini_score > 0 else score
                
                # Save to database
                db_report = ResumeReport(
                    user_id=current_user.id,
                    filename=resume_file.filename,
                    score=display_score,
                    report=html_report
                )
                db.add(db_report)
                await db.commit()
                await db.refresh(db_report)
                
                candidate_scores.append(CandidateReport(
                    filename=resume_file.filename,
                    score=display_score,
                    report=html_report
                ))
                
            except Exception as e:
                print(f"Error processing {resume_file.filename}: {str(e)}")
                candidate_scores.append(CandidateReport(
                    filename=resume_file.filename,
                    score=0,
                    report=f"<p>Error processing file: {str(e)}</p>"
                ))
            finally:
                # Clean up the temporary file
                if os.path.exists(file_path):
                    os.remove(file_path)
    
    # Sort by score (highest first)
    return sorted(candidate_scores, key=lambda x: x.score, reverse=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)