import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.get('/secure-download/:filename', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).send('Unauthorized');
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const filePath = path.join(__dirname, '../uploads/tasks/', req.params.filename);
        if (fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).send('File not found');
        }
    } catch (err) {
        res.status(401).send('Invalid token');
    }
});

export default router;
