const express = require('express');
const router = express.Router();
const { sql, pool } = require('../config/db');
const { authenticateToken, attachUserInfo, authorizeRole } = require('../middleware/auth');

// Chỉ giảng viên (RoleId = 1) mới được truy cập
router.get('/', authenticateToken, attachUserInfo, authorizeRole([1]), async (req, res) => {
    try {
        const lecturerCode = req.user?.lecturerCode;
        const subjectClassId = req.query.subjectClassId; // Lấy SubjectClassId từ query string

        // Kiểm tra lecturerCode
        if (!lecturerCode) {
            return res.status(400).json({ message: 'Không tìm thấy mã giảng viên' });
        }

        // Kiểm tra subjectClassId
        if (!subjectClassId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp SubjectClassId trong query string' });
        }

        // Chuyển đổi subjectClassId thành số nguyên
        const parsedSubjectClassId = parseInt(subjectClassId);
        if (isNaN(parsedSubjectClassId)) {
            return res.status(400).json({ message: 'SubjectClassId phải là một số nguyên hợp lệ' });
        }

        // Thực hiện truy vấn
        const request = pool.request();
        const projectsResult = await request
            .input('lecturerCode', sql.VarChar(20), lecturerCode)
            .input('subjectClassId', sql.Int, parsedSubjectClassId)
            .query(`
                SELECT
                    P.ProjectCode,
                    P.ProjectName,
                    P.Description,
                    SCP.MaxRegisteredGroups
                FROM SubjectClasses SC
                INNER JOIN SubjectClassProjects SCP ON SC.Id = SCP.SubjectClassId
                INNER JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
                WHERE SC.LecturerCode = @lecturerCode
                  AND SC.Id = @subjectClassId
                ORDER BY P.ProjectName;
            `);

        // Kiểm tra kết quả
        if (projectsResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy đề tài nào cho lớp tín chỉ này' });
        }

        res.json(projectsResult.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đề tài:', error);
        res.status(500).json({ 
            message: 'Lỗi server khi lấy danh sách đề tài',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined // Chỉ trả chi tiết lỗi trong môi trường dev
        });
    }
});

module.exports = router;