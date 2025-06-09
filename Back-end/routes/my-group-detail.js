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
                    SG.PresentationDate,
                    P.ProjectName,
                    SJ.SubjectName,
                    UP.FullName,
                    UP.DateOfBirth,
                    S.Id AS StudentId,
                    C.ClassCode,
                    GM.StudentRole
                FROM StudentGroups SG
                JOIN SubjectProjects SP ON SG.SubjectProjectsId = SP.Id
                JOIN Projects P ON SP.ProjectId = P.Id
                JOIN Subjects SJ ON SP.SubjectId = SJ.Id
                JOIN GroupMembers GM ON SG.Id = GM.GroupId
                JOIN Students S ON GM.StudentId = S.Id
                JOIN Class C ON S.ClassId = C.Id
                JOIN Accounts A ON S.AccountId = A.Id
                JOIN UserProfiles UP ON A.Id = UP.AccountId
                WHERE SG.Id = @groupId
            `);

        const records = result.recordset;
        if (records.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy nhóm' });
        }

        // Lấy thông tin chung từ dòng đầu
        const group = {
            GroupId: records[0].GroupId,
            GroupName: records[0].GroupName,
            PresentationDate: records[0].PresentationDate,
            ProjectName: records[0].ProjectName,
            SubjectName: records[0].SubjectName,
            Members: records.map(row => ({
                FullName: row.FullName,
                StudentId: row.StudentId,
                DateOfBirth: row.DateOfBirth,
                ClassCode: row.ClassCode,
                StudentRole: row.StudentRole
            }))
        };

        res.json(group);
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết nhóm:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;