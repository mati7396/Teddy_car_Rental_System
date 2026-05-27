const prisma = require('../utils/prismaClient');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

// Driver Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[Driver Login Attempt] Email: ${email}`);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const driver = await prisma.driver.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!driver) {
            console.log(`[Driver Login] FAILED: Driver not found for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValid = await comparePassword(password, driver.password);
        if (!isValid) {
            console.log(`[Driver Login] FAILED: Password mismatch for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log(`[Driver Login] SUCCESS: Logged in as: ${driver.fullName}`);
        const token = generateToken(driver.id, 'DRIVER');

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: driver.id,
                email: driver.email,
                fullName: driver.fullName,
                role: 'DRIVER'
            }
        });
    } catch (error) {
        console.error('Driver login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin Create Driver
const adminCreateDriver = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        if (!fullName || !email || !password || !phone) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingDriver = await prisma.driver.findUnique({ 
            where: { email: email.toLowerCase() } 
        });
        if (existingDriver) {
            return res.status(400).json({ message: 'Driver with this email already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const newDriver = await prisma.driver.create({
            data: {
                fullName,
                email: email.toLowerCase(),
                password: hashedPassword,
                phone,
                status: 'AVAILABLE'
            }
        });

        const { password: _, ...sanitizedDriver } = newDriver;
        res.status(201).json({
            message: 'Driver created successfully',
            driver: sanitizedDriver
        });
    } catch (error) {
        console.error('Admin create driver error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin Update Driver
const adminUpdateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, password, phone, status, licenseNumber, profilePictureUrl } = req.body;
        const driverId = parseInt(id);

        const existingDriver = await prisma.driver.findUnique({ where: { id: driverId } });
        if (!existingDriver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        if (email && email.toLowerCase() !== existingDriver.email) {
            const emailTaken = await prisma.driver.findUnique({ where: { email: email.toLowerCase() } });
            if (emailTaken) {
                return res.status(400).json({ message: 'Driver with this email already exists' });
            }
        }

        const updateData = {
            ...(fullName !== undefined && { fullName }),
            ...(email !== undefined && { email: email.toLowerCase() }),
            ...(phone !== undefined && { phone }),
            ...(status !== undefined && { status }),
            ...(licenseNumber !== undefined && { licenseNumber }),
            ...(profilePictureUrl !== undefined && { profilePictureUrl })
        };

        if (password) {
            updateData.password = await hashPassword(password);
        }

        const updatedDriver = await prisma.driver.update({
            where: { id: driverId },
            data: updateData
        });

        const { password: _, ...sanitizedDriver } = updatedDriver;
        res.json({ message: 'Driver updated successfully', driver: sanitizedDriver });
    } catch (error) {
        console.error('Admin update driver error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get All Drivers (Admin/Employee)
const getAllDrivers = async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const sanitizedDrivers = drivers.map(driver => {
            const { password, ...rest } = driver;
            return rest;
        });

        res.json(sanitizedDrivers);
    } catch (error) {
        console.error('Get all drivers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Driver Profile
const getProfile = async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { id: req.user.id }
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const { password, ...sanitizedDriver } = driver;
        res.json(sanitizedDriver);
    } catch (error) {
        console.error('Get driver profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Driver Profile (Self)
const updateProfile = async (req, res) => {
    try {
        const { fullName, phone, licenseNumber, profilePictureUrl } = req.body;
        const driverId = req.user.id;

        const updatedDriver = await prisma.driver.update({
            where: { id: driverId },
            data: {
                fullName,
                phone,
                ...(licenseNumber !== undefined && { licenseNumber }),
                ...(profilePictureUrl !== undefined && { profilePictureUrl })
            }
        });

        const { password, ...sanitizedDriver } = updatedDriver;
        res.json({
            message: 'Profile updated successfully',
            driver: sanitizedDriver
        });
    } catch (error) {
        console.error('Update driver profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Change Password (Self)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const driverId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required' });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const isValid = await comparePassword(currentPassword, driver.password);
        if (!isValid) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.driver.update({
            where: { id: driverId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete Driver (Admin Only)
const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if driver has any deliveries tied to their account (including past deliveries).
        // Deleting a driver that has deliveries will violate referential integrity, so refuse.
        const totalDeliveries = await prisma.delivery.count({
            where: { driverId: parseInt(id) }
        });

        if (totalDeliveries > 0) {
            return res.status(400).json({ message: 'Cannot delete driver with delivery records. Remove or reassign deliveries first.' });
        }

        await prisma.driver.delete({ where: { id: parseInt(id) } });

        res.json({ message: 'Driver deleted successfully' });
    } catch (error) {
        console.error('Delete driver error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Assigned Deliveries (Driver Only)
const getAssignedDeliveries = async (req, res) => {
    try {
        const deliveries = await prisma.delivery.findMany({
            where: { driverId: req.user.id },
            include: {
                booking: {
                    include: {
                        user: {
                            include: { customerProfile: true }
                        },
                        car: true,
                        package: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(deliveries);
    } catch (error) {
        console.error('Get assigned deliveries error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Delivery Status (Driver Only)
const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const delivery = await prisma.delivery.findUnique({
            where: { id: parseInt(id) }
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updateData = { status };
        if (status === 'DELIVERED') {
            updateData.deliveredAt = new Date();
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                booking: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // Update driver status if needed
        if (status === 'DELIVERED') {
            await prisma.driver.update({
                where: { id: req.user.id },
                data: { status: 'AVAILABLE' }
            });
        } else if (status === 'ON_THE_WAY') {
            await prisma.driver.update({
                where: { id: req.user.id },
                data: { status: 'ON_DELIVERY' }
            });
        }

        // Send notifications
        try {
            await prisma.notification.createMany({
                data: [
                    {
                        userId: updatedDelivery.booking.userId,
                        message: `Your car delivery status has been updated to: ${status.replace(/_/g, ' ')}.`
                    },
                    {
                        recipientRole: 'EMPLOYEE',
                        message: `Driver ${req.user.fullName} updated delivery #${id} to ${status}.`
                    }
                ]
            });
        } catch (notifError) {
            console.error('Notification error:', notifError);
            // Don't fail the request if notification fails
        }

        res.json({
            message: 'Delivery status updated successfully',
            delivery: updatedDelivery
        });
    } catch (error) {
        console.error('Update delivery status error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    login,
    adminCreateDriver,
    adminUpdateDriver,
    getAllDrivers,
    getProfile,
    updateProfile,
    deleteDriver,
    getAssignedDeliveries,
    updateDeliveryStatus,
    changePassword
};
