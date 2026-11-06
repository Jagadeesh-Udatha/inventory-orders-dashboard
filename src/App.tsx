import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useCart } from './cart/CartContext';
import { CartPage } from './pages/CartPage';
import { NewProductPage } from './pages/NewProductPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  const { count } = useCart();
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Inventory &amp; Orders</span>
        <nav>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/orders">Orders</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/cart">Cart{count > 0 && <span className="pill" aria-label={`${count} items`}>{count}</span>}</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<NewProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
