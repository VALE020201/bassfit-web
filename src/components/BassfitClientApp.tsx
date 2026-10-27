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

interface ProductVariant {
  id: string;
  name: string;
  subtitle?: string;
  imageIndex: number;
  tag?: string;
}

interface CartItem {
  cartItemId: string;
  product: BassfitProduct;
  variant?: ProductVariant | null;
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
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [cardActiveIndices, setCardActiveIndices] = useState<{ [productId: string]: number }>({});
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

  const buildWhatsAppProductUrl = (product: BassfitProduct, variant?: ProductVariant | null) => {
    if (!product) return "https://wa.me/51967581481";
    let title = product.name;
    if (variant && variant.name) {
      title += ` [Variedad: ${variant.name}]`;
    }
    const text = `Hola Bassfit 👋, deseo consultar y comprar: *${title}* (S/ ${product.price.toFixed(2)}). ¿Tienen disponibilidad inmediata y envíos a mi dirección?`;
    return `https://wa.me/51967581481?text=${encodeURIComponent(text)}`;
  };

  // Open product modal with synced card state
  const openProductModal = (product: BassfitProduct) => {
    const cardIdx = cardActiveIndices[product.id] || 0;
    const safeIdx = cardIdx % (product.images.length || 1);
    setActiveImgIdx(safeIdx);
    if (product.variants && product.variants.length > 0) {
      const match = product.variants.find((v) => v.imageIndex === safeIdx) || product.variants[0];
      setSelectedVariant(match);
    } else {
      setSelectedVariant(null);
    }
    setSelectedProduct(product);
  };

  // Cart operations with variant support
  const handleAddToCart = (product: BassfitProduct, variant: ProductVariant | null = null) => {
    const chosenVariant = variant || (product.variants ? product.variants[0] : null);
    const cartItemId = chosenVariant ? `${product.id}-${chosenVariant.id}` : product.id;
    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { cartItemId, product, variant: chosenVariant, quantity: 1 }];
    });
    const label = chosenVariant ? `${product.name} (${chosenVariant.name})` : product.name;
    setToastMessage(`✓ ${label} agregado al carrito`);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId || item.product.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId && item.product.id !== cartItemId));
  };

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  }, [cart]);

  // WhatsApp cart checkout message
  const handleWhatsAppCartOrder = () => {
    if (cart.length === 0) return;
    let message = "Hola Bassfit 👋, deseo realizar un pedido con los siguientes productos del catálogo oficial:\n\n";
    cart.forEach((item, idx) => {
      const varTxt = item.variant ? ` [Variedad: ${item.variant.name}]` : "";
      message += `${idx + 1}. *${item.product.name}*${varTxt} (x${item.quantity}) - S/ ${(item.product.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\n*TOTAL DEL PEDIDO: S/ ${cartSubtotal.toFixed(2)}*\n\n`;
    message += "¿Tienen disponibilidad inmediata para envío a mi dirección?";
    const url = `https://wa.me/51967581481?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return BASSFIT_PRODUCTS.filter((prod) => {
      const matchesCat =
        selectedCategory === "todos" || prod.categorySlug === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <span className="text-[#FF4A00] font-black">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#0F172A] text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <span className="bg-[#FF4A00] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              OFICIAL
            </span>
            <span className="text-slate-200 font-medium text-[11px] sm:text-xs">
              Catálogo Oficial Bassfit Perú 🇵🇪 · Implementos de Calidad Profesional y Entrenamientos
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Envíos a todo el Perú</span>
            <span className="text-slate-600">|</span>
            <a
              href="https://wa.me/51967581481"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition flex items-center space-x-1 text-[#25D366] font-bold"
            >
              <span>Asesoría WhatsApp: +51 967 581 481</span>
            </a>
          </div>
        </div>
      </div>

      {/* MAIN HEADER / NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Official Logo with small 'PERU' */}
          <div
            onClick={() => setActiveTab("inicio")}
            className="flex items-center space-x-3 cursor-pointer select-none group"
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] uppercase">
                BASS<span className="text-[#FF4A00]">FIT</span>
              </span>
              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                PERÚ
              </span>
            </div>
            <span className="hidden md:inline-block text-[11px] text-slate-500 font-semibold border-l border-slate-200 pl-3">
              Fitness sin límites de edad
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab("inicio")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "inicio"
                  ? "bg-[#0F172A] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => setActiveTab("tienda")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                activeTab === "tienda"
                  ? "bg-[#0F172A] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Catálogo ({BASSFIT_PRODUCTS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("entrenamientos")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "entrenamientos"
                  ? "bg-[#0F172A] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Planes de Entrenamiento
            </button>
            <button
              onClick={() => setActiveTab("comunidad")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "comunidad"
                  ? "bg-[#0F172A] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Guías y Salud
            </button>
          </nav>

          {/* Search bar & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="relative hidden sm:block w-48 md:w-60">
              <input
                type="text"
                placeholder="Buscar implemento..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "tienda") setActiveTab("tienda");
                }}
                className="w-full bg-slate-100 text-xs text-slate-800 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-transparent focus:border-[#FF4A00] focus:bg-white focus:outline-hidden transition"
              />
              <svg
                className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* WhatsApp Quick Link */}
            <a
              href="https://wa.me/51967581481"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold p-2 sm:px-3 sm:py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Chatear por WhatsApp"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.196.052.268-.031.072-.082.309-.36.392-.484.082-.124.165-.103.278-.062.113.041.721.34.845.402.124.062.206.093.237.144.031.052.031.3-.113.705z" />
              </svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#0F172A] hover:bg-[#FF4A00] text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center space-x-2 shadow-xs cursor-pointer relative"
              title="Ver Carrito de Compras"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">Carrito</span>
              {cartCount > 0 && (
                <span className="bg-[#FF4A00] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* TAB 2: TIENDA (CATÁLOGO OFICIAL 33 PRODUCTOS) */}
        {activeTab === "tienda" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Catálogo Oficial Bassfit Perú
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mostrando {filteredProducts.length} de {BASSFIT_PRODUCTS.length} productos verificados
                  </p>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      selectedCategory === cat.slug
                        ? "bg-[#0F172A] text-white shadow-md shadow-slate-900/20 scale-102"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const cardIdx = cardActiveIndices[product.id] || 0;
                const hasMulti = product.images && product.images.length > 1;
                const safeIdx = cardIdx % (product.images.length || 1);
                const activeImgSrc = product.images[safeIdx];
                const activeCardVar = product.variants ? (product.variants.find(v => v.imageIndex === safeIdx) || product.variants[0]) : null;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group"
                  >
                    {/* Image Area with Interactive Carousel Slider */}
                    <div
                      onClick={() => openProductModal(product)}
                      className="cursor-pointer p-4 bg-white flex items-center justify-center h-52 relative overflow-hidden"
                    >
                      <img
                        src={resolveImg(activeImgSrc)}
                        alt={product.name}
                        className="max-h-44 w-full object-contain group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                        {product.categoryLabel}
                      </span>

                      {/* Top right slide/variant badge */}
                      {hasMulti && (
                        <span className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-xs">
                          {activeCardVar ? activeCardVar.tag || `${safeIdx + 1}/${product.images.length}` : `${safeIdx + 1}/${product.images.length}`}
                        </span>
                      )}

                      {/* Slider arrows on card */}
                      {hasMulti && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardActiveIndices(prev => {
                                const cur = prev[product.id] || 0;
                                return { ...prev, [product.id]: (cur - 1 + product.images.length) % product.images.length };
                              });
                            }}
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-[#FF4A00] text-white flex items-center justify-center text-sm font-bold shadow-md transition z-10 cursor-pointer"
                            title="Anterior foto"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardActiveIndices(prev => {
                                const cur = prev[product.id] || 0;
                                return { ...prev, [product.id]: (cur + 1) % product.images.length };
                              });
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-[#FF4A00] text-white flex items-center justify-center text-sm font-bold shadow-md transition z-10 cursor-pointer"
                            title="Siguiente foto"
                          >
                            ›
                          </button>
                          {/* Dots indicators */}
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center space-x-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                            {product.images.map((_, dotIdx) => (
                              <button
                                key={dotIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardActiveIndices(prev => ({ ...prev, [product.id]: dotIdx }));
                                }}
                                className={`rounded-full transition-all cursor-pointer ${
                                  safeIdx === dotIdx ? 'w-4 h-1.5 bg-[#FF4A00]' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                                }`}
                                title={`Ver imagen ${dotIdx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-5 border-t border-slate-100 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          onClick={() => openProductModal(product)}
                          className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-[#FF4A00] cursor-pointer transition leading-snug"
                        >
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {product.shortDescription}
                        </p>

                        {/* Variant chips on card for products with variants like Crema */}
                        {product.variants && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                              <span>Variedades ({product.variants.length}):</span>
                              <span className="text-[#FF4A00] font-extrabold text-[9px]">Toca para ver ⇄</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {product.variants.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardActiveIndices(prev => ({ ...prev, [product.id]: v.imageIndex }));
                                  }}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                                    safeIdx === v.imageIndex
                                      ? 'bg-[#FF4A00] text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                  title={v.subtitle || v.name}
                                >
                                  {v.tag || v.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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
                              onClick={() => openProductModal(product)}
                              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center"
                            >
                              Ver Ficha
                            </button>
                            <button
                              onClick={() => handleAddToCart(product, activeCardVar)}
                              className="w-full bg-[#FF4A00] hover:bg-[#e04100] text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center flex items-center justify-center space-x-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Añadir</span>
                            </button>
                          </div>
                          <a
                            href={buildWhatsAppProductUrl(product, activeCardVar)}
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
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: PRODUCT DETAIL */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center p-3 sm:p-6 items-start"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-4 sm:my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-6 sticky -top-6 bg-white/95 backdrop-blur-md pt-2 z-10">
              <span className="text-xs font-bold text-[#FF4A00] uppercase tracking-wider">
                {selectedProduct.categoryLabel} · SKU: {selectedProduct.sku}
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer"
              >
                <span>Cerrar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Image Carousel */}
              <div className="space-y-3">
                <div className="h-72 sm:h-84 bg-white rounded-2xl flex items-center justify-center p-4 relative border border-slate-100 overflow-hidden group">
                  <img
                    src={resolveImg(selectedProduct.images[activeImgIdx % selectedProduct.images.length])}
                    alt={selectedProduct.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  {selectedProduct.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextIdx = activeImgIdx > 0 ? activeImgIdx - 1 : selectedProduct.images.length - 1;
                          setActiveImgIdx(nextIdx);
                          if (selectedProduct.variants) {
                            const match = selectedProduct.variants.find(v => v.imageIndex === nextIdx);
                            if (match) setSelectedVariant(match);
                          }
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
                          const nextIdx = (activeImgIdx + 1) % selectedProduct.images.length;
                          setActiveImgIdx(nextIdx);
                          if (selectedProduct.variants) {
                            const match = selectedProduct.variants.find(v => v.imageIndex === nextIdx);
                            if (match) setSelectedVariant(match);
                          }
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

                {/* Thumbnails row */}
                {selectedProduct.images.length > 1 && (
                  <div className="flex gap-2 justify-center overflow-x-auto py-1">
                    {selectedProduct.images.map((imgSrc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveImgIdx(idx);
                          if (selectedProduct.variants) {
                            const match = selectedProduct.variants.find(v => v.imageIndex === idx);
                            if (match) setSelectedVariant(match);
                          }
                        }}
                        className={`w-14 h-14 rounded-xl border-2 p-1 bg-white cursor-pointer transition ${
                          (activeImgIdx % selectedProduct.images.length) === idx
                            ? "border-[#FF4A00] shadow-sm scale-105"
                            : "border-slate-200 hover:border-slate-400 opacity-70"
                        }`}
                        title={`Ver foto ${idx + 1}`}
                      >
                        <img
                          src={resolveImg(imgSrc)}
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

                {/* VARIANT SELECTOR GRID */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🧴 Variedad:</span>
                        <span className="text-[#FF4A00] font-extrabold">
                          {selectedVariant?.name || selectedProduct.variants[0].name}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        Desliza o toca ⇄
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedProduct.variants.map((v) => {
                        const isSelected = (activeImgIdx % selectedProduct.images.length) === v.imageIndex;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setActiveImgIdx(v.imageIndex);
                              setSelectedVariant(v);
                            }}
                            className={`p-2.5 rounded-xl text-left border-2 transition-all cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? "border-[#FF4A00] bg-orange-50/70 shadow-xs"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              isSelected ? "bg-[#FF4A00] text-white" : "bg-slate-100 text-slate-700"
                            }`}>
                              {v.tag ? v.tag.split(" ")[0] : "🧴"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 leading-tight truncate">{v.name}</div>
                              {v.subtitle && <div className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">{v.subtitle}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedProduct.shortDescription}
                </p>

                {/* Specs */}
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

                {/* Coach Tip */}
                <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-xl text-xs text-orange-950">
                  <strong>Tip del Coach Bassfit:</strong> {selectedProduct.coachTip}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      const curVar = selectedVariant || (selectedProduct.variants ? selectedProduct.variants[activeImgIdx % selectedProduct.images.length] : null);
                      handleAddToCart(selectedProduct, curVar);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-[#FF4A00] hover:bg-[#e04100] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>
                      Añadir al Carrito {selectedVariant ? `· ${selectedVariant.name}` : ""} (S/ {selectedProduct.price.toFixed(2)})
                    </span>
                  </button>
                  <a
                    href={buildWhatsAppProductUrl(
                      selectedProduct,
                      selectedVariant || (selectedProduct.variants ? selectedProduct.variants[activeImgIdx % selectedProduct.images.length] : null)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm transition flex items-center justify-center space-x-2 text-center cursor-pointer"
                  >
                    <span>Consultar por WhatsApp (+51 967 581 481)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
