require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

const connectDatabase = require('./controllers/db/connectDatabase');

connectDatabase();

app.use(
    cors({ 
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser());

const userRoutes = require('./routes/user/route');
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Disposable Mail Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});