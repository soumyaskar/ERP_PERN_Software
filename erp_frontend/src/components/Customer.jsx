import { useState, useEffect } from 'react';
import api from '../api';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Declare the function FIRST
    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    // 2. THEN call it inside useEffect
    useEffect(() => {
        fetchCustomers();
    }, []);

    if (loading) return <div className="text-center py-10 font-medium text-gray-500">Loading customer database...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800 tracking-tight">Customer Database</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">
                    + New Customer
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <th className="p-4 font-semibold">Company Name</th>
                            <th className="p-4 font-semibold">Contact Person</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">City</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {customers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 font-semibold text-gray-800">{customer.company_name}</td>
                                <td className="p-4 text-gray-600 text-sm">{customer.contact_person}</td>
                                <td className="p-4 text-gray-600 text-sm">{customer.email}</td>
                                <td className="p-4 text-gray-600 text-sm">{customer.city}</td>
                            </tr>
                        ))}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-500 text-sm">
                                    No customers found in the database.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Customers;