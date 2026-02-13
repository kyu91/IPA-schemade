import React, { useState, useEffect } from 'react';
import './App.css';

interface ProcessingItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  error?: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>(localStorage.getItem('email') || '');
  const [loginPassword, setLoginPassword] = useState<string>(localStorage.getItem('password') || '');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(95);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 자동 로그인 체크 (페이지 로드 시)
  useEffect(() => {
    if (loginEmail && loginPassword) {
      setIsLoggedIn(true);
    }
  }, []);

  // 클립보드 붙여넣기 이벤트 핸들러
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isLoggedIn) return;

      const items = e.clipboardData?.items;
      if (items) {
        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) imageFiles.push(file);
          }
        }
        if (imageFiles.length > 0) {
          addFilesToQueue(imageFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      localStorage.setItem('email', loginEmail);
      localStorage.setItem('password', loginPassword);
      setIsLoggedIn(true);
      setLoginError(null);
    } else {
      setLoginError('아이디와 비밀번호를 입력해주세요.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('password');
    setIsLoggedIn(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  // Effect to automatically start processing when new items are added
  useEffect(() => {
    const pendingItems = processingItems.filter(item => item.status === 'pending');
    pendingItems.forEach(item => {
      processItem(item);
    });
  }, [processingItems]);

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: ProcessingItem[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        status: 'pending',
        progress: 0
      }));

    if (newItems.length > 0) {
      setProcessingItems(prev => [...prev, ...newItems]);
      setStatusMessage(`${newItems.length}개의 새로운 작업이 추가되었습니다.`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      addFilesToQueue(event.target.files);
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const processItem = async (item: ProcessingItem) => {
    // Update status to processing
    setProcessingItems(prev => 
      prev.map(p => p.id === item.id ? { ...p, status: 'processing', progress: 10 } : p)
    );

    const formData = new FormData();
    formData.append('image', item.file);
    formData.append('opacity', String(opacity / 100));
    formData.append('email', loginEmail);
    formData.append('password', loginPassword);

    try {
      const apiUrl = '/api/process-image';
      
      // Simulate progress while waiting for the actual response
      const progressInterval = setInterval(() => {
        setProcessingItems(prev => 
          prev.map(p => {
            if (p.id === item.id && p.status === 'processing' && p.progress < 90) {
              return { ...p, progress: p.progress + 5 };
            }
            return p;
          })
        );
      }, 500);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          setIsLoggedIn(false);
          throw new Error('인증 실패');
        }
        throw new Error(errorText || 'Failed to process image.');
      }

      const data = await response.json();
      
      setProcessingItems(prev => 
        prev.map(p => p.id === item.id ? { 
          ...p, 
          status: 'completed', 
          progress: 100, 
          resultUrl: data.resultUrl 
        } : p)
      );

      // Auto-download for completed item
      const link = document.createElement('a');
      link.href = data.resultUrl;
      link.setAttribute('download', `processed-${item.file.name}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      setProcessingItems(prev => 
        prev.map(p => p.id === item.id ? { 
          ...p, 
          status: 'error', 
          error: err.message || 'Error occurred' 
        } : p)
      );
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container login-container">
        <header>
          <h1>Image Background Blender</h1>
          <p>서비스를 이용하려면 로그인하세요.</p>
        </header>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>아이디 (이메일)</label>
            <input 
              type="email" 
              value={loginEmail} 
              onChange={(e) => setLoginEmail(e.target.value)} 
              placeholder="example@daum.net"
              required 
            />
          </div>
          <div className="input-group">
            <label>비밀번호</label>
            <input 
              type="password" 
              value={loginPassword} 
              onChange={(e) => setLoginPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          {loginError && <p className="error-message">{loginError}</p>}
          <button type="submit" className="login-button">로그인</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="brand-logo">SCHEMADE</div>
      <header>
        <div className="header-top">
          <h1>Image Background Blender</h1>
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
        <p>Set opacity, then select an image to automatically process and download it.</p>
      </header>

      <main>
        <div className="settings-section">
          <h2>1. Set Opacity</h2>
          <div className="input-container">
            <label htmlFor="opacity-input">Opacity (0-100%): </label>
            <input
              id="opacity-input"
              type="number"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="number-input"
            />
            <span className="unit-label">%</span>
          </div>
        </div>

        <div 
          className={`upload-section ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h2>2. Select, Drag & Drop or Paste</h2>
          <p>You can select <strong>multiple images</strong> at once.</p>
          <input type="file" accept="image/*" onChange={handleFileChange} multiple />
          {statusMessage && <p className="status-message">{statusMessage}</p>}
        </div>

        {processingItems.length > 0 && (
          <div className="processing-list">
            <h3>Processing Queue ({processingItems.length})</h3>
            <div className="items-container">
              {processingItems.map(item => (
                <div key={item.id} className={`process-item ${item.status}`}>
                  <div className="item-info">
                    <span className="file-name">{item.file.name}</span>
                    <span className="status-badge">{item.status}</span>
                  </div>
                  
                  {item.status !== 'completed' && item.status !== 'error' && (
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${item.progress}%` }}></div>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="item-result">
                      <img src={item.resultUrl} alt="Result" className="mini-preview" />
                      <a href={item.resultUrl} download={`processed-${item.file.name}`} className="mini-download">
                        Download
                      </a>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="item-error">{item.error}</div>
                  )}
                </div>
              ))}
            </div>
            <button 
              className="clear-button" 
              onClick={() => setProcessingItems([])}
            >
              Clear All
            </button>
          </div>
        )}
      </main>
      
      <footer>
        <p>Powered by React, Node.js, and Unsplash.</p>
      </footer>
    </div>
  );
}

export default App;
