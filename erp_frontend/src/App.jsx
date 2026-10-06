import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Customers from './components/Customer';
import Enquiries from './components/Enquiries';
import Quotations from './components/Quotations';
import SalesOrders from './components/SalesOrders';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="customers" replace />} />
          <Route path="customers" element={<Customers />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="orders" element={<SalesOrders />} />
          <Route path="*" element={<Navigate to="customers" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;