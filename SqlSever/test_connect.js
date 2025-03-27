// test_connection.js
const { Connection, Request } = require('tedious');

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
        trustServerCertificate: true,
         debug: {
             packet: true,  // Log thông tin packet
             data: true,   // Log dữ liệu
            token: true,   // Log token
             connection: true, // Log thông tin kết nối
             log: true      // Log các thông tin chung
        }
    }
};

const connection = new Connection(config);

connection.on('connect', (err) => {
  if (err) {
    console.error('Connection Failed:', err);
    return;
  }
  console.log('Connected!');
  connection.close();
});

connection.connect();