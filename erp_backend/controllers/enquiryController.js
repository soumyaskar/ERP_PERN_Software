const pool = require('../config/db');

// Create a new Customer Enquiry with multiple product items
const createEnquiry = async (req, res) => {
    const client = await pool.connect();
    try {
        const { customer_id, enquiry_date, required_date, notes, subject, items } = req.body;

        if (!customer_id) {
            return res.status(400).json({ error: 'Customer is required' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one product item is required' });
        }

        await client.query('BEGIN');

        // Generate unique Enquiry Number: ENQ-YYYYMMDD-XXXX
        const countRes = await client.query('SELECT COUNT(*) FROM enquiries');
        const seq = parseInt(countRes.rows[0].count, 10) + 1;
        const enquiryNumber = `ENQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;

        const noteContent = notes || subject || '';

        const enquiryQuery = `
            INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, notes, status) 
            VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, 'NEW') 
            RETURNING *
        `;
        const enquiryRes = await client.query(enquiryQuery, [
            enquiryNumber,
            customer_id,
            enquiry_date || null,
            required_date || null,
            noteContent
        ]);
        const newEnquiry = enquiryRes.rows[0];

        const insertedItems = [];
        for (const item of items) {
            if (!item.product_id || !item.quantity || item.quantity <= 0) {
                throw new Error('Each item must have a valid product_id and quantity > 0');
            }
            const itemRes = await client.query(
                `INSERT INTO enquiry_items (enquiry_id, product_id, quantity) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [newEnquiry.id, item.product_id, item.quantity]
            );
            insertedItems.push(itemRes.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json({ ...newEnquiry, items: insertedItems });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// Get all enquiries with customer and items details
const getEnquiries = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id,
                e.enquiry_number,
                e.customer_id,
                c.company_name,
                c.contact_person,
                c.email as customer_email,
                c.city as customer_city,
                e.enquiry_date,
                e.required_date,
                e.notes,
                e.status,
                e.created_at,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', ei.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'quantity', ei.quantity,
                            'unit', p.unit,
                            'base_price', p.base_price
                        )
                    ) FILTER (WHERE ei.id IS NOT NULL), '[]'
                ) AS items
            FROM enquiries e
            JOIN customers c ON e.customer_id = c.id
            LEFT JOIN enquiry_items ei ON e.id = ei.enquiry_id
            LEFT JOIN products p ON ei.product_id = p.id
            GROUP BY e.id, c.id
            ORDER BY e.created_at DESC
        `;
        const enquiries = await pool.query(query);
        res.status(200).json(enquiries.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single enquiry by ID
const getEnquiryById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                e.id,
                e.enquiry_number,
                e.customer_id,
                c.company_name,
                c.contact_person,
                c.email as customer_email,
                c.city as customer_city,
                e.enquiry_date,
                e.required_date,
                e.notes,
                e.status,
                e.created_at,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', ei.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'quantity', ei.quantity,
                            'unit', p.unit,
                            'base_price', p.base_price
                        )
                    ) FILTER (WHERE ei.id IS NOT NULL), '[]'
                ) AS items
            FROM enquiries e
            JOIN customers c ON e.customer_id = c.id
            LEFT JOIN enquiry_items ei ON e.id = ei.enquiry_id
            LEFT JOIN products p ON ei.product_id = p.id
            WHERE e.id = $1
            GROUP BY e.id, c.id
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createEnquiry, getEnquiries, getEnquiryById };