// Social Feed Post Types

export interface Post {
  id: string;
  user_id: string;
  org_id?: string;
  content: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  visibility: 'public' | 'friends' | 'private' | 'org';
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    id: string;
    name: string | null;
    username: string;
    avatar_url: string | null;
    level: string | null;
  };
  // User interaction state
  has_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string | null;
    username: string;
    avatar_url: string | null;
  };
}

export interface CreatePostInput {
  content: string;
  media_urls?: string[];
  visibility?: 'public' | 'friends' | 'private' | 'org';
  org_id?: string;
}

export interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}
