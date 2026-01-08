import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle, ListTodo, LogOut, Settings, Save, Loader2, 
  Clipboard, User, Clock, ChevronLeft, Zap, Plus, Trash2, 
  Check, ShieldCheck, ArrowRight, ChevronDown, RefreshCw, 
  Users, History, Trophy, KeyRound, RotateCcw, Eye, EyeOff, 
  TrendingUp, BarChart3, ChevronRight, Lightbulb, CloudDownload, 
  BarChart, AlertTriangle, Fingerprint, ShieldEllipsis, Activity, 
  CloudOff, Lock, UserPlus, UserMinus, SaveAll, Image as ImageIcon, 
  ArrowUpFromLine, ArrowDownToLine, Timer, Unlock, CalendarClock, 
  Key, CalendarPlus, CreditCard, FileX, Database, Trash, Gift, 
  Copy, Bell 
} from 'lucide-react';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useConfig } from './hooks/useConfig';

// Utils
import { 
  generateReferralCode, 
  fetchWithTimeout, 
  getDominantColor, 
  hexToRgba, 
  getInsight 
} from './utils/helpers';
import { verifySecurePassword, hashString } from './utils/security';

// Components
import ErrorBoundary from './components/common/ErrorBoundary';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import CheckinView from './views/CheckinView';
import CheckoutView from './views/CheckoutView';
import RecapView from './views/RecapView';
import GamificationView from './views/GamificationView';
import ConfigView from './views/ConfigView';

// Firebase
import { db, appId } from './config/firebase';
import { 
  doc, setDoc, getDoc, collection, onSnapshot, 
  updateDoc, serverTimestamp, deleteDoc, increment, 
  addDoc, query, where, orderBy, getDocs 
} from 'firebase/firestore';

// Constants
import { 
  DEFAULT_EMPLOYEES, 
  DEFAULT_LOGO_URL, 
  DEFAULT_THEME_COLOR,
  TRIAL_UNLOCK_PASSWORD,
  LEGACY_PASSWORD,
  DEFAULT_ADMIN_HASH 
} from './config/constants';

function App() {
  // State declarations
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [view, setView] = useState('login');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tempTasks, setTempTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [checkoutNote, setCheckoutNote] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  // ... other states

  // Hooks
  const { user, loading } = useAuth();
  const { config, setConfig } = useConfig();

  // Theme color state
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);

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

  if (loading) return ( 
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
    </div> 
  );

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl relative font-sans text-slate-800 flex flex-col overflow-hidden leading-none">
      {msg && (
        <div className="fixed bottom-28 left-4 right-4 z-[100] animate-in slide-in-from-bottom-6">
          <div 
            className={`p-4 rounded-[2.5rem] shadow-2xl border-2 flex items-center gap-4 ${msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-900 shadow-red-200/50' : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'}`} 
            style={msg.type !== 'error' ? { borderColor: hexToRgba(themeColor, 0.3) } : {}}
          >
            {/* ... message content ... */}
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
          <LoginView 
            employees={employees}
            loginSelection={loginSelection}
            setLoginSelection={setLoginSelection}
            isPinMode={isPinMode}
            setIsPinMode={setIsPinMode}
            pinInput={pinInput}
            setPinInput={setPinInput}
            lockoutTime={lockoutTime}
            actionLoading={actionLoading}
            handleStartLogin={handleStartLogin}
            handleVerifyPin={handleVerifyPin}
            requestConfigAccess={requestConfigAccess}
            config={config}
            themeColor={themeColor}
          />
        )}

        {view === 'dashboard' && attendanceData && (
          <DashboardView 
            attendanceData={attendanceData}
            selectedEmployee={selectedEmployee}
            themeColor={themeColor}
            view={view}
            setView={setView}
            taskInput={taskInput}
            setTaskInput={setTaskInput}
            handleUpdateTask={handleUpdateTask}
            addTaskToActiveSession={addTaskToActiveSession}
            userTargets={userTargets}
            gamificationConfig={gamificationConfig}
          />
        )}

        {view === 'checkin' && (
          <CheckinView 
            selectedEmployee={selectedEmployee}
            themeColor={themeColor}
            tempTasks={tempTasks}
            setTempTasks={setTempTasks}
            taskInput={taskInput}
            setTaskInput={setTaskInput}
            addTempTask={addTempTask}
            removeTempTask={removeTempTask}
            handleCheckIn={handleCheckIn}
            actionLoading={actionLoading}
            fetchRecapData={fetchRecapData}
            setView={setView}
            view={view}
          />
        )}

        {view === 'checkout' && (
          <CheckoutView 
            themeColor={themeColor}
            checkoutNote={checkoutNote}
            setCheckoutNote={setCheckoutNote}
            handleCheckOut={handleCheckOut}
            actionLoading={actionLoading}
            setView={setView}
          />
        )}

        {view === 'recap' && (
          <RecapView 
            attendanceData={attendanceData}
            selectedEmployee={selectedEmployee}
            themeColor={themeColor}
            recapLoading={recapLoading}
            recapData={recapData}
            isLocalDataMissingFromSheet={isLocalDataMissingFromSheet}
            stats={stats}
            displayedHistory={displayedHistory}
            fetchRecapData={fetchRecapData}
            setView={setView}
            view={view}
          />
        )}

        {view === 'gamification' && (
          <GamificationView 
            selectedEmployee={selectedEmployee}
            userPoints={userPoints}
            leaderboard={leaderboard}
            employees={employees}
            themeColor={themeColor}
            fetchLeaderboard={fetchLeaderboard}
            setView={setView}
          />
        )}

        {view === 'config' && (
          <ConfigView 
            config={config}
            setConfig={setConfig}
            themeColor={themeColor}
            actionLoading={actionLoading}
            employees={employees}
            // ... pass other required props
          />
        )}

        {/* ... other views */}
      </div>
      
      {/* Footer */}
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

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}