import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ArrowRight, ChevronLeft, ChevronRight, Tag, Flame, Sparkles, Zap, Star, ShoppingCart, Search, TrendingUp } from "lucide-react";

/**
 * Enhanced Temu-style showcase integrated with ComercioYA Platform
 * Features:
 * - Real API integration for products, categories, flash sales
 * - Dynamic tenant branding and configuration
 * - Advanced animations and micro-interactions
 * - Mobile-first responsive design
 * - Real shopping cart integration
 * - Performance optimizations
 */

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

interface TenantConfig {
  primaryColor: string;
  secondaryColor: string;
  brandName: string;
  logo?: string;
}

interface TemuStyleShowcaseProps {
  onCTA?: () => void;
  tenantConfig?: TenantConfig;
}

/** UTILITIES */
function cn(...classes: any[]): string { 
  return classes.filter(Boolean).join(" "); 
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(price);
};

const calculateDiscount = (price: number, salePrice: number): number => {
  return Math.round(((price - salePrice) / price) * 100);
};

/** ENHANCED COUNTDOWN HOOK */
function useCountdown(target: number) {
  const [now, setNow] = useState<number>(() => Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  const delta = Math.max(0, target - now);
  const hh = Math.floor(delta / 3_600_000);
  const mm = Math.floor((delta % 3_600_000) / 60_000);
  const ss = Math.floor((delta % 60_000) / 1_000);
  const done = delta <= 0;
  
  return { hh, mm, ss, delta, done };
}

/** ENHANCED DATA FETCHING HOOKS */
function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?featured=true&limit=6');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to demo data
        setProducts([
          { id: '1', name: 'Heladera No Frost 430L Samsung', price: 849000, salePrice: 799000, images: ['/placeholder.jpg'], stock: 3, category: 'Cocina', featured: true, slug: 'heladera-samsung-430l' },
          { id: '2', name: 'Lavarropas Inverter 8kg LG', price: 520000, salePrice: 489000, images: ['/placeholder.jpg'], stock: 7, category: 'Lavado', featured: true, slug: 'lavarropas-lg-8kg' },
          { id: '3', name: 'Smart TV 55" 4K Sony', price: 890000, images: ['/placeholder.jpg'], stock: 12, category: 'TV', featured: true, slug: 'smart-tv-sony-55' },
          { id: '4', name: 'Aire Acondicionado Split 3500W', price: 610000, images: ['/placeholder.jpg'], stock: 5, category: 'Clima', featured: true, slug: 'aire-split-3500w' },
          { id: '5', name: 'Microondas Digital 25L', price: 145000, salePrice: 129000, images: ['/placeholder.jpg'], stock: 15, category: 'Cocina', featured: true, slug: 'microondas-25l' },
          { id: '6', name: 'Pava Eléctrica 1.7L Acero', price: 42000, images: ['/placeholder.jpg'], stock: 8, category: 'Pequeños', featured: true, slug: 'pava-electrica-17l' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
}

function useCategories() {
  const [categories, setCategories] = useState([
    { key: "cocina", label: "Cocina", icon: Sparkles, gradient: "from-rose-500 to-orange-500", count: 45 },
    { key: "lavado", label: "Lavado", icon: Zap, gradient: "from-emerald-500 to-teal-600", count: 23 },
    { key: "clima", label: "Clima", icon: Flame, gradient: "from-amber-400 to-red-500", count: 18 },
    { key: "tv", label: "TV & Audio", icon: Star, gradient: "from-sky-500 to-indigo-600", count: 67 },
    { key: "pequenos", label: "Pequeños", icon: Tag, gradient: "from-lime-500 to-emerald-600", count: 89 },
    { key: "accesorios", label: "Accesorios", icon: Tag, gradient: "from-gray-400 to-slate-600", count: 34 },
  ]);

  useEffect(() => {
    // Fetch real categories when API is ready
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          // Transform API data to match our format
          const mappedCategories = data.map((cat: any, index: number) => ({
            key: cat.slug || cat.name.toLowerCase(),
            label: cat.name,
            icon: [Sparkles, Zap, Flame, Star, Tag, TrendingUp][index % 6],
            gradient: [
              "from-rose-500 to-orange-500",
              "from-emerald-500 to-teal-600", 
              "from-amber-400 to-red-500",
              "from-sky-500 to-indigo-600",
              "from-lime-500 to-emerald-600",
              "from-gray-400 to-slate-600"
            ][index % 6],
            count: cat.productCount || 0
          }));
          setCategories(mappedCategories);
        }
      } catch (error) {
        console.warn('Using fallback categories:', error);
      }
    };

    fetchCategories();
  }, []);

  return categories;
}

/** ENHANCED COMPONENTS */
function PriceTag({ price, prev, size = "base" }: { price: number; prev?: number; size?: "sm" | "base" | "lg" }) {
  const sizeClasses = {
    sm: "text-sm",
    base: "text-xl", 
    lg: "text-2xl"
  };

  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("text-white font-extrabold", sizeClasses[size])}>
        {formatPrice(price)}
      </span>
      {prev && prev > price && (
        <>
          <span className={cn("text-slate-300/60 line-through", size === "sm" ? "text-xs" : "text-sm")}>
            {formatPrice(prev)}
          </span>
          <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
            -{calculateDiscount(prev, price)}%
          </span>
        </>
      )}
    </div>
  );
}

function HeroCarousel({ onCTA, tenantConfig }: { onCTA?: () => void; tenantConfig?: TenantConfig }) {
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Enhanced hero slides with more dynamic content
  const heroSlides = [
    {
      id: "slide-1",
      kind: "video" as const,
      title: "🔥 Ofertas Relámpago",
      subtitle: "Hasta 40% OFF + 18 cuotas sin interés",
      cta: "Ver ofertas",
      media: {
        src: "data:video/mp4;base64,",
        poster: heroPoster(1),
      },
      tone: `from-${tenantConfig?.primaryColor || 'amber-500'} via-orange-500 to-pink-500`,
    },
    {
      id: "slide-2", 
      kind: "image" as const,
      title: "❄️ Heladeras No Frost",
      subtitle: "Las mejores marcas con garantía extendida",
      cta: "Ver heladeras",
      media: { src: heroSVG(2), poster: undefined },
      tone: "from-emerald-500 via-sky-500 to-blue-600",
    },
    {
      id: "slide-3",
      kind: "image" as const, 
      title: "📺 Smart TVs 4K",
      subtitle: "Gaming + Streaming + Apps integradas",
      cta: "Ver TVs",
      media: { src: heroSVG(3), poster: undefined },
      tone: "from-fuchsia-500 via-purple-500 to-indigo-600",
    },
  ];

  const next = () => setIdx(i => (i + 1) % heroSlides.length);
  const prev = () => setIdx(i => (i - 1 + heroSlides.length) % heroSlides.length);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(next, 5000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
      <div className="relative aspect-[16/9] w-full">
        <AnimatePresence mode="wait">
          {heroSlides.map((s, i) => (
            i === idx && (
              <motion.div
                key={s.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.05, x: 300 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -300 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                {s.kind === "video" ? (
                  <video 
                    className="w-full h-full object-cover" 
                    playsInline 
                    autoPlay 
                    muted 
                    loop 
                    poster={s.media.poster}
                  >
                    {/* Replace src with real mp4 once available */}
                  </video>
                ) : (
                  <img 
                    className="w-full h-full object-cover" 
                    src={s.media.src} 
                    alt={s.title}
                    loading="lazy" 
                  />
                )}
                <div className={cn("absolute inset-0 bg-gradient-to-r", s.tone, "opacity-50")} />
                <div className="absolute inset-0 grid place-items-center px-5 sm:px-10">
                  <motion.div 
                    className="text-center max-w-4xl"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white/95 text-sm font-semibold mb-4">
                      <Flame className="w-4 h-4" /> 
                      Ofertas del día - Stock limitado
                    </div>
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-lg">
                      {s.title}
                    </h1>
                    <p className="mt-3 text-slate-200/95 text-lg sm:text-xl max-w-2xl mx-auto">
                      {s.subtitle}
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={onCTA} 
                        className="px-8 py-4 rounded-xl bg-white text-slate-900 font-extrabold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all inline-flex items-center gap-2 hover:bg-gray-100"
                      >
                        {s.cta} <ArrowRight className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={onCTA} 
                        className="px-8 py-4 rounded-xl bg-white/15 backdrop-blur border border-white/25 text-white font-semibold hover:bg-white/20 transition-all"
                      >
                        Ver catálogo completo
                      </button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
        
        {/* Enhanced Controls */}
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
          <button 
            aria-label="Anterior" 
            onClick={prev} 
            className="p-3 rounded-full bg-black/50 text-white border border-white/20 hover:bg-black/70 transition-all backdrop-blur"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {heroSlides.map((_, i) => (
              <button 
                key={i} 
                aria-label={`Ir a slide ${i + 1}`} 
                onClick={() => setIdx(i)} 
                className={cn(
                  "h-2 rounded-full transition-all duration-300", 
                  i === idx ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                )} 
              />
            ))}
          </div>
          <button 
            aria-label="Siguiente" 
            onClick={next} 
            className="p-3 rounded-full bg-black/50 text-white border border-white/20 hover:bg-black/70 transition-all backdrop-blur"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FlashSale({ deadline, onBuy, products }: { 
  deadline: number; 
  onBuy?: (product: Product) => void;
  products: Product[];
}) {
  const { hh, mm, ss, done } = useCountdown(deadline);
  const [progress, setProgress] = useState(85);

  // Simulate decreasing stock
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.max(15, prev - Math.random() * 2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const flashSaleProducts = products
    .filter(p => p.salePrice && p.salePrice < p.price)
    .slice(0, 3);

  if (flashSaleProducts.length === 0) {
    // Fallback flash sale products
    const fallbackProducts: Product[] = [
      { id: 'flash1', name: 'Heladera No Frost 430L', price: 899000, salePrice: 799000, images: ['/placeholder.jpg'], stock: 3, category: 'Cocina', featured: true, slug: 'flash-heladera' },
      { id: 'flash2', name: 'Lavarropas 8kg Inverter', price: 560000, salePrice: 489000, images: ['/placeholder.jpg'], stock: 2, category: 'Lavado', featured: true, slug: 'flash-lavarropas' },
      { id: 'flash3', name: 'Smart TV 50" 4K', price: 750000, salePrice: 649000, images: ['/placeholder.jpg'], stock: 1, category: 'TV', featured: true, slug: 'flash-tv' }
    ];
    flashSaleProducts.push(...fallbackProducts);
  }

  return (
    <div className="relative p-6 rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 text-white shadow-2xl overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
      <div className="absolute top-4 right-4">
        <div className="animate-pulse">🔥</div>
      </div>
      
      <div className="relative">
        <div className="flex items-center gap-2 font-extrabold text-xl mb-2">
          <Flame className="w-6 h-6 animate-bounce" /> 
          Flash Sale
        </div>
        <p className="text-white/95 mb-4">
          ⚡ Ofertas por tiempo limitado - ¡Los precios suben en:
        </p>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-white/20 backdrop-blur mb-6">
          <Timer className="w-5 h-5" />
          <span className="tabular-nums font-black text-lg">
            {done ? "00:00:00" : `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {flashSaleProducts.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl bg-white/15 backdrop-blur border border-white/25 p-4 hover:bg-white/20 transition-all group"
            >
              <div className="aspect-square rounded-lg bg-white/10 grid place-items-center mb-3 group-hover:scale-105 transition-transform">
                {product.images[0] && product.images[0] !== '/placeholder.jpg' ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Tag className="w-12 h-12" />
                )}
              </div>
              <div className="text-sm font-medium mb-2 line-clamp-2 h-10">
                {product.name}
              </div>
              <PriceTag price={product.salePrice!} prev={product.price} size="sm" />
              <button 
                onClick={() => onBuy?.(product)}
                className="w-full mt-3 px-3 py-2 rounded-lg bg-white text-slate-900 text-sm font-extrabold hover:bg-gray-100 active:scale-95 transition-all"
              >
                Comprar ahora
              </button>
              {product.stock <= 5 && (
                <div className="mt-2 text-xs text-center text-yellow-200">
                  ⚠️ Quedan solo {product.stock} unidades
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>🔥 Stock volando</span>
            <span>{Math.round(progress)}% vendido hoy</span>
          </div>
          <div className="h-3 rounded-full bg-white/20 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-yellow-400 to-red-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryGrid({ categories, tenantConfig }: { 
  categories: ReturnType<typeof useCategories>; 
  tenantConfig?: TenantConfig;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {categories.map(({ key, label, icon: Icon, gradient, count }) => (
        <motion.button 
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative isolate overflow-hidden rounded-2xl p-4 text-left shadow-lg border border-white/10 bg-slate-900/80 backdrop-blur hover:bg-slate-800/90 transition-all"
        >
          <div className={cn(
            "absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl opacity-30 bg-gradient-to-br transition-all group-hover:opacity-50", 
            gradient
          )} />
          <div className="relative">
            <div className={cn(
              "inline-flex p-3 rounded-xl text-white bg-gradient-to-br mb-3", 
              gradient
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="font-bold text-white tracking-tight text-sm">
              {label}
            </div>
            <div className="text-xs text-slate-300/80 mt-1">
              {count} productos
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function NewArrivals({ products, onAddToCart }: { 
  products: Product[]; 
  onAddToCart?: (product: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {products.map((product, i) => (
        <motion.div 
          key={product.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 backdrop-blur shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="relative aspect-square bg-gradient-to-br from-white/10 to-transparent">
            {product.images[0] && product.images[0] !== '/placeholder.jpg' ? (
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full grid place-items-center">
                <Tag className="w-12 h-12 text-white/70" />
              </div>
            )}
            
            {product.featured && (
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  HOT
                </span>
              </div>
            )}

            {product.salePrice && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  -{calculateDiscount(product.price, product.salePrice)}%
                </span>
              </div>
            )}

            {product.stock <= 5 && (
              <div className="absolute bottom-2 left-2">
                <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded">
                  Solo {product.stock}
                </span>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <h3 className="text-sm text-white/95 font-semibold line-clamp-2 min-h-[2.5rem] mb-2">
              {product.name}
            </h3>
            
            <div className="mb-3">
              <PriceTag 
                price={product.salePrice || product.price} 
                prev={product.salePrice ? product.price : undefined} 
                size="sm" 
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => onAddToCart?.(product)}
                disabled={product.stock === 0}
                className="flex-1 px-3 py-2 rounded-lg bg-white text-slate-900 text-xs font-extrabold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                {product.stock === 0 ? 'Sin stock' : 'Añadir'}
              </button>
              <button 
                onClick={() => window.location.href = `/producto/${product.slug}`}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs hover:bg-white/20 transition-all"
              >
                Ver
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Testimonials() {
  const testimonials = [
    { text: "Entrega súper rápida, llegó en 24hs", rating: 5, customer: "María González" },
    { text: "Excelente atención y seguimiento", rating: 5, customer: "Carlos Ruiz" },
    { text: "Productos de calidad, muy recomendable", rating: 5, customer: "Ana López" }
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {testimonials.map((testimonial, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl p-5 border border-white/10 bg-slate-900/80 backdrop-blur text-white/95 hover:bg-slate-800/90 transition-all"
        >
          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, j) => (
              <Star 
                key={j}
                className={cn(
                  "w-4 h-4",
                  j < testimonial.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                )}
              />
            ))}
          </div>
          <p className="text-sm mb-3 italic">
            "{testimonial.text}"
          </p>
          <p className="text-xs text-slate-300/80">
            — {testimonial.customer} • Cliente verificado
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// Helper functions for SVG placeholders
function heroPoster(seed: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#10b981'/><stop offset='100%' stop-color='#38bdf8'/></linearGradient></defs><rect width='1200' height='600' fill='url(#g)' opacity='0.9'/><text x='50' y='100' font-size='56' fill='white' font-family='sans-serif'>Hero ${seed}</text></svg>`)}`;
}

function heroSVG(seed: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#f59e0b'/><stop offset='100%' stop-color='#ec4899'/></linearGradient></defs><rect width='1200' height='600' fill='url(#g)' opacity='0.9'/><g fill='rgba(255,255,255,0.6)'><rect x='60' y='260' rx='18' width='260' height='240'/><rect x='350' y='200' rx='18' width='260' height='300'/><rect x='640' y='140' rx='18' width='260' height='360'/><rect x='930' y='260' rx='18' width='220' height='220'/></g></svg>`)}`;
}

/** MAIN COMPONENT */
export default function TemuStyleShowcase({ onCTA, tenantConfig }: TemuStyleShowcaseProps) {
  const { products, loading } = useProducts();
  const categories = useCategories();
  const [cart, setCart] = useState<Product[]>([]);
  
  const deadline = useMemo(() => Date.now() + 1000 * 60 * 60 * 6, []); // 6 hours

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, stock: item.stock - 1 } 
            : item
        );
      }
      return [...prev, { ...product, stock: product.stock - 1 }];
    });
    
    // Visual feedback
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-bounce';
    toast.textContent = `${product.name} agregado al carrito`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const defaultTenantConfig: TenantConfig = {
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    brandName: 'ComercioYA'
  };

  const config = { ...defaultTenantConfig, ...tenantConfig };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0f172a,_#030712)] text-slate-200">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="inline-grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white font-bold"
              >
                {config.brandName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="font-black tracking-tight text-white">
                  {config.brandName}
                </h1>
                <p className="text-xs text-slate-400">Electrodomésticos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-all hidden sm:inline-flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </button>
              <button 
                onClick={onCTA}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-gray-100 transition-all inline-flex items-center gap-2"
              >
                Ver catálogo
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        {/* Hero Section */}
        <section className="pt-8">
          <HeroCarousel onCTA={onCTA} tenantConfig={config} />
        </section>

        {/* Flash Sale + Categories */}
        <section className="mt-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <FlashSale 
            deadline={deadline} 
            onBuy={addToCart}
            products={products}
          />
          <div className="rounded-3xl p-6 border border-white/10 bg-slate-900/80 backdrop-blur">
            <div className="flex items-center gap-2 font-extrabold text-white text-xl mb-2">
              <Sparkles className="w-6 h-6" /> 
              Categorías
            </div>
            <p className="text-slate-300/90 mb-4">Explorar por rubros</p>
            <CategoryGrid categories={categories} tenantConfig={config} />
          </div>
        </section>

        {/* New Arrivals */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-2xl font-black tracking-tight">
              🆕 Recién llegados
            </h2>
            <button 
              onClick={onCTA}
              className="text-sky-300 hover:text-sky-200 transition-colors inline-flex items-center gap-1 font-semibold"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-900/60 p-4 animate-pulse">
                  <div className="aspect-square bg-slate-700 rounded-lg mb-3" />
                  <div className="h-4 bg-slate-700 rounded mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <NewArrivals products={products} onAddToCart={addToCart} />
          )}
        </section>

        {/* Testimonials */}
        <section className="mt-8">
          <h2 className="text-white text-2xl font-black tracking-tight mb-6">
            💬 Lo que dicen nuestros clientes
          </h2>
          <Testimonials />
        </section>

        {/* Final CTA */}
        <section className="mt-12">
          <div className="rounded-3xl p-8 border border-white/10 bg-gradient-to-br from-sky-500/15 via-emerald-500/15 to-fuchsia-500/15 backdrop-blur">
            <div className="grid md:grid-cols-[1.5fr_0.5fr] items-center gap-6">
              <div>
                <h3 className="text-white text-3xl md:text-4xl font-black mb-3">
                  🚀 ¿Listo para vender como los grandes?
                </h3>
                <p className="text-slate-300 text-lg mb-6 max-w-2xl">
                  Diseño a medida, <strong>0% comisiones</strong>, WhatsApp y Mercado Pago integrados. 
                  Esta es una <strong>DEMO</strong> — el sitio final se personaliza 100% para tu negocio.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={onCTA}
                    className="px-8 py-4 rounded-xl bg-white text-slate-900 font-extrabold text-lg hover:bg-gray-100 active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    Pedir mi demo gratis <ArrowRight className="w-5 h-5" />
                  </button>
                  <a 
                    href="#features" 
                    className="px-8 py-4 rounded-xl border border-white/25 text-white font-semibold hover:bg-white/10 transition-all inline-flex items-center justify-center"
                  >
                    Cómo funciona
                  </a>
                </div>
              </div>
              <div className="aspect-video rounded-2xl bg-white/5 border border-white/15 grid place-items-center text-white/70 text-center p-4">
                <div>
                  <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-white/10 grid place-items-center">
                    📺
                  </div>
                  <p className="text-sm">Video demo próximamente</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Cart */}
      {cart.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-xl text-white flex items-center gap-3 transition-all hover:scale-105 z-50"
          style={{ backgroundColor: config.primaryColor }}
          onClick={() => window.location.href = '/carrito'}
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold">{cart.length}</span>
        </motion.button>
      )}

      <footer className="py-8 border-t border-white/10 text-center text-slate-400">
        <p>
          © {new Date().getFullYear()} {config.brandName} · 
          <span className="text-slate-200 font-semibold"> ComercioYA Platform</span> · 
          <span className="text-yellow-400">DEMO</span>
        </p>
      </footer>
    </div>
  );
}