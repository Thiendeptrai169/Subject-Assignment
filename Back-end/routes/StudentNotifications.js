const express = require('express');
const router = express.Router();
const {sql, pool, poolConnect } = require('../config/db');

// ✅ GET /api/StudentNotifications/unread-count/:studentId
router.get('/unread-count/:studentId', async (req, res) => {
  await pool.connect(); // Đảm bảo kết nối
  const { studentId } = req.params;

  try {
    const result = await pool.request()
      .input('studentId',sql.Int, studentId)
      .query(`
        SELECT COUNT(*) AS UnreadCount
        FROM NotificationStatus
        WHERE StudentId = @studentId AND IsRead = 0
      `);

    const unreadCount = result.recordset[0].UnreadCount;

    res.json({ unreadCount });
  } catch (error) {
    console.error('Lỗi khi đếm thông báo chưa đọc:', error);
    res.status(500).json({ error: 'Lỗi khi đếm thông báo chưa đọc' });
  }
});

// ✅ GET /api/StudentNotifications/:studentId
router.get('/:studentId', async (req, res) => {
  console.log("GỌI ĐẾN API GET /:studentId");
  await pool.connect();
  const { studentId } = req.params;

  try {
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`
        
--DECLARE @groupId INT = NULL;  -- Nếu chọn nhóm, truyền mã nhóm vào đây, NULL nếu không chọn nhóm
--DECLARE @classId INT = NULL;  -- Nếu chọn lớp, truyền mã lớp vào đây, NULL nếu không chọn lớp
--DECLARE @subjectId INT = NULL;  -- Nếu chọn môn học, truyền mã môn vào đây, NULL nếu không chọn môn học

SELECT n.Id AS NotificationId, 
       n.NotificationTitle, 
       n.Content, 
       n.CreatedAt, 
       l.FullName AS CreatedByLecturerName, 
       ns.IsRead
FROM Notifications n
INNER JOIN Lecturers l ON n.CreatedByLecturer = l.Id
INNER JOIN NotificationStatus ns ON n.Id = ns.NotificationId
INNER JOIN Students s ON ns.StudentId = s.Id
INNER JOIN GroupMembers gm ON s.Id = gm.StudentId
INNER JOIN StudentGroups g ON gm.GroupId = g.Id
LEFT JOIN Class c ON s.ClassId = c.Id
LEFT JOIN Subjects sub ON n.SubjectId = sub.Id
WHERE ns.StudentId = @studentId
  -- Kiểm tra điều kiện cho mã sinh viên (nếu có)
 -- AND (@studentId IS NOT NULL AND ns.StudentId = @studentId)
  
  -- Kiểm tra điều kiện cho mã nhóm (nếu có)
  --AND (@groupId IS NULL OR gm.GroupId = @groupId)
  
  -- Kiểm tra điều kiện cho mã lớp (nếu có)
  --AND (@classId IS NULL OR s.ClassId = @classId)
  
  -- Kiểm tra điều kiện cho mã môn học (nếu có)
  --AND (@subjectId IS NULL OR n.SubjectId = @subjectId)
  
ORDER BY n.CreatedAt DESC;
      `);

    const notifications = result.recordset ? result.recordset.map(n => ({
      id: n.NotificationId,
      notificationTitle: n.NotificationTitle,
      content: n.Content,
      createdAt: n.CreatedAt,
      createdByLecturerName: n.CreatedByLecturerName,
      isRead: Boolean(n.IsRead)

    })) : [];

    res.json(notifications);
  } catch (error) {
    console.error('❌ Lỗi khi lấy thông báo:', error.message);
    res.status(500).json({ error: 'Lỗi khi lấy thông báo', message: error.message });
  }
});


// ✅ PUT /api/StudentNotifications/:notificationId/read
router.put('/:notificationId/read', async (req, res) => {
  await pool.connect();
  const { notificationId } = req.params;
  const { studentId } = req.body;

  try {
    await pool.request()
      .input('notificationId',sql.Int, notificationId)
      .input('studentId', sql.Int, studentId)
      .input('IsRead',sql.Int, 1)
      .query(`
        UPDATE NotificationStatus
        SET IsRead = @IsRead
        WHERE NotificationId = @notificationId AND StudentId = @studentId
      `);

    res.json({ message: 'Đã cập nhật trạng thái đã đọc' });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái', message: error.message });
  }
});

module.exports = router;
