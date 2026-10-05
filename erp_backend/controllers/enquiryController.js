const pool = require('../config/db');

const createEnquiry = async (req, res) => {
    const client = await pool.connect(); // Grab a dedicated connection for the transaction

    try {
        const { customer_id, required_date, notes, items } = req.body;

        // Start Transaction
        await client.query('BEGIN');

        // 1. Generate a unique enquiry number (e.g., ENQ-1704389021)
        const enquiry_number = `ENQ-${Date.now()}`;

        // 2. Insert the Header into `enquiries`
        const enquiryResult = await client.query(
            `INSERT INTO enquiries (enquiry_number, customer_id, required_date, notes, status) 
             VALUES ($1, $2, $3, $4, 'NEW') RETURNING *`,
            [enquiry_number, customer_id, required_date, notes]
        );
        const enquiry = enquiryResult.rows[0];

        // 3. Insert the Line Items into `enquiry_items`
        const enquiryItems = [];
        for (let item of items) {
            const { product_id, quantity } = item;
            
            const itemResult = await client.query(
                `INSERT INTO enquiry_items (enquiry_id, product_id, quantity) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [enquiry.id, product_id, quantity]
            );
            enquiryItems.push(itemResult.rows[0]);
        }

        // Commit Transaction
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Enquiry created successfully',
            enquiry,
            items: enquiryItems
        });

    } catch (error) {
        // If ANYTHING fails, undo everything
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release(); // Return the connection to the pool
    }
};

const getEnquiries = async (req, res) => {
    try {
        // A JOIN query to fetch enquiries along with their customer details
        const query = `
            SELECT e.*, c.company_name 
            FROM enquiries e
            JOIN customers c ON e.customer_id = c.id
            ORDER BY e.created_at DESC
        `;
        const enquiries = await pool.query(query);
        res.json(enquiries.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createEnquiry, getEnquiries };