const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');

const { authenticateToken, attachUserInfo } = require('../middleware/auth');

 // Lấy danh sách nhóm sinh viên mà giảng viên đó phụ trách
router.get('/', authenticateToken, attachUserInfo, async (req, res) => {
  try {
    const lecturerCode = req.user.lecturerCode; 
    const groupResult = await pool.request().input('lecturerCode', sql.VarChar(20), lecturerCode).query(`
       SELECT
          SG.Id AS GroupId,
          SG.GroupName,
          P.ProjectName,
          SJ.SubjectName,
          C.ClassCode,
          Leader.FullName AS LeaderName,
          MemberCount.TotalMembers
      FROM StudentGroups SG
      INNER JOIN SubjectClasses SC ON SG.SubjectClassesId = SC.Id
      INNER JOIN Subjects SJ ON SC.SubjectCode = SJ.SubjectCode
      INNER JOIN Class C ON SC.ClassCode = C.ClassCode
      INNER JOIN SubjectClassProjects SCP ON SG.SubjectClassProjectsId = SCP.Id
      INNER JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
      LEFT JOIN Students Leader ON SG.LeaderCode = Leader.StudentCode
      LEFT JOIN (
          SELECT StudentGroupId, COUNT(*) AS TotalMembers
          FROM GroupMembers
          GROUP BY StudentGroupId
      ) MemberCount ON MemberCount.StudentGroupId = SG.Id
      WHERE SC.LecturerCode = 'L001'
      ORDER BY SG.GroupName;


    `);

    res.json({
      total: groupResult.recordset.length,
      groups: groupResult.recordset,
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách nhóm:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;

