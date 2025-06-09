const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');





// Lấy danh sách nhóm theo lớp
router.get('/groups', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const { classId } = req.query;
        if (!classId) return res.status(400).json({ message: 'Thiếu classId' });
        await poolConnect;
        const result = await pool.request()
            .input('classId', sql.Int, classId)
            .query(`
                SELECT sg.Id, sg.GroupName
                FROM StudentGroups sg
                JOIN SubjectClasses sc ON sg.SubjectClassesId = sc.Id
                WHERE sc.Id = @classId
                ORDER BY sg.GroupName
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhóm:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách sinh viên theo lớp
router.get('/students', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const { classId } = req.query;
        if (!classId) return res.status(400).json({ message: 'Thiếu classId' });
        await poolConnect;
        const result = await pool.request()
            .input('classId', sql.Int, classId)
            .query(`
                SELECT s.StudentCode, s.FullName
                FROM Students s
                JOIN SubjectClasses sc ON s.ClassCode = sc.ClassCode
                WHERE sc.Id = @classId
                ORDER BY s.StudentCode
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sinh viên:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Lấy danh sách thông báo
router.get('/', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const lecturerCode = req.user.accountId;
        await poolConnect;
        const result = await pool.request()
            .input('lecturerCode', sql.VarChar, lecturerCode)
            .query(`
                SELECT n.Id, n.Title, n.Content, n.CreatedAt,
                    CASE 
                        WHEN n.StudentCodeReceive IS NOT NULL THEN s.FullName
                        WHEN n.GroupIdReceive IS NOT NULL THEN sg.GroupName
                        ELSE c.ClassName
                    END as recipientName
                FROM Notifications n
                LEFT JOIN Students s ON n.StudentCodeReceive = s.StudentCode
                LEFT JOIN StudentGroups sg ON n.GroupIdReceive = sg.Id
                LEFT JOIN SubjectClasses sc ON n.ClassIdReceive = sc.Id
                LEFT JOIN Class c ON sc.ClassCode = c.ClassCode
                WHERE n.SenderType = 'LECTURER' AND n.Sender = @lecturerCode
                ORDER BY n.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thông báo:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Tạo thông báo mới
router.post('/', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const { title, content, classId, groupId, studentCode } = req.body;
        const lecturerCode = req.user.accountId;

        if (!title || !content || !classId) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        await poolConnect;
        const request = pool.request();

        // Tạo thông báo
        const result = await request
            .input('Title', sql.NVarChar, title)
            .input('Content', sql.NVarChar, content)
            .input('SenderType', sql.NVarChar, 'LECTURER')
            .input('Sender', sql.VarChar, lecturerCode)
            .input('ClassIdReceive', sql.Int, classId)
            .input('GroupIdReceive', sql.Int, groupId || null)
            .input('StudentCodeReceive', sql.VarChar, studentCode || null)
            .input('CreatedAt', sql.DateTime, new Date())
            .query(`

                DECLARE @InsertedIds TABLE (Id INT);
                INSERT INTO Notifications 
                    (Title, Content, CreatedAt, SenderType, Sender, ClassIdReceive, GroupIdReceive, StudentCodeReceive)
                OUTPUT INSERTED.Id INTO @InsertedIds
                VALUES (@Title, @Content, @CreatedAt, @SenderType, @Sender, @ClassIdReceive, @GroupIdReceive, @StudentCodeReceive);
                SELECT Id FROM @InsertedIds;

            `);

        const notificationId = result.recordset[0].Id;

        // Lấy danh sách sinh viên nhận thông báo
        let students = [];
        if (studentCode) {
            students = [{ StudentCode: studentCode }];
        } else if (groupId) {
            const groupMembers = await request
                .input('groupId', sql.Int, groupId)
                .query(`SELECT StudentCode FROM GroupMembers WHERE StudentGroupId = @groupId`);
            students = groupMembers.recordset;
        } else {
            const classStudents = await request
                .input('classId', sql.Int, classId)
                .query(`SELECT StudentCode FROM Students WHERE ClassCode = (SELECT ClassCode FROM SubjectClasses WHERE Id = @classId)`);
            students = classStudents.recordset;
        }

        // Tạo bản ghi NotificationRecipients
        for (const stu of students) {
            await pool.request()
                .input('NotificationId', sql.Int, notificationId)
                .input('StudentCode', sql.VarChar, stu.StudentCode)
                .query(`
                    INSERT INTO NotificationRecipients (NotificationId, StudentCode)
                    VALUES (@NotificationId, @StudentCode)
                `);
        }

        res.status(201).json({ message: 'Đã gửi thông báo', notificationId });
    } catch (error) {
        console.error('Lỗi khi tạo thông báo:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Cập nhật thông báo
router.put('/:id', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, classId, groupId, studentCode } = req.body;
        const lecturerCode = req.user.accountId;

        if (!title || !content || !classId) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        await poolConnect;
        // Kiểm tra quyền sửa
        const check = await pool.request()
            .input('id', sql.Int, id)
            .input('lecturerCode', sql.VarChar, lecturerCode)
            .query(`SELECT COUNT(*) as count FROM Notifications WHERE Id = @id AND Sender = @lecturerCode`);
        if (check.recordset[0].count === 0) {
            return res.status(403).json({ message: 'Bạn không có quyền sửa thông báo này' });
        }

        // 1. Cập nhật Notifications
        await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('ClassIdReceive', sql.Int, classId)
            .input('GroupIdReceive', sql.Int, groupId || null)
            .input('StudentCodeReceive', sql.VarChar, studentCode || null)
            .query(`
                UPDATE Notifications
                SET Title = @title, Content = @content,
                    ClassIdReceive = @ClassIdReceive,
                    GroupIdReceive = @GroupIdReceive,
                    StudentCodeReceive = @StudentCodeReceive
                WHERE Id = @id
            `);

        // 2. Xóa NotificationRecipients cũ
        await pool.request()
            .input('NotificationId', sql.Int, id)
            .query(`DELETE FROM NotificationRecipients WHERE NotificationId = @NotificationId`);

        // 3. Thêm lại NotificationRecipients mới
        let students = [];
        const request = pool.request();
        if (studentCode) {
            students = [{ StudentCode: studentCode }];
        } else if (groupId) {
            const groupMembers = await request
                .input('groupId', sql.Int, groupId)
                .query(`SELECT StudentCode FROM GroupMembers WHERE StudentGroupId = @groupId`);
            students = groupMembers.recordset;
        } else {
            const classStudents = await request
                .input('classId', sql.Int, classId)
                .query(`SELECT StudentCode FROM Students WHERE ClassCode = (SELECT ClassCode FROM SubjectClasses WHERE Id = @classId)`);
            students = classStudents.recordset;
        }

        for (const stu of students) {
            await pool.request()
                .input('NotificationId', sql.Int, id)
                .input('StudentCode', sql.VarChar, stu.StudentCode)
                .query(`
                    INSERT INTO NotificationRecipients (NotificationId, StudentCode)
                    VALUES (@NotificationId, @StudentCode)
                `);
        }

        res.json({ message: 'Đã cập nhật thông báo và danh sách người nhận' });
    } catch (error) {
        console.error('Lỗi khi cập nhật thông báo:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// GET /api/classes/lecturer
router.get('/classes/lecturer', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        const lecturerCode = req.user.accountId; // Lấy mã giảng viên từ token
        await poolConnect;
        const result = await pool.request()
            .input('lecturerCode', sql.VarChar, lecturerCode)
            .query(`
                SELECT sc.Id, c.ClassCode, c.ClassName
                FROM SubjectClasses sc
                JOIN Class c ON sc.ClassCode = c.ClassCode
                WHERE sc.LecturerCode = @lecturerCode
                ORDER BY c.ClassName
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách lớp:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

router.get('/:id', authenticateToken, authorizeRole([1]), async (req, res) => {
    const { id } = req.params;
    await poolConnect;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM Notifications WHERE Id = @id');
    if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Không thấy thông báo' });
    }
    res.json(result.recordset[0]);
});

module.exports = router;