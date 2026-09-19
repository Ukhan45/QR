import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Printer, UtensilsCrossed, QrCode, ShoppingCart, X, Plus, Minus, CreditCard, Banknote, Edit, Trash2, Settings, Store } from 'lucide-react'
import { mockMenu as initialMockMenu } from './data/mockMenu'

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRest = urlParams.get('rest');

  const [activeTab, setActiveTab] = useState(initialRest ? 'menu' : 'restaurants')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [cart, setCart] = useState({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  
  const [restaurants, setRestaurants] = useState(() => {
    const saved = localStorage.getItem('qrRestaurants')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        // ignore
      }
    }
    // Migration from old single menu
    const savedSingle = localStorage.getItem('qrMenuData')
    if (savedSingle) {
      try {
        return [{ id: 'r1', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400', ...JSON.parse(savedSingle) }]
      } catch (e) {
        // ignore
      }
    }
    return [{ id: 'r1', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400', ...initialMockMenu }]
  })

  const [activeRestaurantId, setActiveRestaurantId] = useState(initialRest || restaurants[0]?.id)
  const menuData = restaurants.find(r => r.id === activeRestaurantId) || restaurants[0]

  useEffect(() => {
    localStorage.setItem('qrRestaurants', JSON.stringify(restaurants))
  }, [restaurants])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const qrUrl = new URL(window.location.href);
  if (menuData?.id) {
    qrUrl.searchParams.set('rest', menuData.id);
  }
  const menuUrl = qrUrl.toString();

  // Cart operations
  const updateCart = (item, delta) => {
    setCart(prev => {
      const currentQty = prev[item.id]?.quantity || 0
      const newQty = currentQty + delta
      
      if (newQty <= 0) {
        const newCart = { ...prev }
        delete newCart[item.id]
        return newCart
      }
      
      return {
        ...prev,
        [item.id]: { item, quantity: newQty }
      }
    })
  }

  // Admin operations
  const handleSelectRestaurant = (id) => {
    setActiveRestaurantId(id)
    setCart({})
    setActiveTab('menu')
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('rest', id);
    window.history.pushState({}, '', newUrl);
  }

  const handleAddRestaurant = (e) => {
    e.preventDefault()
    const form = e.target
    const newRest = {
      id: 'rest_' + Date.now(),
      restaurantName: form.name.value,
      description: form.description.value,
      image: form.image.value || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400',
      categories: []
    }
    setRestaurants(prev => [...prev, newRest])
    form.reset()
  }

  const handleAddCategory = (e) => {
    e.preventDefault()
    const form = e.target
    const newCategory = {
      id: 'cat_' + Date.now(),
      name: form.categoryName.value,
      items: []
    }
    setRestaurants(prevRests => prevRests.map(rest => {
      if (rest.id !== activeRestaurantId) return rest;
      return { ...rest, categories: [...rest.categories, newCategory] }
    }))
    form.reset()
  }

  // Admin operations
  const handleDeleteItem = (categoryId, itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    setRestaurants(prevRests => prevRests.map(rest => {
      if (rest.id !== activeRestaurantId) return rest;
      const newCategories = rest.categories.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, items: cat.items.filter(i => i.id !== itemId) }
        }
        return cat
      })
      return { ...rest, categories: newCategories }
    }))
  }

  const handleAddItem = (categoryId, e) => {
    e.preventDefault()
    const form = e.target
    const newItem = {
      id: 'item_' + Date.now(),
      name: form.name.value,
      description: form.description.value,
      price: parseFloat(form.price.value),
      image: form.image.value || null
    }

    setRestaurants(prevRests => prevRests.map(rest => {
      if (rest.id !== activeRestaurantId) return rest;
      const newCategories = rest.categories.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, items: [...cat.items, newItem] }
        }
        return cat
      })
      return { ...rest, categories: newCategories }
    }))
    
    form.reset()
  }

  // Calculations
  const cartItems = Object.values(cart)
  const totalItems = cartItems.reduce((sum, { quantity }) => sum + quantity, 0)
  const subtotal = cartItems.reduce((sum, { item, quantity }) => sum + (item.price * quantity), 0)
  const taxRate = paymentMethod === 'cash' ? 0.16 : 0.05
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  return (
    <>
      {isOffline && (
        <div className="offline-banner">
          <WifiOff size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
          You are currently offline. Viewing cached menu.
        </div>
      )}
      
      <div className="container" style={{ paddingBottom: '6rem' }}>
        <div className="nav-tabs" style={{ marginTop: '1rem' }}>
          <button 
            className={`nav-tab ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            <Store size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Restaurants
          </button>
          <button 
            className={`nav-tab ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <UtensilsCrossed size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Menu
          </button>
          <button 
            className={`nav-tab ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <QrCode size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            QR
          </button>
          <button 
            className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Settings size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Admin
          </button>
        </div>

        {/* --- RESTAURANTS VIEW --- */}
        {activeTab === 'restaurants' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <header className="header">
              <h1 className="restaurant-title">All Restaurants</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Select a restaurant to view its menu.</p>
            </header>

            <main className="restaurants-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
              {restaurants.map(rest => (
                <div key={rest.id} className="restaurant-card glass-card" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => handleSelectRestaurant(rest.id)}>
                  <img src={rest.image} alt={rest.restaurantName} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{rest.restaurantName}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{rest.description}</p>
                  </div>
                </div>
              ))}
            </main>

            <div className="admin-section" style={{ marginTop: '3rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Add New Restaurant</h2>
              <form onSubmit={handleAddRestaurant}>
                <div className="form-group">
                  <label>Restaurant Name</label>
                  <input type="text" name="name" className="form-control" required placeholder="e.g. Burger Joint" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" name="description" className="form-control" required placeholder="A brief description..." />
                </div>
                <div className="form-group">
                  <label>Image URL (Optional)</label>
                  <input type="url" name="image" className="form-control" placeholder="https://..." />
                </div>
                <button type="submit" className="btn" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  <Plus size={18} /> Add Restaurant
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* --- MENU VIEW --- */}
        {activeTab === 'menu' && menuData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <header className="header">
              <h1 className="restaurant-title">{menuData.restaurantName}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>{menuData.description}</p>
            </header>

            <main>
              {menuData.categories.map((category, index) => (
                <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}>
                  <h2 className="category-title">{category.name}</h2>
                  <div className="menu-items">
                    {category.items.map(item => {
                      const qty = cart[item.id]?.quantity || 0;
                      return (
                        <div key={item.id} className="menu-item glass-card">
                          <div className="item-content">
                            <div className="item-header">
                              <h3 className="item-title">{item.name}</h3>
                              <span className="item-price">Rs. {item.price.toFixed(2)}</span>
                            </div>
                            <p className="item-description">{item.description}</p>
                            
                            <div className="item-controls">
                              {qty > 0 ? (
                                <>
                                  <button className="qty-btn" onClick={() => updateCart(item, -1)}><Minus size={14} /></button>
                                  <span className="item-qty">{qty}</span>
                                  <button className="qty-btn" onClick={() => updateCart(item, 1)}><Plus size={14} /></button>
                                </>
                              ) : (
                                <button className="qty-btn" onClick={() => updateCart(item, 1)} style={{ width: 'auto', padding: '0 12px', marginTop: '4px' }}>
                                  <Plus size={14} style={{ marginRight: '4px' }}/> Add
                                </button>
                              )}
                            </div>
                          </div>
                          {item.image && <img src={item.image} alt={item.name} className="item-image" loading="lazy" />}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </main>
          </motion.div>
        )}

        {/* --- QR GENERATOR VIEW --- */}
        {activeTab === 'qr' && menuData && (
          <motion.div className="qr-container" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <h2>Print QR Frame</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Place this on your tables for instant access.</p>
            
            <div className="qr-frame">
              <div className="qr-instruction">SCAN FOR MENU</div>
              <QRCodeSVG value={menuUrl} size={256} level="H" includeMargin={true} fgColor="#18181b" />
              <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{menuData.restaurantName}</div>
            </div>

            <button className="btn" onClick={() => window.print()}>
              <Printer size={18} /> Print QR Frame
            </button>
          </motion.div>
        )}

        {/* --- ADMIN DASHBOARD VIEW --- */}
        {activeTab === 'admin' && menuData && (
          <motion.div className="admin-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="admin-section">
              <h2>Restaurant Details</h2>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Restaurant Name</label>
                <input type="text" className="form-control" value={menuData.restaurantName} onChange={e => setRestaurants(prev => prev.map(r => r.id === activeRestaurantId ? {...r, restaurantName: e.target.value} : r))} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" value={menuData.description} onChange={e => setRestaurants(prev => prev.map(r => r.id === activeRestaurantId ? {...r, description: e.target.value} : r))} />
              </div>
            </div>

            <div className="admin-section" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Add Menu Category</h3>
              <form onSubmit={handleAddCategory}>
                <div className="form-group">
                  <label>Category Name</label>
                  <input type="text" name="categoryName" className="form-control" required placeholder="e.g. Beverages" />
                </div>
                <button type="submit" className="btn" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  <Plus size={18} /> Add Category
                </button>
              </form>
            </div>

            {menuData.categories.map((category) => (
              <div key={category.id} className="admin-section">
                <div className="admin-header">
                  <h3>{category.name}</h3>
                </div>
                
                <div className="admin-item-list">
                  {category.items.map(item => (
                    <div key={item.id} className="admin-item">
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Rs. {item.price}</div>
                      </div>
                      <div className="admin-item-actions">
                        <button className="icon-btn danger" onClick={() => handleDeleteItem(category.id, item.id)} title="Delete Item">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Add New Item</h4>
                  <form onSubmit={(e) => handleAddItem(category.id, e)}>
                    <div className="form-group">
                      <label>Item Name</label>
                      <input type="text" name="name" className="form-control" required placeholder="e.g. Extra Mayo" />
                    </div>
                    <div className="form-group">
                      <label>Price (Rs.)</label>
                      <input type="number" name="price" className="form-control" required placeholder="e.g. 150" />
                    </div>
                    <div className="form-group">
                      <label>Description (Optional)</label>
                      <input type="text" name="description" className="form-control" placeholder="A brief description..." />
                    </div>
                    <div className="form-group">
                      <label>Image URL (Optional)</label>
                      <input type="url" name="image" className="form-control" placeholder="https://..." />
                    </div>
                    <button type="submit" className="btn" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                      <Plus size={18} /> Add Item to {category.name}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Sticky Cart Button */}
      <AnimatePresence>
        {totalItems > 0 && activeTab === 'menu' && !isCartOpen && (
          <motion.div className="fab-container" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}>
            <button className="fab-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={20} /> View Bill <span className="fab-badge">{totalItems}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="modal-overlay" onClick={(e) => { if(e.target.className === 'modal-overlay') setIsCartOpen(false) }}>
            <motion.div className="modal-content" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
              <button className="modal-close" onClick={() => setIsCartOpen(false)}><X size={24} /></button>
              
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Your Bill</h2>
              
              <div className="cart-items">
                {cartItems.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '2rem 0' }}>Your cart is empty.</p>
                ) : (
                  cartItems.map(({ item, quantity }) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-title">{item.name}</div>
                        <div className="cart-item-price">Rs. {item.price.toFixed(2)}</div>
                      </div>
                      <div className="item-controls" style={{ marginTop: 0 }}>
                        <button className="qty-btn" onClick={() => updateCart(item, -1)}><Minus size={14} /></button>
                        <span className="item-qty">{quantity}</span>
                        <button className="qty-btn" onClick={() => updateCart(item, 1)}><Plus size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <>
                  <div className="payment-toggle">
                    <button className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}>
                      <Banknote size={18} /> Cash
                    </button>
                    <button className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>
                      <CreditCard size={18} /> Card
                    </button>
                  </div>

                  <div className="bill-summary">
                    <div className="bill-row"><span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
                    <div className="bill-row"><span>Tax ({paymentMethod === 'cash' ? '16%' : '5%'})</span><span>Rs. {taxAmount.toFixed(2)}</span></div>
                    <div className="bill-row total"><span>Total</span><span>Rs. {total.toFixed(2)}</span></div>
                  </div>
                  
                  <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', padding: '1rem' }} onClick={() => alert('Order placed!')}>
                    Place Order - Rs. {total.toFixed(2)}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
