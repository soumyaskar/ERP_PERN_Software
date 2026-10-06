const pool = require('../config/db');

const createCustomer = async (req, res) => {
    try {
        const { company_name, contact_person, email, mobile, phone, city, address } = req.body;
        if (!company_name) {
            return res.status(400).json({ error: 'Company name is required' });
        }

        const phoneVal = mobile || phone || null;

        const newCustomer = await pool.query(
            `INSERT INTO customers (company_name, contact_person, email, mobile, city, address) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [company_name, contact_person, email, phoneVal, city, address || null]
        );

        res.status(201).json(newCustomer.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getCustomers = async (req, res) => {
    try {
        const customers = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
        res.status(200).json(customers.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createCustomer, getCustomers };