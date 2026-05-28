import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import logo from '../assets/logo.png';
import {
    LayoutDashboard, Car, Users, Package, DollarSign, ClipboardList, Menu, Bell, LogOut, Search, User, FileText, Navigation, MessageSquare
} from 'lucide-react';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import PaymentDetailModal from '@/components/PaymentDetailModal';
import { ThemeToggle } from "@/components/theme-toggle";

const EmployeeLayout = ({ children }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    // Real Notifications
    const [notifications, setNotifications] = useState([]);
    const [txModal, setTxModal] = useState({ open: false, tx: null });

    const fetchNotifications = async () => {
        try {
            const data = await api.get('/reports/notifications');
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const openPaymentFromNotification = async (notif) => {
        try {
            // mark db notification as read if applicable
            try {
                if (notif) {
                    if (typeof notif.id === 'string' && notif.id.startsWith('db-')) {
                        const nid = parseInt(notif.id.replace('db-', ''), 10);
                        if (!isNaN(nid)) await api.patch(`/reports/notifications/${nid}/read`, {});
                    } else if (typeof notif.id === 'number') {
                        await api.patch(`/reports/notifications/${notif.id}/read`, {});
                    }
                    fetchNotifications();
                }
            } catch (mErr) {
                console.error('Failed to mark notification read', mErr);
            }
            const txs = await api.get('/reports/transactions');
            let found = null;
            const txMatch = (notif.message || '').match(/tx-(\d+)/i);
            if (txMatch) {
                const id = parseInt(txMatch[1], 10);
                found = txs.find(t => t.id === id || t.transactionRef === `TX-${id}`);
            }
            if (!found) {
                const bookingMatch = (notif.message || '').match(/booking\s*(?:#|id\s*)?(\d+)/i);
                if (bookingMatch) {
                    const bId = parseInt(bookingMatch[1], 10);
                    found = txs.find(t => t.bookingId === bId || (t.booking && t.booking.id === bId));
                }
            }
            if (!found) found = txs.find(t => t.type === 'PAYMENT' || t.type === 'REFUND');

            if (found) setTxModal({ open: true, tx: found });
            else navigate('/employee/reports');
        } catch (error) {
            console.error('Failed to load transaction details:', error);
            navigate('/employee/reports');
        }
    };

    const newRequestsCount = notifications.filter(n => n.category === 'Booking').length;
    const pendingActionsCount = notifications.filter(n => n.category === 'Maintenance').length;

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/tracking', icon: Navigation, label: 'Live Tracking' },
        { path: '/employee/cars', icon: Car, label: 'Cars' },
        { path: '/employee/packages', icon: Package, label: 'Packages' },
        { path: '/employee/customers', icon: Users, label: 'Customers' },
        { path: '/employee/reports', icon: ClipboardList, label: 'Reports' },
        { path: '/admin/messages', icon: MessageSquare, label: 'Messages' },
    ];

    return (
        <div className="min-h-screen bg-background flex font-sans text-foreground">
            {/* Sidebar - Using Card component for shadcn pattern */}
            <Card className={`${sidebarOpen ? 'w-64' : 'w-20'} border-r border-border transition-all duration-300 fixed h-full z-20 flex flex-col shadow-sm rounded-none`}>
                <div className="h-20 flex items-center justify-center border-b border-border p-2">
                    {sidebarOpen ? (
                        <img src={logo} alt="Teddy Employee" className="w-20 h-20 object-contain" />
                    ) : (
                        <img src={logo} alt="TE" className="h-12 w-12 object-cover rounded" />
                    )}
                </div>

                <ScrollArea className="flex-1">
                    <nav className="mt-6 px-3 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors group ${active
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    <Icon size={20} className={active ? 'group-hover:scale-110 transition-transform' : 'group-hover:text-primary transition-colors'} />
                                    {sidebarOpen && <span className="ml-3">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </ScrollArea>

                <Separator />

                <div className="p-4">
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="flex w-full items-center px-4 py-3 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="ml-3 font-medium">Logout</span>}
                    </button>
                </div>
            </Card>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Top Header - Using Card component */}
                <Card className="border-b border-border h-16 flex flex-row items-center justify-between px-6 sticky top-0 z-50 rounded-none shadow-md bg-card">
                    {/* Left Section: Menu Toggle */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </Button>
                        {/* Notifications Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
                                    <Bell size={20} />
                                    {notifications.length > 0 && (
                                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full ring-2 ring-card animate-pulse"></span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-80">
                                <DropdownMenuLabel>Staff Notifications</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-64">
                                    {notifications.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                                            <Bell size={40} className="mb-2 opacity-20" />
                                            <p className="text-xs">No new notifications</p>
                                        </div>
                                    )}
                                        {notifications.map((notif) => (
                                        <DropdownMenuItem 
                                            key={notif.id} 
                                            className="flex flex-col items-start py-3 cursor-pointer"
                                            onSelect={async () => {
                                                try {
                                                    if (typeof notif.id === 'string' && notif.id.startsWith('db-')) {
                                                        const nid = parseInt(notif.id.replace('db-', ''), 10);
                                                        if (!isNaN(nid)) await api.patch(`/reports/notifications/${nid}/read`, {});
                                                    } else if (typeof notif.id === 'number') {
                                                        await api.patch(`/reports/notifications/${notif.id}/read`, {});
                                                    }
                                                    fetchNotifications();
                                                } catch (err) {
                                                    console.error('Failed to mark read', err);
                                                }

                                                if (notif.category === 'Maintenance') navigate('/employee/cars');
                                                else if (notif.category === 'Booking') navigate('/employee/reports');
                                                else if (notif.category === 'Payment' || notif.category === 'Refund') await openPaymentFromNotification(notif);
                                                else if (notif.category === 'Contact') navigate('/admin/messages');
                                                else navigate('/employee/reports');
                                            }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={notif.type === 'critical' ? 'destructive' : 'info'} className="text-[10px] px-1.5 h-4 uppercase">
                                                    {notif.category || notif.type}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                                            </div>
                                            <span className="text-xs font-semibold leading-tight">{notif.message}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Right Section: Theme Toggle + User Profile */}
                    <div className="flex items-center gap-2">
                        {/* Simulation control removed from header */}
                        {/* Theme Toggle */}
                        <ThemeToggle />

                        <Separator orientation="vertical" className="h-8" />

                        {/* User Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                                        {user?.profile?.profilePhotoUrl ? (
                                            <AvatarImage src={api.getImageUrl(user.profile.profilePhotoUrl)} className="object-cover" />
                                        ) : null}
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {user?.profile?.firstName?.[0] || 'E'}{user?.profile?.lastName?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-sm font-semibold text-foreground leading-none">
                                            {user?.profile?.firstName} {user?.profile?.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role.toLowerCase()}</p>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/employee/profile')}>
                                    <User size={14} className="mr-2" /> My Profile
                                </DropdownMenuItem>

                                <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/security-settings')}>
                                    <FileText size={14} className="mr-2" /> Settings
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 cursor-pointer"
                                    onSelect={() => {
                                        logout();
                                        navigate('/login');
                                    }}
                                >
                                    <LogOut size={14} className="mr-2" /> Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </Card>
                <PaymentDetailModal open={txModal.open} onOpenChange={(open) => { if (!open) setTxModal({ open: false, tx: null }); }} transaction={txModal.tx} />

                {/* Page Content */}
                <main className="flex-1 p-8 bg-muted/30">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default EmployeeLayout;
