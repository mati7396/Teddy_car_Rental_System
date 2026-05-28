import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, Home, FileText, Loader2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const Confirmation = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentError, setPaymentError] = useState('');

    useEffect(() => {
        const fetchBooking = async () => {
            const bookingId = searchParams.get('bookingId') || sessionStorage.getItem('lastBookingId');

            try {
                if (!bookingId) {
                    setLoading(false);
                    return;
                }
                const data = await api.get(`/bookings/${bookingId}`);
                setBooking(data);
            } catch (error) {
                console.error('Failed to fetch booking:', error);
                const message = error.message || 'Payment verification failed. Please contact support.';
                setPaymentError(message);
                toast.error(message);
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [searchParams]);

    const handleDownloadReceipt = () => {
        if (!booking) return;

        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 13;
            const contentW = pageW - margin * 2;
            const ref = booking?.id?.toString().padStart(6, '0') || 'N/A';
            const receiptNum = `REC-${new Date().getFullYear()}-${ref}`;
            const bookingRef = `BK-${new Date().getFullYear()}-${ref}`;
            const profile = booking.user?.customerProfile;
            const customerName = profile ? `${profile.firstName} ${profile.lastName}` : (booking.user?.email || 'Valued Customer');
            const phone = profile?.phoneNumber || 'N/A';
            const email = booking.user?.email || 'N/A';
            const licenseNum = profile?.driverLicenseUrl ? 'Verified' : 'N/A';
            const car = booking.car;
            const pkg = booking.package;
            const startDate = booking.startDate ? new Date(booking.startDate) : null;
            const endDate = booking.endDate ? new Date(booking.endDate) : null;
            const durationDays = startDate && endDate
                ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
                : 1;
            const totalAmount = Number(booking.totalAmount || 0);
            const vatRate = 0.15;
            const baseAmount = Number((totalAmount / (1 + vatRate)).toFixed(2));
            const vatAmount = Number((totalAmount - baseAmount).toFixed(2));
            const driverFee = booking.driverFee ? Number(booking.driverFee) : 0;
            const penaltyAmount = booking.penaltyAmount ? Number(booking.penaltyAmount) : 0;
            const paymentMethod = booking.payment?.method || 'Local Bank';
            const assignedDriver = booking.assignedDriver
                ? (typeof booking.assignedDriver === 'object'
                    ? `${booking.assignedDriver.firstName || ''} ${booking.assignedDriver.lastName || ''}`.trim()
                    : booking.assignedDriver)
                : 'N/A';

            // -- HEADER --
            // thin top accent bar
            doc.setFillColor(30, 58, 138);
            doc.rect(0, 0, pageW, 3, 'F');

            // car icon
            const iconX = margin;
            const iconY = 8;
            doc.setFillColor(30, 58, 138);
            doc.roundedRect(iconX, iconY + 3, 18, 7, 1.5, 1.5, 'F');
            doc.setFillColor(50, 50, 50);
            doc.circle(iconX + 4, iconY + 10.5, 2, 'F');
            doc.circle(iconX + 14, iconY + 10.5, 2, 'F');
            doc.setFillColor(200, 200, 200);
            doc.circle(iconX + 4, iconY + 10.5, 1, 'F');
            doc.circle(iconX + 14, iconY + 10.5, 1, 'F');

            // Company name
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('TEDDY', iconX + 22, iconY + 7);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('CAR RENTAL', iconX + 22, iconY + 12.5);

            // Right side contact info
            const contactX = pageW - margin;
            const contactStartY = 7;
            const contactLineH = 4.8;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            const contactLines = [
                { marker: '*', text: 'Bole Road, Woreda 03, Addis Ababa, Ethiopia' },
                { marker: 'T', text: '+251 900 000 000' },
                { marker: '@', text: 'info@teddyrental.com' },
                { marker: 'W', text: 'www.teddyrental.com' },
            ];
            contactLines.forEach((c, i) => {
                const cy = contactStartY + i * contactLineH;
                doc.setTextColor(30, 58, 138);
                doc.setFont('helvetica', 'bold');
                doc.text(c.marker, contactX - 2, cy, { align: 'right' });
                doc.setTextColor(60, 60, 60);
                doc.setFont('helvetica', 'normal');
                doc.text(c.text, contactX - 5, cy, { align: 'right' });
            });

            // Header divider
            const headerBottom = 26;
            doc.setDrawColor(210, 215, 230);
            doc.setLineWidth(0.4);
            doc.line(margin, headerBottom, pageW - margin, headerBottom);

            // -- RECEIPT TITLE + META BLOCK --
            let y = headerBottom + 7;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('RENTAL RECEIPT', margin, y);

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 120, 120);
            doc.text('Thank you for choosing Teddy Car Rental.', margin, y + 5.5);
            doc.text('We wish you a safe and pleasant journey.', margin, y + 10);

            // Right meta table
            const metaLabelX = 118;
            const metaColonX = 148;
            const metaValX = 151;
            const metaRows = [
                ['Receipt Number', receiptNum, false],
                ['Booking ID', bookingRef, false],
                ['Date', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), false],
                ['Payment Method', paymentMethod, false],
                ['Payment Status', 'PAID', true],
            ];
            metaRows.forEach(([label, val, isGreen], i) => {
                const my = y + i * 5.5;
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(80, 80, 80);
                doc.text(label, metaLabelX, my);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.text(':', metaColonX, my);
                if (isGreen) {
                    doc.setTextColor(22, 163, 74);
                    doc.setFont('helvetica', 'bold');
                } else {
                    doc.setTextColor(30, 30, 30);
                    doc.setFont('helvetica', 'normal');
                }
                doc.text(String(val), metaValX, my);
            });

            // Section divider
            y += 32;
            doc.setDrawColor(210, 215, 230);
            doc.setLineWidth(0.4);
            doc.line(margin, y, pageW - margin, y);
            y += 6;

            // -- HELPER FUNCTIONS --
            const colGap = 5;
            const colW = (contentW - colGap) / 2;
            const col1X = margin;
            const col2X = margin + colW + colGap;
            const boxH = 46;

            const drawBoxHeader = (x, bY, w, title) => {
                doc.setFillColor(30, 58, 138);
                doc.roundedRect(x, bY, w, 7, 1, 1, 'F');
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(title, x + 3, bY + 4.8);
            };

            const drawBoxBody = (x, bY, w, h) => {
                doc.setFillColor(248, 250, 255);
                doc.setDrawColor(210, 220, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(x, bY + 7, w, h - 7, 1, 1, 'FD');
            };

            const drawRow = (x, rY, label, val, labelColW) => {
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(90, 90, 90);
                doc.text(label, x + 3, rY);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(90, 90, 90);
                doc.text(':', x + labelColW, rY);
                doc.setTextColor(25, 25, 25);
                const maxW = 55;
                const lines = doc.splitTextToSize(String(val), maxW);
                doc.text(lines[0], x + labelColW + 3, rY);
            };

            // -- CUSTOMER INFO BOX --
            drawBoxHeader(col1X, y, colW, 'CUSTOMER INFORMATION');
            drawBoxBody(col1X, y, colW, boxH);
            const custRows = [
                ['Full Name', customerName],
                ['Phone Number', phone],
                ['Email Address', email],
                ['License Number', licenseNum],
            ];
            custRows.forEach(([label, val], i) => {
                drawRow(col1X, y + 13 + i * 7.5, label, val, 26);
            });

            // -- CAR DETAILS BOX --
            drawBoxHeader(col2X, y, colW, 'CAR DETAILS');
            drawBoxBody(col2X, y, colW, boxH);
            if (car) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(25, 25, 25);
                doc.text(`${car.make} ${car.model}${car.year ? ' ' + car.year : ''}`, col2X + 3, y + 14);
                const carRows = [
                    ['Plate Number', car.plateNumber || 'N/A'],
                    ['Car Category', car.category || 'N/A'],
                    ['Fuel Type', car.fuelType || 'Petrol'],
                    ['Transmission', car.transmission || 'Automatic'],
                ];
                carRows.forEach(([label, val], i) => {
                    drawRow(col2X, y + 21 + i * 6.5, label, val, 24);
                });
            } else if (pkg) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(25, 25, 25);
                doc.text(pkg.name, col2X + 3, y + 14);
                drawRow(col2X, y + 22, 'Category', pkg.category || 'N/A', 22);
                drawRow(col2X, y + 29, 'Period', pkg.period || 'N/A', 22);
            }

            y += boxH + 6;

            // -- RENTAL INFORMATION --
            const rentalBoxH = 38;
            drawBoxHeader(margin, y, contentW, 'RENTAL INFORMATION');
            drawBoxBody(margin, y, contentW, rentalBoxH);

            const rentalLeft = [
                ['Pickup Location', booking.pickupLocation || 'Teddy Car Rental Office'],
                ['Drop-off Location', booking.returnLocation || 'Teddy Car Rental Office'],
                ['Pickup Date & Time', startDate
                    ? startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'],
            ];
            const rentalRight = [
                ['Return Date & Time', endDate
                    ? endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'],
                ['Rental Duration', `${durationDays} Day${durationDays !== 1 ? 's' : ''}`],
                ['Assigned Driver', assignedDriver],
            ];

            const halfW = contentW / 2;
            rentalLeft.forEach(([label, val], i) => {
                drawRow(margin, y + 14 + i * 7, label, val, 30);
            });
            rentalRight.forEach(([label, val], i) => {
                drawRow(margin + halfW, y + 14 + i * 7, label, val, 30);
            });

            y += rentalBoxH + 7;

            // -- PAYMENT SUMMARY TABLE --
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('PAYMENT SUMMARY', margin, y);
            y += 4;

            const tableBody = [
                [
                    `Base Rental Fee (${durationDays} Day${durationDays !== 1 ? 's' : ''})`,
                    baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                ],
            ];
            if (driverFee > 0) {
                tableBody.push(['Driver Service Fee', driverFee.toLocaleString('en-US', { minimumFractionDigits: 2 })]);
            }
            tableBody.push(['VAT (15%)', vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })]);
            if (penaltyAmount > 0) {
                tableBody.push(['Late Return Penalty', penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })]);
            }
            tableBody.push([
                { content: 'TOTAL PAID', styles: { fontStyle: 'bold', textColor: [30, 58, 138], fillColor: [235, 240, 255] } },
                { content: `ETB ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', textColor: [30, 58, 138], fillColor: [235, 240, 255] } },
            ]);

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Description', 'Amount (ETB)']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 58, 138],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'center',
                },
                bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
                columnStyles: {
                    0: { cellWidth: contentW * 0.72 },
                    1: { halign: 'right', cellWidth: contentW * 0.28 },
                },
                alternateRowStyles: { fillColor: [248, 250, 255] },
                tableLineColor: [210, 220, 240],
                tableLineWidth: 0.3,
            });

            y = doc.lastAutoTable.finalY + 7;

            // -- VERIFICATION + AUTHORIZED SIGNATURE --
            const sigBoxH = 32;
            const sigColW = (contentW - colGap) / 2;

            // Verification box
            drawBoxHeader(col1X, y, sigColW, 'VERIFICATION');
            doc.setFillColor(248, 250, 255);
            doc.setDrawColor(210, 220, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(col1X, y + 7, sigColW, sigBoxH - 7, 1, 1, 'FD');

            // QR code placeholder
            const qrX = col1X + 3;
            const qrY = y + 10;
            const qrSize = 16;
            const qrCell = qrSize / 7;
            const qrPattern = [
                [1,1,1,1,1,1,1],
                [1,0,0,0,0,0,1],
                [1,0,1,1,1,0,1],
                [1,0,1,0,1,0,1],
                [1,0,1,1,1,0,1],
                [1,0,0,0,0,0,1],
                [1,1,1,1,1,1,1],
            ];
            qrPattern.forEach((row, ri) => {
                row.forEach((cell, ci) => {
                    doc.setFillColor(cell ? 30 : 255, cell ? 30 : 255, cell ? 30 : 255);
                    doc.rect(qrX + ci * qrCell, qrY + ri * qrCell, qrCell, qrCell, 'F');
                });
            });
            doc.setDrawColor(30, 30, 30);
            doc.setLineWidth(0.3);
            doc.rect(qrX, qrY, qrSize, qrSize, 'S');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Scan this QR code to verify', qrX + qrSize + 3, qrY + 4);
            doc.text('your receipt.', qrX + qrSize + 3, qrY + 8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text('Verification Code', qrX + qrSize + 3, qrY + 14);
            doc.setFont('helvetica', 'normal');
            doc.text(':', qrX + qrSize + 25, qrY + 14);
            doc.setTextColor(30, 58, 138);
            doc.text(`TDY-${ref}`, qrX + qrSize + 28, qrY + 14);

            // Authorized Signature box
            drawBoxHeader(col2X, y, sigColW, 'AUTHORIZED SIGNATURE');
            doc.setFillColor(248, 250, 255);
            doc.setDrawColor(210, 220, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(col2X, y + 7, sigColW, sigBoxH - 7, 1, 1, 'FD');

            const sigLineY = y + 22;
            doc.setDrawColor(80, 80, 80);
            doc.setLineWidth(0.4);
            doc.line(col2X + 5, sigLineY, col2X + sigColW - 5, sigLineY);

            doc.setFontSize(13);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(40, 40, 40);
            doc.text('Teddy Rental', col2X + 8, sigLineY - 2);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Teddy Car Rental', col2X + 5, sigLineY + 4);
            doc.setFont('helvetica', 'italic');
            doc.text('Thank you for renting with us!', col2X + 5, sigLineY + 8);

            y += sigBoxH + 7;

            // -- TERMS & CONDITIONS --
            doc.setDrawColor(210, 215, 230);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageW - margin, y);
            y += 5;

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text('Terms & Conditions', margin, y);
            y += 4.5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(110, 110, 110);
            doc.text('1. Please return the car on time to avoid additional charges.', margin, y);
            y += 4;
            doc.text('2. This receipt is valid as proof of payment.', margin, y);
            y += 4;
            doc.text('3. For support, contact info@teddyrental.com or +251 900 000 000.', margin, y);

            // -- FOOTER BAR --
            doc.setFillColor(30, 58, 138);
            doc.rect(0, pageH - 13, pageW, 13, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bolditalic');
            doc.text('Drive Safe, Arrive Safe!', pageW / 2, pageH - 5, { align: 'center' });

            doc.save(`Receipt_BK_${ref}.pdf`);
            toast.success(t('booking.confirmation.receiptSuccess'));
        } catch (error) {
            console.error('Receipt generation failed:', error);
            toast.error(t('booking.confirmation.receiptError'));
        }
    };

    const handleDownloadAgreement = () => {
        if (!booking) return;

        try {
            const doc = new jsPDF();
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 20;
            const contentW = pageW - margin * 2;

            doc.setFillColor(48, 213, 200);
            doc.rect(0, 0, pageW, 18, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('TEDDY CAR RENTAL', margin, 12);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('STANDARD RENTAL CONTRACT', pageW - margin, 12, { align: 'right' });

            doc.setTextColor(30, 30, 30);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('RENTAL AGREEMENT', pageW / 2, 32, { align: 'center' });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text(`REF-89302-2024   |   Generated: ${new Date().toLocaleDateString()}`, pageW / 2, 39, { align: 'center' });

            const profile = booking.user?.customerProfile;
            const customerName = profile ? `${profile.firstName} ${profile.lastName}` : (booking.user?.email || 'Valued Customer');
            const ref = booking?.id?.toString().padStart(5, '0') || 'N/A';
            const vehicle = booking?.package
                ? `${booking.package.name} (${booking.package.category} Package)`
                : booking?.car ? `${booking.car.make} ${booking.car.model} -- ${booking.car.plateNumber}` : 'N/A';
            const startDate = booking?.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A';
            const endDate = booking?.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A';
            const totalAmount = `ETB ${Number(booking?.totalAmount || 0).toLocaleString()}`;

            doc.setFillColor(245, 247, 250);
            doc.roundedRect(margin, 44, contentW, 36, 3, 3, 'F');
            doc.setDrawColor(220, 220, 220);
            doc.roundedRect(margin, 44, contentW, 36, 3, 3, 'S');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(48, 213, 200);
            doc.text('CUSTOMER', margin + 4, 52);
            doc.text('BOOKING REF', margin + 70, 52);
            doc.text('VEHICLE', margin + 120, 52);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.setFontSize(9);
            doc.text(customerName, margin + 4, 59);
            doc.text(`#BK-${ref}`, margin + 70, 59);
            doc.text(doc.splitTextToSize(vehicle, 65)[0], margin + 120, 59);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(48, 213, 200);
            doc.text('RENTAL PERIOD', margin + 4, 68);
            doc.text('TOTAL AMOUNT', margin + 70, 68);
            doc.text('STATUS', margin + 120, 68);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.setFontSize(9);
            doc.text(`${startDate} to ${endDate}`, margin + 4, 74);
            doc.text(totalAmount, margin + 70, 74);
            doc.setTextColor(16, 185, 129);
            doc.text('PAID', margin + 120, 74);

            let y = 92;
            doc.setTextColor(30, 30, 30);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('TERMS OF SERVICE', pageW / 2, y, { align: 'center' });
            doc.setDrawColor(48, 213, 200);
            doc.setLineWidth(0.8);
            doc.line(pageW / 2 - 30, y + 2, pageW / 2 + 30, y + 2);
            y += 10;

            const sections = [
                { title: '1. Acceptance of Terms', desc: 'By accessing and using Teddy Car Rental services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.' },
                { title: '2. Rental Requirements', desc: "To rent a vehicle, you must be at least 21 years of age, possess a valid driver's license, and provide a valid government-issued ID. All documents must be uploaded during the booking process." },
                { title: '3. Booking and Payment', desc: 'All bookings are subject to vehicle availability. Payment must be made in full at the time of booking through our accepted payment methods (Telebirr or CBE). Booking confirmation is subject to document verification by our team.' },
                { title: '4. Vehicle Use', desc: 'Rented vehicles must be used responsibly and in accordance with Ethiopian traffic laws. The renter is responsible for any traffic violations, fines, or damages incurred during the rental period.' },
                { title: '5. Insurance', desc: 'All rentals include basic insurance coverage. The refundable insurance deposit will be returned upon safe return of the vehicle in its original condition.' },
                { title: '6. Cancellation Policy', desc: 'Cancellations made 24 hours before the rental start date are eligible for a full refund. Late cancellations may be subject to a cancellation fee.' },
                { title: '7. Limitation of Liability', desc: 'Teddy Car Rental shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services or vehicles.' },
                { title: '8. Late Return Penalty', desc: 'Vehicles must be returned by the agreed return date and time. A grace period of 2 hours is allowed. After this period, a penalty fee equivalent to the daily rental rate will be charged for each day or part thereof until the vehicle is returned.' },
            ];

            doc.setLineWidth(0.2);
            sections.forEach((s) => {
                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 30);
                doc.text(s.title, margin, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(70, 70, 70);
                const lines = doc.splitTextToSize(s.desc, contentW);
                doc.text(lines, margin, y);
                y += lines.length * 4.5 + 4;
            });

            if (y > 230) { doc.addPage(); y = 20; }
            y += 4;
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageW - margin, y);
            y += 8;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 30);
            doc.text('DIGITAL SIGNATURE', margin, y);
            y += 6;

            doc.setFillColor(250, 250, 250);
            doc.setDrawColor(48, 213, 200);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, contentW, 14, 2, 2, 'FD');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(13);
            doc.setTextColor(30, 30, 30);
            doc.text(customerName, margin + 4, y + 9);
            y += 18;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(120, 120, 120);
            doc.text('This electronic signature constitutes a legally binding agreement.', margin, y);
            y += 5;
            doc.text(`Signed on: ${new Date().toLocaleDateString()}`, margin, y);

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFillColor(48, 213, 200);
                doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageW, 10, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text('Teddy Car Rental  |  Bole Road, Addis Ababa, Ethiopia  |  info@teddyrental.com', pageW / 2, doc.internal.pageSize.getHeight() - 3.5, { align: 'center' });
            }

            doc.save(`Agreement_BK_${ref}.pdf`);
            toast.success(t('booking.confirmation.agreementSuccess'));
        } catch (error) {
            console.error('Agreement generation failed:', error);
            toast.error(t('booking.confirmation.agreementError'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary h-12 w-12" />
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-border animate-in fade-in zoom-in duration-500">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 shadow-inner">
                    <CheckCircle className="h-10 w-10 text-green-600 animate-bounce" />
                </div>

                <h2 className="font-display text-3xl font-extrabold text-foreground mb-2">{t('booking.confirmation.title')}</h2>
                {paymentError ? (
                    <p className="text-red-600 mb-8">{paymentError}</p>
                ) : (
                    <p className="text-muted-foreground mb-8">
                        {t('booking.confirmation.successDesc')}
                    </p>
                )}

                <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left space-y-4 border border-border">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">{t('booking.confirmation.reference')}</span>
                        <span className="font-mono font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg">
                            #BK-{booking?.id?.toString().padStart(5, '0') || 'N/A'}
                        </span>
                    </div>
                    {booking?.package ? (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">{t('booking.confirmation.package')}</span>
                                <span className="font-semibold text-foreground">{booking.package.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">{t('booking.confirmation.category')}</span>
                                <span className="font-semibold text-foreground">{booking.package.category}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">{t('booking.confirmation.duration')}</span>
                                <span className="font-semibold text-foreground">{booking.package.period}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">{t('booking.confirmation.vehicle')}</span>
                            <span className="font-semibold text-foreground">{booking?.car ? `${booking.car.make} ${booking.car.model}` : 'N/A'}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">{t('booking.confirmation.pickupDate')}</span>
                        <span className="font-semibold text-foreground">{booking?.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                        <span className="text-muted-foreground font-medium text-sm">{t('booking.confirmation.amountPaid')}</span>
                        <span className="font-bold text-emerald-600">{booking?.totalAmount?.toLocaleString() || '0'} ETB</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={handleDownloadReceipt}
                            className="flex-1 py-6 rounded-xl"
                        >
                            <Download size={18} className="mr-2" />
                            {t('booking.confirmation.receipt')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDownloadAgreement}
                            className="flex-1 py-6 rounded-xl"
                        >
                            <FileText size={18} className="mr-2" />
                            {t('booking.confirmation.agreement')}
                        </Button>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/my-bookings')}
                            className="flex-1 py-6 rounded-xl"
                        >
                            <Briefcase size={18} className="mr-2" />
                            {t('booking.confirmation.myBookings')}
                        </Button>
                        <Button
                            onClick={() => navigate('/')}
                            className="flex-1 py-6 rounded-xl"
                        >
                            <Home size={18} className="mr-2" />
                            {t('booking.confirmation.home')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Confirmation;
