const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/dbconfig');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Chỉ giảng viên (role = 1) mới truy cập được
router.get('/', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const accountId = req.user.accountId;

        await poolConnect;
        const request = pool.request();

        // Lấy LecturerId từ AccountId
        const lecturerResult = await request
            .input('accountId', sql.VarChar(20), accountId)
            .query(`SELECT Id FROM Lecturers WHERE AccountId = @accountId`);

        if (lecturerResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
        }

        const lecturerId = lecturerResult.recordset[0].Id;

        // Lấy các Project mà giảng viên tạo + nhóm của mỗi project
        const result = await request
            .input('lecturerId', sql.Int, lecturerId)
            .query(`
                SELECT
                    P.Id AS ProjectId,
                    P.ProjectCode,
                    P.ProjectName,
                    SG.Id AS GroupId,
                    SG.GroupName,
                    SG.GroupStatus,
                    SG.PresentationDate
                FROM Projects P
                LEFT JOIN StudentGroups SG ON SG.SubjectProjectsId = P.Id
                WHERE P.CreatedByLecturer = @lecturerId
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách dự án của giảng viên:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;
