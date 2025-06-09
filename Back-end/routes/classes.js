const express = require('express');
const router = express.Router();
const {sql, pool, poolConnect} = require('../config/db');

router.get('/', async (req, res) => {
    const studentId = 1; //hard code

    try {
        await poolConnect;
        const request = pool.request();
        const today = new Date().toISOString().split('T')[0];
        request.input('studentIdParam', sql.Int, studentId);
        request.input('currentDateParam', sql.Date, today);
        const result = await request.query(`
            ;WITH CurrentSemester AS (
                SELECT TOP 1 Id
                FROM Semesters
                WHERE @currentDateParam >= StartDate AND @currentDateParam <= EndDate
                ORDER BY StartDate DESC
            )
            SELECT DISTINCT 
                C.ClassCode,
                C.Id AS ClassId 
            FROM
                Enrollment AS E
            INNER JOIN
                Class AS C ON E.ClassId = C.Id
            INNER JOIN
                CurrentSemester AS CS ON E.SemesterId = CS.Id 
            WHERE
                E.StudentId = @studentIdParam; 
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi lấy danh sách lớp học:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách lớp.' });
    }
});

module.exports = router;