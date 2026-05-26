const prisma = require('../utils/prismaClient');

const getHomeContent = async (req, res) => {
    try {
        const { lng = 'en' } = req.query;
        const contents = await prisma.homeContent.findMany({
            where: { 
                isActive: true,
                language: lng
            },
            orderBy: [{ section: 'asc' }, { order: 'asc' }]
        });

        const whyChoose = contents
            .filter(item => item.section === 'WHY_CHOOSE')
            .map(item => ({ id: item.id, title: item.title, description: item.description, icon: item.icon, order: item.order }));

        const mission = contents
            .filter(item => item.section === 'MISSION')
            .map(item => ({ id: item.id, title: item.title, description: item.description, order: item.order }));

        res.json({ whyChoose, mission });
    } catch (error) {
        console.error('Get home content error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAllContent = async (req, res) => {
    try {
        const contents = await prisma.homeContent.findMany({ orderBy: [{ section: 'asc' }, { order: 'asc' }] });
        res.json(contents);
    } catch (error) {
        console.error('Get all content error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createContent = async (req, res) => {
    try {
        const { section, title, description, icon, order, isActive } = req.body;
        const content = await prisma.homeContent.create({
            data: {
                section,
                title,
                description,
                icon,
                order: order ?? 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });
        res.status(201).json(content);
    } catch (error) {
        console.error('Create content error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateContent = async (req, res) => {
    try {
        const { id } = req.params;
        const { section, title, description, icon, order, isActive } = req.body;
        const data = {};
        if (section !== undefined) data.section = section;
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (icon !== undefined) data.icon = icon;
        if (order !== undefined) data.order = order;
        if (isActive !== undefined) data.isActive = isActive;

        const content = await prisma.homeContent.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(content);
    } catch (error) {
        console.error('Update content error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteContent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.homeContent.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });
        res.json({ message: 'Content deactivated successfully' });
    } catch (error) {
        console.error('Delete content error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getHomeContent,
    getAllContent,
    createContent,
    updateContent,
    deleteContent
};
