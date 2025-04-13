const express = require('express');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../Front-end')));
//Route test
// app.get('/', (req,res) => {
//     res.send('API is running...');
// });

//Real routes
const projectRoutes = require('./routes/projects');
const notificationRoutes = require('./routes/notifications'); 
const StudentNotificationRoutes = require('./routes/StudentNotifications');
const classRoutes = require('./routes/classes');
const subjectRoutes = require('./routes/subjects');
const semesterRoutes = require('./routes/semesters');
const profileRoutes = require('./routes/profiles');

app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes); 
app.use('/api/StudentNotifications', StudentNotificationRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/profiles', profileRoutes);




app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Front-end', 'index.html'));
});

//start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});