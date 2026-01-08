// src/utils/helpers.js

// --- 1. KONSTANTA PENTING (Password & Defaults) ---
export const TRIAL_UNLOCK_PASSWORD = "KodeRahasia123!";
export const LEGACY_PASSWORD = "Mapeline123!";

export const DEFAULT_LOGO_URL = "https://actions-mapeline.vercel.app/mapeline.png";
export const DEFAULT_SCRIPT_URL = "";
export const DEFAULT_THEME_COLOR = "#059669";
export const DEFAULT_ADMIN_HASH = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5";
export const DEFAULT_EMPLOYEES = [];

export const TARGET_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly', 
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM_DATE: 'custom_date',
  NO_DEADLINE: 'no_deadline'
};

// --- 2. GENERATORS & FETCHERS ---
export const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ACT-';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

export const fetchWithTimeout = async (resource, options = {}) => {
  const { timeout = 15000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// --- 3. COLOR UTILS ---
export const adjustColor = (color, amount) => {
  if (!color) return '#000000';
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).slice(-2));
}

export const ensureReadableColor = (hex) => {
  if (!hex) return '#000000';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150 ? adjustColor(hex, -80) : hex;
}

export const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const getDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    if (!imageUrl || imageUrl === DEFAULT_LOGO_URL) {
      resolve(DEFAULT_THEME_COLOR);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    
    const timeout = setTimeout(() => {
      resolve(DEFAULT_THEME_COLOR);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50; canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            const alpha = imageData[i + 3];
            if (alpha < 128) continue;
            const cr = imageData[i], cg = imageData[i + 1], cb = imageData[i + 2];
            const brightness = (cr + cg + cb) / 3;
            if (brightness > 240 || brightness < 15) continue;
            r += cr; g += cg; b += cb; count++;
        }
        if (count === 0) { resolve(DEFAULT_THEME_COLOR); return; }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        let hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        resolve(ensureReadableColor(hex));
      } catch (e) { resolve(DEFAULT_THEME_COLOR); }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(DEFAULT_THEME_COLOR);
    };
  });
};

// --- 4. DATE UTILS ---
export const addTime = (baseDateStr, type, amount) => {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  if (isNaN(base.getTime())) return new Date().toISOString().slice(0, 16);
  const result = new Date(base);
  if (type === 'days') result.setDate(result.getDate() + amount);
  if (type === 'months') result.setMonth(result.getMonth() + amount);
  if (type === 'years') result.setFullYear(result.getFullYear() + amount);
  const offset = result.getTimezoneOffset() * 60000;
  return (new Date(result - offset)).toISOString().slice(0, 16);
};

export const getLocalDateString = (dateObj) => {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- 5. SECURITY (HASHING) ---
export const hashString = async (str) => {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifySecurePassword = async (input, storedHash) => {
  // Menggunakan konstanta yang didefinisikan di atas
  if (input === TRIAL_UNLOCK_PASSWORD || input === LEGACY_PASSWORD) return true;
  if (!storedHash) return false;
  if (input === storedHash) return true;
  try {
    const inputHash = await hashString(input);
    if (inputHash === storedHash) return true;
  } catch(e) { console.error("Hashing failed:", e); }
  return false;
};

// --- 6. LOGIC / SCORING ---
export const getInsight = (score) => {
  if (score >= 90) return { title: "Performa Elit", text: "Target tercapai maksimal.", color: "text-white", subColor: "text-emerald-100", bg: "bg-gradient-to-br from-emerald-600 to-emerald-800", border: "border-emerald-500", shadow: "shadow-emerald-500/40", barColor: "bg-emerald-400", hex: "#34d399", bgCircle: "rgba(255,255,255,0.2)" };
  if (score >= 70) return { title: "Sangat Solid", text: "Kerja tim yang produktif.", color: "text-white", subColor: "text-blue-100", bg: "bg-gradient-to-br from-blue-600 to-blue-800", border: "border-blue-500", shadow: "shadow-blue-500/40", barColor: "bg-blue-400", hex: "#60a5fa", bgCircle: "rgba(255,255,255,0.2)" };
  if (score >= 50) return { title: "Cukup Stabil", text: "Pertahankan konsistensi.", color: "text-white", subColor: "text-orange-100", bg: "bg-gradient-to-br from-orange-500 to-orange-700", border: "border-orange-400", shadow: "shadow-orange-500/40", barColor: "bg-orange-300", hex: "#fdba74", bgCircle: "rgba(255,255,255,0.2)" };
  return { title: "Butuh Evaluasi", text: "Tingkatkan penyelesaian tugas.", color: "text-white", subColor: "text-red-100", bg: "bg-gradient-to-br from-red-600 to-red-800", border: "border-red-500", shadow: "shadow-red-500/40", barColor: "bg-red-400", hex: "#f87171", bgCircle: "rgba(255,255,255,0.2)" };
};

export const calculateLevel = (points) => {
  if (points < 100) return { level: 1, name: "Pemula", nextLevelPoints: 100 };
  if (points < 300) return { level: 2, name: "Junior", nextLevelPoints: 300 };
  if (points < 600) return { level: 3, name: "Senior", nextLevelPoints: 600 };
  if (points < 1000) return { level: 4, name: "Expert", nextLevelPoints: 1000 };
  if (points < 1500) return { level: 5, name: "Master", nextLevelPoints: 1500 };
  return { level: 6, name: "Legend", nextLevelPoints: Infinity };
};

// --- 7. TARGET UTILS ---
export const calculateTargetProgress = (target, actual) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
};

export const getTargetTypeLabel = (type) => {
  switch(type) {
    case TARGET_TYPES.DAILY: return 'Harian';
    case TARGET_TYPES.WEEKLY: return 'Mingguan';
    case TARGET_TYPES.MONTHLY: return 'Bulanan';
    case TARGET_TYPES.QUARTERLY: return 'Triwulan';
    case TARGET_TYPES.YEARLY: return 'Tahunan';
    case TARGET_TYPES.CUSTOM_DATE: return 'Tanggal Khusus';
    case TARGET_TYPES.NO_DEADLINE: return 'Tanpa Tenggat';
    default: return 'Tidak Diketahui';
  }
};

export const getTargetStatus = (target) => {
  if (!target) return 'not_set';
  const now = new Date();
  
  if (target.type === TARGET_TYPES.NO_DEADLINE) return 'active';
  
  if (target.type === TARGET_TYPES.CUSTOM_DATE && target.deadline) {
    const deadline = new Date(target.deadline);
    if (now > deadline) return 'expired';
    return 'active';
  }
  
  // For recurring targets, check based on period
  if (target.type === TARGET_TYPES.DAILY) {
    const today = getLocalDateString(now);
    const lastReset = target.lastReset ? getLocalDateString(new Date(target.lastReset)) : null;
    if (lastReset !== today) return 'needs_reset';
  }
  
  if (target.type === TARGET_TYPES.WEEKLY) {
    const currentWeek = Math.floor(now.getDate() / 7);
    const lastResetWeek = target.lastReset ? Math.floor(new Date(target.lastReset).getDate() / 7) : null;
    if (lastResetWeek !== currentWeek) return 'needs_reset';
  }
  
  if (target.type === TARGET_TYPES.MONTHLY) {
    const currentMonth = now.getMonth();
    const lastResetMonth = target.lastReset ? new Date(target.lastReset).getMonth() : null;
    if (lastResetMonth !== currentMonth) return 'needs_reset';
  }
  
  return 'active';
};

export const resetTargetIfNeeded = (target) => {
  const status = getTargetStatus(target);
  if (status === 'needs_reset') {
    return {
      ...target,
      currentValue: 0,
      lastReset: new Date().toISOString()
    };
  }
  return target;
};

// --- 8. GEOLOCATION UTILS ---
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung'));
      return;
    }
    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED: errorMessage = 'Izin lokasi ditolak.'; break;
          case error.POSITION_UNAVAILABLE: errorMessage = 'Informasi lokasi tidak tersedia.'; break;
          case error.TIMEOUT: errorMessage = 'Request lokasi timeout.'; break;
          default: errorMessage = 'Error tidak diketahui.';
        }
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

export const verifyLocation = async (gamificationConfig) => {
  try {
    const currentLocation = await getCurrentLocation();
    if (!gamificationConfig.companyLat || !gamificationConfig.companyLng) {
      return { valid: true, distance: 0, location: currentLocation };
    }
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      gamificationConfig.companyLat,
      gamificationConfig.companyLng
    );
    const isValid = distance <= gamificationConfig.locationRadius;
    return {
      valid: isValid,
      distance: Math.round(distance),
      location: currentLocation,
      accuracy: currentLocation.accuracy
    };
  } catch (error) {
    return { valid: false, error: error.message, location: null };
  }
};