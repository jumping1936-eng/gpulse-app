import React, { useState } from 'react';
import { User } from '@/types';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import TribeFilters from './TribeFilters';
import ExploreGrid from './ExploreGrid';
import { TribeType } from '@/types';

export default function ExploreTab() {
  const [viewingStory, setViewingStory] = useState<User | null>(null);
  const [activeTribe, setActiveTribe] = useState<TribeType>('all');

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <StoriesBar onViewStory={setViewingStory} />
      <TribeFilters active={activeTribe} onChange={setActiveTribe} />
      <ExploreGrid activeTribe={activeTribe} />

      {viewingStory && (
        <StoryViewer user={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </div>
  );
}
