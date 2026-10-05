const pool = require('../config/db');

const createCustomer = async (req, res) => {
    try {
        const { company_name, contact_person, email, mobile, city } = req.body;
        
        const newCustomer = await pool.query(
            `INSERT INTO customers (company_name, contact_person, email, mobile, city) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [company_name, contact_person, email, mobile, city]
        );

        res.status(201).json(newCustomer.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCustomers = async (req, res) => {
    try {
        const customers = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
        res.json(customers.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createCustomer, getCustomers };