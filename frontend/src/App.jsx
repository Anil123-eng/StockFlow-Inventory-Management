
import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api";

function App() {
  const [page, setPage] = useState("login");
  const [activeView, setActiveView] = useState("dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("access");
    return token ? localStorage.getItem("organization") : null;
  });

  // Dashboard data
  const [dashboard, setDashboard] = useState({
    total_products: 0,
    total_stock: 0,
    low_stock_products: [],
  });

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  // Product management
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const emptyProduct = {
    name: "",
    sku: "",
    description: "",
    quantity: "0",
    cost_price: "",
    selling_price: "",
    low_stock_threshold: "10",
  };

  const [productForm, setProductForm] = useState(emptyProduct);

  // Organization settings
  const [threshold, setThreshold] = useState("10");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  // API helper with automatic access-token refresh
  async function apiRequest(endpoint, options = {}) {
    let token = localStorage.getItem("access");

    const makeRequest = (accessToken) =>
      fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

    let response = await makeRequest(token);

    if (response.status === 401) {
      const refresh = localStorage.getItem("refresh");

      if (!refresh) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const refreshResponse = await fetch(`${API_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok || !refreshData.access) {
        throw new Error("Your session has expired. Please log in again.");
      }

      token = refreshData.access;
      localStorage.setItem("access", token);
      response = await makeRequest(token);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data.detail ||
        data.error ||
        data.message ||
        Object.values(data).flat().join(" ") ||
        "Something went wrong.";

      throw new Error(message);
    }

    return data;
  }

  // Login and registration
  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const isRegister = page === "register";
    const endpoint = isRegister ? "auth/register/" : "auth/login/";

    const body = isRegister
      ? {
          organization_name: organization,
          email,
          password,
        }
      : {
          email,
          password,
        };

    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Authentication failed."
        );
      }

      if (isRegister) {
        setPage("login");
        setError("Registration successful. Please log in.");
        setPassword("");
      } else {
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        localStorage.setItem("organization", data.organization);

        setUser(data.organization);
        setActiveView("dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load dashboard information
  async function loadDashboard() {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const data = await apiRequest("dashboard/");

      setDashboard({
        total_products: data.total_products ?? 0,
        total_stock: data.total_stock ?? 0,
        low_stock_products: data.low_stock_products ?? [],
      });
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  // Load products
  async function loadProducts(search = searchTerm, lowStock = lowStockOnly) {
    setProductsLoading(true);
    setProductsError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (lowStock) {
        params.set("low_stock", "true");
      }

      const query = params.toString();
      const endpoint = query
        ? `products/?${query}`
        : "products/";

      const data = await apiRequest(endpoint);

      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setProductsError(err.message);
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    if (user && activeView === "products") {
      loadProducts();
    }
  }, [user, activeView]);

  // Product form helpers
  function openAddProduct() {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductsError("");
    setShowProductForm(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      quantity: String(product.quantity ?? 0),
      cost_price: String(product.cost_price ?? ""),
      selling_price: String(product.selling_price ?? ""),
      low_stock_threshold: String(product.low_stock_threshold ?? 10),
    });
    setProductsError("");
    setShowProductForm(true);
  }

  function handleProductInput(e) {
    const { name, value } = e.target;

    setProductForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Add or update product
  async function handleProductSubmit(e) {
    e.preventDefault();
    setSavingProduct(true);
    setProductsError("");

    const body = {
      ...productForm,
      quantity: Number(productForm.quantity),
      cost_price: Number(productForm.cost_price),
      selling_price: Number(productForm.selling_price),
      low_stock_threshold: Number(productForm.low_stock_threshold),
    };

    try {
      const isEditing = Boolean(editingProduct);

      await apiRequest(
        isEditing ? `products/${editingProduct.id}/` : "products/",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(body),
        }
      );

      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm(emptyProduct);

      await loadProducts();
      await loadDashboard();
    } catch (err) {
      setProductsError(err.message);
    } finally {
      setSavingProduct(false);
    }
  }

  // Delete product
  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setProductsError("");

    try {
      await apiRequest(`products/${product.id}/`, {
        method: "DELETE",
      });

      await loadProducts();
      await loadDashboard();
    } catch (err) {
      setProductsError(err.message);
    }
  }

  // Load organization settings
  async function loadSettings() {
    setSettingsLoading(true);
    setSettingsMessage("");

    try {
      const data = await apiRequest("settings/");
      setThreshold(String(data.default_low_stock_threshold ?? 10));
    } catch (err) {
      setSettingsMessage(err.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    if (user && activeView === "settings") {
      loadSettings();
    }
  }, [user, activeView]);

  // Save organization settings
  async function saveSettings(e) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");

    try {
      const data = await apiRequest("settings/", {
        method: "PUT",
        body: JSON.stringify({
          default_low_stock_threshold: Number(threshold),
        }),
      });

      setThreshold(String(data.default_low_stock_threshold ?? threshold));
      setSettingsMessage("Settings saved successfully.");
    } catch (err) {
      setSettingsMessage(err.message);
    } finally {
      setSettingsSaving(false);
    }
  }

  // Logout
  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("organization");

    setUser(null);
    setPage("login");
    setActiveView("dashboard");
    setEmail("");
    setPassword("");
    setError("");
    setProducts([]);
  }

  // Dashboard screen
  if (user) {
    return (
      <main className="dashboard">
        <aside className="sidebar">
          <h2>
            Stock<span>Flow</span>
          </h2>

          <p className="side-label">WORKSPACE</p>

          <button
            className={`nav-item ${
              activeView === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveView("dashboard")}
          >
            ▦ Dashboard
          </button>

          <button
            className={`nav-item ${
              activeView === "products" ? "active" : ""
            }`}
            onClick={() => {
              setActiveView("products");
              setShowProductForm(false);
            }}
          >
            ▤ Products
          </button>

          <button
            className={`nav-item ${
              activeView === "settings" ? "active" : ""
            }`}
            onClick={() => setActiveView("settings")}
          >
            ⚙ Settings
          </button>

          <div className="sidebar-bottom">
            <p>{user}</p>
            <button className="logout-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </aside>

        <section className="dashboard-content">
          <header className="topbar">
            <div>
              <p className="eyebrow">
                {activeView === "dashboard"
                  ? "OVERVIEW"
                  : activeView === "products"
                  ? "INVENTORY"
                  : "WORKSPACE"}
              </p>

              <h1>
                {activeView === "dashboard"
                  ? "Inventory Dashboard"
                  : activeView === "products"
                  ? "Products"
                  : "Organization Settings"}
              </h1>
            </div>

            <span className="user-chip">{user}</span>
          </header>

          {/* Dashboard */}
          {activeView === "dashboard" && (
            <>
              <div className="welcome-card">
                <div>
                  <p className="eyebrow">STOCKFLOW WORKSPACE</p>
                  <h2>Welcome to your inventory.</h2>
                  <p>
                    Monitor your products, track stock levels, and manage
                    your inventory from one place.
                  </p>
                </div>

                <div className="welcome-icon">▦</div>
              </div>

              {dashboardError && (
                <div className="form-message">{dashboardError}</div>
              )}

              <div className="stats-grid">
                <article className="stat-card">
                  <p>Total Products</p>
                  <h2>
                    {dashboardLoading ? "..." : dashboard.total_products}
                  </h2>
                  <span>Products in your inventory</span>
                </article>

                <article className="stat-card">
                  <p>Total Stock Units</p>
                  <h2>
                    {dashboardLoading ? "..." : dashboard.total_stock}
                  </h2>
                  <span>Units currently available</span>
                </article>

                <article className="stat-card">
                  <p>Low Stock Items</p>
                  <h2>
                    {dashboardLoading
                      ? "..."
                      : dashboard.low_stock_products.length}
                  </h2>
                  <span>Items needing attention</span>
                </article>
              </div>

              <section className="panel">
                <h2>Low Stock Products</h2>

                {dashboardLoading ? (
                  <p>Loading inventory...</p>
                ) : dashboardError ? (
                  <p>Unable to retrieve low-stock products.</p>
                ) : dashboard.low_stock_products.length === 0 ? (
                  <p>
                    No low-stock products. Your inventory is looking good!
                  </p>
                ) : (
                  <div className="low-stock-list">
                    {dashboard.low_stock_products.map((product) => (
                      <div className="low-stock-item" key={product.id}>
                        <div>
                          <strong>{product.name}</strong>
                          <p>SKU: {product.sku}</p>
                        </div>

                        <div className="stock-warning">
                          <strong>{product.quantity} units</strong>
                          <span>
                            Threshold: {product.low_stock_threshold}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Products */}
          {activeView === "products" && (
            <section className="panel products-panel">
              <div className="products-heading">
                <div>
                  <h2>Product Inventory</h2>
                  <p>Manage and monitor your inventory products.</p>
                </div>

                <button
                  className="primary-btn add-product-btn"
                  onClick={openAddProduct}
                >
                  + Add Product
                </button>
              </div>

              <div className="product-toolbar">
                <form
                  className="product-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    loadProducts(searchTerm, lowStockOnly);
                  }}
                >
                  <input
                    type="search"
                    placeholder="Search by product name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <button type="submit" className="primary-btn">
                    Search
                  </button>
                </form>

                <label className="low-stock-filter">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLowStockOnly(checked);
                      loadProducts(searchTerm, checked);
                    }}
                  />
                  Low stock only
                </label>
              </div>

              {productsError && (
                <div className="form-message">{productsError}</div>
              )}

              {showProductForm && (
                <form
                  className="product-form"
                  onSubmit={handleProductSubmit}
                >
                  <h3>
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h3>

                  <div className="product-form-grid">
                    <label>
                      Product Name
                      <input
                        name="name"
                        value={productForm.name}
                        onChange={handleProductInput}
                        placeholder="Wireless Mouse"
                        required
                      />
                    </label>

                    <label>
                      SKU
                      <input
                        name="sku"
                        value={productForm.sku}
                        onChange={handleProductInput}
                        placeholder="STK-001"
                        required
                      />
                    </label>

                    <label>
                      Quantity
                      <input
                        type="number"
                        name="quantity"
                        min="0"
                        value={productForm.quantity}
                        onChange={handleProductInput}
                        required
                      />
                    </label>

                    <label>
                      Cost Price
                      <input
                        type="number"
                        name="cost_price"
                        min="0"
                        step="0.01"
                        value={productForm.cost_price}
                        onChange={handleProductInput}
                        placeholder="450.00"
                        required
                      />
                    </label>

                    <label>
                      Selling Price
                      <input
                        type="number"
                        name="selling_price"
                        min="0"
                        step="0.01"
                        value={productForm.selling_price}
                        onChange={handleProductInput}
                        placeholder="699.00"
                        required
                      />
                    </label>

                    <label>
                      Low Stock Threshold
                      <input
                        type="number"
                        name="low_stock_threshold"
                        min="0"
                        value={productForm.low_stock_threshold}
                        onChange={handleProductInput}
                        required
                      />
                    </label>
                  </div>

                  <label className="product-description">
                    Description
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleProductInput}
                      placeholder="Enter product description..."
                      rows="3"
                    />
                  </label>

                  <div className="product-form-actions">
                    <button
                      type="button"
                      className="logout-btn"
                      onClick={() => {
                        setShowProductForm(false);
                        setEditingProduct(null);
                        setProductForm(emptyProduct);
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={savingProduct}
                    >
                      {savingProduct
                        ? "Saving..."
                        : editingProduct
                        ? "Update Product"
                        : "Save Product"}
                    </button>
                  </div>
                </form>
              )}

              {productsLoading ? (
                <p>Loading products...</p>
              ) : products.length === 0 ? (
                <div className="empty-products">
                  <h3>No products found</h3>
                  <p>
                    Add your first product to start managing your inventory.
                  </p>
                  <button
                    className="primary-btn"
                    onClick={openAddProduct}
                  >
                    + Add Your First Product
                  </button>
                </div>
              ) : (
                <div className="products-table-wrapper">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Cost Price</th>
                        <th>Selling Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {products.map((product) => {
                        const isLowStock =
                          product.quantity <= product.low_stock_threshold;

                        return (
                          <tr key={product.id}>
                            <td>
                              <strong>{product.name}</strong>
                              {product.description && (
                                <small>{product.description}</small>
                              )}
                            </td>

                            <td>{product.sku}</td>
                            <td>{product.quantity}</td>
                            <td>₹{Number(product.cost_price).toFixed(2)}</td>
                            <td>
                              ₹{Number(product.selling_price).toFixed(2)}
                            </td>

                            <td>
                              <span
                                className={
                                  isLowStock
                                    ? "product-status low"
                                    : "product-status good"
                                }
                              >
                                {isLowStock ? "Low Stock" : "In Stock"}
                              </span>
                            </td>

                            <td>
                              <div className="product-actions">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(product)}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteProduct(product)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Settings */}
          {activeView === "settings" && (
            <section className="panel settings-panel">
              <h2>Inventory Settings</h2>
              <p>
                Set the default low-stock threshold for new products in your
                organization.
              </p>

              {settingsLoading ? (
                <p>Loading settings...</p>
              ) : (
                <form onSubmit={saveSettings}>
                  <label>
                    Default Low Stock Threshold
                    <input
                      type="number"
                      min="0"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      required
                    />
                  </label>

                  {settingsMessage && (
                    <p className="form-message">{settingsMessage}</p>
                  )}

                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? "Saving..." : "Save Settings"}
                  </button>
                </form>
              )}
            </section>
          )}
        </section>
      </main>
    );
  }

  // Login and registration screens
  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <div className="brand-logo">
          Stock<span>Flow</span>
        </div>

        <div className="brand-message">
          <p className="eyebrow">INVENTORY MANAGEMENT</p>

          <h1>
            Know your stock.
            <br />
            Stay in control.
          </h1>

          <p>
            A simple workspace to manage products, track inventory,
            and stay ahead of low stock.
          </p>
        </div>

        <p className="brand-footer">
          StockFlow · Inventory Management
        </p>
      </section>

      <section className="auth-section">
        <form className="auth-card" onSubmit={handleAuth}>
          <p className="eyebrow">
            {page === "login" ? "WELCOME BACK" : "GET STARTED"}
          </p>

          <h2>
            {page === "login"
              ? "Sign in to StockFlow"
              : "Create your workspace"}
          </h2>

          <p className="auth-description">
            {page === "login"
              ? "Enter your account details to continue."
              : "Set up your organization and account."}
          </p>

          {page === "register" && (
            <label>
              Organization name
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Your organization"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          {error && <p className="form-message">{error}</p>}

          <button className="primary-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : page === "login"
              ? "Sign in"
              : "Create account"}
          </button>

          <p className="switch-auth">
            {page === "login"
              ? "New to StockFlow?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setPage(page === "login" ? "register" : "login");
                setError("");
              }}
            >
              {page === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

export default App;
