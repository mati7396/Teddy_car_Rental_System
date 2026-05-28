import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from "date-fns";
import {
    CheckCircle, CheckCircle2, XCircle, Eye, FileCheck, ClipboardCheck, AlertCircle, TrendingUp,
    Loader2, Navigation, Flag, Car as CarIcon, Users, Truck
} from 'lucide-react';
import { toast } from "sonner";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import EmployeeLayout from "@/components/employee-layout";
import { api } from "@/api";
import MapSelector from "@/components/MapSelector";

// Helper function to parse coordinates from pickupLocation string
const parseCoordinates = (locationString) => {
    if (!locationString) return null;

    // Check if it's in the format "Lat: X.XX, Lng: Y.YY" or "Address (Lat: X, Lng: Y)"
    const coordMatch = locationString.match(/Lat:\s*([\d.-]+),?\s*Lng:\s*([\d.-]+)/i);
    if (coordMatch && coordMatch[1] && coordMatch[2]) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2].replace(')', '')); // Handle case where it ends with )
        if (!isNaN(lat) && !isNaN(lng)) {
            return [lat, lng];
        }
    }
    return null;
};

const EmployeeDashboard = () => {
    const { t } = useTranslation();
    // Modal states
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [assignCarModalOpen, setAssignCarModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [verificationNotes, setVerificationNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedCar, setSelectedCar] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');

    const [requests, setRequests] = useState([]);
    const [availableCars, setAvailableCars] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [deliveryLocation, setDeliveryLocation] = useState('');
    const [financials, setFinancials] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [bookings, cars, drivers, finData] = await Promise.all([
                    api.get('/bookings'),
                    api.get('/cars'),
                    api.get('/bookings/drivers/available'),
                    api.get('/reports/financials')
                ]);
                setRequests(bookings);
                setAvailableCars(cars.filter(c => c.status === 'AVAILABLE'));
                setAvailableDrivers(drivers);
                setFinancials(finData);
            } catch (error) {
                console.error('Failed to fetch employee dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
            case 'DOCUMENTS_SUBMITTED': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Docs Submitted</Badge>;
            case 'VERIFIED': return <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
            case 'APPROVED': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
            case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
            case 'ACTIVE': return <Badge className="bg-primary/10 text-primary border-primary/20">Active Rental</Badge>;
            case 'COMPLETED': return <Badge variant="outline">Completed</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };


    const handleViewDetails = (request) => {
        console.log('--- Viewing Booking Details ---');
        console.log('Request Data:', request);
        console.log('Payment Data:', request.payment);
        setSelectedRequest(request);
        setDetailsModalOpen(true);
    };

    const handleVerifyDocuments = (request) => {
        setSelectedRequest(request);
        setVerifyModalOpen(true);
    };

    const handleApproveBooking = (request) => {
        setSelectedRequest(request);
        setApproveModalOpen(true);
    };

    const handleRejectBooking = (request) => {
        setSelectedRequest(request);
        setRejectModalOpen(true);
    };

    const handleAssignCar = (request) => {
        setSelectedRequest(request);
        setAssignCarModalOpen(true);
    };

    const confirmVerification = async (approved) => {
        console.log('--- confirmVerification ---');
        console.log('Approved:', approved);
        console.log('Selected Request:', selectedRequest);

        if (!selectedRequest?.id) {
            console.error('No request ID found in selectedRequest');
            toast.error("No request selected");
            return;
        }
        try {
            const status = approved ? 'VERIFIED' : 'REJECTED';
            console.log(`Sending PATCH request to /bookings/${selectedRequest.id}/status with status: ${status}`);

            toast.loading(approved ? "Verifying documents..." : "Rejecting documents...", { id: 'verify-task' });
            const updatedBooking = await api.patch(`/bookings/${selectedRequest.id}/status`, { status });

            console.log('PATCH Response:', updatedBooking);

            setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedBooking : r));
            setVerifyModalOpen(false);
            setVerificationNotes('');
            toast.success(approved ? t('employee.docsVerified') : t('employee.docsRejected'), { id: 'verify-task' });
        } catch (error) {
            console.error('Failed to update verification status:', error);
            toast.error(error.message || "Failed to update status", { id: 'verify-task' });
        }
    };

    const confirmApproval = async () => {
        console.log('--- confirmApproval ---');
        console.log('Selected Request:', selectedRequest);

        if (!selectedRequest?.id) {
            console.error('No request ID found in selectedRequest');
            toast.error("No request selected");
            return;
        }

        if (selectedRequest.isDelivery && !driverName) {
            toast.error("Please assign a company driver for this delivery");
            return;
        }

        try {
            console.log(`Sending PATCH request to /bookings/${selectedRequest.id}/status with status: APPROVED`);

            toast.loading("Approving booking...", { id: 'approve-task' });
            const updatedBooking = await api.patch(`/bookings/${selectedRequest.id}/status`, {
                status: 'APPROVED',
                assignedDriver: driverName
            });

            console.log('PATCH Response:', updatedBooking);

            setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedBooking : r));
            setApproveModalOpen(false);
            setDriverName('');
            toast.success("Booking approved successfully", { id: 'approve-task' });
        } catch (error) {
            console.error('Failed to approve booking:', error);
            toast.error(error.message || "Failed to approve booking", { id: 'approve-task' });
        }
    };

    const confirmRejection = async () => {
        if (!selectedRequest?.id) {
            toast.error("No request selected");
            return;
        }
        try {
            toast.loading("Rejecting booking...", { id: 'reject-task' });
            const updatedBooking = await api.patch(`/bookings/${selectedRequest.id}/status`, { status: 'REJECTED' });
            setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedBooking : r));
            setRejectModalOpen(false);
            setRejectionReason('');
            toast.success("Booking rejected", { id: 'reject-task' });
        } catch (error) {
            console.error('Failed to reject booking:', error);
            toast.error(error.message || "Failed to reject booking", { id: 'reject-task' });
        }
    };

    const confirmCarAssignment = async () => {
        if (!selectedRequest?.id) {
            toast.error("No request selected");
            return;
        }

        if (selectedRequest.isDelivery) {
            if (!selectedDriverId) {
                toast.error("Please select a driver for delivery");
                return;
            }
            if (!deliveryLocation) {
                toast.error("Please enter delivery location");
                return;
            }
        }

        try {
            toast.loading("Processing...", { id: 'assign-task' });

            // Assign driver whenever one is selected (delivery OR optional assignment)
            if (selectedDriverId) {
                await api.patch(`/bookings/${selectedRequest.id}/assign-driver`, {
                    driverId: parseInt(selectedDriverId),
                    deliveryLocation: deliveryLocation || 'Office Pickup'
                });
            }

            const updatedBooking = await api.patch(`/bookings/${selectedRequest.id}/status`, {
                status: 'ACTIVE'
            });

            setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedBooking : r));
            setAssignCarModalOpen(false);
            setSelectedDriverId('');
            setDeliveryLocation('');
            toast.success(
                selectedDriverId
                    ? "Driver assigned & trip started"
                    : t('employee.tripStarted'),
                { id: 'assign-task' }
            );
        } catch (error) {
            console.error('Failed to assign driver/start trip:', error);
            toast.error(error.message || "Failed to process request", { id: 'assign-task' });
        }
    };

    const confirmTripCompletion = async () => {
        if (!selectedRequest?.id) {
            toast.error("No request selected");
            return;
        }
        try {
            toast.loading("Finalizing trip...", { id: 'complete-task' });
            const updatedBooking = await api.patch(`/bookings/${selectedRequest.id}/status`, {
                status: 'COMPLETED'
            });
            setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedBooking : r));
            setCompleteModalOpen(false);
            toast.success(t('employee.tripCompleted'), { id: 'complete-task' });
        } catch (error) {
            console.error('Failed to complete trip:', error);
            toast.error(error.message || "Failed to complete trip", { id: 'complete-task' });
        }
    };

    const stats = {
        pendingVerifications: requests.filter(r => r.status === 'PENDING').length,
        pendingApprovals: requests.filter(r => r.status === 'VERIFIED').length,
        activeBookings: requests.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE').length,
        availableCarsCount: availableCars.length,
        pendingCars: requests.filter(r => r.status === 'PENDING' || r.status === 'VERIFIED' || r.status === 'APPROVED').length
    };


    return (
        <EmployeeLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Requests Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage customer bookings and verify documents</p>
                </div>
            </div>

            {/* Stats Grid - Using shadcn Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verifications</CardTitle>
                        <FileCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            {stats.pendingVerifications > 0 && <AlertCircle size={12} />}
                            {stats.pendingVerifications > 0 ? 'Requires attention' : 'All clear'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ETB {Number(financials?.summary?.totalRevenue || 0).toLocaleString()}
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Refunds:</span>
                                <span className="text-red-500 font-medium">-{Number(financials?.summary?.totalRefunds || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] pt-1 border-t">
                                <span className="text-muted-foreground font-bold">Net Revenue:</span>
                                <span className="text-green-600 font-bold">ETB {Number(financials?.summary?.netRevenue || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-blue-600 dark:text-blue-400">
                            Ready for approval
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Rentals</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeBookings}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-green-600 dark:text-green-400">
                            Current operations
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Available Cars</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.availableCarsCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ready to assign
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Cars</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingCars}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-orange-600 dark:text-orange-400">
                            Trips not started
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Requests Table - Using shadcn Card and ScrollArea */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <h3 className="font-bold text-lg">Customer Booking Requests</h3>
                        <p className="text-sm text-muted-foreground">Verify documents, approve bookings, and assign cars</p>
                    </div>
                </div>
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[100px]">Reference</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        <Loader2 className="animate-spin inline-block mr-2" />
                                        Loading requests...
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && requests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No booking requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-mono font-medium text-xs">#{req.id}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-sm">
                                            {req.user?.customerProfile ? `${req.user.customerProfile.firstName} ${req.user.customerProfile.lastName}` : 'N/A'}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{req.user?.email}</div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {req.package ? (
                                            <>
                                                <span className="font-medium text-primary">{req.package.name}</span>
                                                <div className="text-[10px] text-muted-foreground">{req.package.category} | {req.package.period}</div>
                                            </>
                                        ) : (
                                            <>
                                                {req.car?.make} {req.car?.model}
                                                <div className="text-[10px] text-muted-foreground">Plate: {req.car?.plateNumber}</div>
                                            </>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-[10px]">
                                        {new Date(req.startDate).toLocaleString()} to {new Date(req.endDate).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(req.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title="View Details"
                                                onClick={() => handleViewDetails(req)}
                                            >
                                                <Eye size={16} />
                                            </Button>
                                            {req.status === 'PENDING' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                    title="Verify Documents"
                                                    onClick={() => handleVerifyDocuments(req)}
                                                >
                                                    <FileCheck size={16} />
                                                </Button>
                                            )}
                                            {req.status === 'VERIFIED' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        title="Approve Booking"
                                                        onClick={() => handleApproveBooking(req)}
                                                    >
                                                        <CheckCircle size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Reject Booking"
                                                        onClick={() => handleRejectBooking(req)}
                                                    >
                                                        <XCircle size={16} />
                                                    </Button>
                                                </>
                                            )}
                                            {(req.status === 'APPROVED' || req.status === 'PAID') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                    title="Assign Car & Driver"
                                                    onClick={() => handleAssignCar(req)}
                                                >
                                                    <FileCheck size={16} />
                                                </Button>
                                            )}
                                            {req.status === 'ACTIVE' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                    title="Complete Trip"
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setCompleteModalOpen(true);
                                                    }}
                                                >
                                                    <Flag size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </Card>


            {/* Modals remain the same but using shadcn Dialog */}
            <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Verify Documents - {selectedRequest?.id}</DialogTitle>
                        <DialogDescription>
                            Review the uploaded documents for {selectedRequest?.customer}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">Uploaded Documents:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-4 text-center bg-muted/30 overflow-hidden">
                                        {selectedRequest?.driverLicenseUrl ? (
                                            <img
                                                src={api.getImageUrl(selectedRequest.driverLicenseUrl)}
                                                alt="License"
                                                className="h-32 w-full object-cover rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => window.open(api.getImageUrl(selectedRequest.driverLicenseUrl), '_blank')}
                                            />
                                        ) : (
                                            <FileCheck className="mx-auto mb-2 text-primary" size={32} />
                                        )}
                                        <p className="text-sm font-medium">Driver's License</p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => window.open(api.getImageUrl(selectedRequest?.driverLicenseUrl), '_blank')}
                                        >
                                            View Full Size
                                        </Button>
                                    </Card>
                                    <Card className="p-4 text-center bg-muted/30 overflow-hidden">
                                        {selectedRequest?.idCardUrl ? (
                                            <img
                                                src={api.getImageUrl(selectedRequest.idCardUrl)}
                                                alt="ID Card"
                                                className="h-32 w-full object-cover rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => window.open(api.getImageUrl(selectedRequest.idCardUrl), '_blank')}
                                            />
                                        ) : (
                                            <FileCheck className="mx-auto mb-2 text-primary" size={32} />
                                        )}
                                        <p className="text-sm font-medium">ID Card</p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => window.open(api.getImageUrl(selectedRequest?.idCardUrl), '_blank')}
                                        >
                                            View Full Size
                                        </Button>
                                    </Card>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Verification Notes</label>
                                <Textarea
                                    placeholder="Add notes about the document verification..."
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => confirmVerification(false)}>
                            <XCircle size={16} className="mr-2" />
                            Reject Documents
                        </Button>
                        <Button onClick={() => confirmVerification(true)}>
                            <CheckCircle size={16} className="mr-2" />
                            Approve Documents
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
                <DialogContent>
                    <div className="max-h-[70vh] overflow-y-auto px-1">
                        <DialogHeader className="mb-4">
                            <DialogTitle>Approve Booking - {selectedRequest?.id}</DialogTitle>
                            <DialogDescription>
                                Confirm booking approval for {selectedRequest?.customer}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
                                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">Customer & Booking</h4>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">{selectedRequest?.user?.customerProfile ? `${selectedRequest.user.customerProfile.firstName} ${selectedRequest.user.customerProfile.lastName}` : 'N/A'}</span>

                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="font-medium">{selectedRequest?.package ? 'Package Booking' : 'Car Rental'}</span>

                                    {selectedRequest?.package ? (
                                        <>
                                            <span className="text-muted-foreground">Package:</span>
                                            <span className="font-medium text-primary">{selectedRequest?.package?.name}</span>
                                            <span className="text-muted-foreground">Category:</span>
                                            <span className="font-medium">{selectedRequest?.package?.category}</span>
                                            <span className="text-muted-foreground">Period:</span>
                                            <span className="font-medium">{selectedRequest?.package?.period}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-muted-foreground">Vehicle:</span>
                                            <span className="font-medium">{selectedRequest?.car?.make} {selectedRequest?.car?.model}</span>
                                        </>
                                    )}

                                    <span className="text-muted-foreground">Rental Period:</span>
                                    <span className="font-medium">{selectedRequest ? `${new Date(selectedRequest.startDate).toLocaleString()} - ${new Date(selectedRequest.endDate).toLocaleString()}` : ''}</span>

                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-bold text-primary">{Number(selectedRequest?.totalAmount).toLocaleString()} ETB</span>
                                </div>
                            </div>

                            <div className="space-y-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                                <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-2">Payment Verification</h4>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-muted-foreground">Method:</span>
                                    <span className="font-bold">telebirr</span>

                                    <span className="text-muted-foreground">Identifier (Phone/Acc):</span>
                                    <span className="font-bold text-blue-600">{selectedRequest?.payment?.payerIdentifier || 'N/A'}</span>

                                    <span className="text-muted-foreground">Transaction ID:</span>
                                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{selectedRequest?.payment?.transactionId || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Driver assignment removed from here as it should only happen after payment */}
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <p className="text-xs text-orange-700 font-medium">
                                    <AlertCircle size={14} className="inline mr-1" />
                                    Approval confirms document validity. Car and Driver assignment will be available after payment is confirmed.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmApproval}>
                            <CheckCircle size={16} className="mr-2" />
                            Approve Booking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Booking - {selectedRequest?.id}</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this booking
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rejection Reason</label>
                            <Textarea
                                placeholder="Explain why this booking is being rejected..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmRejection}>
                            <XCircle size={16} className="mr-2" />
                            Reject Booking
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Trip - #{selectedRequest?.id}</DialogTitle>
                        <DialogDescription>
                            Confirm that the car has been returned and the rental period for {selectedRequest?.user?.customerProfile?.firstName} is finished.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                            <Flag size={32} />
                        </div>
                        <p className="text-center text-sm text-gray-500">
                            This will notify the customer that their journey is officially completed.
                            The vehicle will be marked as <strong>under maintenance</strong> for a post-rental inspection.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmTripCompletion} className="bg-orange-600 hover:bg-orange-700">
                            Confirm Completion
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={assignCarModalOpen} onOpenChange={setAssignCarModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign Car & Driver - Trip #{selectedRequest?.id}</DialogTitle>
                        <DialogDescription>
                            Confirm vehicle readiness and assign a driver to start the tracking session.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[80vh] pr-4">
                        <div className="space-y-6 py-4">
                            {/* Show package or car info */}
                            {selectedRequest?.package ? (
                                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                                    <h4 className="font-bold text-sm mb-2 text-primary">Package Booking</h4>
                                    <p className="text-lg font-semibold text-primary">
                                        {selectedRequest?.package?.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Category: {selectedRequest?.package?.category} | {selectedRequest?.package?.period}
                                    </p>
                                    {selectedRequest?.package?.features && selectedRequest.package.features.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-primary/20">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Package Includes:</p>
                                            <ul className="text-xs text-muted-foreground">
                                                {selectedRequest.package.features.slice(0, 3).map((f, i) => (
                                                    <li key={i} className="flex items-center gap-1">
                                                        <span className="text-primary">•</span> {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-muted/30 p-4 rounded-lg border">
                                    <h4 className="font-bold text-sm mb-2 text-muted-foreground uppercase tracking-widest text-[10px]">Selected Vehicle</h4>
                                    <p className="text-lg font-semibold">
                                        {selectedRequest?.car?.make} {selectedRequest?.car?.model}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Plate: {selectedRequest?.car?.plateNumber}
                                    </p>
                                </div>
                            )}

                            {/* Trip Details */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Trip Summary</h4>
                                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-dashed">
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Pickup Location</span>
                                        <p className="text-xs font-medium line-clamp-2">{selectedRequest?.pickupLocation || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Start Date</span>
                                        <p className="text-xs font-medium">{selectedRequest?.startDate ? format(new Date(selectedRequest.startDate), 'MMM dd, HH:mm') : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Driver Details */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold text-sm uppercase tracking-wider text-blue-700 mb-3 flex items-center gap-2">
                                    <Users size={16} /> Driver Information
                                </h4>
                                <p className="text-xs text-blue-600 mb-4">Assign a company driver for this rental trip.</p>
                                <div className="space-y-4">
                                    {/* Driver Assignment Section */}
                                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 mb-4 text-blue-800 font-bold text-xs uppercase tracking-widest">
                                            <Truck size={14} /> {selectedRequest?.isDelivery ? 'Delivery Assignment' : 'Driver Assignment (Optional)'}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-blue-800">Select Available Driver</label>
                                                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                                    <SelectTrigger className="border-blue-200 focus:ring-blue-500 bg-white">
                                                        <SelectValue placeholder="Select a driver" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableDrivers.length === 0 ? (
                                                            <SelectItem disabled value="none">No available drivers</SelectItem>
                                                        ) : (
                                                            availableDrivers.map(d => (
                                                                <SelectItem key={d.id} value={d.id.toString()}>
                                                                    {d.fullName} ({d.phone})
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-blue-800">Delivery/Pickup Location</label>
                                                <Input
                                                    placeholder="Enter precise location"
                                                    value={deliveryLocation}
                                                    onChange={(e) => setDeliveryLocation(e.target.value)}
                                                    className="border-blue-200 focus:ring-blue-500 bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-muted/30 p-3 rounded-lg border text-[11px] text-muted-foreground leading-relaxed">
                                        <p className="font-bold mb-1">Operational Instructions:</p>
                                        <ul className="list-disc pl-4 space-y-1 text-[10px]">
                                            <li>Ensure the vehicle is clean and has sufficient fuel.</li>
                                            <li>Verify the driver has the customer's contact details.</li>
                                            <li>By clicking "Start Trip", the vehicle status will change to <strong>ACTIVE</strong> and tracking will begin.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4 border-t mt-2">
                        <Button variant="outline" onClick={() => setAssignCarModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmCarAssignment} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                            <CarIcon size={16} className="mr-2" />
                            Start Trip & Track
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Booking Details - #{selectedRequest?.id}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[85vh]">
                        <div className="p-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer & Car */}
                                <div className="space-y-4">
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                        <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                            <Eye size={14} /> Customer Info
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="font-bold text-lg">{selectedRequest?.user?.customerProfile ? `${selectedRequest.user.customerProfile.firstName} ${selectedRequest.user.customerProfile.lastName}` : 'N/A'}</p>
                                            <p className="text-muted-foreground">{selectedRequest?.user?.email}</p>
                                            <p className="text-muted-foreground">{selectedRequest?.user?.customerProfile?.phoneNumber}</p>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                        <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                            <TrendingUp size={14} /> {selectedRequest?.package ? 'Package Info' : 'Vehicle Specs'}
                                        </h4>
                                        {selectedRequest?.package ? (
                                            <div className="space-y-2 text-sm">
                                                <p className="font-bold text-lg text-primary">{selectedRequest?.package?.name}</p>
                                                <p className="text-muted-foreground">Category: {selectedRequest?.package?.category}</p>
                                                <p className="text-muted-foreground">Period: {selectedRequest?.package?.period}</p>
                                                {selectedRequest?.package?.features && selectedRequest.package.features.length > 0 && (
                                                    <div className="pt-2 mt-2 border-t border-gray-200">
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Includes:</p>
                                                        <ul className="text-xs text-muted-foreground space-y-1">
                                                            {selectedRequest.package.features.slice(0, 4).map((f, i) => (
                                                                <li key={i} className="flex items-center gap-1">
                                                                    <CheckCircle2 size={10} className="text-green-500" /> {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2 text-sm">
                                                <p className="font-bold text-lg">{selectedRequest?.car?.make} {selectedRequest?.car?.model}</p>
                                                <p className="text-muted-foreground">Plate: {selectedRequest?.car?.plateNumber}</p>
                                                <p className="text-muted-foreground">Category: {selectedRequest?.car?.category}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pickup / Delivery Location Map */}
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                        <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                            <Navigation size={14} /> Pickup / Delivery Location
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded border">
                                                {selectedRequest?.pickupLocation || 'No location specified'}
                                            </div>
                                            {selectedRequest?.pickupLocation && (
                                                <div className="h-[200px] w-full rounded-lg overflow-hidden border">
                                                    <MapSelector
                                                        isReadOnly={true}
                                                        initialLocation={parseCoordinates(selectedRequest.pickupLocation) || [9.0227, 38.7460]}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Booking & Payment */}
                                <div className="space-y-4">
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                        <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                            <FileCheck size={14} /> Rental Period
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="font-bold">From: {selectedRequest ? new Date(selectedRequest.startDate).toLocaleString() : ''}</p>
                                            <p className="font-bold">To: {selectedRequest ? new Date(selectedRequest.endDate).toLocaleString() : ''}</p>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                                        <h4 className="font-bold text-xs uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                                            <ClipboardCheck size={14} /> Financial Summary
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Total Amount:</span>
                                                <span className="font-bold">{Number(selectedRequest?.totalAmount).toLocaleString()} ETB</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Payment Method:</span>
                                                <span className="font-bold">telebirr</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Identifier (Phone/Acc):</span>
                                                <span className="font-bold">{selectedRequest?.payment?.payerIdentifier || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Transaction ID:</span>
                                                <span className="font-bold font-mono">{selectedRequest?.payment?.transactionId || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents Preview */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Uploaded Documents</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedRequest?.driverLicenseUrl && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Driver's License</p>
                                            <img src={api.getImageUrl(selectedRequest.driverLicenseUrl)} className="w-full h-48 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(api.getImageUrl(selectedRequest.driverLicenseUrl), '_blank')} />
                                        </div>
                                    )}
                                    {selectedRequest?.idCardUrl && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">ID Card</p>
                                            <img src={api.getImageUrl(selectedRequest.idCardUrl)} className="w-full h-48 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(api.getImageUrl(selectedRequest.idCardUrl), '_blank')} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="flex justify-between sm:justify-between items-center w-full gap-2">
                        <div className="flex gap-2">
                            {selectedRequest?.status === 'PENDING' && (
                                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => {
                                    setDetailsModalOpen(false);
                                    handleVerifyDocuments(selectedRequest);
                                }}>
                                    <FileCheck size={16} className="mr-2" />
                                    Verify Docs
                                </Button>
                            )}
                            {selectedRequest?.status === 'VERIFIED' && (
                                <>
                                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                                        setDetailsModalOpen(false);
                                        handleApproveBooking(selectedRequest);
                                    }}>
                                        <CheckCircle size={16} className="mr-2" />
                                        Approve
                                    </Button>
                                    <Button variant="destructive" onClick={() => {
                                        setDetailsModalOpen(false);
                                        handleRejectBooking(selectedRequest);
                                    }}>
                                        <XCircle size={16} className="mr-2" />
                                        Reject
                                    </Button>
                                </>
                            )}
                            {(selectedRequest?.status === 'APPROVED' || selectedRequest?.status === 'PAID') && (
                                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
                                    setDetailsModalOpen(false);
                                    handleAssignCar(selectedRequest);
                                }}>
                                    <FileCheck size={16} className="mr-2" />
                                    Assign Car & Driver
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </EmployeeLayout>
    );
};

export default EmployeeDashboard;
