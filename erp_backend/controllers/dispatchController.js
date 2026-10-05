const pool = require('../config/db');

// Get all dispatches with sales order, customer, and dispatched items
const getDispatches = async (req, res) => {
    try {
        const query = `
            SELECT 
                d.id,
                d.dispatch_number,
                d.sales_order_id,
                so.order_number,
                c.company_name as customer_name,
                d.dispatch_date,
                d.vehicle_number,
                d.driver_name,
                d.created_at,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', di.id,
                            'product_id', p.id,
                            'product_code', p.product_code,
                            'product_name', p.name,
                            'unit', p.unit,
                            'quantity', di.quantity
                        )
                    ) FILTER (WHERE di.id IS NOT NULL), '[]'
                ) AS items
            FROM dispatches d
            JOIN sales_orders so ON d.sales_order_id = so.id
            JOIN customers c ON so.customer_id = c.id
            LEFT JOIN dispatch_items di ON d.id = di.dispatch_id
            LEFT JOIN products p ON di.product_id = p.id
            GROUP BY d.id, so.id, c.id
            ORDER BY d.created_at DESC
        `;
        const dispatches = await pool.query(query);
        res.status(200).json(dispatches.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getDispatches };