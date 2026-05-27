require('dotenv').config();
const prisma = require('../src/utils/prismaClient');
const { hashPassword } = require('../src/utils/hash');

async function main() {
    console.log('Seeding database...');

    // Create Admins
    const admins = [
        {
            email: 'admin@teddyrental.com',
            firstName: 'Teddy',
            lastName: 'Admin',
            phoneNumber: '0911000000',
            address: 'Addis Ababa'
        },
        {
            email: 'admin2@teddyrental.com',
            firstName: 'Sarah',
            lastName: 'Manager',
            phoneNumber: '0911000001',
            address: 'Addis Ababa, Bole'
        }
    ];

    for (const adminData of admins) {
        const password = await hashPassword('Password123!');
        await prisma.user.upsert({
            where: { email: adminData.email },
            update: {},
            create: {
                email: adminData.email,
                password: password,
                role: 'ADMIN',
                customerProfile: {
                    create: {
                        firstName: adminData.firstName,
                        lastName: adminData.lastName,
                        phoneNumber: adminData.phoneNumber,
                        address: adminData.address
                    }
                }
            }
        });
        console.log('Admin created:', adminData.email);
    }

    // Create Employees
    const employees = [
        {
            email: 'employee@teddyrental.com',
            firstName: 'John',
            lastName: 'Employee',
            phoneNumber: '0911111111',
            address: 'Bole'
        },
        {
            email: 'employee2@teddyrental.com',
            firstName: 'Abebe',
            lastName: 'Kassa',
            phoneNumber: '0922111222',
            address: 'Megenagna'
        },
        {
            email: 'employee3@teddyrental.com',
            firstName: 'Marta',
            lastName: 'Tesfaye',
            phoneNumber: '0933111333',
            address: 'Casanchis'
        }
    ];

    const seededEmployees = [];
    for (const empData of employees) {
        const password = await hashPassword('Password123!');
        const emp = await prisma.user.upsert({
            where: { email: empData.email },
            update: {},
            create: {
                email: empData.email,
                password: password,
                role: 'EMPLOYEE',
                customerProfile: {
                    create: {
                        firstName: empData.firstName,
                        lastName: empData.lastName,
                        phoneNumber: empData.phoneNumber,
                        address: empData.address
                    }
                }
            }
        });
        seededEmployees.push(emp);
        console.log('Employee created:', empData.email);
    }

    // Create Customer
    const customerPassword = await hashPassword('customer123');
    const customer = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            email: 'customer@test.com',
            password: customerPassword,
            role: 'CUSTOMER',
            customerProfile: {
                create: {
                    firstName: 'Alice',
                    lastName: 'Customer',
                    phoneNumber: '0911222222',
                    address: '4 Kilo'
                }
            }
        }
    });
    console.log('Customer created:', customer.email);

    // Create Cars
    const car1 = await prisma.car.upsert({
        where: { plateNumber: 'AA-2-12345' },
        update: {},
        create: {
            make: 'Toyota',
            model: 'Corolla',
            year: 2020,
            plateNumber: 'AA-2-12345',
            category: 'Economy',
            dailyRate: 1500,
            status: 'AVAILABLE',
            features: ['AC', 'Bluetooth'],
            location: 'Main Office'
        }
    });

    const car2 = await prisma.car.upsert({
        where: { plateNumber: 'AA-2-67890' },
        update: {},
        create: {
            make: 'Toyota',
            model: 'Land Cruiser',
            year: 2022,
            plateNumber: 'AA-2-67890',
            category: 'Luxury',
            dailyRate: 5000,
            status: 'AVAILABLE',
            features: ['AC', 'GPS', 'Leather Seats', '4WD'],
            location: 'Airport'
        }
    });

    const cars = [
        { make: 'Hyundai', model: 'Accent', year: 2021, plateNumber: 'AA-2-11111', category: 'Economy', dailyRate: 1200, features: ['AC', 'USB'], location: 'Main Office' },
        { make: 'Suzuki', model: 'Swift', year: 2022, plateNumber: 'AA-2-22222', category: 'Economy', dailyRate: 1100, features: ['Compact', 'Fuel Efficient'], location: 'Bole' },
        { make: 'Toyota', model: 'Rav4', year: 2019, plateNumber: 'AA-2-33333', category: 'SUV', dailyRate: 2500, features: ['AC', 'AWD', 'Spacious'], location: 'Main Office' },
        { make: 'Hyundai', model: 'Tucson', year: 2023, plateNumber: 'AA-2-44444', category: 'SUV', dailyRate: 3000, features: ['AC', 'Sunroof', 'Bluetooth'], location: 'Airport' },
        { make: 'Mercedes', model: 'C-Class', year: 2021, plateNumber: 'AA-2-55555', category: 'Luxury', dailyRate: 6000, features: ['Premium Sound', 'Leather', 'AC'], location: 'Airport' },
        { make: 'Ford', model: 'Explorer', year: 2020, plateNumber: 'AA-2-66666', category: 'SUV', dailyRate: 3200, features: ['7-Seater', 'Tow Hitch', 'AC'], location: 'Piazza' },
        { make: 'Kia', model: 'Cerato', year: 2022, plateNumber: 'AA-2-77777', category: 'Economy', dailyRate: 1400, features: ['AC', 'Bluetooth', 'Reverse Camera'], location: 'Main Office' },
        { make: 'Audi', model: 'A6', year: 2022, plateNumber: 'AA-2-88888', category: 'Luxury', dailyRate: 7000, features: ['Matrix LED', 'Leather', 'Quattro'], location: 'Airport' },
        { make: 'Mitsubishi', model: 'Pajero', year: 2018, plateNumber: 'AA-2-99999', category: 'SUV', dailyRate: 2800, features: ['Rugged', '4WD', 'AC'], location: 'Main Office' },
        { make: 'Toyota', model: 'HiAce', year: 2021, plateNumber: 'AA-2-10101', category: 'Van', dailyRate: 2200, features: ['12-Seater', 'AC', 'High Roof'], location: 'Megenagna' }
    ];

    for (const carData of cars) {
        await prisma.car.upsert({
            where: { plateNumber: carData.plateNumber },
            update: {},
            create: {
                ...carData,
                status: 'AVAILABLE'
            }
        });
    }

    console.log('Cars created: basic and additional 10 cars added.');

    // Create Packages
    const packages = [
        {
            name: 'Basic Daily',
            price: 1200,
            period: 'Daily',
            features: ['Basic Insurance', '24/7 Support', 'Standard Pickup'],
            category: 'Economy',
            isActive: true
        },
        {
            name: 'Standard Daily',
            price: 2000,
            period: 'Daily',
            features: ['Full Insurance', '24/7 Support', 'Airport Pickup', 'Free Cancellation'],
            category: 'Standard',
            isActive: true
        },
        {
            name: 'Premium Daily',
            price: 3500,
            period: 'Daily',
            features: ['Premium Insurance', 'Personal Driver', 'Airport Pickup/Dropoff', 'Unlimited Mileage', 'VIP Support'],
            category: 'Premium',
            isActive: true
        },
        {
            name: 'Weekly Economy',
            price: 7000,
            period: 'Weekly',
            features: ['Basic Insurance', '24/7 Support', 'Standard Pickup'],
            category: 'Economy',
            isActive: true
        },
        {
            name: 'Weekly Standard',
            price: 12000,
            period: 'Weekly',
            features: ['Full Insurance', '24/7 Support', 'Airport Pickup', 'Free Cancellation'],
            category: 'Standard',
            isActive: true
        },
        {
            name: 'Monthly Economy',
            price: 25000,
            period: 'Monthly',
            features: ['Basic Insurance', '24/7 Support', 'Standard Pickup', 'Regular Maintenance'],
            category: 'Economy',
            isActive: true
        },
        {
            name: 'Monthly Standard',
            price: 45000,
            period: 'Monthly',
            features: ['Full Insurance', '24/7 Support', 'Airport Pickup', 'Free Cancellation', 'Regular Maintenance'],
            category: 'Standard',
            isActive: true
        },
        {
            name: 'Monthly Premium',
            price: 80000,
            period: 'Monthly',
            features: ['Premium Insurance', 'Personal Driver', 'Airport Pickup/Dropoff', 'Unlimited Mileage', 'VIP Support', 'Regular Maintenance', 'Replacement Vehicle'],
            category: 'Premium',
            isActive: true
        }
    ];

    for (const pkg of packages) {
        const existingPkg = await prisma.package.findFirst({
            where: { name: pkg.name }
        });

        if (!existingPkg) {
            await prisma.package.create({
                data: pkg
            });
        }
    }
    console.log('Packages created: 8 rental packages added.');

    // Create home page content blocks
    const homeContents = [
        {
            section: 'WHY_CHOOSE',
            title: 'Customer First',
            description: 'Our service is built around your needs, with fast support and flexible rental options.',
            icon: 'Users',
            order: 1,
            isActive: true
        },
        {
            section: 'WHY_CHOOSE',
            title: 'Quality Fleet',
            description: 'Choose from a wide selection of well-maintained vehicles for every journey.',
            icon: 'Award',
            order: 2,
            isActive: true
        },
        {
            section: 'WHY_CHOOSE',
            title: 'Local Expertise',
            description: 'We know the area and offer reliable support wherever you travel.',
            icon: 'MapPin',
            order: 3,
            isActive: true
        },
        {
            section: 'WHY_CHOOSE',
            title: 'Fully Insured',
            description: 'Drive with confidence knowing every rental includes full coverage options.',
            icon: 'Shield',
            order: 4,
            isActive: true
        },
        {
            section: 'MISSION',
            title: 'Customer-first service',
            description: 'We are committed to putting customers first on every trip.',
            order: 1,
            isActive: true
        },
        {
            section: 'MISSION',
            title: 'Transparent pricing',
            description: 'No surprises — fair rates with clear terms for every rental.',
            order: 2,
            isActive: true
        },
        {
            section: 'MISSION',
            title: 'Fast support',
            description: 'Our team is available to help you at every step of your booking.',
            order: 3,
            isActive: true
        },
        {
            section: 'MISSION',
            title: 'Safe journeys',
            description: 'We maintain every vehicle to high safety and comfort standards.',
            order: 4,
            isActive: true
        }
    ];

    for (const content of homeContents) {
        const existingContent = await prisma.homeContent.findFirst({
            where: { section: content.section, title: content.title }
        });

        if (!existingContent) {
            await prisma.homeContent.create({ data: content });
        }
    }
    console.log('Home page content created.');

    // Ensure every seeded user has a local bank account (wallet) with default balance
    const allUsers = await prisma.user.findMany();
    for (const u of allUsers) {
        const accountNumber = `LBA-${String(u.id).padStart(10, '0')}`;
        await prisma.bankAccount.upsert({
            where: { userId: u.id },
            update: {},
            create: {
                userId: u.id,
                accountNumber,
                balance: 20000,
                accountType: 'CUSTOMER'
            }
        });
        console.log('Bank account ensured for user:', u.email);
    }

    // Create a sample booking (only if none exist for this customer+car combo)
    const existingBooking = await prisma.booking.findFirst({
        where: { userId: customer.id, carId: car1.id }
    });
    if (!existingBooking) {
        const booking = await prisma.booking.create({
            data: {
                userId: customer.id,
                carId: car1.id,
                startDate: new Date(),
                endDate: new Date(new Date().setDate(new Date().getDate() + 3)),
                totalAmount: 4500,
                status: 'APPROVED',
                processedById: seededEmployees[0].id,
                pickupLocation: 'Bole Airport',
                returnLocation: 'Bole Airport',
                isDelivery: true,
                idCardUrl: 'http://example.com/id.jpg',
                driverLicenseUrl: 'http://example.com/license.jpg'
            }
        });
        console.log('Booking created:', booking.id);
    } else {
        console.log('Sample booking already exists, skipping.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
