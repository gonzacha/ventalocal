// apps/ecommerce/components/ProductCatalog.tsx
import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Filter, Star, TrendingUp, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: string[];
  stock: number;
  category: string;
  featured: boolean;
}

export function ProductCatalog({ tenantConfig }: { tenantConfig: any }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from API
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products
  useEffect(() => {
    let filtered = products;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.map((c: any) => c.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    // Animate cart button
    const cartButton = document.getElementById('cart-button');
    cartButton?.classList.add('animate-bounce');
    setTimeout(() => cartButton?.classList.remove('animate-bounce'), 600);
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Show toast notification
    showToast(`${product.name} agregado al carrito`);
  };

  const showToast = (message: string) => {
    // Implementation of toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const calculateDiscount = (price: number, salePrice: number) => {
    return Math.round(((price - salePrice) / price) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  style={{ borderColor: tenantConfig?.primaryColor + '30' }}
                />
              </div>
            </div>
            
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: selectedCategory === 'all' ? tenantConfig?.primaryColor : undefined
                }}
              >
                Todos
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedCategory === category ? tenantConfig?.primaryColor : undefined
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-4 text-sm text-gray-500">
            {filteredProducts.length} productos encontrados
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-24 h-24 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No encontramos productos
            </h3>
            <p className="text-gray-500">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <article
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {product.featured && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        DESTACADO
                      </span>
                    </div>
                  )}
                  
                  {product.salePrice && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
                        -{calculateDiscount(product.price, product.salePrice)}%
                      </span>
                    </div>
                  )}
                  
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded">
                        Últimas {product.stock} unidades
                      </span>
                    </div>
                  )}
                  
                  <img
                    src={product.images[0] || '/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  
                  {/* Quick add to cart overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold transform -translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-105"
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 min-h-[3rem]">
                    {product.name}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">(4.5)</span>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-4">
                    {product.salePrice ? (
                      <>
                        <span className="text-2xl font-bold" style={{ color: tenantConfig?.primaryColor }}>
                          {formatPrice(product.salePrice)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-800">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: product.stock === 0 ? '#e5e7eb' : tenantConfig?.primaryColor,
                        color: product.stock === 0 ? '#6b7280' : 'white'
                      }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {product.stock === 0 ? 'Sin stock' : 'Agregar'}
                    </button>
                    <button
                      onClick={() => window.location.href = `/producto/${product.slug}`}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <button
        id="cart-button"
        onClick={() => window.location.href = '/carrito'}
        className="fixed bottom-6 right-6 p-4 rounded-full shadow-xl text-white flex items-center gap-3 transition-all hover:scale-105 z-50"
        style={{ backgroundColor: tenantConfig?.primaryColor }}
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.length > 0 && (
          <>
            <span className="font-bold">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
            <span className="text-sm">
              {formatPrice(cart.reduce((acc, item) => acc + (item.salePrice || item.price) * item.quantity, 0))}
            </span>
          </>
        )}
      </button>
    </div>
  );
}

export default ProductCatalog;
