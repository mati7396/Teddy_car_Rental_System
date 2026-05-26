require('dotenv').config();
const prisma = require('./src/utils/prismaClient');

async function test() {
    try {
        console.log('Testing Driver table access...');
        const driverCount = await prisma.driver.count();
        console.log('Driver count:', driverCount);
        console.log('SUCCESS: Driver table is accessible.');
    } catch (error) {
        console.error('FAILURE: Could not access Driver table.');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.message.includes('is not a function')) {
            console.log('HINT: Your Prisma client is outdated. Run "npx prisma generate"');
        } else if (error.message.includes('does not exist')) {
            console.log('HINT: Your Database is missing the Driver table. Run "npx prisma migrate dev"');
        }
    } finally {
        process.exit();
    }
}

test();
