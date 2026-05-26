//It allows the application to list, create, update, and deactivate packages that users can book or purchase.//
const prisma = require('../utils/prismaClient');

const getAllPackages = async (req, res) => {
    try {
        const { lng = 'en' } = req.query;
        const packages = await prisma.package.findMany({
            where: { 
                isActive: true,
                language: lng
            },
            orderBy: { price: 'asc' }
        });
        res.json(packages);
    } catch (error) {
        console.error('Get all packages error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createPackage = async (req, res) => {
    try {
        const { name, price, period, features, category } = req.body;

        const pkg = await prisma.package.create({
            data: {
                name,
                price: parseFloat(price),
                period,
                features: features || [],
                category,
                isActive: true
            }
        });

        res.status(201).json(pkg);
    } catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, period, features, category, isActive } = req.body;

        // Build update data with only allowed fields
        const data = {};
        if (name !== undefined) data.name = name;
        if (price !== undefined) data.price = parseFloat(price);
        if (period !== undefined) data.period = period;
        if (features !== undefined) data.features = features;
        if (category !== undefined) data.category = category;
        if (isActive !== undefined) data.isActive = isActive;

        const pkg = await prisma.package.update({
            where: { id: parseInt(id) },
            data
        });

        res.json(pkg);
    } catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete for safety
        await prisma.package.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });

        res.json({ message: 'Package deactivated successfully' });
    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAllPackages,
    createPackage,
    updatePackage,
    deletePackage
};
