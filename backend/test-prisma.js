require('dotenv').config();
const prisma = require('./src/utils/prismaClient');

async function test() {
    try {
        console.log('Testing Prisma upsert...');
        const profile = await prisma.customerProfile.upsert({
            where: { userId: 1 },
            update: {
                profilePhotoUrl: 'test-url'
            },
            create: {
                userId: 1,
                firstName: 'Test',
                lastName: 'User',
                phoneNumber: '1234567890',
                profilePhotoUrl: 'test-url'
            }
        });
        console.log('Upsert successful:', profile);
    } catch (error) {
        console.error('Upsert failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
