require('dotenv').config();
const prisma = require('../src/utils/prismaClient');

const NEW_BALANCE = 20000;

async function main() {
    console.log(`Updating all CUSTOMER bank accounts to ${NEW_BALANCE.toLocaleString()} ETB...\n`);

    const accounts = await prisma.bankAccount.findMany({
        where: { accountType: 'CUSTOMER' },
        include: { user: { select: { email: true } } }
    });

    if (accounts.length === 0) {
        console.log('No customer accounts found.');
        return;
    }

    console.log(`Found ${accounts.length} customer account(s):\n`);

    for (const account of accounts) {
        const oldBalance = Number(account.balance);
        await prisma.bankAccount.update({
            where: { id: account.id },
            data: { balance: NEW_BALANCE }
        });
        console.log(`✅ ${account.user?.email || account.accountNumber}: ${oldBalance.toLocaleString()} → ${NEW_BALANCE.toLocaleString()} ETB`);
    }

    console.log(`\n✅ Done. ${accounts.length} account(s) updated.`);
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
