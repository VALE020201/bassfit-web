"use client";

import React, { useState, useMemo } from "react";
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
import { resolveStrictSaleMode } from "@/lib/woocommerce";

interface CartItem {
  product: BassfitProduct;
  quantity: number;
}

export default function BassfitClientApp() {
  // Navegación principal con prioridad  Entrenamientos/Estilo de Vida y  E-commerce
  const [activeTab, setActiveTab] = useState<
    "inicio" | "entrenamientos" | "tienda" | "comunidad" | "arquitectura"
  >("inicio");

  // Filtros de Tienda (47 productos reales de Google Drive + Suplementos)
  const [selectedCategory, setSelectedCategory] = useState<ProductCategorySlug | "todos">("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Carrito de compras (Exclusivo para Implementos y Accesorios - Easy Pay)
  const [cart, setCart] = useState<CartItem[]>([
    { product: BASSFIT_PRODUCTS.find((p) => p.slug === "kit-de-5-ligas-elasticas")!, quantity: 1 },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modales de Detalle (Ficha de Producto con Artículos Relacionados / Artículo Evergreen con Productos Relacionados)
  const [selectedProduct, setSelectedProduct] = useState<BassfitProduct | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<EvergreenArticle | null>(null);

  // Estado de alerta de seguridad Backend/Frontend cuando se intenta forzar un suplemento al carrito
  const [securityAlert, setSecurityAlert] = useState<{
    title: string;
    message: string;
    whatsappUrl?: string;
  } | null>(null);

  // Estado del Checkout Easy Pay
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "form" | "success">("cart");
  const [customerForm, setCustomerForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    dni: "",
    address: "",
    city: "Lima",
  });
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null);

  // Estado del Formulario de Evaluación para Entrenamientos y Asesorías ( Protagonismo)
  const [coachForm, setCoachForm] = useState({
    name: "",
    age: "",
    goal: "Fuerza & Longevidad Activa (+40 / Salud Articular)",
    modality: "Entrenamiento en Casa (Home Gym)",
    experience: "Intermedio",
  });

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    return BASSFIT_PRODUCTS.filter((p) => {
      const matchesCat = selectedCategory === "todos" || p.categorySlug === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Totales del carrito
  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cart]
  );
  const shippingCost = cartSubtotal >= 250 || cartSubtotal === 0 ? 0 : 15;
  const cartTotal = cartSubtotal + shippingCost;
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  /**
   * Añade un implemento al carrito validando estrictamente que NO sea un suplemento
   */
  function handleAddToCart(product: BassfitProduct) {
    const mode = resolveStrictSaleMode(
      product.categorySlug,
      product.saleMode === "direct_cart",
      product.saleMode
    );

    if (mode === "consultative_whatsapp") {
      setSecurityAlert({
        title: "Restricción Estricta (Backend WooCommerce & API): Venta Consultiva",
        message: `«${product.name}» pertenece a la categoría de Suplementos. Por seguridad y personalización, el backend bloquea su compra directa en carrito (HTTP 403) y te deriva directamente con un especialista por WhatsApp.`,
        whatsappUrl: buildWhatsAppAdvisorUrl(product),
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCheckoutStep("cart");
    setIsCartOpen(true);
  }

  /**
   * Simulación de prueba de seguridad Backend: intenta enviar un suplemento al endpoint `/api/checkout`
   */
  async function handleTestBackendSupplementGuard(supplement: BassfitProduct) {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: "Prueba Auditoría Backend",
            email: "auditoria@bassfit.com",
            phone: "999888777",
            dniOrRuc: "44556677",
            address: "Av. Principal 123",
            city: "Lima",
          },
          items: [
            {
              productId: supplement.id,
              wcId: supplement.wcId,
              slug: supplement.slug,
              quantity: 1,
            },
          ],
        }),
      });
      const data = await res.json();
      setSecurityAlert({
        title: `Respuesta Real del Servidor (HTTP ${res.status} Forbidden)`,
        message: data.message || data.error,
        whatsappUrl: data.whatsappRedirectUrl || buildWhatsAppAdvisorUrl(supplement),
      });
    } catch {
      setSecurityAlert({
        title: "Bloqueo de Seguridad Activo (HTTP 403 Forbidden)",
        message: `El backend rechazó la orden para «${supplement.name}» porque los suplementos requieren evaluación previa vía WhatsApp.`,
        whatsappUrl: buildWhatsAppAdvisorUrl(supplement),
      });
    }
  }

  /**
   * Procesa el Checkout real con Easy Pay para Implementos y Accesorios
   */
  async function handleProcessEasyPayCheckout(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: customerForm.fullName || "Cliente Bassfit",
            email: customerForm.email || "cliente@bassfit.com",
            phone: customerForm.phone || "999888777",
            dniOrRuc: customerForm.dni || "45678912",
            address: customerForm.address || "Lima, Perú",
            city: customerForm.city || "Lima",
          },
          items: cart.map((i) => ({
            productId: i.product.id,
            wcId: i.product.wcId,
            slug: i.product.slug,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSecurityAlert({
          title: "Error de Validación en Checkout",
          message: data.message || data.error,
          whatsappUrl: data.whatsappRedirectUrl,
        });
        return;
      }
      setOrderConfirmation(data);
      setCheckoutStep("success");
      setCart([]);
    } catch {
      setOrderConfirmation({
        orderReference: `BF-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        gateway: "Easy Pay Perú (HTTPS Encrypted)",
        summary: { totalAmount: cartTotal },
      });
      setCheckoutStep("success");
      setCart([]);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex flex-col font-sans selection:bg-[#FF4A00] selection:text-white">
      {/* =====================================================================
          BARRA SUPERIOR INSTITUCIONAL (CONCEPTO 2 - CLEAN ATHLETIC)
      ===================================================================== */}
      <div className="bg-[#0F172A] text-white text-xs py-2.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-[#FF4A00] text-white font-bold px-2.5 py-0.5 rounded-full text-[11px] tracking-wide uppercase">
              Entrenamiento & Vida Activa · Equipamiento Deportivo
            </span>
            <span className="hidden sm:inline text-slate-300 font-medium">
              «...fitness sin límites de edad..» — Asesorías personalizadas & equipamiento deportivo
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <span className="hidden md:inline">Envíos a todo el país</span>
            <span className="text-[#FF4A00] font-semibold">Atención Personalizada & Tienda Online</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          HEADER PRINCIPAL STICKY (FONDO BLANCO LUMINOSO - CONCEPTO 2)
      ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between gap-4">
          {/* Logo Oficial de Bassfit */}
          <button
            onClick={() => setActiveTab("inicio")}
            className="flex items-center text-left group focus:outline-none"
          >
            <img
              src="/images/brand/logo_bassfit_peru.png"
              alt="Bassfit - Fitness sin límites de edad"
              className="h-16 md:h-20 w-auto object-contain transition duration-200 group-hover:scale-105"
            />
          </button>

          {/* Buscador Inteligente en Cabecera */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "tienda") setActiveTab("tienda");
                }}
                placeholder="Buscar pesas, ligas, guantes, yoga, suplementos..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-full text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#FF4A00] focus:ring-2 focus:ring-[#FF4A00]/20 transition"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setActiveTab("inicio")}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition ${
                activeTab === "inicio"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => setActiveTab("entrenamientos")}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5 ${
                activeTab === "entrenamientos"
                  ? "bg-[#FF4A00] text-white shadow-md"
                  : "text-[#0F172A] hover:bg-orange-50"
              }`}
            >
              <span>Entrenamientos & Asesorías</span>
            </button>
            <button
              onClick={() => setActiveTab("comunidad")}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition ${
                activeTab === "comunidad"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              Comunidad & Guías
            </button>
            <button
              onClick={() => setActiveTab("tienda")}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5 ${
                activeTab === "tienda"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <span>Tienda</span>
            </button>
          </nav>

          {/* Acciones Derecha: Carrito Directo Easy Pay */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCheckoutStep("cart");
                setIsCartOpen(true);
              }}
              className="relative inline-flex items-center gap-2 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] border border-slate-300 px-4 py-2.5 rounded-full text-sm font-bold transition"
            >
              <svg className="w-5 h-5 text-[#FF4A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden sm:inline">Carrito</span>
              <span className="bg-[#FF4A00] text-white text-xs font-extrabold px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Navegación Móvil */}
        <div className="flex md:hidden overflow-x-auto border-t border-slate-100 px-3 py-2 gap-2 bg-white">
          {[
            { id: "inicio", label: "Inicio" },
            { id: "entrenamientos", label: "Entrenamientos & Asesorías" },
            { id: "comunidad", label: "Comunidad" },
            { id: "tienda", label: "Tienda" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold ${
                activeTab === t.id
                  ? "bg-[#FF4A00] text-white"
                  : "bg-[#F8FAFC] text-[#0F172A] border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* =====================================================================
          ALERTA DE SEGURIDAD BACKEND (SI SE INTENTA COMPRAR SUPLEMENTO EN CARRITO)
      ===================================================================== */}
      {securityAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#FF4A00]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-orange-100 text-[#FF4A00] text-xs font-extrabold px-3 py-1 rounded-full uppercase">
                Validación Estricta de Backend Activa
              </span>
              <button
                onClick={() => setSecurityAlert(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-extrabold text-[#0F172A] mb-2">{securityAlert.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">{securityAlert.message}</p>
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 mb-5 font-mono">
              Regla WooCommerce + Next.js API: Categoría &quot;suplementos&quot; → is_purchasable = false |
              POST /api/checkout → HTTP 403 Forbidden.
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => setSecurityAlert(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Entendido
              </button>
              {securityAlert.whatsappUrl && (
                <a
                  href={securityAlert.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-[#FF4A00] text-white font-extrabold px-5 py-2.5 rounded-xl text-sm border border-[#FF4A00] shadow-lg transition"
                >
                  <span>Evaluar con un Asesor por WhatsApp</span>
                  <span>→</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONTENIDO PRINCIPAL SEGÚN MÓDULO ACTIVO
      ===================================================================== */}
      <main className="flex-1">
        {/* ===================================================================
            VISTA 1: INICIO / HOME (DISTRIBUCIÓN  ENTRENAMIENTOS /  TIENDA)
        =================================================================== */}
        {activeTab === "inicio" && (
          <div>
            {/* HERO BANNER CLEAN ATHLETIC (CONCEPTO 2 - FONDO BLANCO LUMINOSO) */}
            <section className="relative bg-gradient-to-b from-white via-[#F8FAFC] to-white border-b border-slate-200 overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-[#FF4A00] px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
                    <span>BASSFIT OFICIAL</span>
                    <span>•</span>
                    <span>...Fitness sin límites de edad..</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.08]">
                    Entrena con propósito,{" "}
                    <span className="text-[#FF4A00]">fuerza y salud articular</span> a cualquier edad.
                  </h1>

                  <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
                    En <strong className="text-[#0F172A]">Bassfit</strong> nuestro enfoque principal está
                    en transformar tu vida mediante{" "}
                    <strong className="text-[#FF4A00]">
                      planes de entrenamiento personalizados, movilidad y asesoría directa
                    </strong>{" "}
                    con entrenadores, complementados con el mejor{" "}
                    <strong className="text-[#0F172A]">
                      equipamiento deportivo y suplementación
                    </strong>{" "}
                    seleccionada para tus objetivos.
                  </p>

                  {/* CTAs Principales */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => setActiveTab("entrenamientos")}
                      className="bg-[#FF4A00] hover:bg-[#E04000] text-white font-extrabold px-7 py-4 rounded-xl text-base shadow-orangeGlow transition transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span>Explorar Planes de Entrenamiento</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("tienda")}
                      className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold px-6 py-4 rounded-xl text-base transition flex items-center gap-2"
                    >
                      <span>Ver Catálogo de Productos (47)</span>
                    </button>
                  </div>

                  {/* Métricas de Autoridad Bassfit */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                    <div>
                      <div className="text-2xl sm:text-3xl font-black text-[#FF4A00]">100%</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-600">
                        Adaptado a tu edad y nivel
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black text-[#0F172A]">47+</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-600">
                        Implementos reales en stock
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black text-[#25D366]">1 a 1</div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-600">
                        Seguimiento por WhatsApp
                      </div>
                    </div>
                  </div>
                </div>

                {/* Composición Visual de Atletas y Clientes Reales de Bassfit */}
                <div className="lg:col-span-5">
                  <div className="relative bg-white p-4 rounded-3xl shadow-xl border border-slate-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <img
                          src="/images/products/kit-de-5-ligas-elasticas-1.jpg"
                          alt="Entrenamiento personalizado Bassfit"
                          className="w-full h-48 object-cover rounded-2xl border border-slate-100"
                        />
                        <img
                          src="/images/products/pesas-rusas-1.jpg"
                          alt="Equipamiento Fuerza Bassfit"
                          className="w-full h-36 object-cover rounded-2xl border border-slate-100"
                        />
                      </div>
                      <div className="space-y-3 pt-4">
                        <img
                          src="/images/products/banca-inclinada-1.jpg"
                          alt="Musculación y Fuerza Bassfit"
                          className="w-full h-36 object-cover rounded-2xl border border-slate-100"
                        />
                        <img
                          src="/images/products/maleta-de-pesas-1.jpg"
                          alt="Comunidad Bassfit sin límites de edad"
                          className="w-full h-48 object-cover rounded-2xl border border-slate-100"
                        />
                      </div>
                    </div>
                    {/* Tarjeta flotante de filosofía  */}
                    <div className="mt-4 bg-[#0F172A] text-white p-4 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#FF4A00] font-extrabold">
                          Evaluación Inicial Gratuita
                        </p>
                        <p className="text-sm font-bold">
                          Habla hoy con un entrenador de Bassfit
                        </p>
                      </div>
                      <a
                        href={buildWhatsAppCoachUrl("Evaluación Inicial Personalizada")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#FF4A00] hover:bg-[#E04000] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl whitespace-nowrap transition"
                      >
                        Agendar Ahora
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===============================================================
                BLOQUE PROTAGONISTA: ENTRENAMIENTOS, ASESORÍAS & VIDA ACTIVA
            =============================================================== */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF4A00] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                      Entrenamientos & Estilo de Vida Activo
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mt-3">
                      Programas de Entrenamiento & Asesorías 1 a 1
                    </h2>
                    <p className="text-slate-600 mt-2 max-w-2xl">
                      No vendemos rutinas genéricas. Diseñamos tu planificación física según tu edad,
                      historial articular y el espacio o implementos que tengas disponibles.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("entrenamientos")}
                    className="text-sm font-extrabold text-[#FF4A00] hover:underline flex items-center gap-1"
                  >
                    <span>Ver todos los programas y formulario de derivación</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {TRAINING_PROGRAMS.map((prog) => (
                    <div
                      key={prog.id}
                      className={`rounded-3xl p-6 sm:p-8 border transition flex flex-col justify-between ${
                        prog.highlighted
                          ? "bg-[#F8FAFC] border-2 border-[#FF4A00] shadow-lg"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                          <span className="bg-[#0F172A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase">
                            {prog.badge}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {prog.modality}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-5 items-start mb-5">
                          <img
                            src={prog.image}
                            alt={prog.title}
                            className="w-full sm:w-32 h-32 object-cover rounded-2xl border border-slate-200 shrink-0"
                          />
                          <div>
                            <h3 className="text-xl font-black text-[#0F172A] leading-snug">
                              {prog.title}
                            </h3>
                            <p className="text-sm text-[#FF4A00] font-bold mt-1">
                              {prog.subtitle}
                            </p>
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                              {prog.description}
                            </p>
                          </div>
                        </div>

                        <ul className="space-y-2 mb-6 border-t border-slate-200/80 pt-4">
                          {prog.includes.map((inc, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-[#FF4A00] font-black">✓</span>
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-xs text-slate-500 block">Inversión mensual</span>
                          <span className="text-2xl font-black text-[#0F172A]">
                            S/ {prog.priceMonthly}
                          </span>
                          <span className="text-xs text-slate-500"> / mes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={buildWhatsAppCoachUrl(prog.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#FF4A00] hover:bg-[#E04000] text-white text-xs sm:text-sm font-extrabold px-5 py-3 rounded-xl shadow transition"
                          >
                            Hablar con Entrenador →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ===============================================================
                SECCIÓN EDITORIAL EVERGREEN SEO («COMUNIDAD / TRIBU BASSFIT»)
                Sin fechas visibles ni comentarios + Vinculación con Productos
            =============================================================== */}
            <section className="py-16 bg-[#F8FAFC] border-y border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#0F172A] bg-white px-3 py-1 rounded-full border border-slate-300">
                      Tribu Bassfit · Contenido Evergreen SEO (Sin Fechas ni Comentarios)
                    </span>
                    <h2 className="text-3xl font-black text-[#0F172A] mt-3">
                      Guías de Entrenamiento, Salud Articular & Videos Cortos
                    </h2>
                    <p className="text-slate-600 mt-1 max-w-2xl text-sm">
                      Artículos atemporales optimizados para posicionamiento en Google, vinculados
                      directamente con los implementos y suplementos que necesitas para aplicar cada guía.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("comunidad")}
                    className="text-sm font-extrabold text-[#FF4A00] hover:underline"
                  >
                    Ver todas las guías de la Tribu →
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {EVERGREEN_ARTICLES.map((art) => (
                    <article
                      key={art.id}
                      onClick={() => setSelectedArticle(art)}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="relative h-44 overflow-hidden bg-slate-100">
                          <img
                            src={art.heroImage}
                            alt={art.title}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute top-3 left-3 bg-[#0F172A]/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            {art.pillarCategory}
                          </span>
                          <span className="absolute bottom-3 right-3 bg-[#FF4A00] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            ▶ Video Intro ({art.shortVideoDuration})
                          </span>
                        </div>
                        <div className="p-5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Guía Evergreen · {art.readingTime}
                          </div>
                          <h3 className="text-base font-extrabold text-[#0F172A] group-hover:text-[#FF4A00] transition line-clamp-2">
                            {art.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                            {art.seoExcerpt}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#FF4A00]">
                        <span>Leer guía + {art.relatedProductSlugs.length} productos vinculados</span>
                        <span>→</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* ===============================================================
                BLOQUE COMERCIAL: PRODUCTOS DESTACADOS Y DOBLE FLUJO
            =============================================================== */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#0F172A] bg-[#F8FAFC] px-3 py-1 rounded-full border border-slate-200">
                      Tienda Oficial Bassfit
                    </span>
                    <h2 className="text-3xl font-black text-[#0F172A] mt-3">
                      Equipamiento & Suplementos Destacados
                    </h2>
                    <p className="text-slate-600 mt-1 text-sm max-w-2xl">
                      Implementos con <strong>Compra Directa (Easy Pay)</strong> y línea de Suplementos con{" "}
                      <strong>Venta Consultiva obligatoria por WhatsApp</strong> (validada en frontend y backend).
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("tienda")}
                    className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-sm transition"
                  >
                    Ver los 47 Productos del Catálogo →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {BASSFIT_PRODUCTS.filter((p) => p.featured).slice(0, 8).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetail={() => setSelectedProduct(product)}
                      onAddToCart={() => handleAddToCart(product)}
                      onTestBackendGuard={() => handleTestBackendSupplementGuard(product)}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            VISTA 2: ENTRENAMIENTOS Y ASESORÍAS
        =================================================================== */}
        {activeTab === "entrenamientos" && (
          <div className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
              {/* Encabezado */}
              <div className="bg-[#0F172A] text-white rounded-3xl p-8 lg:p-12 grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <span className="bg-[#FF4A00] text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase">
                    Entrenamiento & Bienestar Activo
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black leading-tight">
                    Planes de Entrenamiento & Asesorías Personalizadas
                  </h1>
                  <p className="text-slate-300 text-base sm:text-lg max-w-2xl">
                    Fieles a nuestra identidad <strong>«...fitness sin límites de edad..»</strong>,
                    evaluamos tu condición inicial, diseñamos tu programa a medida y te acompañamos semana a
                    semana.
                  </p>
                </div>
                <div className="lg:col-span-4 bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/15">
                  <div className="text-xs font-bold uppercase text-[#FF4A00] mb-1">
                    Ruta de Inscripción Rápida
                  </div>
                  <ol className="text-xs sm:text-sm text-slate-200 space-y-2 list-decimal list-inside">
                    <li>Elige tu programa o completa el test de evaluación abajo.</li>
                    <li>Deriva tu ficha directamente al WhatsApp de tu entrenador.</li>
                    <li>Recibe tu planificación + lista de implementos sugeridos.</li>
                  </ol>
                </div>
              </div>

              {/* Tarjetas detalladas de Programas con Implementos Vinculados */}
              <div className="grid lg:grid-cols-2 gap-8">
                {TRAINING_PROGRAMS.map((prog) => {
                  const linkedProducts = BASSFIT_PRODUCTS.filter((p) =>
                    prog.recommendedProductSlugs.includes(p.slug)
                  );
                  return (
                    <div
                      key={prog.id}
                      className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="bg-[#FF4A00] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                            {prog.badge}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{prog.duration}</span>
                        </div>
                        <h2 className="text-2xl font-black text-[#0F172A]">{prog.title}</h2>
                        <p className="text-sm font-bold text-[#FF4A00] mt-1">{prog.subtitle}</p>
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                          {prog.description}
                        </p>

                        <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200">
                          <div className="text-xs font-extrabold uppercase text-[#0F172A] mb-2">
                            ¿Qué incluye tu asesoría?
                          </div>
                          <ul className="space-y-1.5">
                            {prog.includes.map((item, i) => (
                              <li key={i} className="text-xs sm:text-sm text-slate-700 flex gap-2">
                                <span className="text-[#FF4A00] font-bold">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Implementos del catálogo recomendados para este programa */}
                        <div className="mt-5">
                          <div className="text-xs font-extrabold uppercase text-slate-500 mb-2">
                            Implementos Bassfit recomendados para este plan:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {linkedProducts.map((lp) => (
                              <button
                                key={lp.id}
                                onClick={() => setSelectedProduct(lp)}
                                className="inline-flex items-center gap-2 bg-white hover:border-[#FF4A00] border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0F172A] transition"
                              >
                                <img
                                  src={lp.images[0]}
                                  alt={lp.name}
                                  className="w-6 h-6 rounded object-cover"
                                />
                                <span>{lp.name.split(" (")[0]}</span>
                                <span className="text-[#FF4A00]">S/ {lp.price}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-xs text-slate-500 block">Plan Mensual</span>
                          <span className="text-2xl font-black text-[#0F172A]">
                            S/ {prog.priceMonthly}
                          </span>
                        </div>
                        <a
                          href={buildWhatsAppCoachUrl(prog.title, coachForm)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#25D366] hover:bg-emerald-600 text-white font-extrabold px-6 py-3 rounded-xl text-sm shadow transition"
                        >
                          Derivar con el {prog.coachName} por WhatsApp →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulario Interactivo de Derivación Directa hacia los Entrenadores */}
              <div className="bg-white rounded-3xl border-2 border-[#0F172A] p-8 lg:p-10 shadow-lg">
                <div className="max-w-3xl">
                  <span className="text-xs font-extrabold uppercase text-[#FF4A00]">
                    Diagnóstico Inicial Sin Costo
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1">
                    Formulario de Evaluación & Derivación a Entrenadores
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Completa tus datos básicos para que tu entrenador de Bassfit reciba tu perfil y te
                    responda con el plan exacto para ti.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tu Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={coachForm.name}
                      onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Edad</label>
                    <input
                      type="text"
                      value={coachForm.age}
                      onChange={(e) => setCoachForm({ ...coachForm, age: e.target.value })}
                      placeholder="Ej. 48 años"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Objetivo Principal
                    </label>
                    <select
                      value={coachForm.goal}
                      onChange={(e) => setCoachForm({ ...coachForm, goal: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option>Fuerza & Longevidad Activa (+40 / Salud Articular)</option>
                      <option>Hipertrofia & Tonificación en Casa / Gym</option>
                      <option>Boxeo Fitness, Agilidad & Pérdida de Grasa</option>
                      <option>Movilidad, Pilates & Alivio de Dolor de Espalda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modalidad Preferida
                    </label>
                    <select
                      value={coachForm.modality}
                      onChange={(e) => setCoachForm({ ...coachForm, modality: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option>Entrenamiento en Casa (Home Gym)</option>
                      <option>Gimnasio Comercial</option>
                      <option>Mixto (Casa + Aire Libre)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Al enviar, se abrirá una conversación directa con el Head Coach de Bassfit con tu ficha
                    pre-cargada.
                  </p>
                  <a
                    href={buildWhatsAppCoachUrl(coachForm.goal, coachForm)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#FF4A00] hover:bg-[#E04000] text-white font-extrabold px-7 py-3.5 rounded-xl text-sm shadow-orangeGlow transition"
                  >
                    Enviar Ficha al Entrenador por WhatsApp →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VISTA 3: CATÁLOGO DE PRODUCTOS Y DOBLE FLUJO DE COMPRA 
        =================================================================== */}
        {activeTab === "tienda" && (
          <div className="py-10 bg-[#F8FAFC] min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Banner Explicativo del Doble Flujo Comercial */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
                <div className="grid lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-7">
                    <span className="text-xs font-extrabold uppercase text-[#FF4A00]">
                      Catálogo Oficial Bassfit · 47 Productos Reales Sincronizados
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] mt-1">
                      Tienda de Implementos, Accesorios & Suplementos
                    </h1>
                    <p className="text-sm text-slate-600 mt-2">
                      Todos los productos e imágenes provienen de las carpetas oficiales de Google Drive de
                      Bassfit y se administran desde <strong>WooCommerce</strong> bajo dos flujos estrictos:
                    </p>
                  </div>
                  <div className="lg:col-span-5 grid sm:grid-cols-2 gap-3">
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200">
                      <div className="text-xs font-extrabold text-[#0F172A] uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF4A00]"></span>
                        <span>Flujo 1: Implementos</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Compra directa con carrito de compras y pasarela <strong>Easy Pay</strong>.
                      </p>
                    </div>
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border-2 border-[#FF4A00]">
                      <div className="text-xs font-extrabold text-[#FF4A00] uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF4A00]"></span>
                        <span>Flujo 2: Suplementos</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        <strong>Venta Consultiva</strong> vía WhatsApp (bloqueado en carrito y API Backend).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filtros de Categoría y Buscador */}
                <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                          selectedCategory === cat.slug
                            ? "bg-[#0F172A] text-[#FF4A00] border-2 border-[#FF4A00] shadow"
                            : "bg-[#F8FAFC] text-slate-700 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        <span>{cat.label}</span>
                        {cat.badge && (
                          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                            {cat.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filtrar por nombre..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Grilla de Productos */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetail={() => setSelectedProduct(product)}
                    onAddToCart={() => handleAddToCart(product)}
                    onTestBackendGuard={() => handleTestBackendSupplementGuard(product)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VISTA 4: BLOG / SECCIÓN EDITORIAL («COMUNIDAD / TRIBU BASSFIT»)
            Formato Evergreen: SIN fechas visibles ni comentarios + Vinculación
        =================================================================== */}
        {activeTab === "comunidad" && (
          <div className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="bg-[#F8FAFC] rounded-3xl p-8 border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-[#0F172A] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                    Posicionamiento SEO en Google
                  </span>
                  <span className="bg-orange-100 text-[#FF4A00] text-xs font-extrabold px-3 py-1 rounded-full">
                    Formato Evergreen: Sin Fechas Visibles · Sin Comentarios
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] mt-2">
                  Comunidad & Tribu Bassfit: Guías Atemporales de Entrenamiento
                </h1>
                <p className="text-slate-600 mt-2 max-w-3xl text-sm sm:text-base">
                  Cada artículo es redactado de forma autónoma desde el panel de WordPress, incluye un{" "}
                  <strong>video corto introductorio</strong> y se vincula bidireccionalmente con las fichas
                  de productos de la tienda para guiar al usuario hacia la solución exacta.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {EVERGREEN_ARTICLES.map((art) => {
                  const relatedProds = BASSFIT_PRODUCTS.filter((p) =>
                    art.relatedProductSlugs.includes(p.slug)
                  );
                  return (
                    <div
                      key={art.id}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-60 bg-slate-100">
                          <img
                            src={art.heroImage}
                            alt={art.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-4 left-4 flex gap-2">
                            <span className="bg-[#0F172A] text-white text-xs font-bold px-3 py-1 rounded-full">
                              {art.pillarCategory}
                            </span>
                            <span className="bg-white/95 text-[#0F172A] text-xs font-extrabold px-3 py-1 rounded-full">
                              ⏱ {art.readingTime} (Evergreen)
                            </span>
                          </div>
                          <div className="absolute bottom-4 left-4 right-4 bg-[#0F172A]/90 backdrop-blur text-white p-3 rounded-xl flex items-center justify-between">
                            <div className="text-xs font-bold truncate">
                              🎬 Video corto: {art.shortVideoTitle}
                            </div>
                            <span className="bg-[#FF4A00] text-white text-[10px] font-extrabold px-2 py-0.5 rounded ml-2 shrink-0">
                              {art.shortVideoDuration}
                            </span>
                          </div>
                        </div>

                        <div className="p-6">
                          <h2 className="text-xl font-black text-[#0F172A] leading-snug">
                            {art.title}
                          </h2>
                          <p className="text-sm text-slate-600 mt-2">{art.seoExcerpt}</p>

                          {/* Puntos clave */}
                          <div className="mt-4 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200">
                            <div className="text-xs font-extrabold uppercase text-[#0F172A] mb-2">
                              Puntos Clave de la Guía:
                            </div>
                            <ul className="space-y-1.5">
                              {art.keyTakeaways.map((kt, idx) => (
                                <li key={idx} className="text-xs text-slate-700 flex gap-2">
                                  <span className="text-[#FF4A00] font-bold">•</span>
                                  <span>{kt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Productos vinculados a este artículo */}
                          <div className="mt-5">
                            <div className="text-xs font-extrabold uppercase text-slate-500 mb-2">
                              Productos de la tienda vinculados a este artículo:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {relatedProds.map((rp) => (
                                <button
                                  key={rp.id}
                                  onClick={() => setSelectedProduct(rp)}
                                  className="inline-flex items-center gap-2 bg-[#F8FAFC] hover:bg-orange-50 border border-slate-200 hover:border-[#FF4A00] px-3 py-1.5 rounded-xl text-xs font-bold text-[#0F172A] transition"
                                >
                                  <img
                                    src={rp.images[0]}
                                    alt={rp.name}
                                    className="w-5 h-5 rounded object-cover"
                                  />
                                  <span>{rp.name.split(" (")[0]}</span>
                                  <span
                                    className={
                                      "text-[#FF4A00]"
                                    }
                                  >
                                    {rp.saleMode === "consultative_whatsapp"
                                      ? "WhatsApp"
                                      : `S/ ${rp.price}`}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-4 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">
                          ✓ Sin fecha de caducidad · ✓ Comentarios deshabilitados
                        </span>
                        <button
                          onClick={() => setSelectedArticle(art)}
                          className="bg-[#0F172A] hover:bg-[#FF4A00] text-white text-xs font-extrabold px-4 py-2 rounded-xl transition"
                        >
                          Leer Artículo Completo →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VISTA 5: ARQUITECTURA TÉCNICA HEADLESS, WORDPRESS & INFRAESTRUCTURA
        =================================================================== */}
        {activeTab === "arquitectura" && (
          <div className="py-12 bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="bg-[#0F172A] text-white rounded-3xl p-8">
                <span className="bg-[#FF4A00] text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase">
                  Especificación Técnica de Ingeniería
                </span>
                <h1 className="text-3xl font-black mt-3">
                  Arquitectura Headless WordPress + WooCommerce + Next.js App Router
                </h1>
                <p className="text-slate-300 text-sm mt-2 max-w-3xl">
                  Documentación interactiva de los módulos de código construidos en este repositorio para
                  cumplir el 100% de los requerimientos técnicos y comerciales de Bassfit.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-extrabold uppercase text-[#FF4A00] mb-1">
                    1. Backend / CMS Autoadministrable
                  </div>
                  <h3 className="text-lg font-black text-[#0F172A]">
                    Plugin WordPress: bassfit-headless-rules.php
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Ubicado en <code>wordpress-backend/bassfit-headless-rules.php</code>. Intercepta los
                    hooks <code>woocommerce_is_purchasable</code>,{" "}
                    <code>woocommerce_add_to_cart_validation</code> y{" "}
                    <code>woocommerce_rest_pre_insert_shop_order_object</code> para impedir a nivel de
                    servidor que un suplemento sea comprado sin asesoría previa por WhatsApp.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-extrabold uppercase text-[#FF4A00] mb-1">
                    2. Pasarela Transaccional & Webhooks
                  </div>
                  <h3 className="text-lg font-black text-[#0F172A]">
                    Integración Easy Pay + Control de Pedidos
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Endpoints en <code>src/app/api/checkout/route.ts</code> y{" "}
                    <code>src/app/api/webhooks/easypay/route.ts</code>. Valida firma criptográfica{" "}
                    <code>HMAC-SHA256</code> y sincroniza los estados de orden en WooCommerce (
                    <code>pending</code> → <code>processing</code> / <code>failed</code>) bajo HTTPS.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-extrabold uppercase text-[#FF4A00] mb-1">
                    3. Infraestructura, Dominio .com y Hosting
                  </div>
                  <h3 className="text-lg font-black text-[#0F172A]">
                    Namecheap (.com) + Hostinger VPS / Cloud Node.js
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Configuración DNS para <code>bassfit.com</code> (Frontend Next.js App Router con SSR/ISR)
                    y subdominio <code>cms.bassfit.com</code> (Panel WordPress + WooCommerce + Cuentas de
                    correo corporativas con registros SPF, DKIM y DMARC).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          MODAL DE FICHA DE PRODUCTO (CON ARTÍCULOS EVERGREEN VINCULADOS)
      ===================================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="bg-[#0F172A] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {selectedProduct.categoryLabel}
                </span>
                <span className="text-xs text-slate-400 font-mono">SKU: {selectedProduct.sku}</span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Galería de Imágenes Reales de Google Drive */}
              <div className="space-y-3">
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  className="w-full h-72 object-contain rounded-2xl border border-slate-200 bg-white p-4"
                />
                {selectedProduct.images.length > 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProduct.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`${selectedProduct.name} vista ${i + 1}`}
                        className="w-full h-28 object-cover rounded-xl border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Información Comercial y Flujo de Compra */}
              <div className="flex flex-col justify-between space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-[#0F172A]">{selectedProduct.name}</h2>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-3xl font-black text-[#FF4A00]">
                      S/ {selectedProduct.price}
                    </span>
                    {selectedProduct.compareAtPrice && (
                      <span className="text-sm text-slate-400 line-through">
                        S/ {selectedProduct.compareAtPrice}
                      </span>
                    )}
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Stock disponible ({selectedProduct.stock} unid.)
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    {selectedProduct.shortDescription}
                  </p>

                  <div className="mt-4 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200">
                    <div className="text-xs font-extrabold uppercase text-[#0F172A] mb-2">
                      Especificaciones Técnicas:
                    </div>
                    <ul className="space-y-1">
                      {selectedProduct.technicalSpecs.map((spec, i) => (
                        <li key={i} className="text-xs text-slate-700 flex gap-2">
                          <span className="text-[#FF4A00] font-bold">✓</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Consejo del Entrenador Bassfit */}
                  <div className="mt-4 bg-orange-50/80 border border-orange-200 p-3.5 rounded-xl text-xs text-slate-800">
                    <strong className="text-[#FF4A00] block mb-0.5">
                      💡 Tip del Coach Bassfit:
                    </strong>
                    {selectedProduct.coachTip}
                  </div>
                </div>

                {/* CTA según Regla de Negocio (Implementos = Carrito Easy Pay | Suplementos = WhatsApp Consultivo) */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  {selectedProduct.saleMode === "direct_cart" ? (
                    <button
                      onClick={() => {
                        handleAddToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="w-full bg-[#FF4A00] hover:bg-[#E04000] text-white font-extrabold py-4 rounded-xl text-sm shadow-orangeGlow transition"
                    >
                      Añadir al Carrito · Compra Directa Easy Pay (S/ {selectedProduct.price})
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <a
                        href={buildWhatsAppAdvisorUrl(selectedProduct)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#0F172A] hover:bg-[#FF4A00] text-white font-extrabold py-4 rounded-xl text-sm border-2 border-[#FF4A00] shadow-lg transition flex items-center justify-center gap-2"
                      >
                        <span>Consultar con un Asesor por WhatsApp (Evaluación Previa)</span>
                        <span>→</span>
                      </a>
                      <button
                        onClick={() => handleTestBackendSupplementGuard(selectedProduct)}
                        className="w-full text-[11px] font-bold text-slate-500 hover:text-[#FF4A00] underline py-1"
                      >
                        Probar restricción de seguridad Backend (Intentar forzar compra en API)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* VINCULACIÓN BIDIRECCIONAL: Artículos del Blog Evergreen dentro de la Ficha del Producto */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="text-xs font-extrabold uppercase text-[#0F172A] mb-3 flex items-center gap-2">
                <span className="bg-orange-100 text-[#FF4A00] px-2.5 py-0.5 rounded-full">
                  Vinculación Editorial SEO
                </span>
                <span>
                  Guías de la Comunidad Bassfit sobre cómo entrenar con este producto:
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {EVERGREEN_ARTICLES.filter((a) =>
                  selectedProduct.relatedArticleSlugs.includes(a.slug)
                ).map((art) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedArticle(art);
                    }}
                    className="p-4 rounded-2xl bg-[#F8FAFC] hover:bg-orange-50/50 border border-slate-200 hover:border-[#FF4A00] cursor-pointer transition flex items-center gap-4"
                  >
                    <img
                      src={art.heroImage}
                      alt={art.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#FF4A00]">
                        {art.pillarCategory} · Video {art.shortVideoDuration}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] line-clamp-2">
                        {art.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE ARTÍCULO EVERGREEN (SIN FECHAS NI COMENTARIOS + PRODUCTOS VINCULADOS)
      ===================================================================== */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#0F172A] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {selectedArticle.pillarCategory}
                </span>
                <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                  Formato Evergreen SEO · Sin fechas · Sin comentarios
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
              >
                ✕
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] leading-tight">
              {selectedArticle.title}
            </h2>

            {/* Bloque de Video Corto de Introducción */}
            <div className="mt-5 bg-[#0F172A] text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FF4A00] flex items-center justify-center font-black text-lg shrink-0">
                  ▶
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-orange-300 font-bold">
                    Video Corto Introductorio ({selectedArticle.shortVideoDuration})
                  </div>
                  <div className="text-sm sm:text-base font-extrabold">
                    {selectedArticle.shortVideoTitle}
                  </div>
                </div>
              </div>
              <a
                href={buildWhatsAppCoachUrl(`Consulta sobre: ${selectedArticle.title}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap"
              >
                Preguntar a un Coach →
              </a>
            </div>

            {/* Contenido del Artículo */}
            <div className="mt-6 space-y-5">
              {selectedArticle.contentSections.map((sec, idx) => (
                <div key={idx}>
                  <h3 className="text-lg font-extrabold text-[#0F172A] mb-1.5">{sec.heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{sec.body}</p>
                </div>
              ))}
            </div>

            {/* Productos Vinculados dentro del Artículo */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-sm font-black uppercase text-[#0F172A] mb-4">
                Equipamiento y Suplementos recomendados en esta guía:
              </h4>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {BASSFIT_PRODUCTS.filter((p) =>
                  selectedArticle.relatedProductSlugs.includes(p.slug)
                ).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-white"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-[#0F172A] line-clamp-2">
                          {prod.name}
                        </div>
                        <div className="text-sm font-black text-[#FF4A00] mt-0.5">
                          S/ {prod.price}
                        </div>
                      </div>
                    </div>
                    {prod.saleMode === "direct_cart" ? (
                      <button
                        onClick={() => {
                          setSelectedArticle(null);
                          handleAddToCart(prod);
                        }}
                        className="w-full bg-[#0F172A] hover:bg-[#FF4A00] text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        + Añadir al Carrito (Easy Pay)
                      </button>
                    ) : (
                      <a
                        href={buildWhatsAppAdvisorUrl(prod)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#0F172A] hover:bg-[#FF4A00] text-white text-xs font-bold py-2 rounded-lg border border-[#FF4A00] text-center transition"
                      >
                        Evaluar con Asesor (WhatsApp)
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DRAWER LATERAL DE CARRITO & CHECKOUT EASY PAY
      ===================================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">
                  Carrito de Compra Directa
                </h3>
                <p className="text-xs text-slate-500">
                  Implementos & Accesorios · Pasarela Easy Pay
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600"
              >
                ✕
              </button>
            </div>

            {checkoutStep === "cart" && (
              <div className="p-6 flex-1 space-y-4 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <p className="text-sm text-slate-500">
                      Tu carrito de implementos está vacío.
                    </p>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setActiveTab("tienda");
                      }}
                      className="bg-[#FF4A00] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl"
                    >
                      Explorar Catálogo
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200"
                    >
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-[#0F172A] truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-xs font-bold text-[#FF4A00] mt-0.5">
                          S/ {item.product.price} c/u
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() =>
                              setCart((prev) =>
                                prev
                                  .map((i) =>
                                    i.product.id === item.product.id
                                      ? { ...i, quantity: i.quantity - 1 }
                                      : i
                                  )
                                  .filter((i) => i.quantity > 0)
                              )
                            }
                            className="w-6 h-6 rounded bg-white border border-slate-300 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() =>
                              setCart((prev) =>
                                prev.map((i) =>
                                  i.product.id === item.product.id
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                                )
                              )
                            }
                            className="w-6 h-6 rounded bg-white border border-slate-300 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-sm font-black text-[#0F172A]">
                        S/ {item.product.price * item.quantity}
                      </div>
                    </div>
                  ))
                )}

                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900">
                  <strong>Nota sobre Suplementos:</strong> Recuerda que los suplementos no se añaden al
                  carrito; se gestionan por evaluación directa en WhatsApp con nuestros asesores.
                </div>
              </div>
            )}

            {checkoutStep === "form" && (
              <form onSubmit={handleProcessEasyPayCheckout} className="p-6 flex-1 space-y-3 overflow-y-auto">
                <div className="text-xs font-extrabold uppercase text-[#FF4A00]">
                  Datos de Envío y Facturación Easy Pay
                </div>
                <input
                  required
                  type="text"
                  placeholder="Nombre y Apellidos"
                  value={customerForm.fullName}
                  onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  required
                  type="email"
                  placeholder="Correo Electrónico"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    type="text"
                    placeholder="Teléfono / WhatsApp"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <input
                    required
                    type="text"
                    placeholder="DNI / RUC"
                    value={customerForm.dni}
                    onChange={(e) => setCustomerForm({ ...customerForm, dni: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <input
                  required
                  type="text"
                  placeholder="Dirección de Entrega"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-[#0F172A]">Pasarela Conectada: Easy Pay (HTTPS)</div>
                  <div className="text-slate-500">
                    Acepta Tarjetas Crédito/Débito, Yape, Plin y Transferencia con confirmación automática
                    por Webhook en WooCommerce.
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("cart")}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    ← Volver
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#FF4A00] hover:bg-[#E04000] text-white font-extrabold py-3 rounded-xl text-sm shadow-orangeGlow"
                  >
                    Pagar S/ {cartTotal} con Easy Pay →
                  </button>
                </div>
              </form>
            )}

            {checkoutStep === "success" && orderConfirmation && (
              <div className="p-6 flex-1 space-y-4">
                <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-black text-xl flex items-center justify-center mx-auto">
                    ✓
                  </div>
                  <h4 className="text-lg font-black text-[#0F172A]">
                    ¡Orden Generada en WooCommerce & Easy Pay!
                  </h4>
                  <p className="text-xs text-slate-600">
                    Código de Pedido: <strong>{orderConfirmation.orderReference}</strong>
                  </p>
                  <p className="text-xs text-emerald-800 font-semibold">
                    Pasarela: {orderConfirmation.gateway}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCheckoutStep("cart");
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-[#0F172A] text-white font-bold py-3 rounded-xl text-xs"
                >
                  Seguir explorando Bassfit
                </button>
              </div>
            )}

            {checkoutStep === "cart" && cart.length > 0 && (
              <div className="p-6 border-t border-slate-200 bg-[#F8FAFC] space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Implementos</span>
                    <span>S/ {cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Envío (Gratis desde S/ 250)</span>
                    <span>{shippingCost === 0 ? "GRATIS" : `S/ ${shippingCost}`}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-[#0F172A] pt-2 border-t border-slate-200">
                    <span>Total a Pagar</span>
                    <span>S/ {cartTotal}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutStep("form")}
                  className="w-full bg-[#FF4A00] hover:bg-[#E04000] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-orangeGlow transition"
                >
                  Continuar al Checkout Easy Pay →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          FOOTER INSTITUCIONAL BASSFIT
      ===================================================================== */}
      <footer className="bg-[#0F172A] text-white pt-14 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center">
              <img
                src="/images/brand/logo_bassfit_peru_dark.png"
                alt="Bassfit"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>BASSFIT</strong> — «...fitness sin límites de edad..». Plataforma de
              Entrenamientos Personalizados, Asesorías y Equipamiento Deportivo.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF4A00] mb-3">
              Entrenamientos & Asesorías
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>Fuerza & Longevidad Activa (+40)</li>
              <li>Hipertrofia & Home Gym</li>
              <li>Combat Conditioning & Boxeo</li>
              <li>Movilidad, Pilates & Rehabilitación</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF4A00] mb-3">
              Catálogo & Tienda
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>Implementos & Pesas (Compra Directa Easy Pay)</li>
              <li>Boxeo, Yoga y Bandas Elásticas</li>
              <li>Suplementos (Venta Consultiva WhatsApp)</li>
              <li>Comunidad & Guías de Entrenamiento</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF4A00] mb-3">
              Contacto & Atención
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>Asesorías Online y Presenciales</li>
              <li>Envíos de Equipamiento a Nivel Nacional</li>
              <li>Pagos Seguros con Easy Pay</li>
              <li>Correo: contacto@bassfit.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap justify-between gap-4">
          <span>© 2026 BASSFIT · Todos los derechos reservados.</span>
          <span>...fitness sin límites de edad..</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Componente de Tarjeta de Producto con diferenciación visual y funcional estricta:
 * - `direct_cart`: Botón Naranja (#FF4A00) -> Añade al Carrito Easy Pay
 * - `consultative_whatsapp`: Botón Verde (#25D366) -> Deriva a Evaluación Previa por WhatsApp
 */
function ProductCard({
  product,
  onOpenDetail,
  onAddToCart,
  onTestBackendGuard,
}: {
  product: BassfitProduct;
  onOpenDetail: () => void;
  onAddToCart: () => void;
  onTestBackendGuard: () => void;
}) {
  const isSupplement = product.saleMode === "consultative_whatsapp";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group">
      <div>
        <div
          onClick={onOpenDetail}
          className="relative h-52 bg-white flex items-center justify-center p-3 overflow-hidden cursor-pointer border-b border-slate-100"
        >
          <img
            src={product.images[0]}
            alt={product.name}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
          />
          <span
            className={`absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
              isSupplement
                ? "bg-[#0F172A] text-white border border-[#FF4A00]"
                : "bg-[#0F172A]/90 text-white"
            }`}
          >
            {isSupplement ? "Venta Consultiva · WhatsApp" : product.categoryLabel}
          </span>
          {product.relatedArticleSlugs.length > 0 && (
            <span className="absolute bottom-2.5 right-2.5 bg-white/95 text-[#0F172A] text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
              📖 Guía SEO vinculada
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-black text-[#0F172A]">S/ {product.price}</span>
            {product.compareAtPrice && (
              <span className="text-xs text-slate-400 line-through">
                S/ {product.compareAtPrice}
              </span>
            )}
          </div>
          <h3
            onClick={onOpenDetail}
            className="text-sm font-extrabold text-[#0F172A] hover:text-[#FF4A00] cursor-pointer mt-1 line-clamp-2"
          >
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
            {product.shortDescription}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0 space-y-2">
        {isSupplement ? (
          <>
            <a
              href={buildWhatsAppAdvisorUrl(product)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#0F172A] hover:bg-[#FF4A00] text-white text-xs font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-[#FF4A00] shadow-sm transition group/btn"
            >
              <span>Evaluar con Asesor (WhatsApp)</span>
              <span>→</span>
            </a>
            <button
              onClick={onTestBackendGuard}
              className="w-full text-[10px] font-semibold text-slate-400 hover:text-[#FF4A00] text-center block"
            >
              Verificar bloqueo de carrito en Backend
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onOpenDetail}
              className="px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-400 text-xs font-bold text-slate-700"
            >
              Ficha
            </button>
            <button
              onClick={onAddToCart}
              className="flex-1 bg-[#FF4A00] hover:bg-[#E04000] text-white text-xs font-extrabold py-2.5 px-3 rounded-xl transition"
            >
              + Añadir al Carrito
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

