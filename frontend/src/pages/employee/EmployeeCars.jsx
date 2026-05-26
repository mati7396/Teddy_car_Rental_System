import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Car, Eye, Settings, Calendar, Search as SearchIcon, Loader2, Plus, Pencil, Trash2, Save, X, Upload, ImageIcon, CheckCircle
} from 'lucide-react';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";

const EmployeeCars = () => {
    const { t } = useTranslation();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedCar, setSelectedCar] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Maintenance Release State
    const [releaseModalOpen, setReleaseModalOpen] = useState(false);
    const [maintenanceCost, setMaintenanceCost] = useState('0');
    const [maintenanceNotes, setMaintenanceNotes] = useState('');

    // Form State
    const [carForm, setCarForm] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        plateNumber: '',
        category: 'Economy',
        dailyRate: '',
        status: 'AVAILABLE',
        location: '',
        features: []
    });

    const fetchCars = async () => {
        setLoading(true);
        try {
            const data = await api.get('/cars');
            setCars(data);
        } catch (error) {
            console.error('Failed to fetch cars:', error);
            toast.error("Failed to load fleet data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCars();
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return <Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>;
            case 'RENTED': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Assigned</Badge>;
            case 'MAINTENANCE': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Maintenance</Badge>;
            case 'UNAVAILABLE': return <Badge className="bg-red-100 text-red-800 border-red-200">Out of Service</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const handleViewDetails = (car) => {
        setSelectedCar(car);
        setDetailsModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setCarForm({
            make: '',
            model: '',
            year: new Date().getFullYear(),
            plateNumber: '',
            category: 'Economy',
            dailyRate: '',
            status: 'AVAILABLE',
            location: '',
            features: []
        });
        setFormModalOpen(true);
    };

    const handleOpenEditModal = (car) => {
        setIsEditing(true);
        setSelectedCar(car);
        setCarForm({
            ...car,
            dailyRate: car.dailyRate.toString(),
            features: car.features || []
        });
        setFormModalOpen(true);
    };

    const handleOpenDeleteConfirm = (car) => {
        setSelectedCar(car);
        setDeleteConfirmOpen(true);
    };

    const handleSaveCar = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await api.put(`/cars/${selectedCar.id}`, carForm);
                toast.success(t('employee.carUpdated'));
            } else {
                await api.post('/cars', carForm);
                toast.success(t('employee.carAdded'));
            }
            setFormModalOpen(false);
            fetchCars();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save vehicle");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCar = async () => {
        setIsSubmitting(true);
        try {
            await api.delete(`/cars/${selectedCar.id}`);
            toast.success("Vehicle removed from fleet");
            setDeleteConfirmOpen(false);
            fetchCars();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete vehicle");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkAvailable = async (car) => {
        setSelectedCar(car);
        setMaintenanceCost('0');
        setMaintenanceNotes('');
        setReleaseModalOpen(true);
    };

    const confirmRelease = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/cars/${selectedCar.id}/release`, {
                cost: maintenanceCost,
                description: maintenanceNotes
            });
            toast.success("Vehicle released from maintenance");
            setReleaseModalOpen(false);
            fetchCars();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to release vehicle");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }

        const formData = new FormData();
        formData.append('document', file);

        setIsUploading(true);
        try {
            const response = await api.upload('/upload/document', formData);
            setCarForm({ ...carForm, imageUrl: response.url });
            toast.success(t('employee.imageUploaded'));
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const filteredCars = cars.filter(car => {
        const matchesSearch = car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
            car.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
            car.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        available: cars.filter(c => c.status === 'AVAILABLE').length,
        assigned: cars.filter(c => c.status === 'RENTED').length,
        maintenance: cars.filter(c => c.status === 'MAINTENANCE').length,
        outOfService: cars.filter(c => c.status === 'UNAVAILABLE').length
    };


    return (
        <EmployeeLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Cars Management</h1>
                    <p className="text-muted-foreground mt-1">Manage vehicle inventory and assignments</p>
                </div>
                <Button onClick={handleOpenAddModal} className="shadow-md hover:shadow-lg transition-all font-bold">
                    <Plus className="mr-2 h-4 w-4" /> Add New Vehicle
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Available Cars</CardTitle>
                        <Car className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.available}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-green-600 dark:text-green-400">
                            Ready to assign
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Cars</CardTitle>
                        <Car className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.assigned}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-blue-600 dark:text-blue-400">
                            Currently in use
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">In Maintenance</CardTitle>
                        <Settings className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.maintenance}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-yellow-600 dark:text-yellow-400">
                            Under service
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Out of Service</CardTitle>
                        <Settings className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.outOfService}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-red-600 dark:text-red-400">
                            Not operational
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content with Tabs */}
            <Card className="border-border/60 shadow-sm">
                <Tabs defaultValue="list" className="w-full">
                    <div className="p-6 border-b border-border">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <TabsList>
                                <TabsTrigger value="list">List View</TabsTrigger>
                                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                                <TabsTrigger value="assignments">Assignments</TabsTrigger>
                            </TabsList>
                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                    <Input
                                        placeholder="Search cars..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="AVAILABLE">Available</SelectItem>
                                        <SelectItem value="RENTED">Assigned</SelectItem>
                                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                        <SelectItem value="UNAVAILABLE">Out of Service</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <TabsContent value="list" className="m-0">
                        <ScrollArea className="h-[500px]">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="w-[80px]">ID</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Plate</TableHead>
                                        <TableHead>Daily Rate</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10">
                                                <Loader2 className="animate-spin inline-block mr-2" />
                                                Loading fleet data...
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {!loading && filteredCars.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                No cars found matching your criteria.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {filteredCars.map((car) => (
                                        <TableRow key={car.id}>
                                            <TableCell className="font-mono font-medium text-xs">#{car.id}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{car.make} {car.model}</div>
                                                <div className="text-[10px] text-muted-foreground">{car.year}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                    {car.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{car.plateNumber}</TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                ETB {Number(car.dailyRate).toLocaleString()}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(car.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleViewDetails(car)}
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        onClick={() => handleOpenEditModal(car)}
                                                        title="Edit Vehicle"
                                                    >
                                                        <Pencil size={16} />
                                                    </Button>
                                                    {car.status === 'MAINTENANCE' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleMarkAvailable(car)}
                                                            title="Mark as Available"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleOpenDeleteConfirm(car)}
                                                        title="Delete Vehicle"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="maintenance" className="m-0">
                        <div className="p-6">
                            <h3 className="font-bold text-lg mb-4">Vehicles Under Maintenance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {cars.filter(c => c.status === 'MAINTENANCE').length === 0 ? (
                                    <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
                                        <CheckCircle className="mx-auto h-12 w-12 text-green-500/50 mb-4" />
                                        <p className="text-muted-foreground font-medium">All vehicles are healthy and available!</p>
                                    </div>
                                ) : (
                                    cars.filter(c => c.status === 'MAINTENANCE').map(car => (
                                        <Card key={car.id} className="overflow-hidden border-yellow-200 bg-yellow-50/30">
                                            <div className="aspect-video relative overflow-hidden">
                                                {car.imageUrl ? (
                                                    <img src={api.getImageUrl(car.imageUrl)} alt={car.model} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                                        <Car className="h-12 w-12 text-muted-foreground/30" />
                                                    </div>
                                                )}
                                                <Badge className="absolute top-2 right-2 bg-yellow-500">Maintenance</Badge>
                                            </div>
                                            <CardContent className="p-4">
                                                <h4 className="font-bold text-lg">{car.make} {car.model}</h4>
                                                <p className="text-xs text-muted-foreground font-mono mb-4">{car.plateNumber}</p>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100/50 p-2 rounded-lg">
                                                        <Settings size={14} />
                                                        <span>Post-rental inspection required</span>
                                                    </div>
                                                    
                                                    <Button 
                                                        onClick={() => handleMarkAvailable(car)}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5"
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Complete & Release
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>


                    <TabsContent value="calendar" className="p-6">
                        <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-border rounded-lg">
                            <div className="text-center">
                                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
                                <p className="text-muted-foreground">Car availability calendar coming soon</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments" className="p-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Current Assignments</h3>
                            {cars.filter(c => c.status === 'RENTED').map((car) => (
                                <Card key={car.id} className="p-4 border-l-4 border-l-blue-500">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{car.make} {car.model} ({car.plateNumber})</p>
                                            <p className="text-sm text-muted-foreground">Status: Out on rental</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(car)}>
                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                            {cars.filter(c => c.status === 'RENTED').length === 0 && (
                                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                                    No cars currently assigned to customers
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Add/Edit Car Modal */}
            <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? `Update information for ${selectedCar?.make} ${selectedCar?.model}` : 'Enter the details of the new vehicle to add to the fleet'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveCar} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Make</label>
                                <Input
                                    required
                                    value={carForm.make}
                                    onChange={(e) => setCarForm({ ...carForm, make: e.target.value })}
                                    placeholder="e.g. Toyota"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Model</label>
                                <Input
                                    required
                                    value={carForm.model}
                                    onChange={(e) => setCarForm({ ...carForm, model: e.target.value })}
                                    placeholder="e.g. Corolla"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Year</label>
                                <Input
                                    required
                                    type="number"
                                    value={carForm.year}
                                    onChange={(e) => setCarForm({ ...carForm, year: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Plate Number</label>
                                <Input
                                    required
                                    value={carForm.plateNumber}
                                    onChange={(e) => setCarForm({ ...carForm, plateNumber: e.target.value })}
                                    placeholder="e.g. AA 123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select
                                    value={carForm.category}
                                    onValueChange={(val) => setCarForm({ ...carForm, category: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Economy">Economy</SelectItem>
                                        <SelectItem value="SUV">SUV</SelectItem>
                                        <SelectItem value="Luxury">Luxury</SelectItem>
                                        <SelectItem value="Electric">Electric</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Daily Rate (ETB)</label>
                                <Input
                                    required
                                    type="number"
                                    value={carForm.dailyRate}
                                    onChange={(e) => setCarForm({ ...carForm, dailyRate: e.target.value })}
                                    placeholder="e.g. 1500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select
                                    value={carForm.status}
                                    onValueChange={(val) => setCarForm({ ...carForm, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AVAILABLE">Available</SelectItem>
                                        <SelectItem value="RENTED">Assigned</SelectItem>
                                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                        <SelectItem value="UNAVAILABLE">Out of Service</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Location</label>
                                <Input
                                    value={carForm.location}
                                    onChange={(e) => setCarForm({ ...carForm, location: e.target.value })}
                                    placeholder="e.g. Addis Ababa"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Vehicle Photo</label>
                            <div className="flex items-center gap-4">
                                <div className="h-24 w-40 bg-muted rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                                    {carForm.imageUrl ? (
                                        <img src={api.getImageUrl(carForm.imageUrl)} alt="Preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="cursor-pointer"
                                        id="car-image-upload"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        JPEG or PNG. Max size 5MB.
                                    </p>
                                    {isUploading && (
                                        <div className="flex items-center text-xs text-primary animate-pulse">
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                            Uploading...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Features (comma separated)</label>
                            <Input
                                value={carForm.features?.join(', ')}
                                onChange={(e) => setCarForm({
                                    ...carForm,
                                    features: e.target.value.split(',').map(f => f.trim()).filter(f => f !== '')
                                })}
                                placeholder="AC, GPS, Bluetooth"
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setFormModalOpen(false)}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Car Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Vehicle Details - #{selectedCar?.id}</DialogTitle>
                        <DialogDescription>
                            Complete information about the selected fleet vehicle
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCar && (
                        <div className="space-y-6 py-4">
                            <div className="flex gap-6 items-start">
                                <div className="w-1/3 aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                                    {selectedCar.imageUrl ? (
                                        <img src={api.getImageUrl(selectedCar.imageUrl)} alt={selectedCar.model} className="w-full h-full object-cover" />
                                    ) : (
                                        <Car className="h-10 w-10 text-muted-foreground/40" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold">{selectedCar.make} {selectedCar.model}</h3>
                                    <p className="text-muted-foreground">{selectedCar.year} | {selectedCar.category}</p>
                                    <div className="mt-2">{getStatusBadge(selectedCar.status)}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 p-4 bg-muted/30 rounded-lg border">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plate Number</p>
                                    <p className="text-sm font-semibold font-mono">{selectedCar.plateNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Daily Rate</p>
                                    <p className="text-sm font-semibold text-primary">ETB {Number(selectedCar.dailyRate).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</p>
                                    <p className="text-sm font-semibold">{selectedCar.location || "Central Terminal"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fleet ID</p>
                                    <p className="text-sm font-semibold font-mono">TCR-{selectedCar.id.toString().padStart(4, '0')}</p>
                                </div>
                            </div>

                            {selectedCar.features && selectedCar.features.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Features & Specifications</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCar.features.map((f, i) => (
                                            <Badge key={i} variant="secondary" className="px-2 py-0 text-[10px]">{f}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                        <Button onClick={() => {
                            setDetailsModalOpen(false);
                            handleOpenEditModal(selectedCar);
                        }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Vehicle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Release from Maintenance Modal */}
            <Dialog open={releaseModalOpen} onOpenChange={setReleaseModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Complete Maintenance</DialogTitle>
                        <DialogDescription>
                            Confirm completion of maintenance for <strong>{selectedCar?.make} {selectedCar?.model}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Maintenance Cost (ETB)</label>
                            <Input
                                type="number"
                                value={maintenanceCost}
                                onChange={(e) => setMaintenanceCost(e.target.value)}
                                placeholder="0"
                                className="font-bold text-lg"
                            />
                            <p className="text-[10px] text-muted-foreground">This will be subtracted from the total business revenue.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Service Notes (Optional)</label>
                            <Input
                                value={maintenanceNotes}
                                onChange={(e) => setMaintenanceNotes(e.target.value)}
                                placeholder="What was fixed?"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setReleaseModalOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={confirmRelease}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Finish & Release Car
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 font-bold">Delete Vehicle</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>{selectedCar?.make} {selectedCar?.model} ({selectedCar?.plateNumber})</strong> from the fleet?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4 flex gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCar}
                            disabled={isSubmitting}
                            className="font-bold"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Vehicle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </EmployeeLayout>
    );
};

export default EmployeeCars;
