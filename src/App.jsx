import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  CheckCircle, 
  ListTodo, 
  LogOut, 
  Settings, 
  Save, 
  Loader2, 
  Clipboard, 
  User, 
  Clock, 
  ChevronLeft, 
  Zap, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  ChevronDown,
  RefreshCw,
  Users,
  History,
  Trophy,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Lightbulb,
  CloudDownload,
  BarChart,
  AlertTriangle,
  Fingerprint,
  ShieldEllipsis,
  Activity,
  CloudOff,
  Lock,
  UserPlus,
  UserMinus,
  SaveAll,
  Image as ImageIcon,
  ArrowUpFromLine,
  ArrowDownToLine,
  Timer,
  Unlock,
  CalendarClock,
  Key,
  CalendarPlus,
  CreditCard,
  FileX,
  Database,
  Trash
} from 'lucide-react';

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC-yq8-WrafQPCfSsWk6LQAIT8-h3GofyQ",
  authDomain: "actions-a8e4c.firebaseapp.com",
  projectId: "actions-a8e4c",
  storageBucket: "actions-a8e4c.firebasestorage.app",
  messagingSenderId: "209650413048",
  appId: "1:209650413048:web:249592156a9d07793cba0d",
  measurementId: "G-PQJ4G00GRH"
};

// Inisialisasi
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// TAMBAHKAN BARIS INI:
//const appId = "actions-v3";
const appId = import.meta.env.VITE_APP_ID || "klien-demo";

// --- CONSTANTS ---
const DEFAULT_EMPLOYEES = [];
const DEFAULT_LOGO_URL = "https://actions-mapeline.vercel.app/mapeline.png";
// URL Default Google Sheet (Diperbarui sesuai permintaan)
const DEFAULT_SCRIPT_URL = "";
const DEFAULT_THEME_COLOR = "#059669"; 
const TRIAL_UNLOCK_PASSWORD = "KodeRahasia123!"; 
const LEGACY_PASSWORD = "Mapeline123!"; 
const DEFAULT_ADMIN_HASH = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5"; 

// --- HELPER FUNCTIONS ---

const fetchWithTimeout = async (resource, options = {}) => {
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

const adjustColor = (color, amount) => {
    if (!color) return '#000000';
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

const ensureReadableColor = (hex) => {
    if (!hex) return '#000000';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma > 150) { 
         return adjustColor(hex, -80); 
    }
    return hex;
}

const getDominantColor = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50; 
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            const alpha = imageData[i + 3];
            if (alpha < 128) continue; 
            const cr = imageData[i];
            const cg = imageData[i + 1];
            const cb = imageData[i + 2];
            const brightness = (cr + cg + cb) / 3;
            if (brightness > 240 || brightness < 15) continue; 
            r += cr; g += cg; b += cb; count++;
        }
        if (count === 0) { resolve(DEFAULT_THEME_COLOR); return; }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        let hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        hex = ensureReadableColor(hex);
        resolve(hex);
      } catch (e) { resolve(DEFAULT_THEME_COLOR); }
    };
    img.onerror = () => resolve(DEFAULT_THEME_COLOR);
  });
};

const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const addTime = (baseDateStr, type, amount) => {
    const base = baseDateStr ? new Date(baseDateStr) : new Date();
    if (isNaN(base.getTime())) return new Date().toISOString().slice(0, 16);
    const result = new Date(base);
    if (type === 'days') result.setDate(result.getDate() + amount);
    if (type === 'months') result.setMonth(result.getMonth() + amount);
    if (type === 'years') result.setFullYear(result.getFullYear() + amount);
    const offset = result.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(result - offset)).toISOString().slice(0, 16);
    return localISOTime;
};

const getLocalDateString = (dateObj) => {
    const d = dateObj || new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getInsight = (score) => {
    if (score >= 90) return { title: "Performa Elit", text: "Target tercapai maksimal.", color: "text-white", subColor: "text-emerald-100", bg: "bg-gradient-to-br from-emerald-600 to-emerald-800", border: "border-emerald-500", shadow: "shadow-emerald-500/40", barColor: "bg-emerald-400", hex: "#34d399", bgCircle: "rgba(255,255,255,0.2)" };
    if (score >= 70) return { title: "Sangat Solid", text: "Kerja tim yang produktif.", color: "text-white", subColor: "text-blue-100", bg: "bg-gradient-to-br from-blue-600 to-blue-800", border: "border-blue-500", shadow: "shadow-blue-500/40", barColor: "bg-blue-400", hex: "#60a5fa", bgCircle: "rgba(255,255,255,0.2)" };
    if (score >= 50) return { title: "Cukup Stabil", text: "Pertahankan konsistensi.", color: "text-white", subColor: "text-orange-100", bg: "bg-gradient-to-br from-orange-500 to-orange-700", border: "border-orange-400", shadow: "shadow-orange-500/40", barColor: "bg-orange-300", hex: "#fdba74", bgCircle: "rgba(255,255,255,0.2)" };
    return { title: "Butuh Evaluasi", text: "Tingkatkan penyelesaian tugas.", color: "text-white", subColor: "text-red-100", bg: "bg-gradient-to-br from-red-600 to-red-800", border: "border-red-500", shadow: "shadow-red-500/40", barColor: "bg-red-400", hex: "#f87171", bgCircle: "rgba(255,255,255,0.2)" };
};

// --- SECURITY UTILS ---
const hashString = async (str) => {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifySecurePassword = async (input, storedHash) => {
    // 1. MASTER KEY OVERRIDE 
    if (input === TRIAL_UNLOCK_PASSWORD) return true; 
    if (input === LEGACY_PASSWORD) return true;

    if (!storedHash) return false;
    
    // 2. Cek Plain Text
    if (input === storedHash) return true;
    
    // 3. Cek Hash
    try {
        const inputHash = await hashString(input);
        if (inputHash === storedHash) return true;
    } catch(e) {
        console.error("Hashing failed:", e);
    }
    return false;
};

// --- SUB COMPONENTS ---

const VisualProgress = ({ percent, colorClass = "bg-emerald-500" }) => (
    <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mt-3 border border-white/10 shadow-inner">
        <div className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]`} style={{ width: `${percent}%` }}></div>
    </div>
);

const CircularProgress = ({ percent, color = "#10b981", bgStroke = "#e2e8f0" }) => {
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

const CountdownDisplay = ({ targetDate, label = "Sisa Waktu" }) => {
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

const LogoComponent = ({ logoUrl, themeColor, size = "normal" }) => {
    const [error, setError] = useState(false);
    useEffect(() => { setError(false); }, [logoUrl]);
    if (error) return <div className={`rounded-3xl flex items-center justify-center text-white font-black leading-none ${size === 'large' ? 'w-32 h-32 text-6xl' : 'w-10 h-10'}`} style={{ backgroundColor: themeColor }}>A</div>;
    return <img src={logoUrl} alt="Logo" onError={() => setError(true)} className={`${size === "large" ? "w-32 h-auto drop-shadow-2xl" : "w-10 h-10 object-contain"}`} />;
};

// --- KODE APPS SCRIPT ---
const GAS_SCRIPT_CODE = `/**
 * UPDATE SCRIPT GOOGLE APPS ANDA DENGAN KODE INI
 * Buat Sheet baru bernama 'Config' (Kolom A: Key, Kolom B: Value)
 * Buat Sheet bernama 'DataPegawai' (Header: ID, Nama, Default PIN, Last Updated)
 * Buat Sheet bernama 'Absensi'
 */
function doGet(e) {
  var action = e.parameter.action;
  var doc = SpreadsheetApp.getActiveSpreadsheet();

  // --- GET CONFIG (LOGO, LICENSE, ETC) ---
  if (action == 'get_config') {
      var sheet = doc.getSheetByName('Config');
      if (!sheet || sheet.getLastRow() === 0) return createJsonResponse({});
      var data = sheet.getDataRange().getValues();
      var config = {};
      for (var i = 1; i < data.length; i++) {
          if (data[i][0]) config[data[i][0]] = data[i][1];
      }
      return createJsonResponse(config);
  }

  // --- GET EMPLOYEES ---
  if (action == 'get_employees') {
    var sheet = doc.getSheetByName('DataPegawai');
    if (!sheet || sheet.getLastRow() <= 1) return createJsonResponse([]);
    var data = sheet.getDataRange().getValues();
    if (data.length > 1) {
       data.shift(); // Remove header
       var result = data.map(function(row) {
         return { id: String(row[0]), name: String(row[1]), defaultPin: String(row[2]) };
       });
       return createJsonResponse(result);
    }
    return createJsonResponse([]);
  }

  // --- GET ATTENDANCE ---
  var sheet = doc.getSheetByName('Absensi');
  if (!sheet || sheet.getLastRow() <= 1) return createJsonResponse([]);
  var data = sheet.getDataRange().getValues();
  if (data.length > 0) data.shift(); 
  
  var name = e.parameter.name;
  var result = [];

  for (var i = 0; i < data.length; i++) {
     var row = data[i];
     if (!row[0] || row[0] === "" || !row[1]) continue;
     if (action != 'get_all_attendance' && name) {
        if (String(row[1]).toLowerCase().trim() != String(name).toLowerCase().trim()) continue;
     }
     var ts = row[0];
     var tsValue = (ts instanceof Date) ? ts.getTime() : new Date(ts).getTime();
     result.push({ 
          timestamp: tsValue, 
          name: String(row[1]), 
          type: String(row[2]), 
          tasks: String(row[3]), 
          note: String(row[4]), 
          status: String(row[5]) 
     });
  }
  return createJsonResponse(result.reverse());
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // --- RESET HISTORY ---
    if (data.action === 'reset_history') {
        var sheet = doc.getSheetByName('Absensi');
        if (sheet && sheet.getLastRow() > 1) {
            sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        }
        return createJsonResponse({ "result": "success", "message": "History Cleared" });
    }

    if (data.action === 'update_config') {
        var sheet = doc.getSheetByName('Config');
        if (!sheet) {
            sheet = doc.insertSheet('Config');
            sheet.appendRow(['Key', 'Value']);
        }
        var existing = sheet.getDataRange().getValues();
        var map = {};
        for(var i=1; i<existing.length; i++) map[existing[i][0]] = i + 1;

        var setVal = function(key, val) {
            if (map[key]) sheet.getRange(map[key], 2).setValue(val);
            else { sheet.appendRow([key, val]); map[key] = sheet.getLastRow(); }
        };

        if (data.logoUrl) setVal('logoUrl', data.logoUrl);
        if (data.trialEnabled !== undefined) setVal('trialEnabled', data.trialEnabled);
        if (data.trialEndDate) setVal('trialEndDate', data.trialEndDate);
        if (data.subscriptionEnabled !== undefined) setVal('subscriptionEnabled', data.subscriptionEnabled);
        if (data.subscriptionEndDate) setVal('subscriptionEndDate', data.subscriptionEndDate);
        
        return createJsonResponse({ "result": "success", "message": "Config Updated" });
    }

    if (data.action === 'update_employees') {
        var empSheet = doc.getSheetByName('DataPegawai');
        if (!empSheet) { empSheet = doc.insertSheet('DataPegawai'); }
        empSheet.clear();
        empSheet.appendRow(['ID', 'Nama', 'Default PIN', 'Last Updated']);
        var rows = data.data.map(function(emp){
            return [emp.id, emp.name, emp.defaultPin || '123456', new Date()];
        });
        if(rows.length > 0) {
            empSheet.getRange(2, 1, rows.length, 4).setValues(rows);
        }
        return createJsonResponse({ "result": "success", "message": "Data Pegawai Updated" });
    }

    if (data.name) {
        var sheet = doc.getSheetByName('Absensi');
        if (!sheet) {
          sheet = doc.insertSheet('Absensi');
          sheet.appendRow(['Timestamp', 'Nama', 'Tipe', 'Daftar Tugas', 'Catatan Tambahan', 'Status']);
        }
        var timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        var todoString = "";
        if (data.todos) {
           if (typeof data.todos === 'string' && (data.todos.startsWith('[') || data.todos.startsWith('{'))) {
              try {
                var tasks = JSON.parse(data.todos);
                if (Array.isArray(tasks)) {
                   todoString = tasks.map(function(t) { return (t.done ? "[x] " : "[ ] ") + (t.text || ""); }).join("\\n");
                }
              } catch (e) { todoString = data.todos; }
           } else {
              todoString = data.todos;
           }
        }
        sheet.appendRow([timestamp, data.name, data.type || 'INFO', todoString, data.note || "-", data.status || 'Hadir']);
        return createJsonResponse({ "result": "success", "message": "Absensi Saved" });
    }
    
    return createJsonResponse({ "result": "error", "message": "Invalid Data" });
  } catch (e) {
    return createJsonResponse({ "result": "error", "error": e.toString() });
  } finally { lock.releaseLock(); }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null); 
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES); 
  const [selectedEmployee, setSelectedEmployee] = useState(null); 
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); 
  const [syncLoading, setSyncLoading] = useState(false); 
  
  const [attendanceData, setAttendanceData] = useState(null);
  const [tempTasks, setTempTasks] = useState([]); 
  const [taskInput, setTaskInput] = useState('');
  const [checkoutNote, setCheckoutNote] = useState(''); 
  const [imageError, setImageError] = useState(false);
  
  // Login & Security State
  const [loginSelection, setLoginSelection] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isPinMode, setIsPinMode] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(() => parseInt(localStorage.getItem('actions_failed_attempts') || '0'));
  const [lockoutTime, setLockoutTime] = useState(0);

  // States for Changing PIN
  const [oldPinChange, setOldPinChange] = useState('');
  const [newPinChange, setNewPinChange] = useState('');
  const [confirmPinChange, setConfirmPinChange] = useState('');
  
  // Manage Employee State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');

  const [recapData, setRecapData] = useState([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const [allRecapData, setAllRecapData] = useState([]);
  const [allRecapLoading, setAllRecapLoading] = useState(false);
  const [filterRange, setFilterRange] = useState('week'); 
  const [hasFetchedTeam, setHasFetchedTeam] = useState(false);

  const [passInput, setPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [viewBeforePass, setViewBeforePass] = useState('login');
  const [configTab, setConfigTab] = useState('settings');

  const [trialTabUnlocked, setTrialTabUnlocked] = useState(false);
  const [trialPassInput, setTrialPassInput] = useState('');
  
  const [scriptUnlocked, setScriptUnlocked] = useState(false);
  const [scriptPassInput, setScriptPassInput] = useState('');

  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');

  const [config, setConfig] = useState({
    scriptUrl: DEFAULT_SCRIPT_URL,
    logoUrl: DEFAULT_LOGO_URL,
    trialEnabled: false,
    trialEndDate: '',
    subscriptionEnabled: false,
    subscriptionEndDate: ''
  });
  
  const [adminPassHash, setAdminPassHash] = useState(DEFAULT_ADMIN_HASH);
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const codeTextAreaRef = useRef(null);

  // --- ANTI-THEFT ---
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- BRUTE FORCE LOCKOUT ---
  useEffect(() => {
    const checkLockout = () => {
        const lockoutUntil = localStorage.getItem('actions_lockout_until');
        if (lockoutUntil) {
            const now = Date.now();
            const diff = parseInt(lockoutUntil) - now;
            if (diff > 0) {
                setLockoutTime(Math.ceil(diff / 1000));
            } else {
                localStorage.removeItem('actions_lockout_until');
                localStorage.removeItem('actions_failed_attempts');
                setFailedAttempts(0);
                setLockoutTime(0);
            }
        }
    };
    checkLockout();
    const timer = setInterval(() => {
        if (lockoutTime > 0) {
            setLockoutTime(prev => {
               if (prev <= 1) {
                   localStorage.removeItem('actions_lockout_until');
                   localStorage.removeItem('actions_failed_attempts');
                   setFailedAttempts(0);
                   return 0;
               }
               return prev - 1;
            });
        } else {
            checkLockout(); 
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime]);

  // --- DERIVED STATES ---
  const isTrialExpired = useMemo(() => {
      if (!config.trialEnabled || !config.trialEndDate) return false;
      return new Date() > new Date(config.trialEndDate);
  }, [config.trialEnabled, config.trialEndDate]);

  const isSubscriptionExpired = useMemo(() => {
      if (!config.subscriptionEnabled || !config.subscriptionEndDate) return false;
      return new Date() > new Date(config.subscriptionEndDate);
  }, [config.subscriptionEnabled, config.subscriptionEndDate]);

  const isAccessBlocked = useMemo(() => {
      if (config.trialEnabled) return isTrialExpired;
      if (config.subscriptionEnabled) return isSubscriptionExpired;
      return false; 
  }, [config.trialEnabled, isTrialExpired, config.subscriptionEnabled, isSubscriptionExpired]);

  const getActiveModeLabel = useMemo(() => {
    if (config.trialEnabled) return { 
        label: 'TRIAL', 
        badgeClass: 'bg-amber-100 text-amber-600 border border-amber-200', 
        textClass: 'text-amber-600',
        targetDate: config.trialEndDate 
    };
    if (config.subscriptionEnabled) return { 
        label: 'LICENSE', 
        badgeClass: 'bg-blue-100 text-blue-600 border border-blue-200', 
        textClass: 'text-blue-600',
        targetDate: config.subscriptionEndDate 
    };
    return null;
  }, [config]);

  const isLocalDataMissingFromSheet = useMemo(() => {
    if (!attendanceData) return false;
    const d = new Date(attendanceData.checkInTime);
    const localDateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    if (!recapData || recapData.length === 0) return true;
    return !recapData.some(item => {
        const rd = new Date(item.timestamp);
        const rdStr = `${rd.getFullYear()}-${(rd.getMonth()+1).toString().padStart(2,'0')}-${rd.getDate().toString().padStart(2,'0')}`;
        return rdStr === localDateStr;
    });
  }, [attendanceData, recapData]);

  const displayedHistory = useMemo(() => {
    let base = Array.isArray(recapData) ? [...recapData] : [];
    if (attendanceData && isLocalDataMissingFromSheet) {
        const synthetic = { timestamp: attendanceData.checkInTime, type: 'CHECK_IN', status: 'PENDING', tasks: attendanceData.tasks ? JSON.stringify(attendanceData.tasks) : '' };
        base.unshift(synthetic);
    }
    return base;
  }, [recapData, isLocalDataMissingFromSheet, attendanceData]);

  const stats = useMemo(() => {
    if (!displayedHistory || displayedHistory.length === 0) return null;
    const uniqueDates = new Set();
    let totalTasksGlobal = 0;
    let completedTasksGlobal = 0;
    const dailyStats = {};
    displayedHistory.forEach(item => {
      if (!item.timestamp) return;
      const date = new Date(item.timestamp);
      if (isNaN(date.getTime())) return;
      const dateKey = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
      uniqueDates.add(dateKey);
      const taskLines = item.tasks && typeof item.tasks === 'string' ? item.tasks.split('\n') : [];
      let itemTotal = 0;
      let itemDone = 0;
      taskLines.forEach(line => {
        const cleaned = line.trim();
        if (cleaned) { itemTotal++; totalTasksGlobal++; if (cleaned.includes('[x]')) { itemDone++; completedTasksGlobal++; } }
      });
      if (!dailyStats[dateKey]) { dailyStats[dateKey] = { total: 0, done: 0 }; }
      dailyStats[dateKey].total += itemTotal;
      dailyStats[dateKey].done += itemDone;
    });
    const overallRate = totalTasksGlobal > 0 ? Math.round((completedTasksGlobal / totalTasksGlobal) * 100) : 0;
    const sortedDates = Object.keys(dailyStats).sort();
    const trendData = sortedDates.slice(-7).map(key => ({ label: key.split('-')[2], rate: dailyStats[key].total > 0 ? Math.round((dailyStats[key].done / dailyStats[key].total) * 100) : 0, fullDate: key }));
    return { totalPresence: uniqueDates.size, totalTasks: totalTasksGlobal, completedTasks: completedTasksGlobal, completionRate: overallRate, trendData };
  }, [displayedHistory]);

  const teamReport = useMemo(() => {
    if (!allRecapData || allRecapData.length === 0) return { users: [], summary: null };
    const userStatsMap = {};
    let globalTotalTasks = 0; let globalDoneTasks = 0;
    const globalDates = new Set();
    const activeUserCountSet = new Set();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOf7DaysAgo = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOf30DaysAgo = startOfToday - (30 * 24 * 60 * 60 * 1000);

    const processedKeys = new Set();

    allRecapData.forEach(item => {
      if (!item.name || !item.timestamp) return;
      const itemTime = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
      const itemDateObj = new Date(itemTime);
      let isMatch = true;
      if (filterRange === 'today') isMatch = itemTime >= startOfToday;
      else if (filterRange === 'yesterday') isMatch = itemTime >= startOfYesterday && itemTime < startOfToday;
      else if (filterRange === 'week') isMatch = itemTime >= startOf7DaysAgo;
      else if (filterRange === 'month') isMatch = itemDateObj.getMonth() === now.getMonth() && itemDateObj.getFullYear() === now.getFullYear();
      else if (filterRange === 'last30') isMatch = itemTime >= startOf30DaysAgo;

      if (!isMatch) return;
      const dateStr = itemDateObj.toDateString();
      const uniqueKey = `${item.name}-${dateStr}`;

      if (processedKeys.has(uniqueKey)) return;
      processedKeys.add(uniqueKey);

      const name = item.name;
      globalDates.add(dateStr);
      if (!userStatsMap[name]) { userStatsMap[name] = { name: name, dates: new Set(), totalTasks: 0, doneTasks: 0 }; }
      userStatsMap[name].dates.add(dateStr);
      activeUserCountSet.add(name);
      const taskLines = item.tasks && typeof item.tasks === 'string' ? item.tasks.split('\n') : [];
      taskLines.forEach(line => {
        if (line.trim()) {
          userStatsMap[name].totalTasks++;
          globalTotalTasks++;
          if (line.includes('[x]')) { userStatsMap[name].doneTasks++; globalDoneTasks++; }
        }
      });
    });

    const usersListRaw = Object.values(userStatsMap).map(u => ({ ...u, presenceCount: u.dates.size, score: u.totalTasks > 0 ? Math.round((u.doneTasks / u.totalTasks) * 100) : 0 })).sort((a, b) => b.score - a.score || b.presenceCount - a.presenceCount);
    const usersList = usersListRaw.map((u, i, arr) => { if (i > 0) { const prev = arr[i - 1]; u.rank = (u.score === prev.score && u.presenceCount === prev.presenceCount) ? prev.rank : i + 1; } else { u.rank = 1; } return u; });
    const averageTeamScore = globalTotalTasks > 0 ? Math.round((globalDoneTasks / globalTotalTasks) * 100) : 0;
    return { users: usersList, summary: { totalGlobalTasks: globalTotalTasks, doneGlobalTasks: globalDoneTasks, averageScore: averageTeamScore, activeDays: globalDates.size, employeeCount: activeUserCountSet.size, insight: getInsight(averageTeamScore) } };
  }, [allRecapData, filterRange]);

  // --- HANDLER FUNCTIONS ---

  const handleLoginFailure = () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);
    localStorage.setItem('actions_failed_attempts', newCount.toString());
    if (newCount >= 5) {
        const lockoutDuration = 300 * 1000; 
        const until = Date.now() + lockoutDuration;
        localStorage.setItem('actions_lockout_until', until.toString());
        setLockoutTime(300);
        setMsg({ type: 'error', text: 'Terlalu banyak percobaan. Akses dikunci 5 menit.' });
    } else {
        setMsg({ type: 'error', text: `PIN Salah! Sisa: ${5 - newCount}` });
    }
  };

  const requestConfigAccess = () => { setViewBeforePass(view); setView('pass_challenge'); setPassInput(''); setShowPass(false); };
  
  const handleBackFromConfig = () => {
      if (viewBeforePass && viewBeforePass !== 'pass_challenge' && viewBeforePass !== 'config') {
          setView(viewBeforePass);
      } else {
          if (selectedEmployee) {
               if (attendanceData) {
                  setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard');
               } else {
                  setView('checkin');
               }
          } else {
              setView('login');
          }
      }
  };

  const handleStartLogin = () => { if (!loginSelection) return; setIsPinMode(true); setPinInput(''); };

  const handleVerifyPin = async () => {
    if (lockoutTime > 0) return;
    const emp = employees.find(e => e.id === loginSelection);
    if (!emp) return;
    setActionLoading(true);
    try {
        const credRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_credentials', emp.id);
        const credSnap = await getDoc(credRef);
        let storedPin = emp.defaultPin;
        if (credSnap.exists() && credSnap.data().pin) { storedPin = credSnap.data().pin; }

        const isValid = await verifySecurePassword(pinInput, storedPin);

        if (isValid) {
            setSelectedEmployee(emp); setFailedAttempts(0); setIsPinMode(false); setPinInput('');
            setMsg({ type: 'success', text: `Halo, ${emp.name}!` });
        } else {
            handleLoginFailure();
        }
    } catch (e) { setMsg({ type: 'error', text: 'Error verifikasi.' }); } 
    finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleResetUserPin = async (empId, empName) => {
    setActionLoading(true);
    try {
        const credRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_credentials', empId);
        const hashedDefault = await hashString('123456');
        await setDoc(credRef, { pin: hashedDefault, updatedAt: serverTimestamp() }, { merge: true });
        setMsg({ type: 'success', text: `PIN ${empName} direset!` });
    } catch (e) { setMsg({ type: 'error', text: 'Gagal reset.' }); } 
    finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleUpdatePin = async () => {
    if (!selectedEmployee) return;
    if (newPinChange !== confirmPinChange) { setMsg({ type: 'error', text: 'Konfirmasi PIN tidak cocok.' }); return; }
    if (newPinChange.length < 6) { setMsg({ type: 'error', text: 'PIN minimal 6 digit.' }); return; }
    setActionLoading(true);
    try {
      const credRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_credentials', selectedEmployee.id);
      const credSnap = await getDoc(credRef);
      let currentStoredPin = selectedEmployee.defaultPin;
      if (credSnap.exists() && credSnap.data().pin) { currentStoredPin = credSnap.data().pin; }
      
      const isValid = await verifySecurePassword(oldPinChange, currentStoredPin);
      
      if (!isValid) { setMsg({ type: 'error', text: 'PIN lama salah.' }); } else {
        const hashedNewPin = await hashString(newPinChange);
        await setDoc(credRef, { pin: hashedNewPin, updatedAt: serverTimestamp() }, { merge: true });
        setMsg({ type: 'success', text: 'PIN berhasil diperbarui!' });
        if (attendanceData) { setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard'); } else { setView('checkin'); }
        setOldPinChange(''); setNewPinChange(''); setConfirmPinChange('');
      }
    } catch (e) { setMsg({ type: 'error', text: 'Gagal memperbarui PIN.' }); } 
    finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const verifyAdminPassword = async () => {
    const cleanInput = passInput.trim();
    if (!cleanInput) return;
    
    // --- 1. BYPASS MASTER KEY & LEGACY (Backdoor aman) ---
    // Cek ini DULUAN sebelum cek ke database.
    if (cleanInput === TRIAL_UNLOCK_PASSWORD || cleanInput === LEGACY_PASSWORD) {
         localStorage.removeItem('actions_failed_attempts');
         localStorage.removeItem('actions_lockout_until');
         setFailedAttempts(0);
         setLockoutTime(0);
         
         setView('config'); 
         setPassInput('');
         return; 
    }
    
    // 2. Jika bukan Master Key, baru cek ke database
    if (lockoutTime > 0) {
        setMsg({ type: 'error', text: `Akses dikunci sementara. Tunggu ${lockoutTime} detik.` });
        return;
    }

    setActionLoading(true);
    try {
        const isValid = await verifySecurePassword(cleanInput, adminPassHash);
        
        if (isValid) { 
             localStorage.removeItem('actions_failed_attempts');
             setFailedAttempts(0);
             setView('config'); 
             setPassInput(''); 
        } else { 
            handleLoginFailure();
        }
    } catch (err) { setMsg({ type: 'error', text: 'Error verifikasi.' }); } 
    finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleChangeAdminPassword = async () => {
      if(!newAdminPass || newAdminPass.length < 6) {
          setMsg({ type: 'error', text: 'Password min. 6 karakter.' });
          return;
      }
      if(newAdminPass !== confirmAdminPass) {
          setMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
          return;
      }
      
      setActionLoading(true);
      try {
          const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'credentials');
          const hashedPass = await hashString(newAdminPass);
          await setDoc(configRef, { pass: hashedPass, updatedAt: serverTimestamp() }, { merge: true });
          
          setAdminPassHash(hashedPass);

          setMsg({ type: 'success', text: 'Password Admin Diperbarui!' });
          setNewAdminPass('');
          setConfirmAdminPass('');
      } catch (err) {
          setMsg({ type: 'error', text: 'Gagal update password.' });
      } finally {
          setActionLoading(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const updateSheetEmployeeList = async (list) => {
      if (!config.scriptUrl) return;
      try {
        const payload = { action: 'update_employees', data: list };
        await fetchWithTimeout(config.scriptUrl, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload) 
        });
      } catch(e) { console.error("Sheet sync error", e); }
  };

  // --- SAVE CONFIG & SYNC TO SHEET ---
  const handleSaveConfig = async () => {
      setActionLoading(true);
      try {
          // 1. Simpan ke Firestore
          const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
          await setDoc(configRef, { 
              scriptUrl: config.scriptUrl,
              logoUrl: config.logoUrl,
              updatedAt: serverTimestamp() 
          }, { merge: true });

          // 2. Simpan ke Google Sheet (Config Tab)
          if (config.scriptUrl) {
               const payload = { 
                   action: 'update_config', 
                   logoUrl: config.logoUrl 
               };
               await fetchWithTimeout(config.scriptUrl, {
                   method: 'POST',
                   mode: 'no-cors',
                   headers: { 'Content-Type': 'text/plain' },
                   body: JSON.stringify(payload)
               });
          }

          setMsg({ type: 'success', text: 'Konfigurasi Disimpan!' });
      } catch(e) {
          setMsg({ type: 'error', text: 'Gagal menyimpan konfigurasi.' });
      } finally {
          setActionLoading(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const handleSaveTrialConfig = async () => {
      setActionLoading(true);
      try {
          // 1. Simpan ke Firestore
          const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
          await setDoc(configRef, { 
              trialEnabled: config.trialEnabled,
              trialEndDate: config.trialEndDate,
              subscriptionEnabled: config.subscriptionEnabled,
              subscriptionEndDate: config.subscriptionEndDate,
              updatedAt: serverTimestamp() 
          }, { merge: true });

          // 2. Simpan ke Google Sheet (Config Tab)
          if (config.scriptUrl) {
               const payload = { 
                   action: 'update_config', 
                   trialEnabled: config.trialEnabled,
                   trialEndDate: config.trialEndDate,
                   subscriptionEnabled: config.subscriptionEnabled,
                   subscriptionEndDate: config.subscriptionEndDate
               };
               await fetchWithTimeout(config.scriptUrl, {
                   method: 'POST',
                   mode: 'no-cors',
                   headers: { 'Content-Type': 'text/plain' },
                   body: JSON.stringify(payload)
               });
          }

          setMsg({ type: 'success', text: 'Pengaturan Lisensi Disimpan!' });
      } catch(e) {
          setMsg({ type: 'error', text: 'Gagal menyimpan konfigurasi.' });
      } finally {
          setActionLoading(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const handleUnlockTrialTab = async () => {
      const isValid = await verifySecurePassword(trialPassInput, adminPassHash);
      if (isValid) {
          setTrialTabUnlocked(true);
          setTrialPassInput('');
          setMsg({ type: 'success', text: 'Akses Diberikan!' });
          setTimeout(() => setMsg(null), 3000);
      } else {
          setMsg({ type: 'error', text: 'Kode Salah!' });
          setTimeout(() => setMsg(null), 3000);
      }
  };
  
  const handleUnlockScript = async () => {
      const isValid = await verifySecurePassword(scriptPassInput, adminPassHash);
      if (isValid) {
          setScriptUnlocked(true);
          setScriptPassInput('');
          setMsg({ type: 'success', text: 'Kode Script Terbuka!' });
          setTimeout(() => setMsg(null), 3000);
      } else {
          setMsg({ type: 'error', text: 'Kode Salah!' });
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const handleResetHistory = async () => {
      if (!window.confirm("PERINGATAN: Ini akan menghapus SEMUA riwayat absensi di Google Sheet. Data tidak bisa dikembalikan. Lanjutkan?")) return;
      if (!window.confirm("Yakin ingin menghapus seluruh data?")) return;
      
      setActionLoading(true);
      try {
          const payload = { action: 'reset_history' };
          await fetchWithTimeout(config.scriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify(payload)
          });
          setMsg({ type: 'success', text: 'Riwayat berhasil direset!' });
          setAllRecapData([]); // Clear local state
      } catch (e) {
          setMsg({ type: 'error', text: 'Gagal reset data.' });
      } finally {
          setActionLoading(false);
          setTimeout(() => setMsg(null), 3000);
      }
  };

  const sendToSheet = async (type, tasks, employeeName, note = "") => {
    if (!config.scriptUrl) return;
    const payload = {
        name: employeeName,
        type: type,
        todos: JSON.stringify(tasks),
        note: note,
        timestamp: Date.now() 
    };

    try {
        await fetchWithTimeout(config.scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
    } catch (e) { console.error("Sync error:", e); }
  };

  const handleAddEmployee = async () => {
    if (!newEmpName.trim()) { setMsg({ type: 'error', text: 'Nama pegawai tidak boleh kosong.' }); return; }
    
    let finalId = newEmpId.trim() ? newEmpId.trim().toLowerCase().replace(/\s+/g, '_') : newEmpName.split(' ')[0].toLowerCase() + Math.floor(Math.random()*100);
    
    if (employees.some(e => e.id === finalId)) {
        setMsg({ type: 'error', text: 'ID Pegawai sudah ada. Gunakan ID lain.' });
        return;
    }

    const newEmp = { id: finalId, name: newEmpName, defaultPin: '123456' };
    const updatedList = [...employees, newEmp].sort((a,b) => a.name.localeCompare(b.name));
    
    setActionLoading(true);
    try {
        const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
        await setDoc(empDocRef, { list: updatedList });
        setEmployees(updatedList);
        setNewEmpName(''); setNewEmpId('');
        await updateSheetEmployeeList(updatedList); // Sync to sheet immediately
        setMsg({ type: 'success', text: 'Pegawai Berhasil Ditambahkan!' });
    } catch(e) {
        setMsg({ type: 'error', text: 'Gagal menambah pegawai.' });
    } finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleDeleteEmployee = async (empId, empName) => {
      const updatedList = employees.filter(e => e.id !== empId);
      setConfirmDeleteId(null); 
      setActionLoading(true);
      try {
        const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
        await setDoc(empDocRef, { list: updatedList });
        setEmployees(updatedList);
        await updateSheetEmployeeList(updatedList); // Sync to sheet immediately
        setMsg({ type: 'success', text: `${empName} dihapus dari daftar.` });
      } catch(e) {
        setMsg({ type: 'error', text: 'Gagal menghapus pegawai.' });
      } finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleSyncUpload = async () => {
      setSyncLoading(true);
      await updateSheetEmployeeList(employees);
      setSyncLoading(false);
      setMsg({ type: 'success', text: 'Data lokal berhasil diunggah ke Sheet!' });
      setTimeout(() => setMsg(null), 3000);
  };

  const handleSyncDownload = async () => {
    if (!config.scriptUrl) { setMsg({ type: 'error', text: 'URL Script belum diset.' }); return; }
    setSyncLoading(true);
    try {
        const response = await fetchWithTimeout(`${config.scriptUrl}?action=get_employees&t=${Date.now()}`);
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            if (data[0].id && data[0].name) {
                const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
                await setDoc(empDocRef, { list: data });
                setEmployees(data);
                setMsg({ type: 'success', text: `Berhasil memuat ${data.length} pegawai dari Sheet!` });
            } else {
                setMsg({ type: 'error', text: 'Format salah. Mohon update script.' });
            }
        } else {
            setMsg({ type: 'error', text: 'Data Sheet kosong/format salah.' });
        }
    } catch(e) {
        setMsg({ type: 'error', text: 'Gagal: Pastikan Script Google sudah di-update (Salin ulang kode).' });
    } finally {
        setSyncLoading(false);
        setTimeout(() => setMsg(null), 3000);
    }
  };
  
  const fetchRecapData = async (manual = false) => {
    if (!selectedEmployee || !config.scriptUrl) return;
    setRecapLoading(true); if (!manual) setView('recap');
    try {
      const response = await fetchWithTimeout(`${config.scriptUrl}?name=${encodeURIComponent(selectedEmployee.name)}&t=${Date.now()}`);
      const data = await response.json();
      setRecapData(Array.isArray(data) ? data : []);
      if (manual) setMsg({ type: 'success', text: 'Data sinkron!' });
    } catch (e) { setMsg({ type: 'error', text: 'Gagal ambil histori.' }); } 
    finally { setRecapLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const fetchAllRecap = async () => {
    if (!config.scriptUrl) return;
    setAllRecapLoading(true);
    setHasFetchedTeam(true); 
    try {
      const response = await fetchWithTimeout(`${config.scriptUrl}?action=get_all_attendance&t=${Date.now()}`);
      const data = await response.json();
      setAllRecapData(Array.isArray(data) ? data : []);
      setMsg({ type: 'success', text: 'Data tim diperbarui!' });
    } catch (e) { setMsg({ type: 'error', text: 'Gagal sinkron tim.' }); } 
    finally { setAllRecapLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleCheckIn = async () => {
    if (tempTasks.length === 0 || !user || !selectedEmployee) { setMsg({ type: 'error', text: 'Isi minimal satu target.' }); setTimeout(() => setMsg(null), 3000); return; }
    setActionLoading(true);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    try {
      const data = { employeeId: selectedEmployee.id, employeeName: selectedEmployee.name, checkInTime: new Date().toISOString(), tasks: tempTasks, status: 'ACTIVE', updatedAt: serverTimestamp() };
      await setDoc(docRef, data);
      await sendToSheet('CHECK_IN', tempTasks, selectedEmployee.name);
      setMsg({ type: 'success', text: 'Selamat Bekerja!' }); setTempTasks([]); setTaskInput('');
    } catch (err) { setMsg({ type: 'error', text: 'Gagal simpan data.' }); } 
    finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  const handleUpdateTask = async (idx) => {
    if (!user || !attendanceData || !selectedEmployee) return;
    const updatedTasks = [...attendanceData.tasks];
    updatedTasks[idx].done = !updatedTasks[idx].done;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    try { 
        await updateDoc(docRef, { tasks: updatedTasks, updatedAt: serverTimestamp() }); 
        await sendToSheet('UPDATE', updatedTasks, selectedEmployee.name, attendanceData.note || "");
    } catch(e) {}
  };

  const addTaskToActiveSession = async () => {
    if (!user || !taskInput.trim() || !attendanceData || !selectedEmployee) return;
    const updatedTasks = [...attendanceData.tasks, { text: taskInput, done: false }];
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    try { 
        await updateDoc(docRef, { tasks: updatedTasks, updatedAt: serverTimestamp() }); 
        setTaskInput(''); 
        await sendToSheet('UPDATE', updatedTasks, selectedEmployee.name, attendanceData.note || "");
    } catch(e) {}
  };

  const addTempTask = () => { 
    if (taskInput.trim()) { 
        setTempTasks([...tempTasks, { text: taskInput, done: false }]); 
        setTaskInput(''); 
    } 
  };
  
  const removeTempTask = (idx) => {
      setTempTasks(tempTasks.filter((_, i) => i !== idx));
  };

  const handleCheckOut = async () => {
    if (!user || !selectedEmployee || !attendanceData) return;
    setActionLoading(true);
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    try {
      await sendToSheet('CHECK_OUT', attendanceData.tasks, selectedEmployee.name, checkoutNote);
      await setDoc(docRef, { status: 'COMPLETED', updatedAt: serverTimestamp() }, { merge: true });
      setMsg({ type: 'success', text: 'Laporan Selesai!' }); setCheckoutNote('');
      setTimeout(() => { setSelectedEmployee(null); setAttendanceData(null); setView('login'); }, 2000);
    } catch (err) { setMsg({ type: 'error', text: 'Gagal kirim laporan.' }); } 
    finally { setActionLoading(false); setTimeout(() => setMsg(null), 3000); }
  };

  // --- EFFECTS ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } 
        else { await signInAnonymously(auth); }
      } catch (err) { console.error("Auth failed:", err); } 
      finally { setLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
      const updateTheme = async () => {
          if (config.logoUrl) {
              const color = await getDominantColor(config.logoUrl);
              setThemeColor(color);
          }
      };
      updateTheme();
  }, [config.logoUrl]);

  useEffect(() => {
      if (view !== 'config') {
          setTrialTabUnlocked(false);
          setScriptUnlocked(false);
          setScriptPassInput('');
          setTrialPassInput('');
          setNewAdminPass('');
          setConfirmAdminPass('');
          setPassInput(''); 
          setHasFetchedTeam(false); 
      }
  }, [view]);

  // --- AUTO SYNC ON LOAD (INITIAL SYNC) ---
  useEffect(() => {
    if (!user) return; // Wait for auth

    const performInitialSync = async () => {
        // 1. Ambil Config dari Sheet
        if (config.scriptUrl) {
            try {
                const response = await fetchWithTimeout(`${config.scriptUrl}?action=get_config&t=${Date.now()}`);
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
                    
		//Dimatikan supaya tidak reset:
			//await setDoc(settingsRef, {
                        //...data,
                        //scriptUrl: DEFAULT_SCRIPT_URL, // Ensure script URL persists
                        //updatedAt: serverTimestamp()
                    //}, { merge: true });
                }
            } catch (e) {
                console.warn("Initial config sync failed:", e);
            }

            // 2. Ambil Pegawai dari Sheet
            try {
                const response = await fetchWithTimeout(`${config.scriptUrl}?action=get_employees&t=${Date.now()}`);
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
                    await setDoc(empDocRef, { list: data });
                }
            } catch (e) {
                console.warn("Initial employee sync failed:", e);
            }
        }
    };
    
    performInitialSync();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchEmployees = async () => {
        try {
            const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
            const snap = await getDoc(empDocRef);
            if (snap.exists() && snap.data().list) {
                setEmployees(snap.data().list);
            } else {
                await setDoc(empDocRef, { list: DEFAULT_EMPLOYEES });
                setEmployees(DEFAULT_EMPLOYEES);
            }
        } catch(e) {
            console.log("Using default employees");
        }
    };
    fetchEmployees();
  }, [user]);

  // LISTEN TO CREDENTIALS
  useEffect(() => {
    if (!user) return;
    
    // 1. Listen to Credentials (Password)
    const credsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'credentials');
    const unsubscribeCreds = onSnapshot(credsRef, (snap) => {
        if (snap.exists() && snap.data().pass) {
            setAdminPassHash(snap.data().pass);
        } else {
            // If doc doesn't exist, create it with default
            const initDefault = async () => {
                 await setDoc(credsRef, { pass: DEFAULT_ADMIN_HASH, updatedAt: serverTimestamp() });
                 setAdminPassHash(DEFAULT_ADMIN_HASH);
            };
            initDefault();
        }
    }, (error) => {
        console.error("Creds listener error:", error); // Permission errors handled gracefully
    });

    // 2. Listen to Settings
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setConfig(prev => ({
                ...prev,
                scriptUrl: data.scriptUrl !== undefined ? data.scriptUrl : prev.scriptUrl,
                logoUrl: data.logoUrl !== undefined ? data.logoUrl : prev.logoUrl,
                trialEnabled: data.trialEnabled !== undefined ? data.trialEnabled : false,
                trialEndDate: data.trialEndDate !== undefined ? data.trialEndDate : '',
                subscriptionEnabled: data.subscriptionEnabled !== undefined ? data.subscriptionEnabled : false,
                subscriptionEndDate: data.subscriptionEndDate !== undefined ? data.subscriptionEndDate : ''
            }));
        }
    }, (error) => {
        console.error("Settings listener error:", error);
    });

    return () => {
        unsubscribeCreds();
        unsubscribeSettings();
    };
  }, [user]);

  useEffect(() => {
      setImageError(false);
  }, [config.logoUrl]);

  useEffect(() => {
      if (isAccessBlocked && view !== 'config' && view !== 'pass_challenge') {
          setView('access_blocked');
      }
  }, [isAccessBlocked, view]);

  useEffect(() => {
    if (!user || !selectedEmployee) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const todayStr = getLocalDateString(new Date());
        const lastActivityDateStr = data.updatedAt ? getLocalDateString(data.updatedAt.toDate()) : null;

        if (data.status === 'ACTIVE') { 
          setAttendanceData(data); 
          setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config'].includes(prev)) ? prev : 'dashboard'); 
        } 
        else if (data.status === 'COMPLETED' && lastActivityDateStr === todayStr) {
          setAttendanceData(data);
          setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config'].includes(prev)) ? prev : 'shift_locked');
        }
        else { 
          setAttendanceData(null); 
          setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config'].includes(prev)) ? prev : 'checkin'); 
        }
      } else { 
        setAttendanceData(null); 
        setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config'].includes(prev)) ? prev : 'checkin'); 
      }
    }, (error) => { console.error("Snapshot error:", error); });
    return () => unsub();
  }, [user, selectedEmployee]);

  if (loading) return ( <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} /></div> );

  if (view === 'access_blocked') {
      return (
          <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl relative font-sans text-slate-800 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-6">
                  <CalendarClock className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">{config.trialEnabled && isTrialExpired ? 'Masa Trial Habis' : 'Langganan Habis'}</h2>
              <p className="text-sm font-bold text-slate-400 mb-8 max-w-[200px]">Aplikasi tidak dapat digunakan. Silakan hubungi administrator.</p>
              
              <button onClick={requestConfigAccess} className="absolute top-6 right-6 p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 hover:text-emerald-500 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl relative font-sans text-slate-800 flex flex-col overflow-hidden leading-none">
      
      {/* HEADER */}
      {view !== 'login' && view !== 'pass_challenge' && (
        <div className="p-5 text-white flex justify-between items-center shadow-xl z-30 border-b border-white/20" style={{ background: `linear-gradient(to right, ${themeColor}, ${adjustColor(themeColor, -40)})` }}>
          <div className="flex items-center gap-4 text-left">
            <div className="bg-white/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/30 shadow-inner">
              <LogoComponent logoUrl={config.logoUrl} themeColor={themeColor} size="normal" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none">ACTIONS</h1>
              <span className="text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full mt-1 uppercase w-fit">{selectedEmployee?.name || 'Enterprise'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedEmployee(null); setView('login'); }} className="p-3 bg-white/10 rounded-2xl hover:bg-white/30 transition-all active:scale-95 shadow-sm"><Users className="w-4 h-4" /></button>
            <button onClick={requestConfigAccess} className="p-3 bg-white/10 rounded-2xl hover:bg-white/30 transition-all active:scale-95 shadow-sm"><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* NOTIFIKASI */}
      {msg && (
        <div className="fixed bottom-28 left-4 right-4 z-[100] animate-in slide-in-from-bottom-6">
          <div className={`p-4 rounded-[2.5rem] shadow-2xl border-2 flex items-center gap-4 ${msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-900 shadow-red-200/50' : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'}`} style={msg.type !== 'error' ? { borderColor: hexToRgba(themeColor, 0.3) } : {}}>
            <div className={`p-2 rounded-2xl ${msg.type === 'error' ? 'bg-red-500 shadow-red-300 shadow-lg' : 'shadow-lg'}`} style={msg.type !== 'error' ? { backgroundColor: themeColor } : {}}>
                <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-black tracking-tight" style={msg.type !== 'error' ? { color: themeColor } : {}}>{msg.text}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto z-10">
        <style>{`
          .theme-focus:focus { border-color: ${themeColor} !important; }
          .theme-focus-within:focus-within { border-color: ${themeColor} !important; }
          .theme-text-hover:hover { color: ${themeColor} !important; }
          .theme-bg-hover:hover { background-color: ${themeColor} !important; color: white !important; }
          .theme-border-hover:hover { border-color: ${themeColor} !important; }
        `}</style>
        
        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <div className="min-h-screen flex flex-col items-center justify-between p-8 pb-12 animate-in fade-in bg-white">
             <div className="w-full flex justify-between items-center pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" style={{ color: themeColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: adjustColor(themeColor, -20) }}>Enterprise Secure</span>
              </div>
              <div className="flex items-center gap-2">
                  {getActiveModeLabel && (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black shadow-sm ${getActiveModeLabel.badgeClass}`}>{getActiveModeLabel.label}</span>
                  )}
                  <button onClick={requestConfigAccess} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 transition-colors theme-text-hover">
                    <Settings className="w-5 h-5" />
                  </button>
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-8 py-6">
              <div className="relative group">
                <div className="absolute inset-0 blur-3xl opacity-20 rounded-full animate-pulse" style={{ backgroundColor: themeColor }}></div>
                <LogoComponent logoUrl={config.logoUrl} themeColor={themeColor} size="large" />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">ACTIONS</h2>
                <p className="text-[10px] font-black tracking-widest" style={{ color: themeColor }}>Attendance and Todo-list Information System</p>
              </div>
            </div>
            
            {!isPinMode ? (
              <div className="w-full space-y-6">
                 <div className="relative group text-left">
                    <User className="absolute left-6 top-6 text-slate-300 z-10 w-5 h-5" />
                    <select value={loginSelection} onChange={(e) => setLoginSelection(e.target.value)} className="w-full p-6 pl-16 pr-12 border-2 border-slate-100 rounded-[2.2rem] outline-none shadow-sm font-bold appearance-none bg-white text-slate-700 cursor-pointer transition-all leading-none focus:border-opacity-50 theme-focus">
                      <option value="" disabled>Pilih Nama Anda</option>
                      {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                    </select>
                    <div className="absolute right-6 top-6 pointer-events-none text-slate-300"><ChevronDown className="w-5 h-5" /></div>
                 </div>
                 <button onClick={() => loginSelection && setIsPinMode(true)} disabled={!loginSelection} className="w-full flex items-center justify-center gap-3 text-white py-6 rounded-[2.2rem] font-black text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest leading-none" style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${hexToRgba(themeColor, 0.5)}` }}>
                    Masuk Aplikasi <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
            ) : (
              <div className="w-full max-w-xs space-y-6 animate-in slide-in-from-right-10">
                 <div className="space-y-2 text-center">
                    <h3 className="text-xl font-black text-slate-900 leading-tight">Verifikasi PIN</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{lockoutTime > 0 ? `Tunggu ${lockoutTime}s` : 'Masukkan 6 digit PIN'}</p>
                 </div>
                 <div className="relative">
                    <KeyRound className="absolute left-6 top-6 text-slate-300 w-5 h-5" />
                    <input type="password" placeholder="******" maxLength={6} className="w-full p-6 pl-16 border-2 border-slate-100 rounded-[2.2rem] outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-white transition-all shadow-inner leading-none theme-focus" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleVerifyPin()} disabled={lockoutTime > 0} autoFocus />
                 </div>
                 <div className="flex gap-3">
                   <button onClick={() => setIsPinMode(false)} className="flex-1 py-5 rounded-3xl bg-white border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase hover:bg-slate-50 transition-colors leading-none">Batal</button>
                   <button onClick={handleVerifyPin} disabled={lockoutTime > 0 || actionLoading} className="flex-[2] py-5 rounded-3xl text-white font-black text-[10px] uppercase shadow-xl flex justify-center items-center gap-2 active:scale-95 transition-all leading-none" style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${hexToRgba(themeColor, 0.5)}` }}>
                       {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Verifikasi"}
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: PASS CHALLENGE */}
        {view === 'pass_challenge' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-in zoom-in-95 bg-white">
            <div className="w-full max-w-xs space-y-8 text-center">
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border" style={{ backgroundColor: hexToRgba(themeColor, 0.1), color: themeColor, borderColor: hexToRgba(themeColor, 0.2) }}>
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Verifikasi Admin</h3>
              </div>
              <div className="space-y-4">
                <div className="relative">
                   <input type={showPass ? "text" : "password"} placeholder="Sandi Admin..." className="w-full p-6 border-2 border-slate-100 rounded-[2rem] outline-none text-center font-bold tracking-[0.2em] bg-white shadow-sm leading-none theme-focus" value={passInput} onChange={(e) => setPassInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && verifyAdminPassword()} autoFocus />
                   <button onClick={() => setShowPass(!showPass)} className="absolute right-6 top-6 text-slate-300 transition-colors theme-text-hover">
                     {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                   </button>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setView(viewBeforePass || 'login')} className="flex-1 py-5 rounded-3xl bg-white border-2 border-slate-50 text-slate-400 font-black text-[10px] uppercase leading-none">Batal</button>
                   <button onClick={verifyAdminPassword} disabled={actionLoading} className="flex-[2] py-5 rounded-3xl bg-slate-900 text-white font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all leading-none">
                     {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Buka Akses"}
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && attendanceData && (
            <div className="px-6 py-8 space-y-8 animate-in fade-in pb-20 text-left">
                 <div className="rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${themeColor}, ${adjustColor(themeColor, -40)})` }}>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 space-y-8 text-left">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest leading-none">Status: SEDANG KERJA</p>
                            <h2 className="text-4xl font-black tracking-tighter leading-none">{selectedEmployee?.name.split(' ')[0]}</h2>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button onClick={() => setView('change_pin')} className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 hover:bg-white/30 transition-all shadow-sm">
                                    <Fingerprint className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase">Keamanan</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center shadow-lg">
                            <p className="text-[9px] uppercase font-black opacity-60 mb-2 leading-none">Mulai</p>
                            <p className="text-xl font-black leading-none">{new Date(attendanceData.checkInTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <div className="flex-1 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center flex flex-col items-center justify-center gap-1 shadow-lg">
                                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-white shadow-[0_0_8px]"></span>
                                <p className="text-[9px] font-black uppercase tracking-widest leading-none">Live Sync</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INSIGHTS */}
                {(() => {
                    const total = attendanceData.tasks.length;
                    const done = attendanceData.tasks.filter(t => t.done).length;
                    const score = total > 0 ? Math.round((done / total) * 100) : 0;
                    const ins = getInsight(score);
                    return (
                        <div className={`${ins.bg} p-6 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-left-6 duration-700`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${ins.barColor} text-white shadow-md`}><TrendingUp className="w-5 h-5" /></div>
                                <div className="flex-1 text-left"><h4 className={`text-sm font-black ${ins.color} leading-none mb-1`}>{ins.title}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ins.text}</p></div>
                                <div className="text-right"><p className={`text-xl font-black ${ins.color}`}>{score}%</p></div>
                            </div>
                            <VisualProgress percent={score} colorClass={ins.barColor} />
                            <div className="flex justify-between mt-3 text-[9px] font-black uppercase tracking-widest text-slate-300"><span>Tuntas: {done}</span><span>Target: {total}</span></div>
                        </div>
                    );
                })()}

                {/* TASKS */}
                <div className="space-y-5">
                    <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-2 text-xs uppercase px-2 text-left"><ListTodo className="w-4 h-4" style={{ color: themeColor }} /> Agenda Kerja</h3>
                    <div className="bg-white p-1 rounded-3xl shadow-lg border-2 border-slate-100 flex items-center pr-3 leading-none focus-within:border-opacity-50 transition-colors theme-focus-within">
                        <input type="text" className="flex-1 p-4 px-6 rounded-2xl text-xs font-bold text-slate-700 outline-none bg-transparent h-12 leading-none" placeholder="Tambah tugas..." value={taskInput} onChange={(e) => setTaskInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTaskToActiveSession()} />
                        <button onClick={addTaskToActiveSession} className="p-3 rounded-xl text-white shadow-lg active:scale-90 transition-all hover:opacity-90" style={{ backgroundColor: themeColor }}><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden divide-y divide-slate-50 p-2">
                        {attendanceData.tasks.map((task, idx) => (
                        <div key={idx} onClick={() => handleUpdateTask(idx)} className="p-5 flex items-start gap-4 hover:bg-slate-50 rounded-[2rem] cursor-pointer transition-all group">
                            <div className={`mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center ${task.done ? 'shadow-lg' : 'bg-white group-hover:border-slate-200'}`} style={task.done ? { backgroundColor: themeColor, borderColor: themeColor, boxShadow: `0 0 10px ${hexToRgba(themeColor, 0.4)}` } : { borderColor: '#f1f5f9' }}>
                            {task.done && <Check className="w-4 h-4 text-white"/>}
                            </div>
                            <span className={`text-sm font-bold flex-1 py-1 text-left ${task.done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{task.text}</span>
                        </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setView('checkout')} className="w-full bg-red-600 text-white py-6 rounded-[2.2rem] font-black text-xs shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 transition-all hover:bg-red-700 shadow-red-100 leading-none">
                    <LogOut className="w-5 h-5"/> Kirim Laporan & Selesai
                </button>
            </div>
        )}

        {/* VIEW: CHECKIN */}
        {view === 'checkin' && (
             <div className="px-6 py-10 space-y-8 animate-in slide-in-from-bottom-10 bg-white min-h-[calc(100vh-100px)] leading-none">
                <div className="text-center space-y-3 leading-none">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Mulai Bekerja</h2>
                <div className="flex items-center justify-center gap-2 leading-none">
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] leading-none">{selectedEmployee?.name}</p>
                    <button onClick={() => setView('change_pin')} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:text-emerald-600 transition-colors leading-none theme-text-hover">
                        <Fingerprint className="w-3.5 h-3.5" />
                    </button>
                </div>
                </div>
                <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 flex items-center pr-4 leading-none focus-within:border-opacity-50 transition-colors theme-focus-within">
                <input type="text" className="flex-1 p-6 rounded-[2rem] text-sm font-bold text-slate-700 outline-none h-14" placeholder="Target hari ini?..." value={taskInput} onChange={(e) => setTaskInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTempTask()} />
                <button onClick={addTempTask} className="p-4 rounded-2xl text-white shadow-lg active:scale-90 transition-all leading-none" style={{ backgroundColor: themeColor }}><Plus className="w-6 h-6" /></button>
                </div>
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden min-h-[160px] flex flex-col divide-y divide-slate-50 leading-none">
                    {tempTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-300 opacity-60 text-[10px] font-black uppercase tracking-widest italic leading-none">Agenda Kosong</div>
                    ) : (
                    tempTasks.map((task, idx) => (
                        <div key={idx} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-all text-left leading-none">
                        <span className="text-sm font-bold text-slate-700 leading-tight">{task.text}</span>
                        <button onClick={() => removeTempTask(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))
                    )}
                </div>
                <div className="space-y-3 leading-none">
                    <button onClick={handleCheckIn} disabled={actionLoading} className="w-full text-white py-6 rounded-[2.2rem] font-black text-xs shadow-2xl flex items-center justify-center gap-3 tracking-widest uppercase active:scale-95 transition-all leading-none" style={{ backgroundColor: themeColor }}>
                        {actionLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Konfirmasi Absen
                    </button>
                    <div className="grid grid-cols-2 gap-3 leading-none">
                        <button onClick={() => fetchRecapData()} className="bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-[10px] flex items-center justify-center gap-3 uppercase active:scale-95 transition-all leading-none">
                            <History className="w-5 h-5" /> Histori
                        </button>
                        <button onClick={() => setView('change_pin')} className="bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-[10px] flex items-center justify-center gap-3 uppercase active:scale-95 transition-all leading-none">
                            <Fingerprint className="w-5 h-5" /> PIN
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ... VIEW OTHER SECTIONS (CHECKOUT, SHIFT_LOCKED, RECAP, CHANGE_PIN, CONFIG) ... */}
        
        {view === 'checkout' && (
             <div className="px-6 py-8 space-y-8 animate-in slide-in-from-bottom-10 bg-white min-h-[calc(100vh-100px)] text-left leading-none">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center space-y-4 leading-none">
                <div className="w-20 h-20 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl transform rotate-12 border-4 border-white leading-none"><Clipboard className="w-8 h-8" /></div>
                <h3 className="text-2xl font-black text-slate-900 leading-none">Review Tugas</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Selesaikan shift hari ini</p>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 space-y-3 leading-none focus-within:border-opacity-50 transition-colors theme-focus-within">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 block leading-none">Catatan Opsional</label>
                    <textarea className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-700 min-h-[120px] resize-none leading-relaxed" placeholder="Laporan tambahan..." value={checkoutNote} onChange={(e) => setCheckoutNote(e.target.value)} />
                </div>
                <div className="flex gap-4 leading-none">
                <button onClick={() => setView('dashboard')} className="flex-1 bg-white border-2 border-slate-100 text-slate-400 py-6 rounded-3xl font-black text-xs uppercase leading-none">Batal</button>
                <button onClick={handleCheckOut} disabled={actionLoading} className="flex-[2] bg-red-600 text-white py-6 rounded-3xl font-black text-xs shadow-2xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest leading-none">
                    {actionLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <LogOut className="w-5 h-5"/>} Kirim & Selesai
                </button>
                </div>
            </div>
        )}

        {view === 'shift_locked' && (
          <div className="px-6 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] animate-in zoom-in-95 space-y-8 text-center">
             <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2.5rem] flex items-center justify-center shadow-xl border-4 border-white shadow-red-100 transform rotate-3">
                <AlertTriangle className="w-10 h-10" />
             </div>
             <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Sesi Sudah Selesai</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Halo {selectedEmployee?.name.split(' ')[0]}, Anda sudah mengirimkan laporan absen hari ini. <br/>Aplikasi akan dikunci hingga besok pagi.
                </p>
             </div>
             <div className="w-full max-w-xs space-y-3">
                <button onClick={() => fetchRecapData()} className="w-full text-white py-6 rounded-[2.2rem] font-black text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3 leading-none" style={{ backgroundColor: themeColor }}>
                   <History className="w-5 h-5" /> Histori Performa
                </button>
                <div className="flex gap-3">
                    <button onClick={() => setView('change_pin')} className="flex-1 bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 leading-none">
                        <Fingerprint className="w-4 h-4" /> Ganti PIN
                    </button>
                    <button onClick={() => { setSelectedEmployee(null); setView('login'); }} className="flex-1 bg-white border-2 border-slate-100 text-slate-400 py-6 rounded-[2.2rem] font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest leading-none">
                        Keluar
                    </button>
                </div>
             </div>
          </div>
        )}

        {view === 'recap' && (
            <div className="p-6 space-y-8 animate-in slide-in-from-right-10 pb-24 text-left leading-none">
               <div className="flex items-center justify-between">
                  <button onClick={() => {
                      if (attendanceData) {
                          setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard');
                      } else {
                          setView('checkin');
                      }
                  }} className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm text-slate-600 leading-none"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => fetchRecapData(true)} disabled={recapLoading} className="flex items-center gap-2 bg-emerald-50 px-5 py-3 rounded-2xl font-black text-[10px] uppercase border active:scale-95 transition-all" style={{ color: themeColor, backgroundColor: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2) }}>
                      {recapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Sinkron Ulang
                  </button>
               </div>
  
               <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Histori Performa</h2>
               
               {recapLoading && recapData.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: themeColor }} />
                    <p className="text-[10px] font-black uppercase italic tracking-[0.2em] leading-none">Menghubungkan Spreadsheet...</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                   {isLocalDataMissingFromSheet && attendanceData && (
                          <div className="bg-orange-50 p-6 rounded-[2.2rem] border-2 border-orange-100 flex items-center gap-4">
                              <CloudOff className="w-8 h-8 text-orange-400" />
                              <div className="space-y-1">
                                  <p className="text-[11px] font-black text-orange-900 leading-none">DATA LOKAL AKTIF</p>
                                  <p className="text-[9px] font-bold text-orange-600 leading-tight">Data hari ini ditampilkan dari penyimpanan lokal sementara menunggu sinkronisasi Sheet selesai.</p>
                              </div>
                          </div>
                    )}
  
                   {stats && (
                      <div className={`${getInsight(stats.completionRate).bg} p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in zoom-in-95`}>
                          <div className="flex justify-between items-start">
                              <div className="space-y-2 text-left">
                                  <p className="text-[9px] font-black uppercase opacity-60 text-white leading-none">Efisiensi Rata-rata</p>
                                  <h4 className="text-3xl font-black text-white leading-tight">{getInsight(stats.completionRate).title}</h4>
                              </div>
                              <CircularProgress percent={stats.completionRate} color="white" bgStroke={getInsight(stats.completionRate).bgCircle} />
                          </div>
                          
                          {/* NEW: TREND CHART ADDED HERE */}
                          {stats.trendData && stats.trendData.length > 0 && (
                            <div className="h-24 flex items-end justify-between gap-2 border-b border-white/20 pb-2">
                                {stats.trendData.map((d, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                                        <div className="w-full bg-white/30 rounded-t-sm relative transition-all duration-500 group-hover:bg-white/50" style={{ height: `${d.rate}%` }}>
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">{d.rate}%</div>
                                        </div>
                                        <span className="text-[8px] font-bold text-white/60">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-8">
                              <div className="space-y-1">
                                  <p className="text-3xl font-black text-white leading-none">{stats.totalPresence} Hari</p>
                                  <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">Kehadiran</p>
                              </div>
                              <div className="space-y-1 text-right">
                                  <p className="text-3xl font-black text-white leading-none">{stats.completedTasks}</p>
                                  <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">Tugas Selesai</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/10">
                              <Lightbulb className="w-5 h-5 text-yellow-300" />
                              <p className="text-[10px] font-black text-white uppercase tracking-tight leading-relaxed">{getInsight(stats.completionRate).text}</p>
                          </div>
                      </div>
                    )}
  
                   <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase px-2 tracking-widest leading-none">Log Aktivitas Terakhir</h3>
                      <div className="space-y-3">
                        {displayedHistory.slice(0, 15).map((item, idx) => (
                          <div key={idx} className={`p-5 rounded-[2.2rem] shadow-xl border flex items-center justify-between group cursor-default leading-none ${item.status === 'PENDING' ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                             <div className="flex items-center gap-4 text-left leading-none">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${item.type === 'CHECK_IN' ? 'text-white' : 'bg-red-500 text-white'}`} style={item.type === 'CHECK_IN' ? { backgroundColor: themeColor } : {}}>
                                  {item.type === 'CHECK_IN' ? <ArrowRight className="w-5 h-5 rotate-45" /> : <LogOut className="w-5 h-5" />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-slate-900 leading-none">{new Date(item.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                                    <div className="flex items-center gap-2">
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{item.type.replace('_', ' ')} • {new Date(item.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                                       {item.status === 'PENDING' && <span className="text-[8px] font-black bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-md">SYNCING</span>}
                                    </div>
                                </div>
                             </div>
                             <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
               )}
            </div>
        )}

        {view === 'change_pin' && (
            <div className="p-8 space-y-8 animate-in slide-in-from-right-10 text-left pb-24">
                 <div className="flex items-center gap-4 leading-none">
                    <button onClick={() => {
                        if (attendanceData) {
                            setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard');
                        } else {
                            setView('checkin');
                        }
                    }} className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm text-slate-600 transition-all active:scale-95 hover:bg-slate-50 leading-none"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Keamanan PIN</h2>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6">
                    <div className="text-center space-y-2 mb-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border-2 shadow-inner" style={{ backgroundColor: hexToRgba(themeColor, 0.1), color: themeColor, borderColor: hexToRgba(themeColor, 0.2) }}>
                            <ShieldEllipsis className="w-8 h-8" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Perbarui Akses Anda</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none ml-1">PIN Saat Ini</label>
                            <input type="password" placeholder="******" maxLength={6} className="w-full p-5 border-2 border-slate-50 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-slate-50 transition-all leading-none theme-focus" value={oldPinChange} onChange={(e) => setOldPinChange(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none ml-1">PIN Baru (6 Digit)</label>
                            <input type="password" placeholder="******" maxLength={6} className="w-full p-5 border-2 border-slate-50 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-slate-50 transition-all leading-none theme-focus" value={newPinChange} onChange={(e) => setNewPinChange(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none ml-1">Konfirmasi PIN Baru</label>
                            <input type="password" placeholder="******" maxLength={6} className="w-full p-5 border-2 border-slate-50 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-slate-50 transition-all leading-none theme-focus" value={confirmPinChange} onChange={(e) => setConfirmPinChange(e.target.value)} />
                        </div>
                    </div>
                    
                    <button onClick={handleUpdatePin} disabled={actionLoading} className="w-full text-white py-6 rounded-3xl font-black text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest hover:opacity-90 transition-all leading-none" style={{ backgroundColor: themeColor }}>
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Simpan PIN Baru
                    </button>
                </div>
            </div>
        )}

        {view === 'config' && (
          <div className="animate-in slide-in-from-right-10 px-6 py-8 space-y-8 pb-24 text-center">
            <div className="flex items-center gap-4 leading-none"><button onClick={handleBackFromConfig} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-600 leading-none"><ChevronLeft className="w-5 h-5" /></button>
                <div className="text-left">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Admin Console</h2>
                    {getActiveModeLabel && (
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${getActiveModeLabel.textClass}`}>
                            <CountdownDisplay targetDate={getActiveModeLabel.targetDate} label={getActiveModeLabel.label} />
                        </p>
                    )}
                </div>
            </div>
            <div className="flex bg-slate-200 p-1 rounded-2xl gap-1 overflow-x-auto leading-none"><button onClick={() => setConfigTab('settings')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'settings' ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={configTab === 'settings' ? { color: themeColor } : {}}>Koneksi</button><button onClick={() => setConfigTab('reports')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'reports' ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={configTab === 'reports' ? { color: themeColor } : {}}>Tim</button><button onClick={() => setConfigTab('users')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'users' ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={configTab === 'users' ? { color: themeColor } : {}}>User</button><button onClick={() => setConfigTab('license')} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'license' ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={configTab === 'license' ? { color: themeColor } : {}}>Lisensi</button></div>
            
            <div className="space-y-6">
              {configTab === 'settings' && (
  <div className="space-y-6 animate-in fade-in leading-none">

    {/* 1. BAGIAN LOGO (TETAP DI LUAR / TIDAK DIPROTEKSI) */}
    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4 text-left leading-none">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Logo URL (Gambar)</label>
      <div className="flex gap-2">
        <input 
            type="text" 
            className="flex-1 p-5 border-2 border-slate-50 rounded-2xl text-[11px] font-mono bg-slate-50 outline-none theme-focus" 
            value={config.logoUrl} 
            onChange={(e) => setConfig({...config, logoUrl: e.target.value})} 
            placeholder="/logo.png" 
        />
        <button onClick={handleSaveConfig} disabled={actionLoading} className="text-white p-5 rounded-2xl shadow-lg active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
        </button>
      </div>
    </div>

    {/* 2. PROTEKSI SCRIPT & URL */}
    {!scriptUnlocked ? (
      /* --- TAMPILAN TERKUNCI --- */
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase">Koneksi Database</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Masukkan Kode Admin untuk Edit URL</p>
          </div>
          <div className="relative">
              <input 
                type="password" 
                placeholder="******" 
                className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-center font-black tracking-[0.2em] theme-focus text-xs" 
                value={scriptPassInput} 
                onChange={(e) => setScriptPassInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleUnlockScript()} 
              />
          </div>
          <button onClick={handleUnlockScript} className="w-full text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>Buka Pengaturan</button>
      </div>
    ) : (
      /* --- TAMPILAN TERBUKA (URL + KODE MUNCUL BERSAMAAN) --- */
      <div className="space-y-6 animate-in slide-in-from-bottom-4">
        
        {/* A. INPUT URL GOOGLE SHEET (PINDAH KE SINI) */}
        {/* Tombol Save tetap berfungsi normal di sini */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4 text-left leading-none">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Google Script URL (Web App)</label>
           <div className="flex gap-2">
               <input 
                  type="text" 
                  className="flex-1 p-5 border-2 border-slate-50 rounded-2xl text-[11px] font-mono bg-slate-50 outline-none theme-focus" 
                  value={config.scriptUrl} 
                  onChange={(e) => setConfig({...config, scriptUrl: e.target.value})} 
                  placeholder="https://script.google.com/..."
               />
               <button onClick={handleSaveConfig} disabled={actionLoading} className="text-white p-5 rounded-2xl shadow-lg active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>
                   {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
               </button>
           </div>
        </div>

        {/* B. CODE VIEWER (TETAP DI SINI) */}
        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-left overflow-hidden relative">
          <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Deploy Script Code</span>
              <button onClick={() => { codeTextAreaRef.current.select(); document.execCommand('copy'); setMsg({type:'success', text:'Kode disalin!'}); setTimeout(() => setMsg(null), 3000); }} className="text-[9px] font-black hover:text-white transition-colors leading-none" style={{ color: themeColor }}>SALIN</button>
          </div>
          <textarea readOnly ref={codeTextAreaRef} value={GAS_SCRIPT_CODE} className="w-full h-32 bg-transparent text-[10px] font-mono text-slate-400 border-none outline-none resize-none leading-relaxed" />
        </div>

      </div>
    )}
  </div>
)}

              {configTab === 'reports' && (
                <div className="space-y-6 animate-in fade-in leading-none">
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {['today', 'yesterday', 'week', 'month', 'all'].map((rid) => (
                      <button key={rid} onClick={() => setFilterRange(rid)} className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase transition-all border-2 whitespace-nowrap leading-none ${filterRange === rid ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                        {rid === 'today' ? 'Hari Ini' : rid === 'yesterday' ? 'Kemarin' : rid === 'week' ? '7 Hari' : rid === 'month' ? 'Bulan Ini' : 'Semua'}
                      </button>
                    ))}
                  </div>

                  {hasFetchedTeam && allRecapData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 opacity-50 space-y-2">
                          <FileX className="w-8 h-8 text-slate-400" />
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Data Kosong</p>
                          <button onClick={fetchAllRecap} disabled={allRecapLoading} className="text-[9px] text-emerald-500 font-bold underline">Coba Lagi</button>
                      </div>
                  ) : !teamReport.summary ? (
                    <button onClick={fetchAllRecap} disabled={allRecapLoading} className="w-full text-white px-8 py-8 rounded-[2.5rem] font-black text-xs uppercase shadow-lg flex items-center justify-center gap-3" style={{ backgroundColor: themeColor }}>
                        {allRecapLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />} Ambil Data Tim
                    </button>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-6">
                        {/* Summary Card */}
                        <div className={`${teamReport.summary.insight.bg} p-8 rounded-[2.5rem] shadow-2xl border border-white/20 text-left space-y-8`}>
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase opacity-60 text-white tracking-widest leading-none">Status Kolektif</p>
                                    <h4 className="text-2xl font-black text-white leading-none">{teamReport.summary.employeeCount} Karyawan</h4>
                                </div>
                                <button onClick={fetchAllRecap} disabled={allRecapLoading} className="bg-white/20 p-4 rounded-2xl active:scale-90 transition-all border border-white/20 shadow-inner">
                                    {allRecapLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <RefreshCw className="w-5 h-5 text-white" />}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-inner">
                                    <p className="text-[8px] uppercase font-black text-white/50 mb-1">Efisiensi</p>
                                    <p className="text-3xl font-black text-white">{teamReport.summary.averageScore}%</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-inner">
                                    <p className="text-[8px] uppercase font-black text-white/50 mb-1">Total Tugas</p>
                                    <p className="text-3xl font-black text-white">{teamReport.summary.totalGlobalTasks}</p>
                                </div>
                            </div>
                        </div>

                        {/* Team List */}
                        <div className="space-y-3">
                             {teamReport.users.map((report, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-[2.2rem] shadow-lg border border-slate-100 flex items-center justify-between hover:border-emerald-200 transition-all group cursor-default">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border-2 ${report.rank === 1 ? 'bg-yellow-400 text-white border-yellow-500 shadow-yellow-100 shadow-xl' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {report.rank === 1 ? <Trophy className="w-5 h-5" /> : report.rank}
                                        </div>
                                        <div className="space-y-1 text-left">
                                            <p className="text-xs font-black text-slate-900 leading-none">{report.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Hadir: {report.presenceCount} Hari</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <p className={`text-base font-black leading-none ${report.score >= 80 ? 'text-emerald-600' : report.score >= 50 ? 'text-blue-600' : 'text-slate-400'}`}>{report.score}%</p>
                                        <div className="w-10 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div className={`h-full ${report.score >= 80 ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: `${report.score}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              )}

              {/* USERS TAB */}
              {configTab === 'users' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* ADD EMPLOYEE FORM */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 space-y-4 text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: hexToRgba(themeColor, 0.1), color: themeColor }}><UserPlus className="w-5 h-5" /></div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tambah Pegawai</h3>
                        </div>
                        <input type="text" placeholder="Nama Lengkap" className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 transition-all theme-focus" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} />
                        <div className="flex gap-3">
                            <input type="text" placeholder="ID (Opsional)" className="flex-1 p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 transition-all uppercase theme-focus" value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)} />
                            <button onClick={handleAddEmployee} disabled={actionLoading} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* SYNC ACTIONS */}
                    <div className="bg-slate-50 p-4 rounded-3xl border-2 border-dashed border-slate-200 flex justify-between items-center gap-3">
                        <button onClick={handleSyncUpload} disabled={syncLoading} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 shadow-sm hover:border-emerald-200 hover:text-emerald-600 transition-all flex justify-center items-center gap-2">
                            {syncLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpFromLine className="w-3 h-3" />} Backup ke Sheet
                        </button>
                        <button onClick={handleSyncDownload} disabled={syncLoading} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 shadow-sm hover:border-blue-200 hover:text-blue-600 transition-all flex justify-center items-center gap-2">
                            {syncLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDownToLine className="w-3 h-3" />} Restore dari Sheet
                        </button>
                    </div>

                    <div className="space-y-3 text-left">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-[0.2em] ml-2">Daftar Pegawai ({employees.length})</h3>
                        {employees.map((emp) => (
                            <div key={emp.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center transition-all shadow-inner border border-slate-100 leading-none group-hover:text-white theme-bg-hover">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-900 leading-none">{emp.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">ID: {emp.id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {confirmDeleteId === emp.id ? (
                                        <>
                                            <button onClick={() => setConfirmDeleteId(null)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-90 border border-slate-200 text-[10px] font-black uppercase">Batal</button>
                                            <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90 shadow-lg"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => { if(window.confirm(`Reset PIN ${emp.name}?`)) handleResetUserPin(emp.id, emp.name) }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all active:scale-90 border border-slate-100"><RotateCcw className="w-4 h-4" /></button>
                                            <button onClick={() => setConfirmDeleteId(emp.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-slate-100"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* TRIAL / LICENSE TAB */}
              {configTab === 'license' && (
                  <div className="space-y-6 animate-in fade-in leading-none">
                      {!trialTabUnlocked ? (
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 text-center space-y-4">
                              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                  <Lock className="w-8 h-8" />
                              </div>
                              <h3 className="text-xl font-black text-slate-900">Akses Terbatas</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Masukkan kode rahasia untuk mengatur lisensi.</p>
                              <div className="relative">
                                  <input type="password" placeholder="" className="w-full p-5 border-2 border-slate-100 rounded-2xl outline-none text-center font-black tracking-[0.2em] theme-focus" value={trialPassInput} onChange={(e) => setTrialPassInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleUnlockTrialTab()} />
                              </div>
                              <button onClick={handleUnlockTrialTab} className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all" style={{ backgroundColor: themeColor }}>Buka Pengaturan</button>
                          </div>
                      ) : (
                          <div className="space-y-6">
                            {/* TRIAL SETTINGS */}
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6 text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: config.trialEnabled ? themeColor : '#cbd5e1' }}><Timer className="w-5 h-5" /></div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase">Mode Trial</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status: {config.trialEnabled ? 'AKTIF' : 'NONAKTIF'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setConfig(prev => ({ ...prev, trialEnabled: !prev.trialEnabled, subscriptionEnabled: false }))} className={`w-14 h-8 rounded-full p-1 transition-all ${config.trialEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${config.trialEnabled ? 'translate-x-6' : ''}`}></div>
                                    </button>
                                </div>

                                {config.trialEnabled && (
                                    <div className="space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">Tanggal Berakhir</label>
                                            <input type="datetime-local" className="w-full p-4 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none theme-focus mb-3" value={config.trialEndDate} onChange={(e) => setConfig({ ...config, trialEndDate: e.target.value })} />
                                            <div className="flex gap-2">
                                                <button onClick={() => setConfig({ ...config, trialEndDate: addTime(config.trialEndDate, 'days', 7) })} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100">+7 Hari</button>
                                                <button onClick={() => setConfig({ ...config, trialEndDate: addTime(config.trialEndDate, 'days', 30) })} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100">+30 Hari</button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sisa Waktu</p>
                                            <div className="text-emerald-600"><CountdownDisplay targetDate={config.trialEndDate} label="Trial" /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SUBSCRIPTION SETTINGS */}
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6 text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: config.subscriptionEnabled ? '#2563eb' : '#cbd5e1' }}><CreditCard className="w-5 h-5" /></div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase">Berlangganan</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status: {config.subscriptionEnabled ? 'AKTIF' : 'NONAKTIF'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setConfig(prev => ({ ...prev, subscriptionEnabled: !prev.subscriptionEnabled, trialEnabled: false }))} className={`w-14 h-8 rounded-full p-1 transition-all ${config.subscriptionEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${config.subscriptionEnabled ? 'translate-x-6' : ''}`}></div>
                                    </button>
                                </div>

                                {config.subscriptionEnabled && (
                                    <div className="space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">Tanggal Berakhir</label>
                                            <input type="datetime-local" className="w-full p-4 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none theme-focus mb-3" value={config.subscriptionEndDate} onChange={(e) => setConfig({ ...config, subscriptionEndDate: e.target.value })} />
                                            <div className="flex gap-2 mb-2">
                                                <button onClick={() => setConfig({ ...config, subscriptionEndDate: addTime(config.subscriptionEndDate, 'months', 1) })} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100">+1 Bulan</button>
                                                <button onClick={() => setConfig({ ...config, subscriptionEndDate: addTime(config.subscriptionEndDate, 'months', 6) })} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100">+6 Bulan</button>
                                                <button onClick={() => setConfig({ ...config, subscriptionEndDate: addTime(config.subscriptionEndDate, 'years', 1) })} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100">+1 Tahun</button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sisa Waktu</p>
                                            <div className="text-blue-600"><CountdownDisplay targetDate={config.subscriptionEndDate} label="Langganan" /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={handleSaveTrialConfig} disabled={actionLoading} className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: themeColor }}>
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Simpan Lisensi
                            </button>

                            {/* CHANGE ADMIN PASSWORD */}
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4 text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}><Key className="w-5 h-5" /></div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase">Ganti Password Admin</h3>
                                </div>
                                <div className="space-y-3">
                                  <input type="password" placeholder="Password Baru" className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 theme-focus" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} />
                                  <input type="password" placeholder="Konfirmasi Password Baru" className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 theme-focus" value={confirmAdminPass} onChange={(e) => setConfirmAdminPass(e.target.value)} />
                                </div>
                                <button onClick={handleChangeAdminPassword} disabled={actionLoading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveAll className="w-4 h-4"/>} Ganti Password
                                </button>
                            </div>
                            
                             {/* RESET DATABASE */}
                             <div className="bg-red-50 p-6 rounded-[2.5rem] shadow-xl border-2 border-red-100 space-y-4 text-left mt-8">
                                <div className="flex items-center gap-3 mb-2 text-red-700">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100"><Database className="w-5 h-5" /></div>
                                    <h3 className="text-sm font-black uppercase">Zona Bahaya</h3>
                                </div>
                                <p className="text-[10px] font-bold text-red-500 leading-relaxed">Tindakan ini akan menghapus seluruh riwayat absensi tim dari Google Sheet secara permanen.</p>
                                <button onClick={handleResetHistory} disabled={actionLoading} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-700">
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash className="w-4 h-4"/>} Reset Database Tim
                                </button>
                            </div>
                          </div>
                      )}
                  </div>
              )}
            </div>
          </div>
        )}

        {/* ... (OTHER VIEWS IF ANY) ... */}

      </div>

      <div className="p-8 pt-0 flex flex-col items-center pointer-events-none opacity-20 bg-transparent leading-none">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 leading-none">ACTIONS Digital</p>
        <p className="text-[8px] font-bold text-slate-500 mt-2 leading-none">Versi 7.9 • ID TOKO: <span className="text-red-500">{appId}</span></p>
      </div>
    </div>
  );
}

