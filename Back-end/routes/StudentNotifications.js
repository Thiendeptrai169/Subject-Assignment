const express = require('express');
const router = express.Router();
const {sql, pool, poolConnect } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

console.log('StudentNotifications.js loaded!');

// ✅ GET /api/StudentNotifications/me
router.get('/me', authenticateToken, async (req, res) => {
  console.log('API /me CALLED');
  await poolConnect;
  const accountId = req.user.accountId;
  try {
    console.log('accountId:', accountId);

    const result = await pool.request()
      .input('accountId', sql.VarChar, accountId)
      .query('SELECT StudentCode FROM Students WHERE AccountId = @accountId');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    const studentCode = result.recordset[0].StudentCode;

    console.log('studentCode:', studentCode);

    const notiResult = await pool.request()
      .input('studentCode', sql.VarChar, studentCode)
      .query(`
        SELECT n.Id AS NotificationId, 
               n.Title, 
               n.Content, 
               n.CreatedAt, 
               l.FullName AS CreatedByLecturerName, 
               nr.ReadAt
        FROM Notifications n
        LEFT JOIN Lecturers l ON n.SenderType = 'LECTURER' AND n.Sender = l.LecturerCode
        INNER JOIN NotificationRecipients nr ON n.Id = nr.NotificationId
        WHERE nr.StudentCode = @studentCode
        ORDER BY n.CreatedAt DESC
      `);

    console.log('notiResult.recordset:', notiResult.recordset);

    const notifications = notiResult.recordset.map(n => ({
      id: n.NotificationId,
      title: n.Title,
      content: n.Content,
      createdAt: n.CreatedAt,
      createdByLecturerName: n.CreatedByLecturerName,
      isRead: n.ReadAt !== null
    }));

    console.log('notifications:', notifications);

    res.json(notifications);
  } catch (error) {
    console.error('❌ Lỗi khi lấy thông báo:', error.message);
    res.status(500).json({ error: 'Lỗi khi lấy thông báo', message: error.message });
  }
});

// ✅ GET /api/StudentNotifications/me/unread-count
router.get('/me/unread-count', authenticateToken, async (req, res) => {
  await pool.connect();
  const accountId = req.user.accountId;
  try {
    // Lấy studentCode từ bảng Students
    const result = await pool.request()
      .input('accountId', sql.VarChar, accountId)
      .query('SELECT StudentCode FROM Students WHERE AccountId = @accountId');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    const studentCode = result.recordset[0].StudentCode;

    // Đếm số thông báo chưa đọc
    const unreadResult = await pool.request()
      .input('studentCode', sql.VarChar, studentCode)
      .query(`
        SELECT COUNT(*) AS UnreadCount
        FROM NotificationRecipients
        WHERE StudentCode = @studentCode AND ReadAt IS NULL
      `);
    const unreadCount = unreadResult.recordset[0].UnreadCount;
    res.json({ unreadCount });
  } catch (error) {
    console.error('Lỗi khi đếm thông báo chưa đọc:', error);
    res.status(500).json({ error: 'Lỗi khi đếm thông báo chưa đọc' });
  }
  
});

// ✅ PUT /api/StudentNotifications/:id/read
router.put('/:id/read', authenticateToken, async (req, res) => {
  await poolConnect;
  const notificationId = req.params.id;
  const accountId = req.user.accountId;
  try {
    // Lấy studentCode từ bảng Students
    const result = await pool.request()
      .input('accountId', sql.VarChar, accountId)
      .query('SELECT StudentCode FROM Students WHERE AccountId = @accountId');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    const studentCode = result.recordset[0].StudentCode;

    // Cập nhật ReadAt
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('studentCode', sql.VarChar, studentCode)
      .input('readAt', sql.DateTime, new Date())
      .query(`
        UPDATE NotificationRecipients
        SET ReadAt = @readAt
        WHERE NotificationId = @notificationId AND StudentCode = @studentCode
      `);

    res.json({ message: 'Đã cập nhật trạng thái đã đọc' });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đã đọc:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái đã đọc' });
  }
});

// GET /api/StudentNotifications/me/unread
router.get('/me/unread', authenticateToken, async (req, res) => {
  await poolConnect;
  const accountId = req.user.accountId;
  try {
    // Lấy studentCode từ bảng Students
    const result = await pool.request()
      .input('accountId', sql.VarChar, accountId)
      .query('SELECT StudentCode FROM Students WHERE AccountId = @accountId');
    if (!result.recordset[0]) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    const studentCode = result.recordset[0].StudentCode;

    // Lấy danh sách thông báo chưa đọc
    const notiResult = await pool.request()
      .input('studentCode', sql.VarChar, studentCode)
      .query(`
        SELECT n.Id AS NotificationId, 
               n.Title, 
               n.Content, 
               n.CreatedAt, 
               l.FullName AS CreatedByLecturerName
        FROM Notifications n
        LEFT JOIN Lecturers l ON n.SenderType = 'LECTURER' AND n.Sender = l.LecturerCode
        INNER JOIN NotificationRecipients nr ON n.Id = nr.NotificationId
        WHERE nr.StudentCode = @studentCode AND nr.ReadAt IS NULL
        ORDER BY n.CreatedAt DESC
      `);

    const notifications = notiResult.recordset.map(n => ({
      id: n.NotificationId,
      title: n.Title,
      content: n.Content,
      createdAt: n.CreatedAt,
      createdByLecturerName: n.CreatedByLecturerName
    }));

    res.json(notifications);
  } catch (error) {
    console.error('❌ Lỗi khi lấy thông báo chưa đọc:', error.message);
    res.status(500).json({ error: 'Lỗi khi lấy thông báo chưa đọc', message: error.message });
  }
});

module.exports = router;
