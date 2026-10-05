import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ClipboardList, Plus, Building2, Calendar, FileText, ChevronDown, ChevronRight, X, Trash2, ArrowRight } from 'lucide-react';

const Enquiries = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [expandedEnquiryId, setExpandedEnquiryId] = useState(null);

    // Filter
    const [statusFilter, setStatusFilter] = useState('ALL');

    // New Enquiry Form
    const [enquiryForm, setEnquiryForm] = useState({
        customer_id: '',
        enquiry_date: new Date().toISOString().slice(0, 10),
        required_date: '',
        notes: '',
        items: [{ product_id: '', quantity: 1 }]
    });

    // New Customer Form
    const [customerForm, setCustomerForm] = useState({
        company_name: '',
        contact_person: '',
        email: '',
        mobile: '',
        city: ''
    });

    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [enqRes, custRes, prodRes] = await Promise.all([
                api.get('/enquiries'),
                api.get('/customers'),
                api.get('/products')
            ]);
            setEnquiries(enqRes.data);
            setCustomers(custRes.data);
            setProducts(prodRes.data);
            if (custRes.data.length > 0 && !enquiryForm.customer_id) {
                setEnquiryForm(prev => ({ ...prev, customer_id: custRes.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to load enquiries data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Line items manipulation in enquiry modal
    const handleItemChange = (index, field, value) => {
        const updated = [...enquiryForm.items];
        updated[index][field] = value;
        setEnquiryForm({ ...enquiryForm, items: updated });
    };

    const addItemRow = () => {
        setEnquiryForm({
            ...enquiryForm,
            items: [...enquiryForm.items, { product_id: '', quantity: 1 }]
        });
    };

    const removeItemRow = (index) => {
        if (enquiryForm.items.length <= 1) return;
        const updated = enquiryForm.items.filter((_, i) => i !== index);
        setEnquiryForm({ ...enquiryForm, items: updated });
    };

    const handleCreateEnquiry = async (e) => {
        e.preventDefault();
        setFormError('');

        // Validate items
        const validItems = enquiryForm.items.filter(item => item.product_id && item.quantity > 0);
        if (validItems.length === 0) {
            setFormError('Please select at least one valid product and quantity.');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/enquiries', {
                ...enquiryForm,
                items: validItems.map(it => ({ product_id: it.product_id, quantity: Number(it.quantity) }))
            });
            setIsEnquiryModalOpen(false);
            setEnquiryForm({
                customer_id: customers[0]?.id || '',
                enquiry_date: new Date().toISOString().slice(0, 10),
                required_date: '',
                notes: '',
                items: [{ product_id: '', quantity: 1 }]
            });
            fetchData();
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to create enquiry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            setSubmitting(true);
            const res = await api.post('/customers', customerForm);
            setIsCustomerModalOpen(false);
            setCustomerForm({ company_name: '', contact_person: '', email: '', mobile: '', city: '' });
            await fetchData();
            // Preselect newly created customer
            setEnquiryForm(prev => ({ ...prev, customer_id: res.data.id }));
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to create customer');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedEnquiryId(expandedEnquiryId === id ? null : id);
    };

    const filteredEnquiries = statusFilter === 'ALL' 
        ? enquiries 
        : enquiries.filter(e => e.status === statusFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 font-medium">
                Loading Enquiries...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Enquiries</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{enquiries.length}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <p className="text-xs font-semibold text-blue-600 uppercase">New Inbound</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                        {enquiries.filter(e => e.status === 'NEW').length}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
                    <p className="text-xs font-semibold text-amber-600 uppercase">Quoted</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                        {enquiries.filter(e => e.status === 'QUOTED').length}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                    <p className="text-xs font-semibold text-emerald-600 uppercase">Won / Converted</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                        {enquiries.filter(e => e.status === 'WON').length}
                    </p>
                </div>
            </div>

            {/* Main Enquiries Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Customer Enquiries</h3>
                            <p className="text-xs text-gray-500">Record inbound customer requirements and generate quotations</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Filter Pill */}
                        <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-medium mr-2">
                            {['ALL', 'NEW', 'QUOTED', 'WON'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-2.5 py-1 rounded-md transition ${
                                        statusFilter === status 
                                            ? 'bg-white text-gray-900 shadow-sm font-semibold' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => setIsCustomerModalOpen(true)}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>+ Customer</span>
                        </button>
                        
                        <button 
                            onClick={() => { setFormError(''); setIsEnquiryModalOpen(true); }}
                            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Log Enquiry</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4 font-semibold w-12"></th>
                                <th className="p-4 font-semibold">Enquiry No.</th>
                                <th className="p-4 font-semibold">Customer</th>
                                <th className="p-4 font-semibold">Enquiry Date</th>
                                <th className="p-4 font-semibold">Required Date</th>
                                <th className="p-4 font-semibold">Products</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredEnquiries.map((enq) => {
                                const isExpanded = expandedEnquiryId === enq.id;
                                const itemsCount = enq.items?.length || 0;

                                return (
                                    <React.Fragment key={enq.id}>
                                        <tr className="hover:bg-blue-50/40 transition-colors">
                                            <td className="p-4 text-center cursor-pointer" onClick={() => toggleExpand(enq.id)}>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500 inline" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                                                )}
                                            </td>
                                            <td className="p-4 font-semibold text-gray-900 font-mono text-xs">
                                                {enq.enquiry_number}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold text-gray-800">{enq.company_name}</div>
                                                <div className="text-xs text-gray-500">{enq.contact_person} {enq.customer_city ? `• ${enq.customer_city}` : ''}</div>
                                            </td>
                                            <td className="p-4 text-gray-600 text-xs">
                                                {enq.enquiry_date ? new Date(enq.enquiry_date).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="p-4 text-gray-600 text-xs">
                                                {enq.required_date ? new Date(enq.required_date).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                    {itemsCount} {itemsCount === 1 ? 'Product' : 'Products'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                                    enq.status === 'WON' ? 'bg-emerald-100 text-emerald-800' :
                                                    enq.status === 'QUOTED' ? 'bg-amber-100 text-amber-800' :
                                                    enq.status === 'LOST' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {enq.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {enq.status === 'NEW' ? (
                                                    <button
                                                        onClick={() => navigate('/dashboard/quotations', { state: { createForEnquiryId: enq.id } })}
                                                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>Create Quote</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => toggleExpand(enq.id)}
                                                        className="text-xs text-gray-500 hover:text-gray-800 font-medium"
                                                    >
                                                        {isExpanded ? 'Hide Items' : 'View Details'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* Expanded Row for Line Items */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50/70 border-b border-gray-200">
                                                <td colSpan="8" className="p-5 pl-14">
                                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                                                Requested Products ({enq.items?.length || 0})
                                                            </h4>
                                                            {enq.notes && (
                                                                <p className="text-xs text-gray-500 italic">
                                                                    Notes: {enq.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="border-b border-gray-200 text-gray-500">
                                                                    <th className="pb-2 font-semibold">Product Code</th>
                                                                    <th className="pb-2 font-semibold">Product Name</th>
                                                                    <th className="pb-2 font-semibold">Unit</th>
                                                                    <th className="pb-2 font-semibold text-right">Requested Qty</th>
                                                                    <th className="pb-2 font-semibold text-right">Base Price</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {enq.items?.map((item, idx) => (
                                                                    <tr key={idx} className="py-2">
                                                                        <td className="py-2 font-mono font-medium text-gray-800">{item.product_code}</td>
                                                                        <td className="py-2 text-gray-800">{item.product_name}</td>
                                                                        <td className="py-2 text-gray-500">{item.unit}</td>
                                                                        <td className="py-2 text-right font-bold text-gray-900">{item.quantity}</td>
                                                                        <td className="py-2 text-right text-gray-600">₹{Number(item.base_price || 0).toLocaleString('en-IN')}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredEnquiries.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-gray-500 text-sm">
                                        No customer enquiries found. Click <strong>"Log Enquiry"</strong> to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: Log New Customer Enquiry */}
            {isEnquiryModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                                <h3 className="text-base font-bold text-gray-900">Log New Customer Enquiry</h3>
                            </div>
                            <button onClick={() => setIsEnquiryModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEnquiry} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Customer *</label>
                                    <select
                                        required
                                        value={enquiryForm.customer_id}
                                        onChange={(e) => setEnquiryForm({ ...enquiryForm, customer_id: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.company_name} ({c.contact_person})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Required By Date</label>
                                    <input
                                        type="date"
                                        value={enquiryForm.required_date}
                                        onChange={(e) => setEnquiryForm({ ...enquiryForm, required_date: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Enquiry Notes / Subject</label>
                                <textarea
                                    rows="2"
                                    value={enquiryForm.notes}
                                    onChange={(e) => setEnquiryForm({ ...enquiryForm, notes: e.target.value })}
                                    placeholder="e.g. Inbound enquiry for Q4 infrastructure expansion..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Dynamic Product Line Items Section */}
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        Requested Industrial Products *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addItemRow}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Product</span>
                                    </button>
                                </div>

                                <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                                    {enquiryForm.items.map((item, idx) => {
                                        const selectedProd = products.find(p => p.id === item.product_id);
                                        return (
                                            <div key={idx} className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-gray-200 shadow-xs">
                                                <div className="flex-1">
                                                    <select
                                                        required
                                                        value={item.product_id}
                                                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    >
                                                        <option value="">Select Industrial Product...</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                [{p.product_code}] {p.name} — Base ₹{p.base_price}/{p.unit}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="w-28">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </div>

                                                <div className="w-16 text-xs text-gray-500 font-medium">
                                                    {selectedProd?.unit || 'Unit'}
                                                </div>

                                                {enquiryForm.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItemRow(idx)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEnquiryModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Submit Enquiry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Add New Customer */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                <h3 className="text-base font-bold text-gray-900">Add Customer Company</h3>
                            </div>
                            <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCustomer} className="p-6 space-y-3.5">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ABC Engineering Pvt. Ltd."
                                    value={customerForm.company_name}
                                    onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                                    <input
                                        type="text"
                                        placeholder="Rajesh Sharma"
                                        value={customerForm.contact_person}
                                        onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        placeholder="Mumbai"
                                        value={customerForm.city}
                                        onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        placeholder="contact@company.com"
                                        value={customerForm.email}
                                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile</label>
                                    <input
                                        type="text"
                                        placeholder="9876543210"
                                        value={customerForm.mobile}
                                        onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCustomerModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

import React from 'react';
export default Enquiries;