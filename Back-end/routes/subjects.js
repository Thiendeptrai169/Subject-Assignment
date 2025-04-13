express = require('express');
const router = express.Router();
const { pool, poolConnect } = require('../config/db');

router.get('/', async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();
        const result = await request.query(`
            SELECT 
                SubjectCode,
                SubjectName
            FROM Subjects
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;