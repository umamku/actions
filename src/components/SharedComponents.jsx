import React, { useState, useEffect } from 'react';

// PERBAIKAN: Gunakan titik dua (..) untuk mundur satu folder ke src, lalu masuk ke utils
// HANYA import yang dibutuhkan saja, sisanya dibuang
import { DEFAULT_LOGO_URL, DEFAULT_THEME_COLOR } from '../utils/helpers';

// --- VISUAL PROGRESS BAR ---
export const VisualProgress = ({ percent, colorClass = "bg-emerald-500" }) => (
  <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mt-3 border border-white/10 shadow-inner">
    <div className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]`} style={{ width: `${percent}%` }}></div>
  </div>
);

// --- CIRCULAR PROGRESS CHART ---
export const CircularProgress = ({ percent, color = "#10b981", bgStroke = "#e2e8f0" }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-20 h-20 transform -rotate-90 drop-shadow-lg">
        <circle cx="40" cy="40" r={radius} stroke={bgStroke} strokeWidth="8" fill="transparent" />
        <circle cx="40" cy="40" r={radius} stroke={color} strokeWidth="8" strokeDasharray={circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-out' }} strokeLinecap="round" fill="transparent" />
      </svg>
      <span className="absolute text-sm font-black text-white">{percent}%</span>
    </div>
  );
};

// --- COUNTDOWN TIMER ---
export const CountdownDisplay = ({ targetDate, label = "Sisa Waktu" }) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const end = new Date(targetDate);
      const diff = end - now;
      if (diff <= 0) return 'Kadaluarsa';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${days} Hari ${hours} Jam ${minutes} Menit`;
    };
    
    setTimeLeft(calculateTime());
    const interval = setInterval(() => setTimeLeft(calculateTime()), 60000);
    return () => clearInterval(interval);
  }, [targetDate]);
  
  return <span className="font-mono font-bold text-[10px] opacity-90">{label}: {timeLeft}</span>;
};

// --- LOGO COMPONENT ---
export const LogoComponent = ({ logoUrl, themeColor, size = "normal" }) => {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [logoUrl]);
  
  if (error) return <div className={`rounded-3xl flex items-center justify-center text-white font-black leading-none ${size === 'large' ? 'w-32 h-32 text-6xl' : 'w-10 h-10'}`} style={{ backgroundColor: themeColor || DEFAULT_THEME_COLOR }}>A</div>;
  
  return <img src={logoUrl || DEFAULT_LOGO_URL} alt="Logo" onError={() => setError(true)} className={`${size === "large" ? "w-32 h-auto drop-shadow-2xl" : "w-10 h-10 object-contain"}`} />;
};