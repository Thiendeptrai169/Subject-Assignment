const express = require('express');
const router = express.Router();
const { pool, poolConnect } = require('../config/dbconfig');

router.get('/', async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();
        const result = await request.query(`
            SELECT 
                Classcode,
                ClassName
            FROM Class
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi lấy danh sách lớp học:', err);
        res.status(500).send('Lỗi server');
    }
});

module.exports = router;