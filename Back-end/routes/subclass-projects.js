const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db'); // cấu hình kết nối SQL Server

// API lấy danh sách đề tài mà giảng viên gán cho lớp tín chỉ
router.get('/:subjectClassId/projects', async (req, res) => {
  const subjectClassId = parseInt(req.params.subjectClassId);

  if (!subjectClassId) {
    return res.status(400).json({ message: 'Thiếu tham số subjectClassId' });
  }

  try {
    await poolConnect; // đảm bảo pool kết nối xong
    const request = pool.request();

    const result = await request
      .input('SubjectClassId', sql.Int, subjectClassId)
      .query(`
        SELECT 
          p.ProjectCode,
          p.ProjectName,
          p.Description,
          sc.Id AS SubjectClassId,
          sc.ClassCode,
          s.SubjectName,
          l.FullName AS LecturerName
        FROM SubjectClassProjects scp
        JOIN SubjectClasses sc ON scp.SubjectClassId = sc.Id
        JOIN Projects p ON scp.ProjectCode = p.ProjectCode
        JOIN Subjects s ON sc.SubjectCode = s.SubjectCode
        JOIN Lecturers l ON sc.LecturerCode = l.LecturerCode
        WHERE sc.Id = @SubjectClassId
      `);

    return res.json({ projects: result.recordset });
  } catch (error) {
    console.error('Lỗi lấy danh sách đề tài lớp tín chỉ:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài' });
  }
});

module.exports = router;
