import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserX, Unlock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';

interface BlockedUser {
  id: string;
  blocked_id: string;
  name: string;
  initials: string;
  gradient: string;
  date: string;
  avatar?: string;
}

interface Props {
  onBack: () => void;
}

export default function BlockedUsersList({ onBack }: Props) {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const { unblockUser } = useApp();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const { data: blockRows, error: blockError } = await supabase
          .from('blocks')
          .select('*')
          .eq('blocker_id', user.id)
          .order('created_at', { ascending: false });

        if (blockError) throw blockError;

        const blockedIds = (blockRows ?? []).map((row) => row.blocked_id).filter(Boolean);
        if (!blockedIds.length) {
          setBlockedUsers([]);
          return;
        }

        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', blockedIds);

        if (profileError) throw profileError;

        const profileMap = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));

        const nextBlockedUsers = (blockRows ?? []).map((row) => {
          const profile = profileMap.get(row.blocked_id);
          const name = profile?.full_name || t('common.unknownName', '尚未設定名稱');
          const initials = name.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || '??';
          return {
            id: row.id,
            blocked_id: row.blocked_id,
            name,
            initials,
            gradient: 'from-orange-400 to-red-500',
            date: row.created_at ? new Date(row.created_at).toLocaleDateString(locale) : t('common.loading', '載入中…'),
            avatar: profile?.avatar_url,
          } satisfies BlockedUser;
        });

        setBlockedUsers(nextBlockedUsers);
      } catch (error) {
        console.error('載入封鎖名單失敗:', error);
        setBlockedUsers([]);
        alert('無法載入封鎖名單，請稍後再試。');
      } finally {
        setIsLoading(false);
      }
    };

    loadBlockedUsers();
  }, [locale, t, user?.id]);

  const handleUnblock = async (userId: string) => {
    if (!user?.id) return;

    try {
      await unblockUser(userId);
      setBlockedUsers(prev => prev.filter(row => row.blocked_id !== userId));
    } catch (error) {
      console.error('解除封鎖失敗:', error);
      alert('解除封鎖失敗，請稍後再試。');
    }
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
        <h1 className="text-white font-bold text-lg flex-1">{t('block.title', '封鎖名單管理')}</h1>
      </div>

      {/* 警告提示區塊 */}
      <div className="px-5 py-4 shrink-0">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-200/80 text-xs leading-relaxed">{t('block.confirmHint', '對方將無法看到您的個人檔案或聯繫您。')}</p>
        </div>
      </div>

      {/* 名單列表區塊 */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full py-12 text-sm text-slate-400">{t('common.loading', '載入中…')}</div>
        ) : blockedUsers.length > 0 ? (
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
                    <span className="text-white/40 text-[10px]">{t('block.title', '封鎖名單管理')}: {user.date}</span>
                  </div>
                </div>

                {/* 解除封鎖按鈕 */}
                <button
                  onClick={() => handleUnblock(user.blocked_id)}
                  className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  {t('block.unblock', '解除封鎖')}
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
            <p className="text-white font-medium mb-1">{t('block.empty', '目前沒有封鎖任何人')}</p>
            <p className="text-white/50 text-xs">{t('block.emptyHint', '您封鎖的使用者將會顯示在這裡')}</p>
          </div>
        )}
      </div>

    </div>
  );
}
