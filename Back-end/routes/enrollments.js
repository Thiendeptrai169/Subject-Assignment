const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');

router.get('/students-for-subjectclass/:subjectClassId', async (req, res) => {
    const { subjectClassId } = req.params;
    console.log('Received request for students in SubjectClass ID:', subjectClassId);
    if (isNaN(parseInt(subjectClassId))) {
        return res.status(400).json({ message: 'SubjectClass ID không hợp lệ.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('paramSubjectClassId', sql.Int, parseInt(subjectClassId));

        const subjectClassInfoResult = await request.query(`
            SELECT SubjectCode, ClassCode FROM SubjectClasses WHERE Id = @paramSubjectClassId
        `);
        console.log('SubjectClass info result:', subjectClassInfoResult.recordset);
        if (subjectClassInfoResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Lớp học phần không tồn tại.' });
        }

        const { SubjectCode, ClassCode } = subjectClassInfoResult.recordset[0];

        const studentListRequest = pool.request(); 
        studentListRequest.input('paramSubjectCode', sql.VarChar, SubjectCode);
        studentListRequest.input('paramClassCode', sql.VarChar, ClassCode);
        studentListRequest.input('paramSubjectClassId', sql.Int, parseInt(subjectClassId));

        const result = await studentListRequest.query(`
             SELECT
                E.StudentCode,
                S.FullName,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM GroupMembers gm
                        JOIN StudentGroups sg ON gm.StudentGroupId = sg.Id
                        WHERE sg.SubjectClassesId = @paramSubjectClassId AND gm.StudentCode = E.StudentCode
                    ) THEN CAST(1 AS BIT)
                    ELSE CAST(0 AS BIT)
                END AS IsAlreadyInGroupForThisSubjectClass -- Cờ mới
            FROM Enrollment E
            JOIN Students S ON E.StudentCode = S.StudentCode
            WHERE E.SubjectCode = @paramSubjectCode
              AND E.ClassCode = @paramClassCode
            ORDER BY S.FullName;
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error('Lỗi khi lấy danh sách SV cho SubjectClass:', err.stack || err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách sinh viên.', error: err.message });
    }
});

module.exports = router;