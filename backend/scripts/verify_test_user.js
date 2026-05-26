//It checks a user’s account, shows their details, and automatically fixes their bookings if needed.//
require('dotenv').config();
const prisma = require('../src/utils/prismaClient');

async function main() {
    const email = process.argv[2];
    
    if (!email) {
        console.log('Usage: node scripts/verify_test_user.js <user-email>');
        console.log('Example: node scripts/verify_test_user.js test@example.com');
        return;
    }

    console.log(`Looking for user: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { 
            customerProfile: true,
            bookings: {
                include: {
                    car: true,
                    package: true
                }
            }
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('✅ User found');
    console.log('Email:', user.email);
    console.log('Has Profile:', !!user.customerProfile);
    console.log('Has Documents:', !!(user.customerProfile?.idCardUrl && user.customerProfile?.driverLicenseUrl));
    console.log('Agreement Signed:', user.customerProfile?.agreementSigned);
    console.log('\nBookings:', user.bookings.length);

    if (user.bookings.length === 0) {
        console.log('\n⚠️  No bookings found. User needs to create a booking first.');
        return;
    }

    console.log('\nBooking Details:');
    user.bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Car: ${booking.car ? `${booking.car.make} ${booking.car.model}` : 'N/A'}`);
        console.log(`   Package: ${booking.package ? booking.package.name : 'N/A'}`);
        console.log(`   Created: ${booking.createdAt}`);
    });

    const pendingBookings = user.bookings.filter(b => b.status === 'PENDING');
    
    if (pendingBookings.length > 0) {
        console.log(`\n\n🔧 Found ${pendingBookings.length} PENDING booking(s). Updating to VERIFIED...`);
        
        for (const booking of pendingBookings) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'VERIFIED' }
            });
            console.log(`✅ Booking ${booking.id} updated to VERIFIED`);
        }
        
        console.log('\n✅ All PENDING bookings have been verified!');
        console.log('Now when this user books a new car, it will automatically be VERIFIED.');
    } else {
        console.log('\n✅ User already has verified bookings. New bookings will be auto-verified.');
    }
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
