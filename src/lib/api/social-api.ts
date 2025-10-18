/**
 * Social Feed API Client
 * Typed client for all social feed endpoints
 */

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class SocialAPI {
  private async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Feed endpoints
  feed = {
    list: () => this.request<any[]>('/api/feed'),
    like: (postId: string) =>
      this.request(`/api/posts/${postId}/like`, { method: 'POST' }),
    share: (postId: string, content?: string) =>
      this.request('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content }),
      }),
  };

  // Comments endpoints
  comments = {
    list: (postId: string) => this.request<any[]>(`/api/comments?post_id=${postId}`),
    create: (postId: string, content: string, parentId?: string) =>
      this.request('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content, parent_id: parentId }),
      }),
    like: (commentId: string) =>
      this.request(`/api/comments/${commentId}/like`, { method: 'POST' }),
  };

  // Stories endpoints
  stories = {
    list: () => this.request<any[]>('/api/stories'),
    create: (mediaUrls: Array<{ url: string; type: string; caption?: string }>) =>
      this.request('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_urls: mediaUrls }),
      }),
    view: (storyId: string) =>
      this.request(`/api/stories/${storyId}/view`, { method: 'POST' }),
  };

  // Notifications endpoints
  notifications = {
    list: (unreadOnly = false) =>
      this.request<any[]>(`/api/notifications?unread_only=${unreadOnly}`),
    markRead: (notificationIds: string[]) =>
      this.request('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      }),
  };

  // Follow endpoints
  follow = {
    follow: (followingId: string) =>
      this.request('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: followingId }),
      }),
    unfollow: (followingId: string) =>
      this.request(`/api/follow?following_id=${followingId}`, { method: 'DELETE' }),
  };

  // Discover endpoints
  discover = {
    trending: (type: 'all' | 'posts' | 'hashtags' | 'users' = 'all') =>
      this.request<any>(`/api/discover/trending?type=${type}`),
    search: (query: string, type: 'all' | 'posts' | 'users' | 'hashtags' = 'all') =>
      this.request<any>(`/api/discover/search?q=${encodeURIComponent(query)}&type=${type}`),
  };

  // Media endpoints
  media = {
    sign: (filename: string, contentType: string, fileSize: number) =>
      this.request<{ signed_url: string; path: string; public_url: string }>(
        '/api/media/sign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content_type: contentType, file_size: fileSize }),
        }
      ),
  };

  // Graph endpoints (for Six Degrees)
  graph = {
    nodes: () => this.request<any[]>('/api/graph/network'),
    shortestPath: (from: string, to: string) =>
      this.request<{ path: string[] }>(`/api/graph/connection?from=${from}&to=${to}`),
  };
}

export const socialAPI = new SocialAPI();
