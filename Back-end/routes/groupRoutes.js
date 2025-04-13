// const express = require('express');
// const sql = require('mssql');
// const dbConfig = require('../config/dbconfig');
// const router = express.Router();


// // API: Lấy danh sách nhóm mà sinh viên đã tham gia trong học kỳ hiện tại
// router.get('/my-groups', async (req, res) => {
//     try {
//         // Giải mã token (lấy accountId từ token JWT)
//         const token = req.headers.authorization?.split(' ')[1];
//         if (!token) return res.status(401).json({ message: 'Thiếu token' });

//         const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
//         console.log(payload);
//         const accountId = payload.accountId;

//         const pool = await sql.connect(dbConfig);

//         // Truy vấn để lấy studentId từ accountId
//         const studentResult = await pool.request()
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

// // API: Lấy thông tin chi tiết một nhóm sinh viên
// router.get('/group-detail/:groupId', async (req, res) => {
//     try {
//         const groupId = parseInt(req.params.groupId);
//         if (isNaN(groupId)) {
//             return res.status(400).json({ message: 'groupId không hợp lệ' });
//         }

//         const pool = await sql.connect(dbConfig);

//         const result = await pool.request()
//             .input('groupId', sql.Int, groupId)
//             .query(`
//                 SELECT
//                     SG.Id AS GroupId,
//                     SG.GroupName,
//                     SG.PresentationDate,
//                     P.ProjectName,
//                     SJ.SubjectName,
//                     ST.FullName,
//                     ST.DateOfBirth,
//                     ST.Id AS StudentId,
//                     C.ClassName,
//                     GM.StudentRole
//                 FROM StudentGroups SG
//                 JOIN Projects P ON SG.ProjectId = P.Id
//                 JOIN Subjects SJ ON P.SubjectId = SJ.Id
//                 JOIN GroupMembers GM ON SG.Id = GM.GroupId
//                 JOIN Students ST ON GM.StudentId = ST.Id
//                 JOIN Class C ON ST.ClassId = C.Id
//                 WHERE SG.Id = @groupId;
//             `);

//         const records = result.recordset;
//         if (records.length === 0) {
//             return res.status(404).json({ message: 'Không tìm thấy nhóm' });
//         }

//         // Lấy thông tin chung từ dòng đầu
//         const group = {
//             GroupId: records[0].GroupId,
//             GroupName: records[0].GroupName,
//             PresentationDate: records[0].PresentationDate,
//             ProjectName: records[0].ProjectName,
//             SubjectName: records[0].SubjectName,
//             Members: records.map(row => ({
//                 FullName: row.FullName,
//                 StudentId: row.StudentId,
//                 DateOfBirth: row.DateOfBirth,
//                 ClassName: row.ClassName,
//                 StudentRole: row.StudentRole
//             }))
//         };

//         res.json(group);
//     } catch (error) {
//         console.error('Lỗi khi lấy chi tiết nhóm:', error);
//         res.status(500).json({ message: 'Lỗi server', error: error.message });
//     }
// });
// // API: Lấy học kỳ hiện tại mà sinh viên đang tham gia
// router.get('/my-semester', async (req, res) => {
//     try {
//         const token = req.headers.authorization?.split(' ')[1];
//         if (!token) return res.status(401).json({ message: 'Thiếu token' });

//         const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
//         const accountId = payload.accountId;

//         const pool = await sql.connect(dbConfig);

//         // Lấy studentId từ accountId
//         const studentResult = await pool.request()
//             .input('accountId', sql.VarChar(20), accountId)
//             .query(`SELECT Id FROM Students WHERE AccountId = @accountId`);

//         if (studentResult.recordset.length === 0) {
//             return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
//         }

//         const studentId = studentResult.recordset[0].Id;

//         // Truy ra học kỳ từ nhóm mà sinh viên tham gia
//         const result = await pool.request()
//             .input('studentId', sql.Int, studentId)
//             .query(`
//                 SELECT TOP 1
//                     S.Id AS SemesterId,
//                     S.Semester,
//                     S.AcademicYear
//                 FROM GroupMembers GM
//                 JOIN StudentGroups SG ON GM.GroupId = SG.Id
//                 JOIN Projects P ON SG.ProjectId = P.Id
//                 JOIN Subjects SJ ON P.SubjectId = SJ.Id
//                 JOIN Enrollment E ON E.SubjectId = SJ.Id AND E.StudentId = GM.StudentId
//                 JOIN Semesters S ON E.SemesterId = S.Id
//                 WHERE GM.StudentId = @studentId
//                 ORDER BY S.AcademicYear DESC, S.Semester DESC;
//             `);

//         if (result.recordset.length === 0) {
//             return res.status(404).json({ message: 'Không tìm thấy học kỳ' });
//         }

//         res.json(result.recordset[0]);
//     } catch (err) {
//         console.error('Lỗi khi lấy học kỳ:', err);
//         res.status(500).json({ message: 'Lỗi server', error: err.message });
//     }
// });


// module.exports = router;
