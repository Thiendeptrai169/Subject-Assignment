const express = require('express');
const router = express.Router()
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');


router.get('/group-detail/:groupId', async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        if (isNaN(groupId)) {
            return res.status(400).json({ message: 'groupId không hợp lệ' });
        }

        await poolConnect;
        const request = pool.request();

        const result = await request
            .input('groupId', sql.Int, groupId)
            .query(`
                  SELECT
                    SG.Id AS GroupId,
                    SG.GroupName,                   
                    P.ProjectCode,
                    P.ProjectName,
                    SJ.SubjectCode,
                    SJ.SubjectName,

                    S.StudentCode,
                    S.FullName,
                    S.Gender,
                    SC.Id AS SubjectClassId,
                    C.ClassCode,
                    C.ClassName,
                    GM.StudentRole,
                    GM.JoinGroupDate
                FROM StudentGroups SG
                JOIN SubjectClassProjects SCP ON SG.SubjectClassProjectsId = SCP.Id
                JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
                JOIN SubjectClasses SC ON SCP.SubjectClassId = SC.Id
                JOIN Subjects SJ ON SC.SubjectCode = SJ.SubjectCode
                JOIN GroupMembers GM ON SG.Id = GM.StudentGroupId
                JOIN Students S ON GM.StudentCode = S.StudentCode
                JOIN Class C ON SC.ClassCode = C.ClassCode 
                WHERE SG.Id = @groupId
                ORDER BY
                    CASE WHEN GM.StudentRole = N'Nhóm trưởng' THEN 0 ELSE 1 END,
                    S.FullName;



            `);

        const records = result.recordset;
        if (records.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        }

        // Lấy thông tin chung từ dòng đầu
        const group = {
            GroupId: records[0].GroupId,
            GroupName: records[0].GroupName,
            SubjectClassId: records[0].SubjectClassId,
            ProjectName: records[0].ProjectName,
            SubjectName: records[0].SubjectName,
            Members: records.map(row => ({
                FullName: row.FullName,
                StudentCode: row.StudentCode,
                DateOfBirth: row.DateOfBirth,
                ClassCode: row.ClassCode,

                StudentRole: row.StudentRole,
                JoinGroupDate: row.JoinGroupDate

            }))
        };

        res.json(group);
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết nhóm:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// --- Thêm thành viên vào nhóm ---
router.post('/:groupId/members', authenticateToken, authorizeRole([1]), async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const { StudentCode } = req.body;

  if (!groupId || !StudentCode) {
    return res.status(400).json({ message: 'Thiếu groupId hoặc StudentCode' });
  }

  try {
    await poolConnect;

    // 1. Lấy SubjectClassesId của nhóm mới
    const getGroupRequest = pool.request();
    const groupResult = await getGroupRequest
      .input('groupId', sql.Int, groupId)
      .query('SELECT SubjectClassesId FROM StudentGroups WHERE Id = @groupId');

    if (groupResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }
    const subjectClassId = groupResult.recordset[0].SubjectClassesId;

    // 2. Kiểm tra sinh viên thuộc nhóm cũ trong lớp tín chỉ
    const checkRequest = pool.request();
    const existingMember = await checkRequest
      .input('studentCode', sql.VarChar(20), StudentCode)
      .input('subjectClassId', sql.Int, subjectClassId)
      .query(`
        SELECT GM.StudentGroupId
        FROM GroupMembers GM
        JOIN StudentGroups SG ON GM.StudentGroupId = SG.Id
        WHERE GM.StudentCode = @studentCode AND SG.SubjectClassesId = @subjectClassId
      `);

    if (existingMember.recordset.length > 0) {
      const oldGroupId = existingMember.recordset[0].StudentGroupId;

      if (oldGroupId !== groupId) {
        // 3. Xóa sinh viên khỏi nhóm cũ (nếu khác nhóm mới)
        const deleteRequest = pool.request();
        await deleteRequest
          .input('groupId', sql.Int, oldGroupId)
          .input('studentCode', sql.VarChar(20), StudentCode)
          .query('DELETE FROM GroupMembers WHERE StudentGroupId = @groupId AND StudentCode = @studentCode');
      } else {
        return res.status(400).json({ message: 'Sinh viên đã là thành viên nhóm này' });
      }
    }

    // 4. Thêm sinh viên vào nhóm mới
    const insertRequest = pool.request();
    await insertRequest
      .input('groupId', sql.Int, groupId)
      .input('studentCode', sql.VarChar(20), StudentCode)
      .input('role', sql.NVarChar(50), 'Thành viên')
      .input('joinDate', sql.Date, new Date())
      .query(`
        INSERT INTO GroupMembers (StudentGroupId, StudentCode, StudentRole, JoinGroupDate)
        VALUES (@groupId, @studentCode, @role, @joinDate)
      `);

    res.json({ message: 'Thêm thành viên thành công' });
  } catch (error) {
    console.error('Lỗi khi thêm thành viên:', error);
    res.status(500).json({ message: 'Lỗi server khi thêm thành viên' });
  }
});



// --- Xóa thành viên khỏi nhóm ---
router.delete('/:groupId/members/:studentCode', authenticateToken, authorizeRole([1]), async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const studentCode = req.params.studentCode;

  if (!groupId || !studentCode) {
    return res.status(400).json({ message: 'Thiếu groupId hoặc studentCode' });
  }

  try {
    await poolConnect;

    // Kiểm tra thành viên có trong nhóm không
    const checkMemberRequest = pool.request();
    const memberCheck = await checkMemberRequest
      .input('groupId', sql.Int, groupId)
      .input('studentCode', sql.VarChar(20), studentCode)
      .query('SELECT StudentRole FROM GroupMembers WHERE StudentGroupId = @groupId AND StudentCode = @studentCode');

    if (memberCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Thành viên không tồn tại trong nhóm' });
    }

    if (memberCheck.recordset[0].StudentRole === 'Nhóm trưởng') {
      return res.status(400).json({ message: 'Không thể xóa trưởng nhóm' });
    }

    // Xóa thành viên
    const deleteMemberRequest = pool.request();
    await deleteMemberRequest
      .input('groupId', sql.Int, groupId)
      .input('studentCode', sql.VarChar(20), studentCode)
      .query('DELETE FROM GroupMembers WHERE StudentGroupId = @groupId AND StudentCode = @studentCode');

    res.json({ message: 'Xóa thành viên thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa thành viên:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa thành viên' });
  }
});


module.exports = router;