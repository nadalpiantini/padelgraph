'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { socialAPI } from '@/lib/api/social-api';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  has_liked?: boolean;
  created_at: string;
  author?: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await socialAPI.comments.list(postId);
    if (data) {
      setComments((data as any).comments || data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadComments();

    // Real-time subscription for new comments
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comment',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await socialAPI.comments.create(postId, newComment.trim());
      if (!error) {
        setNewComment('');
        await loadComments();
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-400">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-full text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </form>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentNode key={comment.id} comment={comment} onUpdate={loadComments} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  );
}

function CommentNode({ comment, onUpdate, depth = 0 }: { comment: Comment; onUpdate: () => void; depth?: number }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    setLiking(true);
    await socialAPI.comments.like(comment.id);
    setLiking(false);
    onUpdate();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await socialAPI.comments.create(
        comment.post_id,
        replyText.trim(),
        comment.id
      );
      if (!error) {
        setReplyText('');
        setShowReplyForm(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-4 border-l-2 border-slate-700/50' : ''}`}>
      <div className="p-3 bg-slate-700/30 rounded-lg">
        {/* Author & Content */}
        <div className="flex items-start gap-3">
          <img
            src={comment.author?.avatar_url || `https://i.pravatar.cc/40?u=${comment.user_id}`}
            alt={comment.author?.name}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">
                {comment.author?.name || 'User'}
              </span>
              <span className="text-slate-400">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-slate-200 mt-1">{comment.content}</p>

            {/* Actions */}
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
              <button
                onClick={handleLike}
                disabled={liking}
                className={`flex items-center gap-1 hover:text-red-400 ${
                  comment.has_liked ? 'text-red-400' : ''
                }`}
              >
                <Heart className={`w-4 h-4 ${comment.has_liked ? 'fill-current' : ''}`} />
                {comment.likes_count || 0}
              </button>

              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 hover:text-indigo-400"
              >
                <MessageCircle className="w-4 h-4" />
                Reply
              </button>
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <form onSubmit={handleReply} className="mt-3 ml-11 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-3 py-2 bg-slate-600/50 border border-slate-600 rounded-full text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={submitting || !replyText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
          </form>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} onUpdate={onUpdate} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
