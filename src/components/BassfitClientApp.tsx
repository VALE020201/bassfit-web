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
  getProductRecommendations,
  getCategoryRecommendations,
  TUTORIALS_DATA,
  COMMUNITY_EVENTS_DATA,
  buildGoogleCalendarUrl,
  TutorialItem,
  CommunityEvent,
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
  const [activeTab, setActiveTab] = useState<TabType>(() => { try { const p = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("tab") || window.location.hash.replace("#", "")) : ""; if (["home", "shop", "asesorias", "vlogs", "contacto"].includes(p)) return p as TabType; } catch(e) {} return "home"; });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => { try { const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cat") : ""; if (p) return p; } catch(e) {} return "todos"; });
  const [searchQuery, setSearchQuery] = useState<string>(() => { try { const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") : ""; if (p) return p; } catch(e) {} return ""; });
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
  const [heroSlide, setHeroSlide] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = parseInt(params.get("slide") || "", 10);
      if (!isNaN(s) && s >= 0 && s < 4) return s;
    }
    return 0;
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Noticias tab state & Dynamic Events Agenda
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("event");
      if (p !== null) {
        const idx = parseInt(p, 10);
        if (!isNaN(idx) && COMMUNITY_EVENTS_DATA[idx]) return COMMUNITY_EVENTS_DATA[idx];
        const found = COMMUNITY_EVENTS_DATA.find(e => e.id === p || e.title.toLowerCase().includes(p.toLowerCase().replace(/-/g, " ")));
        if (found) return found;
      }
    } catch (e) {}
    return null;
  });
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>("todos");
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>("todos");
  const [eventModalityFilter, setEventModalityFilter] = useState<string>("todos");

  // Persistent Community Events with localStorage
  const [eventsList, setEventsList] = useState<CommunityEvent[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("bassfit_community_events");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error("Error reading bassfit_community_events:", e);
      }
    }
    return COMMUNITY_EVENTS_DATA;
  });

  // Sync events to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bassfit_community_events", JSON.stringify(eventsList));
      } catch (e) {
        console.error("Error saving bassfit_community_events:", e);
      }
    }
  }, [eventsList]);

  // Admin Events State & Form
  const [isAdminEventsOpen, setIsAdminEventsOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<"form" | "list">("form");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const defaultEventForm: CommunityEvent = {
    id: "",
    title: "",
    category: "Entrenamientos especiales",
    modality: "Presencial",
    date: "Sábado, 28 de Noviembre 2026",
    time: "09:00 AM - 11:30 AM",
    startIso: "20261128T140000Z",
    endIso: "20261128T163000Z",
    location: "Parque Miguel de Cervantes (San Isidro, Lima)",
    isVirtual: false,
    virtualLink: "",
    registrationUrl: "",
    description: "",
    instructor: "Head Coach Bassfit",
    badge: "CUPOS LIMITADOS",
    spotsLeft: 15,
    price: "Gratuito",
    requirements: [
      "Ropa deportiva transpirable y calzado adecuado",
      "Botella de agua personal",
      "Puntualidad: registro 15 min antes"
    ],
    image: "images/products/barras-8en1-multifuncional-1.jpg",
    status: "published",
    featured: false
  };

  const [eventFormData, setEventFormData] = useState<CommunityEvent>(defaultEventForm);
  const [reqInput, setReqInput] = useState<string>("");

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    return eventsList
      .filter((evt) => {
        if (eventCategoryFilter !== "todos" && evt.category !== eventCategoryFilter) return false;
        if (eventModalityFilter !== "todos" && evt.modality !== eventModalityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (a.startIso || a.id).localeCompare(b.startIso || b.id);
      });
  }, [eventsList, eventCategoryFilter, eventModalityFilter]);

  // Event Handlers
  const handleOpenNewEventModal = () => {
    setEventFormData({
      ...defaultEventForm,
      id: "evt-" + Date.now()
    });
    setEditingEventId(null);
    setAdminTab("form");
    setIsAdminEventsOpen(true);
  };

  const handleOpenEditEventModal = (evt: CommunityEvent) => {
    setEventFormData({ ...evt });
    setEditingEventId(evt.id);
    setAdminTab("form");
    setIsAdminEventsOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title.trim()) {
      alert("Por favor ingresa un título para el evento.");
      return;
    }
    if (!eventFormData.location.trim()) {
      alert("Por favor ingresa una ubicación o enlace virtual.");
      return;
    }

    if (editingEventId) {
      setEventsList((prev) =>
        prev.map((item) => (item.id === editingEventId ? (eventFormData as CommunityEvent) : item))
      );
      setToastMessage(`✓ Evento "${eventFormData.title}" actualizado con éxito`);
    } else {
      const newEvt: CommunityEvent = {
        ...eventFormData,
        id: eventFormData.id || "evt-" + Date.now()
      };
      setEventsList((prev) => [newEvt, ...prev]);
      setToastMessage(`✓ Nuevo evento "${newEvt.title}" publicado en la agenda`);
    }

    setTimeout(() => setToastMessage(null), 3500);
    setIsAdminEventsOpen(false);
  };

  const handleDeleteEvent = (id: string, title: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el evento "${title}" de la agenda?`)) {
      setEventsList((prev) => prev.filter((item) => item.id !== id));
      setToastMessage(`Evento eliminado de la agenda`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleToggleEventStatus = (id: string, newStatus: "published" | "draft" | "cancelled" | "completed") => {
    setEventsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    setToastMessage(`Estado del evento actualizado`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDuplicateEvent = (evt: CommunityEvent) => {
    const copyEvt: CommunityEvent = {
      ...evt,
      id: "evt-" + Date.now(),
      title: evt.title + " (Copia)",
      status: "draft",
      featured: false
    };
    setEventsList((prev) => [copyEvt, ...prev]);
    setToastMessage(`Evento duplicado en borrador`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleResetDefaultEvents = () => {
    if (window.confirm("¿Restablecer toda la agenda con los 5 eventos oficiales iniciales de Bassfit? (Se sobreescribirán los cambios manuales)")) {
      setEventsList(COMMUNITY_EVENTS_DATA);
      setToastMessage(`Agenda restablecida con eventos por defecto`);
      setTimeout(() => setToastMessage(null), 3000);
      setIsAdminEventsOpen(false);
    }
  };

  const handleAddToGoogleCalendar = (evt: CommunityEvent) => {
    const url = buildGoogleCalendarUrl(evt);
    window.open(url, "_blank", "noopener,noreferrer");
    setToastMessage(`📅 Abriendo Google Calendar para: "${evt.title}"`);
    setTimeout(() => setToastMessage(null), 3500);
  };


  // Cross-selling recommendations
  const recommendedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return getProductRecommendations(selectedProduct);
  }, [selectedProduct]);

  const categoryRecommendations = useMemo(() => {
    if (!selectedCategory || selectedCategory === "todos") return [];
    return getCategoryRecommendations(selectedCategory);
  }, [selectedCategory]);

  // Auto-advance hero carousel every 10 seconds (2 slides)
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 4);
    }, 10000);
    return () => clearInterval(timer);
  }, [heroSlide]);

  const nextHeroSlide = () => setHeroSlide((prev) => (prev + 1) % 4);
  const prevHeroSlide = () => setHeroSlide((prev) => (prev - 1 + 4) % 4);

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleHeroTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleHeroTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    if (diff > 40) {
      nextHeroSlide();
    } else if (diff < -40) {
      prevHeroSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

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
    if (!src) return "images/products/barras-8en1-multifuncional-1.jpg";
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    return src.startsWith("/") ? src.slice(1) : src;
  };

  const buildWhatsAppProductUrl = (product: BassfitProduct, variant?: ProductVariant | null) => {
    if (!product) return "https://wa.me/51967581481";
    let title = product.name;
    if (variant && variant.name) {
      title += ` [Variedad: ${variant.name}]`;
    }
    const tax = product.price * 0.18;
    const total = product.price + tax;
    const text = `Hola Bassfit 👋, deseo consultar y comprar: *${title}* (S/ ${product.price.toFixed(2)} + IGV/IVA 18% = S/ ${total.toFixed(2)}). ¿Tienen disponibilidad inmediata y envíos a mi dirección?`;
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

  const cartTax = useMemo(() => {
    return cartSubtotal * 0.18;
  }, [cartSubtotal]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + cartTax;
  }, [cartSubtotal, cartTax]);

  // WhatsApp cart checkout message
  const handleWhatsAppCartOrder = () => {
    if (cart.length === 0) return;
    let message = "Hola Bassfit 👋, deseo realizar un pedido con los siguientes productos del catálogo oficial:\n\n";
    cart.forEach((item, idx) => {
      const varTxt = item.variant ? ` [Variedad: ${item.variant.name}]` : "";
      message += `${idx + 1}. *${item.product.name}*${varTxt} (x${item.quantity}) - S/ ${(item.product.price * item.quantity).toFixed(2)}\n`;
    });
    message += `\nSubtotal productos: S/ ${cartSubtotal.toFixed(2)}\n`;
    message += `+ IGV / IVA (18% Perú): S/ ${cartTax.toFixed(2)}\n`;
    message += `*TOTAL DEL PEDIDO: S/ ${cartTotal.toFixed(2)}*\n\n`;
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

  // Selección de Productos Estrella para la Landing (Máximo 8 productos destacados)
  const featuredProducts = useMemo(() => {
    const ids = [
      "wa-3421408384612748", // Barras 8en1 Multifuncional para Pared
      "wa-24872571689085748", // Bancas de Entrenamiento Heavy Duty (Plana / Inclinada)
      "wa-3211541572231710",  // Bandas Elásticas Power Loop CrossFit
      "wa-2973371469377261",  // Set de Mancuernas Cromadas con Maleta
      "wa-4858382410901998",  // Faja Cinturilla Avispa
      "wa-2812633812125031",  // Mat de Yoga 6mm, 10mm, 15mm
      "wa-5403327829758785",  // FascialGun | Pistola de Masaje Muscular
      "wa-4946828758741237",  // Accesorios para Máquina de Polea (Tobilleras y Soga)
    ];
    const list = ids.map((id) => BASSFIT_PRODUCTS.find((p) => p.id === id)).filter(Boolean) as BassfitProduct[];
    return list.length ? list : (BASSFIT_PRODUCTS.slice(0, 8) as BassfitProduct[]);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex flex-col font-sans selection:bg-[#FF5500] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <span className="text-[#FF5500] font-black">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

</div>

      {/* MAIN HEADER / NAVBAR (Exact Match to Client Mockup) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo with Athletic Typography and small PERÚ badge */}
          <div
            onClick={() => {
              setActiveTab("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center space-x-2 cursor-pointer select-none group shrink-0"
            title="Bassfit Perú - Inicio"
          >
            <img
              src="images/brand/logo_bassfit_peru.png"
              alt="Bassfit Perú"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain transition group-hover:scale-105"
              style={{ maxHeight: "56px" }}
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

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <button
              onClick={() => setActiveTab("home")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "home"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              INICIO
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer py-1 border-b-2 ${
                activeTab === "shop"
                  ? "border-[#FF5500] text-[#0F172A]"
                  : "border-transparent text-slate-600 hover:text-[#0F172A]"
              }`}
            >
              TIENDA
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
              NOTICIAS
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
            {/* Pill Search Input on desktop */}
            <div className="relative hidden md:block w-44 lg:w-56">
              <input
                type="text"
                placeholder="Buscar productos..."
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
              className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs transition flex items-center space-x-1.5 sm:space-x-2 shadow-md shadow-orange-500/20 cursor-pointer relative"
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


          </div>
        </div>

        {/* Mobile Dedicated Search Bar (Always visible on mobile, outside menus) */}
        <div className="md:hidden max-w-7xl mx-auto px-3 pb-2.5 -mt-0.5">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Buscar en Bassfit (pesas, bandas, yoga...)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== "shop") setActiveTab("shop");
              }}
              className="w-full bg-slate-100 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-9 pr-8 py-2 rounded-xl border border-slate-200 focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] focus:outline-hidden transition shadow-2xs"
            />
            <svg
              className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                title="Borrar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>

      </header>

      {/* MAIN BODY CONTENT */}
      <main className="flex-1 w-full pb-16 sm:pb-8">
        {/* ========================================================================= */}
        {/* TAB 1: HOME (Exact replica of the client's design mockup)                 */}
        {/* ========================================================================= */}
        {activeTab === "home" && (
          <div className="space-y-12 sm:space-y-16 pb-16">
            {/* WRAPPER SIN FRANJA BLANCA: Une Hero y Barra de Ventajas en fondo continuo oscuro */}
            <div className="w-full bg-[#0F172A]">
              <section
                className="relative w-full bg-[#0F172A] overflow-hidden select-none"
                onTouchStart={handleHeroTouchStart}
                onTouchMove={handleHeroTouchMove}
                onTouchEnd={handleHeroTouchEnd}
              >
                {/* Lateral Navigation Arrows */}
                <button
                  onClick={prevHeroSlide}
                  aria-label="Diapositiva anterior"
                  className="absolute left-2 sm:left-4 top-1/3 sm:top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/40 sm:bg-white/90 hover:bg-black/60 sm:hover:bg-white text-white sm:text-slate-800 shadow-md backdrop-blur-xs flex items-center justify-center transition transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20 sm:border-slate-200/80"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextHeroSlide}
                  aria-label="Siguiente diapositiva"
                  className="absolute right-2 sm:right-4 top-1/3 sm:top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/40 sm:bg-white/90 hover:bg-black/60 sm:hover:bg-white text-white sm:text-slate-800 shadow-md backdrop-blur-xs flex items-center justify-center transition transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20 sm:border-slate-200/80"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Carousel Track (4 Brand-Coherent Slides) */}
                <div
                  className="flex w-full transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${heroSlide * 100}%)` }}
                >
                  {/* SLIDE 0: ASESORÍAS & COACHING 1 A 1 */}
                  <div className="w-full flex-shrink-0 relative overflow-hidden bg-[#0F172A]">
                    <div className="hidden sm:block relative w-full overflow-hidden" style={{ aspectRatio: "1024 / 341", minHeight: "280px", maxHeight: "560px" }}>
                      <img
                        src="images/hero_banner_bf_2x.png"
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        alt="Bassfit Programas de Entrenamiento y Asesoría 1 a 1"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
                        onError={(e) => { e.currentTarget.src = "images/hero_banner_bf.png"; }}
                      />
                      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center">
                        <div className="w-[56%] md:w-[50%] lg:w-[46%] space-y-2 md:space-y-3 lg:space-y-4">
                          <div className="inline-flex items-center space-x-2 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-orange-200 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-800">
                              ★ Programas de Entrenamiento & Coaching 1 a 1
                            </span>
                          </div>
                          <h1 className="font-athletic text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-[#0F172A] uppercase leading-[0.92] tracking-tight">
                            TRANSFORMA TU VIDA<br />
                            <span className="text-[#FF5500]">CON ENTRENAMIENTO REAL</span>
                          </h1>
                          <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-slate-600 font-medium leading-relaxed line-clamp-2 md:line-clamp-3 max-w-md">
                            «...fitness sin límites de edad..» — Planes de fuerza, calistenia y acondicionamiento con seguimiento diario por WhatsApp con el Head Coach.
                          </p>
                          <div className="flex items-center space-x-2 md:space-x-3 pt-1 md:pt-2">
                            <button
                              onClick={() => {
                                const el = document.getElementById("programas-entrenamiento");
                                if (el) el.scrollIntoView({ behavior: "smooth" });
                                else setActiveTab("asesorias");
                              }}
                              className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-5 md:px-7 py-2.5 md:py-3.5 rounded-full shadow-lg shadow-orange-500/25 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>UNIRME A LOS ENTRENAMIENTOS</span>
                              <span>→</span>
                            </button>
                            <button
                              onClick={() => setActiveTab("vlogs")}
                              className="bg-white/90 hover:bg-white text-slate-800 font-bold text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-4 md:px-5 py-2.5 md:py-3.5 rounded-full border border-slate-300 shadow-2xs transition cursor-pointer"
                            >
                              Ver Clases & Eventos
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Slide 0 */}
                    <div className="sm:hidden relative w-full h-[450px] overflow-hidden bg-slate-950 flex flex-col justify-end p-5 select-none">
                      <img
                        src="images/mockup_vlog_hd.jpg"
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        alt="Coaching Deportivo Bassfit"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-40"
                        onError={(e) => { e.currentTarget.src = "images/hero_runner_hd.png"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
                      <div className="relative z-10 space-y-2.5 text-left pb-4">
                        <div className="inline-flex items-center space-x-1.5 bg-orange-500/20 border border-orange-500/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">★ COACHING PERSONALIZADO 1 A 1</span>
                        </div>
                        <h1 className="font-athletic text-2xl font-black text-white uppercase leading-[0.92] tracking-tight">
                          TRANSFORMA TU VIDA<br />
                          <span className="text-[#FF5500]">ENTRENAMIENTO REAL</span>
                        </h1>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed line-clamp-2">
                          Planes personalizados de fuerza, calistenia y longevidad activa con coach 1 a 1 por WhatsApp.
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 w-full">
                          <button
                            onClick={() => {
                              const el = document.getElementById("programas-entrenamiento");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                              else setActiveTab("asesorias");
                            }}
                            className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-[11px] uppercase tracking-wider py-3 rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition text-center flex items-center justify-center space-x-1"
                          >
                            <span>Ver Planes</span>
                            <span>→</span>
                          </button>
                          <button
                            onClick={() => setActiveTab("vlogs")}
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] uppercase tracking-wider py-3 rounded-full border border-white/25 backdrop-blur-xs flex items-center justify-center space-x-1 active:scale-95 transition"
                          >
                            <span>Ver Clases</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SLIDE 1: EQUIPAMIENTO & BARRAS 8 EN 1 (CATÁLOGO OFICIAL) */}
                  <div className="w-full flex-shrink-0 relative overflow-hidden bg-[#0F172A]">
                    <div className="hidden sm:block relative w-full overflow-hidden" style={{ aspectRatio: "1024 / 341", minHeight: "280px", maxHeight: "560px" }}>
                      <img
                        src="images/hero_runner_hd.png"
                        loading="eager"
                        decoding="async"
                        alt="Bassfit Catálogo Oficial de Implementos y Barras 8en1"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-40"
                        onError={(e) => { e.currentTarget.src = "images/hero_banner_bf.png"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent pointer-events-none" />
                      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center">
                        <div className="w-[56%] md:w-[50%] lg:w-[46%] space-y-2 md:space-y-3 lg:space-y-4">
                          <div className="inline-flex items-center space-x-2 bg-orange-500/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-orange-400">
                              ⚡ TIENDA OFICIAL BASSFIT PERÚ · ENVÍOS A TODO EL PAÍS
                            </span>
                          </div>
                          <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white uppercase leading-[0.92] tracking-tight">
                            BARRAS 8 EN 1 & PESAS<br />
                            <span className="text-[#FF5500]">EQUIPAMIENTO DE ÉLITE</span>
                          </h2>
                          <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-slate-300 font-medium leading-relaxed line-clamp-2 md:line-clamp-3 max-w-md">
                            Barras multifunción de calistenia, mancuernas, bancas y accesorios de alto impacto diseñados para tu entrenamiento en casa o gimnasio.
                          </p>
                          <div className="flex items-center space-x-2 md:space-x-3 pt-1 md:pt-2">
                            <button
                              onClick={() => { setActiveTab("shop"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-5 md:px-7 py-2.5 md:py-3.5 rounded-full shadow-lg shadow-orange-500/25 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>EXPLORAR CATÁLOGO</span>
                              <span>→</span>
                            </button>
                            <a
                              href="https://wa.me/51967581481?text=Hola%20Bassfit!%20Deseo%20informaci%C3%B3n%20sobre%20el%20cat%C3%A1logo%20de%20implementos%20y%20barras%208en1."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-4 md:px-5 py-2.5 md:py-3.5 rounded-full border border-white/25 backdrop-blur-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              Pedir por WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Slide 1 */}
                    <div className="sm:hidden relative w-full h-[450px] bg-slate-950 flex flex-col justify-end p-5 select-none overflow-hidden">
                      <img
                        src="images/products/barras-8en1-multifuncional-1.jpg"
                        loading="eager"
                        decoding="async"
                        alt="Barras 8 en 1 Bassfit"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-40"
                        onError={(e) => { e.currentTarget.src = "images/hero_runner_hd.png"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
                      <div className="relative z-10 space-y-2.5 text-left pb-4">
                        <div className="inline-flex items-center space-x-1.5 bg-orange-500/20 border border-orange-500/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">⚡ IMPLEMENTOS PRO BASSFIT</span>
                        </div>
                        <h2 className="font-athletic text-2xl font-black text-white uppercase leading-[0.92] tracking-tight">
                          BARRAS 8 EN 1 & PESAS<br />
                          <span className="text-[#FF5500]">EQUIPAMIENTO DE ÉLITE</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed line-clamp-2">
                          Calistenia, fuerza y accesorios de máxima durabilidad con despacho directo a todo el Perú.
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 w-full">
                          <button
                            onClick={() => { setActiveTab("shop"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-[11px] uppercase tracking-wider py-3 rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition text-center flex items-center justify-center space-x-1"
                          >
                            <span>Ver Catálogo</span>
                            <span>→</span>
                          </button>
                          <a
                            href="https://wa.me/51967581481?text=Hola%20Bassfit!%20Deseo%20consultar%20por%20las%20barras%208en1."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] uppercase tracking-wider py-3 rounded-full border border-white/25 backdrop-blur-xs flex items-center justify-center space-x-1 active:scale-95 transition text-center"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SLIDE 2: COMUNIDAD & EVENTOS EN VIVO */}
                  <div className="w-full flex-shrink-0 relative overflow-hidden bg-[#EAEDF1]">
                    <div className="hidden sm:block relative w-full overflow-hidden" style={{ aspectRatio: "1024 / 341", minHeight: "280px", maxHeight: "560px" }}>
                      <img
                        src="images/hero_banner_asesorias.png"
                        loading="eager"
                        decoding="async"
                        alt="Bassfit Comunidad, Masterclasses y Eventos en Vivo"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
                      />
                      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center">
                        <div className="w-[56%] md:w-[50%] lg:w-[46%] space-y-2 md:space-y-3 lg:space-y-4">
                          <div className="inline-flex items-center space-x-2 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-cyan-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-[#00C4D4] animate-pulse" />
                            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-slate-800">
                              ★ Comunidad Deportiva & Clases en Vivo
                            </span>
                          </div>
                          <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-[#0F172A] uppercase leading-[0.92] tracking-tight">
                            APRENDE LA TÉCNICA<br />
                            <span className="text-[#00C4D4]">SUPERA TUS METAS</span>
                          </h2>
                          <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-slate-600 font-medium leading-relaxed line-clamp-2 md:line-clamp-3 max-w-md">
                            Masterclasses presenciales en parques de Lima, clases funcionales online y seguimiento biomecánico para entrenar seguro y sin lesiones.
                          </p>
                          <div className="flex items-center space-x-2 md:space-x-3 pt-1 md:pt-2">
                            <button
                              onClick={() => { setActiveTab("vlogs"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className="bg-[#00C4D4] hover:bg-[#00adc0] text-slate-950 font-black text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-5 md:px-7 py-2.5 md:py-3.5 rounded-full shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>VER PRÓXIMAS ACTIVIDADES</span>
                              <span>→</span>
                            </button>
                            <button
                              onClick={() => setIsVideoModalOpen(true)}
                              className="bg-white/90 hover:bg-white text-slate-800 font-bold text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-4 md:px-5 py-2.5 md:py-3.5 rounded-full border border-slate-300 shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span className="w-4 h-4 rounded-full bg-[#00C4D4] text-white flex items-center justify-center text-[8px] font-black">▶</span>
                              <span>Ver Video Rutina</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Slide 2 */}
                    <div className="sm:hidden relative w-full h-[450px] bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
                      <div className="relative w-full h-[230px] bg-[#EAEDF1] overflow-hidden">
                        <img
                          src="images/hero_banner_asesorias.png"
                          loading="eager"
                          decoding="async"
                          alt="Bassfit Comunidad y Clases en Vivo"
                          className="w-full h-full object-cover select-none pointer-events-none"
                          style={{ objectPosition: "75% center" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950 pointer-events-none" />
                        <div className="absolute top-3 left-3 bg-[#00C4D4] text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                          ● COMUNIDAD & CLASES EN VIVO
                        </div>
                      </div>
                      <div className="p-4 space-y-2.5 z-10 text-left pb-5">
                        <h2 className="font-athletic text-2xl font-black text-white uppercase leading-[0.92] tracking-tight">
                          APRENDE LA TÉCNICA<br />
                          <span className="text-[#00C4D4]">SUPERA TUS METAS</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed line-clamp-2">
                          Masterclasses presenciales en parques de Lima y clases virtuales en vivo con corrección técnica.
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 w-full">
                          <button
                            onClick={() => { setActiveTab("vlogs"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            className="bg-[#00C4D4] hover:bg-[#00adc0] text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-full shadow-lg shadow-cyan-500/30 active:scale-95 transition text-center flex items-center justify-center space-x-1"
                          >
                            <span>Ver Agenda</span>
                            <span>→</span>
                          </button>
                          <button
                            onClick={() => setIsVideoModalOpen(true)}
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-full border border-white/25 backdrop-blur-xs flex items-center justify-center space-x-1 active:scale-95 transition"
                          >
                            <span className="text-[#00D1FF] text-[8px]">▶</span>
                            <span>Ver Video</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SLIDE 3: FAJAS REDUCTORAS & RECUPERACIÓN */}
                  <div className="w-full flex-shrink-0 relative overflow-hidden bg-[#0F172A]">
                    <div className="hidden sm:block relative w-full overflow-hidden" style={{ aspectRatio: "1024 / 341", minHeight: "280px", maxHeight: "560px" }}>
                      <img
                        src="images/hero_banner_bf.png"
                        loading="eager"
                        decoding="async"
                        alt="Línea Exclusiva de Fajas Reductoras Bassfit"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-40"
                        onError={(e) => { e.currentTarget.src = "images/hero_runner_hd.png"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent pointer-events-none" />
                      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 h-full flex items-center">
                        <div className="w-[56%] md:w-[50%] lg:w-[46%] space-y-2 md:space-y-3 lg:space-y-4">
                          <div className="inline-flex items-center space-x-2 bg-orange-500/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-orange-500/40 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-wider text-orange-400">
                              🔥 LÍNEA EXCLUSIVA DE FAJAS & RECUPERACIÓN
                            </span>
                          </div>
                          <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white uppercase leading-[0.92] tracking-tight">
                            MOLDEA TU FIGURA<br />
                            <span className="text-[#FF5500]">MÁXIMO RENDIMIENTO</span>
                          </h2>
                          <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-slate-300 font-medium leading-relaxed line-clamp-2 md:line-clamp-3 max-w-md">
                            Fajas cinturilla avispa, chalecos térmicos de neopreno y geles lipo reductores para soporte postural y definición de cintura.
                          </p>
                          <div className="flex items-center space-x-2 md:space-x-3 pt-1 md:pt-2">
                            <button
                              onClick={() => {
                                setActiveTab("shop");
                                setSelectedCategory("fajas-reductoras");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-5 md:px-7 py-2.5 md:py-3.5 rounded-full shadow-lg shadow-orange-500/25 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>VER LÍNEA DE FAJAS</span>
                              <span>→</span>
                            </button>
                            <a
                              href="https://wa.me/51967581481?text=Hola%20Bassfit!%20Deseo%20asesor%C3%ADa%20sobre%20las%20tallas%20de%20fajas%20cinturilla%20avispa%20y%20chalecos."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] md:text-xs lg:text-sm uppercase tracking-wider px-4 md:px-5 py-2.5 md:py-3.5 rounded-full border border-white/25 backdrop-blur-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              Guía de Tallas WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Slide 3 */}
                    <div className="sm:hidden relative w-full h-[450px] bg-slate-950 flex flex-col justify-end p-5 select-none overflow-hidden">
                      <img
                        src="images/products/faja-chaleco-1.jpg"
                        loading="eager"
                        decoding="async"
                        alt="Faja Chaleco Neopreno Bassfit"
                        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-40"
                        onError={(e) => { e.currentTarget.src = "images/hero_runner_hd.png"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
                      <div className="relative z-10 space-y-2.5 text-left pb-4">
                        <div className="inline-flex items-center space-x-1.5 bg-orange-500/20 border border-orange-500/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">🔥 FAJAS & MOLDEADO CORPORAL</span>
                        </div>
                        <h2 className="font-athletic text-2xl font-black text-white uppercase leading-[0.92] tracking-tight">
                          MOLDEA TU FIGURA<br />
                          <span className="text-[#FF5500]">MÁXIMO RENDIMIENTO</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed line-clamp-2">
                          Fajas avispa de neopreno y chalecos térmicos para soporte lumbar y quema calórica.
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 w-full">
                          <button
                            onClick={() => {
                              setActiveTab("shop");
                              setSelectedCategory("fajas-reductoras");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="bg-[#FF5500] hover:bg-[#e04a00] text-white font-black text-[11px] uppercase tracking-wider py-3 rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition text-center flex items-center justify-center space-x-1"
                          >
                            <span>Ver Fajas</span>
                            <span>→</span>
                          </button>
                          <a
                            href="https://wa.me/51967581481?text=Hola%20Bassfit!%20Deseo%20consultar%20tallas%20de%20fajas."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] uppercase tracking-wider py-3 rounded-full border border-white/25 backdrop-blur-xs flex items-center justify-center space-x-1 active:scale-95 transition text-center"
                          >
                            Guía Tallas
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Pagination Indicators */}
                <div className="absolute bottom-2.5 sm:bottom-4 inset-x-0 flex justify-center items-center space-x-2 z-30 pointer-events-auto">
                  {[0, 1, 2, 3].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setHeroSlide(idx)}
                      aria-label={`Ir a diapositiva ${idx + 1}`}
                      className={`transition-all duration-300 rounded-full cursor-pointer border border-black/10 ${
                        heroSlide === idx
                          ? "w-7 sm:w-9 h-2 sm:h-2.5 bg-[#FF5500] shadow-sm"
                          : "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-slate-300/90 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              </section>

              {/* SECCIÓN VENTAJAS CORPORATIVAS (Conectada directamente al fondo oscuro sin franja blanca) */}
              <section className="bg-slate-900 border-b border-slate-800 text-white py-5 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="flex items-start space-x-3 p-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-[#FF5500] font-black text-lg flex-shrink-0">
                      🎯
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Planes a tu Medida</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Adaptados a tu espacio, nivel y metas personales</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[#00C4D4] font-black text-lg flex-shrink-0">
                      📱
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Coaching por WhatsApp</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Corrección de técnica por video 1 a 1</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg flex-shrink-0">
                      🌿
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Sin Límites de Edad</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Salud articular y longevidad activa (+40)</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg flex-shrink-0">
                      🤝
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Comunidad Activa</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Masterclasses y entrenamientos grupales</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ===================================================================== */}
            {/* SECCIÓN 1: PROGRAMAS DE ASESORÍA PERSONALIZADA (SERVICIOS CORE)       */}
            {/* ===================================================================== */}
            <section id="programas-entrenamiento" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#FF5500] bg-orange-50 px-3.5 py-1 rounded-full border border-orange-200 inline-block shadow-2xs">
                  ★ Servicios de Entrenamiento Bassfit
                </span>
                <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl font-black text-[#0F172A] uppercase tracking-tight">
                  PROGRAMAS DE ENTRENAMIENTO & ASESORÍA
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Elige el plan ideal según tu disciplina y nivel. Cada programa incluye diagnóstico inicial, videos paso a paso y seguimiento directo por WhatsApp con tu coach.
                </p>
              </div>

              {/* Grid 4 Program Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {TRAINING_PROGRAMS.map((program) => {
                  const whatsappMsg = encodeURIComponent(
                    `Hola Bassfit! Deseo inscribirme y recibir información del programa de entrenamiento: ${program.title} (Tarifa: S/ ${program.priceMonthly}/mes). ¿Cuáles son los siguientes pasos?`
                  );
                  const whatsappUrl = `https://wa.me/51967581481?text=${whatsappMsg}`;

                  return (
                    <div
                      key={program.id}
                      className={`rounded-3xl border transition-all duration-300 p-6 flex flex-col justify-between hover:shadow-xl relative ${
                        program.highlighted
                          ? "bg-white border-[#FF5500] shadow-lg shadow-orange-500/10 ring-2 ring-orange-500/20"
                          : "bg-white border-slate-200/90 hover:border-orange-300"
                      }`}
                    >
                      {program.highlighted && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF5500] text-white text-[9px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                          RECOMENDADO BASSFIT
                        </span>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="bg-orange-50 text-[#FF5500] text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {program.badge}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {program.level}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-snug">
                            {program.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {program.subtitle}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            ¿Qué incluye tu plan?
                          </span>
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            {program.includes.slice(0, 3).map((inc, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="text-[#FF5500] font-bold mt-0.5">✓</span>
                                <span className="line-clamp-2 text-[11px] leading-tight">{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-5 border-t border-slate-100 mt-4 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500">Inversión mensual:</span>
                          <span className="text-xl font-black text-slate-900">
                            S/ {program.priceMonthly} <span className="text-xs font-normal text-slate-400">/ mes</span>
                          </span>
                        </div>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-[#FF5500] hover:bg-[#e04a00] text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl transition text-center flex items-center justify-center space-x-1 shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
                        >
                          <span>Inscribirme por WhatsApp</span>
                          <span>→</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("asesorias");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-[#FF5500] transition cursor-pointer"
                        >
                          Ver ficha completa del programa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ===================================================================== */}
            {/* SECCIÓN 2: METODOLOGÍA BASSFIT (3 PASOS DE TRANSFORMACIÓN)            */}
            {/* ===================================================================== */}
            <section className="bg-slate-50 border-y border-slate-200/80 py-10 sm:py-14">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#00C4D4] bg-cyan-50 px-3.5 py-1 rounded-full border border-cyan-200 inline-block shadow-2xs">
                    Coaching Sin Fricción
                  </span>
                  <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl font-black text-[#0F172A] uppercase tracking-tight">
                    CÓMO FUNCIONA TU ASESORÍA EN 3 PASOS
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    No estás solo frente a una pantalla con un PDF genérico. Cuentas con un Head Coach que planifica, evalúa y perfecciona tu técnica semana a semana.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 relative">
                    <span className="text-4xl sm:text-5xl font-black text-slate-100 absolute top-5 right-6 select-none">
                      01
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-xl text-[#FF5500]">
                      📋
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                      Diagnóstico Inicial
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Evaluamos por videollamada tu movilidad articular, historial de entrenamiento o lesiones, tiempo disponible y el equipamiento que tengas en casa o gimnasio.
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 relative">
                    <span className="text-4xl sm:text-5xl font-black text-slate-100 absolute top-5 right-6 select-none">
                      02
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-xl text-[#00C4D4]">
                      🎬
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                      Plan en Video Paso a Paso
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Recibes tu rutina semanal con series, repeticiones y videos demostrativos donde explicamos la postura exacta y la respiración para evitar cualquier lesión.
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 relative">
                    <span className="text-4xl sm:text-5xl font-black text-slate-100 absolute top-5 right-6 select-none">
                      03
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl text-emerald-500">
                      📱
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                      Corrección Directa WhatsApp
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Te grabas haciendo tus ejercicios y los envías a tu coach. Recibes notas de voz y correcciones visuales inmediatas para asegurar tu progreso real.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ===================================================================== */}
            {/* SECCIÓN 3: COMUNIDAD & PRÓXIMAS ACTIVIDADES EN VIVO                   */}
            {/* ===================================================================== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8 sm:mb-10">
                <div className="space-y-2 max-w-xl">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#00C4D4] bg-cyan-50 px-3.5 py-1 rounded-full border border-cyan-200 inline-block shadow-2xs">
                    Agenda Comunitaria
                  </span>
                  <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl font-black text-[#0F172A] uppercase tracking-tight">
                    CLASES EN VIVO & ACTIVIDADES
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Únete a nuestras masterclasses al aire libre y sesiones virtuales guiadas en vivo por nuestros instructores.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("vlogs");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs font-black text-[#FF5500] hover:text-[#e04a00] flex items-center space-x-1 cursor-pointer uppercase tracking-wider"
                >
                  <span>Ver toda la agenda de actividades</span>
                  <span>→</span>
                </button>
              </div>

              {/* 3 Activities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {COMMUNITY_EVENTS_DATA.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-white rounded-3xl border border-slate-200/90 hover:border-cyan-400 hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          event.modality === "Online"
                            ? "bg-cyan-50 text-cyan-600 border border-cyan-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                          {event.modality === "Online" ? "💻 Clase Online" : "📍 Presencial"}
                        </span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                          {event.badge}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-[#FF5500] transition line-clamp-2 leading-snug">
                        {event.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">📅</span>
                          <span className="font-semibold">{event.date}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">⏰</span>
                          <span>{event.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {event.price}
                      </span>
                      <span className="text-xs font-bold text-[#FF5500] group-hover:translate-x-1 transition-transform">
                        Detalles & Calendario →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ===================================================================== */}
            {/* SECCIÓN 4: EQUIPAMIENTO OFICIAL (25% PRODUCTOS COMPLEMENTARIOS)       */}
            {/* ===================================================================== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-slate-200/80">
              <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200 inline-block shadow-2xs">
                  Herramientas para tu Práctica
                </span>
                <h2 className="font-athletic text-2xl sm:text-3xl md:text-4xl font-black text-[#0F172A] uppercase tracking-tight">
                  EQUIPAMIENTO COMPLEMENTARIO RECOMENDADO
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  El entrenamiento y la constancia son el motor de tu salud. Estos son los implementos oficiales más recomendados por nuestros coaches para complementar tus sesiones.
                </p>
              </div>

              {/* 4 Complementary Gear Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
                {featuredProducts.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    onClick={() => openProductModal(product)}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-orange-400 hover:shadow-xl transition-all duration-300 p-3.5 sm:p-4 flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="bg-white rounded-xl aspect-square w-full flex items-center justify-center p-2 relative overflow-hidden border border-slate-100/70">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveImg(product.images[0])}
                        alt={product.name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith("barras-8en1-multifuncional-1.jpg")) {
                            target.src = "images/products/barras-8en1-multifuncional-1.jpg";
                          }
                        }}
                        className="w-full h-full object-contain scale-105 group-hover:scale-115 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 bg-orange-50 text-[#FF5500] border border-orange-200 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {product.categoryLabel.split("&")[0].trim()}
                      </span>
                    </div>

                    <div className="pt-3 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BASSFIT GEAR</span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#FF5500] transition line-clamp-2 leading-snug">
                          {product.name}
                        </h3>
                      </div>
                      <div className="space-y-2 pt-1">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-base sm:text-lg font-black text-slate-900">S/ {product.price.toFixed(2)}</span>
                          {product.compareAtPrice && (
                            <span className="text-xs text-slate-400 line-through">S/ {product.compareAtPrice.toFixed(2)}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openProductModal(product); }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold py-2 rounded-lg transition active:scale-95"
                          >
                            Ficha
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                            className="w-full bg-[#FF5500] hover:bg-[#e04a00] text-white text-[11px] font-bold py-2 rounded-lg transition shadow-xs active:scale-95"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón Grande, Llamativo y Centrado hacia el Catálogo Completo */}
              <div className="pt-10 sm:pt-12 flex flex-col items-center justify-center text-center space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("shop");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group relative inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-[#FF5500] via-[#FF6600] to-[#FF7A00] hover:from-[#e04a00] hover:to-[#ea580c] text-white font-black text-sm sm:text-base uppercase tracking-wider px-8 sm:px-12 py-4 rounded-full shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                >
                  <span>Explorar todo el catálogo de implementos</span>
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium flex items-center justify-center space-x-2">
                  <span>⚡ Stock disponible</span>
                  <span>•</span>
                  <span>🚚 Envíos a todo el Perú</span>
                  <span>•</span>
                  <span>💬 Asesoría directa WhatsApp</span>
                </p>
              </div>
            </section>

            {/* ===================================================================== */}
            {/* SECCIÓN 5: CONSULTA GRATUITA CON EL HEAD COACH (CIERRE DE SERVICIOS)  */}
            {/* ===================================================================== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#0F172A] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
                <div className="relative z-10 max-w-2xl space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00C4D4] bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/40 inline-block">
                    Orientación 1 a 1 Sin Compromiso
                  </span>
                  <h3 className="font-athletic text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight">
                    ¿NO ESTÁS SEGURO DE POR DÓNDE EMPEZAR?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Escríbenos directamente por WhatsApp para una breve evaluación de 10 minutos con nuestro Head Coach. Analizaremos tu caso y te recomendaremos el plan o rutina exacta que necesitas.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <a
                      href="https://wa.me/51967581481?text=Hola%20Head%20Coach%20Bassfit,%20deseo%20agendar%20una%20breve%20orientaci%C3%B3n%20gratuita%20sobre%20los%20planes%20de%20entrenamiento."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#FF5500] hover:bg-[#e04a00] text-white text-xs sm:text-sm font-black uppercase tracking-wider px-6 sm:px-8 py-3.5 rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition flex items-center space-x-2 cursor-pointer"
                    >
                      <span>💬 Hablar con el Head Coach por WhatsApp</span>
                      <span>→</span>
                    </a>
                    <span className="text-[11px] text-slate-400">
                      ⚡ Respuesta promedio: &lt; 15 minutos
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}{activeTab === "shop" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight flex flex-wrap items-center gap-2">
                    <span>Tienda</span>
                    <span className="text-xs font-bold bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Bassfit Perú</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catálogo oficial de implementos deportivos verificados
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

              {/* UNIFIED CATEGORY CARDS & FILTERS (Tienda + Categorías unidas) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF5500]"></span>
                    <span>Explora por Categorías</span>
                  </span>
                  {selectedCategory !== "todos" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("todos")}
                      className="text-xs font-bold text-[#FF5500] hover:underline cursor-pointer"
                    >
                      Ver todos
                    </button>
                  )}
                </div>

                {/* Visual Category Boxes with Corporate Orange Minimalist Icons */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2 select-none">
                  {[
                    { slug: "todos", label: "Todos", icon: "🛒", count: BASSFIT_PRODUCTS.length },
                    { slug: "entrenamiento-fuerza", label: "Fuerza", icon: "🏋️‍♂️", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "entrenamiento-fuerza").length },
                    { slug: "calistenia", label: "Calistenia", icon: "🤸‍♂️", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "calistenia").length },
                    { slug: "yoga-pilates", label: "Yoga & Pilates", icon: "🧘‍♀️", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "yoga-pilates").length },
                    { slug: "fajas-reductoras", label: "Fajas", icon: FajaIcon, count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "fajas-reductoras").length },
                    { slug: "natacion-acuaticos", label: "Natación", icon: "🏊‍♂️", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "natacion-acuaticos").length },
                    { slug: "boxeo-artes-marciales", label: "Boxeo", icon: "🥊", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "boxeo-artes-marciales").length },
                    { slug: "electronicos", label: "Electrónicos", icon: "⚡", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "electronicos").length },
                    { slug: "funcional-resistencia", label: "Funcional", icon: "🎯", count: BASSFIT_PRODUCTS.filter(p => p.categorySlug === "funcional-resistencia").length },
                  ].map((cat) => {
                    const isSelected = selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                          isSelected
                            ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md shadow-slate-900/25 scale-102 ring-2 ring-orange-500/50"
                            : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 hover:border-orange-300 shadow-2xs"
                        }`}
                      >
                        <span className="text-xl sm:text-2xl mb-1">{cat.icon}</span>
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight line-clamp-1">
                          {cat.label}
                        </span>
                        
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

                        {/* CATEGORY CROSS-SELLING / COMPLEMENTARY BLOCK */}
            {selectedCategory !== "todos" && categoryRecommendations.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40 border border-orange-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-base sm:text-lg">⚡</span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                        Completa tu entrenamiento: {PRODUCT_CATEGORIES.find(c => c.slug === selectedCategory)?.label || ""}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Accesorios complementarios más recomendados para esta disciplina
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#FF5500] bg-orange-100/90 px-2.5 py-0.5 rounded-full self-start sm:self-auto uppercase tracking-wider">
                    Recomendados BF
                  </span>
                </div>

                <div className={`grid grid-cols-1 ${categoryRecommendations.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3`}>
                  {categoryRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => openProductModal(rec)}
                      className="bg-white border border-slate-200/90 hover:border-[#FF5500]/60 rounded-xl p-3 transition flex items-center space-x-3 group shadow-2xs hover:shadow-md cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                        <img
                        loading="lazy"
                        decoding="async"
                          src={resolveImg(rec.images[0])}
                          alt={rec.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.endsWith("barras-8en1-multifuncional-1.jpg")) {
                              target.src = "images/products/barras-8en1-multifuncional-1.jpg";
                            }
                          }}
                          className="w-full h-full object-contain scale-105 group-hover:scale-115 transition duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#FF5500] transition truncate">
                          {rec.name}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-black text-[#FF5500]">
                            S/ {rec.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(rec);
                            }}
                            className="bg-[#0F172A] hover:bg-[#FF5500] text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer"
                            title="Añadir al carrito"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
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
                      className="cursor-pointer p-1.5 sm:p-2 bg-white flex items-center justify-center aspect-square w-full relative overflow-hidden"
                    >
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveImg(activeImgSrc)}
                        alt={product.name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith("barras-8en1-multifuncional-1.jpg")) {
                            target.src = "images/products/barras-8en1-multifuncional-1.jpg";
                          }
                        }}
                        className="w-full h-full object-contain scale-105 group-hover:scale-115 transition duration-300"
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
                    <div className="p-3 sm:p-5 border-t border-slate-100 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
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
                          {product.saleMode === "consultative_whatsapp" && (
                            <a
                              href={buildWhatsAppProductUrl(product, activeCardVar)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 text-center cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.196.052.268-.031.072-.082.309-.36.392-.484.082-.124.165-.103.278-.062.113.041.721.34.845.402.124.062.206.093.237.144.031.052.031.3-.113.705z" />
                              </svg>
                              <span>Consultar Asesor WhatsApp</span>
                            </a>
                          )}
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
        {/* TAB 5: VIDEOS & CONSEJOS DE BIENESTAR (Videos and articles)                       */}
        {/* ========================================================================= */}
        {activeTab === "vlogs" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
            {/* Header with Title & Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-[#FF5500] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    COMUNIDAD
                  </span>
                  <span className="text-xs text-slate-500 font-bold">Bassfit Perú Oficial</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                  Agenda de Actividades
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Aprende la técnica correcta con nuestros tutoriales, mantente al día con lanzamientos y participa en nuestros eventos oficiales presenciales y virtuales.
                </p>
              </div>


            </div>

            {/* ============================================================= */}
            {/* 1. PRIMERA SECCIÓN: TUTORIALES Y CONTENIDO EDUCATIVO           */}
            {/* "Aprende con nosotros"                                        */}
            {/* ============================================================= */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                <div>
                  <span className="text-[#FF5500] text-[10px] font-black uppercase tracking-wider block">
                    🎬 Mini Videos, Guías & Biomecánica
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Aprende con nosotros
                  </h2>
                  <p className="text-xs text-slate-500">
                    Aprende a ejecutar cada ejercicio de forma segura y maximiza tus resultados con implementos Bassfit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="text-xs font-bold text-[#FF5500] hover:text-[#d04200] flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
                >
                  <span>▶ Ver video general de técnica</span>
                  <span>→</span>
                </button>
              </div>

              {/* Grid / Horizontal Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TUTORIALS_DATA.map((tut) => (
                  <div
                    key={tut.id}
                    onClick={() => setSelectedTutorial(tut)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-orange-200 transition cursor-pointer flex flex-col justify-between group transform hover:-translate-y-0.5"
                  >
                    <div className="relative h-40 bg-slate-900 overflow-hidden">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveImg(tut.image)}
                        alt={tut.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>
                      <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                        <span className="bg-[#FF5500] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {tut.badge}
                        </span>
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                          ⏱ {tut.duration}
                        </span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <span className="text-sm font-black pl-0.5">▶</span>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block">
                          {tut.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#FF5500] transition line-clamp-2 leading-snug">
                          {tut.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {tut.description}
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[130px]">
                          👤 {tut.coachName}
                        </span>
                        <span className="text-[#FF5500] font-bold group-hover:translate-x-1 transition-transform">
                          Ver guía →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ============================================================= */}
            {/* 2. SEGUNDA SECCIÓN: PRÓXIMOS EVENTOS Y ACTIVIDADES             */}
            {/* Agenda Dinámica con Google Calendar y Gestor                   */}
            {/* ============================================================= */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Agenda en Vivo ({filteredEvents.length} {filteredEvents.length === 1 ? "actividad" : "actividades"})
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                    Próximos eventos y actividades
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
                    ¡Entérate de nuestras próximas actividades! Participa en clases online, encuentros presenciales, eventos deportivos, ferias y muchas experiencias más.
                  </p>
                </div>


              </div>

              {/* Category & Modality Filters */}
              <div className="space-y-2.5">
                {/* Category Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: "todos", label: "Todos los eventos", icon: "🗓️" },
                    { id: "Clases online", label: "Clases online", icon: "💻" },
                    { id: "Eventos presenciales", label: "Eventos presenciales", icon: "📍" },
                    { id: "Stands y ferias", label: "Stands y ferias", icon: "🎪" },
                    { id: "Entrenamientos especiales", label: "Entrenamientos especiales", icon: "🏋️‍♂️" },
                    { id: "Otros eventos", label: "Otros eventos", icon: "⚡" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEventCategoryFilter(cat.id)}
                      className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 border ${
                        eventCategoryFilter === cat.id
                          ? "bg-[#FF5500] text-white border-[#FF5500] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                
              </div>

              {/* Events Cards Grid */}
              {filteredEvents.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
                  <div className="text-4xl">🗓️</div>
                  <h3 className="text-base font-bold text-slate-800">
                    No hay eventos programados en esta categoría
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Prueba cambiando los filtros seleccionados o publica una nueva actividad para la comunidad.
                  </p>
                  <div className="pt-2 flex justify-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEventCategoryFilter("todos");
                        setEventModalityFilter("todos");
                      }}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      Mostrar todos
                    </button>

                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((evt) => {
                    const isCancelled = evt.status === "cancelled";
                    const isDraft = evt.status === "draft";
                    const isCompleted = evt.status === "completed";

                    // Badge category color scheme
                    const categoryColors: Record<string, string> = {
                      "Clases online": "bg-indigo-50 text-indigo-700 border-indigo-200",
                      "Eventos presenciales": "bg-emerald-50 text-emerald-700 border-emerald-200",
                      "Stands y ferias": "bg-amber-50 text-amber-800 border-amber-200",
                      "Entrenamientos especiales": "bg-red-50 text-red-700 border-red-200",
                      "Otros eventos": "bg-purple-50 text-purple-700 border-purple-200"
                    };

                    return (
                      <div
                        key={evt.id}
                        className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative ${
                          isCancelled ? "opacity-75 grayscale-25" : ""
                        }`}
                      >
                        {/* Event Image & Badges */}
                        <div className="relative h-48 bg-slate-900 overflow-hidden">
                          <img
                        loading="lazy"
                        decoding="async"
                            src={resolveImg(evt.image)}
                            alt={evt.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md shadow-xs ${
                                evt.modality === "Online"
                                  ? "bg-blue-600/90 text-white"
                                  : "bg-[#FF5500]/95 text-white"
                              }`}>
                                {evt.modality === "Online" ? "💻 Online" : "📍 Presencial"}
                              </span>
                              {evt.featured && (
                                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-xs flex items-center space-x-1">
                                  <span>⭐</span>
                                  <span>Destacado</span>
                                </span>
                              )}
                              {isCancelled && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-xs">
                                  CANCELADO
                                </span>
                              )}
                              {isDraft && (
                                <span className="bg-slate-700 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-xs">
                                  BORRADOR
                                </span>
                              )}
                              {isCompleted && (
                                <span className="bg-slate-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-xs">
                                  FINALIZADO
                                </span>
                              )}
                            </div>


                          </div>

                          {/* Bottom Category pill on image */}
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-white/95 backdrop-blur-xs ${
                              categoryColors[evt.category] || "text-slate-800"
                            }`}>
                              {evt.category}
                            </span>
                            <span className="text-[10px] font-bold text-white/90 bg-black/50 px-2 py-0.5 rounded-full">
                              {evt.price || "Gratuito"}
                            </span>
                          </div>
                        </div>

                        {/* Event Content */}
                        <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {/* Date and Time Header */}
                            <div className="flex items-center space-x-2 text-xs font-bold text-[#FF5500]">
                              <span>📅</span>
                              <span>{evt.date}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-semibold">{evt.time}</span>
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-black text-slate-900 group-hover:text-[#FF5500] transition line-clamp-2 leading-snug">
                              {evt.title}
                            </h3>

                            {/* Location / Virtual badge */}
                            <div className="flex items-start space-x-1.5 text-xs text-slate-600">
                              <span className="shrink-0 text-slate-400 mt-0.5">
                                {evt.isVirtual ? "🔗" : "📍"}
                              </span>
                              <span className="line-clamp-1">
                                {evt.location}
                              </span>
                            </div>

                            {/* Instructor / Coach */}
                            {evt.instructor && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                <span className="font-bold text-slate-700">A cargo:</span> {evt.instructor}
                              </p>
                            )}

                            {/* Short Description */}
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {evt.description}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1">
                              <span>👥 Cupos disponibles: <strong className="text-slate-800">{evt.spotsLeft ?? "Libre"}</strong></span>
                              <span className="font-bold text-emerald-600">{evt.price || "Gratuito"}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedEvent(evt)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer text-center"
                              >
                                Ver detalles
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddToGoogleCalendar(evt)}
                                className="w-full bg-[#0F172A] hover:bg-[#FF5500] text-white font-bold py-2.5 px-2 rounded-xl text-xs transition flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                                title="Agregar a Google Calendar"
                              >
                                <span>📅</span>
                                <span>+ Calendario</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* 3. TERCERA SECCIÓN: ARTÍCULOS & GUÍAS PERMANENTES             */}
            {/* ============================================================= */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                <div>
                  <span className="text-[#FF5500] text-[10px] font-black uppercase tracking-wider block">
                    📖 Lecturas Esenciales
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Artículos & Consejos de Entrenamiento
                  </h2>
                  <p className="text-xs text-slate-500">
                    Conceptos fundamentales sobre nutrición deportiva, descanso y biomecánica para elevar tu rendimiento.
                  </p>
                </div>
              </div>

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
        )}        {/* ========================================================================= */}
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
                  href="https://api.whatsapp.com/send/?phone=51967581481&text=%C2%A1Hola%21%20%F0%9F%91%8B%20Estoy%20interesado%2Fa%20en%20conocer%20m%C3%A1s%20sobre%20sus%20productos.%20%C2%BFPodr%C3%ADan%20brindarme%20informaci%C3%B3n%20y%20asesorarme%3F%20%F0%9F%9B%8D%EF%B8%8F"
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
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center items-end sm:items-center p-0 sm:p-6"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-4 mb-6 sticky -top-6 bg-white/95 backdrop-blur-md pt-2 z-10">
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                {selectedProduct.categoryLabel}
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
                        loading="lazy"
                        decoding="async"
                    src={resolveImg(selectedProduct.images[activeImgIdx % selectedProduct.images.length])}
                    alt={selectedProduct.name}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith("barras-8en1-multifuncional-1.jpg")) {
                        target.src = "images/products/barras-8en1-multifuncional-1.jpg";
                      }
                    }}
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
                        loading="lazy"
                        decoding="async"
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
                  <span className="text-xs font-semibold text-slate-500">
                    + IGV (18% Perú) al finalizar
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
                  {selectedProduct && selectedProduct.saleMode === "consultative_whatsapp" && (
                    <a
                      href={buildWhatsAppProductUrl(selectedProduct, selectedVariant)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3.5 rounded-xl text-xs transition flex items-center justify-center space-x-2 text-center cursor-pointer shadow-md"
                    >
                      <span>Consultar Asesor por WhatsApp</span>
                      <span>→</span>
                    </a>
                  )}
                </div>

                {/* ========================================================================= */}
                {/* CROSS-SELLING: COMPLETA TU ENTRENAMIENTO                                 */}
                {/* ========================================================================= */}
                {recommendedProducts.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                          <span className="text-[#FF5500]">⚡</span> Completa tu entrenamiento
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Implementos complementarios recomendados para potenciar tus resultados
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-orange-100 text-[#FF5500] px-2.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                        Cross-Selling
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 ${recommendedProducts.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3`}>
                      {recommendedProducts.map((rec) => (
                        <div
                          key={rec.id}
                          className="bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-[#FF5500]/60 rounded-2xl p-3 transition flex flex-col justify-between group shadow-2xs hover:shadow-md"
                        >
                          <div
                            onClick={() => openProductModal(rec)}
                            className="cursor-pointer space-y-2"
                          >
                            <div className="h-24 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden border border-slate-100">
                              <img
                        loading="lazy"
                        decoding="async"
                                src={resolveImg(rec.images[0])}
                                alt={rec.name}
                                className="w-full h-full object-contain scale-105 group-hover:scale-115 transition duration-300"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-[#FF5500] uppercase tracking-wider block">
                                {rec.categoryLabel}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-[#FF5500] transition leading-snug mt-0.5">
                                {rec.name}
                              </h5>
                            </div>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between">
                            <span className="text-xs font-black text-[#0F172A]">
                              S/ {rec.price.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(rec);
                              }}
                              className="bg-[#0F172A] hover:bg-[#FF5500] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                              title="Añadir accesorio complementario al carrito"
                            >
                              <span>+ Añadir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENTRENAMIENTO FITNESS VIDEO (From Vlogs & Wellness Tips)                */}
      {/* ========================================================================= */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md overflow-y-auto flex justify-center items-start sm:items-center p-2.5 sm:p-6"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl relative space-y-4 my-2 sm:my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 sticky -top-4 sm:-top-8 bg-white/95 backdrop-blur-md pt-2 z-20">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-pulse"></span>
                <span className="text-xs font-black text-[#FF5500] uppercase tracking-wider">
                  VLOG & TUTORIAL EXCLUSIVO BASSFIT
                </span>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shrink-0"
              >
                <span>Cerrar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
                <img
                  src="images/mockup_vlog_hd.jpg"
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  alt="Entrenamiento Fitness Video Frame"
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
                  ENTRENAMIENTO FITNESS · Remo con Mancuerna & Fuerza Posterior
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  En esta cápsula guiada por el Head Coach de Bassfit aprenderás cómo fijar la cintura escapular, evitar tirones lumbares y activar al 100% el dorsal ancho utilizando implementos ergonómicos.
                </p>
              </div>

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

              <div className="pt-2 space-y-2">
                <a
                  href="https://wa.me/51967581481?text=Hola%20Coach%20Bassfit%20%F0%9F%91%8B%2C%20vi%20el%20video%20Fitness%20Training%20en%20la%20web%20y%20deseo%20asesor%C3%ADa%20personalizada."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 text-center shadow-md cursor-pointer"
                >
                  <span>Consultar al Coach por WhatsApp</span>
                  <span>→</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition cursor-pointer text-center shadow-xs"
                >
                  ✕ Cerrar video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {/* DRAWER: MOBILE FULL NAVIGATION MENU                                      */}
      {/* ========================================================================= */}
      {/* REDESIGNED MODERN MOBILE SIDE DRAWER */}

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
                      Explora nuestro catálogo de implementos y añade lo que necesites
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
                        loading="lazy"
                        decoding="async"
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
                <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span>Subtotal productos:</span>
                    <span className="font-semibold text-slate-800">S/ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center space-x-1">
                      <span>+ IGV / IVA (18% Perú):</span>
                    </span>
                    <span className="font-bold text-slate-800">+ S/ {cartTax.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">Total a pagar:</span>
                      <span className="text-[10px] text-slate-500 font-medium">Incluye IGV (18% Perú)</span>
                    </div>
                    <span className="text-2xl font-black text-[#FF5500]">
                      S/ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleWhatsAppCartOrder}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold py-3.5 rounded-xl text-xs transition flex items-center justify-center space-x-2 text-center shadow-md cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.08-1.785-.399-1.234-.515-2.025-1.776-2.086-1.857-.061-.081-.5-.666-.5-1.272 0-.606.315-.904.428-1.026.113-.122.247-.153.33-.153.082 0 .165.002.237.006.076.004.179-.029.28.214.103.249.351.856.382.918.031.062.052.134.01.216-.041.082-.062.133-.124.205-.062.072-.131.16-.187.215-.062.062-.127.129-.055.253.072.124.322.531.691.859.475.423.875.555.998.616.124.062.206.093.237.144.031.052.031.3-.113.705z" />
                  </svg>
                  <span>Pedir por WhatsApp (S/ {cartTotal.toFixed(2)})</span>
                </button>
                <div className="text-center text-[10px] text-slate-400">
                  Coordinarás la dirección de entrega y forma de pago directamente por WhatsApp
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL: DETALLES DEL EVENTO COMUNITARIO                                    */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex justify-center items-end sm:items-center p-0 sm:p-6"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-8 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 sticky -top-4 sm:-top-8 bg-white/95 backdrop-blur-md pt-2 z-20">
              <div className="flex items-center space-x-2 min-w-0 pr-2">
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedEvent.modality === "Online"
                    ? "bg-blue-600 text-white"
                    : "bg-[#FF5500] text-white"
                }`}>
                  {selectedEvent.modality === "Online" ? "💻 Online" : "📍 Presencial"}
                </span>
                <span className="text-xs font-bold text-slate-600 uppercase">
                  {selectedEvent.category}
                </span>
                {selectedEvent.featured && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ⭐ Destacado
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shrink-0"
              >
                <span>Cerrar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-900">
                <img
                  loading="lazy"
                  decoding="async"
                  src={resolveImg(selectedEvent.image)}
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                  🎟️ {selectedEvent.price || "Gratuito"} • 👥 Cupos: {selectedEvent.spotsLeft ?? "Libre"}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.instructor && (
                  <p className="text-xs text-[#FF5500] font-bold mt-1">
                    👤 Instructor / Responsable: {selectedEvent.instructor}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center space-x-2 text-slate-800">
                  <span className="text-[#FF5500] font-bold">📆 Fecha:</span>
                  <span className="font-semibold">{selectedEvent.date}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-800">
                  <span className="text-[#FF5500] font-bold">⏰ Horario:</span>
                  <span>{selectedEvent.time}</span>
                </div>
                <div className="flex items-start justify-between gap-2 text-slate-800">
                  <div className="flex items-start space-x-2">
                    <span className="text-[#FF5500] font-bold shrink-0">📍 Ubicación:</span>
                    <span>{selectedEvent.location}</span>
                  </div>
                  {!selectedEvent.isVirtual && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-blue-600 hover:text-blue-800 font-bold underline text-[11px]"
                    >
                      Ver en Google Maps ↗
                    </a>
                  )}
                </div>
                {selectedEvent.isVirtual && selectedEvent.virtualLink && (
                  <div className="flex items-center justify-between gap-2 text-slate-800 pt-2 border-t border-slate-200">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-[#FF5500] font-bold">🔗 Enlace:</span>
                      <span className="truncate text-slate-600 font-mono text-[11px]">{selectedEvent.virtualLink}</span>
                    </div>
                    <a
                      href={selectedEvent.virtualLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-blue-700 transition"
                    >
                      Unirme ↗
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Descripción del evento:
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {selectedEvent.requirements && selectedEvent.requirements.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Requisitos & Qué llevar:
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {selectedEvent.requirements.map((req, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleAddToGoogleCalendar(selectedEvent)}
                  className="w-full bg-[#0F172A] hover:bg-[#FF5500] text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
                >
                  <span>📅</span>
                  <span>Agregar a Google Calendar</span>
                </button>
                <a
                  href={`https://wa.me/51967581481?text=${encodeURIComponent(
                    `Hola equipo Bassfit 👋, deseo confirmar mi asistencia / inscripción al evento: *${selectedEvent.title}* programado para el *${selectedEvent.date}* (${selectedEvent.time}). ¿Hay cupos disponibles?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3 rounded-xl text-xs transition flex items-center justify-center space-x-2 text-center cursor-pointer shadow-xs"
                >
                  <span>📲 Inscribirme por WhatsApp</span>
                  <span>→</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition cursor-pointer text-center mt-2 shadow-xs"
              >
                ✕ Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {selectedTutorial && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md overflow-y-auto flex justify-center items-start sm:items-center p-2.5 sm:p-6"
          onClick={() => setSelectedTutorial(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl relative space-y-4 my-2 sm:my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 sticky -top-4 sm:-top-8 bg-white/95 backdrop-blur-md pt-2 z-20">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-pulse"></span>
                <span className="text-xs font-black text-[#FF5500] uppercase tracking-wider">
                  TUTORIAL EXCLUSIVO BASSFIT
                </span>
              </div>
              <button
                onClick={() => setSelectedTutorial(null)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shrink-0"
              >
                <span>Cerrar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
                <img
                  loading="lazy"
                  decoding="async"
                  src={resolveImg(selectedTutorial.image)}
                  alt={selectedTutorial.title}
                  className="w-full h-64 sm:h-72 object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-5">
                  <div className="flex justify-between items-center text-white text-xs font-bold">
                    <span className="bg-[#FF5500] px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px]">
                      {selectedTutorial.badge}
                    </span>
                    <span>⏱ {selectedTutorial.duration}</span>
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
                    <span>{selectedTutorial.category}</span>
                    <span>1080p Full HD</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {selectedTutorial.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {selectedTutorial.description}
                </p>
                <p className="text-xs text-[#FF5500] font-bold">
                  {selectedTutorial.coachName} • {selectedTutorial.coachRole}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider block">
                  Puntos Clave del Entrenamiento:
                </span>
                <ul className="space-y-1.5 text-slate-600">
                  {selectedTutorial.keySteps.map((step, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-[#FF5500] font-bold">✓</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedTutorial.relatedProductSlug && (() => {
                const relProd = BASSFIT_PRODUCTS.find(p => p.slug === selectedTutorial.relatedProductSlug);
                if (!relProd) return null;
                return (
                  <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveImg(relProd.images[0])}
                        alt={relProd.name}
                        className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-orange-100"
                      />
                      <div>
                        <span className="text-[10px] font-bold text-[#FF5500] uppercase tracking-wider block">
                          Implemento recomendado para este tutorial
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {relProd.name}
                        </h4>
                        <span className="text-xs font-black text-[#0F172A]">
                          S/ {relProd.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTutorial(null);
                        openProductModal(relProd);
                      }}
                      className="bg-[#0F172A] hover:bg-[#FF5500] text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      Ver en tienda →
                    </button>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => setSelectedTutorial(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition cursor-pointer text-center mt-2 shadow-xs"
              >
                ✕ Cerrar tutorial
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#0F172A] text-slate-400 text-xs border-t border-slate-800 py-6 pb-20 sm:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black italic tracking-tight text-white uppercase">
              BASS<span className="text-[#FF5500]">FIT</span>
            </span>
            <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
              PERÚ
            </span>
            <span className="text-slate-500 text-xs hidden sm:inline ml-1">
              · «...fitness sin límites de edad..»
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <button
              onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="hover:text-white transition cursor-pointer"
            >
              Inicio
            </button>
            <span>•</span>
            <button
              onClick={() => { setActiveTab('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="hover:text-white transition cursor-pointer"
            >
              Tienda
            </button>
            <span>•</span>
            <button
              onClick={() => { setActiveTab('asesorias'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="hover:text-white transition cursor-pointer"
            >
              Asesorías
            </button>
            <span>•</span>
            <button
              onClick={() => { setActiveTab('vlogs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="hover:text-white transition cursor-pointer"
            >
              Noticias & Eventos
            </button>
            <span>•</span>
            <a
              href="https://wa.me/51967581481"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition inline-flex items-center space-x-1"
            >
              <span>💬 +51 967 581 481</span>
            </a>
          </div>

          <div className="pt-2 border-t border-slate-800/80 w-full max-w-md text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
            <span>© 2026 BASSFIT PERÚ. Todos los derechos reservados.</span>
            <span>
              Desarrollado por{' '}
              <a
                id="daf-developer-credit"
                href="https://www.dafsoluciones.site/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-[#FF5500] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                title="Daf soluciones tecnológicas"
              >
                Daf soluciones tecnológicas
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* MOBILE QUICK BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Navegación Móvil Rápida"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1 flex items-center justify-around select-none"
      >
        <button
          onClick={() => {
            setActiveTab("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "home" ? "text-[#FF5500] font-black" : "text-slate-500 font-medium hover:text-slate-800"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={activeTab === "home" ? "2.5" : "2"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px]">Inicio</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("shop");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "shop" ? "text-[#FF5500] font-black" : "text-slate-500 font-medium hover:text-slate-800"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={activeTab === "shop" ? "2.5" : "2"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-[10px]">Tienda</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("asesorias");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "asesorias" ? "text-[#FF5500] font-black" : "text-slate-500 font-medium hover:text-slate-800"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={activeTab === "asesorias" ? "2.5" : "2"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[10px]">Asesorías</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("vlogs");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === "vlogs" ? "text-[#FF5500] font-black" : "text-slate-500 font-medium hover:text-slate-800"
          }`}
        >
          <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-[#FF5500] animate-pulse"></span>
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth={activeTab === "vlogs" ? "2.5" : "2"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span className="text-[10px]">Noticias</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 font-medium hover:text-slate-800 transition"
        >
          {cartCount > 0 && (
            <span className="absolute -top-1 right-2 bg-[#FF5500] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
              {cartCount}
            </span>
          )}
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-[10px]">Carrito</span>
        </button>
      </nav>

      {/* FLOATING WHATSAPP BUTTON (Bottom-Right Direct Store Access) */}
      <aside aria-label="Contacto directo por WhatsApp" className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <a
          href="https://api.whatsapp.com/send/?phone=51967581481&text=%C2%A1Hola%21%20%F0%9F%91%8B%20Estoy%20interesado%2Fa%20en%20conocer%20m%C3%A1s%20sobre%20sus%20productos.%20%C2%BFPodr%C3%ADan%20brindarme%20informaci%C3%B3n%20y%20asesorarme%3F%20%F0%9F%9B%8D%EF%B8%8F"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chatear con un asesor de Bassfit Perú por WhatsApp"
          className="group flex items-center drop-shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {/* Tooltip on hover (desktop) */}
          <span className="hidden sm:inline-flex items-center space-x-1.5 mr-3 px-3.5 py-2 bg-slate-900/95 text-white text-xs font-bold rounded-2xl shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-slate-700/80 -translate-x-1 group-hover:translate-x-0">
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
            <span>¿En qué podemos ayudarte? <strong>¡Escríbenos!</strong></span>
          </span>

          {/* WhatsApp Icon Circle Button */}
          <div className="relative w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-[0_6px_25px_rgba(37,211,102,0.45)] transition-all">
            {/* Subtle pulse animation ring */}
            <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none"></span>

            {/* Official WhatsApp SVG Icon */}
            <svg
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 fill-current relative z-10 drop-shadow-xs"
              viewBox="0 0 24 24"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </div>
        </a>
      </aside>
    </div>
  );
}
