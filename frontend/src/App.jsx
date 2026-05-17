import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';

function App() {
  const [screen, setScreen] = useState('home'); // 'home', 'landing', 'loading', 'results'
  const [mode, setMode] = useState('analyze'); // 'analyze' or 'generate'
  const [file, setFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef(null);
  const [buildTasks, setBuildTasks] = useState([
    { id: 1, label: 'Assemble Chassis', completed: false },
    { id: 2, label: 'Connect Jumper Wires', completed: false },
    { id: 3, label: 'Upload Code', completed: false },
    { id: 4, label: 'Initial Test Run', completed: false }
  ]);

  const analyzeSteps = [
    'Reading repository structure',
    'Mapping hardware & GPIO',
    'Tracing control flow',
    'Detecting comms protocols',
    'Scanning for risks',
    'Writing onboarding guide'
  ];

  const generateSteps = [
    'Interpreting your description',
    'Planning project structure',
    'Mapping hardware pins',
    'Generating starter code',
    'Writing README'
  ];

  const steps = mode === 'analyze' ? analyzeSteps : generateSteps;

  const analyzeTabs = ['Architecture', 'Hardware map', 'Control flow', 'Comms', 'Risks', 'Onboarding'];
  const generateTabs = ['Project structure', 'Pin wiring', 'Starter code', 'README'];
  const tabs = mode === 'analyze' ? analyzeTabs : generateTabs;

  const exampleChips = [
    'Line follower robot',
    'Obstacle avoidance rover',
    'Drone flight controller',
    'Robotic arm 6-DOF'
  ];

  // Poll for live updates from Bob via MCP
  useEffect(() => {
    let interval;
    if (screen === 'loading') {
      interval = setInterval(async () => {
        try {
          const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
          const response = await fetch(`${baseUrl}/live-updates`);
          const data = await response.json();
          if (data.insights) {
            setResults(data.insights);
            setScreen('results');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [screen]);

  // Simulate loading progress
  useEffect(() => {
    if (screen === 'loading') {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [screen, steps.length]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleChipClick = (text) => {
    setProjectDescription(text);
  };

  const handleAnalyze = async () => {
    if (!file && !githubUrl) return;
    
    setScreen('loading');
    setCurrentStep(0);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      await fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.error("Analysis failed:", err);
    }
  };

  const handleGenerate = async () => {
    if (!projectDescription.trim()) return;
    
    setScreen('loading');
    setCurrentStep(0);

    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: projectDescription }),
      });
      const data = await response.json();
      setResults(data);
      setScreen('results');
    } catch (err) {
      console.error("Generation failed:", err);
    }
  };

  const handleExport = async () => {
    if (!results) return;
    
    try {
      const zip = new JSZip();
      
      if (mode === 'generate') {
        zip.file("folder_structure.json", JSON.stringify(results.folder_structure, null, 2));
        zip.file("pin_wiring.json", JSON.stringify(results.pin_wiring, null, 2));
        zip.file("main_code.cpp", results.starter_code); 
        zip.file("README.md", results.readme);
      } else {
        zip.file("analysis_results.json", JSON.stringify(results, null, 2));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `jumpr_${mode}_export.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleNewAnalysis = () => {
    setScreen('landing');
    setFile(null);
    setGithubUrl('');
    setProjectDescription('');
    setResults(null);
    setActiveTab(0);
    setCurrentStep(0);
  };

  const toggleBuildTask = (taskId) => {
    setBuildTasks(tasks =>
      tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          {screen === 'results' && (
            <button className="back-button" onClick={handleNewAnalysis}>
              ← New
            </button>
          )}
          {screen !== 'results' && (
            <div className="logo-container" onClick={() => setScreen('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg className="hexagon-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <span className="wordmark">Jumpr</span>
            </div>
          )}
          {screen === 'results' && (
            <div className="logo-container" onClick={() => setScreen('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg className="hexagon-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <span className="wordmark">Jumpr</span>
            </div>
          )}
        </div>
        <div className="topbar-nav">
          <a href="#chat" className="nav-link" onClick={(e) => { e.preventDefault(); alert("Bob Chat Interface coming soon! (V2 Feature)"); }}>Chat</a>
          <a href="#about" className="nav-link" onClick={(e) => { e.preventDefault(); alert("Jumpr is an AI-powered robotics scaffolding engine built with IBM watsonx.ai."); }}>About</a>
        </div>
        <div className="bob-badge">
          Powered by IBM Bob
        </div>
      </div>

      {/* Home Screen */}
      {screen === 'home' && (
        <div className="home-container">
          <div className="home-hero">
            <svg className="home-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <h1 className="home-title">Jumpr</h1>
            <p className="home-tagline">Your AI-Powered Robotics Intelligence Platform</p>
            <p className="home-description">
              Jumpr helps robotics builders understand complex codebases instantly and generate complete project starter kits.
              Whether you're analyzing an existing robot or starting from scratch, Jumpr provides intelligent insights,
              wiring diagrams, and production-ready code powered by IBM Watson AI.
            </p>
            <button className="enter-app-button" onClick={() => setScreen('landing')}>
              Enter App →
            </button>
          </div>

          <div className="home-features">
            <div className="feature-card">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <h3>Analyze Repositories</h3>
              <p>Upload your robotics codebase and get instant insights on architecture, hardware mapping, and control flow.</p>
            </div>

            <div className="feature-card">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 18L22 12L16 6M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Generate Projects</h3>
              <p>Describe your robotics idea in plain English and get complete starter code, wiring diagrams, and documentation.</p>
            </div>

            <div className="feature-card">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Track Progress</h3>
              <p>Use our built-in roadmap to track your build progress from assembly to testing.</p>
            </div>
          </div>

          {/* Section 1: Deep Repository Analysis */}
          <section className="feature-section section-left">
            <div className="section-content">
              <h2 className="section-title">Understand Any Robot</h2>
              <p className="section-description">
                Jumpr's AI engine dissects your uploaded .zip files or GitHub repositories with surgical precision.
                It traces every control flow path, maps hardware dependencies, and exposes communication protocols
                that would take hours to manually discover. Whether it's a legacy codebase or a cutting-edge autonomous
                system, Jumpr reveals the architecture instantly—giving you x-ray vision into any robotics project.
              </p>
              <ul className="section-features">
                <li>🔍 Automatic control flow tracing</li>
                <li>📡 Protocol detection (I2C, SPI, UART, CAN)</li>
                <li>🏗️ Architecture pattern recognition</li>
                <li>⚡ Real-time dependency mapping</li>
              </ul>
            </div>
            <div className="section-visual">
              <div className="code-visual">
                <div className="code-line">
                  <span className="code-keyword">void</span> <span className="code-function">loop</span>() {'{'}
                </div>
                <div className="code-line indent">
                  <span className="code-function">readSensors</span>();
                </div>
                <div className="code-line indent">
                  <span className="code-function">processData</span>();
                </div>
                <div className="code-line indent">
                  <span className="code-function">updateMotors</span>();
                </div>
                <div className="code-line">{'}'}
                </div>
                <div className="glow-effect"></div>
              </div>
            </div>
          </section>

          {/* Section 2: Zero Wiring Errors */}
          <section className="feature-section section-right">
            <div className="section-visual">
              <div className="pin-visual">
                <div className="pin-diagram">
                  <div className="pin-row">
                    <div className="pin active">D2</div>
                    <div className="pin active">D3</div>
                    <div className="pin">D4</div>
                    <div className="pin active">D5</div>
                  </div>
                  <div className="pin-row">
                    <div className="pin active">A0</div>
                    <div className="pin">A1</div>
                    <div className="pin active">A2</div>
                    <div className="pin">A3</div>
                  </div>
                  <div className="pin-label">Arduino Uno</div>
                </div>
                <div className="glow-effect"></div>
              </div>
            </div>
            <div className="section-content">
              <h2 className="section-title">Hardware Mapping, Perfected</h2>
              <p className="section-description">
                Say goodbye to fried components and debugging nightmares. Jumpr generates exact, AI-verified
                pin mappings for every sensor, motor, and communication line in your project. Whether analyzing
                existing code or generating new projects, our intelligent system ensures every wire connects
                to the right pin—protecting your hardware and your sanity.
              </p>
              <ul className="section-features">
                <li>📍 Precise GPIO pin assignments</li>
                <li>🛡️ Voltage compatibility checks</li>
                <li>🔌 Auto-generated wiring diagrams</li>
                <li>✅ Hardware conflict detection</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Start Building Instantly */}
          <section className="feature-section section-left">
            <div className="section-content">
              <h2 className="section-title">From Concept to Code</h2>
              <p className="section-description">
                Describe your robotics vision in plain English, and watch Jumpr's generative engine transform
                it into reality. Get a complete, production-ready .zip file containing structured starter code,
                comprehensive documentation, and exact wiring specifications. No more staring at blank files—
                start building immediately with a solid foundation that follows industry best practices.
              </p>
              <ul className="section-features">
                <li>🚀 Production-ready starter code</li>
                <li>📦 Complete project structure</li>
                <li>📝 Auto-generated documentation</li>
                <li>⚙️ Configurable build templates</li>
              </ul>
            </div>
            <div className="section-visual">
              <div className="download-visual">
                <svg className="download-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 21H9C7.11438 21 6.17157 21 5.58579 20.4142C5 19.8284 5 18.8856 5 17V16M19 16V17C19 18.8856 19 19.8284 18.4142 20.4142C17.8284 21 16.8856 21 15 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="file-stack">
                  <div className="file-item">main.cpp</div>
                  <div className="file-item">README.md</div>
                  <div className="file-item">wiring.json</div>
                </div>
                <div className="glow-effect"></div>
              </div>
            </div>
          </section>

          <footer className="home-footer">
            <p>Powered by IBM Watson AI • Built with ❤️ for robotics builders</p>
          </footer>
        </div>
      )}

      {/* Landing Screen */}
      {screen === 'landing' && (
        <div className="landing-container">
          <div className="hero-section">
            <div className="hero-label">ROBOTICS INTELLIGENCE</div>
            <h1 className="hero-title">
              Understand any <span className="highlight">robotics codebase</span>
            </h1>
            <p className="hero-subtext">
              Upload your repository for instant analysis, or describe your project to generate a complete robotics starter kit with code, wiring diagrams, and documentation.
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button 
              className={`mode-button ${mode === 'analyze' ? 'active' : ''}`}
              onClick={() => setMode('analyze')}
            >
              Analyze a repo
            </button>
            <button 
              className={`mode-button ${mode === 'generate' ? 'active' : ''}`}
              onClick={() => setMode('generate')}
            >
              Start a project
            </button>
          </div>

          {/* Analyze Mode Panel */}
          {mode === 'analyze' && (
            <div className="input-panel">
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".zip"
                />
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3>Drop your repo here or click to browse</h3>
                <p>Upload a .zip file of your repository</p>
                {file && (
                  <div className="file-selected">
                    ✓ {file.name}
                  </div>
                )}
              </div>

              <div className="divider">OR</div>

              <div className="github-input-row">
                <input
                  type="text"
                  className="github-input"
                  placeholder="https://github.com/username/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <button className="fetch-button">Fetch</button>
              </div>

              <button 
                className="primary-button"
                onClick={handleAnalyze}
                disabled={!file && !githubUrl}
              >
                Analyze with IBM Bob
              </button>
            </div>
          )}

          {/* Generate Mode Panel */}
          {mode === 'generate' && (
            <div className="input-panel">
              <textarea
                className="project-textarea"
                placeholder="Describe your robotics project... e.g. Arduino Uno, 2 DC motors, IR sensor for line following"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={6}
              />

              <div className="example-chips">
                {exampleChips.map((chip, i) => (
                  <button 
                    key={i} 
                    className="chip"
                    onClick={() => handleChipClick(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <button 
                className="primary-button purple"
                onClick={handleGenerate}
                disabled={!projectDescription.trim()}
              >
                Generate with IBM Bob
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Screen */}
      {screen === 'loading' && (
        <div className="loading-container">
          <svg className="loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <div className="loading-step">{steps[currentStep]}</div>
          <div className="progress-list">
            {steps.map((step, i) => (
              <div 
                key={i} 
                className={`progress-item ${
                  i < currentStep ? 'completed' : 
                  i === currentStep ? 'active' : 
                  'pending'
                }`}
              >
                <svg className={`progress-icon ${
                  i < currentStep ? 'completed' : 
                  i === currentStep ? 'active' : 
                  'pending'
                }`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {i < currentStep ? (
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  )}
                </svg>
                <span className="progress-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Screen */}
      {screen === 'results' && results && (
        <div className="results-container">
          <div className="results-header">
            <div className="results-title-section">
              <h2>{file?.name || 'Generated Project'}</h2>
              <div className="results-subtitle">
                {mode === 'analyze' ? 'Analyzed' : 'Generated'} via IBM Bob · {tabs.length} sections ready
              </div>
            </div>
            <button className="export-button" onClick={handleExport}>
              <svg className="export-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 21H9C7.11438 21 6.17157 21 5.58579 20.4142C5 19.8284 5 18.8856 5 17V16M19 16V17C19 18.8856 19 19.8284 18.4142 20.4142C17.8284 21 16.8856 21 15 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export
            </button>
          </div>

          <div className="results-main-layout">
            <div className="results-content">
              <div className="tabs-container">
                <div className="tabs-row">
                  {tabs.map((tab, i) => (
                    <button
                      key={i}
                      className={`tab-button ${activeTab === i ? 'active' : ''} ${mode === 'generate' ? 'purple' : ''}`}
                      onClick={() => setActiveTab(i)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

          {/* Result Panels */}
          {mode === 'analyze' && (
            <>
              {activeTab === 0 && results.architecture && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Architecture</h3>
                  </div>
                  <div className="panel-body">
                    <p>{results.architecture.overview}</p>
                    {results.architecture.patterns && (
                      <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem' }}>
                        {results.architecture.patterns.map((pattern, i) => (
                          <li key={i} style={{ marginBottom: '0.5rem' }}>{pattern}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 1 && results.hardware_mapping && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M6 10H6.01M10 10H10.01M14 10H14.01M18 10H18.01M6 14H6.01M10 14H10.01M14 14H14.01M18 14H18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <h3 className="panel-title">Hardware Map</h3>
                  </div>
                  <div className="panel-body">
                    <p style={{ marginBottom: '1.5rem' }}>{results.hardware_mapping.resource_utilization}</p>
                    <div className="pin-grid">
                      {results.hardware_mapping.deployment_targets?.map((target, i) => (
                        <div key={i} className="pin-card">
                          <div className="pin-number">Target {i + 1}</div>
                          <div className="pin-description">{target}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && results.control_flow && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Control Flow</h3>
                  </div>
                  <div className="panel-body">
                    <p><strong>Primary Pipeline:</strong> {results.control_flow.primary_pipeline}</p>
                    <p style={{ marginTop: '1rem' }}><strong>Error Handling:</strong> {results.control_flow.error_handling}</p>
                  </div>
                </div>
              )}

              {activeTab === 3 && results.communication && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Communication</h3>
                  </div>
                  <div className="panel-body">
                    <p><strong>Internal:</strong> {results.communication.internal}</p>
                    {results.communication.protocols && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Protocols:</strong>
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          {results.communication.protocols.map((protocol, i) => (
                            <li key={i}>{protocol}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 4 && results.risks && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.9011 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.9011 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Risks</h3>
                  </div>
                  <div className="risk-list">
                    {results.risks.map((risk, i) => (
                      <div key={i} className="risk-item">
                        <span className={`risk-badge ${i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low'}`}>
                          {i % 3 === 0 ? 'HIGH' : i % 3 === 1 ? 'MEDIUM' : 'LOW'}
                        </span>
                        <span className="risk-description">{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 5 && results.onboarding_summary && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Onboarding Summary</h3>
                  </div>
                  <div className="panel-body">
                    <p>{results.onboarding_summary.tldr}</p>
                    {results.onboarding_summary.key_files && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Key Files:</strong>
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          {results.onboarding_summary.key_files.map((file, i) => (
                            <li key={i}>{file}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'generate' && (
            <>
              {activeTab === 0 && results.folder_structure && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Project Structure</h3>
                  </div>
                  <div className="code-block">
                    <pre>{JSON.stringify(results.folder_structure, null, 2)}</pre>
                  </div>
                </div>
              )}

              {activeTab === 1 && results.pin_wiring && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M6 10H6.01M10 10H10.01M14 10H14.01M18 10H18.01M6 14H6.01M10 14H10.01M14 14H14.01M18 14H18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <h3 className="panel-title">Pin Wiring</h3>
                  </div>
                  <div className="pin-grid">
                    {Object.entries(results.pin_wiring).map(([component, pins]) => (
                      <div key={component} className="pin-card">
                        <div className="pin-number">{component.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="pin-description">
                          {Object.entries(pins).map(([pin, value]) => (
                            <div key={pin}>{pin}: {value}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 2 && results.starter_code && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 18L22 12L16 6M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">Starter Code</h3>
                  </div>
                  <div className="code-block">
                    <pre>{results.starter_code}</pre>
                  </div>
                </div>
              )}

              {activeTab === 3 && results.readme && (
                <div className="result-panel">
                  <div className="panel-header">
                    <svg className="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h3 className="panel-title">README</h3>
                  </div>
                  <div className="code-block">
                    <pre>{results.readme}</pre>
                  </div>
                </div>
              )}
            </>
          )}
            </div>

            {/* Build Roadmap Sidebar */}
            <div className="build-roadmap-sidebar">
              <div className="roadmap-header">
                <svg className="roadmap-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3>Build Roadmap</h3>
              </div>
              <div className="roadmap-tasks">
                {buildTasks.map(task => (
                  <label key={task.id} className="task-item">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleBuildTask(task.id)}
                    />
                    <span className={task.completed ? 'completed' : ''}>{task.label}</span>
                  </label>
                ))}
              </div>
              
              {/* GitHub Call-to-Action */}
              <div className="github-cta">
                <svg className="github-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
                </svg>
                <div className="cta-text">
                  <strong>☁️ Sign in with GitHub</strong>
                  <span>to save this project to your dashboard</span>
                  <span className="coming-soon">(Coming Soon)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

// Made with Bob
