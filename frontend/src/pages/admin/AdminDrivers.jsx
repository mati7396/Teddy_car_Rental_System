import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Trash2, Mail, Phone, FileText, UserPlus, 
    Shield, CheckCircle2, XCircle, Loader2, Search, Truck 
} from 'lucide-react';
import { toast } from "sonner";
import { format } from "date-fns";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import AdminLayout from "@/components/admin-layout";
import { api } from "@/api";

const AdminDrivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: ''
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingDriverId, setEditingDriverId] = useState(null);
    const [editFormData, setEditFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        status: ''
    });
    const [editLoading, setEditLoading] = useState(false);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/drivers/admin/all');
            setDrivers(data);
        } catch (error) {
            console.error('Failed to fetch drivers:', error);
            toast.error("Could not load drivers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleCreateDriver = async (e) => {
        e.preventDefault();
        try {
            setCreateLoading(true);
            await api.post('/drivers/admin/create', formData);
            toast.success("Driver account created successfully");
            setCreateModalOpen(false);
            setFormData({
                fullName: '',
                email: '',
                password: '',
                phone: ''
            });
            fetchDrivers();
        } catch (error) {
            console.error('Failed to create driver:', error);
            toast.error(error.response?.data?.message || "Creation failed");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteDriver = async (id) => {
        if (!window.confirm("Are you sure you want to delete this driver?")) return;
        try {
            await api.delete(`/drivers/admin/${id}`);
            toast.success("Driver deleted successfully");
            fetchDrivers();
        } catch (error) {
            console.error('Failed to delete driver:', error);
            toast.error(error.response?.data?.message || "Deletion failed");
        }
    };

    const openEditModal = (driver) => {
        setEditingDriverId(driver.id);
        setEditFormData({
            fullName: driver.fullName || '',
            email: driver.email || '',
            password: '',
            phone: driver.phone || '',
            status: driver.status || ''
        });
        setEditModalOpen(true);
    };

    const handleEditDriver = async (e) => {
        e.preventDefault();
        if (!editingDriverId) return;
        try {
            setEditLoading(true);
            const payload = {
                fullName: editFormData.fullName,
                email: editFormData.email,
                phone: editFormData.phone,
                status: editFormData.status
            };
            if (editFormData.password) payload.password = editFormData.password;

            await api.put(`/drivers/admin/${editingDriverId}`, payload);
            toast.success('Driver updated successfully');
            setEditModalOpen(false);
            setEditingDriverId(null);
            setEditFormData({ fullName: '', email: '', password: '', phone: '', status: '' });
            fetchDrivers();
        } catch (error) {
            console.error('Failed to update driver:', error);
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setEditLoading(false);
        }
    };

    const filteredDrivers = drivers.filter(d => 
        d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Driver Management</h1>
                    <p className="text-muted-foreground mt-1">Create and manage driver accounts for the delivery system</p>
                </div>
                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <UserPlus size={18} className="mr-2" /> Add New Driver
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleCreateDriver}>
                            <DialogHeader>
                                <DialogTitle>Add New Driver</DialogTitle>
                                <DialogDescription>
                                    Enter driver details to create a new account. Drivers can only log in using these credentials.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input 
                                        placeholder="Enter full name" 
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input 
                                        type="email"
                                        placeholder="driver@example.com" 
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <Input 
                                        type="password"
                                        placeholder="••••••••" 
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">Phone Number</label>
                                        <Input 
                                            placeholder="+251..." 
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={createLoading}>
                                    {createLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                    Create Account
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleEditDriver}>
                            <DialogHeader>
                                <DialogTitle>Edit Driver</DialogTitle>
                                <DialogDescription>
                                    Update driver details. Leave password empty to keep current password.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input 
                                        placeholder="Enter full name" 
                                        required
                                        value={editFormData.fullName}
                                        onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input 
                                        type="email"
                                        placeholder="driver@example.com" 
                                        required
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Password (optional)</label>
                                    <Input 
                                        type="password"
                                        placeholder="••••••••" 
                                        value={editFormData.password}
                                        onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <Input 
                                        placeholder="+251..." 
                                        value={editFormData.phone}
                                        onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <Input 
                                        placeholder="AVAILABLE or ON_DELIVERY" 
                                        value={editFormData.status}
                                        onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={editLoading}>
                                    {editLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <FileText size={16} className="mr-2" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6">
                <Card className="border-border/60 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input 
                                placeholder="Search drivers by name or email..." 
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                {drivers.length} Total Drivers
                            </Badge>
                        </div>
                    </div>
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead>Driver Name</TableHead>
                                    <TableHead>Contact Info</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <Loader2 className="animate-spin inline-block mr-2" />
                                            Loading driver list...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDrivers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground text-sm">
                                            No drivers found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDrivers.map((driver) => (
                                    <TableRow key={driver.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                                                    {driver.fullName[0]}
                                                </div>
                                                <div className="font-semibold">{driver.fullName}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Mail size={14} /> {driver.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Phone size={14} /> {driver.phone}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={driver.status === 'AVAILABLE' ? 'success' : 'warning'}>
                                                {driver.status === 'AVAILABLE' ? (
                                                    <><CheckCircle2 size={12} className="mr-1"/> Available</>
                                                ) : (
                                                    <><Truck size={12} className="mr-1"/> On Delivery</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(driver.createdAt), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditModal(driver)}
                                                    title="Edit driver"
                                                >
                                                    <FileText size={18} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDeleteDriver(driver.id)}
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminDrivers;
