import { useState, useEffect } from 'react';
import api from '../api';
import { ShoppingCart } from 'lucide-react';

const SalesOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) return <div className="text-center py-10 font-medium text-gray-500">Loading sales orders...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Sales Orders</h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <th className="p-4 font-semibold">Order No.</th>
                            <th className="p-4 font-semibold">Customer</th>
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 font-semibold text-gray-800">{order.order_number}</td>
                                <td className="p-4 text-gray-600 text-sm">{order.company_name}</td>
                                <td className="p-4 text-gray-600 text-sm">
                                    {new Date(order.order_date).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                        order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                        order.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-gray-800 text-right">
                                    ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">
                                    No sales orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesOrders;