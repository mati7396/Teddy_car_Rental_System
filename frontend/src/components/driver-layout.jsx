import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import logo from '../assets/logo.png';
import {
    LayoutDashboard, LogOut, Menu, User, FileText, Navigation, Bell
} from 'lucide-react';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { ThemeToggle } from "@/components/theme-toggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const DriverLayout = ({ children }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    const { t } = useTranslation();

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/driver/dashboard', icon: LayoutDashboard, label: t('driver.dashboard', 'Dashboard') },
        { path: '/driver/deliveries', icon: Navigation, label: t('driver.assignedDeliveries', 'Assigned Deliveries') },
        { path: '/driver/profile', icon: User, label: t('driver.myProfile', 'Profile') },
    ];

    return (
        <div className="min-h-screen bg-background flex font-sans text-foreground">
            {/* Sidebar */}
            <Card className={`${sidebarOpen ? 'w-64' : 'w-20'} border-r border-border transition-all duration-300 fixed h-full z-20 flex flex-col shadow-sm rounded-none`}>
                <div className="h-20 flex items-center justify-center border-b border-border p-2">
                    {sidebarOpen ? (
                        <img src={logo} alt="Teddy Driver" className="w-20 h-20 object-contain" />
                    ) : (
                        <img src={logo} alt="TD" className="h-12 w-12 object-cover rounded" />
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

                <div className="p-4 border-t border-border/40">
                    <button
                        onClick={() => {
                            logout();
                            navigate('/driver/login');
                        }}
                        className="flex w-full items-center px-4 py-3 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="ml-3 font-medium">{t('driver.logout', 'Logout')}</span>}
                    </button>
                </div>
            </Card>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Top Header */}
                <Card className="border-b border-border h-16 flex flex-row items-center justify-between px-6 sticky top-0 z-50 rounded-none shadow-md bg-card">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </Button>
                        <h2 className="text-sm font-semibold text-muted-foreground hidden md:block">{t('driver.portal', 'Driver Portal')}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <Separator orientation="vertical" className="h-8" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                                        <AvatarImage src={api.getImageUrl(user?.profilePictureUrl)} className="object-cover" />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {user?.fullName?.[0] || 'D'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-sm font-semibold text-foreground leading-none">
                                            {user?.fullName}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>{t('driver.myAccount', 'My Account')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/driver/profile')}>
                                    <User size={14} className="mr-2" /> {t('driver.myProfile', 'Profile')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 cursor-pointer"
                                    onSelect={() => {
                                        logout();
                                        navigate('/driver/login');
                                    }}
                                >
                                    <LogOut size={14} className="mr-2" /> {t('driver.logout', 'Logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </Card>

                {/* Page Content */}
                <main className="flex-1 p-8 bg-muted/30">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DriverLayout;
