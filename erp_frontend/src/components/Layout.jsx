import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, FileText, ShoppingCart } from 'lucide-react';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // STRICTLY 3 Nav Items (Login is the 4th screen, handled outside)
    const navItems = [
        { path: '/dashboard/enquiries', label: 'Enquiries', icon: ClipboardList },
        { path: '/dashboard/quotations', label: 'Quotations', icon: FileText },
        { path: '/dashboard/orders', label: 'Sales Orders', icon: ShoppingCart },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
                <div className="p-6 text-lg font-bold border-b border-slate-800 text-white tracking-widest uppercase">
                    Logisaar ERP
                </div>
                <nav className="flex-1 px-3 py-6 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.includes(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                                    isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {navItems.find(i => location.pathname.includes(i.path))?.label || 'ERP System'}
                    </h2>
                    <div className="flex items-center space-x-5">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-700">{user.name}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${
                                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {user.role}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-gray-200"></div>
                        <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
                            Logout
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;