import React, { useState } from 'react';
import { ArrowLeft, UserX, Unlock, ShieldAlert } from 'lucide-react';

// ==========================================
// 領域模型：黑名單假資料 (Mock Blocked Users)
// ==========================================
const MOCK_BLOCKED_USERS = [
  { id: 'b1', name: 'Kevin', initials: 'KV', gradient: 'from-orange-400 to-red-500', date: '2023/10/15' },
  { id: 'b2', name: 'John', initials: 'JH', gradient: 'from-slate-600 to-slate-800', date: '2023/10/20' },
];

interface Props {
  onBack: () => void;
}

export default function BlockedUsersList({ onBack }: Props) {
  // ✅ 狀態管理：目前被封鎖的使用者名單
  const [blockedUsers, setBlockedUsers] = useState(MOCK_BLOCKED_USERS);

  // 處理解除封鎖的邏輯
  const handleUnblock = (userId: string) => {
    // 實務上這裡會打 API: POST /api/users/unblock { userId }
    // UI 先行：將該使用者從列表中移除
    setBlockedUsers(prev => prev.filter(user => user.id !== userId));
  };

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col absolute inset-0 z-50">
      
      {/* 頂部導航列 */}
      <div className="flex-shrink-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0">
        <button 
          onClick={onBack} 
          className="text-white/60 hover:text-white transition-colors active:scale-95 p-1 -ml-1"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">封鎖名單管理</h1>
      </div>

      {/* 警告提示區塊 */}
      <div className="px-5 py-4 shrink-0">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-200/80 text-xs leading-relaxed">
            被封鎖的使用者將無法查看您的個人檔案、向您發送訊息，或在探索頁面中看到您。解除封鎖後，雙方需重新配對才能再次傳送訊息。
          </p>
        </div>
      </div>

      {/* 名單列表區塊 */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {blockedUsers.length > 0 ? (
          <div className="space-y-3">
            {blockedUsers.map((user) => (
              <div 
                key={user.id} 
                className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {/* 頭像 */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${user.gradient} flex items-center justify-center shrink-0`}>
                    <span className="text-white font-bold text-sm">{user.initials}</span>
                  </div>
                  {/* 資訊 */}
                  <div className="flex flex-col">
                    <span className="text-white font-semibold text-sm">{user.name}</span>
                    <span className="text-white/40 text-[10px]">封鎖日期: {user.date}</span>
                  </div>
                </div>

                {/* 解除封鎖按鈕 */}
                <button
                  onClick={() => handleUnblock(user.id)}
                  className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  解除封鎖
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* 空狀態 (Empty State) 防呆與 UX 優化 */
          <div className="flex flex-col items-center justify-center h-full pt-12 pb-24 opacity-50">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <UserX className="w-10 h-10 text-white/40" />
            </div>
            <p className="text-white font-medium mb-1">目前沒有封鎖任何人</p>
            <p className="text-white/50 text-xs">您封鎖的使用者將會顯示在這裡</p>
          </div>
        )}
      </div>

    </div>
  );
}