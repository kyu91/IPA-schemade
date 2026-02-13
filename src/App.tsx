import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>(localStorage.getItem('email') || '');
  const [loginPassword, setLoginPassword] = useState<string>(localStorage.getItem('password') || '');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              setProcessedImageUrl(null);
              setError(null);
              setStatusMessage('클립보드 이미지가 감지되었습니다. 작업을 시작합니다.');
              setSelectedFile(file);
              break;
            }
          }
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

  // Effect to automatically start processing when a file is selected
  useEffect(() => {
    if (selectedFile) {
      handleProcessImage();
    }
  }, [selectedFile]);

  // Effect to automatically download the image when the URL is ready
  useEffect(() => {
    if (processedImageUrl) {
      const link = document.createElement('a');
      link.href = processedImageUrl;
      link.setAttribute('download', `processed-${Date.now()}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [processedImageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setProcessedImageUrl(null);
      setError(null);
      setStatusMessage('새로운 작업이 시작되었습니다. 기존 결과물은 삭제되었습니다.');
      setSelectedFile(event.target.files[0]);
      
      // 같은 파일 반복 선택이 가능하도록 value 초기화
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
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setProcessedImageUrl(null);
        setError(null);
        setStatusMessage('새로운 작업이 시작되었습니다. 기존 결과물은 삭제되었습니다.');
        setSelectedFile(file);
      } else {
        setError('이미지 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('opacity', String(opacity / 100));
    // 로그인 정보를 서버로 함께 보냅니다.
    formData.append('email', loginEmail);
    formData.append('password', loginPassword);

    try {
      const apiUrl = '/api/process-image';

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          setIsLoggedIn(false); // 인증 실패 시 다시 로그인 화면으로
          throw new Error('로그인 정보가 만료되었거나 틀렸습니다.');
        }
        throw new Error(errorText || 'Failed to process image.');
      }

      const data = await response.json();
      setProcessedImageUrl(data.resultUrl);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
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
          <p>Click to select, drag a file here, or just press <strong>Ctrl+V</strong> to paste from clipboard.</p>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {statusMessage && <p className="status-message">{statusMessage}</p>}
          {selectedFile && !isLoading && !error && !statusMessage && <p>Current file: {selectedFile.name}</p>}
        </div>

        {error && <div className="error-message">{error}</div>}

        {isLoading && (
          <div className='status-section'>
            <div className="loading-spinner"></div>
            <p>Processing image...</p>
          </div>
        )}

        {processedImageUrl && !isLoading && (
          <div className="result-section">
            <h3>Download Started!</h3>
            <p>If your download didn't start, you can use the link below.</p>
            <img src={processedImageUrl} alt="Processed result" className="result-image" />
            <a href={processedImageUrl} download={`processed-${Date.now()}.png`} className="download-button">
              Download Again
            </a>
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
