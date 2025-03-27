const express = require('express');
const app = express();
const port = 3000; 
const { Connection, Request } = require('tedious');
const cors = require('cors');
const config = {
    server: 'LAPTOP-9EADT9C4\\MSSQLSERVER02',
    authentication: {
        type: 'default',
        options: {
            userName: 'sa',
            password: '0975548802'
        }
    },
    options: {
        encrypt: true,
        database: 'Subject Assignment',
        trustServerCertificate: true

    }
    
};
app.use(cors());
app.use(express.json());


app.get('/api/projects', (req, res) => {
    const connection = new Connection(config);
    connection.on('connect', (err) => {
        if (err) {
            console.error("Connection Failed:", err);
            res.status(500).send('Lỗi kết nối cơ sở dữ liệu.');
            return;
        }
        else{
        console.log("Connected to SQL Server successfully!");
        }
        const request = new Request("SELECT * FROM Project", (err, rowCount) => {
            if (err) {
                console.error("Request Failed:", err);
                res.status(500).send('Lỗi truy vấn cơ sở dữ liệu.');
                return;
            }
            else{
            console.log(`Query executed successfully! Rows returned: ${rowCount}`);
            }
            connection.close();
        });

        let projects = [];
        request.on('row', (columns) => {
            let project = {};
            columns.forEach((column) => {
                project[column.metadata.colName] = column.value;
            });
            projects.push(project);
        });

        request.on('requestCompleted', () => {
            console.log("Data fetched successfully:", projects);
            res.json(projects);
        });

        connection.execSql(request);
    });

    connection.connect();
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
