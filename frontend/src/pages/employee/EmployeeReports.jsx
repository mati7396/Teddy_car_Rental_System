import React, { useState, useEffect } from 'react';
import {
    DollarSign, TrendingUp, TrendingDown,
    Calendar, Download, ArrowUpRight, ArrowDownRight,
    Loader2
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import EmployeeLayout from "@/components/employee-layout";
import { api } from "@/api";
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const EmployeeReports = () => {
    const [transactions, setTransactions] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [stats, setStats] = useState({
        totalPayments: 0,
        totalCancellationFees: 0,
        totalRefunds: 0,
        totalRevenue: 0,
        netRevenue: 0,
        revenueMargin: 0
    });
    const [loading, setLoading] = useState(true);
    const [currentMonthOnly, setCurrentMonthOnly] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [timeframe, setTimeframe] = useState('monthly');
    const [mostRentedCars, setMostRentedCars] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);

    const fetchChartData = async (selectedTimeframe) => {
        setChartLoading(true);
        try {
            const chartRes = await api.get(`/reports/chart-data?timeframe=${selectedTimeframe}`);
            setChartData(chartRes);
        } catch (error) {
            console.error('Failed to fetch chart data:', error);
        } finally {
            setChartLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [overview, txs, chartRes, receiptsRes, carsRes] = await Promise.all([
                    api.get('/reports/financials'),
                    api.get('/reports/transactions'),
                    api.get(`/reports/chart-data?timeframe=${timeframe}`),
                    api.get('/reports/receipts'),
                    api.get('/reports/most-rented-cars')
                ]);
                setStats(overview.summary);
                setAllTransactions(txs);
                setTransactions(txs);
                setChartData(chartRes);
                setReceipts(receiptsRes);
                setMostRentedCars(carsRes);
            } catch (error) {
                console.error('Failed to fetch reports data:', error);
                toast.error('Failed to load report data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleTimeframeChange = async (newTimeframe) => {
        setTimeframe(newTimeframe);
        await fetchChartData(newTimeframe);
    };

    const handleCurrentMonthFilter = () => {
        const now = new Date();
        if (currentMonthOnly) {
            setTransactions(allTransactions);
            setCurrentMonthOnly(false);
        } else {
            const filtered = allTransactions.filter((tx) => {
                const d = new Date(tx.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            setTransactions(filtered);
            setCurrentMonthOnly(true);
        }
    };

    const pieData = [
        { name: 'Revenue', value: stats.totalRevenue, color: '#10b981' },
        { name: 'Refunds', value: stats.totalRefunds, color: '#ef4444' }
    ];

    const handleExportCSV = () => {
        if (transactions.length === 0) { toast.error('No transaction data to export.'); return; }
        const headers = ['ID', 'User', 'Booking ID', 'Type', 'Date', 'Amount', 'Status'];
        const rows = transactions.map(tx => [
            tx.id, tx.user, tx.bookingId || '',
            tx.type,
            tx.date ? new Date(tx.date).toLocaleDateString() : '',
            tx.amount, tx.status
        ].map(v => `"${v}"`).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `transactions_${currentMonthOnly ? 'current_month' : 'all'}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('Transactions exported');
    };

    return (
        <EmployeeLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Overview</h1>
                    <p className="text-muted-foreground mt-1">Track revenue, refunds, and financial performance.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center bg-muted p-1 rounded-lg border border-border/80 mr-2">
                        {['daily', 'weekly', 'monthly'].map((tf) => (
                            <button
                                key={tf}
                                onClick={() => handleTimeframeChange(tf)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                                    timeframe === tf
                                        ? 'bg-background text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" className="gap-2" onClick={handleCurrentMonthFilter}>
                        <Calendar size={16} />
                        {currentMonthOnly ? 'Show All' : 'Current Month'}
                    </Button>
                    <Button className="gap-2 shadow-lg hover:shadow-primary/25" onClick={handleExportCSV}>
                        <Download size={16} />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign size={80} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground">ETB {Number(stats?.totalRevenue || 0).toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-600 font-bold text-sm">
                            <TrendingUp size={16} />
                            <span>Live Sync</span>
                            <span className="text-muted-foreground font-normal">from all payments</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowDownRight size={80} className="text-red-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Refunds</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground">ETB {Number(stats?.totalRefunds || 0).toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 mt-2 text-red-600 font-bold text-sm">
                            <TrendingDown size={16} />
                            <span>Returned</span>
                            <span className="text-muted-foreground font-normal">to customers</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm bg-primary/[0.03] border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">Net Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground">ETB {Number(stats?.netRevenue || 0).toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-600 font-bold text-sm">
                            <ArrowUpRight size={16} />
                            <span>{Number(stats?.revenueMargin || 0).toFixed(1)}%</span>
                            <span className="text-muted-foreground font-normal">revenue margin</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Revenue vs Refunds Distribution */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Revenue vs Refunds Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `ETB ${value.toLocaleString()}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Net Revenue Trend */}
                <Card className="border-border/60 shadow-sm relative">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Net Revenue Trend</CardTitle>
                        {chartLoading && <Loader2 className="animate-spin text-primary h-4 w-4" />}
                    </CardHeader>
                    <CardContent className={`h-[300px] transition-opacity duration-200 ${chartLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                                <YAxis stroke="#888888" fontSize={11} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip formatter={(value) => `ETB ${value.toLocaleString()}`} />
                                <Area type="monotone" dataKey="netRevenue" stackId="1" stroke="#10b981" fill="url(#colorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Payments & Refunds Comparison */}
                <Card className="border-border/60 shadow-sm relative">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Payments & Refunds Comparison</CardTitle>
                        {chartLoading && <Loader2 className="animate-spin text-primary h-4 w-4" />}
                    </CardHeader>
                    <CardContent className={`h-[300px] transition-opacity duration-200 ${chartLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                                <YAxis stroke="#888888" fontSize={11} />
                                <Tooltip formatter={(value) => `ETB ${value.toLocaleString()}`} />
                                <Legend />
                                <Bar dataKey="payments" fill="#10b981" name="Payments" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="refunds" fill="#ef4444" name="Refunds" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Most Rented Vehicles */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-bold">Most Rented Vehicles</CardTitle>
                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold uppercase tracking-wide">
                            Popularity
                        </Badge>
                    </CardHeader>
                    <CardContent className="h-[300px] pb-6">
                        {mostRentedCars.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                No rental booking data available.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={mostRentedCars} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} stroke="#888888" fontSize={11} />
                                    <YAxis dataKey="name" type="category" width={145} stroke="#888888" fontSize={10} tickFormatter={(name) => name.split(' (')[0]} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-background border border-border p-3 rounded-lg shadow-md text-xs">
                                                        <p className="font-bold text-foreground">{data.name}</p>
                                                        <p className="text-indigo-600 font-semibold mt-1">Bookings: {data.bookingsCount}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="bookingsCount" fill="#6366f1" radius={[0, 4, 4, 0]} name="Bookings" barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-card flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">Transaction History</h3>
                        <p className="text-sm text-muted-foreground">All payment, refund, and cancellation fee activities.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {loading && <Loader2 className="animate-spin text-primary" size={20} />}
                        {currentMonthOnly && <Badge variant="secondary">Current Month Only</Badge>}
                    </div>
                </div>
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Booking</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!loading && transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    No transaction history available.
                                </TableCell>
                            </TableRow>
                        )}
                        {transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell className="font-mono text-xs font-bold">{tx.id}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${tx.type === 'REFUND' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {tx.type === 'REFUND' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                        </div>
                                        <span className="font-medium text-sm">{tx.user}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs">{tx.bookingId ? `#${tx.bookingId}` : '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={tx.type === 'REFUND' ? 'secondary' : 'default'} className="text-[10px]">
                                        {tx.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                    {new Date(tx.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className={`text-right font-black text-sm ${tx.type === 'REFUND' ? 'text-red-600' : 'text-foreground'}`}>
                                    ETB {Number(tx.amount || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge
                                        variant={tx.status === 'SUCCESS' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'destructive'}
                                        className="text-[10px]"
                                    >
                                        {tx.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Receipts */}
            <Card className="border-border/60 shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-border bg-card">
                    <h3 className="font-bold text-lg">All Receipts</h3>
                    <p className="text-sm text-muted-foreground">All successful payment receipts.</p>
                </div>
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead>Receipt Ref</TableHead>
                            <TableHead>Booking</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!loading && receipts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No receipts found.
                                </TableCell>
                            </TableRow>
                        )}
                        {receipts.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="font-mono text-xs font-bold">{r.receiptRef}</TableCell>
                                <TableCell>#{r.bookingId}</TableCell>
                                <TableCell>{r.customer}</TableCell>
                                <TableCell>{r.method}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{new Date(r.date).toLocaleString()}</TableCell>
                                <TableCell className="text-right font-semibold">ETB {Number(r.amount).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </EmployeeLayout>
    );
};

export default EmployeeReports;
