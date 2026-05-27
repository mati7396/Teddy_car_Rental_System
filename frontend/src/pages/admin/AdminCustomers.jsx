import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin-layout';
import { api } from '@/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Eye, Trash2 } from 'lucide-react';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('rentals');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/reports/customers-by-rentals');
        setCustomers(res || []);
      } catch (err) {
        console.error('Failed to load customers by rentals', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // sort whenever sort options or customers change
  const sorted = React.useMemo(() => {
    const arr = [...customers];
    arr.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [customers, sortField, sortDir]);

  const exportCSV = () => {
    if (!customers || customers.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Rentals'];
    const rows = sorted.map(c => [c.name, c.email, c.phone || '', c.rentals]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `customers_by_rentals.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const openDetails = async (customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
    try {
      const data = await api.get(`/users/${customer.id}`);
      setCustomerDetails(data);
    } catch (err) {
      console.error('Failed to load customer details', err);
      setCustomerDetails(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customers by Rental Count</h1>
          <p className="text-muted-foreground mt-1">Ordered ascending by number of rentals.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select onValueChange={(v) => setSortField(v)} defaultValue={sortField}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rentals">Rentals</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>{sortDir === 'asc' ? 'Asc' : 'Desc'}</Button>
          <Button onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Rentals</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{c.rentals}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(c)} title="Details" aria-label={`Details ${c.name}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          const ok = window.confirm(`Delete customer ${c.name || c.email}? This action cannot be undone.`);
                          if (!ok) return;
                          try {
                            await api.delete(`/users/${c.id}`);
                            setCustomers(prev => prev.filter(x => x.id !== c.id));
                            // close details if currently open for this customer
                            if (selectedCustomer && selectedCustomer.id === c.id) {
                              setDetailsOpen(false);
                              setCustomerDetails(null);
                            }
                          } catch (err) {
                            console.error('Failed to delete customer', err);
                            alert('Failed to delete customer: ' + (err.message || 'server error'));
                          }
                        }} title="Delete" aria-label={`Delete ${c.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-7xl w-[98vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>View customer profile, wallet balance and recent bookings.</DialogDescription>
          </DialogHeader>
          <div className="p-0">
            <div className="p-4">
              {!customerDetails && <div className="text-sm text-muted-foreground">Loading...</div>}
            </div>
            <div className="px-4 pb-4">
              <div className="max-h-[65vh] overflow-auto space-y-3">
                {customerDetails && (
                  <div>
                    <h3 className="font-semibold">{customerDetails.customerProfile ? `${customerDetails.customerProfile.firstName} ${customerDetails.customerProfile.lastName}` : customerDetails.email} <span className="text-xs text-muted-foreground">(ID: {customerDetails.id})</span></h3>
                    <p className="text-sm">Email: {customerDetails.email}</p>
                    <p className="text-sm">Phone: {customerDetails.customerProfile?.phoneNumber || '-'}</p>
                    <p className="text-sm">Wallet Balance: {customerDetails.bankAccount ? `${Number(customerDetails.bankAccount.balance).toLocaleString()} ETB` : '-'}</p>
                    <p className="text-sm">Rentals: {customerDetails.bookings?.length || 0}</p>

                    <div className="mt-4">
                      <h4 className="font-medium">Bookings</h4>
                      <div className="space-y-3 mt-2">
                        {customerDetails.bookings && customerDetails.bookings.length === 0 && (
                          <div className="text-sm text-muted-foreground">No bookings found</div>
                        )}
                        {customerDetails.bookings?.map((b) => (
                          <div key={b.id} className="p-3 border rounded bg-card">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                              <div className="col-span-12 md:col-span-3">
                                <div className="w-full h-36 rounded overflow-hidden bg-gray-100 border">
                                  <img
                                    src={api.getImageUrl(b.car?.imageUrl || b.idCardUrl || b.driverLicenseUrl || '')}
                                    alt={`booking-${b.id}`}
                                    className="w-full h-full object-contain bg-white"
                                  />
                                </div>
                              </div>

                              <div className="col-span-12 md:col-span-6 min-w-0">
                                <div className="text-sm font-semibold truncate">Booking #{b.id} — {b.car ? `${b.car.make} ${b.car.model}` : 'N/A'}</div>
                                <div className="text-xs text-muted-foreground truncate">Plate: {b.car?.plateNumber || '-'}</div>
                                <div className="text-xs text-muted-foreground">Created: {b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'}</div>
                                <div className="text-xs text-muted-foreground mt-2 break-words">Pickup Location: {b.pickupLocation || '-'}</div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  <div>Rental: {b.startDate ? new Date(b.startDate).toLocaleString() : '-'} → {b.endDate ? new Date(b.endDate).toLocaleString() : '-'}</div>
                                  <div>Return Location: {b.returnLocation || '-'}</div>
                                  <div>Paid: {b.payment ? (Number(b.payment.amount).toLocaleString() + ' ETB') : '-'}</div>
                                  <div>Payment Method: {b.payment ? b.payment.method : '-'}</div>
                                </div>
                              </div>

                              <div className="col-span-12 md:col-span-3 text-sm">
                                <div className="font-medium">{b.isDelivery ? 'Delivery' : 'Office Pickup'}</div>
                                <div className="text-muted-foreground">Status: {b.status}</div>
                                <div className="text-muted-foreground">Driver: {b.delivery?.driver ? b.delivery.driver.fullName : (b.assignedDriver || '-')}</div>
                                <div className="mt-3">Transaction ID: {b.payment?.transactionId || '-'}</div>
                                <div>Penalty: {b.penaltyAmount ? `${Number(b.penaltyAmount).toLocaleString()} ETB` : '-'}</div>

                                <div className="mt-3 flex flex-col gap-2">
                                  {b.idCardUrl && (
                                    <div className="h-20 w-full overflow-hidden rounded border">
                                      <img src={api.getImageUrl(b.idCardUrl)} alt={`id-${b.id}`} className="w-full h-full object-contain bg-white" />
                                    </div>
                                  )}
                                  {b.driverLicenseUrl && (
                                    <div className="h-20 w-full overflow-hidden rounded border">
                                      <img src={api.getImageUrl(b.driverLicenseUrl)} alt={`lic-${b.id}`} className="w-full h-full object-contain bg-white" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomers;
