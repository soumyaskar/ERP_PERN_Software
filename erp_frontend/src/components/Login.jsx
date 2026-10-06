import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ShieldCheck, UserCheck, Lock, Mail, ArrowRight, Building } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard/customers', { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            
            // Save token and user details to localStorage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect to main enquiries workflow
            navigate('/dashboard/enquiries');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    const fillCredentials = (userEmail, userPassword) => {
        setEmail(userEmail);
        setPassword(userPassword);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md">
                        <Building className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Logisaar ERP</h2>
                        <p className="text-xs text-gray-500 font-medium">Manufacturing & Supply Chain Portal</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-xs font-semibold uppercase tracking-wider mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input 
                                type="email" 
                                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-gray-700 text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                        <span>{loading ? 'Authenticating...' : 'Sign In to ERP'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                {/* Quick 1-Click Test Credentials Helper */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Demo Credentials:</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => fillCredentials('admin@company.com', 'password123')}
                            className="flex flex-col items-start p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left transition group"
                        >
                            <div className="flex items-center space-x-1.5 text-purple-700 font-semibold text-xs mb-0.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>ADMIN</span>
                            </div>
                            <span className="text-[11px] text-gray-600">Full Access & Dispatch</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => fillCredentials('sales@company.com', 'password123')}
                            className="flex flex-col items-start p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition group"
                        >
                            <div className="flex items-center space-x-1.5 text-blue-700 font-semibold text-xs mb-0.5">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>SALES USER</span>
                            </div>
                            <span className="text-[11px] text-gray-600">Enquiries & Quotes</span>
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 text-center">Password for both accounts: <code className="text-gray-700 font-mono">password123</code></p>
                </div>
            </div>
        </div>
    );
};

export default Login;