const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.put('/:groupId', authenticateToken, authorizeRole([1]), async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const { GroupName, LeaderCode, ProjectCode } = req.body;
  try {
    await poolConnect;

    // 1. Lấy SubjectClassesId của nhóm
    const groupResult = await pool.request()
      .input('groupId', sql.Int, groupId)
      .query('SELECT SubjectClassesId FROM StudentGroups WHERE Id = @groupId');

    if (groupResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }

    const subjectClassesId = groupResult.recordset[0].SubjectClassesId;

    // 2. Cập nhật StudentGroups
    await pool.request()
      .input('groupId', sql.Int, groupId)
      .input('groupName', sql.NVarChar(50), GroupName)
      .input('leaderCode', sql.VarChar(20), LeaderCode)
      .query(`
        UPDATE StudentGroups
        SET GroupName = @groupName,
            LeaderCode = @leaderCode
        WHERE Id = @groupId
      `);

    // 3. Đồng bộ vai trò trưởng nhóm trong GroupMembers
    await pool.request()
      .input('groupId', sql.Int, groupId)
      .input('leaderCode', sql.VarChar(20), LeaderCode)
      .query(`
        UPDATE GroupMembers
        SET StudentRole = N'Nhóm trưởng'
        WHERE StudentGroupId = @groupId AND StudentCode = @leaderCode
      `);

    await pool.request()
      .input('groupId', sql.Int, groupId)
      .input('leaderCode', sql.VarChar(20), LeaderCode)
      .query(`
        UPDATE GroupMembers
        SET StudentRole = N'Thành viên'
        WHERE StudentGroupId = @groupId AND StudentCode != @leaderCode AND StudentRole = N'Nhóm trưởng'
      `);


   // 4. Cập nhật đề tài cho nhóm (thông qua SubjectClassProjectsId)
  let subjectClassProjectsId;

// Kiểm tra xem dòng SubjectClassProjects đã tồn tại chưa
  const checkExist = await pool.request()
    .input('subjectClassId', sql.Int, subjectClassesId)
    .input('projectCode', sql.VarChar(20), ProjectCode)
    .query(`
      SELECT Id FROM SubjectClassProjects 
      WHERE SubjectClassId = @subjectClassId AND ProjectCode = @projectCode
    `);

  if (checkExist.recordset.length > 0) {
    subjectClassProjectsId = checkExist.recordset[0].Id;
  } else {
    const insertResult = await pool.request()
      .input('subjectClassId', sql.Int, subjectClassesId)
      .input('projectCode', sql.VarChar(20), ProjectCode)
      .query(`
        INSERT INTO SubjectClassProjects (SubjectClassId, ProjectCode)
        OUTPUT INSERTED.Id
        VALUES (@subjectClassId, @projectCode)
      `);
    subjectClassProjectsId = insertResult.recordset[0].Id;
}

// Cập nhật lại StudentGroups với SubjectClassProjectsId mới
await pool.request()
  .input('groupId', sql.Int, groupId)
  .input('scpId', sql.Int, subjectClassProjectsId)
  .query(`
    UPDATE StudentGroups
    SET SubjectClassProjectsId = @scpId
    WHERE Id = @groupId
  `);


    res.json({ message: 'Cập nhật nhóm thành công' });

  } catch (error) {
    console.error('Lỗi cập nhật nhóm:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật nhóm' });
  }
});

router.delete('/:groupId', authenticateToken, authorizeRole([1]), async (req, res) => {
  const groupId = parseInt(req.params.groupId);

  if (!groupId || isNaN(groupId)) {
    return res.status(400).json({ message: 'groupId không hợp lệ hoặc thiếu' });
  }

  try {
    await poolConnect;

    // Kiểm tra nhóm tồn tại
    const checkReq = pool.request();
    const groupResult = await checkReq
      .input('groupId', sql.Int, groupId)
      .query('SELECT Id FROM StudentGroups WHERE Id = @groupId');

    if (groupResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Nhóm không tồn tại' });
    }

    // Xóa thành viên nhóm trước
    const deleteMembersReq = pool.request();
    await deleteMembersReq
      .input('groupId', sql.Int, groupId)
      .query('DELETE FROM GroupMembers WHERE StudentGroupId = @groupId');

    // Xóa nhóm
    const deleteGroupReq = pool.request();
    await deleteGroupReq
      .input('groupId', sql.Int, groupId)
      .query('DELETE FROM StudentGroups WHERE Id = @groupId');

    res.json({ message: 'Xóa nhóm thành công' });

  } catch (error) {
    console.error('Lỗi xóa nhóm:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa nhóm' });
  }
});




module.exports = router;
