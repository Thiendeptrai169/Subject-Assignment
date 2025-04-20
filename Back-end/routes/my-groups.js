// const express = require('express');
// const router = express.Router()
// const { sql, pool, poolConnect } = require('../config/db');
// const { authenticateToken, authorizeRole } = require('../middleware/auth');

// // API: Lấy danh sách nhóm mà sinh viên đã tham gia trong học kỳ hiện tại
// router.get('/', async (req, res) => {
//     try {
//         // Giải mã token (lấy accountId từ token JWT)
//         const token = req.headers.authorization?.split(' ')[1];
//         if (!token) return res.status(401).json({ message: 'Thiếu token' });

//         const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
//         console.log(payload);
//         const accountId = payload.accountId;

//         await poolConnect;
//         const request = pool.request();

//         const studentResult = await request
//             .input('accountId', sql.VarChar(20), accountId)
//             .query(`
//                 SELECT Id FROM Students WHERE AccountId = @accountId
//             `);

//         if (studentResult.recordset.length === 0) {
//             return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
//         }

//         const studentId = studentResult.recordset[0].Id;

//         // Truy vấn nhóm mà sinh viên đã tham gia trong học kỳ hiện tại
//         const result = await pool.request()
//             .input('studentId', sql.Int, studentId)
//             .query(`
//                 SELECT
//                     S.Id AS StudentId,
//                     S.FullName AS StudentName,
//                     SG.Id AS GroupId,
//                     SG.GroupName,
//                     SG.GroupStatus,
//                     SG.PresentationDate,
//                     SG.TotalMember,
//                     P.ProjectCode,
//                     P.ProjectName,
//                     SJ.SubjectCode,
//                     SJ.SubjectName
//                 FROM Students S
//                 JOIN GroupMembers GM ON S.Id = GM.StudentId
//                 JOIN StudentGroups SG ON GM.GroupId = SG.Id
//                 JOIN Projects P ON SG.ProjectId = P.Id
//                 JOIN Subjects SJ ON P.SubjectId = SJ.Id
//                 WHERE S.Id = @StudentId;
//             `);

//         res.json(result.recordset);
//     } catch (error) {
//         console.error('Lỗi khi lấy danh sách nhóm:', error);
//         res.status(500).json({ message: 'Lỗi server', error: error.message });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/my-groups
router.get('/', authenticateToken, async (req, res) => {
    try {
        const accountId = req.user.accountId; // lấy từ middleware authenticateToken

        await poolConnect;
        const request = pool.request();

        // Lấy studentId từ accountId
        const studentResult = await request
            .input('accountId', sql.VarChar(20), accountId)
            .query(`SELECT Id FROM Students WHERE AccountId = @accountId`);

        if (studentResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
        }

        const studentId = studentResult.recordset[0].Id;

        // Lấy học kỳ hiện tại
        const now = new Date();
        const semesterResult = await pool.request()
            .input('today', sql.Date, now)
            .query(`
                SELECT TOP 1 Id FROM Semesters 
                WHERE StartDate <= @today AND EndDate >= @today
            `);

        if (semesterResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy học kỳ hiện tại' });
        }

        const semesterId = semesterResult.recordset[0].Id;

        // Truy vấn các nhóm sinh viên đã tham gia trong học kỳ hiện tại
        const groupResult = await pool.request()
            .input('studentId', sql.Int, studentId)
            .input('semesterId', sql.Int, semesterId)
            .query(`
                SELECT 
                    SG.Id AS GroupId,
                    SG.GroupName,
                    SG.GroupStatus,
                    SG.PresentationDate,
                    SG.TotalMember,
                    P.ProjectCode,
                    P.ProjectName,
                    SJ.SubjectCode,
                    SJ.SubjectName,
                    C.ClassCode,
                    C.ClassName
                FROM GroupMembers GM
                JOIN StudentGroups SG ON GM.GroupId = SG.Id
                JOIN SubjectProjects SP ON SG.SubjectProjectsId = SP.Id
                JOIN Projects P ON SP.ProjectId = P.Id
                JOIN Subjects SJ ON SP.SubjectId = SJ.Id
                JOIN Class C ON SP.ClassId = C.Id
                WHERE GM.StudentId = @studentId AND SP.SemesterId = @semesterId
            `);

        res.json(groupResult.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhóm:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;

// API: Lấy danh sách nhóm mà sinh viên đã tham gia trong học kỳ hiện tại
// router.get('/', authenticateToken, authorizeRole([1, 2]), async (req, res) => {
//     try {
//         const accountId = req.user.accountId;

//         await poolConnect;
//         const request = pool.request();

//         const studentResult = await request
//             .input('accountId', sql.VarChar(20), accountId)
//             .query(`
//                 SELECT Id FROM Students WHERE AccountId = @accountId
//             `);

//         if (studentResult.recordset.length === 0) {
//             return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
//         }

//         const studentId = studentResult.recordset[0].Id;

//         // Truy vấn nhóm mà sinh viên đã tham gia trong học kỳ hiện tại
//         const result = await pool.request()
//             .input('studentId', sql.Int, studentId)
//             .query(`
//                SELECT
//                     S.Id AS StudentId,
//                     S.FullName AS StudentName,
//                     SG.Id AS GroupId,
//                     SG.GroupName,
//                     SG.GroupStatus,
//                     SG.PresentationDate,
//                     SG.TotalMember,
//                     P.ProjectCode,
//                     P.ProjectName,
//                     SJ.SubjectCode,
//                     SJ.SubjectName
//                 FROM Students S
//                 JOIN GroupMembers GM ON S.Id = GM.StudentId
//                 JOIN StudentGroups SG ON GM.GroupId = SG.Id
//                 JOIN Projects P ON SG.ProjectId = P.Id
//                 JOIN Subjects SJ ON P.SubjectId = SJ.Id
//                 WHERE S.Id = @StudentId;
//             `);

//         res.json(result.recordset);
//     } catch (error) {
//         console.error('Lỗi khi lấy danh sách nhóm:', error);
//         res.status(500).json({ message: 'Lỗi server', error: error.message });
//     }
// });

// module.exports = router;