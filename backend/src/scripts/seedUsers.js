require('dotenv').config();
const prisma = require('../utils/prismaClient');
const bcrypt = require('bcrypt');

async function main() {
    console.log('Starting seed with official emails...');

    const employeePassword = await bcrypt.hash('employee123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Create Employee - employee@gmail.com
    const employee = await prisma.user.upsert({
        where: { email: 'employee@gmail.com' },
        update: {
            password: employeePassword,
            role: 'EMPLOYEE'
        },
        create: {
            email: 'employee@gmail.com',
            password: employeePassword,
            role: 'EMPLOYEE'
        }
    });
    console.log('Processed employee user:', employee.email);

    // Create Admin - admin@gmail.com
    const admin = await prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {
            password: adminPassword,
            role: 'ADMIN'
        },
        create: {e
            email: 'admin@gmail.com',
            password: adminPassword,
            role: 'ADMIN'
        }
    });
    console.log('Processed admin user:', admin.email);

    console.log('Seed completed successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
