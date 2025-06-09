express = require('express');
const router = express.Router();
const {sql, pool, poolConnect } = require('../config/db');

const { authenticateToken, attachUserInfo, authorizeRole } = require('../middleware/auth');

router.get('/', authenticateToken, attachUserInfo, async (req, res) => {
    const loggedInStudentCode = req.user.studentCode; // Hardcode for now

    try {
        await poolConnect;
        const request = pool.request();
        request.input('studentCodeParam', sql.VarChar, loggedInStudentCode);

        const result = await request.query(`
            SELECT DISTINCT
                S.SubjectCode,
                S.SubjectName
            FROM
                Enrollment AS E
            INNER JOIN
                Subjects AS S ON E.SubjectCode = S.SubjectCode
            WHERE
                E.StudentCode = @studentCodeParam
                AND S.ExamType = N'Đồ án';
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách môn học.' });
    }
});

module.exports = router;