import { useState, useEffect } from 'react';
import api from '../api';
import { Building2, X } from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state for new customer
    const [formData, setFormData] = useState({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: ''
    });

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

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Send the POST request to your backend
            await api.post('/customers', formData);
            
            // Close modal and reset form
            setIsModalOpen(false);
            setFormData({ company_name: '', contact_person: '', email: '', phone: '', address: '', city: '' });
            
            // Refresh the table to show the newly added customer
            fetchCustomers();
        } catch (error) {
            alert('Failed to create customer: ' + (error.response?.data?.error || error.message));
        }
    };

    if (loading) return <div className="text-center py-10 font-medium text-gray-500">Loading customer database...</div>;

    return (
        <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Customer Database</h3>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
                >
                    + New Customer
                </button>
            </div>

            {/* Table */}
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

            {/* Create Customer Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Add New Customer</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input required type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. TechCorp Industries"/>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input required type="text" name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input required type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                                <input required type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Save Customer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;