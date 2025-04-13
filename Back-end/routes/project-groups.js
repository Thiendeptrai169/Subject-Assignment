const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/dbconfig');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Chỉ giảng viên (RoleId = 1) mới truy cập
router.get('/:projectId', authenticateToken, authorizeRole([1]), async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();
        const projectId = parseInt(req.params.projectId);

        const result = await request
            .input('projectId', sql.Int, projectId)
            .query(`
                SELECT 
                    SG.Id AS GroupId,
                    SG.GroupName,
                    SG.PresentationDate,
                    SG.GroupStatus,
                    SG.TotalMember
                FROM StudentGroups SG
                WHERE SG.ProjectId = @projectId
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy nhóm thực hiện đề tài:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;
