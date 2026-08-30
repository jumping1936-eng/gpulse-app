import React, { useState, useEffect } from 'react';
import { User, TribeType } from '@/types';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import TribeFilters from './TribeFilters';
import ExploreGrid from './ExploreGrid';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

type StoryUser = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  status?: string;
};

export default function ExploreTab() {
  const { user: authUser } = useAuth();
  const [viewingStory, setViewingStory] = useState<StoryUser | null>(null);
  const [activeTribe, setActiveTribe] = useState<TribeType>('all');

  // ✅ 真實資料庫狀態
  const [profiles, setProfiles] = useState<User[]>([]);
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 當使用者登入時，拉取真實名片資料
  const fetchRealProfiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('id', { ascending: true }); // 可依需求改為隨機排序

      if (error) throw error;

      if (data) {
        // 過濾：將自己與其他人分開，確保不會在探索網格看到自己兩次
        const others = data.filter(p => p.id !== authUser?.id);
        const mine = data.find(p => p.id === authUser?.id);
        
        setProfiles(others as User[]);
        setMyProfile((mine as User) || null);
      }
    } catch (error) {
      console.error('🔴 獲取真實名片失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser) {
      fetchRealProfiles();
    }
  }, [authUser, fetchRealProfiles]);

  // 載入中畫面
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto bg-slate-950 pb-28">
      {/* 
        ✅ 將真實資料作為 props 傳遞給子元件。
        請注意：您必須同步修改 StoriesBar 與 ExploreGrid 的內部程式碼，
        讓它們接收這些 props 並取代原本寫死的假資料！
      */}
      <StoriesBar 
        onViewStory={setViewingStory} 
        profiles={profiles} 
        myProfile={myProfile} 
      />
      
      <TribeFilters 
        active={activeTribe} 
        onChange={setActiveTribe} 
      />
      
      <ExploreGrid 
        activeTribe={activeTribe} 
        profiles={profiles} 
        myProfile={myProfile} 
      />

      {viewingStory && (
        <StoryViewer user={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </div>
  );
}