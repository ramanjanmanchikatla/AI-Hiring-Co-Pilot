import React, { createContext, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

// API URL from environment variable (for production deployment)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- Auth Context ---
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

  const login = (token) => {
    localStorage.setItem('authToken', token);
    setAuthToken(token);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ authToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// --- Protected Route Component ---
const ProtectedRoute = ({ children }) => {
  const { authToken } = useAuth();
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- Login Page ---
const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: username,
          password: password,
        }).toString(),
      });
      if (response.ok) {
        const data = await response.json();
        login(data.access_token);
        navigate('/');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Login failed');
      }
    } catch (err) {
      setError('Network error or server is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-icon">🚀</div>
              <span className="auth-logo-text">AI Hiring Co-pilot</span>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {error && (
              <div className="message message-error">
                <span className="message-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading ? '' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Register Page ---
const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, full_name: fullName, password }),
      });

      if (response.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Network error or server is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-icon">🚀</div>
              <span className="auth-logo-text">AI Hiring Co-pilot</span>
            </div>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Join us to start screening candidates</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            {message && (
              <div className="message message-success">
                <span className="message-icon">✓</span>
                {message}
              </div>
            )}
            {error && (
              <div className="message message-error">
                <span className="message-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading ? '' : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Score Display Component ---
const ScoreDisplay = ({ score }) => {
  const getScoreClass = () => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  return (
    <div className="candidate-score">
      <div className="score-bar">
        <div 
          className={`score-fill ${getScoreClass()}`} 
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={`score-value ${getScoreClass()}`}>
        {score.toFixed(1)}%
      </span>
    </div>
  );
};

// --- Dashboard ---
const Dashboard = () => {
  const { logout, authToken } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFiles, setResumeFiles] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = (acceptedFiles) => {
    setResumeFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const handleRemoveFile = (fileName) => {
    setResumeFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const handleAnalyzeResumes = async () => {
    setError('');
    setLoading(true);
    setAnalysisResults([]);

    if (!jobDescription) {
      setError('Please enter a job description.');
      setLoading(false);
      return;
    }
    if (resumeFiles.length === 0) {
      setError('Please upload at least one resume.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('job_description', jobDescription);
    resumeFiles.forEach(file => {
      formData.append('resume_files', file);
    });

    try {
      const response = await axios.post(`${API_URL}/analyze-resumes`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      setAnalysisResults(response.data);
    } catch (err) {
      console.error('Error analyzing resumes:', err);
      setError(err.response?.data?.detail || 'Failed to analyze resumes.');
    } finally {
      setLoading(false);
    }
  };

  const getRankClass = (index) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🚀</div>
            <span className="sidebar-logo-text">AI Co-pilot</span>
          </div>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>

        <div className="sidebar-content">
          {/* Job Description Section */}
          <div className="input-section">
            <div className="section-header">
              <span className="section-number">1</span>
              <span className="section-title">Job Description</span>
            </div>
            <textarea
              className="job-textarea"
              placeholder="Paste the job description here to match candidates..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* Upload Section */}
          <div className="input-section">
            <div className="section-header">
              <span className="section-number">2</span>
              <span className="section-title">Upload Resumes</span>
            </div>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
              <input {...getInputProps({ 'aria-label': 'Upload resume files' })} />
              <div className="dropzone-icon">📄</div>
              <p className="dropzone-text">
                {isDragActive ? 'Drop files here...' : 'Drag & drop resumes here'}
              </p>
              <p className="dropzone-hint">or click to browse (PDF, DOCX)</p>
            </div>

            {resumeFiles.length > 0 && (
              <div className="uploaded-files">
                {resumeFiles.map((file) => (
                  <div key={file.name} className="file-item">
                    <div className="file-info">
                      <span className="file-icon">📎</span>
                      <span className="file-name">{file.name}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveFile(file.name)}
                      className="file-remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {error && (
            <div className="message message-error" style={{ marginBottom: '1rem' }}>
              <span className="message-icon">⚠️</span>
              {error}
            </div>
          )}
          <button 
            onClick={handleAnalyzeResumes}
            className={`analyze-button ${loading ? 'loading' : ''}`}
            disabled={loading || !jobDescription || resumeFiles.length === 0}
          >
            {loading ? '' : '✨ Analyze Candidates'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p className="loading-text">Analyzing resumes with AI...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && analysisResults.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">Ready to find top candidates</h3>
            <p className="empty-description">
              Upload a job description and candidate resumes to get AI-powered analysis 
              with match scores and personalized interview questions.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && analysisResults.length > 0 && (
          <>
            <div className="results-header">
              <h2 className="results-title">🏆 Top Candidates</h2>
              <p className="results-count">{analysisResults.length} candidates analyzed</p>
            </div>

            <div className="results-grid">
              {analysisResults.map((candidate, index) => (
                <div key={index} className="candidate-card">
                  <div className="candidate-header">
                    <div className="candidate-info">
                      <div className={`candidate-rank ${getRankClass(index)}`}>
                        #{index + 1}
                      </div>
                      <span className="candidate-name">{candidate.filename}</span>
                    </div>
                    <ScoreDisplay score={candidate.score} />
                  </div>
                  <div className="candidate-content">
                    <div 
                      className="report-content" 
                      dangerouslySetInnerHTML={{ __html: candidate.report }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
