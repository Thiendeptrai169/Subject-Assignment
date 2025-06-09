const express = require('express');
const router = express.Router();
const { sql, pool } = require('../config/db');
const { authenticateToken, attachUserInfo, authorizeRole } = require('../middleware/auth');

// API để nhập/sửa điểm cho các đợt báo cáo của nhóm
router.put('/:groupId/grades', authenticateToken, attachUserInfo, authorizeRole([1]), async (req, res) => {
    try {
        console.log('Request body:', req.body); // Debug log
        const { groupId } = req.params;
        const { grades } = req.body;
        const lecturerCode = req.user?.lecturerCode;

        // Kiểm tra đầu vào
        if (!lecturerCode) {
            return res.status(400).json({ message: 'Không tìm thấy mã giảng viên' });
        }
        if (!groupId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp groupId' });
        }
        if (!Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ message: 'Danh sách điểm không hợp lệ' });
        }

        // Kiểm tra groupId tồn tại và thuộc giảng viên
        const groupCheck = await pool.request()
            .input('groupId', sql.Int, groupId)
            .input('lecturerCode', sql.VarChar(20), lecturerCode)
            .query(`
                SELECT SG.Id
                FROM StudentGroups SG
                INNER JOIN SubjectClasses SC ON SG.SubjectClassesId = SC.Id
                WHERE SG.Id = @groupId AND SC.LecturerCode = @lecturerCode
            `);

        if (groupCheck.recordset.length === 0) {
            return res.status(403).json({ message: 'Nhóm không tồn tại hoặc bạn không có quyền truy cập' });
        }

        // Kiểm tra tổng tỷ lệ phần trăm <= 100%
        const totalPercent = grades.reduce((sum, grade) => sum + (Number(grade.percent) || 0), 0);
        if (totalPercent > 100) {
            return res.status(400).json({ message: `Tổng tỷ lệ phần trăm không được vượt quá 100%, hiện tại là ${totalPercent}%` });
        }

        // Xử lý giao dịch
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const grade of grades) {
                const { reportOrder, score, percent, description } = grade;

                // Kiểm tra dữ liệu hợp lệ
                if (!reportOrder) {
                    throw new Error(`Thiếu reportOrder cho đợt báo cáo`);
                }
                if (score !== undefined && (typeof score !== 'number' || score < 0 || score > 10)) {
                    throw new Error(`Điểm cho đợt ${reportOrder} phải từ 0 đến 10`);
                }
                if (percent !== undefined && (typeof percent !== 'number' || percent < 0 || percent > 100)) {
                    throw new Error(`Tỷ lệ cho đợt ${reportOrder} phải từ 0 đến 100`);
                }

                // Kiểm tra xem ReportPeriod đã tồn tại chưa
                const existingReport = await transaction.request()
                    .input('groupId', sql.Int, groupId)
                    .input('reportOrder', sql.NVarChar(20), reportOrder)
                    .query(`
                        SELECT Id, ReportPeriodStatus
                        FROM ReportPeriod
                        WHERE StudentGroupsId = @groupId AND ReportOrder = @reportOrder
                    `);

                const request = transaction.request()
                    .input('groupId', sql.Int, groupId)
                    .input('reportOrder', sql.NVarChar(20), reportOrder)
                    .input('score', sql.Float, score !== undefined ? score : null)
                    .input('percent', sql.Float, percent !== undefined ? percent : null)
                    .input('description', sql.NVarChar(255), description || null)
                    .input('reportDate', sql.Date, new Date());

                if (existingReport.recordset.length > 0) {
                    // Cập nhật bản ghi hiện có
                    await request.query(`
                        UPDATE ReportPeriod
                        SET ScorePeriod = @score,
                            PercentScorePeriod = @percent,
                            Description = @description,
                            ReportDate = @reportDate,
                            ReportPeriodStatus = N'Đã báo cáo'
                        WHERE StudentGroupsId = @groupId AND ReportOrder = @reportOrder
                    `);
                } else {
                    // Chèn bản ghi mới
                    await request.query(`
                        INSERT INTO ReportPeriod (
                            StudentGroupsId, 
                            ReportOrder, 
                            ReportPeriodStatus, 
                            ReportDate, 
                            ScorePeriod, 
                            PercentScorePeriod, 
                            Description
                        )
                        VALUES (
                            @groupId, 
                            @reportOrder, 
                            N'Đã báo cáo', 
                            @reportDate, 
                            @score, 
                            @percent, 
                            @description
                        )
                    `);
                }
            }

            await transaction.commit();
            res.status(200).json({ message: 'Cập nhật điểm thành công' });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật điểm:', error);
        res.status(500).json({ 
            message: 'Lỗi server khi cập nhật điểm',
            error: error.message // Xóa trong môi trường production
        });
    }
});

module.exports = router;
