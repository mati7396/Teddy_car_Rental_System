const prisma = require('../utils/prismaClient');

// POST /api/contact — public (works for guests and logged-in customers)
const submitMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email, and message are required.' });
        }

        // Attach userId if the request carries a valid token (optional auth)
        const userId = req.user?.id || null;

        const contact = await prisma.contactMessage.create({
            data: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                message: message.trim(),
                userId
            },
            include: { replies: true }
        });

        await prisma.notification.createMany({
            data: [
                {
                    recipientRole: 'ADMIN',
                    message: `New contact message from ${name} (${email}): "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`,
                    isRead: false
                },
                {
                    recipientRole: 'EMPLOYEE',
                    message: `New contact message from ${name} (${email}): "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`,
                    isRead: false
                }
            ]
        });

        res.status(201).json({ message: 'Message sent successfully.', id: contact.id, data: contact });
    } catch (error) {
        console.error('Submit contact message error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/contact/my — customer: fetch their own conversations (requires auth)
const getMyMessages = async (req, res) => {
    try {
        const messages = await prisma.contactMessage.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: { replies: { orderBy: { createdAt: 'asc' } } }
        });
        res.json(messages);
    } catch (error) {
        console.error('Get my messages error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/contact/my/:id — customer: single conversation
const getMyMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const msg = await prisma.contactMessage.findFirst({
            where: { id: parseInt(id), userId: req.user.id },
            include: { replies: { orderBy: { createdAt: 'asc' } } }
        });
        if (!msg) return res.status(404).json({ message: 'Conversation not found.' });
        res.json(msg);
    } catch (error) {
        console.error('Get my message error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/contact — admin/employee: all messages
const getMessages = async (req, res) => {
    try {
        const messages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' },
            include: { replies: { orderBy: { createdAt: 'asc' } } }
        });
        res.json(messages);
    } catch (error) {
        console.error('Get contact messages error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/contact/:id — admin/employee: single message
const getMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const msg = await prisma.contactMessage.findUnique({
            where: { id: parseInt(id) },
            include: { replies: { orderBy: { createdAt: 'asc' } } }
        });
        if (!msg) return res.status(404).json({ message: 'Message not found.' });
        res.json(msg);
    } catch (error) {
        console.error('Get contact message error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/contact/:id/reply — admin/employee reply
const postReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req.body;
        if (!body || !body.trim()) {
            return res.status(400).json({ message: 'Reply body is required.' });
        }

        const senderName = req.user?.email || 'Support Team';
        const senderRole = req.user?.role || 'ADMIN';

        const parent = await prisma.contactMessage.findUnique({ where: { id: parseInt(id) } });
        if (!parent) return res.status(404).json({ message: 'Message not found.' });

        const reply = await prisma.contactReply.create({
            data: {
                contactMessageId: parseInt(id),
                senderName,
                senderRole,
                body: body.trim()
            }
        });

        // Mark original as read and notify the customer if they have an account
        await prisma.contactMessage.update({
            where: { id: parseInt(id) },
            data: { isRead: true }
        });

        if (parent.userId) {
            await prisma.notification.create({
                data: {
                    userId: parent.userId,
                    message: `Support replied to your message: "${body.substring(0, 80)}${body.length > 80 ? '...' : ''}"`,
                    isRead: false
                }
            });
        }

        res.status(201).json(reply);
    } catch (error) {
        console.error('Post reply error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/contact/:id/read — admin/employee
const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const msg = await prisma.contactMessage.update({
            where: { id: parseInt(id) },
            data: { isRead: true }
        });
        res.json(msg);
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// DELETE /api/contact/:id — admin only
const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contactMessage.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Message deleted.' });
    } catch (error) {
        console.error('Delete contact message error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    submitMessage, getMyMessages, getMyMessage,
    getMessages, getMessage, postReply, markRead, deleteMessage
};
