import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
    Building2, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Plus, 
    Search, 
    X, 
    ArrowRight,
    CheckCircle2,
    Calendar,
    Users
} from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState({
        company_name: '',
        contact_person: '',
        email: '',
        mobile: '',
        city: '',
        address: ''
    });

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
            setErrorMessage('Failed to load customers from database.');
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
        setErrorMessage('');
        setSuccessMessage('');
        setSubmitting(true);

        try {
            const payload = {
                company_name: formData.company_name.trim(),
                contact_person: formData.contact_person.trim(),
                email: formData.email.trim(),
                mobile: formData.mobile.trim(),
                city: formData.city.trim(),
                address: formData.address.trim()
            };

            await api.post('/customers', payload);
            
            setSuccessMessage(`Customer "${formData.company_name}" successfully saved in database!`);
            setIsModalOpen(false);
            setFormData({ company_name: '', contact_person: '', email: '', mobile: '', city: '', address: '' });
            
            // Re-fetch to immediately display latest data from DB
            await fetchCustomers();

            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage(error.response?.data?.error || error.message || 'Failed to save customer');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(c => {
        const query = searchTerm.toLowerCase();
        return (
            c.company_name?.toLowerCase().includes(query) ||
            c.contact_person?.toLowerCase().includes(query) ||
            c.city?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query) ||
            c.mobile?.toLowerCase().includes(query)
        );
    });

    const uniqueCities = new Set(customers.map(c => c.city).filter(Boolean)).size;

    return (
        <div className="space-y-6">
            {/* Top Notification / Toast */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center space-x-2 shadow-sm animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-medium">{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center space-x-2 shadow-sm">
                    <X className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span className="text-sm font-medium">{errorMessage}</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Customers</p>
                        <p className="text-3xl font-extrabold text-gray-900 mt-1">{customers.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Persisted in PostgreSQL</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Users className="w-7 h-7" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Cities</p>
                        <p className="text-3xl font-extrabold text-emerald-600 mt-1">{uniqueCities}</p>
                        <p className="text-xs text-gray-500 mt-1">Commercial territories</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <MapPin className="w-7 h-7" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Latest Registration</p>
                        <p className="text-base font-bold text-gray-800 mt-1 truncate max-w-[180px]">
                            {customers[0]?.company_name || 'None'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {customers[0]?.city ? `in ${customers[0].city}` : 'No records yet'}
                        </p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Building2 className="w-7 h-7" />
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        placeholder="Search company, person, city, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                        onClick={fetchCustomers}
                        className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Reload from PostgreSQL"
                    >
                        ↻ Refresh DB
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Customer</span>
                    </button>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/70">
                    <div className="flex items-center space-x-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-gray-800">Permanent Customer Registry</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">
                            {filteredCustomers.length} Records
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">PostgreSQL Table: <code>customers</code></span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-500 font-medium">
                        Loading customers from database...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Company Name</th>
                                    <th className="p-4 font-semibold">Contact Person</th>
                                    <th className="p-4 font-semibold">Mobile & Email</th>
                                    <th className="p-4 font-semibold">City & Address</th>
                                    <th className="p-4 font-semibold">Registered</th>
                                    <th className="p-4 font-semibold text-right">Quick Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                                {filteredCustomers.map((cust) => (
                                    <tr key={cust.id} className="hover:bg-blue-50/40 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 flex items-center space-x-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                                    {cust.company_name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div>{cust.company_name}</div>
                                                    <div className="text-xs text-gray-400 font-mono">ID: {cust.id.slice(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-800 font-medium flex items-center space-x-1.5">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{cust.contact_person || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <div className="text-gray-800 flex items-center space-x-1.5 text-xs font-semibold">
                                                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>{cust.mobile || '—'}</span>
                                                </div>
                                                <div className="text-gray-500 flex items-center space-x-1.5 text-xs">
                                                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="truncate max-w-[200px]">{cust.email || '—'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-gray-800 flex items-center space-x-1">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                                    <span>{cust.city || '—'}</span>
                                                </div>
                                                {cust.address && (
                                                    <div className="text-xs text-gray-500 truncate max-w-[220px]" title={cust.address}>
                                                        {cust.address}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{new Date(cust.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => navigate('/dashboard/enquiries', { state: { createForCustomerId: cust.id } })}
                                                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
                                            >
                                                <span>Create Enquiry</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-gray-500">
                                            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                            <p className="font-medium text-gray-700">No customers found.</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Click "+ Add Customer" above to insert a customer permanently into PostgreSQL.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Customer Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-slate-900 text-white">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-600 rounded-lg text-white">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Add New Customer</h2>
                                    <p className="text-xs text-slate-300">Saves directly into PostgreSQL <code>customers</code> table</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Company Name *
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Larsen & Toubro Heavy Industries"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Contact Person *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="contact_person"
                                        value={formData.contact_person}
                                        onChange={handleInputChange}
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Ramesh Patel"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        City *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Mumbai"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        required
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="procurement@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Mobile Number *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 9876543210"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Full Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Plot 14, MIDC Industrial Area, Phase II"
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {submitting ? <span>Saving to DB...</span> : <span>Save to PostgreSQL</span>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;