import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Trash2, Loader2, UserX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    DialogFooter,
} from "@/components/ui/dialog";
import EmployeeLayout from "@/components/employee-layout";
import { api } from "@/api";
import { toast } from 'sonner';

const EmployeeCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ open: false, customer: null });

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await api.get('/users');
            // Filter for active customers only (backend performs soft-delete by setting isActive=false)
            const customerList = data.filter(u => u.role === 'CUSTOMER' && u.isActive !== false);
            setCustomers(customerList);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleDelete = async (userId) => {
        try {
            await api.delete(`/users/${userId}`);
            toast.success('Customer deleted successfully');
            fetchCustomers();
        } catch (error) {
            toast.error(error.message || 'Failed to delete customer');
        } finally {
            setConfirmDialog({ open: false, customer: null });
        }
    };

    const getInitials = (user) => {
        if (user.customerProfile) {
            return `${user.customerProfile.firstName?.[0] || ''}${user.customerProfile.lastName?.[0] || ''}` || 'U';
        }
        return user.email[0].toUpperCase();
    };

    const filteredCustomers = customers.filter(c => {
        const fullName = c.customerProfile ? `${c.customerProfile.firstName} ${c.customerProfile.lastName}` : '';
        return fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <>
            <EmployeeLayout>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Management</h1>
                        <p className="text-muted-foreground mt-1">View and manage customer accounts.</p>
                    </div>
                </div>

                <Card className="border-border/60 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border bg-card flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search customers by name or email..."
                                className="pl-10 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {loading && <Loader2 className="animate-spin text-primary" size={20} />}
                    </div>
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!loading && filteredCustomers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredCustomers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-primary/10">
                                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                    {getInitials(customer)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">
                                                    {customer.customerProfile
                                                        ? `${customer.customerProfile.firstName} ${customer.customerProfile.lastName}`
                                                        : <span className="italic text-muted-foreground">Name not set</span>}
                                                </span>
                                                <span className="text-xs text-muted-foreground">ID: CUST-#{customer.id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Mail size={12} /> {customer.email}
                                            </div>
                                            {customer.customerProfile?.phoneNumber && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Phone size={12} /> {customer.customerProfile.phoneNumber}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(customer.createdAt).toLocaleDateString()}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {customer.isActive === false ? (
                                            <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 font-medium">
                                                Deactivated
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 font-medium">
                                                Active
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setConfirmDialog({ open: true, customer })}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </EmployeeLayout>

            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ open, customer: open ? prev.customer : null }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Customer</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mt-2">
                        Are you sure you want to delete customer {confirmDialog.customer?.customerProfile ? `${confirmDialog.customer.customerProfile.firstName} ${confirmDialog.customer.customerProfile.lastName}` : confirmDialog.customer?.email}? 
                        This action cannot be undone and will remove all their data.
                    </p>
                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setConfirmDialog({ open: false, customer: null })}>Cancel</Button>
                        <Button type="button" variant="destructive" onClick={() => confirmDialog.customer && handleDelete(confirmDialog.customer.id)} disabled={!confirmDialog.customer}>Delete Customer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default EmployeeCustomers;
