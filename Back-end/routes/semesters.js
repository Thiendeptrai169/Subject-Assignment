const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/dbconfig');



router.get('/', async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();
        const result = await request.query(`
            SELECT
                Id,
                AcademicYear,
                Semester,
                SemesterName, -- Lấy tên nếu có
                StartDate,    -- Có thể hữu ích để hiển thị trong dropdown
                EndDate
            FROM dbo.Semesters
            ORDER BY StartDate DESC; -- Sắp xếp kỳ mới nhất lên đầu
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi lấy danh sách học kỳ:', err);
        res.status(500).json({ message: 'Không thể lấy dữ liệu học kỳ.' });
    }
});

router.get('/current', async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const result = await request
            .input('currentDate', sql.Date, today)
            .query(`
            SELECT TOP 1
            Id,
            AcademicYear,
            Semester,
            StartDate,
            EndDate
            From Semesters
            WHERE @currentDate >= StartDate AND @currentDate <= EndDate
        `);
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            console.warn('Không tìm thấy học kỳ hiện tại cho ngày:', today);
            res.status(404).json({ message: 'Không tìm thấy học kỳ hiện tại.' });
        }
    } catch (err) {
        console.error('Lỗi khi lấy học kỳ hiện tại:', err);
        res.status(500).json({ message: 'Không thể xác định học kỳ hiện tại.' });
    }

});
module.exports = router;