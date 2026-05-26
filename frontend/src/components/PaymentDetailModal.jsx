import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PaymentDetailModal = ({ open, onOpenChange, transaction }) => {
  if (!transaction) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction details</DialogTitle>
        </DialogHeader>
        <div className="p-4">No transaction found.</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const booking = transaction.booking || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction #{transaction.transactionRef || transaction.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold">Customer</h3>
            <p className="text-sm">{transaction.user || transaction.userEmail || 'Unknown'}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Amount</h3>
            <p className="text-sm">{transaction.amount}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Type / Status</h3>
            <p className="text-sm">{transaction.type} / {transaction.status}</p>
          </div>

          {booking && (booking.id || booking.car) && (
            <div>
              <h3 className="text-sm font-semibold">Booking</h3>
              <p className="text-sm">Booking ID: {booking.id || transaction.bookingId}</p>
              {booking.car && (
                <p className="text-sm">Car: {booking.car.make} {booking.car.model} ({booking.car.plateNumber})</p>
              )}
              {booking.startDate && booking.endDate && (
                <p className="text-sm">Rental: {new Date(booking.startDate).toLocaleDateString()} → {new Date(booking.endDate).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {transaction.description && (
            <div>
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="text-sm">{transaction.description}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold">Recorded At</h3>
            <p className="text-sm">{new Date(transaction.date || transaction.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailModal;
