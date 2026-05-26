import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Car, Plus, Search, Filter, Edit, Trash2,
    CheckCircle2, AlertCircle, Clock, Loader2, Upload, ImageIcon
} from 'lucide-react';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/admin-layout";
import { api } from "@/api";
import { toast } from 'sonner';

const AdminCars = () => {
    const { t } = useTranslation();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        plateNumber: '',
        category: 'Economy',
        dailyRate: '',
        features: '',
        location: '',
        imageUrl: ''
    });

    const fetchCars = async () => {
        setLoading(true);
        try {
            const data = await api.get('/cars');
            setCars(data);
        } catch (error) {
            console.error('Failed to fetch cars:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCars();
    }, []);

    const resetForm = () => {
        setFormData({
            make: '',
            model: '',
            year: new Date().getFullYear(),
            plateNumber: '',
            category: 'Economy',
            dailyRate: '',
            features: '',
            location: '',
            imageUrl: ''
        });
        setEditingCar(null);
    };

    const handleOpenDialog = (car = null) => {
        if (car) {
            setEditingCar(car);
            setFormData({
                make: car.make,
                model: car.model,
                year: car.year,
                plateNumber: car.plateNumber,
                category: car.category,
                dailyRate: car.dailyRate,
                features: Array.isArray(car.features) ? car.features.join(', ') : car.features,
                location: car.location || '',
                imageUrl: car.imageUrl || ''
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
                year: parseInt(formData.year),
                dailyRate: parseFloat(formData.dailyRate),
                features: typeof formData.features === 'string'
                    ? formData.features.split(',').map(f => f.trim()).filter(f => f)
                    : formData.features
            };

            if (editingCar) {
                await api.patch(`/cars/${editingCar.id}`, payload);
            } else {
                await api.post('/cars', payload);
            }
            toast.success(t('admin.carSaved'));
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.message || 'Failed to save car');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmDeleteId(id);
    };

    const confirmDeleteCar = async () => {
        try {
            await api.delete(`/cars/${confirmDeleteId}`);
            toast.success(t('admin.carDeleted'));
            fetchCars();
        } catch (error) {
            toast.error(error.message || 'Failed to delete car');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file.');
            return;
        }

        const formData = new FormData();
        formData.append('document', file);

        setIsUploading(true);
        try {
            const response = await api.upload('/upload/document', formData);
            setFormData({ ...formData, imageUrl: response.url });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image.');
        } finally {
            setIsUploading(false);
        }
    };

    const getStatusBadge = (status) => {
        const s = status ? status.toUpperCase() : 'UNKNOWN';
        switch (s) {
            case 'AVAILABLE':
                return <Badge variant="success" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 gap-1">
                    <CheckCircle2 size={12} /> Available
                </Badge>;
            case 'RENTED':
                return <Badge variant="info" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 gap-1">
                    <Clock size={12} /> Rented
                </Badge>;
            case 'MAINTENANCE':
                return <Badge variant="warning" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 gap-1">
                    <AlertCircle size={12} /> Maintenance
                </Badge>;
            case 'UNAVAILABLE':
                return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 gap-1">
                    <AlertCircle size={12} /> Unavailable
                </Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredCars = cars.filter(car =>
        car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <>
            <AdminLayout>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Management</h1>
                        <p className="text-muted-foreground mt-1">Manage your vehicle inventory and status.</p>
                    </div>
                    <Button className="gap-2 shadow-lg hover:shadow-primary/25" onClick={() => handleOpenDialog()}>
                        <Plus size={18} />
                        Add New Vehicle
                    </Button>
                </div>

                <Card className="border-border/60 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border bg-card flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search by model or plate number..."
                                className="pl-10 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {loading && <Loader2 className="animate-spin text-primary" size={20} />}
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter size={14} /> Filter
                            </Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSearchQuery('')}>Reset</Button>
                        </div>
                    </div>
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead>Vehicle Model</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Plate Number</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Daily Rate</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!loading && filteredCars.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        No vehicles found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredCars.map((car) => (
                                <TableRow key={car.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground overflow-hidden">
                                                {car.imageUrl ? (
                                                    <img src={api.getImageUrl(car.imageUrl)} alt={car.model} className="object-cover w-full h-full" />
                                                ) : (
                                                    <Car size={20} />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{car.make} {car.model}</span>
                                                <span className="text-xs text-muted-foreground">ID: #{car.id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{car.year}</TableCell>
                                    <TableCell className="font-mono text-xs">{car.plateNumber}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal text-xs">{car.category}</Badge>
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">ETB {Number(car.dailyRate).toLocaleString()}</TableCell>
                                    <TableCell>
                                        {getStatusBadge(car.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenDialog(car)}>
                                                <Edit size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(car.id)}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingCar ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="make">Make</Label>
                                <Input id="make" required value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} placeholder="e.g. Toyota" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Input id="model" required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. Corolla" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="year">Year</Label>
                                <Input id="year" type="number" required value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plateNumber">Plate Number</Label>
                                <Input id="plateNumber" required value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} placeholder="e.g. AA 123456" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={formData.category} onValueChange={val => setFormData({ ...formData, category: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Economy">Economy</SelectItem>
                                        <SelectItem value="SUV">SUV</SelectItem>
                                        <SelectItem value="Luxury">Luxury</SelectItem>
                                        <SelectItem value="Utility">Utility</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dailyRate">Daily Rate (ETB)</Label>
                                <Input id="dailyRate" type="number" required value={formData.dailyRate} onChange={e => setFormData({ ...formData, dailyRate: e.target.value })} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="features">Features (comma separated)</Label>
                                <Input id="features" value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} placeholder="AC, Bluetooth, GPS..." />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Vehicle Photo</Label>
                                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                                    <div className="h-20 w-32 rounded bg-muted flex items-center justify-center overflow-hidden border">
                                        {formData.imageUrl ? (
                                            <img src={api.getImageUrl(formData.imageUrl)} alt="Preview" className="object-cover h-full w-full" />
                                        ) : (
                                            <ImageIcon className="text-muted-foreground/40" size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="h-9 text-xs cursor-pointer"
                                        />
                                        {isUploading && (
                                            <p className="text-xs text-primary animate-pulse flex items-center gap-1">
                                                <Loader2 size={12} className="animate-spin" /> Uploading...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="col-span-2 mt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                    {editingCar ? 'Update Vehicle' : 'Add Vehicle'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </AdminLayout>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Vehicle</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mt-2">Are you sure you want to delete this vehicle? This action cannot be undone.</p>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteCar}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AdminCars;
