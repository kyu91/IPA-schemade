import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(95);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 프론트엔드에서는 값의 유무만 확인하고 로그인을 허용합니다.
    // 실제 보안 검증은 서버(Vercel Function)에서 환경 변수와 비교하여 처리합니다.
    if (loginEmail && loginPassword) {
      setIsLoggedIn(true);
      setLoginError(null);
    } else {
      setLoginError('아이디와 비밀번호를 입력해주세요.');
    }
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
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

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
        <h1>Image Background Blender</h1>
        <p>Set opacity, then select an image to automatically process and download it.</p>
      </header>

      <main>
        <div className="settings-section">
          <h2>1. Set Opacity</h2>
          <div className="slider-container">
            <label htmlFor="opacity-slider">Opacity: {opacity}%</label>
            <input
              id="opacity-slider"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="upload-section">
          <h2>2. Select Your Image</h2>
          <p>Processing and download will start automatically.</p>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {selectedFile && !isLoading && !error && <p>Last file: {selectedFile.name}</p>}
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
