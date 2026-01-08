import React, { useState, useEffect, useRef, useMemo } from 'react';
import { appId } from './config/firebase';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useConfig } from './hooks/useConfig';
import { useEmployees } from './hooks/useEmployees';
import { useAttendance } from './hooks/useAttendance';
import { useGamification } from './hooks/useGamification';

// Components
import ErrorBoundary from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import Message from './components/common/Message';

// Views
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import CheckinView from './views/CheckinView';
import CheckoutView from './views/CheckoutView';
import RecapView from './views/RecapView';
import GamificationView from './views/GamificationView';
import ConfigView from './views/ConfigView';
import ChangePinView from './views/ChangePinView';
import ShiftLockedView from './views/ShiftLockedView';
import AccessBlockedView from './views/AccessBlockedView';
import PassChallengeView from './views/PassChallengeView';
import AffiliatePortalView from './views/AffiliatePortalView';

// Utils
import { hexToRgba, adjustColor, getInsight } from './utils/helpers';
import { 
  DEFAULT_THEME_COLOR,
  TRIAL_UNLOCK_PASSWORD,
  LEGACY_PASSWORD 
} from './config/constants';

function App() {
  // Auth & Config
  const { user, loading: authLoading } = useAuth();
  const { config, setConfig } = useConfig();
  
  // Employees
  const { 
    employees, 
    loading: employeesLoading, 
    addEmployee, 
    deleteEmployee 
  } = useEmployees(config);
  
  // State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [view, setView] = useState('login');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  
  // Login states
  const [loginSelection, setLoginSelection] = useState('');
  const [isPinMode, setIsPinMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  
  // Task states
  const [tempTasks, setTempTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [checkoutNote, setCheckoutNote] = useState('');
  
  // Attendance
  const { 
    attendanceData, 
    updateTask, 
    addTask, 
    checkOut 
  } = useAttendance(selectedEmployee);
  
  // Gamification
  const { 
    gamificationConfig,
    userPoints,
    leaderboard,
    updateGamificationConfig,
    fetchLeaderboard
  } = useGamification(appId, selectedEmployee);
  
  // Ref untuk rewards processing
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

  // Handler functions
  const handleLoginFailure = () => {
    // ... login failure logic
  };

  const handleVerifyPin = async () => {
    // ... verify pin logic
  };

  const handleCheckIn = async () => {
    // ... check in logic
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

  const requestConfigAccess = () => { 
    setView('pass_challenge'); 
  };

  const handleBackFromConfig = () => {
    if (selectedEmployee) {
      if (attendanceData) { 
        setView(attendanceData.status === 'COMPLETED' ? 'shift_locked' : 'dashboard'); 
      } else { 
        setView('checkin'); 
      }
    } else { 
      setView('login'); 
    }
  };

  // Calculate derived values
  const isAccessBlocked = useMemo(() => {
    // ... access blocked logic
    return false;
  }, [config]);

  const stats = useMemo(() => {
    // ... calculate stats logic
    return null;
  }, [attendanceData]);

  if (authLoading) return ( 
    <div className="max-w-md mx-auto min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColor }} />
    </div> 
  );

  if (isAccessBlocked && view !== 'config' && view !== 'pass_challenge') { 
    return <AccessBlockedView config={config} requestConfigAccess={requestConfigAccess} />;
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen shadow-2xl relative font-sans text-slate-800 flex flex-col overflow-hidden leading-none">
      <Header 
        view={view}
        selectedEmployee={selectedEmployee}
        config={config}
        themeColor={themeColor}
        onLogout={() => { setSelectedEmployee(null); setView('login'); }}
        onOpenConfig={requestConfigAccess}
      />
      
      <Message msg={msg} themeColor={themeColor} onClose={() => setMsg(null)} />
      
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
            handleUpdateTask={updateTask}
            addTaskToActiveSession={addTask}
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
            setView={setView}
          />
        )}

        {view === 'checkout' && (
          <CheckoutView 
            themeColor={themeColor}
            checkoutNote={checkoutNote}
            setCheckoutNote={setCheckoutNote}
            handleCheckOut={checkOut}
            actionLoading={actionLoading}
            setView={setView}
          />
        )}

        {view === 'recap' && (
          <RecapView 
            attendanceData={attendanceData}
            selectedEmployee={selectedEmployee}
            themeColor={themeColor}
            setView={setView}
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
            handleBackFromConfig={handleBackFromConfig}
          />
        )}

        {view === 'change_pin' && (
          <ChangePinView 
            selectedEmployee={selectedEmployee}
            themeColor={themeColor}
            actionLoading={actionLoading}
            setView={setView}
            attendanceData={attendanceData}
          />
        )}

        {view === 'shift_locked' && (
          <ShiftLockedView 
            selectedEmployee={selectedEmployee}
            themeColor={themeColor}
            setView={setView}
          />
        )}

        {view === 'pass_challenge' && (
          <PassChallengeView 
            themeColor={themeColor}
            setView={setView}
          />
        )}

        {view === 'affiliate_portal' && (
          <AffiliatePortalView 
            themeColor={themeColor}
            setView={setView}
          />
        )}
      </div>
      
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