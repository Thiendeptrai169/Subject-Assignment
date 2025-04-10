const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//Middleware
app.use(cors());
app.use(express.json());

//Route test
// app.get('/', (req,res) => {
//     res.send('API is running...');
// });

//Real routes
const projectRoutes = require('./routes/projects');
const classRoutes = require('./routes/classes');
const subjectRoutes = require('./routes/subjects');
const semesterRoutes = require('./routes/semesters');
app.use('/api/projects', projectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/semesters', semesterRoutes);

//start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});