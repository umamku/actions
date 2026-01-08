import React, { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db, appId } from './lib/firebase';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, serverTimestamp, deleteDoc, increment, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { CheckCircle, ListTodo, LogOut, Settings, Save, Loader2, Clipboard, User, Clock, ChevronLeft, Zap, Plus, Trash2, Check, ShieldCheck, ArrowRight, ChevronDown, RefreshCw, Users, History, Trophy, KeyRound, RotateCcw, Eye, EyeOff, TrendingUp, BarChart3, ChevronRight, Lightbulb, CloudDownload, BarChart, AlertTriangle, Fingerprint, ShieldEllipsis, Activity, CloudOff, Lock, UserPlus, UserMinus, SaveAll, Image as ImageIcon, ArrowUpFromLine, ArrowDownToLine, Timer, Unlock, CalendarClock, Key, CalendarPlus, CreditCard, FileX, Database, Trash, Gift, Copy, Bell } from 'lucide-react';
// --- NEW IMPORT ---
import { 
  TARGET_TYPES, 
  DEFAULT_LOGO_URL, 
  DEFAULT_THEME_COLOR,
  generateReferralCode, 
  fetchWithTimeout, 
  adjustColor, 
  ensureReadableColor, 
  getDominantColor, 
  hexToRgba, 
  addTime, 
  getLocalDateString, 
  getInsight, 
  hashString, 
  verifySecurePassword,
  calculateLevel,
  calculateTargetProgress,
  getTargetTypeLabel,
  getTargetStatus,
  resetTargetIfNeeded,
  calculateDistance,
  getCurrentLocation,
  verifyLocation
} from './utils/helpers';
// Import UI Components (Modul 3 - BARU)
import { 
  VisualProgress, 
  CircularProgress, 
  CountdownDisplay, 
  LogoComponent 
} from './components/SharedComponents';
import { 
  GamificationDashboard, 
  GamificationSettings 
} from './components/Gamification';

// --- CONSTANTS ---
const DEFAULT_EMPLOYEES = [];
const DEFAULT_SCRIPT_URL = "";
const TRIAL_UNLOCK_PASSWORD = "KodeRahasia123!";
const LEGACY_PASSWORD = "Mapeline123!";
const DEFAULT_ADMIN_HASH = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5";

const awardPoints = async (appId, db, userId, type, metadata = {}, gamificationConfig) => {
  if (!gamificationConfig.enabled) return 0;
  
  const userPointsRef = doc(db, 'artifacts', appId, 'public', 'data', 'gamification', userId);
  const userPointsSnap = await getDoc(userPointsRef);
  
  let currentData = userPointsSnap.exists() ? userPointsSnap.data() : {
    points: 0,
    level: 1,
    streak: 0,
    lastActivity: null,
    achievements: [],
    history: []
  };
  
  const today = new Date().toDateString();
  const lastActivityDate = currentData.lastActivity ? 
    new Date(currentData.lastActivity).toDateString() : null;
  
  if (lastActivityDate === today) {
    const todayPoints = currentData.history
      .filter(h => new Date(h.timestamp).toDateString() === today)
      .reduce((sum, h) => sum + h.points, 0);
    
    if (todayPoints >= gamificationConfig.maxPointsPerDay) {
      return 0;
    }
  }
  
  let pointsToAdd = 0;
  switch(type) {
    case 'ATTENDANCE':
      pointsToAdd = gamificationConfig.pointsPerAttendance;
      break;
    case 'TASK_COMPLETED':
      pointsToAdd = gamificationConfig.pointsPerTask * (metadata.taskCount || 1);
      break;
    case 'STREAK':
      pointsToAdd = gamificationConfig.pointsPerStreak;
      break;
    case 'PERFECT_DAY':
      pointsToAdd = 50;
      break;
    case 'EARLY_CHECKIN':
      pointsToAdd = 15;
      break;
    case 'TARGET_ACHIEVED':
      pointsToAdd = 30; // Bonus points for achieving targets
      break;
    default:
      pointsToAdd = 5;
  }
  
  let newStreak = currentData.streak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (currentData.lastActivity) {
    const lastDate = new Date(currentData.lastActivity);
    if (lastDate.toDateString() === yesterday.toDateString()) {
      newStreak += 1;
    } else if (lastDate.toDateString() !== today) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }
  
  const newPoints = currentData.points + pointsToAdd;
  const levelInfo = calculateLevel(newPoints);
  
  const historyEntry = {
    type,
    points: pointsToAdd,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  const updatedData = {
    points: newPoints,
    level: levelInfo.level,
    streak: newStreak,
    lastActivity: new Date().toISOString(),
    achievements: currentData.achievements,
    history: [...(currentData.history || []), historyEntry].slice(-100)
  };
  
  await setDoc(userPointsRef, updatedData);
  
  return { points: pointsToAdd, data: updatedData };
};

// Target Component
const TargetComponent = ({ target, employeeName, onUpdate, onDelete }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(target);
  
  if (!target) return null;
  
  const progress = calculateTargetProgress(target.targetValue, target.currentValue);
  const status = getTargetStatus(target);
  const isExpired = status === 'expired';
  
  const handleSave = () => {
    onUpdate(editData);
    setShowEdit(false);
  };
  
  return (
    <div className={`p-4 rounded-2xl ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-100'} shadow-sm`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-black text-slate-800">{target.title}</h4>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${isExpired ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {getTargetTypeLabel(target.type)}
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-2">{target.description}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Target: {target.targetValue}</span>
            <span>Tercapai: {target.currentValue}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowEdit(!showEdit)} className="p-1.5 text-slate-400 hover:text-blue-500">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${isExpired ? 'bg-red-500' : progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {target.deadline && target.type === TARGET_TYPES.CUSTOM_DATE && (
          <div className="text-[10px] text-slate-400 mt-1">
            Tenggat: {new Date(target.deadline).toLocaleDateString('id-ID')}
            {isExpired && <span className="text-red-500 font-bold ml-2">(Kadaluarsa)</span>}
          </div>
        )}
      </div>
      
      {showEdit && (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-3 animate-in slide-in-from-top-2">
          <input
            type="text"
            value={editData.title}
            onChange={e => setEditData({...editData, title: e.target.value})}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Judul Target"
          />
          <textarea
            value={editData.description}
            onChange={e => setEditData({...editData, description: e.target.value})}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Deskripsi"
            rows="2"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500">Target Value</label>
              <input
                type="number"
                value={editData.targetValue}
                onChange={e => setEditData({...editData, targetValue: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">Current Value</label>
              <input
                type="number"
                value={editData.currentValue}
                onChange={e => setEditData({...editData, currentValue: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-bold">
              Simpan
            </button>
            <button onClick={() => setShowEdit(false)} className="flex-1 bg-slate-200 text-slate-600 py-2 rounded-lg text-sm font-bold">
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Target Settings Component
const TargetSettings = ({ 
  employees, 
  userTargets, 
  setUserTargets, 
  handleSaveTargets,
  actionLoading,
  themeColor 
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newTarget, setNewTarget] = useState({
    title: '',
    description: '',
    type: TARGET_TYPES.DAILY,
    targetValue: 0,
    currentValue: 0,
    deadline: '',
    lastReset: new Date().toISOString()
  });

  const handleAddTarget = () => {
    if (!selectedEmployee || !newTarget.title || !newTarget.targetValue) {
      alert('Harap pilih karyawan dan isi judul serta nilai target');
      return;
    }

    const employeeTargets = userTargets[selectedEmployee] || [];
    const updatedTargets = [...employeeTargets, {
      ...newTarget,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }];

    setUserTargets(prev => ({
      ...prev,
      [selectedEmployee]: updatedTargets
    }));

    setNewTarget({
      title: '',
      description: '',
      type: TARGET_TYPES.DAILY,
      targetValue: 0,
      currentValue: 0,
      deadline: '',
      lastReset: new Date().toISOString()
    });
  };

  const handleUpdateTarget = (employeeId, targetId, updatedData) => {
    const employeeTargets = userTargets[employeeId] || [];
    const updatedTargets = employeeTargets.map(target => 
      target.id === targetId ? { ...target, ...updatedData } : target
    );
    
    setUserTargets(prev => ({
      ...prev,
      [employeeId]: updatedTargets
    }));
  };

  const handleDeleteTarget = (employeeId, targetId) => {
    if (!window.confirm('Hapus target ini?')) return;
    
    const employeeTargets = userTargets[employeeId] || [];
    const updatedTargets = employeeTargets.filter(target => target.id !== targetId);
    
    setUserTargets(prev => ({
      ...prev,
      [employeeId]: updatedTargets
    }));
  };

  const handleUpdateCurrentValue = (employeeId, targetId, newValue) => {
    const employeeTargets = userTargets[employeeId] || [];
    const updatedTargets = employeeTargets.map(target => {
      if (target.id === targetId) {
        return { ...target, currentValue: parseInt(newValue) || 0 };
      }
      return target;
    });
    
    setUserTargets(prev => ({
      ...prev,
      [employeeId]: updatedTargets
    }));
  };

  const selectedEmployeeTargets = selectedEmployee ? userTargets[selectedEmployee] || [] : [];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6">
        <h3 className="text-lg font-black text-slate-900">Pengaturan Target Karyawan</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
              Pilih Karyawan
            </label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="">Pilih Karyawan</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          
          {selectedEmployee && (
            <>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <h4 className="text-sm font-black text-emerald-800 mb-2">
                  Tambah Target Baru untuk {employees.find(e => e.id === selectedEmployee)?.name}
                </h4>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Judul Target"
                    value={newTarget.title}
                    onChange={e => setNewTarget({...newTarget, title: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                  />
                  
                  <textarea
                    placeholder="Deskripsi Target (opsional)"
                    value={newTarget.description}
                    onChange={e => setNewTarget({...newTarget, description: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                    rows="2"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Target Value</label>
                      <input
                        type="number"
                        value={newTarget.targetValue}
                        onChange={e => setNewTarget({...newTarget, targetValue: parseInt(e.target.value) || 0})}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Jenis Target</label>
                      <select
                        value={newTarget.type}
                        onChange={e => setNewTarget({...newTarget, type: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value={TARGET_TYPES.DAILY}>Harian</option>
                        <option value={TARGET_TYPES.WEEKLY}>Mingguan</option>
                        <option value={TARGET_TYPES.MONTHLY}>Bulanan</option>
                        <option value={TARGET_TYPES.QUARTERLY}>Triwulan</option>
                        <option value={TARGET_TYPES.YEARLY}>Tahunan</option>
                        <option value={TARGET_TYPES.CUSTOM_DATE}>Tanggal Khusus</option>
                        <option value={TARGET_TYPES.NO_DEADLINE}>Tanpa Tenggat</option>
                      </select>
                    </div>
                  </div>
                  
                  {newTarget.type === TARGET_TYPES.CUSTOM_DATE && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Tanggal Tenggat</label>
                      <input
                        type="datetime-local"
                        value={newTarget.deadline}
                        onChange={e => setNewTarget({...newTarget, deadline: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={handleAddTarget}
                    className="w-full py-3 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors"
                  >
                    Tambah Target
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900">Target Aktif ({selectedEmployeeTargets.length})</h4>
                
                {selectedEmployeeTargets.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada target untuk karyawan ini
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {selectedEmployeeTargets.map(target => {
                      const progress = calculateTargetProgress(target.targetValue, target.currentValue);
                      const status = getTargetStatus(target);
                      const isExpired = status === 'expired';
                      
                      return (
                        <div key={target.id} className={`p-4 rounded-xl ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-100'} shadow-sm`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-sm font-black text-slate-800">{target.title}</h5>
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${isExpired ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {getTargetTypeLabel(target.type)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mb-2">{target.description}</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteTarget(selectedEmployee, target.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={target.currentValue}
                                    onChange={e => handleUpdateCurrentValue(selectedEmployee, target.id, e.target.value)}
                                    className="w-20 p-2 border border-slate-200 rounded-lg text-sm text-center"
                                    min="0"
                                  />
                                  <span className="text-sm text-slate-600">/ {target.targetValue}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-sm font-bold ${progress >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                                  {progress}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isExpired ? 'bg-red-500' : progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Dibuat: {new Date(target.createdAt).toLocaleDateString('id-ID')}</span>
                              {target.deadline && target.type === TARGET_TYPES.CUSTOM_DATE && (
                                <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                                  Tenggat: {new Date(target.deadline).toLocaleDateString('id-ID')}
                                </span>
                              )}
                            </div>
                            
                            {status === 'needs_reset' && (
                              <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg">
                                ⚠️ Target periode ini sudah berakhir. Reset untuk periode baru.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      <button 
        onClick={handleSaveTargets}
        disabled={actionLoading}
        className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2" 
        style={{ backgroundColor: themeColor }}
      >
        <Save className="w-4 h-4" /> Simpan Semua Target
      </button>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-gray-600 mb-6">Aplikasi mengalami masalah. Silakan muat ulang halaman.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App Component
function App() {
  const [affiliateView, setAffiliateView] = useState('login');
  const [affData, setAffData] = useState({ name: '', phone: '', bank: '', code: '', pin: '' });
  const [activeAffiliate, setActiveAffiliate] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [affGlobalConfig, setAffGlobalConfig] = useState({ minWd: 100000, adminWa: '', rewardPerRef: 50000 });
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [proofInput, setProofInput] = useState('');
  const [processingWdId, setProcessingWdId] = useState(null);
  const [wdHistory, setWdHistory] = useState([]);
  const [affiliateTabUnlocked, setAffiliateTabUnlocked] = useState(false);
  const [affiliateTabPass, setAffiliateTabPass] = useState('');
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
  const [loginSelection, setLoginSelection] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isPinMode, setIsPinMode] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => parseInt(localStorage.getItem('actions_failed_attempts') || '0'));
  const [lockoutTime, setLockoutTime] = useState(0);
  const [oldPinChange, setOldPinChange] = useState('');
  const [newPinChange, setNewPinChange] = useState('');
  const [confirmPinChange, setConfirmPinChange] = useState('');
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
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  
  // Gamification State
  const [gamificationConfig, setGamificationConfig] = useState({
    enabled: false,
    pointsPerAttendance: 10,
    pointsPerTask: 5,
    pointsPerStreak: 20,
    maxPointsPerDay: 100,
    locationVerification: false,
    locationRadius: 100,
    companyLat: null,
    companyLng: null
  });
  
  // Target Management State
  const [userTargets, setUserTargets] = useState({});
  const [userPoints, setUserPoints] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationPermission, setLocationPermission] = useState('prompt');
  
  const [config, setConfig] = useState({
    scriptUrl: DEFAULT_SCRIPT_URL,
    logoUrl: DEFAULT_LOGO_URL,
    trialEnabled: false,
    trialEndDate: '',
    subscriptionEnabled: false,
    subscriptionEndDate: '',
    myReferralCode: '',
    referredBy: ''
  });
  
  const [adminPassHash, setAdminPassHash] = useState(DEFAULT_ADMIN_HASH);
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const codeTextAreaRef = useRef(null);
  const processingRewards = useRef(new Set());

  // Security measures
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

  // Lockout timer
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

  // Reset state when view changes
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
      setAffiliateTabUnlocked(false);
      setAffiliateTabPass('');
    }
  }, [view]);

  // Trial and subscription checks
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
    if (config.trialEnabled) return { label: 'TRIAL', badgeClass: 'bg-amber-100 text-amber-600 border border-amber-200', textClass: 'text-amber-600', targetDate: config.trialEndDate };
    if (config.subscriptionEnabled) return { label: 'LICENSE', badgeClass: 'bg-blue-100 text-blue-600 border border-blue-200', textClass: 'text-blue-600', targetDate: config.subscriptionEndDate };
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
      const synthetic = { 
        timestamp: attendanceData.checkInTime, 
        type: 'CHECK_IN', 
        status: 'PENDING', 
        tasks: attendanceData.tasks ? JSON.stringify(attendanceData.tasks) : '' 
      };
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
        if (cleaned) { 
          itemTotal++; 
          totalTasksGlobal++; 
          if (cleaned.includes('[x]')) { 
            itemDone++; 
            completedTasksGlobal++; 
          } 
        }
      });
      
      if (!dailyStats[dateKey]) { 
        dailyStats[dateKey] = { total: 0, done: 0 }; 
      }
      dailyStats[dateKey].total += itemTotal;
      dailyStats[dateKey].done += itemDone;
    });
    
    const overallRate = totalTasksGlobal > 0 ? Math.round((completedTasksGlobal / totalTasksGlobal) * 100) : 0;
    const sortedDates = Object.keys(dailyStats).sort();
    const trendData = sortedDates.slice(-7).map(key => ({ 
      label: key.split('-')[2], 
      rate: dailyStats[key].total > 0 ? Math.round((dailyStats[key].done / dailyStats[key].total) * 100) : 0, 
      fullDate: key 
    }));
    
    return { 
      totalPresence: uniqueDates.size, 
      totalTasks: totalTasksGlobal, 
      completedTasks: completedTasksGlobal, 
      completionRate: overallRate, 
      trendData 
    };
  }, [displayedHistory]);

  const teamReport = useMemo(() => {
    if (!allRecapData || allRecapData.length === 0) return { users: [], summary: null };
    
    const userStatsMap = {};
    let globalTotalTasks = 0;
    let globalDoneTasks = 0;
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
      else if (filterRange === 'all') isMatch = true;
      
      if (!isMatch) return;
      
      const dateStr = itemDateObj.toDateString();
      const uniqueKey = `${item.name}-${dateStr}`;
      if (processedKeys.has(uniqueKey)) return;
      processedKeys.add(uniqueKey);
      
      const name = item.name;
      globalDates.add(dateStr);
      
      if (!userStatsMap[name]) {
        userStatsMap[name] = { 
          name: name, 
          dates: new Set(), 
          totalTasks: 0, 
          doneTasks: 0 
        };
      }
      
      userStatsMap[name].dates.add(dateStr);
      activeUserCountSet.add(name);
      
      let taskLines = [];
      if (item.tasks) {
        if (typeof item.tasks === 'string') {
          if (item.tasks.startsWith('[') || item.tasks.startsWith('{')) {
            try {
              const parsed = JSON.parse(item.tasks);
              if (Array.isArray(parsed)) {
                taskLines = parsed.map(t => t.text);
                parsed.forEach(t => {
                  if (t.done) {
                    userStatsMap[name].doneTasks++;
                    globalDoneTasks++;
                  }
                });
              }
            } catch (e) {
              taskLines = item.tasks.split('\n');
            }
          } else {
            taskLines = item.tasks.split('\n');
          }
        }
      }
      
      taskLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          userStatsMap[name].totalTasks++;
          globalTotalTasks++;
          if (trimmed.includes('[x]')) {
            userStatsMap[name].doneTasks++;
            globalDoneTasks++;
          }
        }
      });
    });
    
    const usersListRaw = Object.values(userStatsMap).map(u => ({
      ...u,
      presenceCount: u.dates.size,
      score: u.totalTasks > 0 ? Math.round((u.doneTasks / u.totalTasks) * 100) : 0
    })).sort((a, b) => b.score - a.score || b.presenceCount - a.presenceCount);
    
    const usersList = usersListRaw.map((u, i, arr) => {
      if (i > 0) {
        const prev = arr[i - 1];
        u.rank = (u.score === prev.score && u.presenceCount === prev.presenceCount) ? prev.rank : i + 1;
      } else {
        u.rank = 1;
      }
      return u;
    });
    
    const averageTeamScore = globalTotalTasks > 0 ? Math.round((globalDoneTasks / globalTotalTasks) * 100) : 0;
    
    return {
      users: usersList,
      summary: {
        totalGlobalTasks: globalTotalTasks,
        doneGlobalTasks: globalDoneTasks,
        averageScore: averageTeamScore,
        activeDays: globalDates.size,
        employeeCount: activeUserCountSet.size,
        insight: getInsight(averageTeamScore)
      }
    };
  }, [allRecapData, filterRange]);

  const selectedUserHistory = useMemo(() => {
    if (!selectedReportUser || !allRecapData) return [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOf7DaysAgo = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOf30DaysAgo = startOfToday - (30 * 24 * 60 * 60 * 1000);

    return allRecapData.filter(item => {
      if (item.name !== selectedReportUser.name) return false;
      
      const itemTime = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
      const itemDateObj = new Date(itemTime);
      
      if (filterRange === 'today') return itemTime >= startOfToday;
      if (filterRange === 'yesterday') return itemTime >= startOfYesterday && itemTime < startOfToday;
      if (filterRange === 'week') return itemTime >= startOf7DaysAgo;
      if (filterRange === 'month') return itemDateObj.getMonth() === now.getMonth() && itemDateObj.getFullYear() === now.getFullYear();
      if (filterRange === 'last30') return itemTime >= startOf30DaysAgo;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [selectedReportUser, allRecapData, filterRange]);

  // Handler Functions
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

  const requestConfigAccess = () => { 
    setViewBeforePass(view); 
    setView('pass_challenge'); 
    setPassInput(''); 
    setShowPass(false); 
  };
  
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
  
  const handleStartLogin = () => { 
    if (!loginSelection) return; 
    setIsPinMode(true); 
    setPinInput(''); 
  };
  
  const handleVerifyPin = async () => {
    if (lockoutTime > 0) return;
    const emp = employees.find(e => e.id === loginSelection);
    if (!emp) return;
    
    setActionLoading(true);
    try {
      const credRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_credentials', emp.id);
      const credSnap = await getDoc(credRef);
      let storedPin = emp.defaultPin;
      if (credSnap.exists() && credSnap.data().pin) { 
        storedPin = credSnap.data().pin; 
      }
      
      const isValid = await verifySecurePassword(pinInput, storedPin);
      if (isValid) {
        setSelectedEmployee(emp); 
        setFailedAttempts(0); 
        setIsPinMode(false); 
        setPinInput('');
        setMsg({ type: 'success', text: `Halo, ${emp.name}!` });
      } else { 
        handleLoginFailure(); 
      }
    } catch (e) { 
      setMsg({ type: 'error', text: 'Error verifikasi.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleResetUserPin = async (empId, empName) => {
    setActionLoading(true);
    try {
      const credRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_credentials', empId);
      const hashedDefault = await hashString('123456');
      await setDoc(credRef, { pin: hashedDefault, updatedAt: serverTimestamp() }, { merge: true });
      setMsg({ type: 'success', text: `PIN ${empName} direset!` });
    } catch (e) { 
      setMsg({ type: 'error', text: 'Gagal reset.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleUpdatePin = async () => {
    if (!selectedEmployee) return;
    if (newPinChange !== confirmPinChange) { 
      setMsg({ type: 'error', text: 'Konfirmasi PIN tidak cocok.' }); 
      return; 
    }
    if (newPinChange.length < 6) { 
      setMsg({ type: 'error', text: 'PIN minimal 6 digit.' }); 
      return; 
    }
    
    setActionLoading(true);
    try {
      const credRef = doc(db, 'artifacts', appId, 'public', 'data', 'user_credentials', selectedEmployee.id);
      const credSnap = await getDoc(credRef);
      let currentStoredPin = selectedEmployee.defaultPin;
      if (credSnap.exists() && credSnap.data().pin) { 
        currentStoredPin = credSnap.data().pin; 
      }
      
      const isValid = await verifySecurePassword(oldPinChange, currentStoredPin);
      if (!isValid) { 
        setMsg({ type: 'error', text: 'PIN lama salah.' }); 
      } else {
        const hashedNewPin = await hashString(newPinChange);
        await setDoc(credRef, { pin: hashedNewPin, updatedAt: serverTimestamp() }, { merge: true });
        setMsg({ type: 'success', text: 'PIN berhasil diperbarui!' });
        
        if (attendanceData) { 
          setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard'); 
        } else { 
          setView('checkin'); 
        }
        setOldPinChange(''); 
        setNewPinChange(''); 
        setConfirmPinChange('');
      }
    } catch (e) { 
      setMsg({ type: 'error', text: 'Gagal memperbarui PIN.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const verifyAdminPassword = async () => {
    const cleanInput = passInput.trim();
    if (!cleanInput) return;
    
    if (cleanInput === TRIAL_UNLOCK_PASSWORD || cleanInput === LEGACY_PASSWORD) {
      localStorage.removeItem('actions_failed_attempts');
      localStorage.removeItem('actions_lockout_until');
      setFailedAttempts(0);
      setLockoutTime(0);
      setView('config');
      setPassInput('');
      return;
    }
    
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
    } catch (err) { 
      setMsg({ type: 'error', text: 'Error verifikasi.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
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
    } catch(e) { 
      console.error("Sheet sync error", e); 
    }
  };

  const handleSaveConfig = async () => {
    setActionLoading(true);
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
      const settingsSnap = await getDoc(settingsRef);
      const alreadyClaimed = settingsSnap.exists() && settingsSnap.data().referralRewardClaimed;
      
      const updateData = { 
        scriptUrl: config.scriptUrl, 
        logoUrl: config.logoUrl, 
        myReferralCode: config.myReferralCode, 
        referredBy: config.referredBy, 
        updatedAt: serverTimestamp() 
      };
      
      await setDoc(settingsRef, updateData, { merge: true });
      
      if (config.scriptUrl) {
        const payload = { action: 'update_config', logoUrl: config.logoUrl };
        await fetchWithTimeout(config.scriptUrl, { 
          method: 'POST', 
          mode: 'no-cors', 
          headers: { 'Content-Type': 'text/plain' }, 
          body: JSON.stringify(payload) 
        });
      }
      
      if (config.referredBy && config.referredBy.length > 3 && config.referredBy !== config.myReferralCode && !alreadyClaimed) {
        const affiliateRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'affiliates', config.referredBy);
        const affiliateSnap = await getDoc(affiliateRef);
        
        if (affiliateSnap.exists()) {
          const globalConfigRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'config', 'affiliate_settings');
          const globalConfigSnap = await getDoc(globalConfigRef);
          const currentReward = globalConfigSnap.exists() && globalConfigSnap.data().rewardPerRef ? globalConfigSnap.data().rewardPerRef : 50000;
          
          await updateDoc(affiliateRef, { 
            totalReferrals: increment(1), 
            unpaidCommission: increment(currentReward), 
            lastReferralAt: serverTimestamp() 
          });
          
          await updateDoc(settingsRef, { referralRewardClaimed: true });
          setMsg({ type: 'success', text: `Konfigurasi Disimpan & Komisi Rp ${currentReward.toLocaleString()} Tercatat!` });
        } else {
          const rewardId = `${appId}_to_${config.referredBy}`;
          const rewardRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'pending_rewards', rewardId);
          const rewardSnap = await getDoc(rewardRef);
          
          if (!rewardSnap.exists()) {
            await setDoc(rewardRef, { 
              targetCode: config.referredBy, 
              sourceAppId: appId, 
              type: 'REFERRAL_ACTIVATION', 
              status: 'PENDING', 
              createdAt: serverTimestamp() 
            });
            
            await updateDoc(settingsRef, { referralRewardClaimed: true });
            setMsg({ type: 'success', text: 'Konfigurasi Disimpan & Reward Terkirim!' });
          } else { 
            setMsg({ type: 'success', text: 'Konfigurasi Disimpan (Reward sudah pernah dikirim).' }); 
          }
        }
      } else {
        if (alreadyClaimed && config.referredBy) { 
          setMsg({ type: 'success', text: 'Konfigurasi Disimpan (Kode Referral sudah terpakai).' }); 
        } else { 
          setMsg({ type: 'success', text: 'Konfigurasi Disimpan!' }); 
        }
      }
    } catch(e) { 
      setMsg({ type: 'error', text: 'Gagal menyimpan konfigurasi.' }); 
      console.error(e); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleSaveTrialConfig = async () => {
    setActionLoading(true);
    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
      await setDoc(configRef, { 
        trialEnabled: config.trialEnabled, 
        trialEndDate: config.trialEndDate, 
        subscriptionEnabled: config.subscriptionEnabled, 
        subscriptionEndDate: config.subscriptionEndDate, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      
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
      console.error(e); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };

  const handleSaveTargets = async () => {
    setActionLoading(true);
    try {
      const targetsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'targets');
      await setDoc(targetsRef, { 
        userTargets,
        updatedAt: serverTimestamp() 
      });
      setMsg({ type: 'success', text: 'Target karyawan disimpan!' });
    } catch(e) { 
      setMsg({ type: 'error', text: 'Gagal menyimpan target.' }); 
      console.error(e); 
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
    if (!window.confirm("PERINGATAN: Hapus SEMUA riwayat?")) return;
    if (!window.confirm("Yakin ingin menghapus?")) return;
    
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
      setAllRecapData([]);
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
    } catch (e) { 
      console.error("Sync error:", e); 
    }
  };
  
  const handleAddEmployee = async () => {
    if (!newEmpName.trim()) { 
      setMsg({ type: 'error', text: 'Nama kosong.' }); 
      return; 
    }
    
    let finalId = newEmpId.trim() ? newEmpId.trim().toLowerCase().replace(/\s+/g, '_') : 
      newEmpName.split(' ')[0].toLowerCase() + Math.floor(Math.random()*100);
    
    if (employees.some(e => e.id === finalId)) { 
      setMsg({ type: 'error', text: 'ID sudah ada.' }); 
      return; 
    }
    
    const newEmp = { id: finalId, name: newEmpName, defaultPin: '123456' };
    const updatedList = [...employees, newEmp].sort((a,b) => a.name.localeCompare(b.name));
    
    setActionLoading(true);
    try {
      const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
      await setDoc(empDocRef, { list: updatedList });
      setEmployees(updatedList);
      setNewEmpName('');
      setNewEmpId('');
      await updateSheetEmployeeList(updatedList);
      setMsg({ type: 'success', text: 'Pegawai Ditambahkan!' });
    } catch(e) { 
      setMsg({ type: 'error', text: 'Gagal menambah pegawai.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleDeleteEmployee = async (empId, empName) => {
    const updatedList = employees.filter(e => e.id !== empId);
    setConfirmDeleteId(null);
    setActionLoading(true);
    
    try {
      const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
      await setDoc(empDocRef, { list: updatedList });
      setEmployees(updatedList);
      await updateSheetEmployeeList(updatedList);
      setMsg({ type: 'success', text: `${empName} dihapus.` });
    } catch(e) { 
      setMsg({ type: 'error', text: 'Gagal menghapus.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleSyncUpload = async () => {
    setSyncLoading(true); 
    await updateSheetEmployeeList(employees); 
    setSyncLoading(false);
    setMsg({ type: 'success', text: 'Backup sukses!' }); 
    setTimeout(() => setMsg(null), 3000);
  };
  
  const handleSyncDownload = async () => {
    if (!config.scriptUrl) { 
      setMsg({ type: 'error', text: 'URL Script belum diset.' }); 
      return; 
    }
    
    setSyncLoading(true);
    try {
      const response = await fetchWithTimeout(`${config.scriptUrl}?action=get_employees&t=${Date.now()}`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        if (data[0].id && data[0].name) {
          const empDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_data', 'employee_list');
          await setDoc(empDocRef, { list: data });
          setEmployees(data);
          setMsg({ type: 'success', text: `Berhasil memuat ${data.length} pegawai!` });
        } else { 
          setMsg({ type: 'error', text: 'Format salah.' }); 
        }
      } else { 
        setMsg({ type: 'error', text: 'Data Sheet kosong.' }); 
      }
    } catch(e) { 
      setMsg({ type: 'error', text: 'Gagal download.' }); 
    } finally { 
      setSyncLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const fetchRecapData = async (manual = false) => {
    if (!selectedEmployee || !config.scriptUrl) return;
    
    setRecapLoading(true); 
    if (!manual) setView('recap');
    
    try {
      const response = await fetchWithTimeout(`${config.scriptUrl}?name=${encodeURIComponent(selectedEmployee.name)}&t=${Date.now()}`);
      const data = await response.json();
      setRecapData(Array.isArray(data) ? data : []);
      if (manual) setMsg({ type: 'success', text: 'Data sinkron!' });
    } catch (e) { 
      setMsg({ type: 'error', text: 'Gagal ambil histori.' }); 
    } finally { 
      setRecapLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
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
    } catch (e) { 
      setMsg({ type: 'error', text: 'Gagal sinkron tim.' }); 
    } finally { 
      setAllRecapLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleCheckIn = async () => {
    if (tempTasks.length === 0 || !user || !selectedEmployee) { 
      setMsg({ type: 'error', text: 'Isi minimal satu target.' }); 
      setTimeout(() => setMsg(null), 3000); 
      return; 
    }
    
    setActionLoading(true);
    
    let locationVerification = null;
    if (gamificationConfig.enabled && gamificationConfig.locationVerification) {
      try {
        locationVerification = await verifyLocation(gamificationConfig);
        
        if (!locationVerification.valid) {
          setMsg({ 
            type: 'error', 
            text: `Anda berada ${locationVerification.distance}m dari kantor. Absen hanya bisa dilakukan dalam radius ${gamificationConfig.locationRadius}m.` 
          });
          setActionLoading(false);
          return;
        }
      } catch (error) {
        setMsg({ 
          type: 'warning', 
          text: 'Lokasi tidak terdeteksi. Absen tetap dicatat tanpa poin bonus.' 
        });
      }
    }
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    
    try {
      const data = { 
        employeeId: selectedEmployee.id, 
        employeeName: selectedEmployee.name, 
        checkInTime: new Date().toISOString(), 
        tasks: tempTasks, 
        status: 'ACTIVE', 
        updatedAt: serverTimestamp(),
        location: locationVerification?.location || null,
        locationValidated: !!locationVerification?.valid
      };
      
      await setDoc(docRef, data); 
      await sendToSheet('CHECK_IN', tempTasks, selectedEmployee.name);
      
      if (gamificationConfig.enabled) {
        const result = await awardPoints(appId, db, selectedEmployee.id, 'ATTENDANCE', {
          locationValid: !!locationVerification?.valid,
          distance: locationVerification?.distance
        }, gamificationConfig);
        
        if (result.points > 0) {
          setUserPoints(prev => ({
            ...prev,
            [selectedEmployee.id]: result.data
          }));
          setMsg({ 
            type: 'success', 
            text: `Selamat Bekerja! +${result.points} poin` 
          });
        } else {
          setMsg({ type: 'success', text: 'Selamat Bekerja!' });
        }
      } else {
        setMsg({ type: 'success', text: 'Selamat Bekerja!' });
      }
      
      const now = new Date();
      const checkinHour = now.getHours();
      if (checkinHour < 9 && gamificationConfig.enabled) {
        await awardPoints(appId, db, selectedEmployee.id, 'EARLY_CHECKIN', {}, gamificationConfig);
      }
      
      setTempTasks([]); 
      setTaskInput('');
    } catch (err) { 
      setMsg({ type: 'error', text: 'Gagal simpan data.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleUpdateTask = async (idx) => {
    if (!user || !attendanceData || !selectedEmployee) return;
    
    const updatedTasks = [...attendanceData.tasks]; 
    updatedTasks[idx].done = !updatedTasks[idx].done;
    
    if (updatedTasks[idx].done) {
      updatedTasks[idx].completedAt = new Date().toISOString();
      updatedTasks[idx].completedBy = selectedEmployee.id;
    } else {
      delete updatedTasks[idx].completedAt;
      delete updatedTasks[idx].completedBy;
    }
    
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'employee_status', selectedEmployee.id);
    
    try { 
      await updateDoc(docRef, { 
        tasks: updatedTasks, 
        updatedAt: serverTimestamp() 
      }); 
      
      await sendToSheet('UPDATE', updatedTasks, selectedEmployee.name, attendanceData.note || ""); 
      
      if (gamificationConfig.enabled && updatedTasks[idx].done) {
        const result = await awardPoints(appId, db, selectedEmployee.id, 'TASK_COMPLETED', {
          taskId: idx,
          taskText: updatedTasks[idx].text.substring(0, 50)
        }, gamificationConfig);
        
        if (result.points > 0) {
          setUserPoints(prev => ({
            ...prev,
            [selectedEmployee.id]: result.data
          }));
          setMsg({ 
            type: 'success', 
            text: `Task selesai! +${result.points} poin` 
          });
          setTimeout(() => setMsg(null), 2000);
        }
        
        const allTasksDone = updatedTasks.every(task => task.done);
        if (allTasksDone) {
          await awardPoints(appId, db, selectedEmployee.id, 'PERFECT_DAY', {
            taskCount: updatedTasks.length
          }, gamificationConfig);
        }
      }
    } catch(e) {
      console.error("Error updating task:", e);
    }
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
      setMsg({ type: 'success', text: 'Laporan Selesai!' }); 
      setCheckoutNote('');
      setTimeout(() => { 
        setSelectedEmployee(null); 
        setAttendanceData(null); 
        setView('login'); 
      }, 2000);
    } catch (err) { 
      setMsg({ type: 'error', text: 'Gagal kirim laporan.' }); 
    } finally { 
      setActionLoading(false); 
      setTimeout(() => setMsg(null), 3000); 
    }
  };
  
  const handleAffiliateRegister = async () => {
    if (!affData.name || !affData.phone || !affData.pin) { 
      setMsg({type:'error', text:'Mohon lengkapi data!'}); 
      return; 
    }
    
    setActionLoading(true);
    try {
      const newCode = 'MKT-' + Math.floor(1000 + Math.random() * 9000);
      const affiliateRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'affiliates', newCode);
      await setDoc(affiliateRef, { 
        code: newCode, 
        name: affData.name, 
        phone: affData.phone, 
        bank: affData.bank, 
        pin: affData.pin, 
        totalReferrals: 0, 
        unpaidCommission: 0, 
        createdAt: serverTimestamp() 
      });
      
      const globalRegRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'referral_codes', newCode);
      await setDoc(globalRegRef, { ownerType: 'AFFILIATE', updatedAt: serverTimestamp() });
      
      setAffData({...affData, code: newCode});
      setMsg({type:'success', text: `Pendaftaran Sukses! Kode: ${newCode}`});
      setAffiliateView('login');
    } catch(e) { 
      setMsg({type:'error', text:'Gagal mendaftar.'}); 
    } finally { 
      setActionLoading(false); 
      setTimeout(()=>setMsg(null),3000); 
    }
  };
  
  const handleAffiliateLogin = async () => {
    if (!affData.code || !affData.pin) return;
    
    setActionLoading(true);
    try {
      const ref = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'affiliates', affData.code.toUpperCase());
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().pin === affData.pin) { 
        setActiveAffiliate(snap.data()); 
        setAffiliateView('dashboard'); 
        setMsg({type:'success', text: 'Login Berhasil!'}); 
      } else { 
        setMsg({type:'error', text:'Kode Mitra atau PIN salah.'}); 
      }
    } catch(e) { 
      setMsg({type:'error', text:'Login error.'}); 
    } finally { 
      setActionLoading(false); 
      setTimeout(()=>setMsg(null),3000); 
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const gamificationRef = collection(db, 'artifacts', appId, 'public', 'data', 'gamification');
      const snapshot = await getDocs(gamificationRef);
      
      const leaderboardData = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.points > 0) {
          leaderboardData.push({
            userId: docSnap.id,
            ...data,
            levelInfo: calculateLevel(data.points)
          });
        }
      });
      
      leaderboardData.sort((a, b) => b.points - a.points);
      
      leaderboardData.forEach((item, index) => {
        item.rank = index + 1;
      });
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const handleSaveGamificationConfig = async () => {
    setActionLoading(true);
    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'gamification');
      await setDoc(configRef, gamificationConfig);
      setMsg({ type: 'success', text: 'Pengaturan gamifikasi disimpan!' });
    } catch (error) {
      setMsg({ type: 'error', text: 'Gagal menyimpan pengaturan' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleAmountChange = (val) => {
    const rawValue = val.replace(/\D/g, '');
    if (rawValue === '') { 
      setWithdrawAmount(''); 
      return; 
    }
    setWithdrawAmount(parseInt(rawValue).toLocaleString('id-ID'));
  };

  const handleRequestWithdraw = async () => {
    const rawString = withdrawAmount ? withdrawAmount.toString().replace(/\./g, '') : '0';
    const amount = parseInt(rawString);
    
    if (!amount || amount <= 0) { 
      setMsg({type:'error', text:'Masukkan nominal yang benar.'}); 
      setTimeout(() => setMsg(null), 3000); 
      return; 
    }
    
    if (amount < affGlobalConfig.minWd) { 
      setMsg({type:'error', text:`Minimal penarikan Rp ${affGlobalConfig.minWd.toLocaleString()}`}); 
      setTimeout(() => setMsg(null), 3000); 
      return; 
    }
    
    if (amount > activeAffiliate.unpaidCommission) { 
      setMsg({type:'error', text:'Saldo tidak mencukupi!'}); 
      setTimeout(() => setMsg(null), 3000); 
      return; 
    }
    
    setActionLoading(true);
    try {
      const affRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'affiliates', activeAffiliate.code);
      await updateDoc(affRef, { unpaidCommission: increment(-amount) });
      setActiveAffiliate(prev => ({...prev, unpaidCommission: prev.unpaidCommission - amount}));
      
      await addDoc(collection(db, 'artifacts', 'GLOBAL_SYSTEM', 'withdrawals'), { 
        affiliateCode: activeAffiliate.code, 
        affiliateName: activeAffiliate.name, 
        affiliateBank: activeAffiliate.bank, 
        amount: amount, 
        status: 'PENDING', 
        createdAt: serverTimestamp() 
      });
      
      setMsg({type:'success', text:'Permintaan dikirim!'}); 
      setShowWithdrawModal(false); 
      setWithdrawAmount('');
    } catch(e) { 
      setMsg({type:'error', text:'Gagal request.'}); 
    } finally { 
      setActionLoading(false); 
      setTimeout(()=>setMsg(null),3000); 
    }
  };

  const handleApproveWithdraw = async (wdItem) => {
    if (!proofInput) { 
      setMsg({type:'error', text:'Harap isi bukti transfer (Link/Ket)'}); 
      return; 
    }
    
    if(!window.confirm(`Konfirmasi transfer Rp ${wdItem.amount.toLocaleString()} ke ${wdItem.affiliateName}?`)) return;
    
    setActionLoading(true);
    try {
      const wdRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'withdrawals', wdItem.id);
      await updateDoc(wdRef, { 
        status: 'COMPLETED', 
        proof: proofInput, 
        approvedAt: serverTimestamp() 
      });
      setMsg({type:'success', text:'Penarikan Dikonfirmasi!'}); 
      setProcessingWdId(null); 
      setProofInput('');
    } catch(e) { 
      setMsg({type:'error', text:'Gagal konfirmasi.'}); 
    } finally { 
      setActionLoading(false); 
      setTimeout(()=>setMsg(null),3000); 
    }
  };

  const handleRejectWithdraw = async (wdItem) => {
    if(!window.confirm("Tolak & Refund Saldo?")) return;
    
    setActionLoading(true);
    try {
      const affRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'affiliates', wdItem.affiliateCode);
      await updateDoc(affRef, { unpaidCommission: increment(wdItem.amount) });
      
      const wdRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'withdrawals', wdItem.id);
      await updateDoc(wdRef, { status: 'REJECTED', approvedAt: serverTimestamp() });
      setMsg({type:'success', text:'Ditolak & Saldo Direfund.'});
    } catch(e) { 
      setMsg({type:'error', text:'Gagal menolak.'}); 
    } finally { 
      setActionLoading(false); 
      setTimeout(()=>setMsg(null),3000); 
    }
  };

  const handleUnlockAffiliateTab = async () => {
    const isValid = await verifySecurePassword(affiliateTabPass, adminPassHash);
    if (isValid) { 
      setAffiliateTabUnlocked(true); 
      setMsg({type:'success', text:'Akses Mitra Terbuka!'}); 
    } else { 
      setMsg({type:'error', text:'Password Salah!'}); 
    }
  };

  const handleSaveAffiliateSettings = async () => {
    setActionLoading(true);
    try { 
      await setDoc(doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'config', 'affiliate_settings'), affGlobalConfig); 
      setMsg({type:'success', text:'Pengaturan Mitra Disimpan!'}); 
    } catch(e) { 
      setMsg({type:'error', text:'Gagal simpan.'}); 
    } finally { 
      setActionLoading(false); 
      setTimeout(()=>setMsg(null),2000); 
    }
  };

  // Watch pending withdrawals
  useEffect(() => {
    let unsubscribeWd = () => {}; 
    if (view === 'config') {
      const fetchAffConfig = async () => {
        const ref = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'config', 'affiliate_settings');
        const snap = await getDoc(ref);
        if (snap.exists()) setAffGlobalConfig(snap.data());
      };
      fetchAffConfig();
      
      const q = query(collection(db, 'artifacts', 'GLOBAL_SYSTEM', 'withdrawals'), where('status', '==', 'PENDING'));
      unsubscribeWd = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPendingWithdrawals(list);
      });
    }
    return () => unsubscribeWd();
  }, [view]);

  // Watch withdrawal history
  useEffect(() => {
    let unsubscribeHistory = () => {};
    if (view === 'affiliate_portal' && affiliateView === 'dashboard' && activeAffiliate) {
      const q = query(collection(db, 'artifacts', 'GLOBAL_SYSTEM', 'withdrawals'), where('affiliateCode', '==', activeAffiliate.code));
      unsubscribeHistory = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setWdHistory(list);
      });
    }
    return () => unsubscribeHistory();
  }, [view, affiliateView, activeAffiliate]);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => { 
      try { 
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Auth failed:", err);
        try {
          await signInAnonymously(auth);
        } catch (fallbackErr) {
          console.error("Fallback auth also failed:", fallbackErr);
        }
      } finally { 
        setLoading(false); 
      } 
    };
    
    initAuth(); 
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); }); 
    return () => unsubscribe();
  }, []);

  // Update theme color from logo
  useEffect(() => { 
    const updateTheme = async () => { 
      if (config.logoUrl) { 
        const color = await getDominantColor(config.logoUrl); 
        setThemeColor(color); 
      } 
    }; 
    updateTheme(); 
  }, [config.logoUrl]);

  // Check for affiliate portal parameter
  useEffect(() => { 
    const params = new URLSearchParams(window.location.search); 
    if (params.get('portal') === 'mitra') { 
      setView('affiliate_portal'); 
      setAffiliateView('login'); 
    } 
  }, []);

  // Initial sync with Google Sheet
  useEffect(() => {
    if (!user) return;
    
    const performInitialSync = async () => {
      if (config.scriptUrl) {
        try { 
          await fetchWithTimeout(`${config.scriptUrl}?action=get_config&t=${Date.now()}`); 
        } catch (e) { 
          console.warn("Initial config sync failed:", e); 
        }
        
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

  // Fetch employees
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
      } catch(e) {}
    };
    fetchEmployees();
  }, [user]);

  // Watch admin credentials and settings
  useEffect(() => {
    if (!user) return;
    
    const credsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'credentials');
    const unsubscribeCreds = onSnapshot(credsRef, (snap) => { 
      if (snap.exists() && snap.data().pass) { 
        setAdminPassHash(snap.data().pass); 
      } else { 
        const initDefault = async () => { 
          await setDoc(credsRef, { pass: DEFAULT_ADMIN_HASH, updatedAt: serverTimestamp() }); 
          setAdminPassHash(DEFAULT_ADMIN_HASH); 
        }; 
        initDefault(); 
      } 
    });
    
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      let currentData = docSnap.exists() ? docSnap.data() : {}; 
      let needsUpdate = false;
      
      if (!currentData.myReferralCode) { 
        currentData.myReferralCode = generateReferralCode(); 
        needsUpdate = true; 
      }
      if (currentData.referredBy === undefined) { 
        currentData.referredBy = ''; 
      }
      
      setConfig(prev => ({ 
        ...prev, 
        scriptUrl: currentData.scriptUrl !== undefined ? currentData.scriptUrl : prev.scriptUrl, 
        logoUrl: currentData.logoUrl !== undefined ? currentData.logoUrl : prev.logoUrl, 
        trialEnabled: currentData.trialEnabled !== undefined ? currentData.trialEnabled : false, 
        trialEndDate: currentData.trialEndDate !== undefined ? currentData.trialEndDate : '', 
        subscriptionEnabled: currentData.subscriptionEnabled !== undefined ? currentData.subscriptionEnabled : false, 
        subscriptionEndDate: currentData.subscriptionEndDate !== undefined ? currentData.subscriptionEndDate : '', 
        myReferralCode: currentData.myReferralCode, 
        referredBy: currentData.referredBy || '' 
      }));
      
      if (needsUpdate || !docSnap.exists()) { 
        setDoc(settingsRef, { ...currentData, updatedAt: serverTimestamp() }, { merge: true }); 
      }
      
      if (currentData.myReferralCode) { 
        const globalRegRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'referral_codes', currentData.myReferralCode); 
        setDoc(globalRegRef, { ownerAppId: appId, updatedAt: serverTimestamp() }, { merge: true }); 
      }
    });
    
    return () => { 
      unsubscribeCreds(); 
      unsubscribeSettings(); 
    };
  }, [user]);

  // Load gamification config
  useEffect(() => {
    if (!user) return;
    
    const gamificationRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'gamification');
    const unsubscribe = onSnapshot(gamificationRef, (docSnap) => {
      if (docSnap.exists()) {
        setGamificationConfig(docSnap.data());
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // Load user targets
  useEffect(() => {
    if (!user) return;
    
    const targetsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'targets');
    const unsubscribe = onSnapshot(targetsRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserTargets(docSnap.data().userTargets || {});
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // Load user points saat login
  useEffect(() => {
    if (selectedEmployee?.id) {
      const pointsRef = doc(db, 'artifacts', appId, 'public', 'data', 'gamification', selectedEmployee.id);
      const unsubscribe = onSnapshot(pointsRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserPoints(prev => ({
            ...prev,
            [selectedEmployee.id]: docSnap.data()
          }));
        }
      });
      
      return () => unsubscribe();
    }
  }, [selectedEmployee?.id]);

  // Fetch leaderboard periodically
  useEffect(() => {
    if (gamificationConfig.enabled) {
      fetchLeaderboard();
      const interval = setInterval(fetchLeaderboard, 30000);
      return () => clearInterval(interval);
    }
  }, [gamificationConfig.enabled]);

  // Watch for referral rewards
  useEffect(() => {
    if (!config.myReferralCode) return;
    
    const rewardsRef = collection(db, 'artifacts', 'GLOBAL_SYSTEM', 'pending_rewards');
    const unsubscribeRewards = onSnapshot(rewardsRef, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if ((change.type === 'added' || change.type === 'modified')) {
          const data = change.doc.data();
          const docId = change.doc.id;
          
          if (data.targetCode === config.myReferralCode && data.status === 'PENDING' && !processingRewards.current.has(docId)) {
            processingRewards.current.add(docId);
            let currentEnd = new Date(config.subscriptionEndDate);
            if (isNaN(currentEnd.getTime()) || currentEnd < new Date()) { 
              currentEnd = new Date(); 
            }
            
            currentEnd.setDate(currentEnd.getDate() + 30);
            const newDateISO = currentEnd.toISOString().slice(0, 16);
            
            try {
              const rewardDocRef = doc(db, 'artifacts', 'GLOBAL_SYSTEM', 'pending_rewards', docId);
              await updateDoc(rewardDocRef, { 
                status: 'CLAIMED', 
                claimedAt: serverTimestamp(), 
                claimedByAppId: appId 
              });
              
              const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'admin_config', 'settings');
              await updateDoc(settingsRef, { 
                subscriptionEnabled: true, 
                subscriptionEndDate: newDateISO, 
                updatedAt: serverTimestamp() 
              });
              
              setMsg({ type: 'success', text: `SELAMAT! Anda dapat bonus 1 Bulan dari Referral!` });
              setConfig(prev => ({ ...prev, subscriptionEnabled: true, subscriptionEndDate: newDateISO }));
            } catch (err) { 
              console.error("Gagal klaim reward:", err); 
              processingRewards.current.delete(docId); 
            }
          }
        }
      });
    });
    
    return () => unsubscribeRewards();
  }, [config.myReferralCode, config.subscriptionEndDate]);

  useEffect(() => { setImageError(false); }, [config.logoUrl]);

  useEffect(() => { 
    if (isAccessBlocked && view !== 'config' && view !== 'pass_challenge') { 
      setView('access_blocked'); 
    } 
  }, [isAccessBlocked, view]);

  // Watch employee status
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
          setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config', 'gamification'].includes(prev)) ? prev : 'dashboard'); 
        } else if (data.status === 'COMPLETED' && lastActivityDateStr === todayStr) { 
          setAttendanceData(data); 
          setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config', 'gamification'].includes(prev)) ? prev : 'shift_locked'); 
        } else { 
          setAttendanceData(null); 
          setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config', 'gamification'].includes(prev)) ? prev : 'checkin'); 
        }
      } else { 
        setAttendanceData(null); 
        setView(prev => (['change_pin', 'recap', 'access_blocked', 'pass_challenge', 'config', 'gamification'].includes(prev)) ? prev : 'checkin'); 
      }
    }, (error) => { console.error("Snapshot error:", error); });
    
    return () => unsub();
  }, [user, selectedEmployee]);

  if (loading) return ( 
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
    </div> 
  );
  
  if (view === 'access_blocked') {
    return (
      <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl relative font-sans text-slate-800 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2.5rem] flex items-center justify-center shadow-xl mb-6">
          <CalendarClock className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">
          {config.trialEnabled && isTrialExpired ? 'Masa Trial Habis' : 'Langganan Habis'}
        </h2>
        <p className="text-sm font-bold text-slate-400 mb-8 max-w-[200px]">
          Aplikasi tidak dapat digunakan. Silakan hubungi administrator.
        </p>
        <button 
          onClick={requestConfigAccess} 
          className="absolute top-6 right-6 p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 hover:text-emerald-500 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl relative font-sans text-slate-800 flex flex-col overflow-hidden leading-none">
      {view !== 'login' && view !== 'pass_challenge' && (
        <div 
          className="p-5 text-white flex justify-between items-center shadow-xl z-30 border-b border-white/20" 
          style={{ background: `linear-gradient(to right, ${themeColor}, ${adjustColor(themeColor, -40)})` }}
        >
          <div className="flex items-center gap-4 text-left">
            <div className="bg-white/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/30 shadow-inner">
              <LogoComponent logoUrl={config.logoUrl} themeColor={themeColor} size="normal" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none">ACTIONS</h1>
              <span className="text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full mt-1 uppercase w-fit">
                {selectedEmployee?.name || 'Enterprise'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setSelectedEmployee(null); setView('login'); }} 
              className="p-3 bg-white/10 rounded-2xl hover:bg-white/30 transition-all active:scale-95 shadow-sm"
            >
              <Users className="w-4 h-4" />
            </button>
            <button 
              onClick={requestConfigAccess} 
              className="p-3 bg-white/10 rounded-2xl hover:bg-white/30 transition-all active:scale-95 shadow-sm"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {msg && (
        <div className="fixed bottom-28 left-4 right-4 z-[100] animate-in slide-in-from-bottom-6">
          <div 
            className={`p-4 rounded-[2.5rem] shadow-2xl border-2 flex items-center gap-4 ${msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-900 shadow-red-200/50' : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'}`} 
            style={msg.type !== 'error' ? { borderColor: hexToRgba(themeColor, 0.3) } : {}}
          >
            <div 
              className={`p-2 rounded-2xl ${msg.type === 'error' ? 'bg-red-500 shadow-red-300 shadow-lg' : 'shadow-lg'}`} 
              style={msg.type !== 'error' ? { backgroundColor: themeColor } : {}}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span 
              className="text-xs font-black tracking-tight" 
              style={msg.type !== 'error' ? { color: themeColor } : {}}
            >
              {msg.text}
            </span>
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
          .custom-scrollbar::-webkit-scrollbar { height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        `}</style>
        
        {view === 'login' && (
          <div className="min-h-screen flex flex-col items-center justify-between p-8 pb-12 animate-in fade-in bg-white">
            <div className="w-full flex justify-between items-center pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" style={{ color: themeColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: adjustColor(themeColor, -20) }}>
                  Enterprise Secure
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getActiveModeLabel && (
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black shadow-sm ${getActiveModeLabel.badgeClass}`}>
                    {getActiveModeLabel.label}
                  </span>
                )}
                <button 
                  onClick={requestConfigAccess} 
                  className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 transition-colors theme-text-hover"
                >
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
                <p className="text-[10px] font-black tracking-widest" style={{ color: themeColor }}>
                  Attendance and Todo-list Information System
                </p>
              </div>
            </div>
            
            {!isPinMode ? (
              <div className="w-full space-y-6">
                <div className="relative group text-left">
                  <User className="absolute left-6 top-6 text-slate-300 z-10 w-5 h-5" />
                  <select 
                    value={loginSelection} 
                    onChange={(e) => setLoginSelection(e.target.value)} 
                    className="w-full p-6 pl-16 pr-12 border-2 border-slate-100 rounded-[2.2rem] outline-none shadow-sm font-bold appearance-none bg-white text-slate-700 cursor-pointer transition-all leading-none focus:border-opacity-50 theme-focus"
                  >
                    <option value="" disabled>Pilih Nama Anda</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-6 pointer-events-none text-slate-300">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
                <button 
                  onClick={() => loginSelection && setIsPinMode(true)} 
                  disabled={!loginSelection} 
                  className="w-full flex items-center justify-center gap-3 text-white py-6 rounded-[2.2rem] font-black text-sm shadow-xl active:scale-95 transition-all uppercase tracking-widest leading-none" 
                  style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${hexToRgba(themeColor, 0.5)}` }}
                >
                  Masuk Aplikasi <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full max-w-xs space-y-6 animate-in slide-in-from-right-10">
                <div className="space-y-2 text-center">
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Verifikasi PIN</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {lockoutTime > 0 ? `Tunggu ${lockoutTime}s` : 'Masukkan 6 digit PIN'}
                  </p>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-6 top-6 text-slate-300 w-5 h-5" />
                  <input 
                    type="password" 
                    placeholder="******" 
                    maxLength={6} 
                    className="w-full p-6 pl-16 border-2 border-slate-100 rounded-[2.2rem] outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-white transition-all shadow-inner leading-none theme-focus" 
                    value={pinInput} 
                    onChange={(e) => setPinInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleVerifyPin()} 
                    disabled={lockoutTime > 0} 
                    autoFocus 
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsPinMode(false)} 
                    className="flex-1 py-5 rounded-3xl bg-white border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase hover:bg-slate-50 transition-colors leading-none"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleVerifyPin} 
                    disabled={lockoutTime > 0 || actionLoading} 
                    className="flex-[2] py-5 rounded-3xl text-white font-black text-[10px] uppercase shadow-xl flex justify-center items-center gap-2 active:scale-95 transition-all leading-none" 
                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px -10px ${hexToRgba(themeColor, 0.5)}` }}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Verifikasi"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'pass_challenge' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-in zoom-in-95 bg-white">
            <div className="w-full max-w-xs space-y-8 text-center">
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border" 
                  style={{ backgroundColor: hexToRgba(themeColor, 0.1), color: themeColor, borderColor: hexToRgba(themeColor, 0.2) }}
                >
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Verifikasi Admin</h3>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type={showPass ? "text" : "password"} 
                    placeholder="Sandi Admin..." 
                    className="w-full p-6 border-2 border-slate-100 rounded-[2rem] outline-none text-center font-bold tracking-[0.2em] bg-white shadow-sm leading-none theme-focus" 
                    value={passInput} 
                    onChange={(e) => setPassInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && verifyAdminPassword()} 
                    autoFocus 
                  />
                  <button 
                    onClick={() => setShowPass(!showPass)} 
                    className="absolute right-6 top-6 text-slate-300 transition-colors theme-text-hover"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setView(viewBeforePass || 'login')} 
                    className="flex-1 py-5 rounded-3xl bg-white border-2 border-slate-50 text-slate-400 font-black text-[10px] uppercase leading-none"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={verifyAdminPassword} 
                    disabled={actionLoading} 
                    className="flex-[2] py-5 rounded-3xl bg-slate-900 text-white font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all leading-none"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Buka Akses"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {view === 'dashboard' && attendanceData && (
          <div className="px-6 py-8 space-y-8 animate-in fade-in pb-20 text-left">
            <div 
              className="rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden" 
              style={{ background: `linear-gradient(to bottom right, ${themeColor}, ${adjustColor(themeColor, -40)})` }}
            >
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 space-y-8 text-left">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest leading-none">
                      Status: SEDANG KERJA
                    </p>
                    <h2 className="text-4xl font-black tracking-tighter leading-none">
                      {selectedEmployee?.name.split(' ')[0]}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button 
                      onClick={() => setView('change_pin')} 
                      className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 hover:bg-white/30 transition-all shadow-sm"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase">Keamanan</span>
                    </button>
                    {gamificationConfig.enabled && (
                      <button 
                        onClick={() => setView('gamification')} 
                        className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-md px-3 py-2 rounded-xl border border-yellow-300/20 hover:bg-yellow-500/30 transition-all shadow-sm"
                      >
                        <Trophy className="w-4 h-4 text-yellow-300" />
                        <span className="text-[8px] font-black uppercase text-yellow-300">Poin</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center shadow-lg">
                    <p className="text-[9px] uppercase font-black opacity-60 mb-2 leading-none">Mulai</p>
                    <p className="text-xl font-black leading-none">
                      {new Date(attendanceData.checkInTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <div className="flex-1 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center flex flex-col items-center justify-center gap-1 shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-white shadow-[0_0_8px]"></span>
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none">Live Sync</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Target Section in Dashboard */}
            {selectedEmployee && userTargets[selectedEmployee.id] && userTargets[selectedEmployee.id].length > 0 && (
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-2 text-xs uppercase px-2 text-left">
                  <BarChart3 className="w-4 h-4" style={{ color: themeColor }} /> Target Kinerja
                </h3>
                <div className="space-y-3">
                  {userTargets[selectedEmployee.id].map((target, idx) => {
                    const progress = calculateTargetProgress(target.targetValue, target.currentValue);
                    const status = getTargetStatus(target);
                    const isExpired = status === 'expired';
                    
                    return (
                      <div key={target.id || idx} className={`p-4 rounded-xl ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-100'} shadow-sm`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-bold text-slate-800">{target.title}</h4>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${isExpired ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {getTargetTypeLabel(target.type)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">{target.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>Progress</span>
                            <span>{progress}% ({target.currentValue}/{target.targetValue})</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${isExpired ? 'bg-red-500' : progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          {target.deadline && target.type === TARGET_TYPES.CUSTOM_DATE && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Tenggat: {new Date(target.deadline).toLocaleDateString('id-ID')}
                              {isExpired && <span className="text-red-500 font-bold ml-2">(Kadaluarsa)</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {(() => {
              const total = attendanceData.tasks.length;
              const done = attendanceData.tasks.filter(t => t.done).length;
              const score = total > 0 ? Math.round((done / total) * 100) : 0;
              const ins = getInsight(score);
              return (
                <div className={`${ins.bg} p-6 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-left-6 duration-700`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${ins.barColor} text-white shadow-md`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className={`text-sm font-black ${ins.color} leading-none mb-1`}>{ins.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ins.text}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${ins.color}`}>{score}%</p>
                    </div>
                  </div>
                  <VisualProgress percent={score} colorClass={ins.barColor} />
                  <div className="flex justify-between mt-3 text-[9px] font-black uppercase tracking-widest text-slate-300">
                    <span>Tuntas: {done}</span>
                    <span>Target: {total}</span>
                  </div>
                </div>
              );
            })()}
            
            <div className="space-y-5">
              <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-2 text-xs uppercase px-2 text-left">
                <ListTodo className="w-4 h-4" style={{ color: themeColor }} /> Agenda Kerja
              </h3>
              <div className="bg-white p-1 rounded-3xl shadow-lg border-2 border-slate-100 flex items-center pr-3 leading-none focus-within:border-opacity-50 transition-colors theme-focus-within">
                <input 
                  type="text" 
                  className="flex-1 p-4 px-6 rounded-2xl text-xs font-bold text-slate-700 outline-none bg-transparent h-12 leading-none" 
                  placeholder="Tambah tugas..." 
                  value={taskInput} 
                  onChange={(e) => setTaskInput(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && addTaskToActiveSession()} 
                />
                <button 
                  onClick={addTaskToActiveSession} 
                  className="p-3 rounded-xl text-white shadow-lg active:scale-90 transition-all hover:opacity-90" 
                  style={{ backgroundColor: themeColor }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden divide-y divide-slate-50 p-2">
                {attendanceData.tasks.map((task, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleUpdateTask(idx)} 
                    className="p-5 flex items-start gap-4 hover:bg-slate-50 rounded-[2rem] cursor-pointer transition-all group"
                  >
                    <div 
                      className={`mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center ${task.done ? 'shadow-lg' : 'bg-white group-hover:border-slate-200'}`} 
                      style={task.done ? { 
                        backgroundColor: themeColor, 
                        borderColor: themeColor, 
                        boxShadow: `0 0 10px ${hexToRgba(themeColor, 0.4)}` 
                      } : { borderColor: '#f1f5f9' }}
                    >
                      {task.done && <Check className="w-4 h-4 text-white"/>}
                    </div>
                    <span className={`text-sm font-bold flex-1 py-1 text-left ${task.done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setView('checkout')} 
              className="w-full bg-red-600 text-white py-6 rounded-[2.2rem] font-black text-xs shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 transition-all hover:bg-red-700 shadow-red-100 leading-none"
            >
              <LogOut className="w-5 h-5"/> Kirim Laporan & Selesai
            </button>
          </div>
        )}

        {view === 'gamification' && (
          <div className="min-h-screen">
            <div className="p-5 text-white flex justify-between items-center shadow-xl z-30 border-b border-white/20" 
                 style={{ background: `linear-gradient(to right, ${themeColor}, ${adjustColor(themeColor, -40)})` }}>
              <div className="flex items-center gap-4 text-left">
                <button 
                  onClick={() => setView('dashboard')} 
                  className="p-3 bg-white/10 rounded-2xl hover:bg-white/30 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h1 className="font-black text-xl tracking-tighter uppercase leading-none">GAMIFICATION</h1>
                  <span className="text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full mt-1 uppercase w-fit">
                    Poin & Leaderboard
                  </span>
                </div>
              </div>
            </div>
            <GamificationDashboard 
              selectedEmployee={selectedEmployee}
              userPoints={userPoints}
              leaderboard={leaderboard}
              employees={employees}
              themeColor={themeColor}
              fetchLeaderboard={fetchLeaderboard}
            />
          </div>
        )}

        {view === 'checkin' && (
          <div className="px-6 py-10 space-y-8 animate-in slide-in-from-bottom-10 bg-white min-h-[calc(100vh-100px)] leading-none">
            <div className="text-center space-y-3 leading-none">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Mulai Bekerja</h2>
              <div className="flex items-center justify-center gap-2 leading-none">
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] leading-none">
                  {selectedEmployee?.name}
                </p>
                <button 
                  onClick={() => setView('change_pin')} 
                  className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:text-emerald-600 transition-colors leading-none theme-text-hover"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 flex items-center pr-4 leading-none focus-within:border-opacity-50 transition-colors theme-focus-within">
              <input 
                type="text" 
                className="flex-1 p-6 rounded-[2rem] text-sm font-bold text-slate-700 outline-none h-14" 
                placeholder="Target hari ini?..." 
                value={taskInput} 
                onChange={(e) => setTaskInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && addTempTask()} 
              />
              <button 
                onClick={addTempTask} 
                className="p-4 rounded-2xl text-white shadow-lg active:scale-90 transition-all leading-none" 
                style={{ backgroundColor: themeColor }}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden min-h-[160px] flex flex-col divide-y divide-slate-50 leading-none">
              {tempTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-300 opacity-60 text-[10px] font-black uppercase tracking-widest italic leading-none">
                  Agenda Kosong
                </div>
              ) : (
                tempTasks.map((task, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-all text-left leading-none">
                    <span className="text-sm font-bold text-slate-700 leading-tight">{task.text}</span>
                    <button 
                      onClick={() => removeTempTask(idx)} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="space-y-3 leading-none">
              <button 
                onClick={handleCheckIn} 
                disabled={actionLoading} 
                className="w-full text-white py-6 rounded-[2.2rem] font-black text-xs shadow-2xl flex items-center justify-center gap-3 tracking-widest uppercase active:scale-95 transition-all leading-none" 
                style={{ backgroundColor: themeColor }}
              >
                {actionLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} Konfirmasi Absen
              </button>
              <div className="grid grid-cols-2 gap-3 leading-none">
                <button 
                  onClick={() => fetchRecapData()} 
                  className="bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-[10px] flex items-center justify-center gap-3 uppercase active:scale-95 transition-all leading-none"
                >
                  <History className="w-5 h-5" /> Histori
                </button>
                <button 
                  onClick={() => setView('change_pin')} 
                  className="bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-[10px] flex items-center justify-center gap-3 uppercase active:scale-95 transition-all leading-none"
                >
                  <Fingerprint className="w-5 h-5" /> PIN
                </button>
              </div>
            </div>
          </div>
        )}
        
        {view === 'checkout' && (
          <div className="px-6 py-8 space-y-8 animate-in slide-in-from-bottom-10 bg-white min-h-[calc(100vh-100px)] text-left leading-none">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center space-y-4 leading-none">
              <div className="w-20 h-20 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl transform rotate-12 border-4 border-white leading-none">
                <Clipboard className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-none">Review Tugas</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">
                Selesaikan shift hari ini
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-50 space-y-3 leading-none focus-within:border-opacity-50 transition-colors theme-focus-within">
              <label className="text-[10px] font-black text-slate-400 uppercase px-2 block leading-none">
                Catatan Opsional
              </label>
              <textarea 
                className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-700 min-h-[120px] resize-none leading-relaxed" 
                placeholder="Laporan tambahan..." 
                value={checkoutNote} 
                onChange={(e) => setCheckoutNote(e.target.value)} 
              />
            </div>
            
            <div className="flex gap-4 leading-none">
              <button 
                onClick={() => setView('dashboard')} 
                className="flex-1 bg-white border-2 border-slate-100 text-slate-400 py-6 rounded-3xl font-black text-xs uppercase leading-none"
              >
                Batal
              </button>
              <button 
                onClick={handleCheckOut} 
                disabled={actionLoading} 
                className="flex-[2] bg-red-600 text-white py-6 rounded-3xl font-black text-xs shadow-2xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest leading-none"
              >
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
              <button 
                onClick={() => fetchRecapData()} 
                className="w-full text-white py-6 rounded-[2.2rem] font-black text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3 leading-none" 
                style={{ backgroundColor: themeColor }}
              >
                <History className="w-5 h-5" /> Histori Performa
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setView('change_pin')} 
                  className="flex-1 bg-slate-100 text-slate-500 py-6 rounded-[2.2rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 leading-none"
                >
                  <Fingerprint className="w-4 h-4" /> Ganti PIN
                </button>
                <button 
                  onClick={() => { setSelectedEmployee(null); setView('login'); }} 
                  className="flex-1 bg-white border-2 border-slate-100 text-slate-400 py-6 rounded-[2.2rem] font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest leading-none"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'recap' && (
          <div className="p-6 space-y-8 animate-in slide-in-from-right-10 pb-24 text-left leading-none">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => { 
                  if (attendanceData) { 
                    setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard'); 
                  } else { 
                    setView('checkin'); 
                  } 
                }} 
                className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm text-slate-600 leading-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => fetchRecapData(true)} 
                disabled={recapLoading} 
                className="flex items-center gap-2 bg-emerald-50 px-5 py-3 rounded-2xl font-black text-[10px] uppercase border active:scale-95 transition-all" 
                style={{ color: themeColor, backgroundColor: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2) }}
              >
                {recapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sinkron Ulang
              </button>
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Histori Performa</h2>
            
            {recapLoading && recapData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: themeColor }} />
                <p className="text-[10px] font-black uppercase italic tracking-[0.2em] leading-none">
                  Menghubungkan Spreadsheet...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {isLocalDataMissingFromSheet && attendanceData && (
                  <div className="bg-orange-50 p-6 rounded-[2.2rem] border-2 border-orange-100 flex items-center gap-4">
                    <CloudOff className="w-8 h-8 text-orange-400" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-orange-900 leading-none">DATA LOKAL AKTIF</p>
                      <p className="text-[9px] font-bold text-orange-600 leading-tight">
                        Data hari ini ditampilkan dari penyimpanan lokal sementara menunggu sinkronisasi Sheet selesai.
                      </p>
                    </div>
                  </div>
                )}
                
                {stats && (
                  <div className={`${getInsight(stats.completionRate).bg} p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in zoom-in-95`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 text-left">
                        <p className="text-[9px] font-black uppercase opacity-60 text-white leading-none">
                          Efisiensi Rata-rata
                        </p>
                        <h4 className="text-3xl font-black text-white leading-tight">
                          {getInsight(stats.completionRate).title}
                        </h4>
                      </div>
                      <CircularProgress 
                        percent={stats.completionRate} 
                        color="white" 
                        bgStroke={getInsight(stats.completionRate).bgCircle} 
                      />
                    </div>
                    
                    {stats.trendData && stats.trendData.length > 0 && (
                      <div className="h-24 flex items-end justify-between gap-2 border-b border-white/20 pb-2">
                        {stats.trendData.map((d, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                            <div 
                              className="w-full bg-white/30 rounded-t-sm relative transition-all duration-500 group-hover:bg-white/50" 
                              style={{ height: `${d.rate}%` }}
                            >
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {d.rate}%
                              </div>
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
                      <p className="text-[10px] font-black text-white uppercase tracking-tight leading-relaxed">
                        {getInsight(stats.completionRate).text}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase px-2 tracking-widest leading-none">
                    Log Aktivitas Terakhir
                  </h3>
                  <div className="space-y-3">
                    {displayedHistory.slice(0, 15).map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-[2.2rem] shadow-xl border flex items-center justify-between group cursor-default leading-none ${item.status === 'PENDING' ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}
                      >
                        <div className="flex items-center gap-4 text-left leading-none">
                          <div 
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${item.type === 'CHECK_IN' ? 'text-white' : 'bg-red-500 text-white'}`} 
                            style={item.type === 'CHECK_IN' ? { backgroundColor: themeColor } : {}}
                          >
                            {item.type === 'CHECK_IN' ? <ArrowRight className="w-5 h-5 rotate-45" /> : <LogOut className="w-5 h-5" />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-slate-900 leading-none">
                              {new Date(item.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                {item.type.replace('_', ' ')} • {new Date(item.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                              </p>
                              {item.status === 'PENDING' && (
                                <span className="text-[8px] font-black bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-md">
                                  SYNCING
                                </span>
                              )}
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
              <button 
                onClick={() => { 
                  if (attendanceData) { 
                    setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard'); 
                  } else { 
                    setView('checkin'); 
                  } 
                }} 
                className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm text-slate-600 transition-all active:scale-95 hover:bg-slate-50 leading-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Keamanan PIN</h2>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6">
              <div className="text-center space-y-2 mb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border-2 shadow-inner" 
                  style={{ backgroundColor: hexToRgba(themeColor, 0.1), color: themeColor, borderColor: hexToRgba(themeColor, 0.2) }}
                >
                  <ShieldEllipsis className="w-8 h-8" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                  Perbarui Akses Anda
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none ml-1">
                    PIN Saat Ini
                  </label>
                  <input 
                    type="password" 
                    placeholder="******" 
                    maxLength={6} 
                    className="w-full p-5 border-2 border-slate-50 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-slate-50 transition-all leading-none theme-focus" 
                    value={oldPinChange} 
                    onChange={(e) => setOldPinChange(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none ml-1">
                    PIN Baru (6 Digit)
                  </label>
                  <input 
                    type="password" 
                    placeholder="******" 
                    maxLength={6} 
                    className="w-full p-5 border-2 border-slate-50 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-slate-50 transition-all leading-none theme-focus" 
                    value={newPinChange} 
                    onChange={(e) => setNewPinChange(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none ml-1">
                    Konfirmasi PIN Baru
                  </label>
                  <input 
                    type="password" 
                    placeholder="******" 
                    maxLength={6} 
                    className="w-full p-5 border-2 border-slate-50 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-slate-700 bg-slate-50 transition-all leading-none theme-focus" 
                    value={confirmPinChange} 
                    onChange={(e) => setConfirmPinChange(e.target.value)} 
                  />
                </div>
              </div>
              
              <button 
                onClick={handleUpdatePin} 
                disabled={actionLoading} 
                className="w-full text-white py-6 rounded-3xl font-black text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest hover:opacity-90 transition-all leading-none" 
                style={{ backgroundColor: themeColor }}
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan PIN Baru
              </button>
            </div>
          </div>
        )}

        {view === 'config' && (
          <div className="animate-in slide-in-from-right-10 px-6 py-8 space-y-8 pb-24 text-center">
            <div className="flex items-center gap-4 leading-none">
              <button 
                onClick={handleBackFromConfig} 
                className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-600 leading-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-left">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Admin Console</h2>
                {getActiveModeLabel && (
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${getActiveModeLabel.textClass}`}>
                    <CountdownDisplay targetDate={getActiveModeLabel.targetDate} label={getActiveModeLabel.label} />
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex bg-slate-200 p-1 rounded-2xl gap-1 overflow-x-auto leading-none custom-scrollbar">
              <button 
                onClick={() => setConfigTab('settings')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'settings' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'settings' ? { color: themeColor } : {}}
              >
                Koneksi
              </button>
              <button 
                onClick={() => setConfigTab('reports')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'reports' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'reports' ? { color: themeColor } : {}}
              >
                Tim
              </button>
              <button 
                onClick={() => setConfigTab('users')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'users' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'users' ? { color: themeColor } : {}}
              >
                User
              </button>
              <button 
                onClick={() => setConfigTab('targets')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'targets' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'targets' ? { color: themeColor } : {}}
              >
                Target
              </button>
              <button 
                onClick={() => setConfigTab('license')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'license' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'license' ? { color: themeColor } : {}}
              >
                Lisensi
              </button>
              <button 
                onClick={() => setConfigTab('affiliates')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'affiliates' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'affiliates' ? { color: themeColor } : {}}
              >
                Mitra
              </button>
              <button 
                onClick={() => setConfigTab('gamification')} 
                className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${configTab === 'gamification' ? 'bg-white shadow-sm' : 'text-slate-500'}`} 
                style={configTab === 'gamification' ? { color: themeColor } : {}}
              >
                Gamifikasi
              </button>
            </div>
            
            <div className="space-y-6">
              {configTab === 'settings' && (
                <div className="space-y-6 animate-in fade-in leading-none">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2.5rem] p-6 text-white shadow-lg relative overflow-hidden text-left animate-in slide-in-from-top-4">
                    <div className="absolute top-0 right-0 opacity-10"><Gift size={120} /></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift size={20} className="text-yellow-300" />
                        <h3 className="font-bold text-base">Kode Referral Mitra</h3>
                      </div>
                      <p className="text-purple-100 text-[10px] mb-4 leading-relaxed max-w-[80%]">
                        Bagikan kode unik ini. Dapatkan **Bonus Perpanjangan** jika ada klien/lembaga lain yang berlangganan menggunakan kode Anda.
                      </p>
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between border border-white/30 transition-all hover:bg-white/25">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-purple-200 uppercase tracking-wider mb-1">Kode Akun Anda</span>
                          <span className="text-2xl font-mono font-bold tracking-widest text-white shadow-sm">
                            {config.myReferralCode || <Loader2 className="w-6 h-6 animate-spin"/>}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(config.myReferralCode); 
                            setMsg({type: 'success', text: 'Kode Referral disalin!'}); 
                            setTimeout(() => setMsg(null), 2000);
                          }} 
                          className="p-3 bg-white/10 hover:bg-white rounded-xl transition-all active:scale-95 group" 
                          title="Salin Kode"
                        >
                          <Copy size={20} className="text-white group-hover:text-purple-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4 text-left leading-none">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">
                      Logo URL (Gambar)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 p-5 border-2 border-slate-50 rounded-2xl text-[11px] font-mono bg-slate-50 outline-none theme-focus" 
                        value={config.logoUrl} 
                        onChange={(e) => setConfig({...config, logoUrl: e.target.value})} 
                        placeholder="/logo.png" 
                      />
                      <button 
                        onClick={handleSaveConfig} 
                        disabled={actionLoading} 
                        className="text-white p-5 rounded-2xl shadow-lg active:scale-95 transition-all" 
                        style={{ backgroundColor: themeColor }}
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>
                  
                  {!scriptUnlocked ? (
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 text-center space-y-4">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase">Koneksi Database</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Masukkan Kode Admin untuk Edit URL
                        </p>
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
                      <button 
                        onClick={handleUnlockScript} 
                        className="w-full text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all" 
                        style={{ backgroundColor: themeColor }}
                      >
                        Buka Pengaturan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4 text-left leading-none">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">
                            Google Script URL (Web App)
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 p-5 border-2 border-slate-50 rounded-2xl text-[11px] font-mono bg-slate-50 outline-none theme-focus" 
                              value={config.scriptUrl} 
                              onChange={(e) => setConfig({...config, scriptUrl: e.target.value})} 
                              placeholder="https://script.google.com/..." 
                            />
                            <button 
                              onClick={handleSaveConfig} 
                              disabled={actionLoading} 
                              className="text-white p-5 rounded-2xl shadow-lg active:scale-95 transition-all" 
                              style={{ backgroundColor: themeColor }}
                            >
                              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-50">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">
                            Referred By (Kode Upline) - <span className="text-emerald-500">Tim Teknis Only</span>
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 p-5 border-2 border-slate-50 rounded-2xl text-[11px] font-mono bg-slate-50 outline-none theme-focus uppercase" 
                              value={config.referredBy} 
                              onChange={(e) => setConfig({...config, referredBy: e.target.value.toUpperCase()})} 
                              placeholder="ACT-XXXXX" 
                            />
                            {config.referredBy && (
                              <div className="flex items-center text-emerald-600 px-3">
                                <CheckCircle size={20} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {configTab === 'reports' && (
                <div className="space-y-6 animate-in fade-in leading-none">
                  {selectedReportUser ? (
                    <div className="space-y-6 animate-in slide-in-from-right-10 text-left">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setSelectedReportUser(null)} 
                          className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{selectedReportUser.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Detail Laporan ({filterRange === 'today' ? 'Hari Ini' : filterRange === 'week' ? '7 Hari Terakhir' : 'Periode Ini'})
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between">
                        <div className="text-center flex-1 border-r border-slate-50">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kehadiran</p>
                          <p className="text-2xl font-black text-slate-800">
                            {selectedReportUser.presenceCount} <span className="text-[10px] text-slate-400 font-bold">Hari</span>
                          </p>
                        </div>
                        <div className="text-center flex-1 border-r border-slate-50">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tugas</p>
                          <p className="text-2xl font-black text-slate-800">{selectedReportUser.totalTasks}</p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Efisiensi</p>
                          <p className={`text-2xl font-black ${selectedReportUser.score >= 80 ? 'text-emerald-500' : 'text-blue-500'}`}>
                            {selectedReportUser.score}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Riwayat Aktivitas</h4>
                        {selectedUserHistory.length === 0 ? (
                          <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 text-xs font-bold uppercase">
                            Tidak ada data di periode ini
                          </div>
                        ) : (
                          selectedUserHistory.map((log, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[2rem] shadow-md border border-slate-100 relative overflow-hidden">
                              <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg text-white ${log.type === 'CHECK_IN' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                    {log.type === 'CHECK_IN' ? <ArrowRight className="w-3 h-3 rotate-45"/> : <LogOut className="w-3 h-3"/>}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase">
                                      {log.type.replace('_', ' ')}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400">
                                      {new Date(log.timestamp).toLocaleDateString('id-ID', {weekday: 'long', day:'numeric', month:'long'})} • {new Date(log.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${log.status === 'Hadir' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {log.status}
                                </div>
                              </div>
                              
                              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                                {(() => {
                                  let taskList = [];
                                  try {
                                    if (log.tasks && log.tasks.startsWith('[')) {
                                      const parsed = JSON.parse(log.tasks);
                                      taskList = parsed.map(t => ({ text: t.text, done: t.done }));
                                    } else {
                                      taskList = log.tasks.split('\n').filter(t => t.trim()).map(t => ({ 
                                        text: t.replace('[x] ', '').replace('[ ] ', ''), 
                                        done: t.includes('[x]') 
                                      }));
                                    }
                                  } catch(e) { 
                                    taskList = [{text: log.tasks, done: false}]; 
                                  }

                                  if(taskList.length === 0) return <p className="text-[10px] italic text-slate-400">Tidak ada tugas dicatat.</p>;

                                  return taskList.map((t, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <div className={`mt-0.5 w-3 h-3 rounded-full flex items-center justify-center border ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                        {t.done && <Check className="w-2 h-2 text-white" />}
                                      </div>
                                      <span className={`text-[10px] font-bold leading-tight ${t.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {t.text}
                                      </span>
                                    </div>
                                  ));
                                })()}
                              </div>
                              
                              {log.note && log.note !== '-' && (
                                <div className="mt-3 text-[10px] text-slate-500 italic bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                                  <span className="font-bold not-italic text-yellow-700 mr-1">Catatan:</span> "{log.note}"
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {['today', 'yesterday', 'week', 'month', 'all'].map((rid) => (
                          <button 
                            key={rid} 
                            onClick={() => setFilterRange(rid)} 
                            className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase transition-all border-2 whitespace-nowrap leading-none ${filterRange === rid ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                          >
                            {rid === 'today' ? 'Hari Ini' : 
                             rid === 'yesterday' ? 'Kemarin' : 
                             rid === 'week' ? '7 Hari' : 
                             rid === 'month' ? 'Bulan Ini' : 
                             'Semua'}
                          </button>
                        ))}
                      </div>
                      
                      {hasFetchedTeam && allRecapData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50 space-y-2">
                          <FileX className="w-8 h-8 text-slate-400" />
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Data Kosong</p>
                          <button 
                            onClick={fetchAllRecap} 
                            disabled={allRecapLoading} 
                            className="text-[9px] text-emerald-500 font-bold underline"
                          >
                            Coba Lagi
                          </button>
                        </div>
                      ) : !teamReport.summary ? (
                        <button 
                          onClick={fetchAllRecap} 
                          disabled={allRecapLoading} 
                          className="w-full text-white px-8 py-8 rounded-[2.5rem] font-black text-xs uppercase shadow-lg flex items-center justify-center gap-3" 
                          style={{ backgroundColor: themeColor }}
                        >
                          {allRecapLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />} Ambil Data Tim
                        </button>
                      ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-6">
                          <div className={`${teamReport.summary.insight.bg} p-8 rounded-[2.5rem] shadow-2xl border border-white/20 text-left space-y-8`}>
                            <div className="flex justify-between items-center">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase opacity-60 text-white tracking-widest leading-none">
                                  Status Kolektif
                                </p>
                                <h4 className="text-2xl font-black text-white leading-none">
                                  {teamReport.summary.employeeCount} Karyawan
                                </h4>
                              </div>
                              <button 
                                onClick={fetchAllRecap} 
                                disabled={allRecapLoading} 
                                className="bg-white/20 p-4 rounded-2xl active:scale-90 transition-all border border-white/20 shadow-inner"
                              >
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
                          
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left ml-2">
                              Klik nama untuk detail
                            </p>
                            {teamReport.users.map((report, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedReportUser(report)} 
                                className="bg-white p-5 rounded-[2.2rem] shadow-lg border border-slate-100 flex items-center justify-between hover:border-emerald-200 hover:bg-slate-50 transition-all group cursor-pointer active:scale-95"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border-2 ${report.rank === 1 ? 'bg-yellow-400 text-white border-yellow-500 shadow-yellow-100 shadow-xl' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {report.rank === 1 ? <Trophy className="w-5 h-5" /> : report.rank}
                                  </div>
                                  <div className="space-y-1 text-left">
                                    <p className="text-xs font-black text-slate-900 leading-none group-hover:text-emerald-600 transition-colors">
                                      {report.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                      Hadir: {report.presenceCount} Hari
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-base font-black leading-none ${report.score >= 80 ? 'text-emerald-600' : report.score >= 50 ? 'text-blue-600' : 'text-slate-400'}`}>
                                      {report.score}%
                                    </p>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500"/>
                                  </div>
                                  <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${report.score >= 80 ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                                      style={{ width: `${report.score}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {configTab === 'users' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 space-y-4 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center" 
                        style={{ backgroundColor: hexToRgba(themeColor, 0.1), color: themeColor }}
                      >
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tambah Pegawai</h3>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Nama Lengkap" 
                      className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 transition-all theme-focus" 
                      value={newEmpName} 
                      onChange={(e) => setNewEmpName(e.target.value)} 
                    />
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="ID (Opsional)" 
                        className="flex-1 p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 transition-all uppercase theme-focus" 
                        value={newEmpId} 
                        onChange={(e) => setNewEmpId(e.target.value)} 
                      />
                      <button 
                        onClick={handleAddEmployee} 
                        disabled={actionLoading} 
                        className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-3xl border-2 border-dashed border-slate-200 flex justify-between items-center gap-3">
                    <button 
                      onClick={handleSyncUpload} 
                      disabled={syncLoading} 
                      className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 shadow-sm hover:border-emerald-200 hover:text-emerald-600 transition-all flex justify-center items-center gap-2"
                    >
                      {syncLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpFromLine className="w-3 h-3" />} Backup ke Sheet
                    </button>
                    <button 
                      onClick={handleSyncDownload} 
                      disabled={syncLoading} 
                      className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 shadow-sm hover:border-blue-200 hover:text-blue-600 transition-all flex justify-center items-center gap-2"
                    >
                      {syncLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDownToLine className="w-3 h-3" />} Restore dari Sheet
                    </button>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-[0.2em] ml-2">
                      Daftar Pegawai ({employees.length})
                    </h3>
                    {employees.map((emp) => (
                      <div key={emp.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group">
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center transition-all shadow-inner border border-slate-100 leading-none group-hover:text-white theme-bg-hover">
                            <User className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-900 leading-none">{emp.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                              ID: {emp.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {confirmDeleteId === emp.id ? (
                            <>
                              <button 
                                onClick={() => setConfirmDeleteId(null)} 
                                className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-90 border border-slate-200 text-[10px] font-black uppercase"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={() => handleDeleteEmployee(emp.id, emp.name)} 
                                className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-90 shadow-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => { 
                                  if(window.confirm(`Reset PIN ${emp.name}?`)) 
                                    handleResetUserPin(emp.id, emp.name) 
                                }} 
                                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all active:scale-90 border border-slate-100"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(emp.id)} 
                                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-slate-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {configTab === 'targets' && (
                <TargetSettings 
                  employees={employees}
                  userTargets={userTargets}
                  setUserTargets={setUserTargets}
                  handleSaveTargets={handleSaveTargets}
                  actionLoading={actionLoading}
                  themeColor={themeColor}
                />
              )}

              {configTab === 'license' && (
                <div className="space-y-6 animate-in fade-in leading-none">
                  {!trialTabUnlocked ? (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900">Akses Terbatas</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Masukkan kode rahasia untuk mengatur lisensi.
                      </p>
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="" 
                          className="w-full p-5 border-2 border-slate-100 rounded-2xl outline-none text-center font-black tracking-[0.2em] theme-focus" 
                          value={trialPassInput} 
                          onChange={(e) => setTrialPassInput(e.target.value)} 
                          onKeyPress={(e) => e.key === 'Enter' && handleUnlockTrialTab()} 
                        />
                      </div>
                      <button 
                        onClick={handleUnlockTrialTab} 
                        className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all" 
                        style={{ backgroundColor: themeColor }}
                      >
                        Buka Pengaturan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white" 
                              style={{ backgroundColor: config.trialEnabled ? themeColor : '#cbd5e1' }}
                            >
                              <Timer className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 uppercase">Mode Trial</h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Status: {config.trialEnabled ? 'AKTIF' : 'NONAKTIF'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setConfig(prev => ({ 
                              ...prev, 
                              trialEnabled: !prev.trialEnabled, 
                              subscriptionEnabled: false 
                            }))} 
                            className={`w-14 h-8 rounded-full p-1 transition-all ${config.trialEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${config.trialEnabled ? 'translate-x-6' : ''}`}></div>
                          </button>
                        </div>
                        {config.trialEnabled && (
                          <div className="space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">
                                Tanggal Berakhir
                              </label>
                              <input 
                                type="datetime-local" 
                                className="w-full p-4 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none theme-focus mb-3" 
                                value={config.trialEndDate} 
                                onChange={(e) => setConfig({ ...config, trialEndDate: e.target.value })} 
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setConfig({ ...config, trialEndDate: addTime(config.trialEndDate, 'days', 7) })} 
                                  className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100"
                                >
                                  +7 Hari
                                </button>
                                <button 
                                  onClick={() => setConfig({ ...config, trialEndDate: addTime(config.trialEndDate, 'days', 30) })} 
                                  className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100"
                                >
                                  +30 Hari
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Sisa Waktu
                              </p>
                              <div className="text-emerald-600">
                                <CountdownDisplay targetDate={config.trialEndDate} label="Trial" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white" 
                              style={{ backgroundColor: config.subscriptionEnabled ? '#2563eb' : '#cbd5e1' }}
                            >
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 uppercase">Berlangganan</h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Status: {config.subscriptionEnabled ? 'AKTIF' : 'NONAKTIF'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setConfig(prev => ({ 
                              ...prev, 
                              subscriptionEnabled: !prev.subscriptionEnabled, 
                              trialEnabled: false 
                            }))} 
                            className={`w-14 h-8 rounded-full p-1 transition-all ${config.subscriptionEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}
                          >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${config.subscriptionEnabled ? 'translate-x-6' : ''}`}></div>
                          </button>
                        </div>
                        {config.subscriptionEnabled && (
                          <div className="space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2 mb-2">
                                Tanggal Berakhir
                              </label>
                              <input 
                                type="datetime-local" 
                                className="w-full p-4 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none theme-focus mb-3" 
                                value={config.subscriptionEndDate} 
                                onChange={(e) => setConfig({ ...config, subscriptionEndDate: e.target.value })} 
                              />
                              <div className="flex gap-2 mb-2">
                                <button 
                                  onClick={() => setConfig({ ...config, subscriptionEndDate: addTime(config.subscriptionEndDate, 'months', 1) })} 
                                  className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100"
                                >
                                  +1 Bulan
                                </button>
                                <button 
                                  onClick={() => setConfig({ ...config, subscriptionEndDate: addTime(config.subscriptionEndDate, 'months', 6) })} 
                                  className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100"
                                >
                                  +6 Bulan
                                </button>
                                <button 
                                  onClick={() => setConfig({ ...config, subscriptionEndDate: addTime(config.subscriptionEndDate, 'years', 1) })} 
                                  className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100"
                                >
                                  +1 Tahun
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Sisa Waktu
                              </p>
                              <div className="text-blue-600">
                                <CountdownDisplay targetDate={config.subscriptionEndDate} label="Langganan" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={handleSaveTrialConfig} 
                        disabled={actionLoading} 
                        className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2" 
                        style={{ backgroundColor: themeColor }}
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Simpan Lisensi
                      </button>
                      
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4 text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white" 
                            style={{ backgroundColor: themeColor }}
                          >
                            <Key className="w-5 h-5" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 uppercase">Ganti Password Admin</h3>
                        </div>
                        <div className="space-y-3">
                          <input 
                            type="password" 
                            placeholder="Password Baru" 
                            className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 theme-focus" 
                            value={newAdminPass} 
                            onChange={(e) => setNewAdminPass(e.target.value)} 
                          />
                          <input 
                            type="password" 
                            placeholder="Konfirmasi Password Baru" 
                            className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 theme-focus" 
                            value={confirmAdminPass} 
                            onChange={(e) => setConfirmAdminPass(e.target.value)} 
                          />
                        </div>
                        <button 
                          onClick={handleChangeAdminPassword} 
                          disabled={actionLoading} 
                          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveAll className="w-4 h-4"/>} Ganti Password
                        </button>
                      </div>
                      
                      <div className="bg-red-50 p-6 rounded-[2.5rem] shadow-xl border-2 border-red-100 space-y-4 text-left mt-8">
                        <div className="flex items-center gap-3 mb-2 text-red-700">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                            <Database className="w-5 h-5" />
                          </div>
                          <h3 className="text-sm font-black uppercase">Zona Bahaya</h3>
                        </div>
                        <p className="text-[10px] font-bold text-red-500 leading-relaxed">
                          Tindakan ini akan menghapus seluruh riwayat absensi tim dari Google Sheet secara permanen.
                        </p>
                        <button 
                          onClick={handleResetHistory} 
                          disabled={actionLoading} 
                          className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-700"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash className="w-4 h-4"/>} Reset Database Tim
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {configTab === 'affiliates' && (
                <div className="space-y-6 animate-in fade-in text-left">
                  {!affiliateTabUnlocked ? (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900">Akses Mitra Terbatas</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Masukkan kode rahasia untuk mengatur program mitra.
                      </p>
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="" 
                          className="w-full p-5 border-2 border-slate-100 rounded-2xl outline-none text-center font-black tracking-[0.2em] theme-focus" 
                          value={affiliateTabPass} 
                          onChange={(e) => setAffiliateTabPass(e.target.value)} 
                          onKeyPress={(e) => e.key === 'Enter' && handleUnlockAffiliateTab()} 
                        />
                      </div>
                      <button 
                        onClick={handleUnlockAffiliateTab} 
                        className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all" 
                        style={{ backgroundColor: themeColor }}
                      >
                        Buka Pengaturan Mitra
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 space-y-4">
                        <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
                          <Settings className="w-4 h-4"/> Pengaturan Program
                        </h3>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Komisi per Referral (Rp)</label>
                          <input 
                            type="text" 
                            inputMode="numeric" 
                            className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                            placeholder="50.000" 
                            value={affGlobalConfig.rewardPerRef?.toLocaleString('id-ID')} 
                            onChange={e => { 
                              const val = parseInt(e.target.value.replace(/\D/g, '')) || 0; 
                              setAffGlobalConfig({...affGlobalConfig, rewardPerRef: val}); 
                            }} 
                          />
                          <p className="text-[9px] text-slate-400 mt-1">
                            *Nominal yang diterima Mitra setiap ada 1 klien deal.
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Minimal Penarikan (Rp)</label>
                          <input 
                            type="text" 
                            inputMode="numeric" 
                            className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none" 
                            value={affGlobalConfig.minWd?.toLocaleString('id-ID')} 
                            onChange={e => { 
                              const val = parseInt(e.target.value.replace(/\D/g, '')) || 0; 
                              setAffGlobalConfig({...affGlobalConfig, minWd: val}); 
                            }} 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            No. WA Admin (Untuk Tanya Jawab)
                          </label>
                          <input 
                            type="text" 
                            className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none" 
                            placeholder="628..." 
                            value={affGlobalConfig.adminWa} 
                            onChange={e=>setAffGlobalConfig({...affGlobalConfig, adminWa: e.target.value})} 
                          />
                        </div>
                        <button 
                          onClick={handleSaveAffiliateSettings} 
                          disabled={actionLoading} 
                          className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
                        >
                          Simpan Pengaturan
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="font-black text-slate-900 text-sm uppercase px-2 flex items-center gap-2">
                          <Bell className="w-4 h-4 text-red-500"/> Permintaan Penarikan ({pendingWithdrawals.length})
                        </h3>
                        {pendingWithdrawals.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                            Tidak ada permintaan pending.
                          </div>
                        ) : (
                          pendingWithdrawals.map(wd => (
                            <div key={wd.id} className="bg-white p-5 rounded-[2rem] shadow-md border border-slate-100 relative overflow-hidden">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="text-xs font-black text-slate-800">{wd.affiliateName}</p>
                                  <p className="text-[10px] font-mono text-slate-400">{wd.affiliateCode}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-black text-emerald-600">Rp {wd.amount.toLocaleString()}</p>
                                  <p className="text-[9px] font-bold text-slate-400">
                                    {new Date(wd.createdAt?.seconds * 1000).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Info Transfer:</p>
                                <p className="text-xs font-bold text-slate-800">{wd.affiliateBank}</p>
                              </div>
                              {processingWdId === wd.id ? (
                                <div className="space-y-2 animate-in fade-in">
                                  <input 
                                    type="text" 
                                    placeholder="Link Bukti / No Ref Transfer..." 
                                    className="w-full p-3 border-2 border-emerald-100 rounded-xl text-xs outline-none focus:border-emerald-500" 
                                    value={proofInput} 
                                    onChange={e=>setProofInput(e.target.value)} 
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={()=>setProcessingWdId(null)} 
                                      className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase"
                                    >
                                      Batal
                                    </button>
                                    <button 
                                      onClick={()=>handleApproveWithdraw(wd)} 
                                      disabled={actionLoading} 
                                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg"
                                    >
                                      Kirim & Konfirmasi
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={()=>handleRejectWithdraw(wd)} 
                                    disabled={actionLoading} 
                                    className="flex-1 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-[10px] font-black uppercase transition-colors"
                                  >
                                    Tolak & Refund
                                  </button>
                                  <button 
                                    onClick={()=>setProcessingWdId(wd.id)} 
                                    disabled={actionLoading} 
                                    className="flex-[2] py-3 bg-slate-900 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase shadow-lg transition-colors"
                                  >
                                    Proses Transfer
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {configTab === 'gamification' && (
                <GamificationSettings 
                  gamificationConfig={gamificationConfig}
                  setGamificationConfig={setGamificationConfig}
                  handleSaveGamificationConfig={handleSaveGamificationConfig}
                  themeColor={themeColor}
                  actionLoading={actionLoading}
                  setMsg={setMsg}
                  getCurrentLocation={getCurrentLocation}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {view === 'affiliate_portal' && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col p-8 overflow-y-auto font-sans text-slate-800">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => { window.location.href = window.location.pathname; }} 
              className="p-3 bg-white rounded-xl shadow-sm text-slate-500 border border-slate-200"
            >
              <ChevronLeft size={20}/>
            </button>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Portal Mitra</h2>
          </div>
          
          {affiliateView === 'login' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users size={32}/>
                </div>
                <h3 className="text-2xl font-black text-slate-800">Login Mitra</h3>
                <p className="text-xs font-bold text-slate-400">Masuk untuk cek komisi Anda</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-4">
                <input 
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none uppercase border-2 border-transparent focus:border-emerald-500 transition-all" 
                  placeholder="Kode Mitra (Contoh: MKT-1234)" 
                  value={affData.code} 
                  onChange={e=>setAffData({...affData, code:e.target.value})} 
                  onKeyPress={e=>e.key==='Enter' && handleAffiliateLogin()} 
                />
                <input 
                  type="password" 
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-emerald-500 transition-all" 
                  placeholder="PIN Akses" 
                  value={affData.pin} 
                  onChange={e=>setAffData({...affData, pin:e.target.value})} 
                  onKeyPress={e=>e.key==='Enter' && handleAffiliateLogin()} 
                />
                <button 
                  onClick={handleAffiliateLogin} 
                  disabled={actionLoading} 
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black shadow-lg active:scale-95 transition-all"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "MASUK DASHBOARD"}
                </button>
              </div>
              <p className="text-center text-xs font-bold text-slate-400">
                Belum terdaftar? <span onClick={()=>setAffiliateView('register')} className="text-emerald-600 underline cursor-pointer hover:text-emerald-500">Daftar Jadi Mitra</span>
              </p>
            </div>
          )}
          
          {affiliateView === 'register' && (
            <div className="space-y-6 animate-in slide-in-from-right-10">
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-4">
                <h3 className="font-black text-slate-800 text-lg">Formulir Pendaftaran</h3>
                <input 
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none text-xs" 
                  placeholder="Nama Lengkap" 
                  value={affData.name} 
                  onChange={e=>setAffData({...affData, name:e.target.value})} 
                />
                <input 
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none text-xs" 
                  placeholder="No. WhatsApp (Aktif)" 
                  value={affData.phone} 
                  onChange={e=>setAffData({...affData, phone:e.target.value})} 
                />
                <input 
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none text-xs" 
                  placeholder="Info Bank (Nama Bank - No Rek - Atas Nama)" 
                  value={affData.bank} 
                  onChange={e=>setAffData({...affData, bank:e.target.value})} 
                />
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <p className="text-[9px] font-bold text-yellow-700 mb-2 uppercase">Buat PIN Keamanan</p>
                  <input 
                    type="password" 
                    className="w-full p-3 bg-white rounded-lg font-black text-slate-700 outline-none text-center tracking-widest" 
                    placeholder="******" 
                    value={affData.pin} 
                    onChange={e=>setAffData({...affData, pin:e.target.value})} 
                  />
                </div>
                <button 
                  onClick={handleAffiliateRegister} 
                  disabled={actionLoading} 
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg active:scale-95 transition-all"
                >
                  DAFTAR SEKARANG
                </button>
              </div>
              <button onClick={()=>setAffiliateView('login')} className="w-full py-3 text-xs font-bold text-slate-400">
                Kembali ke Login
              </button>
            </div>
          )}
          
          {affiliateView === 'dashboard' && activeAffiliate && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-left">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">
                        Halo, {activeAffiliate.name.split(' ')[0]}
                      </p>
                      <h2 className="text-3xl font-black tracking-tight">Komisi Anda</h2>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Trophy size={20} className="text-yellow-300"/>
                    </div>
                  </div>
                  <p className="text-4xl font-mono font-black mb-6 tracking-tighter">
                    Rp {activeAffiliate.unpaidCommission?.toLocaleString('id-ID')}
                  </p>
                  <div className="bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-[8px] uppercase opacity-70 mb-1">Kode Referral</p>
                      <p className="text-xl font-mono font-black tracking-widest text-yellow-300">
                        {activeAffiliate.code}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(activeAffiliate.code); 
                        setMsg({type:'success', text:'Kode disalin!'}); 
                        setTimeout(()=>setMsg(null),2000);
                      }} 
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-lg transition-colors"
                    >
                      <Copy size={16}/>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] shadow-lg border border-slate-100">
                  <p className="text-3xl font-black text-slate-800 mb-1">{activeAffiliate.totalReferrals}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Klien</p>
                </div>
                <div 
                  className="bg-white p-5 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 transition-colors" 
                  onClick={() => setShowWithdrawModal(true)}
                >
                  <CreditCard className="w-6 h-6 text-emerald-600 mb-2"/>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cairkan Dana</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 text-left shadow-sm space-y-4">
                <h4 className="font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                  <History size={14} className="text-blue-500"/> Riwayat Penarikan
                </h4>
                {wdHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-2">Belum ada riwayat penarikan.</p>
                ) : (
                  <div className="space-y-3">
                    {wdHistory.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                        <div>
                          <p className="text-xs font-black text-slate-700">Rp {item.amount.toLocaleString()}</p>
                          <p className="text-[9px] text-slate-400 font-bold">
                            {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru saja'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : item.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {item.status === 'COMPLETED' ? 'SUKSES' : item.status === 'REJECTED' ? 'DITOLAK' : 'PROSES'}
                          </span>
                          {item.status === 'COMPLETED' && item.proof && (
                            <p 
                              className="text-[8px] font-bold text-blue-500 mt-1 cursor-pointer underline" 
                              onClick={() => {alert("Info Transfer: " + item.proof)}}
                            >
                              Lihat Bukti
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 text-left shadow-sm">
                <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                  <Lightbulb size={14} className="text-yellow-500"/> Cara Dapat Cuan
                </h4>
                <ul className="text-[10px] font-bold text-slate-500 space-y-3">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">1</span>
                    <span>Bagikan <b>Kode Referral</b> Anda ke pemilik toko/usaha.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">2</span>
                    <span>Saat mereka deal, minta mereka info kode Anda ke Admin.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">3</span>
                    <span>Saldo otomatis masuk <b>Rp {affGlobalConfig.rewardPerRef?.toLocaleString()}</b> (atau sesuai setting) saat Admin mengaktifkan lisensi.</span>
                  </li>
                </ul>
              </div>
              
              <button 
                onClick={()=>{
                  setActiveAffiliate(null); 
                  setAffiliateView('login'); 
                  window.location.href = window.location.pathname;
                }} 
                className="text-xs font-black text-red-400 py-4 hover:text-red-600 transition-colors"
              >
                Keluar & Kembali ke App Utama
              </button>
            </div>
          )}
          
          {showWithdrawModal && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm p-6 rounded-[2.5rem] shadow-2xl space-y-6 animate-in zoom-in-95">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={32}/>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Tarik Komisi</h3>
                  <p className="text-xs font-bold text-slate-400">
                    Saldo Tersedia: Rp {activeAffiliate.unpaidCommission?.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Jumlah Penarikan</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        className="w-full p-4 pl-10 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-blue-500 transition-all text-lg" 
                        placeholder="0" 
                        value={withdrawAmount} 
                        onChange={e => handleAmountChange(e.target.value)} 
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 ml-2 mr-2">
                      <p className="text-[10px] font-bold text-slate-400">
                        Min: Rp {affGlobalConfig.minWd?.toLocaleString('id-ID')}
                      </p>
                      {(() => { 
                        const rawVal = withdrawAmount ? parseInt(withdrawAmount.replace(/\./g, '')) : 0; 
                        if (rawVal > activeAffiliate.unpaidCommission) { 
                          return <span className="text-[10px] font-black text-red-500 animate-pulse">Saldo Kurang!</span> 
                        } 
                        return null; 
                      })()}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rekening Tujuan:</p>
                    <p className="text-sm font-black text-slate-800">{activeAffiliate.bank}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={()=>{
                      setShowWithdrawModal(false); 
                      setWithdrawAmount('');
                    }} 
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleRequestWithdraw} 
                    disabled={actionLoading} 
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all hover:bg-blue-700"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : "Ajukan Sekarang"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="p-8 pt-0 flex flex-col items-center pointer-events-none opacity-20 bg-transparent leading-none">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 leading-none">
          ACTIONS ENTERPRISE
        </p>
        <p className="text-[8px] font-bold text-slate-400 mt-2 leading-none tracking-[0.2em]">
          v5.0 STABLE RELEASE
        </p>
      </div>
    </div>
  );
}

// Wrap App with ErrorBoundary
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}