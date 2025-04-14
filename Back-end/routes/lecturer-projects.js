const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Chỉ giảng viên (RoleId = 1) mới được truy cập
router.get('/', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();

        // 1. Lấy accountId từ token
        const accountId = req.user.accountId;

        // 2. Truy vấn để lấy LecturerId tương ứng
        const lecturerResult = await request
            .input('accountId', sql.VarChar(20), accountId)
            .query(`
                SELECT Id FROM Lecturers WHERE AccountId = @accountId
            `);

        if (lecturerResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giảng viên tương ứng' });
        }

        const lecturerId = lecturerResult.recordset[0].Id;

        // 3. Truy vấn danh sách project giảng viên đó tạo
        const projectsResult = await request
            .input('lecturerId', sql.Int, lecturerId)
            .query(`
               SELECT
                P.Id AS ProjectId,
                P.ProjectName,
                P.StartDate,
                P.EndDate,
                S.SubjectName
            FROM Projects P
            JOIN Subjects S ON S.Id = P.SubjectId
            WHERE P.CreatedByLecturer = @lecturerId
            `);

        res.json(projectsResult.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách dự án giảng viên:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;