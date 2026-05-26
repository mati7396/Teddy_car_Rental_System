const express = require('express');
const router = express.Router();
const upload = require('../utils/upload');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/document', authenticate, upload.single('document'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the path relative to the server root
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            message: 'File uploaded successfully',
            url: fileUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
});

module.exports = router;
