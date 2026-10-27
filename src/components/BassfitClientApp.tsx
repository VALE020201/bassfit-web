"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  TRAINING_PROGRAMS,
  BASSFIT_PRODUCTS,
  EVERGREEN_ARTICLES,
  PRODUCT_CATEGORIES,
  BassfitProduct,
  EvergreenArticle,
  TrainingProgram,
  ProductCategorySlug,
  buildWhatsAppAdvisorUrl,
  buildWhatsAppCoachUrl,
} from "@/lib/bassfit-data";

interface CartItem {
  product: BassfitProduct;
  quantity: number;
}

export default function BassfitClientApp() {
  const [activeTab, setActiveTab] = useState<"inicio" | "tienda" | "entrenamientos" | "comunidad">("inicio");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BassfitProduct | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<EvergreenArticle | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProduct(null);
        setSelectedArticle(null);
        setIsCartOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const resolveImg = (src: string) => {
    if (!src) return "";
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    return src.startsWith("/") ? src.slice(1) : src;
  };

  const buildWhatsAppProductUrl = (product: BassfitProduct) => {
    const text = `Hola Bassfit 👋, deseo consultar y comprar: *${product.name}* (S/ ${product.price}). ¿Tienen disponibilidad inmediata y envíos?`;
    return `https://wa.me/51967581481?text=${encodeURIComponent(text)}`;
  };

  const handleAddToCart = (product: BassfitProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setToastMessage(`✓ ${product.name} agregado al carrito`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  }, [cart]);

  const handleWhatsAppCartOrder = () => {
    if (cart.length === 0) return;
    let message = "Hola Bassfit 👋, deseo realizar un pedido con los siguientes productos del catálogo oficial:\n\n";
    cart.forEach((item, idx) => {
      message += `${idx + 1}. *${item.product.name}* (x${item.quantity}) - S/ ${(item.product.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\n*TOTAL DEL PEDIDO: S/ ${cartSubtotal.toFixed(2)}*\n\n`;
    message += "¿Tienen disponibilidad inmediata para envío a mi dirección?";
    const url = "https://wa.me/51967581481?text=" + encodeURIComponent(message);
    window.open(url, "_blank");
  };

  const filteredProducts = useMemo(() => {
    return BASSFIT_PRODUCTS.filter((prod) => {
      const matchesCat =
        selectedCategory === "todos" || prod.categorySlug === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm font-bold border border-slate-700 animate-bounce">
          <span className="text-[#FF4A00]">●</span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setIsCartOpen(true)}
            className="ml-3 bg-[#FF4A00] text-white text-xs px-3 py-1 rounded-lg hover:bg-[#e04100] transition cursor-pointer"
          >
            Ver Carrito ({cartCount})
          </button>
        </div>
      )}

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#0F172A] text-slate-200 text-xs py-2 px-4 text-center font-medium border-b border-slate-800">
        <span className="text-[#FF4A00] font-black mr-2">BASSFIT PERÚ</span>
        <span>Fitness y Rendimiento sin Límites de Edad · Envíos garantizados a todo el Perú · Atención WhatsApp:</span>
        <a href="https://wa.me/51967581481" target="_blank" rel="noopener noreferrer" className="ml-1 text-white font-bold hover:underline">
          +51 967 581 481
        </a>
      </div>

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 md:h-24 flex items-center justify-between">
          {/* Logo Oficial de Bassfit Perú */}
          <button
            onClick={() => { setActiveTab("inicio"); setSelectedCategory("todos"); }}
            className="flex items-center text-left group focus:outline-none cursor-pointer"
            title="Bassfit Perú - Inicio"
          >
            <img
              src="/images/brand/logo_bassfit_peru.png"
              alt="Bassfit Perú - Fitness sin límites de edad"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain transition duration-200 group-hover:scale-105"
            />
          </button>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {[
              { id: "inicio", label: "Inicio" },
              { id: "tienda", label: "Tienda (24 Productos)" },
              { id: "entrenamientos", label: "Planes de Entrenamiento" },
              { id: "comunidad", label: "Guías & Artículos" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "text-slate-600 hover:text-black hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Header Controls: Clean Shopping Cart */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-[#FF4A00] text-white px-4 py-2.5 rounded-full text-xs font-extrabold transition shadow-sm cursor-pointer"
              title="Ver carrito de compras"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Carrito</span>
              <span className="bg-[#FF4A00] text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar */}
        <div className="md:hidden flex overflow-x-auto py-2.5 px-4 bg-slate-50 border-t border-slate-200 gap-2">
          {[
            { id: "inicio", label: "Inicio" },
            { id: "tienda", label: "Tienda (24)" },
            { id: "entrenamientos", label: "Planes" },
            { id: "comunidad", label: "Guías" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#0F172A] text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: INICIO */}
        {activeTab === "inicio" && (
          <div className="space-y-12">
            {/* Hero Banner */}
            <div className="bg-[#0F172A] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-5">
                <span className="bg-[#FF4A00] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest inline-block">
                  Catálogo Oficial Bassfit Perú
                </span>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Equipamiento deportivo premium sin límites de edad.
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Implementos de alta resistencia para Yoga, Pilates, Fuerza, Calistenia, Boxeo y Natación. Todos los productos aislados con stock inmediato y envíos a todo el Perú.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab("tienda")}
                    className="bg-[#FF4A00] hover:bg-[#e04100] text-white font-extrabold px-6 py-3.5 rounded-xl text-sm transition shadow-lg cursor-pointer"
                  >
                    Explorar Tienda (24 Productos) →
                  </button>
                  <a
                    href="https://wa.me/51967581481?text=Hola%20Bassfit%20%F0%9F%91%8B%2C%20deseo%20informaci%C3%B3n%20sobre%20sus%20productos%20y%20entrenamientos."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-5 py-3.5 rounded-xl text-sm transition flex items-center space-x-2"
                  >
                    <span>Atención WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Disciplinas / Categorías Destacadas */}
            <div>
              <div className="flex justify-between items-baseline mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Categorías Oficiales</h2>
                  <p className="text-xs text-slate-500">Los 18 implementos distribuidos por disciplina deportiva</p>
                </div>
                <button
                  onClick={() => { setActiveTab("tienda"); setSelectedCategory("todos"); }}
                  className="text-xs font-bold text-[#FF4A00] hover:underline cursor-pointer"
                >
                  Ver todos los 24 productos →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {PRODUCT_CATEGORIES.filter((c) => c.slug !== "todos").map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setActiveTab("tienda");
                    }}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#FF4A00] text-center hover:shadow-md transition group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF4A00] group-hover:bg-[#FF4A00] group-hover:text-white flex items-center justify-center mx-auto mb-2.5 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 group-hover:text-[#FF4A00] transition">
                      {cat.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Productos Destacados Preview */}
            <div>
              <div className="flex justify-between items-baseline mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Productos Más Solicitados</h2>
                  <p className="text-xs text-slate-500">Calidad garantizada para atletas de alto rendimiento</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {BASSFIT_PRODUCTS.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col justify-between group"
                  >
                    <div
                      onClick={() => { setActiveImgIdx(0); setSelectedProduct(product); }}
                      className="cursor-pointer p-4 bg-white flex items-center justify-center h-48 relative overflow-hidden"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="max-h-40 w-full object-contain group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {product.categoryLabel}
                      </span>
                    </div>
                    <div className="p-4 border-t border-slate-100 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          onClick={() => { setActiveImgIdx(0); setSelectedProduct(product); }}
                          className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-[#FF4A00] cursor-pointer transition"
                        >
                          {product.name}
                        </h3>
                        <div className="flex items-baseline space-x-2 mt-1">
                          <span className="text-lg font-black text-[#FF4A00]">
                            S/ {product.price.toFixed(2)}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              S/ {product.compareAtPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => { setActiveImgIdx(0); setSelectedProduct(product); }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center"
                        >
                          Detalles
                        </button>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-full bg-[#FF4A00] hover:bg-[#e04100] text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center"
                        >
                          + Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIENDA (CATÁLOGO OFICIAL 18 PRODUCTOS) */}
        {activeTab === "tienda" && (
          <div className="space-y-8">
            {/* Store Header & Category Filters */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  Tienda Oficial Bassfit ({BASSFIT_PRODUCTS.length} Productos)
                </h1>
                <p className="text-xs text-slate-500">
                  Implementos deportivos sobre fondo blanco puro (#FFFFFF), organizados por categorías.
                </p>
              </div>

              {/* Search Bar & Categories Horizontal Scroll */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Categories Pills */}
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        selectedCategory === cat.slug
                          ? "bg-[#FF4A00] text-white shadow-sm"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[260px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium focus:outline-none focus:border-[#FF4A00] transition"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
                <div className="text-3xl">🔍</div>
                <h3 className="text-base font-bold text-slate-800">No se encontraron productos</h3>
                <p className="text-xs text-slate-500">Prueba ajustando el término de búsqueda o la categoría seleccionada.</p>
                <button
                  onClick={() => { setSelectedCategory("todos"); setSearchQuery(""); }}
                  className="bg-[#0F172A] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#FF4A00] transition cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group"
                  >
                    {/* Image Area */}
                    <div
                      onClick={() => { setActiveImgIdx(0); setSelectedProduct(product); }}
                      className="cursor-pointer p-4 bg-white flex items-center justify-center h-52 relative overflow-hidden"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="max-h-44 w-full object-contain group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {product.categoryLabel}
                      </span>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 border-t border-slate-100 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          onClick={() => { setActiveImgIdx(0); setSelectedProduct(product); }}
                          className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-[#FF4A00] cursor-pointer transition leading-snug"
                        >
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {product.shortDescription}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-baseline space-x-2 mb-3">
                          <span className="text-xl font-black text-[#FF4A00]">
                            S/ {product.price.toFixed(2)}
                          </span>
                          {product.compareAtPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              S/ {product.compareAtPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => { setActiveImgIdx(0); setSelectedProduct(product); }}
                              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center"
                            >
                              Ver Ficha
                            </button>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="w-full bg-[#FF4A00] hover:bg-[#e04100] text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center flex items-center justify-center space-x-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Añadir</span>
                            </button>
                          </div>
                          <a
                            href={buildWhatsAppProductUrl(product)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 text-center cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.196.052.268-.031.072-.082.309-.36.392-.484.082-.124.165-.103.278-.062.113.041.721.34.845.402.124.062.206.093.237.144.031.052.031.3-.113.705z" />
                            </svg>
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLANES DE ENTRENAMIENTO */}
        {activeTab === "entrenamientos" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Programas de Entrenamiento Bassfit</h1>
              <p className="text-sm text-slate-500">Planes personalizados y estructurados según tus objetivos y equipamiento disponible.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {TRAINING_PROGRAMS.map((prog) => (
                <div key={prog.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold bg-orange-100 text-[#FF4A00] px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                      {prog.badge}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 leading-snug">{prog.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{prog.subtitle}</p>
                    <div className="border-t border-b border-slate-100 py-3 my-2 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Modalidad:</span> <span className="font-bold text-slate-700">{prog.modality}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Duración:</span> <span className="font-bold text-slate-700">{prog.duration}</span></div>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-slate-400">Inversión:</span>
                        <span className="text-2xl font-black text-[#FF4A00]">S/ {prog.priceMonthly} <span className="text-xs text-slate-400 font-normal">/mes</span></span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {prog.includes.map((inc, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-[#FF4A00] mr-2 font-bold">✓</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-6">
                    <a
                      href={`https://wa.me/51967581481?text=${encodeURIComponent(`Hola Coach Bassfit 💪, deseo inscribirme en el programa: *${prog.title}* (S/ ${prog.priceMonthly} mensual). ¿Cómo coordinamos mi evaluación inicial?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#0F172A] hover:bg-[#FF4A00] text-white font-extrabold py-3.5 rounded-xl text-xs text-center block transition cursor-pointer"
                    >
                      Inscribirme por WhatsApp →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: COMUNIDAD & GUÍAS */}
        {activeTab === "comunidad" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Guías Técnicas y Longevidad Activa</h1>
              <p className="text-sm text-slate-500">Artículos respaldados por ciencia del deporte para entrenar con técnica y sin lesiones.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {EVERGREEN_ARTICLES.map((art) => (
                <div key={art.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-[#FF4A00] uppercase tracking-wider">{art.pillarCategory} · {art.readingTime}</span>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">{art.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{art.seoExcerpt}</p>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => setSelectedArticle(art)}
                      className="text-xs font-bold text-[#0F172A] hover:text-[#FF4A00] transition cursor-pointer"
                    >
                      Leer artículo completo →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] text-slate-400 text-xs py-12 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <img
                src="/images/brand/logo_bassfit_peru_dark.png"
                alt="Bassfit Perú"
                className="h-14 md:h-16 w-auto object-contain mb-1"
              />
              <p className="text-slate-400 max-w-sm leading-relaxed">
                Comunidad y equipamiento deportivo de alta exigencia para atletas de todas las edades. Fitness inteligente, funcional y sin límites de edad.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Disciplinas</h4>
              <ul className="space-y-2">
                <li><button onClick={() => { setSelectedCategory("yoga-pilates"); setActiveTab("tienda"); }} className="hover:text-white cursor-pointer">Yoga & Pilates (5)</button></li>
                <li><button onClick={() => { setSelectedCategory("entrenamiento-fuerza"); setActiveTab("tienda"); }} className="hover:text-white cursor-pointer">Fuerza & Pesas (4)</button></li>
                <li><button onClick={() => { setSelectedCategory("calistenia"); setActiveTab("tienda"); }} className="hover:text-white cursor-pointer">Calistenia (4)</button></li>
                <li><button onClick={() => { setSelectedCategory("boxeo-artes-marciales"); setActiveTab("tienda"); }} className="hover:text-white cursor-pointer">Boxeo & Combate (3)</button></li>
                <li><button onClick={() => { setSelectedCategory("natacion-acuaticos"); setActiveTab("tienda"); }} className="hover:text-white cursor-pointer">Natación (1)</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Contacto Oficial</h4>
              <ul className="space-y-2">
                <li>WhatsApp: <a href="https://wa.me/51967581481" target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:underline">+51 967 581 481</a></li>
                <li>Envíos: Lima y todas las provincias del Perú</li>
                <li>Compra: 100% Protegida y Garantizada</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-center text-slate-500">
            © {new Date().getFullYear()} BASSFIT PERÚ. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* MODAL 1: PRODUCT DETAIL MODAL (FIXED SPACE, STICKY HEADER, BACKDROP CLICK & ESC) */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center p-3 sm:p-6 items-start"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl my-3 sm:my-6 relative border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header with prominent close button */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5 sticky -top-5 sm:-top-8 bg-white/95 backdrop-blur-md pt-2 z-10">
              <span className="bg-[#0F172A] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                {selectedProduct.categoryLabel}
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3.5 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shadow-sm border border-slate-200"
                title="Cerrar ventana (Esc)"
              >
                <span>Cerrar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Content Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Product Image Carousel */}
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-center relative min-h-[260px]">
                  <img
                    src={selectedProduct.images[activeImgIdx % selectedProduct.images.length]}
                    alt={selectedProduct.name}
                    className="max-h-72 w-full object-contain"
                  />
                  {selectedProduct.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImgIdx((prev) => (prev > 0 ? prev - 1 : selectedProduct.images.length - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-[#FF4A00] text-white flex items-center justify-center text-base font-bold shadow-md transition cursor-pointer"
                        title="Foto anterior"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImgIdx((prev) => (prev + 1) % selectedProduct.images.length);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-[#FF4A00] text-white flex items-center justify-center text-base font-bold shadow-md transition cursor-pointer"
                        title="Siguiente foto"
                      >
                        ›
                      </button>
                      <span className="absolute bottom-2 right-2 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {(activeImgIdx % selectedProduct.images.length) + 1} / {selectedProduct.images.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Thumbnails row when multiple images exist */}
                {selectedProduct.images.length > 1 && (
                  <div className="flex gap-2 justify-center overflow-x-auto py-1">
                    {selectedProduct.images.map((imgSrc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImgIdx(idx)}
                        className={`w-14 h-14 rounded-xl border-2 p-1 bg-white cursor-pointer transition ${
                          (activeImgIdx % selectedProduct.images.length) === idx
                            ? "border-[#FF4A00] shadow-sm scale-105"
                            : "border-slate-200 hover:border-slate-400 opacity-70"
                        }`}
                        title={`Ver foto ${idx + 1}`}
                      >
                        <img
                          src={imgSrc}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  {selectedProduct.name}
                </h2>
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-[#FF4A00]">
                    S/ {selectedProduct.price.toFixed(2)}
                  </span>
                  {selectedProduct.compareAtPrice && (
                    <span className="text-base text-slate-400 line-through">
                      S/ {selectedProduct.compareAtPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedProduct.shortDescription}
                </p>

                {/* Ficha Técnica */}
                {selectedProduct.technicalSpecs && selectedProduct.technicalSpecs.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                    <strong className="text-slate-900 block font-bold uppercase tracking-wider text-[11px]">
                      Ficha Técnica y Especificaciones:
                    </strong>
                    <ul className="space-y-1.5 text-slate-700">
                      {selectedProduct.technicalSpecs.map((spec, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-[#FF4A00] font-bold mr-2">✓</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tip del Coach */}
                <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-xl text-xs text-orange-950">
                  <strong>Tip del Coach Bassfit:</strong> {selectedProduct.coachTip}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      handleAddToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-[#FF4A00] hover:bg-[#e04100] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Añadir al Carrito (S/ {selectedProduct.price.toFixed(2)})</span>
                  </button>
                  <a
                    href={buildWhatsAppProductUrl(selectedProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm transition flex items-center justify-center space-x-2 text-center cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.196.052.268-.031.072-.082.309-.36.392-.484.082-.124.165-.103.278-.062.113.041.721.34.845.402.124.062.206.093.237.144.031.052.031.3-.113.705z" />
                    </svg>
                    <span>Consultar por WhatsApp (+51 967 581 481)</span>
                  </a>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="w-full text-center text-slate-500 hover:text-slate-800 text-xs font-bold py-2.5 mt-2 transition cursor-pointer"
                  >
                    ← Seguir viendo productos del catálogo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ARTICLE DETAIL MODAL */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center p-3 sm:p-6 items-start"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl my-4 sm:my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-6 sticky -top-6 bg-white/95 backdrop-blur-md pt-2 z-10">
              <span className="text-xs font-bold text-[#FF4A00] uppercase tracking-wider">
                {selectedArticle.pillarCategory} · {selectedArticle.readingTime}
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer"
              >
                <span>Cerrar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{selectedArticle.title}</h2>
              {selectedArticle.contentSections.map((sec, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-base font-bold text-slate-900">{sec.heading}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{sec.body}</p>
                </div>
              ))}
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-full text-center text-slate-500 hover:text-slate-800 text-xs font-bold py-3 mt-4 transition cursor-pointer"
              >
                ← Volver a guías
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER (FIXED CLEAN UI, NO MOJIBAKE, ZERO BACKEND TEXT) */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-[#FF4A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-black text-slate-900">Tu Carrito</h3>
                  <span className="text-xs text-slate-400 font-bold">({cartCount} items)</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                  title="Cerrar carrito"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 bg-orange-50 text-[#FF4A00] rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Tu carrito está vacío</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Aún no has agregado productos. Explora nuestro catálogo con los 18 implementos oficiales.
                  </p>
                  <button
                    onClick={() => { setActiveTab("tienda"); setIsCartOpen(false); }}
                    className="bg-[#FF4A00] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#e04100] transition cursor-pointer"
                  >
                    Ver Catálogo de Productos
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 py-3 border-b border-slate-100">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-contain bg-white border border-slate-100 p-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{item.product.name}</div>
                        <div className="text-xs text-[#FF4A00] font-black mt-0.5">S/ {item.product.price.toFixed(2)}</div>
                        <div className="flex items-center space-x-2 mt-1.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-1">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-slate-900">
                          S/ {(item.product.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-xs text-slate-400 hover:text-red-500 mt-1 block ml-auto cursor-pointer"
                          title="Eliminar producto"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-800">S/ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Envío:</span>
                    <span className="text-slate-500">A coordinar (Lima y Provincias)</span>
                  </div>
                </div>
                <div className="flex justify-between items-baseline font-black text-lg border-t border-slate-100 pt-2 text-slate-900">
                  <span>Total a Pagar:</span>
                  <span className="text-2xl text-[#FF4A00]">S/ {cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleWhatsAppCartOrder}
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3.5 rounded-xl text-sm transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.196.052.268-.031.072-.082.309-.36.392-.484.082-.124.165-.103.278-.062.113.041.721.34.845.402.124.062.206.093.237.144.031.052.031.3-.113.705z" />
                    </svg>
                    <span>Pedir Pedido por WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full text-center text-slate-500 hover:text-slate-800 text-xs font-bold py-2 transition cursor-pointer"
                  >
                    ← Seguir agregando productos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
