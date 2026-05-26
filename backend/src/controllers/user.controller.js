//handling operations on users like fetching, updating roles, and activating/deactivating accounts.
const prisma = require('../utils/prismaClient');

const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const users = await prisma.user.findMany({
            where: { role: role || undefined },
            include: { customerProfile: true },
            orderBy: { createdAt: 'desc' }
        });

        // Remove passwords from response
        const sanitizedUsers = users.map(user => {
            const { password, ...rest } = user;
            return rest;
        });

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: { customerProfile: true, bookings: true, bankAccount: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { password, ...sanitizedUser } = user;
        res.json(sanitizedUser);
    } catch (error) {
        console.error('Get user by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['CUSTOMER', 'EMPLOYEE', 'ADMIN'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { role },
            select: { id: true, email: true, role: true }
        });

        res.json(user);
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Prevent admin from deleting themselves
        if (parseInt(id) === adminId) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Employees can only delete customers
        if (req.user.role === 'EMPLOYEE' && user.role !== 'CUSTOMER') {
            return res.status(403).json({ message: 'Employees can only delete customers' });
        }

        // Always soft delete - just deactivate the user
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { 
                isActive: false
            }
        });

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const reactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { isActive: true }
        });

        res.json({ message: 'User reactivated successfully' });
    } catch (error) {
        console.error('Reactivate user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const adminUpdateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role, firstName, lastName, phoneNumber, address, dateOfBirth, gender, password } = req.body;

        const nameRegex = /^[A-Za-z\s]+$/;
        if (firstName && !nameRegex.test(firstName)) {
            return res.status(400).json({ message: 'First name must contain only letters' });
        }
        if (lastName && !nameRegex.test(lastName)) {
            return res.status(400).json({ message: 'Last name must contain only letters' });
        }

        const userId = parseInt(id);
        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const finalRole = role || existingUser.role;

        const ethioPhoneRegex = /^\+251[79]\d{8}$/;
        if ((finalRole === 'EMPLOYEE' || finalRole === 'ADMIN')) {
            if (phoneNumber && !ethioPhoneRegex.test(phoneNumber)) {
                return res.status(400).json({ message: 'Staff phone number must be in Ethiopian format: +251 followed by 9 digits' });
            }
            if (dateOfBirth) {
                const today = new Date();
                const birthDate = new Date(dateOfBirth);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                if (age < 20) {
                    return res.status(400).json({ message: 'Employee must be at least 20 years old' });
                }
            }
        }

        const updateData = {};
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (password) {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(password, 10);
        }

        const profileData = {};
        if (firstName !== undefined) profileData.firstName = firstName;
        if (lastName !== undefined) profileData.lastName = lastName;
        if (phoneNumber !== undefined) profileData.phoneNumber = phoneNumber;
        if (address !== undefined) profileData.address = address;
        if (gender !== undefined) profileData.gender = gender;
        if (dateOfBirth !== undefined) profileData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

        await prisma.user.update({
            where: { id: userId },
            data: {
                ...updateData,
                customerProfile: {
                    upsert: {
                        create: profileData,
                        update: profileData
                    }
                }
            }
        });

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const permanentlyDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Prevent admin from deleting themselves
        if (parseInt(id) === adminId) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hard delete the user (Prisma will handle cascading if configured, but here we manually handle the profile)
        // Actually, we should check for related records like bookings
        const bookingsCount = await prisma.booking.count({
            where: {
                OR: [
                    { userId: parseInt(id) },
                    { processedById: parseInt(id) }
                ]
            }
        });

        if (bookingsCount > 0) {
            return res.status(400).json({ message: 'Cannot permanently delete user with existing bookings. Please deactivate the account instead.' });
        }

        // Delete profile first due to relation
        await prisma.customerProfile.deleteMany({
            where: { userId: parseInt(id) }
        });

        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'User permanently deleted' });
    } catch (error) {
        console.error('Permanent delete error:', error);
        res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
    reactivateUser,
    adminUpdateUser,
    permanentlyDeleteUser
};
