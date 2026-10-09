const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET API: Fetch all employees
router.get('/', async (req, res) => {
    try {
        const [employees] = await db.query('SELECT id, full_name, email, role, department, basic_salary FROM Employees');
        res.status(200).json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST API: Add a new employee
router.post('/', async (req, res) => {
    const { full_name, email, password, role, department, basic_salary } = req.body;

    try {
        const sqlQuery = 'INSERT INTO Employees (full_name, email, password, role, department, basic_salary) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [full_name, email, password, role, department, basic_salary];
        
        const [result] = await db.query(sqlQuery, values);
        res.status(201).json({ message: 'Employee added successfully!', employeeId: result.insertId });
    } catch (error) {
        console.error('Error adding employee:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;