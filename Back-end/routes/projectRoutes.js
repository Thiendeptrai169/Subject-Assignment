const express = require('express');
const router = express.Router();
const sql = require('mssql');
const dbConfig = require('../config/dbconfig');
const jwt = require('jsonwebtoken');

const JWT_SECRET = '123421152';

// Middleware xác thực token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Thiếu token xác thực' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
        req.user = user;
        next();
    });
};

// Thêm project mới
router.post('/projects', authenticateToken, async (req, res) => {
    try {
        const { name, description, requirements, deadline, instructorId } = req.body;

        if (!name || !description || !requirements || !deadline || !instructorId) {
            return res.status(400).json({ message: 'Thiếu thông tin project' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('requirements', sql.NVarChar, requirements)
            .input('deadline', sql.DateTime, new Date(deadline))
            .input('instructorId', sql.VarChar, instructorId)
            .input('createdAt', sql.DateTime, new Date())
            .query(`
                INSERT INTO Projects (Name, Description, Requirements, Deadline, InstructorId, CreatedAt)
                VALUES (@name, @description, @requirements, @deadline, @instructorId, @createdAt);
                SELECT SCOPE_IDENTITY() as id;
            `);

        res.status(201).json({
            message: 'Thêm project thành công',
            projectId: result.recordset[0].id
        });
    } catch (error) {
        console.error('Lỗi khi thêm project:', error);
        res.status(500).json({ message: 'Lỗi server khi thêm project' });
    }
});

// Lấy danh sách project của giảng viên
router.get('/projects/instructor/:instructorId', authenticateToken, async (req, res) => {
    try {
        const { instructorId } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('instructorId', sql.VarChar, instructorId)
            .query(`
                SELECT * FROM Projects 
                WHERE InstructorId = @instructorId 
                ORDER BY CreatedAt DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách project:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách project' });
    }
});

// Lấy chi tiết một project
router.get('/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Projects WHERE Id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy project' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết project:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết project' });
    }
});

// Cập nhật project
router.put('/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, requirements, deadline } = req.body;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('requirements', sql.NVarChar, requirements)
            .input('deadline', sql.DateTime, new Date(deadline))
            .input('updatedAt', sql.DateTime, new Date())
            .query(`
                UPDATE Projects 
                SET Name = @name, 
                    Description = @description, 
                    Requirements = @requirements, 
                    Deadline = @deadline,
                    UpdatedAt = @updatedAt
                WHERE Id = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Không tìm thấy project' });
        }

        res.json({ message: 'Cập nhật project thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật project:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật project' });
    }
});

// Xóa project
router.delete('/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Projects WHERE Id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Không tìm thấy project' });
        }

        res.json({ message: 'Xóa project thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa project:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa project' });
    }
});

module.exports = router; 