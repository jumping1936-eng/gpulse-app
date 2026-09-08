export interface VisibleStoryMetadata {
  story_id: string;
  owner_id: string;
  created_at: string;
  expires_at: string;
  viewed_by_caller: boolean;
}

export interface VisibleStoryContent {
  story_id: string;
  owner_id: string;
  media_data: string;
  media_type: string;
  created_at: string;
  expires_at: string;
}

export interface OwnActiveStory {
  story_id: string;
  media_data: string;
  media_type: string;
  created_at: string;
  expires_at: string;
}

export interface StoryProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  public_photos: string[];
}

export type StorySelection =
  | { kind: 'own'; story: OwnActiveStory; profile: StoryProfile | null }
  | { kind: 'visible'; story: VisibleStoryMetadata; profile: StoryProfile | null };
