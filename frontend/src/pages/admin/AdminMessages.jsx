import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Search, Trash2, CheckCheck,
    Loader2, RefreshCw, Send, Circle, Clock, User
} from 'lucide-react';
import AdminLayout from '@/components/admin-layout';
import { api } from '@/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const fullTime = (date) =>
    new Date(date).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

const initials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/* ─── component ───────────────────────────────────────── */
const AdminMessages = () => {
    const [messages, setMessages]   = useState([]);
    const [selected, setSelected]   = useState(null);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [filter, setFilter]       = useState('all');
    const [replyText, setReplyText] = useState('');
    const [sending, setSending]     = useState(false);

    const bottomRef    = useRef(null);
    const textareaRef  = useRef(null);

    /* fetch all messages (with replies) */
    const fetchMessages = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.get('/contact');
            setMessages(data);
            // keep selected in sync
            if (selected) {
                const fresh = data.find(m => m.id === selected.id);
                if (fresh) setSelected(fresh);
            }
        } catch {
            toast.error('Failed to load messages.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMessages(); }, []);

    /* scroll to bottom whenever conversation changes */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selected?.replies?.length, selected?.id]);

    /* open a conversation */
    const handleSelect = async (msg) => {
        setSelected(msg);
        setReplyText('');
        if (!msg.isRead) {
            try {
                await api.patch(`/contact/${msg.id}/read`, {});
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            } catch (_) {}
        }
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    /* send a reply */
    const handleSend = async () => {
        if (!replyText.trim() || !selected) return;
        setSending(true);
        try {
            const reply = await api.post(`/contact/${selected.id}/reply`, { body: replyText.trim() });
            // optimistically append
            const updatedSelected = {
                ...selected,
                isRead: true,
                replies: [...(selected.replies || []), reply]
            };
            setSelected(updatedSelected);
            setMessages(prev => prev.map(m =>
                m.id === selected.id ? updatedSelected : m
            ));
            setReplyText('');
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        } catch (err) {
            toast.error(err.message || 'Failed to send reply.');
        } finally {
            setSending(false);
        }
    };

    /* send on Ctrl/Cmd + Enter */
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    /* delete */
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this conversation?')) return;
        try {
            await api.delete(`/contact/${id}`);
            setMessages(prev => prev.filter(m => m.id !== id));
            if (selected?.id === id) setSelected(null);
            toast.success('Conversation deleted.');
        } catch {
            toast.error('Failed to delete.');
        }
    };

    /* mark all read */
    const handleMarkAllRead = async () => {
        const unread = messages.filter(m => !m.isRead);
        await Promise.all(unread.map(m => api.patch(`/contact/${m.id}/read`, {}).catch(() => {})));
        setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
        if (selected) setSelected(prev => ({ ...prev, isRead: true }));
    };

    /* filtered list */
    const filtered = messages.filter(m => {
        const matchFilter =
            filter === 'unread' ? !m.isRead :
            filter === 'read'   ? m.isRead  : true;
        const q = search.toLowerCase();
        const matchSearch = !q ||
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.message.toLowerCase().includes(q);
        return matchFilter && matchSearch;
    });

    const unreadCount = messages.filter(m => !m.isRead).length;

    /* build the full thread: original message + replies interleaved by time */
    const thread = selected ? [
        { id: `orig-${selected.id}`, isReply: false, body: selected.message,
          senderName: selected.name, senderRole: 'CUSTOMER', createdAt: selected.createdAt },
        ...(selected.replies || []).map(r => ({ ...r, isReply: true }))
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];

    return (
        <AdminLayout>
            <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>

                {/* ── page header ── */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="text-primary" size={22} />
                        <h1 className="text-xl font-black text-foreground">Contact Messages</h1>
                        {unreadCount > 0 && (
                            <Badge className="bg-primary text-white text-xs">{unreadCount} unread</Badge>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1.5 text-xs">
                                <CheckCheck size={13} /> Mark all read
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => fetchMessages()} className="gap-1.5 text-xs">
                            <RefreshCw size={13} /> Refresh
                        </Button>
                    </div>
                </div>

                {/* ── main chat layout ── */}
                <div className="flex flex-1 rounded-2xl border border-border overflow-hidden shadow-sm bg-card min-h-0">

                    {/* ════ LEFT: inbox list ════ */}
                    <div className="w-80 flex-shrink-0 flex flex-col border-r border-border">

                        {/* search + filter */}
                        <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/40 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <div className="flex gap-1">
                                {['all', 'unread', 'read'].map(f => (
                                    <button key={f} onClick={() => setFilter(f)}
                                        className={`flex-1 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                                            filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                                        }`}>
                                        {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* list */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-16 text-muted-foreground">
                                    <Loader2 className="animate-spin mr-2" size={18} />
                                    <span className="text-sm">Loading…</span>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4 text-center">
                                    <MessageSquare size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm font-medium">No messages</p>
                                    <p className="text-xs mt-1 opacity-60">
                                        {filter === 'unread' ? 'All caught up!' : 'Nothing here yet.'}
                                    </p>
                                </div>
                            ) : filtered.map(msg => {
                                const replyCount = msg.replies?.length || 0;
                                const isActive = selected?.id === msg.id;
                                return (
                                    <button key={msg.id} onClick={() => handleSelect(msg)}
                                        className={`w-full text-left px-4 py-3.5 border-b border-border/50 transition-colors hover:bg-muted/50
                                            ${isActive ? 'bg-primary/10 border-l-[3px] border-l-primary' : ''}
                                            ${!msg.isRead && !isActive ? 'bg-primary/5' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                !msg.isRead ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {initials(msg.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <span className={`text-sm truncate ${!msg.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                                        {msg.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                                        {relativeTime(msg.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{msg.email}</p>
                                                <p className={`text-xs mt-0.5 truncate ${!msg.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {replyCount > 0
                                                        ? `${replyCount} repl${replyCount === 1 ? 'y' : 'ies'} · ${msg.message}`
                                                        : msg.message}
                                                </p>
                                            </div>
                                            {!msg.isRead && (
                                                <Circle size={8} className="text-primary fill-primary flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ════ RIGHT: conversation ════ */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {!selected ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                <MessageSquare size={52} className="mb-4 opacity-10" />
                                <p className="font-semibold text-base">Select a conversation</p>
                                <p className="text-sm mt-1 opacity-60">Pick a message from the left to start</p>
                            </div>
                        ) : (
                            <>
                                {/* conversation header */}
                                <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                            {initials(selected.name)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-sm leading-tight">{selected.name}</p>
                                            <p className="text-xs text-muted-foreground">{selected.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                                            <Clock size={11} /> {fullTime(selected.createdAt)}
                                        </span>
                                        <button onClick={() => handleDelete(selected.id)}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete conversation">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* ── thread ── */}
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-muted/20">
                                    {thread.map((item, idx) => {
                                        const isStaff = item.isReply;
                                        return (
                                            <div key={item.id || idx}
                                                className={`flex items-end gap-2.5 ${isStaff ? 'flex-row-reverse' : 'flex-row'} max-w-[78%] ${isStaff ? 'ml-auto' : 'mr-auto'}`}>

                                                {/* avatar */}
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                    isStaff ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {isStaff ? initials(item.senderName) : initials(selected.name)}
                                                </div>

                                                <div className={`flex flex-col gap-1 ${isStaff ? 'items-end' : 'items-start'}`}>
                                                    {/* sender label */}
                                                    <span className="text-[10px] text-muted-foreground px-1">
                                                        {isStaff
                                                            ? `${item.senderName} · ${item.senderRole}`
                                                            : selected.name}
                                                    </span>

                                                    {/* bubble */}
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm max-w-full ${
                                                        isStaff
                                                            ? 'bg-primary text-white rounded-br-sm'
                                                            : 'bg-card border border-border text-foreground rounded-bl-sm'
                                                    }`}>
                                                        {item.body}
                                                    </div>

                                                    {/* timestamp */}
                                                    <span className="text-[10px] text-muted-foreground px-1">
                                                        {relativeTime(item.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={bottomRef} />
                                </div>

                                {/* ── reply input ── */}
                                <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
                                    <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-0.5">
                                            <User size={12} className="text-white" />
                                        </div>
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            value={replyText}
                                            onChange={e => {
                                                setReplyText(e.target.value);
                                                // auto-grow
                                                e.target.style.height = 'auto';
                                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                            }}
                                            onKeyDown={handleKeyDown}
                                            placeholder={`Reply to ${selected.name}…`}
                                            className="flex-1 bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground py-0.5 min-h-[24px] max-h-[120px]"
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!replyText.trim() || sending}
                                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Send (Ctrl+Enter)"
                                        >
                                            {sending
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : <Send size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 text-right pr-1">
                                        Ctrl + Enter to send
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminMessages;
