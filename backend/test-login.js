require('dotenv').config();
const prisma = require('./src/utils/prismaClient');
const { hashPassword, comparePassword } = require('./src/utils/hash');

async function debugLogin() {
    const testEmail = 'debug-driver@test.com';
    const testPass = 'Password123!';

    try {
        console.log('--- DEBUG LOGIN START ---');
        
        // 1. Cleanup old test driver
        await prisma.driver.deleteMany({ where: { email: testEmail } });
        console.log('1. Cleanup successful.');

        // 2. Create driver
        const hashed = await hashPassword(testPass);
        await prisma.driver.create({
            data: {
                fullName: 'Debug Driver',
                email: testEmail,
                password: hashed,
                phone: '0000000000',
                status: 'AVAILABLE'
            }
        });
        console.log('2. Test driver created with password:', testPass);

        // 3. Attempt Login logic
        console.log('3. Attempting login simulation...');
        const driver = await prisma.driver.findUnique({ where: { email: testEmail } });
        if (!driver) throw new Error('Driver not found in DB after creation!');

        const isValid = await comparePassword(testPass, driver.password);
        console.log('4. Password comparison result:', isValid);

        if (isValid) {
            console.log('SUCCESS: Login logic is working perfectly on the backend.');
        } else {
            console.log('FAILURE: Backend login logic is broken.');
        }

    } catch (error) {
        console.error('ERROR during debug:', error);
    } finally {
        process.exit();
    }
}

debugLogin();
