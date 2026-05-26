import React, { useState, useEffect } from 'react';
import {
    Package, Eye, CheckCircle, Search as SearchIcon, Clock, DollarSign, Loader2
} from 'lucide-react';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

const EmployeePackages = () => {
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const data = await api.get('/packages');
                setPackages(data);
            } catch (error) {
                console.error('Failed to fetch packages:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    const getCategoryBadge = (category) => {
        switch (category) {
            case 'Standard': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Standard</Badge>;
            case 'Popular': return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Popular</Badge>;
            case 'Luxury': return <Badge className="bg-green-100 text-green-800 border-green-200">Luxury</Badge>;
            default: return <Badge variant="secondary">{category}</Badge>;
        }
    };

    const handleViewDetails = (pkg) => {
        setSelectedPackage(pkg);
        setDetailsModalOpen(true);
    };

    const filteredPackages = packages.filter(pkg => {
        const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || pkg.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });


    return (
        <EmployeeLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Packages Management</h1>
                    <p className="text-muted-foreground mt-1">Manage rental packages and assignments</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="flex flex-wrap gap-6 mb-8">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60 w-full md:w-auto md:min-w-[280px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Packages</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{packages.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Available options
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search packages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Popular">Popular</SelectItem>
                        <SelectItem value="Luxury">Luxury</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
                    <p className="text-muted-foreground">Loading rental packages...</p>
                </div>
            )}

            {!loading && filteredPackages.length === 0 && (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                    No packages found matching your criteria.
                </div>
            )}

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPackages.map((pkg) => (
                    <Card key={pkg.id} className="hover:shadow-lg transition-all cursor-pointer border-border/60 flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                                    <CardDescription className="font-mono text-[10px] mt-1">ID: #{pkg.id}</CardDescription>
                                </div>
                                {getCategoryBadge(pkg.category)}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <div className="mb-4">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    <span className="text-2xl font-bold text-primary">
                                        ETB {Number(pkg.price).toLocaleString()}
                                    </span>
                                    <span className="text-sm text-muted-foreground">/ {pkg.period}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock size={14} />
                                    <span>{pkg.period}</span>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-2 mb-4 flex-1">
                                <p className="text-sm font-medium">Features:</p>
                                <ul className="space-y-1">
                                    {pkg.features.map((feature, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <CheckCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleViewDetails(pkg)}
                                >
                                    <Eye size={16} className="mr-2" />
                                    View Details
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>


            {/* Package Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedPackage?.name}</DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            Package ID: #{selectedPackage?.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Category</p>
                                {selectedPackage && getCategoryBadge(selectedPackage.category)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Period</p>
                                <p className="text-sm font-semibold">{selectedPackage?.period}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Price</p>
                                <p className="text-sm font-semibold text-primary text-lg">
                                    ETB {Number(selectedPackage?.price).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <p className="text-sm font-medium mb-3">Features Included:</p>
                            <ul className="space-y-2">
                                {selectedPackage?.features.map((feature, idx) => (
                                    <li key={idx} className="text-sm flex items-start gap-2">
                                        <CheckCircle size={16} className="text-primary mt-0.5 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={() => setDetailsModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </EmployeeLayout>
    );
};

export default EmployeePackages;

