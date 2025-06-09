const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db'); // cấu hình kết nối SQL Server

// API lấy danh sách sinh viên lớp tín chỉ theo SubjectClassId
router.get('/:subjectClassId/students', async (req, res) => {
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
          s.StudentCode,
          s.FullName,
          s.Gender,
          s.SchoolEmail,
          c.ClassName,
          sub.SubjectName
        FROM SubjectClasses sc
        JOIN Subjects sub ON sc.SubjectCode = sub.SubjectCode
        JOIN Class c ON sc.ClassCode = c.ClassCode
        JOIN Enrollment e ON e.SubjectCode = sc.SubjectCode AND e.ClassCode = sc.ClassCode
        JOIN Students s ON s.StudentCode = e.StudentCode
        WHERE sc.Id = @SubjectClassId
      `);

    return res.json({ students: result.recordset });
  } catch (error) {
    console.error('Lỗi lấy danh sách sinh viên lớp tín chỉ:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách sinh viên' });
  }
});

module.exports = router;
