const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

/**
 * GET /subjects
 * Lấy danh sách môn học mà giảng viên phụ trách cùng số lượng dự án.
 * Yêu cầu: Token hợp lệ, vai trò giảng viên (role = 1).
 * Trả về: Mảng các môn học với SubjectId, SubjectCode, SubjectName, TotalProjects.
 */
router.get('/', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        // 1. Kiểm tra token và accountId
        if (!req.user || !req.user.accountId) {
            console.error('Token không chứa accountId:', req.user);
            return res.status(401).json({ message: 'Token không hợp lệ, thiếu accountId' });
        }
        const accountId = req.user.accountId;
        console.log('accountId:', accountId);

        // 2. Kiểm tra kết nối database
        await poolConnect;
        console.log('Kết nối database thành công');

        // 3. Truy vấn để lấy LecturerId
        const lecturerRequest = pool.request();
        const lecturerResult = await lecturerRequest
            .input('accountId', sql.VarChar(20), accountId)
            .query('SELECT Id FROM Lecturers WHERE AccountId = @accountId');

        if (!lecturerResult.recordset || lecturerResult.recordset.length === 0) {
            console.log('Không tìm thấy giảng viên:', { accountId });
            return res.status(404).json({ message: 'Không tìm thấy giảng viên tương ứng' });
        }

        const lecturerId = lecturerResult.recordset[0].Id;
        console.log('lecturerId:', lecturerId);

        // 4. Truy vấn danh sách môn học
        const subjectRequest = pool.request();
        const subjectResult = await subjectRequest
            .input('lecturerId', sql.Int, lecturerId)
            .query(`
                SELECT 
                    s.Id AS SubjectId,
                    s.SubjectCode,
                    s.SubjectName,
                    COUNT(p.Id) AS TotalProjects
                FROM Projects p
                INNER JOIN Subjects s ON s.Id = p.SubjectId
                WHERE p.CreatedByLecturer = @lecturerId
                GROUP BY s.Id, s.SubjectCode, s.SubjectName
            `);

        // 5. Trả về dữ liệu
        console.log('Dữ liệu trả về:', subjectResult.recordset);
        res.json(subjectResult.recordset);
    } catch (error) {
        // 6. Ghi log chi tiết và trả về lỗi
        console.error('Lỗi khi lấy danh sách môn học giảng viên:', {
            message: error.message,
            stack: error.stack,
            accountId: req.user?.accountId
        });
        res.status(500).json({ message: 'Lỗi server, vui lòng thử lại sau' });
    }
});

module.exports = router;