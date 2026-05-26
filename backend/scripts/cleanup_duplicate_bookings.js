//This script is a database cleanup tool that finds and removes duplicate booking records.//
require('dotenv').config();
const prisma = require('../src/utils/prismaClient');

async function main() {
    console.log('Finding duplicate bookings...\n');

    // Get all bookings
    const allBookings = await prisma.booking.findMany({
        orderBy: { createdAt: 'asc' }
    });

    // Group bookings by user, car, and creation time (within 1 second)
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < allBookings.length; i++) {
        if (processed.has(allBookings[i].id)) continue;

        const booking = allBookings[i];
        const duplicates = [booking];

        for (let j = i + 1; j < allBookings.length; j++) {
            const other = allBookings[j];
            
            if (processed.has(other.id)) continue;

            // Check if bookings are duplicates (same user, car, created within 1 second)
            const timeDiff = Math.abs(new Date(booking.createdAt) - new Date(other.createdAt));
            const isSameUser = booking.userId === other.userId;
            const isSameCar = booking.carId === other.carId;
            const isSamePackage = booking.packageId === other.packageId;
            const isWithin1Second = timeDiff < 1000;

            if (isSameUser && (isSameCar || isSamePackage) && isWithin1Second) {
                duplicates.push(other);
                processed.add(other.id);
            }
        }

        if (duplicates.length > 1) {
            duplicateGroups.push(duplicates);
            processed.add(booking.id);
        }
    }

    if (duplicateGroups.length === 0) {
        console.log('✅ No duplicate bookings found!');
        return;
    }

    console.log(`Found ${duplicateGroups.length} groups of duplicate bookings:\n`);

    for (const group of duplicateGroups) {
        console.log(`Group (${group.length} bookings):`);
        group.forEach(b => {
            console.log(`  - ID: ${b.id}, Status: ${b.status}, User: ${b.userId}, Car: ${b.carId}, Created: ${b.createdAt}`);
        });

        // Keep the one with the most advanced status, or the latest one
        const statusPriority = {
            'COMPLETED': 7,
            'ACTIVE': 6,
            'PAID': 5,
            'APPROVED': 4,
            'VERIFIED': 3,
            'PENDING': 2,
            'REJECTED': 1,
            'CANCELLED': 0
        };

        group.sort((a, b) => {
            const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
            if (statusDiff !== 0) return statusDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const toKeep = group[0];
        const toDelete = group.slice(1);

        console.log(`  ✅ Keeping: ID ${toKeep.id} (${toKeep.status})`);
        console.log(`  ❌ Deleting: ${toDelete.map(b => `ID ${b.id}`).join(', ')}\n`);

        // Delete duplicates
        for (const booking of toDelete) {
            // Delete related payment first if exists
            await prisma.payment.deleteMany({
                where: { bookingId: booking.id }
            });

            // Delete the booking
            await prisma.booking.delete({
                where: { id: booking.id }
            });
        }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0)} duplicate bookings.`);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
