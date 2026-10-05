const pool = require('../config/db');

// Calculate item line amounts and totals on backend
function calculateQuotationFinancials(items) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const calculatedItems = items.map(item => {
        const qty = Number(item.quantity);
        const price = Number(item.unit_price);
        const discountPct = Number(item.discount_pct || 0);
        const gstPct = item.gst_pct !== undefined ? Number(item.gst_pct) : 18; // default 18% GST

        const base = Number((qty * price).toFixed(2));
        const discountAmt = Number((base * (discountPct / 100)).toFixed(2));
        const taxable = Number((base - discountAmt).toFixed(2));
        const taxAmt = Number((taxable * (gstPct / 100)).toFixed(2));
        const lineTotal = Number((taxable + taxAmt).toFixed(2));

        subtotal += base;
        totalDiscount += discountAmt;
        totalTax += taxAmt;
        grandTotal += lineTotal;

        return {
            product_id: item.product_id,
            quantity: qty,
            unit_price: price,
            discount_pct: discountPct,
            gst_pct: gstPct,
            line_amount: lineTotal
        };
    });

    return {
        items: calculatedItems,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(totalDiscount.toFixed(2)),
        tax_amount: Number(totalTax.toFixed(2)),
        grand_total: Number(grandTotal.toFixed(2))
    };
}

// 1. Create Quotation against an Enquiry
const createQuotation = async (req, res) => {
    const client = await pool.connect();
    try {
        const { enquiry_id, valid_until, items } = req.body;

        if (!enquiry_id) {
            return res.status(400).json({ error: 'Enquiry reference is required' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Quotation requires at least one product item' });
        }

        await client.query('BEGIN');

        // Look up enquiry to get customer_id and verify existence
        const enqRes = await client.query('SELECT * FROM enquiries WHERE id = $1', [enquiry_id]);
        if (enqRes.rows.length === 0) {
            throw new Error('Referenced enquiry not found');
        }
        const enquiry = enqRes.rows[0];
        const customer_id = enquiry.customer_id;

        // Perform backend calculations
        const financials = calculateQuotationFinancials(items);

        // Generate Quotation Number: QUO-YYYYMMDD-XXXX
        const countRes = await client.query('SELECT COUNT(*) FROM quotations');
        const seq = parseInt(countRes.rows[0].count, 10) + 1;
        const quotationNumber = `QUO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;

        const quoteQuery = `
            INSERT INTO quotations (
                quotation_number, enquiry_id, customer_id, valid_until, 
                status, subtotal, discount_amount, tax_amount, grand_total
            ) VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8)
            RETURNING *
        `;
        const quoteRes = await client.query(quoteQuery, [
            quotationNumber,
            enquiry_id,
            customer_id,
            valid_until || null,
            financials.subtotal,
            financials.discount_amount,
            financials.tax_amount,
            financials.grand_total
        ]);
        const newQuotation = quoteRes.rows[0];

        // Insert quotation items
        const insertedItems = [];
        for (const item of financials.items) {
            const itemRes = await client.query(
                `INSERT INTO quotation_items (
                    quotation_id, product_id, quantity, unit_price, discount_pct, gst_pct, line_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [newQuotation.id, item.product_id, item.quantity, item.unit_price, item.discount_pct, item.gst_pct, item.line_amount]
            );
            insertedItems.push(itemRes.rows[0]);
        }

        // Update enquiry status to QUOTED
        await client.query(`UPDATE enquiries SET status = 'QUOTED', updated_at = NOW() WHERE id = $1`, [enquiry_id]);

        await client.query('COMMIT');
        res.status(201).json({ ...newQuotation, items: insertedItems });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// 2. Get All Quotations
const getQuotations = async (req, res) => {
    try {
        const query = `
            SELECT 
                q.id,
                q.quotation_number,
                q.enquiry_id,
                e.enquiry_number,
                q.customer_id,
                c.company_name,
                c.contact_person,
                c.email as customer_email,
                q.valid_until,
                q.status,
                q.subtotal,
                q.discount_amount,
                q.tax_amount,
                q.grand_total,
                q.created_at,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', qi.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'quantity', qi.quantity,
                            'unit', p.unit,
                            'unit_price', qi.unit_price,
                            'discount_pct', qi.discount_pct,
                            'gst_pct', qi.gst_pct,
                            'line_amount', qi.line_amount
                        )
                    ) FILTER (WHERE qi.id IS NOT NULL), '[]'
                ) AS items
            FROM quotations q
            JOIN customers c ON q.customer_id = c.id
            JOIN enquiries e ON q.enquiry_id = e.id
            LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
            LEFT JOIN products p ON qi.product_id = p.id
            GROUP BY q.id, c.id, e.id
            ORDER BY q.created_at DESC
        `;
        const quotations = await pool.query(query);
        res.status(200).json(quotations.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Get single quotation by ID
const getQuotationById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                q.*,
                e.enquiry_number,
                c.company_name,
                c.contact_person,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', qi.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'quantity', qi.quantity,
                            'unit', p.unit,
                            'unit_price', qi.unit_price,
                            'discount_pct', qi.discount_pct,
                            'gst_pct', qi.gst_pct,
                            'line_amount', qi.line_amount
                        )
                    ) FILTER (WHERE qi.id IS NOT NULL), '[]'
                ) AS items
            FROM quotations q
            JOIN customers c ON q.customer_id = c.id
            JOIN enquiries e ON q.enquiry_id = e.id
            LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE q.id = $1
            GROUP BY q.id, c.id, e.id
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Update Quotation Status (DRAFT -> SENT -> ACCEPTED / REJECTED)
const updateQuotationStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        await client.query('BEGIN');

        const quoteRes = await client.query('SELECT * FROM quotations WHERE id = $1 FOR UPDATE', [id]);
        if (quoteRes.rows.length === 0) {
            throw new Error('Quotation not found');
        }
        const quote = quoteRes.rows[0];

        const updatedQuote = await client.query(
            `UPDATE quotations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );

        // Update corresponding enquiry status
        if (status === 'ACCEPTED') {
            await client.query(`UPDATE enquiries SET status = 'WON', updated_at = NOW() WHERE id = $1`, [quote.enquiry_id]);
        } else if (status === 'REJECTED') {
            await client.query(`UPDATE enquiries SET status = 'LOST', updated_at = NOW() WHERE id = $1`, [quote.enquiry_id]);
        }

        await client.query('COMMIT');
        res.status(200).json(updatedQuote.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// 5. Convert ACCEPTED quotation into Sales Order
const convertQuotationToOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Lock quotation
        const quoteRes = await client.query('SELECT * FROM quotations WHERE id = $1 FOR UPDATE', [id]);
        if (quoteRes.rows.length === 0) {
            throw new Error('Quotation not found');
        }
        const quote = quoteRes.rows[0];

        // Rule: Only ACCEPTED quotations can create a Sales Order
        if (quote.status !== 'ACCEPTED') {
            throw new Error(`Quotation status is ${quote.status}. Only ACCEPTED quotations can create a Sales Order.`);
        }

        // Rule: One quotation should not accidentally generate multiple Sales Orders
        const existingOrder = await client.query('SELECT * FROM sales_orders WHERE quotation_id = $1', [id]);
        if (existingOrder.rows.length > 0) {
            throw new Error('A Sales Order has already been generated for this quotation.');
        }

        // Generate Order Number: SO-YYYYMMDD-XXXX
        const countRes = await client.query('SELECT COUNT(*) FROM sales_orders');
        const seq = parseInt(countRes.rows[0].count, 10) + 1;
        const orderNumber = `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;

        // Insert into sales_orders
        const orderQuery = `
            INSERT INTO sales_orders (
                order_number, quotation_id, customer_id, order_date, total_amount, status
            ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'PENDING')
            RETURNING *
        `;
        const orderResult = await client.query(orderQuery, [
            orderNumber,
            quote.id,
            quote.customer_id,
            quote.grand_total
        ]);
        const salesOrder = orderResult.rows[0];

        // Fetch quotation items and copy them to sales_order_items
        const itemsRes = await client.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [id]);
        const insertedOrderItems = [];
        for (const item of itemsRes.rows) {
            const orderItemRes = await client.query(
                `INSERT INTO sales_order_items (
                    sales_order_id, product_id, quantity, unit_price, line_amount
                ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [salesOrder.id, item.product_id, item.quantity, item.unit_price, item.line_amount]
            );
            insertedOrderItems.push(orderItemRes.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json({ ...salesOrder, items: insertedOrderItems });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    createQuotation,
    getQuotations,
    getQuotationById,
    updateQuotationStatus,
    convertQuotationToOrder
};