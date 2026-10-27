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

type TabType = "home" | "shop" | "categorias" | "asesorias" | "vlogs" | "contacto";

export default function BassfitClientApp() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BassfitProduct | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<EvergreenArticle | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [cardActiveIndices, setCardActiveIndices] = useState<{ [productId: string]: number }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProduct(null);
        setSelectedArticle(null);
        setIsVideoModalOpen(false);
        setIsCartOpen(false);
        setIsMobileMenuOpen(false);
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

  // 3 Featured products matching the client mockup (Barras 8en1, Crema Corporal, Faja Reductora)
  const featuredProducts = useMemo(() => {
    const p1 = BASSFIT_PRODUCTS.find((p) => p.id === "wa-3421408384612748") || BASSFIT_PRODUCTS[0];
    const p2 = BASSFIT_PRODUCTS.find((p) => p.id === "wa-3708939919127923") || BASSFIT_PRODUCTS[1];
    const p3 = BASSFIT_PRODUCTS.find((p) => p.id === "wa-4858382410901998") || BASSFIT_PRODUCTS[2];
    return [p1, p2, p3];
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex flex-col font-sans selection:bg-[#FF5500] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <span className="text-[#FF5500] font-black">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#0F172A] text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <span className="bg-[#FF5500] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
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

      {/* MAIN HEADER / NAVBAR (Exact Match to Client Mockup) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo with Athletic Typography and small PERÚ badge */}
          <div
            onClick={() => {
              setActiveTab("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            title="Bassfit Perú - Inicio"
          >
            <img
              src="images/brand/logo_bassfit_peru.png"
              alt="Bassfit Perú"
              className="h-9 sm:h-10 w-auto object-contain transition group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="hidden items-center space-x-1.5">
              <span className="text-2xl sm:text-3xl font-black italic tracking-tight text-[#0F172A] uppercase">
                BASS<span className="text-[#FF5500]">FIT</span>
              </span>
              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                PERÚ
              </span>
            </div>
          </div>

          {/* Navigation Links (HOME, SHOP, CATEGORÍAS, ASESORÍAS, VLOGS, CONTACTO) */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <button
              onClick={() => setActiveTab("home")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "home"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              HOME
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "shop"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              SHOP
            </button>
            <button
              onClick={() => setActiveTab("categorias")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "categorias"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              CATEGORÍAS
            </button>
            <button
              onClick={() => setActiveTab("asesorias")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "asesorias"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              ASESORÍAS
            </button>
            <button
              onClick={() => setActiveTab("vlogs")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "vlogs"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              VLOGS
            </button>
            <button
              onClick={() => setActiveTab("contacto")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "contacto"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              CONTACTO
            </button>
          </nav>

          {/* Search bar & Shopping Cart Pill Button */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Pill Search Input */}
            <div className="relative hidden md:block w-44 lg:w-56">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "shop") setActiveTab("shop");
                }}
                className="w-full bg-white text-xs text-slate-800 placeholder-slate-400 pl-3.5 pr-8 py-2 rounded-full border border-slate-300 focus:border-[#FF5500] focus:outline-hidden transition shadow-2xs"
              />
              <svg
                className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Shopping Cart Orange Pill */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black px-3.5 py-2 rounded-full text-xs transition flex items-center space-x-2 shadow-md shadow-orange-500/20 cursor-pointer relative"
              title="Ver Carrito de Compras"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline uppercase tracking-wider text-[11px]">Carrito</span>
              {cartCount > 0 ? (
                <span className="bg-white text-[#FF5500] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              ) : (
                <span className="bg-[#0F172A] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  0
                </span>
              )}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
              title="Menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "shop") setActiveTab("shop");
                }}
                className="w-full bg-slate-50 text-xs text-slate-800 placeholder-slate-400 pl-3 pr-8 py-2 rounded-full border border-slate-200"
              />
              <svg
                className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => { setActiveTab("home"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 rounded-lg text-left ${activeTab === "home" ? "bg-[#FF5500] text-white" : "bg-slate-50 text-slate-800"}`}
              >
                HOME
              </button>
              <button
                onClick={() => { setActiveTab("shop"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 rounded-lg text-left ${activeTab === "shop" ? "bg-[#FF5500] text-white" : "bg-slate-50 text-slate-800"}`}
              >
                SHOP ({BASSFIT_PRODUCTS.length})
              </button>
              <button
                onClick={() => { setActiveTab("categorias"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 rounded-lg text-left ${activeTab === "categorias" ? "bg-[#FF5500] text-white" : "bg-slate-50 text-slate-800"}`}
              >
                CATEGORÍAS
              </button>
              <button
                onClick={() => { setActiveTab("asesorias"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 rounded-lg text-left ${activeTab === "asesorias" ? "bg-[#FF5500] text-white" : "bg-slate-50 text-slate-800"}`}
              >
                ASESORÍAS
              </button>
              <button
                onClick={() => { setActiveTab("vlogs"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 rounded-lg text-left ${activeTab === "vlogs" ? "bg-[#FF5500] text-white" : "bg-slate-50 text-slate-800"}`}
              >
                VLOGS
              </button>
              <button
                onClick={() => { setActiveTab("contacto"); setIsMobileMenuOpen(false); }}
                className={`py-2 px-3 rounded-lg text-left ${activeTab === "contacto" ? "bg-[#FF5500] text-white" : "bg-slate-50 text-slate-800"}`}
              >
                CONTACTO
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN BODY CONTENT */}
      <main className="flex-1 w-full">
        {/* ========================================================================= */}
        {/* TAB 1: HOME (Exact replica of the client's design mockup)                 */}
        {/* ========================================================================= */}
        {activeTab === "home" && (
          <div className="space-y-10 sm:space-y-12 pb-16">
            {/* HERO BANNER SECTION (Tech circuits, dynamic runner, bold athletic text) */}
            <section className="relative bg-[#FAFAFA] border-b border-slate-200/80 overflow-hidden">
              {/* Subtle Tech Circuit Graphics Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,40 L120,40 L160,80 L280,80" fill="none" stroke="#00C4D4" strokeWidth="2" strokeDasharray="6 4" />
                  <circle cx="280" cy="80" r="4" fill="#00C4D4" />
                  <path d="M40,0 L40,160 L80,200 L180,200" fill="none" stroke="#FF5500" strokeWidth="2" />
                  <circle cx="180" cy="200" r="4" fill="#FF5500" />
                </svg>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16 relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Bold Athletic Typography & CTA */}
                  <div className="lg:col-span-6 space-y-5 text-center lg:text-left z-10">
                    <div className="space-y-1">
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] uppercase tracking-tight leading-none">
                        SUPERA<br />TUS LÍMITES
                      </h1>
                      <p className="text-sm sm:text-base text-slate-500 font-medium pt-2 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                        Equipamiento deportivo premium, rutinas de entrenamiento guiadas y asesoría directa para transformar tu rendimiento con calidad profesional.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                      <button
                        onClick={() => {
                          setActiveTab("shop");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-xs sm:text-sm uppercase tracking-wider px-8 py-3.5 rounded-full shadow-lg shadow-orange-500/25 transition transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        DESCUBRIR PRODUCTOS
                      </button>
                      <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm uppercase tracking-wider px-6 py-3.5 rounded-full border border-slate-300 shadow-2xs transition flex items-center space-x-2 cursor-pointer"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#FF5500] text-white flex items-center justify-center text-[10px]">
                          ▶
                        </span>
                        <span>Ver Rutina Fitness</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: High-Definition Athletic Runner Visual with Tech Circuits */}
                  <div className="lg:col-span-6 flex items-center justify-center relative">
                    <div className="relative w-full max-w-lg lg:max-w-none">
                      <img
                        src="images/hero_runner_hd.png"
                        alt="Bassfit Atleta en Carrera"
                        className="w-full h-auto object-contain drop-shadow-md"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = "images/mockup_runner.jpg";
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Center Carousel Dots (Mockup Feature) */}
                <div className="flex justify-center items-center space-x-2 pt-6 sm:pt-8">
                  <span className="w-5 h-2 rounded-full bg-[#FF5500] transition-all"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                </div>
              </div>
            </section>

            {/* ===================================================================== */}
            {/* SPLIT FEATURED SECTION: PRODUCTOS DESTACADOS + VLOGS & WELLNESS TIPS */}
            {/* ===================================================================== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: PRODUCTOS DESTACADOS (3 Top Products Grid) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h2 className="text-base sm:text-lg font-black text-[#0F172A] uppercase tracking-tight">
                      PRODUCTOS DESTACADOS
                    </h2>
                    <button
                      onClick={() => setActiveTab("shop")}
                      className="text-xs font-bold text-[#FF5500] hover:text-[#d04200] transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Ver Catálogo Completo (33)</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* 3 Product Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {featuredProducts.map((product) => {
                      const cardIdx = cardActiveIndices[product.id] || 0;
                      const safeIdx = cardIdx % (product.images.length || 1);
                      const activeImg = product.images[safeIdx] || product.images[0];
                      const activeVar = product.variants ? (product.variants.find(v => v.imageIndex === safeIdx) || product.variants[0]) : null;

                      return (
                        <div
                          key={product.id}
                          className="bg-white rounded-2xl border border-slate-200/90 hover:border-orange-300 hover:shadow-xl transition-all duration-300 p-4 flex flex-col justify-between group cursor-pointer"
                          onClick={() => openProductModal(product)}
                        >
                          {/* Image Box on Pure White */}
                          <div className="bg-white rounded-xl h-44 flex items-center justify-center p-3 relative overflow-hidden">
                            <img
                              src={resolveImg(activeImg)}
                              alt={product.name}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            {product.images.length > 1 && (
                              <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                {safeIdx + 1}/{product.images.length}
                              </span>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="pt-3 space-y-1.5 flex-1 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                BASSFIT
                              </span>
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#FF5500] transition line-clamp-2 leading-snug">
                                {product.name}
                              </h3>
                            </div>

                            <div className="space-y-2 pt-1">
                              {/* 5 Stars Rating */}
                              <div className="flex items-center space-x-1 text-amber-400 text-xs">
                                <span>★★★★★</span>
                                <span className="text-[10px] text-slate-400 font-semibold">(5.0)</span>
                              </div>

                              {/* Price */}
                              <div className="flex items-baseline space-x-2">
                                <span className="text-base sm:text-lg font-black text-slate-900">
                                  S/ {product.price.toFixed(2)}
                                </span>
                                {product.compareAtPrice && (
                                  <span className="text-xs text-slate-400 line-through">
                                    S/ {product.compareAtPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openProductModal(product);
                                  }}
                                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold py-1.5 rounded-lg transition text-center cursor-pointer"
                                >
                                  Ficha
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(product, activeVar);
                                  }}
                                  className="w-full bg-[#FF5500] hover:bg-[#e04a00] text-white text-[11px] font-bold py-1.5 rounded-lg transition text-center flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <span>+ Añadir</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT COLUMN: VLOGS & WELLNESS TIPS (Mockup Feature) */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black text-[#0F172A] uppercase tracking-tight">
                      VLOGS & WELLNESS TIPS
                    </h2>
                    <button
                      onClick={() => setActiveTab("vlogs")}
                      className="text-xs font-bold text-[#FF5500] hover:text-[#d04200] transition cursor-pointer"
                    >
                      Ver todos →
                    </button>
                  </div>

                  {/* Video Thumbnail Card */}
                  <div
                    onClick={() => setIsVideoModalOpen(true)}
                    className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200/90 bg-white hover:shadow-xl transition-all duration-300"
                  >
                    <div className="relative h-48 sm:h-52 bg-slate-900 overflow-hidden">
                      <img
                        src="images/mockup_vlog_hd.jpg"
                        alt="Fitness Training Vlog"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-2xl group-hover:scale-115 transition-transform duration-300">
                          <span className="text-[#0F172A] text-lg font-black pl-1">
                            ▶
                          </span>
                        </div>
                      </div>
                      <span className="absolute bottom-3 right-3 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                        VIDEO GUIADO
                      </span>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <h3 className="text-sm sm:text-base font-black text-[#0F172A] uppercase tracking-tight group-hover:text-[#FF5500] transition">
                        FITNESS TRAINING
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Rutinas guiadas de alta intensidad, técnica de tracción con barra y mancuernas, estiramientos y consejos clave de nutrición para maximizar tus resultados sin lesiones.
                      </p>
                      <div className="pt-2 flex items-center space-x-2 text-[11px] text-[#FF5500] font-bold">
                        <span>Ver video tutorial y rutina</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* POPULAR CATEGORIES ROW */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] uppercase tracking-tight">
                      EXPLORA POR CATEGORÍAS
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Encuentra el equipamiento exacto para tu disciplina y nivel
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("categorias")}
                    className="text-xs font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    Ver todas las categorías ({PRODUCT_CATEGORIES.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {PRODUCT_CATEGORIES.filter(c => c.slug !== "todos").slice(0, 6).map((cat) => {
                    const count = BASSFIT_PRODUCTS.filter(p => p.categorySlug === cat.slug).length;
                    return (
                      <button
                        key={cat.slug}
                        onClick={() => {
                          setSelectedCategory(cat.slug);
                          setActiveTab("shop");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#FF5500] hover:shadow-md transition text-center group cursor-pointer"
                      >
                        <div className="text-2xl mb-1.5">{cat.icon}</div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#FF5500] transition line-clamp-1">
                          {cat.label}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {count} productos
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* BRAND VALUE PROMISES */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center text-xl shrink-0 font-bold">
                    🚚
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">Envíos a todo el Perú</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lima y provincias con tracking</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl shrink-0 font-bold">
                    💬
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">Asesoría WhatsApp</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Atención directa: +51 967 581 481</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 font-bold">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">Calidad Bassfit</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Implementos testeados para uso real</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center space-x-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0 font-bold">
                    💳
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">Pagos Confiables</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Yape, Plin, BCP, BBVA y efectivo</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SHOP (Complete 33-product catalog with filters, slider & whatsapp)  */}
        {/* ========================================================================= */}
        {activeTab === "shop" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                    Catálogo Oficial Bassfit Perú
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mostrando {filteredProducts.length} de {BASSFIT_PRODUCTS.length} productos verificados
                  </p>
                </div>

                {/* Reset filters button if searching or filtered */}
                {(selectedCategory !== "todos" || searchQuery !== "") && (
                  <button
                    onClick={() => {
                      setSelectedCategory("todos");
                      setSearchQuery("");
                    }}
                    className="text-xs font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    Restablecer filtros ✕
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
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
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-[#FF5500] text-white flex items-center justify-center text-sm font-bold shadow-md transition z-10 cursor-pointer"
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
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-[#FF5500] text-white flex items-center justify-center text-sm font-bold shadow-md transition z-10 cursor-pointer"
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
                                  safeIdx === dotIdx ? 'w-4 h-1.5 bg-[#FF5500]' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
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
                          className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-[#FF5500] cursor-pointer transition leading-snug"
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
                              <span className="text-[#FF5500] font-extrabold text-[9px]">Toca para ver ⇄</span>
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
                                      ? 'bg-[#FF5500] text-white shadow-xs'
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
                          <span className="text-xl font-black text-[#FF5500]">
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
                              className="w-full bg-[#FF5500] hover:bg-[#e04a00] text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer text-center flex items-center justify-center space-x-1"
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

        {/* ========================================================================= */}
        {/* TAB 3: CATEGORÍAS (Categorized view of all 33 products)                  */}
        {/* ========================================================================= */}
        {activeTab === "categorias" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                Categorías de Equipamiento Bassfit
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Explora cada una de nuestras líneas especializadas para entrenamiento profesional
              </p>
            </div>

            <div className="space-y-12">
              {PRODUCT_CATEGORIES.filter(c => c.slug !== "todos").map((cat) => {
                const prodsInCat = BASSFIT_PRODUCTS.filter(p => p.categorySlug === cat.slug);
                if (prodsInCat.length === 0) return null;

                return (
                  <div key={cat.slug} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            {cat.label}
                          </h2>
                          <p className="text-xs text-slate-400">
                            {prodsInCat.length} productos disponibles
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory(cat.slug);
                          setActiveTab("shop");
                        }}
                        className="text-xs font-bold text-[#FF5500] hover:underline cursor-pointer"
                      >
                        Ver en tienda →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {prodsInCat.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => openProductModal(product)}
                          className="bg-white rounded-2xl border border-slate-200 p-3 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
                        >
                          <div className="h-36 bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden">
                            <img
                              src={resolveImg(product.images[0])}
                              alt={product.name}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                            />
                          </div>
                          <div className="pt-2 space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition line-clamp-1">
                              {product.name}
                            </h4>
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-black text-[#FF5500]">
                                S/ {product.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Stock: {product.stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ASESORÍAS (Training & Longevity Programs)                          */}
        {/* ========================================================================= */}
        {activeTab === "asesorias" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
            <div className="max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                Planes de Asesoría & Entrenamiento Bassfit
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                «...fitness sin límites de edad..» — Planes personalizados para fuerza, salud articular, pérdida de grasa y longevidad activa con seguimiento 1 a 1 por WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TRAINING_PROGRAMS.map((program) => (
                <div
                  key={program.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl transition space-y-6"
                >
                  <div className="space-y-4">
                    <span className="bg-orange-50 text-[#FF5500] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                      {program.badge}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {program.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {program.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Qué incluye:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {program.includes.map((inc, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <span className="text-[#FF5500] font-bold">✓</span>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Inversión mensual:</span>
                      <span className="text-2xl font-black text-[#FF5500]">
                        S/ {program.priceMonthly.toFixed(2)}
                      </span>
                    </div>
                    <a
                      href={buildWhatsAppCoachUrl(program.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-sm text-center cursor-pointer"
                    >
                      <span>Consultar Plan por WhatsApp</span>
                      <span>→</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: VLOGS & WELLNESS TIPS (Videos and articles)                       */}
        {/* ========================================================================= */}
        {activeTab === "vlogs" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Vlogs & Guías de Bienestar
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Aprende la técnica correcta, rutinas funcionales y tips para potenciar tu salud física
                </p>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-sm transition flex items-center space-x-2 cursor-pointer"
              >
                <span>▶</span>
                <span>Reproducir Video Destacado</span>
              </button>
            </div>

            {/* Featured Video Card Big Banner */}
            <div
              onClick={() => setIsVideoModalOpen(true)}
              className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl group cursor-pointer relative"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7 h-64 sm:h-80 relative overflow-hidden">
                  <img
                    src="images/mockup_vlog_hd.jpg"
                    alt="Fitness Training"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-2xl group-hover:scale-115 transition-transform">
                      <span className="text-[#0F172A] text-2xl font-black pl-1">
                        ▶
                      </span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 p-6 sm:p-10 space-y-4 text-white">
                  <span className="bg-[#FF5500] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                    VLOG DESTACADO
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase leading-tight">
                    FITNESS TRAINING · Técnicas de Fuerza & Movilidad
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Aprende la correcta ejecución biomecánica de tracciones, ejercicios de espalda, agarre con straps y respiración diafragmática para entrenar seguro y libre de lesiones.
                  </p>
                  <button className="bg-white text-slate-900 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-full hover:bg-slate-100 transition flex items-center space-x-2">
                    <span>Ver Tutorial Completo</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Evergreen Articles Grid */}
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Artículos & Consejos de Entrenamiento
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {EVERGREEN_ARTICLES.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group space-y-3"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-[#FF5500] uppercase tracking-wider block">
                        {art.pillarCategory} · {art.readingTime}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#FF5500] transition leading-snug">
                        {art.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {art.seoExcerpt}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#FF5500] font-bold">
                      <span>Leer artículo</span>
                      <span>→</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CONTACTO (WhatsApp, Location & Direct Customer Support)             */}
        {/* ========================================================================= */}
        {activeTab === "contacto" && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                Contacto & Atención Oficial Bassfit
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Estamos listos para asesorarte con tu pedido, resolver dudas sobre especificaciones y coordinar tu entrega inmediata.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Card */}
              <div className="bg-[#0F172A] text-white rounded-3xl p-8 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-[#25D366] animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-[#25D366]">
                      Canal de Atención Inmediata
                    </span>
                  </div>
                  <h3 className="text-2xl font-black">
                    WhatsApp Business Bassfit
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Escríbenos directamente para cotizaciones de implementos, envíos por Olva / Shalom / Marvisur o recojo en almacén.
                  </p>
                  <div className="text-xl font-black text-white">
                    📱 +51 967 581 481
                  </div>
                </div>

                <a
                  href="https://wa.me/51967581481?text=Hola%20Bassfit%20Per%C3%BA%20%F0%9F%91%8B%2C%20deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20productos%20y%20env%C3%ADos."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider transition text-center shadow-lg cursor-pointer block"
                >
                  Abrir WhatsApp Ahora
                </a>
              </div>

              {/* Delivery & Coverage Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-5">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Cobertura y Envíos a Nivel Nacional
                </h3>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start space-x-3">
                    <span className="text-base text-[#FF5500]">📍</span>
                    <div>
                      <strong className="text-slate-900 block">Lima Metropolitana & Callao:</strong>
                      <span>Entregas express de 24 a 48 horas coordinadas directamente.</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-base text-[#FF5500]">📦</span>
                    <div>
                      <strong className="text-slate-900 block">Provincias de todo el Perú:</strong>
                      <span>Despachos diarios mediante Olva Courier, Agencia Shalom, Marvisur o la agencia de tu preferencia.</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-base text-[#FF5500]">💳</span>
                    <div>
                      <strong className="text-slate-900 block">Medios de Pago:</strong>
                      <span>Yape, Plin, Transferencias BCP, BBVA, Interbank y pago contra entrega en puntos seleccionados.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: PRODUCT DETAIL (Full carousel, white background, variety chips)    */}
      {/* ========================================================================= */}
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
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
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
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-[#FF5500] text-white flex items-center justify-center text-base font-bold shadow-md transition cursor-pointer"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-[#FF5500] text-white flex items-center justify-center text-base font-bold shadow-md transition cursor-pointer"
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
                            ? "border-[#FF5500] shadow-sm scale-105"
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
                  <span className="text-3xl font-black text-[#FF5500]">
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
                        <span className="text-[#FF5500] font-extrabold">
                          {selectedVariant?.name || selectedProduct.variants[0].name}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        Desliza o toca ⇄
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedProduct.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id || (!selectedVariant && v.id === selectedProduct.variants![0].id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariant(v);
                              setActiveImgIdx(v.imageIndex);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "border-[#FF5500] bg-orange-50/50 shadow-xs ring-1 ring-[#FF5500]"
                                : "border-slate-200 bg-white hover:bg-slate-100/70"
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-900 block">
                              {v.name}
                            </span>
                            {v.subtitle && (
                              <span className="text-[10px] text-slate-500 mt-0.5 block line-clamp-1">
                                {v.subtitle}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedProduct.shortDescription}
                </p>

                {/* Technical Specs */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Especificaciones Técnicas:
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    {selectedProduct.technicalSpecs.map((spec, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <span className="text-[#FF5500] font-bold">✓</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Coach Tip */}
                {selectedProduct.coachTip && (
                  <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4 flex items-start space-x-3">
                    <span className="text-xl">💡</span>
                    <div>
                      <span className="text-xs font-bold text-[#FF5500] block uppercase tracking-wider">
                        Recomendación del Coach:
                      </span>
                      <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                        {selectedProduct.coachTip}
                      </p>
                    </div>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      handleAddToCart(selectedProduct, selectedVariant);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-black py-3.5 rounded-xl text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Añadir al Carrito</span>
                  </button>
                  <a
                    href={buildWhatsAppProductUrl(selectedProduct, selectedVariant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3.5 rounded-xl text-xs transition flex items-center justify-center space-x-2 text-center cursor-pointer shadow-md"
                  >
                    <span>Pedir por WhatsApp</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FITNESS TRAINING VIDEO (From Vlogs & Wellness Tips)                */}
      {/* ========================================================================= */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md overflow-y-auto flex justify-center p-3 sm:p-6 items-center"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-pulse"></span>
                <span className="text-xs font-black text-[#FF5500] uppercase tracking-wider">
                  VLOG & TUTORIAL EXCLUSIVO BASSFIT
                </span>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-4">
              {/* Video Player Frame */}
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
                <img
                  src="images/mockup_vlog_hd.jpg"
                  alt="Fitness Training Video Frame"
                  className="w-full h-64 sm:h-72 object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-5">
                  <div className="flex justify-between items-center text-white text-xs font-bold">
                    <span className="bg-[#FF5500] px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px]">
                      Rutina Guiada
                    </span>
                    <span>⏱ 12:45 min</span>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/95 text-[#0F172A] flex items-center justify-center mx-auto shadow-2xl hover:scale-110 transition cursor-pointer">
                      <span className="text-2xl font-black pl-1">▶</span>
                    </div>
                    <span className="text-white text-xs font-bold block mt-2">
                      Haz clic para iniciar la sesión guiada
                    </span>
                  </div>
                  <div className="text-white/90 text-[11px] font-medium flex justify-between">
                    <span>Fuerza, Biomecánica & Resistencia</span>
                    <span>1080p Full HD</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  FITNESS TRAINING · Remo con Mancuerna & Fuerza Posterior
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  En esta cápsula guiada por el Head Coach de Bassfit aprenderás cómo fijar la cintura escapular, evitar tirones lumbares y activar al 100% el dorsal ancho utilizando implementos ergonómicos.
                </p>
              </div>

              {/* Key Takeaways */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider block">
                  Puntos Clave del Entrenamiento:
                </span>
                <ul className="space-y-1 text-slate-600">
                  <li className="flex items-center space-x-2">
                    <span className="text-[#FF5500] font-bold">1.</span>
                    <span>Alineación neutra de la columna antes del despegue de la mancuerna o barra.</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-[#FF5500] font-bold">2.</span>
                    <span>Fase excéntrica controlada de 2 a 3 segundos para estimular hipertrofia.</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-[#FF5500] font-bold">3.</span>
                    <span>Uso recomendado de faja lumbar o guantes con muñequera para mayor soporte.</span>
                  </li>
                </ul>
              </div>

              {/* Consultation Button */}
              <div className="pt-2">
                <a
                  href="https://wa.me/51967581481?text=Hola%20Coach%20Bassfit%20%F0%9F%91%8B%2C%20vi%20el%20video%20Fitness%20Training%20en%20la%20web%20y%20deseo%20asesor%C3%ADa%20personalizada."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 text-center shadow-md cursor-pointer"
                >
                  <span>Consultar al Coach por WhatsApp</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EVERGREEN ARTICLE DETAIL                                           */}
      {/* ========================================================================= */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center p-3 sm:p-6 items-start"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-4 sm:my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-6 sticky -top-6 bg-white/95 backdrop-blur-md pt-2 z-10">
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                {selectedArticle.pillarCategory} · {selectedArticle.readingTime}
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-5">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {selectedArticle.title}
              </h2>
              <p className="text-sm text-slate-500 italic">
                {selectedArticle.seoExcerpt}
              </p>

              <div className="space-y-4 pt-2">
                {selectedArticle.contentSections.map((sec, i) => (
                  <div key={i} className="space-y-1.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      {sec.heading}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {sec.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Conclusiones clave:
                </span>
                <ul className="space-y-1 text-xs text-slate-600">
                  {selectedArticle.keyTakeaways.map((tip, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <span className="text-[#FF5500] font-bold">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: SHOPPING CART                                                     */}
      {/* ========================================================================= */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Carrito de Compras
                </span>
                <span className="bg-[#FF5500] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Items List */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="text-4xl text-slate-300">🛒</div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">Tu carrito está vacío</h3>
                    <p className="text-xs text-slate-400">
                      Explora nuestro catálogo de 33 implementos y añade lo que necesites
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setActiveTab("shop");
                    }}
                    className="bg-[#0F172A] hover:bg-[#FF5500] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Ver Catálogo
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80"
                  >
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-1 border border-slate-100 shrink-0">
                      <img
                        src={resolveImg(item.variant ? item.product.images[item.variant.imageIndex] : item.product.images[0])}
                        alt={item.product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.product.name}
                      </h4>
                      {item.variant && (
                        <span className="text-[10px] text-[#FF5500] font-black bg-orange-50 px-1.5 py-0.5 rounded block w-fit mt-0.5">
                          Variedad: {item.variant.name}
                        </span>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.cartItemId, -1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-xs font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-900 px-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.cartItemId, 1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-xs font-bold hover:bg-slate-100 cursor-pointer"
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
                        onClick={() => handleRemoveFromCart(item.cartItemId)}
                        className="text-xs text-slate-400 hover:text-red-500 mt-1 block ml-auto cursor-pointer"
                        title="Eliminar producto"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer with WhatsApp Checkout */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Subtotal del pedido:</span>
                  <span className="text-2xl font-black text-[#FF5500]">
                    S/ {cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleWhatsAppCartOrder}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3.5 rounded-xl text-xs transition flex items-center justify-center space-x-2 text-center shadow-md cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.196.052.268-.031.072-.082.309-.36.392-.484.082-.124.165-.103.278-.062.113.041.721.34.845.402.124.062.206.093.237.144.031.052.031.3-.113.705z" />
                  </svg>
                  <span>Pedir por WhatsApp (S/ {cartSubtotal.toFixed(2)})</span>
                </button>
                <div className="text-center text-[10px] text-slate-400">
                  Coordinarás la dirección de entrega y forma de pago directamente por WhatsApp
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#0F172A] text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black italic tracking-tight text-white uppercase">
                  BASS<span className="text-[#FF5500]">FIT</span>
                </span>
                <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                  PERÚ
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                «...fitness sin límites de edad..» — Pasión por el rendimiento físico, equipamiento de gimnasio profesional y asesoría nutricional.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Navegación
              </h4>
              <ul className="space-y-1 text-slate-400 text-xs">
                <li><button onClick={() => { setActiveTab("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition">Home</button></li>
                <li><button onClick={() => { setActiveTab("shop"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition">Shop (33 productos)</button></li>
                <li><button onClick={() => { setActiveTab("categorias"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition">Categorías</button></li>
                <li><button onClick={() => { setActiveTab("asesorias"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition">Asesorías & Programas</button></li>
                <li><button onClick={() => { setActiveTab("vlogs"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:text-white transition">Vlogs & Tips</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Categorías Populares
              </h4>
              <ul className="space-y-1 text-slate-400 text-xs">
                <li>Calistenia & Barras Multifunción</li>
                <li>Fuerza, Mancuernas & Pesas</li>
                <li>Fajas Reductoras & Gel Lipo Cream</li>
                <li>Yoga, Pilates & Colchonetas</li>
                <li>Natación & Deportes Acuáticos</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Contacto Oficial
              </h4>
              <div className="space-y-1 text-slate-400 text-xs">
                <p>WhatsApp: +51 967 581 481</p>
                <p>Envíos: Todo el territorio peruano</p>
                <p>Horario: Lunes a Sábado 8:00am - 9:00pm</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
            <span>© 2026 BASSFIT PERÚ · Todos los derechos reservados.</span>
            <span>Diseñado para alto rendimiento deportivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
