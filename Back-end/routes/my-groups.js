const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, authorizeRole, attachUserInfo } = require('../middleware/auth');

// GET /api/my-groups
router.get('/', authenticateToken, attachUserInfo, async (req, res) => {
    try {
        const studentCode = req.user.studentCode;
        const groupResult = await pool.request()
            .input('studentCode', sql.VarChar(20), studentCode)
            .query(`
               SELECT
                    SG.Id AS GroupId,
                    SG.GroupName,
                    SG.Notes,
                    P.ProjectCode,
                    P.ProjectName,
                    SJ.SubjectCode,
                    SJ.SubjectName,
                    C.ClassCode,
                    C.ClassName,
                    (
                        SELECT COUNT(*) 
                        FROM GroupMembers GM2 
                        WHERE GM2.StudentGroupId = SG.Id
                    ) AS TotalMembers
                FROM GroupMembers GM
                    JOIN StudentGroups SG ON GM.StudentGroupId = SG.Id
                    JOIN SubjectClassProjects SCP ON SG.SubjectClassProjectsId = SCP.Id
                    JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
                    JOIN SubjectClasses SC ON SCP.SubjectClassId = SC.Id
                    JOIN Subjects SJ ON SC.SubjectCode = SJ.SubjectCode
                    JOIN Class C ON SC.ClassCode = C.ClassCode
                WHERE GM.StudentCode = @studentCode;
            `);

        res.json(groupResult.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhóm:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;
