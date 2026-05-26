// Setup script to initialize the database with sample data
// Run this script with: node setup.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(50));
console.log('Teddy Car Rental - Database Setup');
console.log('='.repeat(50));

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('\n⚠️  .env file not found. Creating from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file');
    console.log('\n📝 Please edit backend/.env with your PostgreSQL credentials before continuing.');
    console.log('   Then run this script again: node setup.js');
    process.exit(1);
}

if (!fs.existsSync(envPath)) {
    console.log('\n❌ Error: .env file not found!');
    console.log('   Please create backend/.env with your DATABASE_URL');
    process.exit(1);
}

console.log('\n📦 Running database migrations...');
try {
    execSync('npx prisma migrate dev --name init', {
        cwd: __dirname,
        stdio: 'inherit'
    });
    console.log('✅ Migrations completed');
} catch (error) {
    console.log('\n❌ Migration failed. Please check your DATABASE_URL in .env');
    console.log('   Make sure PostgreSQL is running and the database exists.');
    process.exit(1);
}

console.log('\n🌱 Seeding database with sample data...');
try {
    execSync('node prisma/seed.js', {
        cwd: __dirname,
        stdio: 'inherit'
    });
    console.log('✅ Seeding completed');
} catch (error) {
    console.log('\n❌ Seeding failed:', error.message);
    process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('🎉 Database setup complete!');
console.log('='.repeat(50));

console.log('\n📋 Default Login Credentials:');
console.log('   Admin:    admin@teddyrental.com / Password123!');
console.log('   Employee: employee@teddyrental.com / Password123!');
console.log('   Customer: customer@test.com / customer123');

console.log('\n🚀 To start the application:');
console.log('   Terminal 1: cd backend && npm run dev');
console.log('   Terminal 2: cd frontend && npm run dev');
console.log('\n   Frontend: http://localhost:5173');
console.log('   Backend:  http://localhost:5000');
console.log('');
