// teachingassignments.js
const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');

const { authenticateToken, attachUserInfo, authorizeRole } = require('../middleware/auth');

router.get('/filters', authenticateToken, attachUserInfo, authorizeRole([1]), async (req, res) => {
    const loggedInLecturerCode = req.user.lecturerCode; 


    try {
        await poolConnect;
        const request = pool.request();


        request.input('lecturerCodeParam', sql.VarChar(20), loggedInLecturerCode); 


        const query = `
            SELECT DISTINCT
                 S.SubjectCode,
                 S.SubjectName,
                 C.ClassCode,
                 C.ClassName  
            FROM SubjectClasses SC  
            JOIN Subjects S ON SC.SubjectCode = S.SubjectCode
            JOIN Class C ON SC.ClassCode = C.ClassCode
            WHERE SC.LecturerCode = @lecturerCodeParam    
              AND S.ExamType = N'Đồ án'                  
            ORDER BY S.SubjectName, C.ClassCode;
        `;

        const result = await request.query(query);

        const subjects = [];
        const classes = [];
        const subjectMap = new Map();
        const classMap = new Map();

        if (result.recordset && result.recordset.length > 0) {
            result.recordset.forEach(row => {
                if (row.SubjectCode && !subjectMap.has(row.SubjectCode)) {
                    subjectMap.set(row.SubjectCode, true);
                    subjects.push({
                        SubjectCode: row.SubjectCode,
                        SubjectName: row.SubjectName
                    });
                }
                if (row.ClassCode && !classMap.has(row.ClassCode)) {
                    classMap.set(row.ClassCode, true);
                    classes.push({
                        ClassCode: row.ClassCode,
                        ClassName: row.ClassName 
                    });
                }
            });
        }

        res.json({
            subjects: subjects,
            classes: classes
        });

    } catch (err) {
        console.error('Lỗi khi lấy thông tin filter phân công giảng dạy:', err.stack || err);
        res.status(500).json({ message: 'Lỗi server khi lấy filter phân công giảng dạy.', error: err.message });
    }
});

module.exports = router;