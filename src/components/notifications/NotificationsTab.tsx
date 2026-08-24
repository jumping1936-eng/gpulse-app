import React, { useState } from 'react';
import { Heart, Mail, Bell, Eye, UserPlus } from 'lucide-react';

// ==========================================
// 領域模型：通知名單 Mock Data (包含互動與系統)
// ==========================================

// 互動通知假資料
const INTERACTION_NOTIFICATIONS = [
  {
    id: 'int-1',
    type: 'like', // 類型：like, view, match
    user: 'Sarah, 24',
    action: '右滑了你的個人檔案',
    time: '10 分鐘前',
    avatarGradient: 'from-pink-500 to-rose-500',
    initials: 'SR'
  },
  {
    id: 'int-2',
    type: 'view',
    user: '匿名用戶',
    action: '偷偷查看了你的主頁',
    time: '2 小時前',
    avatarGradient: 'from-slate-600 to-slate-800',
    initials: '?'
  },
  {
    id: 'int-3',
    type: 'match',
    user: 'Jessica, 26',
    action: '與你配對成功！現在就去打聲招呼吧',
    time: '昨天',
    avatarGradient: 'from-cyan-400 to-blue-500',
    initials: 'JS'
  }
];

// 系統通知假資料
const SYSTEM_NOTIFICATIONS = [
  { 
    id: 'sys-1', 
    title: '完善你的檔案，獲得 3 倍瀏覽量', 
    time: '1 天前', 
    isRead: false 
  },
  { 
    id: 'sys-2', 
    title: 'VIP 春季特惠 —— 週末限時 5 折！', 
    time: '2 天前', 
    isRead: true 
  },
];

export default function NotificationsTab() {
  // ✅ 狀態管理：控制目前選中的分頁 ('interaction' | 'system')
  // 這裡預設開啟 'interaction' (互動)
  const [activeTab, setActiveTab] = useState<'interaction' | 'system'>('interaction');

  return (
    <div className="h-full bg-[#0B0C10] flex flex-col font-sans text-white relative">
      
      {/* ==========================================
          頂部 Header 與分頁切換區塊
          ========================================== */}
      <div className="pt-6 pb-4 px-5 shrink-0 sticky top-0 bg-[#0B0C10]/95 backdrop-blur-md z-20">
        <h1 className="text-2xl font-bold tracking-wider mb-6">通知</h1>

        <div className="flex gap-4">
          {/* 互動 Tab */}
          <button
            onClick={() => setActiveTab('interaction')}
            className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 ${
              activeTab === 'interaction' 
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-pink-400/50 text-white' 
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'interaction' ? 'fill-current' : ''}`} /> 互動
          </button>

          {/* 系統 Tab (精準還原發光漸層設計) */}
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 ${
              activeTab === 'system' 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-purple-300/50 text-white' 
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Mail className="w-4 h-4" /> 系統
          </button>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="h-[1px] w-full bg-white/10 shrink-0" />

      {/* ==========================================
          列表內容區塊 (根據 activeTab 切換渲染)
          ========================================== */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        
        {/* 渲染：互動通知列表 */}
        {activeTab === 'interaction' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
            {INTERACTION_NOTIFICATIONS.map((notif) => (
              <div 
                key={notif.id} 
                className="flex items-center gap-4 p-5 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group"
              >
                {/* 漸層頭像 */}
                <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${notif.avatarGradient} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold tracking-tighter">{notif.initials}</span>
                  {/* 右下角的小 Icon 標示動作類型 */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center border-2 border-[#0B0C10]">
                    {notif.type === 'like' && <Heart className="w-2.5 h-2.5 text-pink-500 fill-current" />}
                    {notif.type === 'view' && <Eye className="w-2.5 h-2.5 text-slate-400" />}
                    {notif.type === 'match' && <UserPlus className="w-2.5 h-2.5 text-cyan-400" />}
                  </div>
                </div>
                
                {/* 文字內容 */}
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-bold text-slate-200">
                    {notif.user}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {notif.action}
                  </span>
                </div>
                
                {/* 時間戳記 */}
                <span className="text-[10px] text-slate-500 shrink-0">
                  {notif.time}
                </span>
              </div>
            ))}
            <div className="h-24" /> {/* 底部防擋留白 */}
          </div>
        )}

        {/* 渲染：系統通知列表 */}
        {activeTab === 'system' && (
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            {SYSTEM_NOTIFICATIONS.map((notif) => (
              <div 
                key={notif.id} 
                className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* 左側鈴鐺 Icon */}
                  <div className="w-12 h-12 rounded-full bg-indigo-950/50 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-900/50 transition-colors shrink-0">
                    <Bell className="w-5 h-5 text-indigo-400" />
                  </div>
                  
                  {/* 文字內容 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-slate-200 tracking-wide line-clamp-1">
                      {notif.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {notif.time}
                    </span>
                  </div>
                </div>

                {/* 右側小鈴鐺裝飾 */}
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 ml-2">
                   <Bell className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
            <div className="h-24" /> {/* 底部防擋留白 */}
          </div>
        )}

      </div>
    </div>
  );
}