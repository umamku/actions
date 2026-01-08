import React, { useState } from 'react';
import { 
  RefreshCw, Trophy, User, CheckCircle, Zap, 
  Clock, BarChart3, Activity, Loader2, Save 
} from 'lucide-react';
import { calculateLevel, verifyLocation } from '../utils/helpers';

// --- LOCAL HELPERS (Hanya dipakai untuk tampilan di sini) ---
const getActivityIcon = (type) => {
  switch(type) {
    case 'ATTENDANCE': return <User className="w-5 h-5" />;
    case 'TASK_COMPLETED': return <CheckCircle className="w-5 h-5" />;
    case 'STREAK': return <Zap className="w-5 h-5" />;
    case 'PERFECT_DAY': return <Trophy className="w-5 h-5" />;
    case 'EARLY_CHECKIN': return <Clock className="w-5 h-5" />;
    case 'TARGET_ACHIEVED': return <BarChart3 className="w-5 h-5" />;
    default: return <Activity className="w-5 h-5" />;
  }
};

const getActivityIconColor = (type) => {
  switch(type) {
    case 'ATTENDANCE': return 'bg-blue-100 text-blue-600';
    case 'TASK_COMPLETED': return 'bg-emerald-100 text-emerald-600';
    case 'STREAK': return 'bg-orange-100 text-orange-600';
    case 'PERFECT_DAY': return 'bg-yellow-100 text-yellow-600';
    case 'EARLY_CHECKIN': return 'bg-purple-100 text-purple-600';
    case 'TARGET_ACHIEVED': return 'bg-indigo-100 text-indigo-600';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const getActivityDescription = (type) => {
  switch(type) {
    case 'ATTENDANCE': return 'Check-in harian';
    case 'TASK_COMPLETED': return 'Menyelesaikan task';
    case 'STREAK': return 'Streak berkelanjutan';
    case 'PERFECT_DAY': return 'Semua task selesai';
    case 'EARLY_CHECKIN': return 'Check-in lebih awal';
    case 'TARGET_ACHIEVED': return 'Mencapai target';
    default: return 'Aktivitas';
  }
};

// --- COMPONENT: DASHBOARD ---
export const GamificationDashboard = ({ selectedEmployee, userPoints, leaderboard, employees, themeColor, fetchLeaderboard }) => {
  const currentUserPoints = userPoints[selectedEmployee?.id];
  const currentUserRank = leaderboard.find(item => item.userId === selectedEmployee?.id)?.rank || '-';
  
  return (
    <div className="px-6 py-8 space-y-8 animate-in fade-in pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Poin & Prestasi</h2>
        <button 
          onClick={fetchLeaderboard}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      
      {currentUserPoints && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[2.5rem] p-8 text-white shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-emerald-100 text-sm font-bold mb-2">Rank #{currentUserRank}</p>
              <h3 className="text-3xl font-black mb-2">{selectedEmployee?.name}</h3>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                  Level {currentUserPoints.level}
                </div>
                <div className="text-sm font-bold">
                  🔥 {currentUserPoints.streak} hari streak
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black">{currentUserPoints.points}</div>
              <p className="text-emerald-100">Total Poin</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span>Progress ke Level {currentUserPoints.level + 1}</span>
              <span>{currentUserPoints.points}/{calculateLevel(currentUserPoints.points).nextLevelPoints}</span>
            </div>
            <div className="w-full h-4 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${(currentUserPoints.points / calculateLevel(currentUserPoints.points).nextLevelPoints) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-black">{currentUserPoints.history?.filter(h => 
                new Date(h.timestamp).toDateString() === new Date().toDateString()
              ).length || 0}</div>
              <p className="text-sm opacity-80">Aktivitas Hari Ini</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">{currentUserPoints.achievements?.length || 0}</div>
              <p className="text-sm opacity-80">Pencapaian</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">
                {currentUserPoints.history?.filter(h => h.type === 'TASK_COMPLETED').length || 0}
              </div>
              <p className="text-sm opacity-80">Task Selesai</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900">Leaderboard</h3>
          <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm">
            <option>Bulan Ini</option>
            <option>Minggu Ini</option>
            <option>Sepanjang Waktu</option>
          </select>
        </div>
        
        <div className="space-y-4">
          {leaderboard.slice(0, 10).map((player, index) => {
            const isCurrentUser = player.userId === selectedEmployee?.id;
            return (
              <div 
                key={player.userId} 
                className={`p-4 rounded-2xl flex items-center justify-between ${isCurrentUser ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-50'}`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${index < 3 ? 'bg-yellow-500 text-white' : 'bg-slate-200'}`}>
                    {player.rank}
                  </div>
                  <div className="ml-4">
                    <p className={`font-bold ${isCurrentUser ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {employees.find(e => e.id === player.userId)?.name || player.userId}
                      {isCurrentUser && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Anda</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-emerald-600">Level {player.level}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-500">{player.streak} hari streak</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900">{player.points}</div>
                  <div className="text-xs text-slate-500">poin</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {currentUserPoints?.history && currentUserPoints.history.length > 0 && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-6">
          <h3 className="text-xl font-black text-slate-900 mb-6">Aktivitas Terakhir</h3>
          <div className="space-y-3">
            {currentUserPoints.history.slice(-5).reverse().map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityIconColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="ml-4">
                    <p className="font-bold text-slate-900">{getActivityDescription(activity.type)}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(activity.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-600">+{activity.points}</div>
                  <div className="text-xs text-slate-500">poin</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: SETTINGS ---
export const GamificationSettings = ({ 
  gamificationConfig, 
  setGamificationConfig, 
  handleSaveGamificationConfig, 
  themeColor, 
  actionLoading,
  setMsg,
  getCurrentLocation 
}) => {
  const [testLoading, setTestLoading] = useState(false);

  const handleTestLocation = async () => {
    setTestLoading(true);
    try {
      const result = await verifyLocation(gamificationConfig);
      
      if (result.valid) {
        setMsg({ 
          type: 'success', 
          text: `Lokasi valid! Jarak: ${result.distance}m dari kantor. Akurasi: ${result.accuracy?.toFixed(1)}m` 
        });
      } else {
        setMsg({ 
          type: 'error', 
          text: `Lokasi tidak valid! ${result.error || `Jarak: ${result.distance}m (max ${gamificationConfig.locationRadius}m)`}` 
        });
      }
    } catch (error) {
      setMsg({ type: 'error', text: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Sistem Gamifikasi</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Status: {gamificationConfig.enabled ? 'AKTIF' : 'NONAKTIF'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setGamificationConfig(prev => ({ ...prev, enabled: !prev.enabled }))} 
            className={`w-14 h-8 rounded-full p-1 transition-all ${gamificationConfig.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${gamificationConfig.enabled ? 'translate-x-6' : ''}`}></div>
          </button>
        </div>
      </div>
      
      {gamificationConfig.enabled && (
        <>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6">
            <h3 className="text-lg font-black text-slate-900">Pengaturan Poin</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                  Poin per Kehadiran
                </label>
                <input 
                  type="number" 
                  className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                  value={gamificationConfig.pointsPerAttendance}
                  onChange={e => setGamificationConfig(prev => ({ 
                    ...prev, 
                    pointsPerAttendance: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                  Poin per Task Selesai
                </label>
                <input 
                  type="number" 
                  className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                  value={gamificationConfig.pointsPerTask}
                  onChange={e => setGamificationConfig(prev => ({ 
                    ...prev, 
                    pointsPerTask: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                  Poin Streak
                </label>
                <input 
                  type="number" 
                  className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                  value={gamificationConfig.pointsPerStreak}
                  onChange={e => setGamificationConfig(prev => ({ 
                    ...prev, 
                    pointsPerStreak: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                  Maks Poin per Hari
                </label>
                <input 
                  type="number" 
                  className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                  value={gamificationConfig.maxPointsPerDay}
                  onChange={e => setGamificationConfig(prev => ({ 
                    ...prev, 
                    maxPointsPerDay: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Verifikasi Lokasi</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Cegah kecurangan absensi
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setGamificationConfig(prev => ({ ...prev, locationVerification: !prev.locationVerification }))} 
                className={`w-14 h-8 rounded-full p-1 transition-all ${gamificationConfig.locationVerification ? 'bg-blue-500' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-all ${gamificationConfig.locationVerification ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
            
            {gamificationConfig.locationVerification && (
              <div className="space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                    Radius Valid (meter)
                  </label>
                  <input 
                    type="number" 
                    className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                    value={gamificationConfig.locationRadius}
                    onChange={e => setGamificationConfig(prev => ({ 
                      ...prev, 
                      locationRadius: parseInt(e.target.value) || 100 
                    }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                      Latitude Kantor
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                      value={gamificationConfig.companyLat || ''}
                      onChange={e => setGamificationConfig(prev => ({ 
                        ...prev, 
                        companyLat: parseFloat(e.target.value) 
                      }))}
                      placeholder="-6.2088"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                      Longitude Kantor
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500" 
                      value={gamificationConfig.companyLng || ''}
                      onChange={e => setGamificationConfig(prev => ({ 
                        ...prev, 
                        companyLng: parseFloat(e.target.value) 
                      }))}
                      placeholder="106.8456"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        const location = await getCurrentLocation();
                        setGamificationConfig(prev => ({
                          ...prev,
                          companyLat: location.lat,
                          companyLng: location.lng
                        }));
                        setMsg({ type: 'success', text: 'Lokasi kantor berhasil diset!' });
                      } catch (error) {
                        setMsg({ type: 'error', text: error.message });
                      }
                    }}
                    className="flex-1 py-3 bg-blue-100 text-blue-600 rounded-xl font-bold text-sm"
                  >
                    📍 Gunakan Lokasi Saat Ini
                  </button>
                  
                  <button 
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${gamificationConfig.companyLat},${gamificationConfig.companyLng}`;
                      window.open(url, '_blank');
                    }}
                    disabled={!gamificationConfig.companyLat || !gamificationConfig.companyLng}
                    className="flex-1 py-3 bg-emerald-100 text-emerald-600 rounded-xl font-bold text-sm"
                  >
                    🗺️ Lihat di Google Maps
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Test Lokasi</h3>
            <button 
              onClick={handleTestLocation}
              disabled={testLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              {testLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Test Lokasi Saat Ini'}
            </button>
          </div>
          
          <button 
            onClick={handleSaveGamificationConfig}
            className="w-full text-white py-5 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2" 
            style={{ backgroundColor: themeColor }}
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan Gamifikasi
          </button>
        </>
      )}
    </div>
  );
};