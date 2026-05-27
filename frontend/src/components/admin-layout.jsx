import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
    LayoutDashboard, Car, Users, Package, FileText, Menu, Bell, LogOut, Search, User, DollarSign, Navigation
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
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from 'react';
import PaymentDetailModal from '@/components/PaymentDetailModal';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';

const AdminLayout = ({ children }) => {
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
        // Refresh notifications every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const openPaymentFromNotification = async (notif) => {
        // mark db notification as read if applicable
        const markIfDb = async (n) => {
            try {
                if (!n) return;
                if (typeof n.id === 'string' && n.id.startsWith('db-')) {
                    const nid = parseInt(n.id.replace('db-', ''), 10);
                    if (!isNaN(nid)) await api.patch(`/reports/notifications/${nid}/read`, {});
                } else if (typeof n.id === 'number') {
                    await api.patch(`/reports/notifications/${n.id}/read`, {});
                }
                // refresh notifications count
                fetchNotifications();
            } catch (err) {
                console.error('Failed to mark notification read', err);
            }
        };

        await markIfDb(notif);
        try {
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
            else navigate('/admin/financials');
        } catch (error) {
            console.error('Failed to load transaction details:', error);
            navigate('/admin/financials');
        }
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/tracking', icon: Navigation, label: 'Live Tracking' },
        { path: '/admin/customers', icon: Users, label: 'Customers' },
        { path: '/admin/cars', icon: Car, label: 'Fleet Management' },
        { path: '/admin/employees', icon: Users, label: 'Employee Management' },
        { path: '/admin/drivers', icon: Navigation, label: 'Driver Management' },
        { path: '/admin/packages', icon: Package, label: 'Rental Packages' },
        { path: '/admin/financials', icon: DollarSign, label: 'Financials' },
    ];

    return (
        <div className="min-h-screen bg-background flex font-sans text-foreground">
            {/* Sidebar */}
            <Card className={`${sidebarOpen ? 'w-64' : 'w-20'} border-r border-border transition-all duration-300 fixed h-full z-20 flex flex-col shadow-sm rounded-none`}>
                <div className="h-20 flex items-center justify-center border-b border-border p-2">
                    {sidebarOpen ? (
                        <img src={logo} alt="Teddy Admin" className="w-20 h-20 object-contain" />
                    ) : (
                        <img src={logo} alt="TA" className="h-12 w-12 object-cover rounded" />
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
                            navigate('/admin/login');
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
                {/* Header */}
                <Card className="border-b border-border h-16 flex flex-row items-center justify-between px-6 sticky top-0 z-50 rounded-none shadow-md bg-card">
                    {/* Left Section: Menu Toggle + Search */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </Button>
                        <div className="relative w-96 hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search admin tasks, fleet, or staff..."
                                className="pl-10 bg-secondary/50 border-transparent focus:bg-background focus:border-primary/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Right Section: Notifications + Theme + User Profile */}
                    <div className="flex items-center gap-2">
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
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel>Admin Notifications</DropdownMenuLabel>
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

                                                    if (notif.category === 'Payment' || notif.category === 'Refund') await openPaymentFromNotification(notif);
                                                    else if (notif.category === 'Maintenance') navigate('/admin/cars');
                                                    else navigate('/admin/dashboard');
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

                        {/* Simulation control removed from header */}
                        {/* Theme Toggle */}
                        <ThemeToggle />

                        <Separator orientation="vertical" className="h-8 mx-1" />

                        {/* User Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                                        {user?.profile?.profilePhotoUrl ? (
                                            <AvatarImage src={api.getImageUrl(user.profile.profilePhotoUrl)} className="object-cover" />
                                        ) : null}
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {user?.profile?.firstName?.[0] || 'A'}{user?.profile?.lastName?.[0] || 'D'}
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
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/admin/profile')}>
                                    <User size={14} className="mr-2" /> Admin Profile
                                </DropdownMenuItem>

                                <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/security-settings')}>
                                    <FileText size={14} className="mr-2" /> Security Settings
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 cursor-pointer" 
                                    onSelect={() => {
                                        logout();
                                        navigate('/admin/login');
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

export default AdminLayout;
