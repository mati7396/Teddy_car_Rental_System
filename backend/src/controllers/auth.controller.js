//It handles user registration, login, logout, and profile management for your app.//
const prisma = require('../utils/prismaClient');
const crypto = require('crypto');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');
const DEFAULT_OPENING_BALANCE = Number(process.env.LOCAL_BANK_OPENING_BALANCE || 10000);
const generateAccountNumber = (userId) => `LBA-${String(userId).padStart(10, '0')}`;

const register = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, phoneNumber, address } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        if (role && !['CUSTOMER', 'EMPLOYEE', 'ADMIN'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const nameRegex = /^[A-Za-z\s]+$/;
        if (firstName && !nameRegex.test(firstName)) {
            return res.status(400).json({ message: 'First name must contain only letters' });
        }
        if (lastName && !nameRegex.test(lastName)) {
            return res.status(400).json({ message: 'Last name must contain only letters' });
        }

        const phoneRegex = /^\+?[\d\s-]{8,15}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }

        // Ethiopian phone number validation for staff (+251 followed by 9 digits starting with 7 or 9)
        const ethioPhoneRegex = /^\+251[79]\d{8}$/;
        if ((role === 'EMPLOYEE' || role === 'ADMIN') && phoneNumber && !ethioPhoneRegex.test(phoneNumber)) {
            return res.status(400).json({ message: 'Staff phone number must be in Ethiopian format: +251 followed by 9 digits' });
        }

        // Age validation for staff (at least 20 years old)
        if ((role === 'EMPLOYEE' || role === 'ADMIN') && req.body.dateOfBirth) {
            const today = new Date();
            const birthDate = new Date(req.body.dateOfBirth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 20) {
                return res.status(400).json({ message: 'Employee must be at least 20 years old' });
            }
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: role || 'CUSTOMER',
                // Create a profile for customers AND employees to store their name
                customerProfile: {
                    create: {
                        firstName: firstName || '',
                        lastName: lastName || '',
                        phoneNumber: phoneNumber || '',
                        address: address || '',
                        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
                        gender: req.body.gender || null
                    }
                }
            },
            include: {
                customerProfile: true
            }
        });

        const token = generateToken(newUser.id, newUser.role);

        // Create a local bank account automatically for every new user.
        // Do not block registration if bank tables are not migrated yet.
        try {
            await prisma.bankAccount.upsert({
                where: { userId: newUser.id },
                update: {},
                create: {
                    userId: newUser.id,
                    accountNumber: generateAccountNumber(newUser.id),
                    balance: DEFAULT_OPENING_BALANCE,
                    accountType: 'CUSTOMER'
                }
            });
        } catch (bankError) {
            console.warn('Bank account creation skipped during registration:', bankError.message);
        }

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                profile: newUser.customerProfile
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { customerProfile: true }
        });

        let isDriver = false;
        if (!user) {
            // Check Driver table
            user = await prisma.driver.findUnique({
                where: { email: email.toLowerCase() }
            });
            if (user) {
                isDriver = true;
                user.role = 'DRIVER'; 
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is active (only for non-drivers for now)
        if (!isDriver && user.isActive === false) {
            return res.status(403).json({ message: 'Account has been deactivated. Please contact support.' });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user.id, user.role);

        // On customer login, ensure local bank account exists but DO NOT reset balance.
        // Creating a missing account uses the configured default opening balance.
        if (user.role === 'CUSTOMER') {
            try {
                await prisma.bankAccount.upsert({
                    where: { userId: user.id },
                    update: {},
                    create: {
                        userId: user.id,
                        accountNumber: generateAccountNumber(user.id),
                        balance: DEFAULT_OPENING_BALANCE,
                        accountType: 'CUSTOMER'
                    }
                });
            } catch (bankError) {
                console.warn('Bank account sync skipped during login:', bankError.message);
            }
        }

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                ...(isDriver ? { fullName: user.fullName, phone: user.phone, profilePictureUrl: user.profilePictureUrl } : { profile: user.customerProfile })
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const rawEmail = req.body?.email;
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
        console.log('Forgot password request received for:', email || '[missing email]');

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.warn('Forgot password requested for non-existent email:', email);
            return res.status(404).json({ message: 'Email is not registered' });
        }

        const resetCode = crypto.randomInt(100000, 1000000).toString();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.user.update({
            where: { email },
            data: {
                passwordResetCode: resetCode,
                passwordResetExpires: resetExpires
            }
        });
        console.log('Password reset code generated and saved:', {
            userId: user.id,
            email,
            expiresAt: resetExpires.toISOString()
        });

        await sendPasswordResetEmail({ to: email, code: resetCode });
        console.log('Password reset email dispatch completed for:', email);

        res.json({ message: 'Reset code sent successfully. Please check your email.' });
    } catch (error) {
        console.error('Forgot password error:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: 'Unable to send password reset email right now. Please try again later.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const rawEmail = req.body?.email;
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
        const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
        const newPassword = req.body?.newPassword;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.passwordResetCode || !user.passwordResetExpires) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        const now = new Date();
        if (user.passwordResetCode !== code || user.passwordResetExpires < now) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                passwordResetCode: null,
                passwordResetExpires: null
            }
        });

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const logout = async (req, res) => {
    // UI-07/UI-10: Logout
    // Since we are using stateless JWT, we can't truly invalidate the token server-side without a blacklist/redis.
    // The client is responsible for clearing the token.
    res.json({ message: 'You have been logged out successfully.' });
};

const getProfile = async (req, res) => {
    try {
        if (req.user.role === 'DRIVER') {
            const driver = await prisma.driver.findUnique({
                where: { id: req.user.id }
            });
            if (!driver) return res.status(404).json({ message: 'Driver not found' });
            const { password, ...rest } = driver;
            return res.json({ ...rest, role: 'DRIVER' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { customerProfile: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.customerProfile
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { idCardUrl, driverLicenseUrl, address, phoneNumber, agreementSigned, firstName, lastName, email } = req.body;
        const userId = req.user.id;

        console.log(`Updating profile for user ${userId}:`, req.body);

        const nameRegex = /^[A-Za-z\s]+$/;
        if (firstName && !nameRegex.test(firstName)) {
            return res.status(400).json({ message: 'First name must contain only letters' });
        }
        if (lastName && !nameRegex.test(lastName)) {
            return res.status(400).json({ message: 'Last name must contain only letters' });
        }

        const phoneRegex = /^\+?[\d\s-]{8,15}$/;
        if (phoneNumber && !phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }

        // Ethiopian phone number validation for staff (+251 followed by 9 digits starting with 7 or 9)
        const ethioPhoneRegex = /^\+251[79]\d{8}$/;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if ((user.role === 'EMPLOYEE' || user.role === 'ADMIN') && phoneNumber && !ethioPhoneRegex.test(phoneNumber)) {
            return res.status(400).json({ message: 'Staff phone number must be in Ethiopian format: +251 followed by 9 digits' });
        }

        // Update email if provided
        if (email) {
            const normalizedEmail = email.trim().toLowerCase();
            const existingUser = await prisma.user.findUnique({ where: { id: userId } });
            
            if (existingUser.email !== normalizedEmail) {
                // Check if email is already taken
                const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
                if (emailTaken) {
                    return res.status(400).json({ message: 'Email is already in use' });
                }
                
                await prisma.user.update({
                    where: { id: userId },
                    data: { email: normalizedEmail }
                });
            }
        }

        const updatedProfile = await prisma.customerProfile.upsert({
            where: { userId },
            update: {
                idCardUrl: idCardUrl !== undefined ? idCardUrl : undefined,
                driverLicenseUrl: driverLicenseUrl !== undefined ? driverLicenseUrl : undefined,
                address: address !== undefined ? address : undefined,
                phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
                agreementSigned: agreementSigned !== undefined ? agreementSigned : undefined,
                firstName: firstName !== undefined ? firstName : undefined,
                lastName: lastName !== undefined ? lastName : undefined,
                profilePhotoUrl: req.body.profilePhotoUrl !== undefined ? req.body.profilePhotoUrl : undefined,
            },
            create: {
                userId,
                firstName: firstName || '',
                lastName: lastName || '',
                phoneNumber: phoneNumber || '',
                idCardUrl,
                driverLicenseUrl,
                address,
                agreementSigned: agreementSigned || false,
                profilePhotoUrl: req.body.profilePhotoUrl || undefined
            }
        });

        console.log('Profile updated successfully:', updatedProfile.id);

        res.json({
            message: 'Profile updated successfully',
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Incorrect current password' });
        }

        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword
};

