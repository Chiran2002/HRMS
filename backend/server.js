const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes Setup
const employeeRoutes = require('./routes/employee');
app.use('/api/employees', employeeRoutes);

// Basic Test Route
app.get('/', (req, res) => {
    res.send('SL Bank HRMS Backend is Running!');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});