import { motion } from 'framer-motion';
import { ArrowBigUp, ArrowBigDown, Bot, User, MessageSquare, Send, Loader2, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Author = { id: string; name: string } | null;

type Post = {
  id: string;
  authorType: 'AGENT' | 'HUMAN';
  authorUser: Author;
  agentName: string | null;
  agentStance: string | null;
  content: string;
  votes: number;
  userVote: number;
  createdAt: string;
  replies: Post[];
};

type Thread = {
  id: string;
  divergenceIndex: number;
  claim: string;
  wikipediaSays: string;
  independentSays: string;
  citationIndexes: number[];
  posts: Post[];
};

type DivergenceThreadsProps = {
  articleQuery: string;
  onCitationClick?: (index: number) => void;
  onRequestAuth: () => void;
};

type ReplyResult = { ok: true; agentReplied: boolean } | { ok: false; error?: string };

function updatePostInTree(posts: Post[], postId: string, updater: (p: Post) => Post): Post[] {
  return posts.map(p => {
    if (p.id === postId) return updater(p);
    if (p.replies.length > 0) return { ...p, replies: updatePostInTree(p.replies, postId, updater) };
    return p;
  });
}

function insertReplyInTree(posts: Post[], parentId: string, newPosts: Post[]): Post[] {
  return posts.map(p => {
    if (p.id === parentId) return { ...p, replies: [...p.replies, ...newPosts] };
    if (p.replies.length > 0) return { ...p, replies: insertReplyInTree(p.replies, parentId, newPosts) };
    return p;
  });
}

export const DivergenceThreads = ({ articleQuery, onCitationClick, onRequestAuth }: DivergenceThreadsProps) => {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/threads?articleQuery=${encodeURIComponent(articleQuery)}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setThreads(data.threads || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [articleQuery]);

  const applyToThread = (threadId: string, fn: (posts: Post[]) => Post[]) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, posts: fn(t.posts) } : t));
  };

  const handleVote = async (threadId: string, postId: string, value: 1 | -1) => {
    if (!session) {
      onRequestAuth();
      return;
    }
    try {
      const res = await fetch(`/api/threads/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      if (!res.ok) return;
      const data = await res.json();
      applyToThread(threadId, posts =>
        updatePostInTree(posts, postId, p => ({ ...p, votes: data.votes, userVote: data.userVote }))
      );
    } catch {
    }
  };

  const handleReply = async (threadId: string, parentId: string | undefined, content: string) => {
    if (!session) {
      onRequestAuth();
      return { ok: false as const };
    }
    const res = await fetch('/api/threads/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, parentId, content })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false as const, error: err.error || 'Failed to post reply' };
    }
    const data = await res.json();
    const newPosts: Post[] = [{ ...data.post, replies: [] }];
    if (data.agentReply) newPosts.push({ ...data.agentReply, replies: [] });

    applyToThread(threadId, posts =>
      parentId ? insertReplyInTree(posts, parentId, newPosts) : [...posts, ...newPosts]
    );
    return { ok: true as const, agentReplied: Boolean(data.agentReply) };
  };

  if (!loaded) return null;

  if (threads.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
        <Scale size={14} className="shrink-0" />
        <span>No significant divergence found between Wikipedia and independent sources for this topic.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {threads.map(thread => (
        <ThreadCard
          key={thread.id}
          thread={thread}
          onCitationClick={onCitationClick}
          onVote={handleVote}
          onReply={handleReply}
          isSignedIn={Boolean(session)}
          onRequestAuth={onRequestAuth}
        />
      ))}
    </div>
  );
};

type ThreadCardProps = {
  thread: Thread;
  onCitationClick?: (index: number) => void;
  onVote: (threadId: string, postId: string, value: 1 | -1) => void;
  onReply: (threadId: string, parentId: string | undefined, content: string) => Promise<ReplyResult>;
  isSignedIn: boolean;
  onRequestAuth: () => void;
};

const ThreadCard = ({ thread, onCitationClick, onVote, onReply, isSignedIn, onRequestAuth }: ThreadCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden"
    >
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-start gap-2 mb-3">
          <Scale size={16} className="text-gray-500 mt-0.5 shrink-0" />
          <p className="text-white font-medium">{thread.claim}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="text-gray-300">
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Wikipedia says</span>
            {thread.wikipediaSays}
          </div>
          <div className="text-gray-300">
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Independent sources say</span>
            {thread.independentSays}
            {thread.citationIndexes.length > 0 && (
              <span className="ml-2 inline-flex gap-1">
                {thread.citationIndexes.map(ci => (
                  <button
                    key={ci}
                    onClick={() => onCitationClick?.(ci)}
                    className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    [{ci}]
                  </button>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {thread.posts.map(post => (
          <PostNode key={post.id} threadId={thread.id} post={post} onVote={onVote} onReply={onReply} depth={0} onRequestAuth={onRequestAuth} />
        ))}
        <ReplyBox threadId={thread.id} parentId={undefined} onReply={onReply} isSignedIn={isSignedIn} placeholder="Add to the discussion..." onRequestAuth={onRequestAuth} />
      </div>
    </motion.div>
  );
};

type PostNodeProps = {
  threadId: string;
  post: Post;
  onVote: (threadId: string, postId: string, value: 1 | -1) => void;
  onReply: (threadId: string, parentId: string | undefined, content: string) => Promise<ReplyResult>;
  depth: number;
  onRequestAuth: () => void;
};

const PostNode = ({ threadId, post, onVote, onReply, depth, onRequestAuth }: PostNodeProps) => {
  const [replying, setReplying] = useState(false);

  return (
    <div className={depth > 0 ? "pl-4 border-l border-zinc-800" : ""}>
      <div className="bg-zinc-800/40 border border-zinc-800 rounded-md p-3">
        <div className="flex items-center gap-2 mb-2">
          {post.authorType === 'AGENT' ? (
            <>
              <Bot size={14} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">{post.agentName}</span>
              {post.agentStance && <span className="text-xs text-gray-500">· {post.agentStance}</span>}
            </>
          ) : (
            <>
              <User size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-300">{post.authorUser?.name || 'User'}</span>
            </>
          )}
        </div>

        <p className="text-sm text-gray-300 leading-relaxed mb-3">{post.content}</p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVote(threadId, post.id, 1)}
              className={`p-0.5 rounded transition-colors ${post.userVote === 1 ? 'text-orange-400' : 'text-gray-500 hover:text-orange-400'}`}
            >
              <ArrowBigUp size={16} fill={post.userVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className="text-xs font-medium text-gray-400 min-w-[1.5rem] text-center">{post.votes}</span>
            <button
              onClick={() => onVote(threadId, post.id, -1)}
              className={`p-0.5 rounded transition-colors ${post.userVote === -1 ? 'text-blue-400' : 'text-gray-500 hover:text-blue-400'}`}
            >
              <ArrowBigDown size={16} fill={post.userVote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>
          <button
            onClick={() => setReplying(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <MessageSquare size={12} />
            Reply
          </button>
        </div>

        {replying && (
          <div className="mt-3">
            <ReplyBox
              threadId={threadId}
              parentId={post.id}
              onReply={async (tId, pId, content) => {
                const result = await onReply(tId, pId, content);
                if (result.ok) setReplying(false);
                return result;
              }}
              isSignedIn={true}
              placeholder={`Reply to ${post.authorType === 'AGENT' ? post.agentName : post.authorUser?.name || 'this'}...`}
              onRequestAuth={onRequestAuth}
            />
          </div>
        )}
      </div>

      {post.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {post.replies.map(reply => (
            <PostNode key={reply.id} threadId={threadId} post={reply} onVote={onVote} onReply={onReply} depth={depth + 1} onRequestAuth={onRequestAuth} />
          ))}
        </div>
      )}
    </div>
  );
};

type ReplyBoxProps = {
  threadId: string;
  parentId: string | undefined;
  onReply: (threadId: string, parentId: string | undefined, content: string) => Promise<ReplyResult>;
  isSignedIn: boolean;
  placeholder: string;
  onRequestAuth: () => void;
};

const ReplyBox = ({ threadId, parentId, onReply, isSignedIn, placeholder, onRequestAuth }: ReplyBoxProps) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);

  if (!isSignedIn) {
    return (
      <button
        onClick={onRequestAuth}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Sign in to reply
      </button>
    );
  }

  const submit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setNote(null);
    const result = await onReply(threadId, parentId, content.trim());
    setSubmitting(false);
    if (result.ok) {
      setContent('');
      if (!result.agentReplied) {
        setNote({ text: "Posted. No agent reply this time, Gemini's overloaded right now, feel free to try again.", tone: 'info' });
      }
    } else {
      setNote({ text: result.error || 'Failed to post reply', tone: 'error' });
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={placeholder}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
        />
        <button
          onClick={submit}
          disabled={!content.trim() || submitting}
          className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 transition-colors"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
      {note && (
        <p className={`text-xs mt-2 ${note.tone === 'error' ? 'text-red-400' : 'text-gray-500'}`}>{note.text}</p>
      )}
    </div>
  );
};
