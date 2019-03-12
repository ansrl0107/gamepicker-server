const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const logger = require('morgan');
const moment = require('moment-timezone');

const games = require('./routes/games');
const users = require('./routes/users');
const posts = require('./routes/posts');
const platforms = require('./routes/platforms');
const auth = require('./routes/auth');
const admin = require('./routes/admin');
const me = require('./routes/me');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/', express.static('apidoc'));
app.get('/favicon.ico', (req, res) => {
    res.sendFile(__dirname + '/public/images/favicon.ico')
})
app.use((req, res, next) => {
    global.pool = mysql.createPool(require('./config/database'));
    next();
})
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use('/uploads', express.static(__dirname + '/uploads'))
app.use('/auth', auth);
app.use(async (req, res, next) => {
    const auth_token = req.headers['authorization'];
    try {
        if (!auth_token) {
            throw { status: 400, code: "AUTHENTICATION_REQUIRED", message: "Authentication token required" };
        }
        const [rows] = await pool.query(`SELECT 1 FROM authorization WHERE token = ?`, [auth_token]);
        if (rows.length === 0)
            throw { status: 401, code: "AUTHENTICATION_FAILED", message: 'Invalid authentication token'};
        next();
    } catch (err) {
        next(err);
    }
})
logger.token('date', function() {
    const date = moment().tz('Asia/Seoul').format('MMM DD YYYY, hh:mm:ss');
    return date;
});
app.use(logger(':date :method :url :status - :response-time ms'));
const port = process.env.PORT || 80;

app.use('/games', games);
app.use('/users', users);
app.use('/posts', posts);
app.use('/platforms', platforms);
app.use('/admin', admin);
app.use('/me', me);
app.use('*', (req, res, next) => {
    res.status(404).send('Page Not Found');
})
app.use((err, req, res, next) => {    
    const date = moment().tz('Asia/Seoul').format('MMM DD YYYY, hh:mm:ss');
    if (!err.status)
        console.error(date, err);
    const message = err.message;
    const code = err.code?err.code:"UNDEFINED_ERROR";
    res.status(err.status || 500).json({ code, message });
})

app.listen(port);