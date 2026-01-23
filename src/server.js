require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

const connectDatabase = require('./controllers/db/connectDatabase');
const { syncDatabase } = require('./models/index');

connectDatabase();
syncDatabase();

app.use(
    cors({ 
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser());

const schedular = require('./libs/utils/schedular');
schedular.start();
console.log('✓ Scheduler started - Running every 1 minutes');

const userRoutes = require('./routes/user/route');
app.use('/api/users', userRoutes);

const sessionRoutes = require('./routes/session/route');
app.use('/api/session', sessionRoutes);

const mailboxRoutes = require('./routes/mailbox/route');
app.use('/api/mailbox', mailboxRoutes);

const userMailboxRoutes = require('./routes/userMailbox/route');
app.use('/api/user/mailbox', userMailboxRoutes);

const mailRoutes = require('./routes/mail/route');
app.use('/api/mail', mailRoutes);

const adminRoutes = require('./routes/admin/route');
const validateUser = require('./middlewares/authMiddleware');
const verifyAdmin = require('./middlewares/adminMiddleware');

app.use('/api/admin', validateUser, verifyAdmin, adminRoutes);

app.get('/', (req, res) => {
    res.send('Disposable Mail Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});