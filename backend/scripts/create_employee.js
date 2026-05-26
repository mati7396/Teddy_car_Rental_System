//This code is a setup (seeding) script that ensures an employee account exists in your system without duplicating it.//
require('dotenv').config();
const prisma = require('../src/utils/prismaClient');
const bcrypt = require('bcrypt');

async function main() {
    const email = 'employee@teddyrental.com';
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log('Employee already exists');
        return;
    }

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            role: 'EMPLOYEE',
        },
    });

    console.log('Employee account created successfully:', user.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
