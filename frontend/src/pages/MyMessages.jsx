import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    MessageSquare, Send, ArrowLeft, Loader2,
    CheckCheck, Clock, Plus, RefreshCw
} from 'lucide-react';
import { api } from '@/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

/* ─── helpers ─────────────────────────────────────────── */
const relativeTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fullTime = (date) =>
    new Date(date).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

const initials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

/* ─── component ───────────────────────────────────────── */
const MyMessages = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [conversations, setConversations] = useState([]);
    const [selected, setSelected]           = useState(null);
    const [loading, setLoading]             = useState(true);
    const [newMsg, setNewMsg]               = useState('');
    const [sending, setSending]             = useState(false);
    const [showNew, setShowNew]             = useState(false);
    const [newForm, setNewForm]             = useState({ name: '', email: '', message: '' });
    const [submitting, setSubmitting]       = useState(false);

    const bottomRef   = useRef(null);
    const textareaRef = useRef(null);

    /* pre-fill new form from user profile */
    useEffect(() => {
        if (user) {
            const name = user.profile
                ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
                : '';
            setNewForm(prev => ({
                ...prev,
                name: name || prev.name,
                email: user.email || prev.email
            }));
        }
    }, [user]);

    /* fetch conversations */
    const fetchConversations = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.get('/contact/my');
            setConversations(data);
            // keep selected in sync
            const openId = searchParams.get('id');
            if (openId) {
                const found = data.find(c => c.id === parseInt(openId));
                if (found) setSelected(found);
            } else if (selected) {
                const fresh = data.find(c => c.id === selected.id);
                if (fresh) setSelected(fresh);
            }
        } catch {
            toast.error('Failed to load conversations.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchConversations(); }, []);

    /* scroll to bottom on new reply */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selected?.replies?.length, selected?.id]);

    /* open a conversation */
    const handleSelect = (conv) => {
        setSelected(conv);
        setNewMsg('');
        setShowNew(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    /* send a follow-up message (new ContactMessage linked to same user) */
    const handleSendFollowUp = async () => {
        if (!newMsg.trim()) return;
        setSending(true);
        try {
            const res = await api.post('/contact', {
                name: user?.profile
                    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
                    : (user?.email || 'Customer'),
                email: user?.email || '',
                message: newMsg.trim()
            });
            toast.success('Message sent!');
            setNewMsg('');
            await fetchConversations(true);
            // open the new conversation
            if (res.id) {
                const fresh = await api.get(`/contact/my/${res.id}`);
                setSelected(fresh);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to send.');
        } finally {
            setSending(false);
        }
    };

    /* start a brand-new conversation */
    const handleNewConversation = async (e) => {
        e.preventDefault();
        if (!newForm.name.trim() || !newForm.email.trim() || !newForm.message.trim()) {
            toast.error('Please fill in all fields.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/contact', newForm);
            toast.success('Message sent! We will get back to you soon.');
            setShowNew(false);
            setNewForm(prev => ({ ...prev, message: '' }));
            await fetchConversations(true);
            if (res.id) {
                const fresh = await api.get(`/contact/my/${res.id}`);
                setSelected(fresh);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to send.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSendFollowUp();
        }
    };

    /* build thread for selected conversation */
    const thread = selected ? [
        {
            id: `orig-${selected.id}`,
            isStaff: false,
            body: selected.message,
            senderName: selected.name,
            createdAt: selected.createdAt
        },
        ...(selected.replies || []).map(r => ({
            id: r.id,
            isStaff: true,
            body: r.body,
            senderName: r.senderName,
            senderRole: r.senderRole,
            createdAt: r.createdAt
        }))
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];

    const hasUnreplied = selected && (selected.replies || []).length === 0;
    const lastIsStaff  = thread.length > 0 && thread[thread.length - 1].isStaff;

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-5xl mx-auto">

                {/* header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <MessageSquare className="text-primary" size={22} />
                        <h1 className="text-xl font-black text-foreground">My Messages</h1>
                        {conversations.filter(c => (c.replies || []).length > 0 && !c.isRead).length > 0 && (
                            <Badge className="bg-primary text-white text-xs">
                                {conversations.filter(c => (c.replies || []).length > 0).length} replied
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => fetchConversations()} className="gap-1.5 text-xs">
                            <RefreshCw size={13} /> Refresh
                        </Button>
                        <Button size="sm" onClick={() => { setShowNew(true); setSelected(null); }} className="gap-1.5 text-xs">
                            <Plus size={13} /> New Message
                        </Button>
                    </div>
                </div>

                {/* main layout */}
                <div className="flex rounded-2xl border border-border overflow-hidden shadow-sm bg-card" style={{ height: 'calc(100vh - 12rem)' }}>

                    {/* ════ LEFT: conversation list ════ */}
                    <div className="w-72 flex-shrink-0 flex flex-col border-r border-border">
                        <div className="px-4 py-3 border-b border-border flex-shrink-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversations</p>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-16 text-muted-foreground">
                                    <Loader2 className="animate-spin mr-2" size={16} />
                                    <span className="text-sm">Loading…</span>
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4 text-center">
                                    <MessageSquare size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm font-medium">No messages yet</p>
                                    <p className="text-xs mt-1 opacity-60">Send us a message and we'll reply here</p>
                                    <button
                                        onClick={() => setShowNew(true)}
                                        className="mt-3 text-xs text-primary hover:underline font-medium"
                                    >
                                        Start a conversation
                                    </button>
                                </div>
                            ) : conversations.map(conv => {
                                const replyCount = (conv.replies || []).length;
                                const hasReply   = replyCount > 0;
                                const isActive   = selected?.id === conv.id;
                                const lastReply  = hasReply ? conv.replies[conv.replies.length - 1] : null;
                                const preview    = lastReply ? lastReply.body : conv.message;

                                return (
                                    <button key={conv.id} onClick={() => handleSelect(conv)}
                                        className={`w-full text-left px-4 py-3.5 border-b border-border/50 transition-colors hover:bg-muted/50
                                            ${isActive ? 'bg-primary/10 border-l-[3px] border-l-primary' : ''}
                                            ${hasReply && !isActive ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                        <div className="flex items-start gap-2.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                hasReply ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {initials(conv.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <span className="text-xs font-semibold text-foreground truncate">
                                                        {hasReply ? 'Support replied' : 'Awaiting reply'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                                        {relativeTime(lastReply?.createdAt || conv.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{preview}</p>
                                                {hasReply && (
                                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                                                        <CheckCheck size={10} /> {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ════ RIGHT: thread / new message ════ */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* ── new conversation form ── */}
                        {showNew ? (
                            <div className="flex-1 flex flex-col">
                                <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
                                    <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
                                        <ArrowLeft size={16} />
                                    </button>
                                    <p className="font-bold text-foreground text-sm">New Message to Support</p>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 py-6">
                                    <form onSubmit={handleNewConversation} className="space-y-4 max-w-lg">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Your Name</label>
                                            <input
                                                type="text"
                                                value={newForm.name}
                                                onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
                                                required
                                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/20 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={newForm.email}
                                                onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))}
                                                required
                                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/20 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Message</label>
                                            <textarea
                                                rows={5}
                                                value={newForm.message}
                                                onChange={e => setNewForm(p => ({ ...p, message: e.target.value }))}
                                                required
                                                placeholder="How can we help you?"
                                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted/20 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                            />
                                        </div>
                                        <Button type="submit" disabled={submitting} className="gap-2">
                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            {submitting ? 'Sending…' : 'Send Message'}
                                        </Button>
                                    </form>
                                </div>
                            </div>

                        ) : !selected ? (
                            /* ── empty state ── */
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                <MessageSquare size={52} className="mb-4 opacity-10" />
                                <p className="font-semibold text-base">No conversation selected</p>
                                <p className="text-sm mt-1 opacity-60">Pick one from the left or start a new one</p>
                                <button
                                    onClick={() => setShowNew(true)}
                                    className="mt-4 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                    <Plus size={14} /> New Message
                                </button>
                            </div>

                        ) : (
                            /* ── conversation thread ── */
                            <>
                                {/* header */}
                                <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                            TC
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-sm">Teddy Car Rental Support</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock size={10} /> Started {fullTime(selected.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* reply status badge */}
                                    {(selected.replies || []).length > 0 ? (
                                        <Badge className="bg-emerald-500 text-white text-xs gap-1">
                                            <CheckCheck size={11} /> Replied
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                            Awaiting reply
                                        </Badge>
                                    )}
                                </div>

                                {/* thread */}
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-muted/20">
                                    {/* date separator */}
                                    <div className="flex justify-center">
                                        <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                            {fullTime(selected.createdAt)}
                                        </span>
                                    </div>

                                    {thread.map((item) => (
                                        <div key={item.id}
                                            className={`flex items-end gap-2.5 ${item.isStaff ? 'flex-row' : 'flex-row-reverse'} max-w-[78%] ${item.isStaff ? 'mr-auto' : 'ml-auto'}`}>

                                            {/* avatar */}
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                item.isStaff ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {item.isStaff ? 'TC' : initials(selected.name)}
                                            </div>

                                            <div className={`flex flex-col gap-1 ${item.isStaff ? 'items-start' : 'items-end'}`}>
                                                <span className="text-[10px] text-muted-foreground px-1">
                                                    {item.isStaff ? `${item.senderName} · Support` : 'You'}
                                                </span>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm max-w-full ${
                                                    item.isStaff
                                                        ? 'bg-card border border-border text-foreground rounded-bl-sm'
                                                        : 'bg-primary text-white rounded-br-sm'
                                                }`}>
                                                    {item.body}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground px-1">
                                                    {relativeTime(item.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* "awaiting reply" indicator */}
                                    {hasUnreplied && (
                                        <div className="flex justify-center">
                                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                                <Loader2 size={10} className="animate-spin" />
                                                Waiting for support to reply…
                                            </span>
                                        </div>
                                    )}

                                    <div ref={bottomRef} />
                                </div>

                                {/* follow-up input — only show after staff has replied */}
                                {lastIsStaff && (
                                    <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
                                        <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-0.5">
                                                <span className="text-[9px] font-bold text-white">{initials(selected.name)}</span>
                                            </div>
                                            <textarea
                                                ref={textareaRef}
                                                rows={1}
                                                value={newMsg}
                                                onChange={e => {
                                                    setNewMsg(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                                                }}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Send a follow-up message…"
                                                className="flex-1 bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground py-0.5 min-h-[24px] max-h-[100px]"
                                            />
                                            <button
                                                onClick={handleSendFollowUp}
                                                disabled={!newMsg.trim() || sending}
                                                className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1.5 text-right pr-1">Ctrl + Enter to send</p>
                                    </div>
                                )}

                                {/* if still awaiting, show a note instead of input */}
                                {hasUnreplied && (
                                    <div className="px-6 py-3 border-t border-border bg-card flex-shrink-0 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            We'll notify you here once support replies. You can also check back anytime.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyMessages;
