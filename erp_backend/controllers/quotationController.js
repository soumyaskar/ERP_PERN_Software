const pool = require('../config/db');

const createQuotation = async (req, res) => {
    const client = await pool.connect();

    try {
        const { enquiry_id, customer_id, valid_until, items } = req.body;

        await client.query('BEGIN');

        // Generate unique quotation number
        const quotation_number = `QTN-${Date.now()}`;

        // Perform strict backend financial calculations
        let subtotal = 0;
        let total_discount = 0;
        let total_tax = 0;
        let grand_total = 0;

        const processedItems = items.map(item => {
            const base_amount = item.quantity * item.unit_price;
            const discount = base_amount * (item.discount_pct / 100);
            const taxable_amount = base_amount - discount;
            const tax = taxable_amount * (item.gst_pct / 100);
            const line_amount = taxable_amount + tax;

            subtotal += base_amount;
            total_discount += discount;
            total_tax += tax;
            grand_total += line_amount;

            return { ...item, line_amount };
        });

        // Insert Header into quotations table
        const quotationResult = await client.query(
            `INSERT INTO quotations 
            (quotation_number, enquiry_id, customer_id, valid_until, status, subtotal, discount_amount, tax_amount, grand_total) 
            VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8) RETURNING *`,
            [quotation_number, enquiry_id, customer_id, valid_until, subtotal, total_discount, total_tax, grand_total]
        );
        const quotation = quotationResult.rows[0];

        // Insert Line Items into quotation_items
        const insertedItems = [];
        for (let item of processedItems) {
            const itemResult = await client.query(
                `INSERT INTO quotation_items 
                (quotation_id, product_id, quantity, unit_price, discount_pct, gst_pct, line_amount) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [quotation.id, item.product_id, item.quantity, item.unit_price, item.discount_pct, item.gst_pct, item.line_amount]
            );
            insertedItems.push(itemResult.rows[0]);
        }

        // Update Enquiry status to 'QUOTED'
        await client.query(`UPDATE enquiries SET status = 'QUOTED' WHERE id = $1`, [enquiry_id]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Quotation created successfully',
            quotation,
            items: insertedItems
        });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getQuotations = async (req, res) => {
    try {
        const query = `
            SELECT q.*, c.company_name 
            FROM quotations q
            JOIN customers c ON q.customer_id = c.id
            ORDER BY q.created_at DESC
        `;
        const quotations = await pool.query(query);
        res.json(quotations.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createQuotation, getQuotations };