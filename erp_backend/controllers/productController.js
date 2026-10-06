const pool = require('../config/db');

// Get all products master
const getProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, product_code, name, category, unit, base_price, created_at 
            FROM products 
            ORDER BY product_code ASC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get inventory with calculated available quantity: physical - reserved - damaged
const getInventory = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id as product_id,
                p.product_code,
                p.name as product_name,
                p.category,
                p.unit,
                p.base_price,
                i.physical_qty,
                i.reserved_qty,
                i.damaged_qty,
                (i.physical_qty - i.reserved_qty - i.damaged_qty) as available_qty,
                i.updated_at
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            ORDER BY p.product_code ASC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin can adjust inventory (e.g. physical stock arrival or marking damaged)
const updateInventory = async (req, res) => {
    try {
        const { productId } = req.params;
        const { physical_qty, damaged_qty } = req.body;

        const updateFields = [];
        const values = [];
        let index = 1;

        if (physical_qty !== undefined) {
            updateFields.push(`physical_qty = $${index++}`);
            values.push(physical_qty);
        }
        if (damaged_qty !== undefined) {
            updateFields.push(`damaged_qty = $${index++}`);
            values.push(damaged_qty);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update provided' });
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(productId);

        const query = `
            UPDATE inventory 
            SET ${updateFields.join(', ')} 
            WHERE product_id = $${index} 
            RETURNING *
        `;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Create a new product and initialize inventory
const createProduct = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_code, name, category, unit, base_price, physical_qty } = req.body;

        if (!product_code || !name || !category || !unit || base_price === undefined) {
            return res.status(400).json({ error: 'product_code, name, category, unit, and base_price are required.' });
        }

        const initialStock = Number(physical_qty || 0);
        if (initialStock < 0) {
            return res.status(400).json({ error: 'Physical quantity cannot be negative.' });
        }

        await client.query('BEGIN');

        const insertProduct = `
            INSERT INTO products (product_code, name, category, unit, base_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const prodRes = await client.query(insertProduct, [
            product_code.trim().toUpperCase(),
            name.trim(),
            category.trim(),
            unit.trim(),
            Number(base_price)
        ]);
        const product = prodRes.rows[0];

        // Create initial inventory row
        const invRes = await client.query(
            `INSERT INTO inventory (product_id, physical_qty, reserved_qty, damaged_qty)
             VALUES ($1, $2, 0, 0)
             RETURNING *`,
            [product.id, initialStock]
        );

        await client.query('COMMIT');
        res.status(201).json({
            product,
            inventory: {
                ...invRes.rows[0],
                available_qty: initialStock
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(400).json({ error: 'A product with this product code already exists.' });
        }
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getProducts,
    getInventory,
    updateInventory,
    createProduct
};
