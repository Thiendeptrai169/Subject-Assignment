const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');

// Lấy báo cáo cho một nhóm cụ thể
router.get('/:groupId/reports', async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        if (isNaN(groupId)) {
            return res.status(400).json({ message: 'groupId không hợp lệ' });
        }

        await poolConnect;
        const request = pool.request();
        request.input('groupId', sql.Int, groupId);

        const result = await request.query(`
        SELECT
            Id,
            ReportOrder,
            ReportPeriodStatus,
            ReportDate,
            ScorePeriod,
            PercentScorePeriod,
            Description
        FROM ReportPeriod
        WHERE StudentGroupsId = @groupId
        ORDER BY 
            CASE WHEN ReportOrder = N'Cuối kỳ' THEN 1 ELSE 0 END ASC,
            ReportOrder;
        `);

        const reports = result.recordset;
        if (reports.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy báo cáo cho nhóm này' });
        }

        res.json({ reports });

    } catch (error) {
        console.error('Lỗi khi lấy báo cáo nhóm:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Route lấy thống kê báo cáo cho tất cả các nhóm
router.get('/reports/statistics', async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();

        const result = await request.query(`
            SELECT
                COUNT(DISTINCT StudentGroupsId) AS TotalGroups,
                SUM(CASE WHEN ReportPeriodStatus = N'Đã báo cáo' AND ScorePeriod IS NOT NULL THEN 1 ELSE 0 END) AS CompletedReports,
                SUM(CASE WHEN ScorePeriod = 0 THEN 1 ELSE 0 END) AS PendingReports,
                AVG(CAST(ScorePeriod AS FLOAT)) AS AverageScore
            FROM ReportPeriod
        `);

        const stats = result.recordset[0] || {
            TotalGroups: 0,
            CompletedReports: 0,
            PendingReports: 0,
            AverageScore: null
        };

        res.json({ statistics: stats });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê báo cáo:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;