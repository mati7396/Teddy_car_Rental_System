import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Package, Plus, Edit, Trash2,
    CheckCircle2, Info, DollarSign, Calendar, Loader2
} from 'lucide-react';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import AdminLayout from "@/components/admin-layout";
import { api } from "@/api";
import { toast } from 'sonner';

const AdminPackages = () => {
    const { t } = useTranslation();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null); // holds package id to delete

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        period: 'per day',
        category: 'Standard',
        features: '',
    });

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const data = await api.get('/packages');
            setPackages(data);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            period: 'per day',
            category: 'Standard',
            features: '',
        });
        setEditingPackage(null);
    };

    const handleOpenDialog = (pkg = null) => {
        if (pkg) {
            setEditingPackage(pkg);
            setFormData({
                name: pkg.name,
                price: pkg.price.toString(),
                period: pkg.period,
                category: pkg.category,
                features: Array.isArray(pkg.features) ? pkg.features.join(', ') : pkg.features,
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                features: formData.features.split(',').map(f => f.trim()).filter(f => f),
            };

            if (editingPackage) {
                await api.patch(`/packages/${editingPackage.id}`, payload);
            } else {
                await api.post('/packages', payload);
            }
            setIsDialogOpen(false);
            fetchPackages();
        } catch (error) {
            toast.error(error.message || 'Failed to save package');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmDelete(id);
    };

    const confirmDeletePackage = async () => {
        try {
            await api.delete(`/packages/${confirmDelete}`);
            toast.success(t('admin.packageDeleted'));
            fetchPackages();
        } catch (error) {
            toast.error(error.message || 'Failed to delete package');
        } finally {
            setConfirmDelete(null);
        }
    };


    return (
        <>
            <AdminLayout>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Rental Packages</h1>
                        <p className="text-muted-foreground mt-1">Configure and manage your rental options and pricing.</p>
                    </div>
                    <Button className="gap-2 shadow-lg hover:shadow-primary/25" onClick={() => handleOpenDialog()}>
                        <Plus size={18} />
                        Create New Package
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading && (
                        <div className="col-span-full flex justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={40} />
                        </div>
                    )}
                    {!loading && packages.length === 0 && (
                        <div className="col-span-full text-center py-20 text-muted-foreground">
                            No packages configured yet.
                        </div>
                    )}
                    {packages.map((pkg) => (
                        <Card key={pkg.id} className="flex flex-col border-border/60 hover:shadow-lg transition-all group overflow-hidden">
                            <CardHeader className="relative">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={pkg.category === 'Popular' ? 'default' : 'outline'} className="text-[10px] uppercase font-bold tracking-wide">
                                        {pkg.category}
                                    </Badge>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenDialog(pkg)}>
                                            <Edit size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(pkg.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-primary">
                                        {typeof pkg.price === 'number' || !isNaN(pkg.price) ? `ETB ${Number(pkg.price).toLocaleString()}` : pkg.price}
                                    </span>
                                    <span className="text-sm text-muted-foreground">/ {pkg.period}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-2">
                                    {pkg.features && pkg.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="bg-muted/30 p-4 border-t border-border/50">
                                <Button variant="outline" className="w-full text-xs h-8 gap-2 bg-background">
                                    <Info size={12} /> Package Details
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPackage ? 'Edit Package' : 'Create New Package'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Package Name</Label>
                                <Input id="name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Standard Daily" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (ETB)</Label>
                                    <Input id="price" type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="period">Period</Label>
                                    <Select value={formData.period} onValueChange={val => setFormData({ ...formData, period: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="per day">per day</SelectItem>
                                            <SelectItem value="per week">per week</SelectItem>
                                            <SelectItem value="per month">per month</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={formData.category} onValueChange={val => setFormData({ ...formData, category: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Standard">Standard</SelectItem>
                                        <SelectItem value="Popular">Popular</SelectItem>
                                        <SelectItem value="Luxury">Luxury</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="features">Features (comma separated)</Label>
                                <Input id="features" value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} placeholder="Unlimited Miles, Insurance..." />
                            </div>

                            <DialogFooter className="mt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                    {editingPackage ? 'Update Package' : 'Create Package'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </AdminLayout>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Package</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mt-2">Are you sure you want to delete this package? This action cannot be undone.</p>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeletePackage}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AdminPackages;
