const express = require('express');
const router = express.Router();
const { pool, poolConnect } = require('../config/db');

//GET /api/projects
router.get('/', async (req, res) => {
    try{
        await poolConnect;
        const request = pool.request();
        const result = await request.query(`
            SELECT 
              p.Id,
              p.ProjectCode,
              p.ProjectName,
              p.MinStudents,
              p.MaxStudents,
              p.Status,
              p.StartDate,
              p.EndDate,
              p.Description,
              s.SubjectName,
              l.FullName AS LecturerName
            FROM Projects p
            JOIN Subjects s ON p.SubjectId = s.Id
            JOIN Lecturers l ON p.CreatedByLecturer = l.Id
          `);
        res.json(result.recordset);
    }catch (err){
        res.status(500).send(err.message);
    }
});

module.exports = router;