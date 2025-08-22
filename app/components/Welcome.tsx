import React, { useState, useEffect, useRef } from 'react';
import { SearchBox } from './SearchBoc';
interface MatrixRainProps {
  isVisible: boolean;
}

interface WelcomeProps {
  onSearch: (query: string) => Promise<void>;
}

const MatrixRain: React.FC<MatrixRainProps> = ({ isVisible }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    updateCanvasSize();
    
    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
    const matrixArray = matrix.split("");
    
    const fontSize = window.innerWidth < 768 ? 12 : 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];
    
    const maxColumns = window.innerWidth < 768 ? Math.min(columns, 50) : columns;
    
    for (let x = 0; x < maxColumns; x++) {
      drops[x] = Math.floor(Math.random() * -100); 
    }
    
    const draw = (): void => {
      if (!isVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#9CA3AF';
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        const x = i * (canvas.width / drops.length);
        ctx.fillText(text, x, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = Math.floor(Math.random() * -20);
        }
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, window.innerWidth < 768 ? 50 : 35);
    
    const handleResize = (): void => {
      updateCanvasSize();

      const newColumns = Math.floor(canvas.width / fontSize);
      const newMaxColumns = window.innerWidth < 768 ? Math.min(newColumns, 50) : newColumns;
      drops.length = newMaxColumns;
      for (let x = 0; x < newMaxColumns; x++) {
        if (drops[x] === undefined) {
          drops[x] = Math.floor(Math.random() * -100);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible]);
  
  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-30' : 'opacity-0'
      }`}
      style={{ zIndex: 1 }}
    />
  );
};

export const Welcome: React.FC<WelcomeProps> = ({ onSearch }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center px-6 py-24 bg-black relative overflow-hidden"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onTouchStart={() => isMobile && setIsHovered(true)}
      onTouchEnd={() => isMobile && setTimeout(() => setIsHovered(false), 3000)}
    >
      <MatrixRain isVisible={isHovered} />
      
      <div className="text-center space-y-12 max-w-3xl w-full relative z-10">
        <div className="space-y-6">
          <h1 className={`text-5xl md:text-7xl font-medium tracking-tight transition-all duration-500 ${
            isHovered ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'text-white'
          }`}>
            Episteme
          </h1>
          
          <p className={`text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed transition-colors duration-500 ${
            isHovered ? 'text-gray-300' : 'text-gray-400'
          }`}>
            AI-powered search, fact-checking, and content analysis
          </p>
        </div>

        <div className="max-w-xl mx-auto">
           <SearchBox onSearch={onSearch} isWelcome={true} />
        </div>
        
        
      </div>
    </div>
  );
};