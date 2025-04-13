const express = require('express');
const router = express.Router();

const { sql, pool, poolConnect } = require('../config/db');

//  GET - 
router.get('/', async (req, res) => {
    try {
        await poolConnect;
        
        const request = pool.request();
        const result = await request.query(`
            SELECT * FROM Notifications ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send('Lỗi lấy thông báo: ' + err.message);
    }
});

router.post('/', async (req, res) => {
    const {
        NotificationTitle,
        Content,
        RecipientType,
        StudentId,
        GroupId,
        ClassId,
        SubjectId,
        CreatedByLecturer
    } = req.body;

    try {
        console.log("🧾 Body nhận được:", req.body);

        // Kiểm tra nếu thiếu thông tin bắt buộc
        if (!NotificationTitle || !Content || !RecipientType) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
        }

        // Thêm thông báo vào bảng Notifications
        const insertResult = await pool.request()
            .input('NotificationTitle', sql.NVarChar, NotificationTitle)
            .input('Content', sql.NVarChar, Content)
            .input('RecipientType', sql.NVarChar, RecipientType)
            .input('StudentId', sql.Int, StudentId || null)  // Chấp nhận null nếu không có StudentId
            .input('GroupId', sql.Int, GroupId || null)  // Chấp nhận null nếu không có GroupId
            .input('ClassId', sql.Int, ClassId || null)  // Chấp nhận null nếu không có ClassId
            .input('SubjectId', sql.Int, SubjectId || null)  // Chấp nhận null nếu không có SubjectId
            .input('CreatedByLecturer', sql.Int, CreatedByLecturer)
            .query(`
                INSERT INTO Notifications (
                    NotificationTitle,
                    Content,
                    RecipientType,
                    StudentId,
                    GroupId,
                    ClassId,
                    SubjectId,
                    CreatedByLecturer,
                    CreatedAt
                )
                OUTPUT INSERTED.Id
                VALUES (
                    @NotificationTitle,
                    @Content,
                    @RecipientType,
                    @StudentId,
                    @GroupId,
                    @ClassId,
                    @SubjectId,
                    @CreatedByLecturer,
                    GETDATE()
                )
            `);
console.log("📝 Thông báo đã được tạo, ID:", insertResult.recordset[0]?.Id);
        const newNotificationId = insertResult.recordset[0].Id;

        // Hàm lấy danh sách sinh viên theo RecipientType
        const getStudentsQuery = (RecipientType, StudentId, GroupId, ClassId, SubjectId) => {
            let query = '';
            if (RecipientType === 'student') {
                query = `SELECT Id FROM Students WHERE Id = @StudentId`;
            } else if (RecipientType === 'group') {
                query = `SELECT StudentId AS Id FROM GroupMembers WHERE GroupId = @GroupId`;
            } else if (RecipientType === 'class') {
                query = `
                        SELECT s.Id
                            FROM TopicAssignment.dbo.Students s
                            JOIN TopicAssignment.dbo.Enrollment e ON s.Id = e.StudentId
                            WHERE s.ClassId = @ClassId AND e.SubjectId = @SubjectId
                `;
            }
            return query;
        };

        // Lấy danh sách sinh viên dựa trên RecipientType
        const studentQuery = getStudentsQuery(RecipientType, StudentId, GroupId, ClassId, SubjectId);
        const studentResult = await pool.request()
            .input('StudentId', sql.Int, StudentId)
            .input('GroupId', sql.Int, GroupId)
            .input('ClassId', sql.Int, ClassId)
            .input('SubjectId', sql.Int, SubjectId)
            .query(studentQuery);

        const students = studentResult.recordset;

        // Thêm thông tin vào bảng NotificationStatus cho từng sinh viên
        for (let s of students) {
            await pool.request()
                .input('NotificationId', sql.Int, newNotificationId)
                .input('StudentId', sql.Int, s.Id)
                .input('IsRead', sql.Bit, 0)
                .query(`
                    INSERT INTO NotificationStatus (NotificationId, StudentId, IsRead)
                    VALUES (@NotificationId, @StudentId, @IsRead)
                `);
        }

        // Trả về phản hồi thành công
        res.status(201).json({ message: 'Thêm thông báo thành công' });
    } catch (err) {
        console.error("❌ Lỗi khi thêm thông báo:", err);
        res.status(500).json({ error: 'Lỗi server khi thêm thông báo' });
    }
});

// 3. PUT - 
router.put('/:id', async (req, res) => {
    try {
        await poolConnect;
        const {
            NotificationTitle,
            Content,
            StudentId,
            GroupId,
            ClassId,
            SubjectId,
            RecipientType
        } = req.body;

        const { id } = req.params;

        const request = pool.request();
        request.input('Id', id);
        request.input('NotificationTitle', NotificationTitle);
        request.input('Content', Content);
        request.input('StudentId', StudentId || null);
        request.input('GroupId', GroupId || null);
        request.input('ClassId', ClassId || null);
        request.input('SubjectId', SubjectId || null);
        request.input('RecipientType', RecipientType);

        // Cập nhật thông báo trong bảng Notifications
        await request.query(`
            UPDATE Notifications
            SET
                NotificationTitle = @NotificationTitle,
                Content = @Content,
                StudentId = @StudentId,
                GroupId = @GroupId,
                ClassId = @ClassId,
                SubjectId = @SubjectId,
                RecipientType = @RecipientType
            WHERE Id = @Id
        `);

        // Hàm lấy danh sách sinh viên cần cập nhật trạng thái
        const getStudentsQuery = (RecipientType, StudentId, GroupId, ClassId, SubjectId) => {
            let query = '';
            if (RecipientType === 'student') {
                query = `SELECT Id FROM Students WHERE Id = @StudentId`;
            } else if (RecipientType === 'group') {
                query = `SELECT StudentId AS Id FROM GroupMembers WHERE GroupId = @GroupId`;
            } else if (RecipientType === 'class') {
                query = `
                        SELECT s.Id
                            FROM TopicAssignment.dbo.Students s
                            JOIN TopicAssignment.dbo.Enrollment e ON s.Id = e.StudentId
                            WHERE s.ClassId = @ClassId AND e.SubjectId = @SubjectId
                `;
            }
            return query;
        };

        // Lấy danh sách sinh viên dựa trên RecipientType
        const studentQuery = getStudentsQuery(RecipientType, StudentId, GroupId, ClassId, SubjectId);
        const studentResult = await pool.request()
            .input('StudentId', sql.Int, StudentId)
            .input('GroupId', sql.Int, GroupId)
            .input('ClassId', sql.Int, ClassId)
            .input('SubjectId', sql.Int, SubjectId)
            .query(studentQuery);

        const students = studentResult.recordset;

        // Cập nhật trạng thái thông báo trong bảng NotificationStatus
        for (let s of students) {
            await pool.request()
                .input('NotificationId', sql.Int, id)
                .input('StudentId', sql.Int, s.Id)
                .input('IsRead', sql.Bit, 0) // Có thể thay đổi trạng thái ở đây nếu cần
                .query(`
                    UPDATE NotificationStatus
                    SET IsRead = @IsRead
                    WHERE NotificationId = @NotificationId AND StudentId = @StudentId
                `);
        }

        res.json({ message: 'Đã cập nhật thông báo và trạng thái thành công' });
    } catch (err) {
        res.status(500).send('Lỗi khi cập nhật: ' + err.message);
    }
});
module.exports = router;