import React, { useState, useEffect } from 'react';
import {
    Users, Car, FileText, Check, X, Eye,
    TrendingUp, DollarSign, Calendar, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import AdminLayout from "@/components/admin-layout";
import { api } from "@/api";
import { toast } from 'sonner';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({
        summary: { totalRevenue: 0, netRevenue: 0 },
        stats: { pendingBookings: 0, activeRentals: 0, totalCustomers: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [viewDocsBooking, setViewDocsBooking] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [financials, bookings] = await Promise.all([
                    api.get('/reports/financials'),
                    api.get('/bookings')
                ]);
                setStats(financials);
                setRequests(bookings.slice(0, 5)); // Show top 5 recent
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const getStatusBadge = (status) => {
        const s = status.toUpperCase();
        switch (s) {
            case 'PENDING': return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">Pending</Badge>;
            case 'VERIFIED': return <Badge variant="info" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Verified</Badge>;
            case 'APPROVED': return <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Approved</Badge>;
            case 'REJECTED': return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Rejected</Badge>;
            case 'PAID': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>;
            case 'ACTIVE': return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Active</Badge>;
            case 'COMPLETED': return <Badge variant="outline">Completed</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const handleAction = async (id, status) => {
        try {
            await api.patch(`/bookings/${id}/status`, { status });
            toast.success(`Booking ${status.toLowerCase()} successfully!`);
            const [financials, bookings] = await Promise.all([
                api.get('/reports/financials'),
                api.get('/bookings')
            ]);
            setStats(financials);
            setRequests(bookings.slice(0, 5));
        } catch (error) {
            toast.error(error.message || `Failed to ${status.toLowerCase()} booking`);
        }
    };


    return (
        <AdminLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
                    <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/financials')}>
                        <FileText size={16} />
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ETB {Number(stats?.summary?.totalRevenue || 0).toLocaleString()}</div>
                        <div className="flex flex-col gap-1 mt-2">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Refunds:</span>
                                <span className="text-red-500 font-medium">-{Number(stats?.summary?.totalRefunds || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] pt-1 border-t">
                                <span className="text-muted-foreground font-bold">Net Revenue:</span>
                                <span className="text-green-600 font-bold">ETB {Number(stats?.summary?.netRevenue || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.stats.pendingBookings}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-yellow-600">
                            Requires attention
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Rentals</CardTitle>
                        <Car className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.stats.activeRentals}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-blue-600">
                            Current in-use fleet
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.stats.totalCustomers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Registered user base
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Booking Requests Table */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <h3 className="font-bold text-lg">Recent Booking Requests</h3>
                        <p className="text-sm text-muted-foreground">Manage and verify new booking submissions.</p>
                    </div>
                    {loading && <Loader2 className="animate-spin text-primary" size={20} />}
                    {/* <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/5" onClick={() => navigate('/admin/bookings')}>View All</Button> */}
                </div>
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[100px]">Reference</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Vehicle Details</TableHead>
                            <TableHead>Date Range</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!loading && requests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No recent booking requests found.
                                </TableCell>
                            </TableRow>
                        )}
                        {requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-mono font-medium text-xs">BK-{req.id.toString().padStart(5, '0')}</TableCell>
                                <TableCell>
                                    <div className="font-medium text-sm">
                                        {req.user?.customerProfile?.firstName} {req.user?.customerProfile?.lastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{req.user?.email}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">{req.car?.make} {req.car?.model}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{req.car?.plateNumber}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs">{new Date(req.startDate).toLocaleDateString()}</div>
                                    <div className="text-xs text-muted-foreground">to {new Date(req.endDate).toLocaleDateString()}</div>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(req.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="View Docs" onClick={() => setViewDocsBooking(req)}>
                                            <Eye size={16} />
                                        </Button>
                                        {(req.status === 'PENDING' || req.status === 'VERIFIED') && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    title="Approve"
                                                    onClick={() => handleAction(req.id, 'APPROVED')}
                                                >
                                                    <Check size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    title="Reject"
                                                    onClick={() => handleAction(req.id, 'REJECTED')}
                                                >
                                                    <X size={16} />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* View Docs Modal */}
            <Dialog open={!!viewDocsBooking} onOpenChange={() => setViewDocsBooking(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Customer Documents — {viewDocsBooking?.user?.customerProfile?.firstName} {viewDocsBooking?.user?.customerProfile?.lastName}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-semibold mb-2 text-muted-foreground">National ID Card</p>
                            {viewDocsBooking?.user?.customerProfile?.idCardUrl ? (
                                <a href={api.getImageUrl(viewDocsBooking.user.customerProfile.idCardUrl)} target="_blank" rel="noreferrer">
                                    <img
                                        src={api.getImageUrl(viewDocsBooking.user.customerProfile.idCardUrl)}
                                        alt="ID Card"
                                        className="w-full rounded-lg border object-cover max-h-56"
                                    />
                                </a>
                            ) : (
                                <div className="flex items-center justify-center h-36 bg-muted rounded-lg text-muted-foreground text-sm">Not uploaded</div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold mb-2 text-muted-foreground">Driver's License</p>
                            {viewDocsBooking?.user?.customerProfile?.driverLicenseUrl ? (
                                <a href={api.getImageUrl(viewDocsBooking.user.customerProfile.driverLicenseUrl)} target="_blank" rel="noreferrer">
                                    <img
                                        src={api.getImageUrl(viewDocsBooking.user.customerProfile.driverLicenseUrl)}
                                        alt="Driver License"
                                        className="w-full rounded-lg border object-cover max-h-56"
                                    />
                                </a>
                            ) : (
                                <div className="flex items-center justify-center h-36 bg-muted rounded-lg text-muted-foreground text-sm">Not uploaded</div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AdminDashboard;
