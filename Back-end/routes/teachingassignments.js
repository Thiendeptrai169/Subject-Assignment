const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
router.get('/filters', async (req, res) => { 
    const lecturerId = 1;

    try {
        await poolConnect;
        const request = pool.request();

        const today = new Date().toISOString().split('T')[0];
        request.input('currentDateParam', sql.Date, today);
        request.input('lecturerIdParam', sql.Int, lecturerId);

        const query = `
            DECLARE @CurrentSemesterId INT;
            SELECT TOP 1 @CurrentSemesterId = Id
            FROM Semesters
            WHERE @currentDateParam >= StartDate AND @currentDateParam <= EndDate
            ORDER BY StartDate DESC;

             SELECT
                 -- S.Id AS SubjectId,   
                 S.SubjectCode,
                 S.SubjectName,
                 -- C.Id AS ClassId,      
                 C.ClassCode
            FROM TeachingAssignments TA
            JOIN Subjects S ON TA.SubjectId = S.Id
            JOIN Class C ON TA.ClassId = C.Id
            WHERE TA.LecturerId = @lecturerIdParam AND TA.SemesterId = @CurrentSemesterId
            ORDER BY S.SubjectName, C.ClassCode; 
        `;

        const result = await request.query(query); 

        const subjects = [];
        const classes = [];
        const subjectMap = new Map(); 
        const classMap = new Map();  

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
                    ClassCode: row.ClassCode
                });
            }
        });
         subjects.sort((a, b) => a.SubjectName.localeCompare(b.SubjectName));
         classes.sort((a, b) => a.ClassCode.localeCompare(b.ClassCode));


        res.json({
            subjects: subjects, 
            classes: classes   
        });

    } catch (err) {
        console.error('Lỗi khi lấy thông tin filter phân công:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy filter phân công.', error: err.message });
    }
});

module.exports = router;