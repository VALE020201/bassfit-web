/**
 * ============================================================================
 * BASSFIT HEADLESS DATA LAYER & TIPOS ESTRICTOS (TypeScript)
 * ============================================================================
 * Catálogo Oficial sincronizado con WhatsApp Business Bassfit Perú (+51 967 581 481).
 * Todas las imágenes con fondo blanco puro (#FFFFFF), descripciones completas,
 * fichas técnicas detalladas y precios oficiales en Soles (PEN / S/).
 */

export type SaleMode = "direct_cart" | "consultative_whatsapp";

export type ProductCategorySlug =
  | "yoga-pilates"
  | "entrenamiento-fuerza"
  | "calistenia"
  | "fajas-reductoras"
  | "natacion-acuaticos"
  | "boxeo-artes-marciales"
  | "electronicos"
  | "funcional-resistencia";

export interface BassfitProduct {
  id: string;
  wcId: number;
  name: string;
  slug: string;
  categorySlug: ProductCategorySlug;
  categoryLabel: string;
  price: number; // En Soles (S/)
  compareAtPrice?: number;
  stock: number;
  sku: string;
  saleMode: SaleMode;
  shortDescription: string;
  technicalSpecs: string[];
  images: string[];
  variants?: {
    id: string;
    name: string;
    subtitle?: string;
    imageIndex: number;
    tag?: string;
  }[];
  driveFolderId?: string;
  featured?: boolean;
  relatedArticleSlugs: string[];
  coachTip: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  level: string;
  duration: string;
  modality: string;
  targetAudience: string;
  priceMonthly: number;
  description: string;
  includes: string[];
  recommendedProductSlugs: string[];
  coachName: string;
  coachSpecialty: string;
  image: string;
  highlighted?: boolean;
}

export interface EvergreenArticle {
  id: string;
  slug: string;
  title: string;
  pillarCategory: "Entrenamiento & Técnica" | "Longevidad Activa" | "Nutrición & Suplementación" | "Recuperación & Movilidad";
  readingTime: string;
  seoExcerpt: string;
  heroImage: string;
  shortVideoTitle: string;
  shortVideoDuration: string;
  keyTakeaways: string[];
  contentSections: {
    heading: string;
    body: string;
  }[];
  relatedProductSlugs: string[];
}

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: "prog-longevidad-fuerza",
    title: "Fuerza & Longevidad Activa (+40 / Sin Límites)",
    subtitle: "Nuestro programa insignia: recupera masa muscular, movilidad articular y energía vital a cualquier edad.",
    badge: "MÁS SOLICITADO · FILOSOFÍA BASSFIT",
    level: "Todos los niveles (Adaptado)",
    duration: "Plan Mensual / Trimestral",
    modality: "Online Personalizado + Seguimiento 1 a 1",
    targetAudience: "Adultos de 35 a 70+ años que buscan salud articular, fuerza funcional y vitalidad sin lesiones.",
    priceMonthly: 180,
    description:
      "Fieles a nuestro lema «...fitness sin límites de edad..», este programa combina entrenamiento de fuerza progresivo en casa o gimnasio con trabajo de estabilidad y movilidad articular.",
    includes: [
      "Evaluación funcional inicial por videollamada (movilidad, historial y objetivos)",
      "Rutina semanal estructurada en app/plataforma con videos demostrativos paso a paso",
      "Corrección de técnica por video vía WhatsApp directo con tu entrenador Bassfit",
      "Guía de equipamiento óptimo en casa y orientación nutricional base"
    ],
    recommendedProductSlugs: ["kit-ligas-elasticas", "pesas-rusas-pvc", "pelota-pilates-inflador", "mat-de-yoga-6mm-10mm-15mm"],
    coachName: "Head Coach Bassfit",
    coachSpecialty: "Especialista en Fuerza Funcional & Salud Articular",
    image: "images/products/kit-ligas-elasticas-1.jpg",
    highlighted: true
  },
  {
    id: "prog-hipertrofia-homegym",
    title: "Hipertrofia & Tonificación Inteligente (Home Gym / Gym)",
    subtitle: "Construcción muscular estructurada por sobrecarga progresiva con barras, mancuernas y lastre.",
    badge: "ALTO RENDIMIENTO",
    level: "Intermedio / Avanzado",
    duration: "Ciclos de 8 a 12 semanas",
    modality: "Híbrido / Online con Control Semanal",
    targetAudience: "Personas que desean transformar su composición corporal, ganar fuerza real y optimizar cada serie.",
    priceMonthly: 210,
    description:
      "Periodización científica del entrenamiento de fuerza. Diseñamos tu microciclo según el equipamiento que tengas disponible (barras cromadas, mancuernas, lastre o gimnasio completo).",
    includes: [
      "Planificación de cargas, repeticiones en recámara (RIR) y tempos de ejecución",
      "Ajustes semanales basados en tu progreso de fuerza y recuperación",
      "Protocolos específicos para hipertrofia de piernas, torso y brazos",
      "Soporte directo con el entrenador por WhatsApp"
    ],
    recommendedProductSlugs: ["promo-barra-manubrios-y-discos-20kg-30kg-40kg", "set-de-mancuernas", "cinturon-de-lastre", "chaleco-de-lastre"],
    coachName: "Coach de Hipertrofia Bassfit",
    coachSpecialty: "Biomecánica y Sobrecarga Progresiva",
    image: "images/products/set-de-mancuernas-1.jpg",
    highlighted: false
  },
  {
    id: "prog-box-conditioning",
    title: "Boxing Conditioning & Quema Calórica Funcional",
    subtitle: "Acondicionamiento físico de alto impacto, coordinación visomotora y reflejos de combate sin lesiones.",
    badge: "CARDIO & REFLEJOS",
    level: "Principiante a Avanzado",
    duration: "Plan Mensual Continuo",
    modality: "100% Online con Videos de Alta Definición",
    targetAudience: "Quienes buscan quemar grasa, liberar estrés y mejorar su agilidad con entrenamientos dinámicos y divertidos.",
    priceMonthly: 160,
    description:
      "Aprende combinaciones reales de boxeo y kickboxing, trabajo de saco, reflejos y pliometría funcional desde casa. No necesitas experiencia previa.",
    includes: [
      "4 sesiones semanales de 35 a 45 minutos de alta intensidad",
      "Módulos progresivos de técnica de guardia, golpes rectos, ganchos y esquivas",
      "Rounds específicos con saco de boxeo y pelota de reflejos",
      "Comunidad privada de motivación y retos mensuales"
    ],
    recommendedProductSlugs: ["saco-de-boxeo-lleno", "vendas-de-boxeo", "pelota-de-reflejos"],
    coachName: "Entrenador de Combate Bassfit",
    coachSpecialty: "Boxing Fitness & Pliometría",
    image: "images/products/saco-de-boxeo-lleno-1.jpg",
    highlighted: false
  },
  {
    id: "prog-movilidad-pilates-core",
    title: "Movilidad, Pilates & Yoga Terapéutico",
    subtitle: "Libera tensión de espalda, fortalece tu centro (Core) y recupera flexibilidad profunda.",
    badge: "BIENESTAR & POSTURA",
    level: "Todos los niveles",
    duration: "Plan Mensual",
    modality: "Online a tu ritmo + Check-in semanal",
    targetAudience: "Profesionales con jornadas sedentarias, deportistas que buscan descarga muscular y adultos que desean higiene postural.",
    priceMonthly: 150,
    description:
      "Sesiones enfocadas en columna sana, control postural, respiración consciente y fortalecimiento sin impacto articular utilizando mat de yoga, bandas elásticas, pelota de pilates y foam roller.",
    includes: [
      "Rutinas de 25 a 45 minutos para mañana o noche",
      "Protocolos específicos para alivio cervical, dorsal y lumbar",
      "Trabajo de equilibrio propioceptivo para prevención de lesiones",
      "Acompañamiento cercano por WhatsApp"
    ],
    recommendedProductSlugs: ["mat-de-yoga-6mm-10mm-15mm", "bandas-elasticas-abiertas", "pelota-pilates-inflador", "ladrillo-de-yoga", "foam-roller"],
    coachName: "Especialista en Movilidad Bassfit",
    coachSpecialty: "Pilates Terapéutico, Yoga & Liberación Miofascial",
    image: "images/products/mat-de-yoga-6mm-10mm-15mm-1.jpg",
    highlighted: false
  }
];

export const EVERGREEN_ARTICLES: EvergreenArticle[] = [
  {
    id: "art-1",
    slug: "entrenamiento-fuerza-despues-de-los-40-guia-definitiva",
    title: "Entrenamiento de fuerza sin límites de edad: cómo proteger tus articulaciones y ganar músculo en casa",
    pillarCategory: "Longevidad Activa",
    readingTime: "5 min de lectura",
    seoExcerpt:
      "Descubre por qué el entrenamiento de fuerza progresivo es el verdadero seguro de vida metabólico y articular, y qué implementos necesitas para empezar de forma segura.",
    heroImage: "images/products/set-de-mancuernas-1.jpg",
    shortVideoTitle: "3 ejercicios clave con mancuernas y bandas para proteger rodillas y espalda",
    shortVideoDuration: "01:15",
    keyTakeaways: [
      "La masa muscular es el órgano metabólico más importante para mantener la vitalidad y sensibilidad a la insulina.",
      "Combinar resistencia elástica (bandas) con peso libre (mancuernas o pesas rusas) reduce el estrés articular.",
      "La técnica y el control excéntrico siempre superan al peso excesivo."
    ],
    contentSections: [
      {
        heading: "Por qué la fuerza no tiene edad",
        body: "En Bassfit trabajamos bajo una premisa clara: el cuerpo humano conserva su capacidad de adaptación neuromuscular durante toda la vida. A partir de los 35 años, si no estimulamos la musculatura contra una resistencia externa, perdemos entre un 3% y un 8% de masa muscular por década. Este proceso es totalmente reversible mediante un programa estructurado."
      },
      {
        heading: "Progresión inteligente: de ligas a barras y mancuernas",
        body: "Para lograr adherencia sin lesiones, recomendamos iniciar con patrones básicos de movimiento (sentadilla, empuje, tracción y bisagra de cadera) utilizando kits de ligas elásticas y pesas rusas, avanzando progresivamente hacia sets de mancuernas y barras."
      }
    ],
    relatedProductSlugs: [
      "promo-barra-manubrios-y-discos-20kg-30kg-40kg",
      "set-de-mancuernas",
      "pesas-rusas-pvc",
      "cinturon-de-pesas-de-cuero"
    ]
  },
  {
    id: "art-2",
    slug: "calistenia-y-lastre-fuerza-funcional-peso-corporal",
    title: "Calistenia y sobrecarga con lastre: el arte de dominar tu cuerpo y construir potencia real",
    pillarCategory: "Entrenamiento & Técnica",
    readingTime: "4 min de lectura",
    seoExcerpt:
      "Aprende a progresar desde fondos y dominadas con peso corporal hasta el uso seguro de cinturones y chalecos de lastre para multiplicar tu fuerza.",
    heroImage: "images/products/chaleco-de-lastre-1.jpg",
    shortVideoTitle: "Progresión técnica de fondos y dominadas con chaleco y cinturón de lastre",
    shortVideoDuration: "01:20",
    keyTakeaways: [
      "El dominio del propio peso corporal es la base previa antes de agregar lastre adicional.",
      "Los chalecos de lastre distribuyen el peso de forma equilibrada entre pecho y espalda.",
      "El tablero de flexiones por colores previene lesiones en las muñecas."
    ],
    contentSections: [
      {
        heading: "De principiante a dominadas con lastre",
        body: "La calistenia enseña a reclutar múltiples grupos musculares simultáneamente. Cuando logras 10 repeticiones estrictas de fondos o dominadas, incorporar un cinturón de lastre o chaleco progresivo desata adaptaciones musculares de alto nivel."
      },
      {
        heading: "Ergonomía articular en flexiones",
        body: "Entrenar con tableros dinámicos como el Push Up Board neutraliza el ángulo de flexión de la muñeca, permitiendo mayor rango de recorrido en el pectoral sin molestia articular."
      }
    ],
    relatedProductSlugs: [
      "chaleco-de-lastre",
      "cinturon-de-lastre",
      "tobilleras-de-arena",
      "push-up-board-tablero-dinamico-para-flexiones"
    ]
  },
  {
    id: "art-3",
    slug: "boxeo-y-coordinacion-en-casa-beneficios-cardiovasculares",
    title: "Boxeo fitness y agilidad en casa: cómo armar tu estación de combate y coordinación en pocos metros",
    pillarCategory: "Entrenamiento & Técnica",
    readingTime: "4 min de lectura",
    seoExcerpt:
      "Mejora tus reflejos, coordinación oculomanual y capacidad pulmonar integrando saco lleno, vendas profesionales y pelota de reflejos en tus rutinas.",
    heroImage: "images/products/saco-de-boxeo-lleno-1.jpg",
    shortVideoTitle: "Circuito de 15 minutos con Pelota de Reflejos + Saco de Boxeo",
    shortVideoDuration: "01:30",
    keyTakeaways: [
      "El trabajo de golpeo y esquiva activa el core profundo en rotación mucho más que los abdominales tradicionales.",
      "La pelota de reflejos mejora la velocidad de reacción y reduce el estrés mental en minutos.",
      "El vendaje semielástico de 4 metros es imprescindible para fijar muñecas y proteger nudillos."
    ],
    contentSections: [
      {
        heading: "Entrenamiento neuromotor: cuerpo y mente en sincronía",
        body: "El entrenamiento de combate sin contacto o con saco exige concentración total. Cada combinación de golpes y desplazamientos estimula la neuroplasticidad y quema hasta 600 kcal por sesión."
      },
      {
        heading: "Protección integral para manos y muñecas",
        body: "Asegúrate siempre de utilizar vendas de al menos 4 metros de largo para dar soporte tanto a los metacarpianos como a la articulación del carpo antes de golpear el saco."
      }
    ],
    relatedProductSlugs: [
      "saco-de-boxeo-lleno",
      "vendas-de-boxeo",
      "pelota-de-reflejos"
    ]
  },
  {
    id: "art-4",
    slug: "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor",
    title: "Propiocepción, Yoga y liberación miofascial: el secreto para entrenar fuerte sin dolor de espalda ni articulaciones",
    pillarCategory: "Recuperación & Movilidad",
    readingTime: "5 min de lectura",
    seoExcerpt:
      "Aprende a utilizar el mat antideslizante, bandas elásticas, pelota de pilates y foam roller para acelerar tu recuperación y mantener tu columna sana.",
    heroImage: "images/products/mat-de-yoga-6mm-10mm-15mm-1.jpg",
    shortVideoTitle: "Rutina de 10 minutos de movilidad con Foam Roller y Pelota de Pilates",
    shortVideoDuration: "01:10",
    keyTakeaways: [
      "Dedicar 10 minutos a la liberación miofascial con foam roller reduce la rigidez matutina.",
      "La pelota de pilates y las bandas abiertas activan la musculatura estabilizadora profunda.",
      "Un mat de alta densidad protege las rodillas y muñecas durante posturas de apoyo."
    ],
    contentSections: [
      {
        heading: "Por qué la estabilidad precede a la fuerza",
        body: "Un músculo no puede aplicar su máxima fuerza si la articulación sobre la que actúa es inestable. Incorporar ejercicios sobre pelota de pilates o con bandas de látex despierta la propiocepción antes de cargar peso."
      },
      {
        heading: "Recuperación activa y descompresión miofascial",
        body: "Al finalizar tu sesión, utiliza el foam roller para rodar sobre cuádriceps, glúteos e isquiotibiales, manteniendo una respiración pausada para promover el drenaje linfático."
      }
    ],
    relatedProductSlugs: [
      "mat-de-yoga-6mm-10mm-15mm",
      "bandas-elasticas-abiertas",
      "pelota-pilates-inflador",
      "ladrillo-de-yoga",
      "foam-roller"
    ]
  }
];

/**
 * CATÁLOGO COMPLETO BASSFIT - 18 PRODUCTOS OFICIALES WHATSAPP:
 * Fotografías reales con fondo blanco puro (#FFFFFF), descripciones directas
 * y precios oficiales en Soles (PEN / S/).
 */
export const BASSFIT_PRODUCTS: BassfitProduct[] = [
  {
    "id": "wa-2812633812125031",
    "wcId": 1001,
    "name": "Mat de Yoga 6mm, 10mm, 15mm",
    "slug": "mat-de-yoga-6mm-10mm-15mm",
    "categorySlug": "yoga-pilates",
    "categoryLabel": "Yoga & Pilates",
    "price": 38,
    "compareAtPrice": 48,
    "stock": 35,
    "sku": "BF-YG-001",
    "saleMode": "direct_cart",
    "shortDescription": "Colchoneta de alta densidad antideslizante y 100% antibacteriana para yoga, pilates y ejercicios de suelo. Con funda o correas según grosor.",
    "technicalSpecs": [
      "Material: PVC de alta densidad 100% antibacteriano y de fácil limpieza",
      "Grosor 6mm incluye funda protectora de transporte",
      "Grosor 10mm y 15mm incluye correas de transporte",
      "Precios según espesor: 6mm (S/ 38) | 10mm (S/ 48) | 15mm (S/ 58)",
      "Opción Mat ecológico 6mm libre de látex y PVC: S/ 48",
      "Superficie texturizada para evitar resbalones y proporcionar máximo confort articular"
    ],
    "images": [
      "images/products/mat-de-yoga-6mm-10mm-15mm-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor"
    ],
    "coachTip": "Para mayor durabilidad, limpia tu mat con un paño húmedo después de cada sesión y no lo dejes expuesto al sol directo."
  },
  {
    "id": "wa-2943449319070793",
    "wcId": 1002,
    "name": "Bandas Elásticas Abiertas (Pack x3)",
    "slug": "bandas-elasticas-abiertas",
    "categorySlug": "yoga-pilates",
    "categoryLabel": "Yoga & Pilates",
    "price": 27,
    "compareAtPrice": 35,
    "stock": 50,
    "sku": "BF-YG-002",
    "saleMode": "direct_cart",
    "shortDescription": "Pack de 3 bandas elásticas abiertas 100% látex natural de 1.20m x 15cm para pilates, yoga, estiramientos, tonificación y rehabilitación articular.",
    "technicalSpecs": [
      "Composición: 100% látex natural elástico de alta memoria",
      "Medidas en reposo: 1.20 metros de largo x 15 cm de ancho",
      "Pack incluye 3 bandas de distintas resistencias progresivas",
      "Permite tonificar músculos, aumentar la flexibilidad y mejorar la postura",
      "Uso versátil en interiores, hogar o al aire libre"
    ],
    "images": [
      "images/products/bandas-elasticas-abiertas-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor"
    ],
    "coachTip": "Excelente para activación de glúteos y rotadores externos de hombro antes de entrenar fuerza."
  },
  {
    "id": "wa-3961794157280739",
    "wcId": 1003,
    "name": "Ladrillo de Yoga EVA",
    "slug": "ladrillo-de-yoga",
    "categorySlug": "yoga-pilates",
    "categoryLabel": "Yoga & Pilates",
    "price": 19,
    "compareAtPrice": 25,
    "stock": 40,
    "sku": "BF-YG-003",
    "saleMode": "direct_cart",
    "shortDescription": "Bloque de apoyo en goma EVA ecológica de alta densidad, clave para mantener posturas correctas, ganar flexibilidad y rehabilitar lesiones.",
    "technicalSpecs": [
      "Medidas estándar: 23 cm x 15 cm x 8 cm",
      "Material: Goma EVA ecológica reciclable, no tóxica e impermeable",
      "Bordes biselados ergonómicos para un agarre seguro y confortable",
      "Ligero, fácil de transportar y resistente al sudor",
      "Ideal para yoga, pilates, danza y alineación biomecánica"
    ],
    "images": [
      "images/products/ladrillo-de-yoga-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor"
    ],
    "coachTip": "Utilízalo bajo las manos en flexiones hacia adelante para evitar doblar excesivamente la columna lumbar."
  },
  {
    "id": "wa-3065097563533218",
    "wcId": 1004,
    "name": "Pelota Pilates + Inflador de Obsequio",
    "slug": "pelota-pilates-inflador",
    "categorySlug": "yoga-pilates",
    "categoryLabel": "Yoga & Pilates",
    "price": 34,
    "compareAtPrice": 45,
    "stock": 30,
    "sku": "BF-YG-004",
    "saleMode": "direct_cart",
    "shortDescription": "Balón suizo antiexplosión de PVC reforzado para entrenamiento de core, postura, pilates y rehabilitación muscular sin impacto en articulaciones.",
    "technicalSpecs": [
      "Material: PVC de alta resistencia con tecnología anti-burst (anti-reventón)",
      "OBSEQUIO: Inflador manual con adaptador incluido",
      "Precios según diámetro: 55cm (S/ 28) | 65cm (S/ 34) | 75cm (S/ 44) | 85cm (S/ 54)",
      "Colores disponibles: Rojo, Azul, Plateado",
      "Obliga al cuerpo a responder a la inestabilidad activando el core y quemando calorías"
    ],
    "images": [
      "images/products/pelota-pilates-inflador-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor"
    ],
    "coachTip": "Si mides entre 1.60m y 1.75m, el tamaño estándar de 65cm es el ideal para mantener la cadera en ángulo de 90°."
  },
  {
    "id": "wa-7845596032182031",
    "wcId": 1005,
    "name": "Foam Roller de Liberación Miofascial",
    "slug": "foam-roller",
    "categorySlug": "yoga-pilates",
    "categoryLabel": "Yoga & Pilates",
    "price": 35,
    "compareAtPrice": 45,
    "stock": 25,
    "sku": "BF-YG-005",
    "saleMode": "direct_cart",
    "shortDescription": "Rodillo texturizado de masaje profundo para descompresión de columna, estiramientos de fascia y recuperación activa post-entrenamiento.",
    "technicalSpecs": [
      "Diseño tridimensional con zonas de amortiguación para masaje de puntos gatillo",
      "Opciones de longitud: 35 cm (S/ 36) | 45 cm (S/ 56)",
      "Estructura interna rígida indeformable que soporta alto peso corporal",
      "Ideal para descontracturar cuádriceps, glúteos, fascia lata y espalda"
    ],
    "images": [
      "images/products/foam-roller-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor"
    ],
    "coachTip": "Rueda despacio por 30-45 segundos en áreas tensas, manteniendo la respiración profunda para liberar la fascia."
  },
  {
    "id": "wa-5321507361213862",
    "wcId": 2001,
    "name": "Promo Barra, Manubrios y Discos (20kg / 30kg / 40kg)",
    "slug": "promo-barra-manubrios-y-discos-20kg-30kg-40kg",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Levantamiento",
    "price": 128,
    "compareAtPrice": 160,
    "stock": 20,
    "sku": "BF-FZ-001",
    "saleMode": "direct_cart",
    "shortDescription": "Set integral de pesas con barra cromada (Recta, Z o W), manubrios texturizados y discos de acero fundido. Incluye evaluación técnica de obsequio.",
    "technicalSpecs": [
      "Barra Recta, Z o W a elección con seguros cromados",
      "02 Manubrios con texturizado antideslizante y collarines roscados",
      "Discos nacionales de acero fundido de alta durabilidad",
      "Opciones: 20kg solo mancuernas (S/ 128) | 20kg mancuernas + barra (S/ 203) | 30kg (S/ 253) | 40kg (S/ 303)",
      "Piezas adicionales: Barra individual (S/ 75), Manubrios (S/ 28), Disco x kg (S/ 5.00)",
      "OBSEQUIO: Evaluación de Técnica con Coach Bassfit"
    ],
    "images": [
      "images/products/promo-barra-manubrios-y-discos-20kg-30kg-40kg-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Asegúrate de ajustar los collares antes de cada levantamiento pesado y aprovecha la barra Z para cuidar tus muñecas en curls."
  },
  {
    "id": "wa-2973371469377261",
    "wcId": 2002,
    "name": "Set de Mancuernas Cromadas con Maleta",
    "slug": "set-de-mancuernas",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Levantamiento",
    "price": 214,
    "compareAtPrice": 260,
    "stock": 15,
    "sku": "BF-FZ-002",
    "saleMode": "direct_cart",
    "shortDescription": "Maletín organizador portátil con mancuernas cromadas, barra adaptadora extensible de 60cm y discos intercambiables de acero cromado.",
    "technicalSpecs": [
      "12 Discos cromados de precisión: 4 x 0.50kg, 4 x 1.25kg, 4 x 2.50kg",
      "02 Mancuernas cromadas de 35 cm con agarre ergonómico",
      "01 Barra adaptadora extensible de 60 cm para convertir a barra larga",
      "04 Collarines Spinlock con sellos de goma para máxima firmeza",
      "Maleta rígida moldeada para fácil almacenaje y transporte",
      "Permite entrenar brazos, espalda, pecho, hombros, piernas y glúteos"
    ],
    "images": [
      "images/products/set-de-mancuernas-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "La barra adaptadora te permite alternar de forma inmediata entre press militar a una mano y sentadillas frontales con barra."
  },
  {
    "id": "wa-4144573445633055",
    "wcId": 2003,
    "name": "Pesas Rusas PVC (Kettlebells)",
    "slug": "pesas-rusas-pvc",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Levantamiento",
    "price": 18,
    "compareAtPrice": 25,
    "stock": 45,
    "sku": "BF-FZ-003",
    "saleMode": "direct_cart",
    "shortDescription": "Pesas rusas de PVC de alta resistencia con asa ancha ergonómica. Diseñadas para activar el core, fuerza balística y cardio dinámico.",
    "technicalSpecs": [
      "Pesos disponibles: 2kg (S/ 18), 3kg (S/ 27), 4kg (S/ 36), 5kg (S/ 45), 6kg (S/ 56), 8kg (S/ 72), 10kg (S/ 90), 12kg (S/ 108)",
      "Recubrimiento en PVC que protege el suelo contra impactos",
      "Asa de agarre ergonómico para una o dos manos",
      "Base plana antiderrapante para estabilidad en flexiones apoyadas",
      "Excelente para situar el centro de gravedad fuera de las manos y fortalecer el abdomen"
    ],
    "images": [
      "images/products/pesas-rusas-pvc-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Inicia con 4kg a 6kg para aprender la bisagra de cadera en el swing antes de aumentar a cargas superiores."
  },
  {
    "id": "wa-3384522224893267",
    "wcId": 2004,
    "name": "Cinturón de Pesas de Cuero",
    "slug": "cinturon-de-pesas-de-cuero",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Levantamiento",
    "price": 49,
    "compareAtPrice": 65,
    "stock": 25,
    "sku": "BF-FZ-004",
    "saleMode": "direct_cart",
    "shortDescription": "Cinturón lumbar en cuero legítimo de alta resistencia con almohadilla interior, costuras de doble punto y hebilla metálica de dos espigas.",
    "technicalSpecs": [
      "Cuero resistente al envejecimiento de textura suave y duradera",
      "Costuras de alta exigencia con refuerzo de doble punto",
      "Hebilla de metal cromado de dos espigas para fijación inquebrantable",
      "Cojín anatómico en zona lumbar para control de presión intraabdominal",
      "Colores: Negro y Marrón"
    ],
    "images": [
      "images/products/cinturon-de-pesas-de-cuero-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Aprende a respirar contra el cinturón (maniobra de Valsalva) en series pesadas para crear una faja natural indestructible."
  },
  {
    "id": "wa-3881609461855736",
    "wcId": 3001,
    "name": "Cinturón de Lastre de Cuero para Calistenia",
    "slug": "cinturon-de-lastre",
    "categorySlug": "calistenia",
    "categoryLabel": "Calistenia & Peso Corporal",
    "price": 66,
    "compareAtPrice": 85,
    "stock": 20,
    "sku": "BF-CL-001",
    "saleMode": "direct_cart",
    "shortDescription": "Cinturón de cuero reforzado con cadena de acero y mosquetón para sobrecarga progresiva en dominadas y fondos en paralelas.",
    "technicalSpecs": [
      "Cuero de uso rudo preparado para soportar múltiples discos pesados",
      "Cadena de eslabones de acero y mosquetón de apertura rápida",
      "Diseño contorneado que asienta el peso en las caderas de forma simétrica",
      "Imprescindible para atletas de Street Workout y Calistenia con lastre"
    ],
    "images": [
      "images/products/cinturon-de-lastre-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Cuando domines 10 dominadas estrictas con tu propio peso, agrega de 5kg a 10kg con este cinturón para romper mesetas."
  },
  {
    "id": "wa-3437931672988989",
    "wcId": 3002,
    "name": "Chaleco de Lastre Regulable",
    "slug": "chaleco-de-lastre",
    "categorySlug": "calistenia",
    "categoryLabel": "Calistenia & Peso Corporal",
    "price": 86,
    "compareAtPrice": 110,
    "stock": 18,
    "sku": "BF-CL-002",
    "saleMode": "direct_cart",
    "shortDescription": "Chaleco ergonómico ajustable para Crossfit, calistenia y running. Reparte el peso equilibradamente entre pecho y espalda sin limitar movilidad.",
    "technicalSpecs": [
      "Distribución simétrica de peso frontal y dorsal para proteger la postura",
      "Opciones disponibles: 10kg con cartuchos de arena (S/ 67) | 20kg con cartuchos de arena (S/ 80)",
      "Sistema de correas y velcro reforzado que evita balanceos al saltar o correr",
      "Apto para dominadas, fondos, flexiones, sentadillas y sprints"
    ],
    "images": [
      "images/products/chaleco-de-lastre-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Ideal para entrenar la prueba Murph en CrossFit o elevar la intensidad cardiovascular en entrenamientos al aire libre."
  },
  {
    "id": "wa-2427721840663460",
    "wcId": 3003,
    "name": "Tobilleras de Arena con Doble Velcro (Par)",
    "slug": "tobilleras-de-arena",
    "categorySlug": "calistenia",
    "categoryLabel": "Calistenia & Peso Corporal",
    "price": 14,
    "compareAtPrice": 20,
    "stock": 60,
    "sku": "BF-CL-003",
    "saleMode": "direct_cart",
    "shortDescription": "Pesas para muñecas y tobillos con doble velcro y hebilla metálica de seguridad. Confección peruana reforzada para rutinas de fuerza y calistenia.",
    "technicalSpecs": [
      "Precios por par: 1kg (S/ 14) | 2kg (S/ 18) | 3kg (S/ 28) | 4kg (S/ 38) | 5kg (S/ 48)",
      "Sistema de DOBLE VELCRO y HEBILLA METÁLICA para ajuste inamovible",
      "Costura reforzada industrial de máxima durabilidad — PRODUCTO PERUANO",
      "Ajustables tanto para tobillos como para muñecas",
      "Ideales para calistenia, básquetbol, fútbol, running y desarrollo muscular"
    ],
    "images": [
      "images/products/tobilleras-de-arena-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Úsalas en ejercicios de patada de glúteo y elevaciones de piernas en barra para un estímulo abdominal superior."
  },
  {
    "id": "wa-4164573993625069",
    "wcId": 3004,
    "name": "Push Up Board | Tablero Dinámico para Flexiones",
    "slug": "push-up-board-tablero-dinamico-para-flexiones",
    "categorySlug": "calistenia",
    "categoryLabel": "Calistenia & Peso Corporal",
    "price": 49,
    "compareAtPrice": 65,
    "stock": 35,
    "sku": "BF-CL-004",
    "saleMode": "direct_cart",
    "shortDescription": "Sistema de entrenamiento por código de colores con 9 posiciones de agarre para espalda, pecho, hombros y brazos sin dolor de muñecas.",
    "technicalSpecs": [
      "9 posiciones biomecánicas señalizadas por color para cada grupo muscular",
      "Base sólida de PVC reforzado de alta durabilidad que soporta hasta 200 kg",
      "2 empuñaduras ergonómicas antideslizantes que protegen las articulaciones de las muñecas",
      "Fácil de ensamblar, plegar, transportar y guardar",
      "Excelente compañero para rutinas en casa tanto para principiantes como avanzados"
    ],
    "images": [
      "images/products/push-up-board-tablero-dinamico-para-flexiones-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Cambia de ángulo de agarre en cada serie para trabajar la porción clavicular (alta) y esternal del pectoral."
  },
  {
    "id": "wa-3569619463069016",
    "wcId": 4001,
    "name": "Kit de Ligas Elásticas Tubulares (150 lbs / 68 kg)",
    "slug": "kit-ligas-elasticas",
    "categorySlug": "funcional-resistencia",
    "categoryLabel": "Funcional & Resistencia",
    "price": 49,
    "compareAtPrice": 65,
    "stock": 40,
    "sku": "BF-FN-001",
    "saleMode": "direct_cart",
    "shortDescription": "Sistema completo de 5 bandas tubulares apilables hasta 150 lbs con asas acolchadas, correas de tobillo, anclaje de puerta y bolsa.",
    "technicalSpecs": [
      "5 Resistencias: Amarilla (10 lbs), Azul (20 lbs), Verde (30 lbs), Negra (40 lbs), Roja (50 lbs)",
      "Resistencia acumulable hasta 150 lbs / 68 kg",
      "Incluye: 2 asas acolchadas de espuma, 2 correas de tobillo, 1 anclaje de puerta, 1 bolsa de viaje y guía de ejercicios",
      "Presentaciones: Modelo básico (S/ 32) | Modelo reforzado (S/ 49)",
      "Látex virgen de alta memoria resistente a roturas y tirones bruscos"
    ],
    "images": [
      "images/products/kit-ligas-elasticas-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "entrenamiento-fuerza-despues-de-los-40-guia-definitiva"
    ],
    "coachTip": "Usa el anclaje de puerta para simular poleas de gimnasio en cruces de pecho, jalones de tríceps y remos dorsales."
  },
  {
    "id": "wa-3630007350359587",
    "wcId": 5001,
    "name": "Saco de Boxeo Lleno Profesional",
    "slug": "saco-de-boxeo-lleno",
    "categorySlug": "boxeo-artes-marciales",
    "categoryLabel": "Boxeo & Combate",
    "price": 140,
    "compareAtPrice": 180,
    "stock": 15,
    "sku": "BF-BX-001",
    "saleMode": "direct_cart",
    "shortDescription": "Saco de cuero de alto impacto resistente al envejecimiento con costuras reforzadas de doble punto, cadenas de acero incluidas y relleno calibrado.",
    "technicalSpecs": [
      "Cuero de alta durabilidad resistente a golpes continuos",
      "Costuras industriales reforzadas con doble pespunte para alta exigencia",
      "Incluye cadenas de acero para suspensión segura",
      "Precios según tamaño: 1.0m lleno (S/ 120) | 1.2m lleno (S/ 140) | 1.5m lleno (S/ 160)",
      "PROMO EQUIPO COMPLETO: Soporte Rack 200kg + Guantes de Box + Vendas por solo S/ 90 adicionales",
      "Servicio de instalación disponible por S/ 30"
    ],
    "images": [
      "images/products/saco-de-boxeo-lleno-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "boxeo-y-coordinacion-en-casa-beneficios-cardiovasculares"
    ],
    "coachTip": "Golpea siempre con las manos vendadas y los guantes ajustados para proteger muñecas y metacarpianos."
  },
  {
    "id": "wa-4002753499753974",
    "wcId": 5002,
    "name": "Vendas de Boxeo y MMA (4m x 4cm)",
    "slug": "vendas-de-boxeo",
    "categorySlug": "boxeo-artes-marciales",
    "categoryLabel": "Boxeo & Combate",
    "price": 22,
    "compareAtPrice": 30,
    "stock": 50,
    "sku": "BF-BX-002",
    "saleMode": "direct_cart",
    "shortDescription": "Vendas semielásticas de 4 metros de longitud para protección de nudillos, articulaciones de la muñeca y absorción efectiva del sudor.",
    "technicalSpecs": [
      "Medidas oficiales: 4 metros de largo x 4 cm de ancho",
      "Composición de algodón con elastano transpirable y de secado rápido",
      "Cierre con velcro ancho de sujeción firme y ojal de pulgar",
      "Imprescindibles para boxeo, muay thai, kickboxing y artes marciales mixtas"
    ],
    "images": [
      "images/products/vendas-de-boxeo-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "boxeo-y-coordinacion-en-casa-beneficios-cardiovasculares"
    ],
    "coachTip": "Asegúrate de dar 3 a 4 pasadas firmes en la articulación de la muñeca antes de pasar a proteger los nudillos."
  },
  {
    "id": "wa-4404572482942116",
    "wcId": 5003,
    "name": "Pelota de Reflejos para Combate",
    "slug": "pelota-de-reflejos",
    "categorySlug": "boxeo-artes-marciales",
    "categoryLabel": "Boxeo & Combate",
    "price": 33,
    "compareAtPrice": 42,
    "stock": 35,
    "sku": "BF-BX-003",
    "saleMode": "direct_cart",
    "shortDescription": "Diadema regulable con pelota elástica para desarrollar reflejos, timing de golpeo, velocidad visomotora y coordinación de combate.",
    "technicalSpecs": [
      "Banda elástica ajustable para la cabeza que se amolda a cualquier usuario",
      "Pelota ligera y suave de espuma que no causa lesiones en manos ni rostro",
      "Cuerda elástica calibrada para un rebote dinámico y constante",
      "Entrenamiento dinámico enfocado en velocidad, precisión y agilidad mental"
    ],
    "images": [
      "images/products/pelota-de-reflejos-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "boxeo-y-coordinacion-en-casa-beneficios-cardiovasculares"
    ],
    "coachTip": "Inicia con golpes suaves y continuos como un jab rítmico antes de intentar golpes de mayor velocidad."
  },
  {
    "id": "wa-4384233258279412",
    "wcId": 6001,
    "name": "Tabla de Natación con Agarraderas",
    "slug": "tabla-de-natacion",
    "categorySlug": "natacion-acuaticos",
    "categoryLabel": "Natación & Acuáticos",
    "price": 35,
    "compareAtPrice": 45,
    "stock": 30,
    "sku": "BF-NT-001",
    "saleMode": "direct_cart",
    "shortDescription": "Tabla ergonómica en goma EVA virgen de alta flotabilidad para entrenamiento de patada, tonificación de tren inferior y técnica acuática.",
    "technicalSpecs": [
      "Material: Goma EVA de célula cerrada — liviano, lavable, impermeable y no tóxico",
      "Medidas estándar: 42 cm x 27 cm x 2.7 cm — no se rompe ni se dobla",
      "Diseño ergonómico con agarraderas moldeadas para mayor confort en el ejercicio",
      "Apto para adultos y niños que buscan perfeccionar la técnica o ganar confianza",
      "Ideal para aislar y trabajar glúteos, muslos y pantorrillas en el agua"
    ],
    "images": [
      "images/products/tabla-de-natacion-1.jpg"
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "movilidad-columnar-y-propiocepcion-secreto-entrenar-sin-dolor"
    ],
    "coachTip": "Mantén la cabeza alineada con el agua y patea desde la cadera en vez de doblar las rodillas para optimizar la propulsión."
  },
  {
    "id": "wa-4858382410901998",
    "wcId": 1019,
    "name": "Faja Cinturilla Avispa",
    "slug": "faja-cinturilla-avispa",
    "categorySlug": "fajas-reductoras",
    "categoryLabel": "Fajas Reductoras",
    "price": 44.0,
    "compareAtPrice": 55.0,
    "stock": 40,
    "sku": "BF-FJ-001",
    "saleMode": "direct_cart",
    "shortDescription": "Faja cinturilla avispa con material de neopreno y varillas de silicona confortables. Reduce tallas, moldea la cintura y aplana el vientre.",
    "technicalSpecs": [
      "Primera capa: Neopreno térmico para sudoración y reducción de medidas",
      "Segunda capa: Banda elástica de doble ajuste para moldear cintura de avispa",
      "Varillas de silicona ergonómicas que corrigen la postura y brindan soporte lumbar",
      "Apta para uso directo sobre la piel y durante entrenamientos en el gimnasio",
      "Tallas disponibles: S, M, L, XL",
      "Colores de bordes: Negro, Morado, Fucsia y Azul"
    ],
    "images": [
      "images/products/faja-cinturilla-avispa-1.jpg"
    ],
    "coachTip": "Utilízala durante tus caminatas o rutinas de gimnasio para maximizar el efecto térmico y proteger tu zona lumbar."
  },
  {
    "id": "wa-7206830842675740",
    "wcId": 1020,
    "name": "Faja Chaleco Sauna Sweat Shaper",
    "slug": "faja-chaleco-sauna",
    "categorySlug": "fajas-reductoras",
    "categoryLabel": "Fajas Reductoras",
    "price": 21.0,
    "compareAtPrice": 29.0,
    "stock": 35,
    "sku": "BF-FJ-002",
    "saleMode": "direct_cart",
    "shortDescription": "Chaleco sauna Sweat Shaper elaborado con tela de polímero que retiene el calor corporal, maximiza la sudoración y moldea el torso al instante.",
    "technicalSpecs": [
      "Capa interior de polímero térmico: retiene el calor en todo el core y espalda",
      "Capa exterior de compresión: moldea la figura sin añadir volumen perceptible",
      "Disimula discretamente debajo de la ropa diaria o deportiva",
      "Ajuste elástico en la cintura que garantiza que la prenda no se enrolle",
      "Ideal para cardio, pesas o actividades cotidianas en el hogar"
    ],
    "images": [
      "images/products/faja-chaleco-1.jpg"
    ],
    "coachTip": "Mantente bien hidratado durante tu entrenamiento para aprovechar al máximo la sudoración y detoxificación corporal."
  },
  {
    "id": "wa-3708939919127923",
    "wcId": 1021,
    "name": "Crema Corporal Reductora / Lipo Cream (Variedades)",
    "slug": "crema-corporal-caliente",
    "categorySlug": "fajas-reductoras",
    "categoryLabel": "Fajas Reductoras",
    "price": 25.0,
    "compareAtPrice": 32.0,
    "stock": 50,
    "sku": "BF-CR-001",
    "saleMode": "direct_cart",
    "shortDescription": "Excelente crema corporal reductora para complementar con el uso de fajas y conseguir resultados más rápidos y efectivos.\\n\\nDesliza para elegir tu variedad: Lipo Cream Caliente, Blue Sky Fra Criogénesis, Oligoelementos, LipoSlim 500g o Gel Corps Modelador.",
    "technicalSpecs": [
      "Fondo blanco puro (#FFFFFF) de alta definición en todas las presentaciones",
      "Variedad 1: Lipo Cream Caliente con fosfatidilcolina termoactiva",
      "Variedad 2: Lipo Cream Blue Sky con fórmula criogénica (efecto frío), mentol y alcanfor",
      "Variedad 3: Lipo Cream Oligoelementos termohidratante con cola de caballo y algas",
      "Variedad 4: LipoSlim Termogénesis en pote de 500g de alta concentración",
      "Variedad 5: Corps Lignea Body Contour Hinode 500g gel modelador crioterapéutico",
      "Complemento ideal para fajas cinturilla, faja avispa y chalecos sauna Sweat Shaper"
    ],
    "images": [
      "images/products/crema-corporal-caliente-1.jpg",
      "images/products/crema-corporal-caliente-2.jpg",
      "images/products/crema-corporal-caliente-3.jpg",
      "images/products/crema-corporal-caliente-4.jpg",
      "images/products/crema-corporal-caliente-5.jpg",
      "images/products/crema-corporal-caliente-6.jpg"
    ],
    "coachTip": "Aplica con masajes circulares ascendentes sobre el abdomen antes de colocarte la faja cinturilla o chaleco sauna.",
    "variants": [
      {
        "id": "lipo-caliente",
        "name": "Lipo Cream Caliente (Fosfatidilcolina)",
        "subtitle": "Efecto calor termoactivo intensivo",
        "imageIndex": 0,
        "tag": "🔥 Caliente"
      },
      {
        "id": "lipo-fria",
        "name": "Lipo Cream Blue Sky (Criogénesis Fría)",
        "subtitle": "Efecto frío reafirmante con mentol y colágeno",
        "imageIndex": 1,
        "tag": "❄️ Fría"
      },
      {
        "id": "lipo-oligo",
        "name": "Lipo Cream Oligoelementos (Thermohidratante)",
        "subtitle": "Extractos botánicos y oligoelementos",
        "imageIndex": 2,
        "tag": "🌿 Oligoelementos"
      },
      {
        "id": "liposlim-500",
        "name": "LipoSlim 500g (Crema Termogénesis)",
        "subtitle": "Pote 500g reductor de medidas",
        "imageIndex": 3,
        "tag": "⚡ Pote 500g"
      },
      {
        "id": "corps-500",
        "name": "Corps Body Contour 500g (Gel Modelador)",
        "subtitle": "Gel modelador corporal crioterapéutico",
        "imageIndex": 4,
        "tag": "✨ Gel Corps"
      },
      {
        "id": "comparativa",
        "name": "Catálogo Comparativo (4 Presentaciones)",
        "subtitle": "Guía completa de variedades Bassfit",
        "imageIndex": 5,
        "tag": "📋 Comparativa"
      }
    ]
  },
  {
    "id": "wa-6149196268485392",
    "wcId": 1022,
    "name": "Gorro de Natación 100% Silicona",
    "slug": "gorro-de-natacion-silicona",
    "categorySlug": "natacion-acuaticos",
    "categoryLabel": "Natación & Acuáticos",
    "price": 17.0,
    "compareAtPrice": 22.0,
    "stock": 60,
    "sku": "BF-NT-002",
    "saleMode": "direct_cart",
    "shortDescription": "Gorro de natación elaborado en 100% silicona elástica y suave al tacto. Protección hermética contra el cloro y salinidad marina para adultos y niños.",
    "technicalSpecs": [
      "Material: 100% silicona hipoalergénica de alta resistencia y flexibilidad",
      "Diseño hidrodinámico que reduce la resistencia del agua en cada brazada",
      "Protección total del cabello contra cloro de piscina y sal marina",
      "Ajuste cómodo y seguro que no tira del cabello al colocarse",
      "Variedad de colores deportivos para adultos y niños"
    ],
    "images": [
      "images/products/gorro-de-natacion-1.jpg"
    ],
    "coachTip": "Enjuaga tu gorro con agua dulce después de cada sesión y sécalo a la sombra para prolongar la elasticidad de la silicona."
  },
  {
    "id": "wa-4130681203704246",
    "wcId": 1023,
    "name": "Flotador de Piernas Pullboy Ergonómico",
    "slug": "flotador-de-piernas-pullboy",
    "categorySlug": "natacion-acuaticos",
    "categoryLabel": "Natación & Acuáticos",
    "price": 30.0,
    "compareAtPrice": 38.0,
    "stock": 30,
    "sku": "BF-NT-003",
    "saleMode": "direct_cart",
    "shortDescription": "Flotador Pullboy ergonómico para nadadores principiantes y avanzados. Inmoviliza las piernas para aislar y potenciar la fuerza de brazada y torso.",
    "technicalSpecs": [
      "Dimensiones ergonómicas: 24 x 15 x 11 x 8 cm",
      "Material: Goma EVA microporosa de alta flotabilidad y secado rápido",
      "Forma anatómica de ocho que calza cómodamente entre los muslos sin rozaduras",
      "Mejora la posición horizontal hidrodinámica del cuerpo en el agua",
      "Complemento ideal de la tabla de natación para entrenamientos técnicos"
    ],
    "images": [
      "images/products/flotador-de-piernas-pullboy-1.jpg"
    ],
    "coachTip": "Úsalo en series de 50m a 100m para enfocarte exclusivamente en la tracción dorsal y entrada de los brazos en el agua."
  },
  {
    "id": "wa-5403327829758785",
    "wcId": 1024,
    "name": "FascialGun | Pistola de Masaje Muscular",
    "slug": "fascialgun-pistola-de-masaje",
    "categorySlug": "electronicos",
    "categoryLabel": "Electrónicos",
    "price": 95.0,
    "compareAtPrice": 125.0,
    "stock": 25,
    "sku": "BF-EL-001",
    "saleMode": "direct_cart",
    "shortDescription": "Pistola de masaje muscular por percusión con 6 niveles de velocidad y 4 cabezales intercambiables para alivio de puntos gatillo, contracturas y fatiga.",
    "technicalSpecs": [
      "4 cabezales intercambiables: bola grande, bala concentrada, tenedor y plano",
      "6 velocidades regulables para calentamiento, descarga muscular y percusión profunda",
      "Motor silencioso de alto torque con batería recargable de litio",
      "Agarre ergonómico y liviano para autoaplicación en espalda, piernas y hombros",
      "Acelera la recuperación muscular post-entrenamiento y descontractura la fascia"
    ],
    "images": [
      "images/products/fascialgun-pistola-masaje-1.jpg"
    ],
    "coachTip": "Dedica 60 segundos por grupo muscular con el cabezal plano después de entrenar para disipar la acumulación de ácido láctico."
  },
  {
    "id": "wa-3421408384612748",
    "wcId": 1024,
    "name": "Barras 8en1 Multifuncional para Pared",
    "slug": "barras-8en1-multifuncional",
    "categorySlug": "calistenia",
    "categoryLabel": "Calistenia & Peso Corporal",
    "price": 178.0,
    "compareAtPrice": 220.0,
    "stock": 35,
    "sku": "BF-BAR-8EN1",
    "saleMode": "direct_cart",
    "shortDescription": "Entrena con intensidad desde la comodidad de tu casa con nuestras Barras 8en1. Permite realizar dominadas prono y supino, fondos en paralelas, elevaciones de piernas y múltiples agarres biomecánicos para tren superior completo.",
    "technicalSpecs": [
      "Estructura reforzada de acero tubular de alta resistencia con pintura electrostática anticorrosiva",
      "Fondo blanco puro (#FFFFFF) de alta definición sin recorte ni corte de piezas metálicas",
      "Cojines acolchados de alta densidad en respaldo y antebrazos forrados en vinilo de uso rudo",
      "8 modalidades de ejercicio en una sola estación: dominadas abiertas, neutras, cerradas, fondos y abdomen",
      "Incluye ganchos de anclaje de pared con pernos de expansión de seguridad para carga hasta 250 kg"
    ],
    "images": [
      "images/products/barras-8en1-multifuncional-1.jpg"
    ],
    "coachTip": "Instala sobre pared de ladrillo o concreto sólido. Realiza 4 series de fondos y dominadas combinadas para congestión total del tren superior."
  },
  {
    "id": "wa-8267944463277129",
    "wcId": 1025,
    "name": "Escalera Pliométrica de Agilidad y Velocidad",
    "slug": "escalera-pliometrica-agilidad",
    "categorySlug": "funcional-resistencia",
    "categoryLabel": "Funcional & Resistencia",
    "price": 40.0,
    "compareAtPrice": 52.0,
    "stock": 50,
    "sku": "BF-ESC-001",
    "saleMode": "direct_cart",
    "shortDescription": "Con la estable escalera pliométrica podrás mejorar tu coordinación, velocidad, tiempo de reacción y agilidad en cualquier deporte o preparación atlética.",
    "technicalSpecs": [
      "Peldaños planos de polipropileno de alta resistencia ajustables en separación",
      "Cintas laterales de nylon reforzado con costuras de alta durabilidad",
      "Longitud estándar de competencia con estacas de fijación para césped",
      "Incluye funda de transporte impermeable con cordón de ajuste",
      "Ideal para atletas de fútbol, básquet, boxeo, crossfit y running"
    ],
    "images": [
      "images/products/escalera-pliometrica-1.jpg"
    ],
    "coachTip": "Mantén el centro de gravedad bajo y el peso en la punta de los pies para transiciones ultrarrápidas entre peldaños."
  },
  {
    "id": "wa-7157272380981446",
    "wcId": 1026,
    "name": "Rodilleras de Potencia para Levantamiento Pesado (Par)",
    "slug": "rodilleras-de-potencia",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 38.0,
    "compareAtPrice": 48.0,
    "stock": 45,
    "sku": "BF-ROD-001",
    "saleMode": "direct_cart",
    "shortDescription": "Al momento de hacer levantamientos pesados para nuestro cuerpo, es crucial brindar soporte a las rodillas. Diseñadas para compresión anatómica y calor articular en sentadillas y powerlifting.",
    "technicalSpecs": [
      "Neopreno de compresión de 7 mm de espesor grado competición",
      "Diseño ergonómico 3D que previene el desplazamiento de la rótula",
      "Mantiene la articulación caliente para aumentar la síntesis de líquido sinovial",
      "Costuras reforzadas de 4 hilos resistentes a la máxima tensión",
      "Presentación por par (2 unidades) aptas para powerlifting y crossfit"
    ],
    "images": [
      "images/products/rodilleras-de-potencia-1.jpg"
    ],
    "coachTip": "Úsalas en series efectivas pesadas (más del 75% de tu RM) para maximizar la estabilidad y confianza al salir del fondo de la sentadilla."
  },
  {
    "id": "wa-3627432107346962",
    "wcId": 1027,
    "name": "Almohadilla / Cojín de Espuma para Barra Gym",
    "slug": "almohadilla-para-barra-gym",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 28.0,
    "compareAtPrice": 36.0,
    "stock": 60,
    "sku": "BF-ALM-001",
    "saleMode": "direct_cart",
    "shortDescription": "Almohadilla de espuma gruesa y ergonómica que garantiza comodidad absoluta en el cuello, hombros y cadera durante sentadillas pesadas y empujes de cadera (Hip Thrust).",
    "technicalSpecs": [
      "Espuma de alta densidad NBR con memoria antichoque de 3.5 cm de grosor",
      "Canal anatómico central para liberar la presión en la columna cervical y coxis",
      "Recubrimiento antideslizante con correas de seguridad de doble velcro",
      "Compatible con barras olímpicas de 50 mm y barras estándar de 28 mm",
      "Material impermeable de fácil limpieza que no absorbe sudor"
    ],
    "images": [
      "images/products/almohadilla-para-barra-1.jpg"
    ],
    "coachTip": "Esencial para progresar en Hip Thrust con cargas pesadas protegiendo la cresta ilíaca sin molestias articulares."
  },
  {
    "id": "wa-8885746581543321",
    "wcId": 1028,
    "name": "Conos y Vallas de Pliometría y Coordinación",
    "slug": "conos-y-vallas-pliometria",
    "categorySlug": "funcional-resistencia",
    "categoryLabel": "Funcional & Resistencia",
    "price": 45.0,
    "compareAtPrice": 58.0,
    "stock": 40,
    "sku": "BF-CON-001",
    "saleMode": "direct_cart",
    "shortDescription": "Todo lo necesario para entrenamientos de velocidad, potencia de salto y coordinación. Conos perforados con vallas regulables en múltiples alturas para circuitos deportivos.",
    "technicalSpecs": [
      "Conos cónicos de alta visibilidad con perforaciones para travesaños a tres alturas",
      "Material plástico flexible indestructible que recupera su forma al pisarlo",
      "Varillas o vallas ligeras encajables para armar circuitos de salto vertical y lateral",
      "Apto para césped sintético, losa deportiva, parquet y arena",
      "Fácil apilamiento y almacenamiento compacto"
    ],
    "images": [
      "images/products/conos-y-vallas-pliometria-1.jpg"
    ],
    "coachTip": "Organiza progresiones de saltos reactivos con mínimo tiempo de contacto en suelo para desarrollar potencia explosiva de despegue."
  },
  {
    "id": "wa-5056991387697011",
    "wcId": 1029,
    "name": "Colchoneta de Ejercicios y Fitness de Alta Densidad",
    "slug": "colchoneta-ejercicios-fitness",
    "categorySlug": "yoga-pilates",
    "categoryLabel": "Yoga & Pilates",
    "price": 56.0,
    "compareAtPrice": 70.0,
    "stock": 40,
    "sku": "BF-COL-001",
    "saleMode": "direct_cart",
    "shortDescription": "Ahora podrás realizar tus ejercicios cómodamente con nuestras colchonetas de alta densidad. Superficie reforzada impermeable, fácil de lavar y acolchado amortiguador para suelo.",
    "technicalSpecs": [
      "Relleno de espuma aglomerada de alta densidad que no se deforma con el uso continuo",
      "Funda exterior de lona bagun impermeable con costuras dobles reforzadas",
      "Dimensiones amplias para trabajo de abdominales, planchas, estiramientos y calistenia",
      "Cierre perimetral oculto para facilitar desinfección rápida",
      "Superficie antideslizante con gran estabilidad en suelos lisos"
    ],
    "images": [
      "images/products/colchoneta-de-ejercicios-1.jpg"
    ],
    "coachTip": "Excelente para proteger rodillas y espalda baja en rutinas de core, hipopresivos y ejercicios de peso corporal."
  },
  {
    "id": "wa-4953754921367246",
    "wcId": 1030,
    "name": "Guantes Deportivos de Licra Transpirables",
    "slug": "guantes-de-licra-deportivos",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 19.0,
    "compareAtPrice": 26.0,
    "stock": 55,
    "sku": "BF-GUA-LIC",
    "saleMode": "direct_cart",
    "shortDescription": "Es tiempo de proteger tus manos de las lesiones por fricción y mejorar tu agarre. Tejido elástico de licra transpirable con palma acolchada antideslizante para pesas y ciclismo.",
    "technicalSpecs": [
      "Tejido elástico de licra de alta transpirabilidad y secado rápido",
      "Palma acolchada con inserciones de gel de sílice antideslizante de microfibra",
      "Ajuste en muñeca con velcro de sujeción firme",
      "Tiradores en dedos para extracción rápida después de entrenar",
      "Unisex, tallas adaptables con diseño moderno deportivo"
    ],
    "images": [
      "images/products/guantes-de-licra-1.jpg"
    ],
    "coachTip": "Ideales para personas que prefieren máxima ventilación en las manos y ligereza durante sesiones de gimnasio y cardio."
  },
  {
    "id": "wa-6294300543931698",
    "wcId": 1031,
    "name": "Straps Muñequeras con Gancho de Acero para Gimnasio",
    "slug": "straps-munequeras-gancho",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 26.0,
    "compareAtPrice": 35.0,
    "stock": 50,
    "sku": "BF-STR-GAN",
    "saleMode": "direct_cart",
    "shortDescription": "Los straps con gancho te permiten incrementar el peso que levantas inmediatamente. La fatiga del agarre del antebrazo deja de ser el factor limitante en peso muerto, dominadas y remos.",
    "technicalSpecs": [
      "Ganchos de acero sólido recubiertos en goma antideslizante que protegen el moleteado de la barra",
      "Muñequera con almohadilla de neopreno gruesa de 8 mm para cero presión ósea",
      "Cierre de velcro extra largo de grado industrial con anilla metálica de fijación",
      "Capacidad de tracción probada hasta 200 kg por mano",
      "Permite concentrarse 100% en la activación de dorsales y glúteos"
    ],
    "images": [
      "images/products/straps-munequeras-gancho-1.jpg"
    ],
    "coachTip": "Engancha directamente la barra sin necesidad de enrollar cintas. Ideal para tus series pesadas de jalón al pecho y peso muerto."
  },
  {
    "id": "wa-3841580875964456",
    "wcId": 1032,
    "name": "Guantes de Neopreno con Muñequera Reforzada",
    "slug": "guantes-de-neopreno-reforzados",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 26.0,
    "compareAtPrice": 35.0,
    "stock": 50,
    "sku": "BF-GUA-NEO",
    "saleMode": "direct_cart",
    "shortDescription": "Protege tus manos de callosidades y brinda máxima firmeza a tus muñecas con guantes de neopreno reforzado y banda elástica compresiva de soporte.",
    "technicalSpecs": [
      "Fabricados en neopreno térmico de alta densidad con refuerzos de cuero sintético en zonas de fricción",
      "Banda elástica compresiva integrada de 40 cm que envuelve y estabiliza la muñeca",
      "Palma con textura de panal de abeja antideslizante de alta adherencia a mancuernas y barras",
      "Costuras reforzadas dobles en entretela para uso intensivo de levantamiento",
      "Apertura transpirable en el dorso que disipa el exceso de calor"
    ],
    "images": [
      "images/products/guantes-de-neopreno-1.jpg"
    ],
    "coachTip": "La muñequera integrada previene la hiperextensión en press de banca militar y mancuernas pesadas."
  },
  {
    "id": "wa-4946828758741237",
    "wcId": 6002,
    "name": "Accesorios para Máquina de Polea (Tobilleras y Soga Jalón)",
    "slug": "accesorios-maquina-polea",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 45.0,
    "compareAtPrice": 60.0,
    "stock": 35,
    "sku": "BF-POL-001",
    "saleMode": "direct_cart",
    "shortDescription": "Variedad de accesorios de alta durabilidad para optimizar tu entrenamiento en máquina de poleas en casa o gimnasio comercial.",
    "technicalSpecs": [
      "Tobilleras de cuero reforzadas con acolchado interior de neopreno y argolla de acero inoxidable (S/ 45)",
      "Soga trenzada para jalón de tríceps con topes de goma vulcanizada (S/ 65)",
      "Compatibles con todo tipo de máquinas de polea alta, baja o torres de cables universales",
      "Costuras de alta resistencia diseñadas para carga pesada y máxima tracción"
    ],
    "images": [
      "images/products/accesorios-maquina-polea-1.jpg"
    ],
    "variants": [
      {
        "id": "pol-tobillera",
        "name": "Tobilleras de Cuero (Par)",
        "subtitle": "Acolchado neopreno + argolla D",
        "imageIndex": 0,
        "tag": "S/ 45",
        "price": 45.0
      },
      {
        "id": "pol-soga",
        "name": "Soga para Jalón de Tríceps",
        "subtitle": "Nylon trenzado alta tracción",
        "imageIndex": 0,
        "tag": "S/ 65",
        "price": 65.0
      }
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": false,
    "relatedArticleSlugs": [
      "biomecanica-remo-mancuerna"
    ],
    "coachTip": "Usa las tobilleras para patadas de glúteo e hiperextensiones manteniendo la cadera alineada. La soga de tríceps te permite abrir los extremos en el punto máximo de contracción."
  },
  {
    "id": "wa-3211541572231710",
    "wcId": 6003,
    "name": "Bandas Elásticas Power Loop CrossFit",
    "slug": "bandas-elasticas-crossfit-poder",
    "categorySlug": "funcional-resistencia",
    "categoryLabel": "Funcional & Resistencia",
    "price": 149.0,
    "compareAtPrice": 185.0,
    "stock": 45,
    "sku": "BF-BND-XFIT",
    "saleMode": "direct_cart",
    "shortDescription": "Bandas elásticas circulares de látex 100% natural para entrenamientos de fuerza, asistencia en dominadas de calistenia y acondicionamiento deportivo.",
    "technicalSpecs": [
      "Material: Látex natural de alta elasticidad y memoria de tracción",
      "Pack Completo (S/ 149): Incluye las 4 resistencias (#1 Roja, #2 Negra, #3 Morada, #4 Verde)",
      "Opción Individual #1 Roja (10-35 Lb): S/ 35",
      "Opción Individual #2 Negra (20-60 Lb): S/ 45",
      "Opción Individual #3 Morada (35-85 Lb): S/ 55",
      "Opción Individual #4 Verde (50-125 Lb): S/ 65",
      "Largo continuo de 208 cm (perímetro circular)",
      "Ideal para dominadas asistidas, calentamiento y movilidad muscular"
    ],
    "images": [
      "images/products/bandas-elasticas-crossfit-1.jpg"
    ],
    "variants": [
      {
        "id": "bnd-pack",
        "name": "Pack Completo 4 Resistencias (#1 al #4)",
        "subtitle": "Ahorro total - Todas las tensiones",
        "imageIndex": 0,
        "tag": "S/ 149",
        "price": 149.0
      },
      {
        "id": "bnd-roja",
        "name": "Banda Roja #1 (10-35 Lb)",
        "subtitle": "Tensión Ligera / Calentamiento",
        "imageIndex": 0,
        "tag": "S/ 35",
        "price": 35.0
      },
      {
        "id": "bnd-negra",
        "name": "Banda Negra #2 (20-60 Lb)",
        "subtitle": "Tensión Media / Hombros y brazos",
        "imageIndex": 0,
        "tag": "S/ 45",
        "price": 45.0
      },
      {
        "id": "bnd-morada",
        "name": "Banda Morada #3 (35-85 Lb)",
        "subtitle": "Tensión Fuerte / Asistencia media",
        "imageIndex": 0,
        "tag": "S/ 55",
        "price": 55.0
      },
      {
        "id": "bnd-verde",
        "name": "Banda Verde #4 (50-125 Lb)",
        "subtitle": "Tensión Extra Fuerte / Dominadas pesadas",
        "imageIndex": 0,
        "tag": "S/ 65",
        "price": 65.0
      }
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "calistenia-dominadas-progresion"
    ],
    "coachTip": "Si estás aprendiendo a hacer dominadas, empieza con la banda morada o verde pasando la rodilla en el lazo para descargar peso de forma controlada hasta lograr tus primeras repeticiones estrictas."
  },
  {
    "id": "wa-24872571689085748",
    "wcId": 6004,
    "name": "Bancas de Entrenamiento Heavy Duty (Plana / Inclinada)",
    "slug": "bancas-entrenamiento-gimnasio",
    "categorySlug": "entrenamiento-fuerza",
    "categoryLabel": "Fuerza & Pesas",
    "price": 140.0,
    "compareAtPrice": 180.0,
    "stock": 20,
    "sku": "BF-BNC-HD",
    "saleMode": "direct_cart",
    "shortDescription": "Superficie de trabajo reforzada para press con mancuernas, barra y ejercicios de fuerza con máxima estabilidad para entrenar pesado en casa.",
    "technicalSpecs": [
      "Estructura de acero tubular de alta densidad con pintura electrostática anticorrosiva",
      "Tapizado de cuero sintético transpirable con espuma compacta de alta densidad",
      "Banca Plana (S/ 140): Soporta hasta 250 kg de carga total",
      "Banca Inclinada Multiposición (S/ 470): Regulación de 6 ángulos en respaldo y 3 en asiento con soporte acolchado para piernas",
      "Bases con topes de jebe antideslizantes para proteger el piso de tu hogar"
    ],
    "images": [
      "images/products/bancas-entrenamiento-gimnasio-1.jpg"
    ],
    "variants": [
      {
        "id": "bnc-plana",
        "name": "Banca Plana Heavy Duty",
        "subtitle": "Base sólida para press y remo",
        "imageIndex": 0,
        "tag": "S/ 140",
        "price": 140.0
      },
      {
        "id": "bnc-inclinada",
        "name": "Banca Inclinada Multiposición",
        "subtitle": "6 ángulos de ajuste + soporte piernas",
        "imageIndex": 0,
        "tag": "S/ 470",
        "price": 470.0
      }
    ],
    "driveFolderId": "whatsapp-catalog",
    "featured": true,
    "relatedArticleSlugs": [
      "biomecanica-remo-mancuerna"
    ],
    "coachTip": "Al hacer press inclinado, apoya firmemente los pies contra el suelo y retrae las escápulas para proteger tus hombros y maximizar la activación del pectoral superior."
  }
];

export const PRODUCT_CATEGORIES: { slug: ProductCategorySlug | "todos"; label: string; badge?: string }[] = [
  { slug: "todos", label: "Todos los Productos" },
  { slug: "yoga-pilates", label: "Yoga & Pilates (5)" },
  { slug: "entrenamiento-fuerza", label: "Fuerza & Pesas (4)" },
  { slug: "calistenia", label: "Calistenia & Peso Corporal (4)" },
  { slug: "fajas-reductoras", label: "Fajas Reductoras & Cuidado (3)" },
  { slug: "natacion-acuaticos", label: "Natación & Acuáticos (3)" },
  { slug: "boxeo-artes-marciales", label: "Boxeo & Combate (3)" },
  { slug: "electronicos", label: "Electrónicos (1)" },
  { slug: "funcional-resistencia", label: "Funcional & Resistencia (1)" }
];

export function buildWhatsAppAdvisorUrl(product: BassfitProduct, customQuestion?: string): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_ADVISOR_PHONE || "51967581481";
  const text =
    customQuestion ||
    `Hola equipo Bassfit 👋, deseo realizar una consulta sobre el producto: *${product.name}* (S/ ${product.price}). ¿Tienen disponibilidad y opciones de entrega en Lima / Provincias?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppCoachUrl(programTitle: string, userData?: { name?: string; age?: string; goal?: string }): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_COACH_PHONE || "51967581481";
  const details = userData?.name
    ? `Soy *${userData.name}* (${userData.age || "edad no indicada"} años). Mi objetivo principal es: *${userData.goal || "Entrenamiento personalizado"}*.`
    : "Me gustaría agendar mi evaluación inicial.";
  const text = `Hola entrenadores de Bassfit 💪 («...fitness sin límites de edad..»), quiero información e inscripción en el programa: *${programTitle}*. ${details}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}


export const PRODUCT_RECOMMENDATIONS: Record<string, string[]> = {
  "mat-de-yoga-6mm-10mm-15mm": ["ladrillo-de-yoga", "bandas-elasticas-abiertas", "pelota-pilates-inflador"],
  "colchoneta-ejercicios-fitness": ["foam-roller", "bandas-elasticas-abiertas", "ladrillo-de-yoga"],
  "ladrillo-de-yoga": ["mat-de-yoga-6mm-10mm-15mm", "bandas-elasticas-abiertas", "pelota-pilates-inflador"],
  "pelota-pilates-inflador": ["mat-de-yoga-6mm-10mm-15mm", "ladrillo-de-yoga", "foam-roller"],
  "foam-roller": ["mat-de-yoga-6mm-10mm-15mm", "bandas-elasticas-abiertas", "fascialgun-pistola-de-masaje"],
  "bandas-elasticas-abiertas": ["mat-de-yoga-6mm-10mm-15mm", "ladrillo-de-yoga", "foam-roller"],

  "promo-barra-manubrios-y-discos-20kg-30kg-40kg": ["guantes-de-neopreno-reforzados", "cinturon-de-pesas-de-cuero", "almohadilla-para-barra-gym"],
  "set-de-mancuernas": ["guantes-de-neopreno-reforzados", "cinturon-de-pesas-de-cuero", "straps-munequeras-gancho"],
  "pesas-rusas-pvc": ["guantes-de-licra-deportivos", "cinturon-de-pesas-de-cuero", "kit-ligas-elasticas"],
  "cinturon-de-pesas-de-cuero": ["rodilleras-de-potencia", "straps-munequeras-gancho", "guantes-de-neopreno-reforzados"],
  "rodilleras-de-potencia": ["cinturon-de-pesas-de-cuero", "straps-munequeras-gancho", "almohadilla-para-barra-gym"],
  "almohadilla-para-barra-gym": ["rodilleras-de-potencia", "cinturon-de-pesas-de-cuero", "guantes-de-neopreno-reforzados"],
  "guantes-de-licra-deportivos": ["cinturon-de-pesas-de-cuero", "kit-ligas-elasticas", "set-de-mancuernas"],
  "guantes-de-neopreno-reforzados": ["cinturon-de-pesas-de-cuero", "straps-munequeras-gancho", "promo-barra-manubrios-y-discos-20kg-30kg-40kg"],
  "straps-munequeras-gancho": ["cinturon-de-pesas-de-cuero", "rodilleras-de-potencia", "guantes-de-neopreno-reforzados"],

  "barras-8en1-multifuncional": ["cinturon-de-lastre", "chaleco-de-lastre", "push-up-board-tablero-dinamico-para-flexiones"],
  "cinturon-de-lastre": ["barras-8en1-multifuncional", "chaleco-de-lastre", "straps-munequeras-gancho"],
  "chaleco-de-lastre": ["barras-8en1-multifuncional", "cinturon-de-lastre", "tobilleras-de-arena"],
  "tobilleras-de-arena": ["chaleco-de-lastre", "escalera-pliometrica-agilidad", "kit-ligas-elasticas"],
  "push-up-board-tablero-dinamico-para-flexiones": ["barras-8en1-multifuncional", "guantes-de-licra-deportivos", "chaleco-de-lastre"],

  "kit-ligas-elasticas": ["escalera-pliometrica-agilidad", "guantes-de-licra-deportivos", "conos-y-vallas-pliometria"],
  "escalera-pliometrica-agilidad": ["conos-y-vallas-pliometria", "tobilleras-de-arena", "kit-ligas-elasticas"],
  "conos-y-vallas-pliometria": ["escalera-pliometrica-agilidad", "tobilleras-de-arena", "kit-ligas-elasticas"],

  "saco-de-boxeo-lleno": ["vendas-de-boxeo", "pelota-de-reflejos"],
  "vendas-de-boxeo": ["saco-de-boxeo-lleno", "pelota-de-reflejos"],
  "pelota-de-reflejos": ["vendas-de-boxeo", "saco-de-boxeo-lleno"],

  "tabla-de-natacion": ["gorro-de-natacion-silicona", "flotador-de-piernas-pullboy"],
  "gorro-de-natacion-silicona": ["tabla-de-natacion", "flotador-de-piernas-pullboy"],
  "flotador-de-piernas-pullboy": ["tabla-de-natacion", "gorro-de-natacion-silicona"],

  "faja-cinturilla-avispa": ["crema-corporal-caliente", "faja-chaleco-sauna"],
  "faja-chaleco-sauna": ["crema-corporal-caliente", "faja-cinturilla-avispa"],
  "crema-corporal-caliente": ["faja-cinturilla-avispa", "faja-chaleco-sauna"],

  "fascialgun-pistola-de-masaje": ["foam-roller", "bandas-elasticas-abiertas", "colchoneta-ejercicios-fitness"]
};

export const CATEGORY_RECOMMENDATIONS: Record<string, string[]> = {
  "yoga-pilates": ["ladrillo-de-yoga", "bandas-elasticas-abiertas", "foam-roller"],
  "entrenamiento-fuerza": ["guantes-de-neopreno-reforzados", "cinturon-de-pesas-de-cuero", "straps-munequeras-gancho"],
  "calistenia": ["cinturon-de-lastre", "chaleco-de-lastre", "push-up-board-tablero-dinamico-para-flexiones"],
  "funcional-resistencia": ["kit-ligas-elasticas", "escalera-pliometrica-agilidad", "conos-y-vallas-pliometria"],
  "boxeo-artes-marciales": ["vendas-de-boxeo", "pelota-de-reflejos", "saco-de-boxeo-lleno"],
  "natacion-acuaticos": ["gorro-de-natacion-silicona", "flotador-de-piernas-pullboy", "tabla-de-natacion"],
  "fajas-reductoras": ["crema-corporal-caliente", "faja-cinturilla-avispa", "faja-chaleco-sauna"],
  "electronicos": ["foam-roller", "bandas-elasticas-abiertas", "colchoneta-ejercicios-fitness"]
};

export function getProductRecommendations(product: BassfitProduct): BassfitProduct[] {
  if (!product) return [];
  const recSlugs = PRODUCT_RECOMMENDATIONS[product.slug] || CATEGORY_RECOMMENDATIONS[product.categorySlug] || [];
  return recSlugs
    .filter((slug) => slug !== product.slug)
    .slice(0, 3)
    .map((slug) => BASSFIT_PRODUCTS.find((p) => p.slug === slug))
    .filter((p): p is BassfitProduct => Boolean(p));
}

export function getCategoryRecommendations(categorySlug: string): BassfitProduct[] {
  if (!categorySlug || categorySlug === "todos") return [];
  const recSlugs = CATEGORY_RECOMMENDATIONS[categorySlug] || [];
  return recSlugs
    .slice(0, 3)
    .map((slug) => BASSFIT_PRODUCTS.find((p) => p.slug === slug))
    .filter((p): p is BassfitProduct => Boolean(p));
}


export interface TutorialItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  duration: string;
  image: string;
  description: string;
  badge: string;
  coachName: string;
  coachRole: string;
  keySteps: string[];
  relatedProductSlug?: string;
  isVideo: boolean;
}

export type EventCategoryType = 
  | "Clases online"
  | "Eventos presenciales"
  | "Stands y ferias"
  | "Entrenamientos especiales"
  | "Otros eventos";

export interface CommunityEvent {
  id: string;
  title: string;
  category: EventCategoryType;
  modality: "Presencial" | "Online";
  date: string;
  time: string;
  startIso: string;
  endIso: string;
  location: string;
  isVirtual: boolean;
  virtualLink?: string;
  registrationUrl?: string;
  description: string;
  instructor?: string;
  badge?: string;
  spotsLeft?: number;
  price?: string;
  requirements?: string[];
  image: string;
  status?: "published" | "draft" | "cancelled" | "completed";
  featured?: boolean;
}

export const TUTORIALS_DATA: TutorialItem[] = [
  {
    id: "tut-1",
    slug: "biomecanica-remo-mancuerna",
    title: "Biomecánica del Remo con Mancuerna & Fuerza Posterior",
    category: "Fuerza & Levantamiento",
    duration: "06:45 min",
    image: "images/mockup_vlog_hd.jpg",
    description: "Aprende a fijar la cintura escapular, evitar tirones lumbares y activar al 100% el dorsal ancho con mancuernas.",
    badge: "TUTORIAL PRO",
    coachName: "Head Coach Bassfit",
    coachRole: "Especialista en Biomecánica y Fuerza",
    keySteps: [
      "Posición del torso a 45° con columna neutra y rodillas desbloqueadas",
      "Tracción hacia la cadera en trayectoria parabólica, no hacia el hombro",
      "Pausa isométrica de 1 segundo en la máxima contracción muscular",
      "Descenso controlado en 3 segundos sintiendo el estiramiento del dorsal"
    ],
    relatedProductSlug: "set-de-mancuernas",
    isVideo: true
  },
  {
    id: "tut-2",
    slug: "dominadas-perfectas-barra-8en1",
    title: "Dominadas Perfectas en Barra 8en1 & Lastre Progresivo",
    category: "Calistenia & Peso Corporal",
    duration: "08:20 min",
    image: "images/products/barras-8en1-multifuncional-1.jpg",
    description: "Técnica de agarre prono y supino, activación escapular y cómo utilizar el cinturón de lastre con seguridad.",
    badge: "CALISTENIA",
    coachName: "Coach de Calistenia BF",
    coachRole: "Atleta de Calistenia & Fuerza Estricta",
    keySteps: [
      "Depresión escapular activa antes de iniciar la fase de tracción",
      "Cruzar piernas y tensar glúteos para evitar balanceo o kipping",
      "Pasar la barbilla por encima de la barra manteniendo el pecho erguido",
      "Regulación del cinturón de lastre a la altura de la cresta ilíaca"
    ],
    relatedProductSlug: "barras-8en1-multifuncional",
    isVideo: true
  },
  {
    id: "tut-3",
    slug: "liberacion-miofascial-foam-roller",
    title: "Liberación Miofascial con Foam Roller & Mat de Yoga",
    category: "Yoga & Recuperación",
    duration: "05:30 min",
    image: "images/products/foam-roller-1.jpg",
    description: "Protocolo de descarga para cuádriceps, banda iliotibial y zona dorsal para recuperar movilidad y evitar contracturas.",
    badge: "RECUPERACIÓN",
    coachName: "Fisioterapeuta Bassfit",
    coachRole: "Terapia Física & Movilidad",
    keySteps: [
      "Rodar lentamente 2 a 3 cm por segundo sobre la masa muscular",
      "Detenerse 30 segundos sobre puntos gatillo o zonas de tensión",
      "Respirar diafragmáticamente de forma pausada sin aguantar el aire",
      "Evitar pasar directamente sobre articulaciones o prominencias óseas"
    ],
    relatedProductSlug: "foam-roller",
    isVideo: true
  },
  {
    id: "tut-4",
    slug: "pliometria-coordinacion-escalera-agilidad",
    title: "Pliometría & Coordinación con Escalera de Velocidad",
    category: "Funcional & Resistencia",
    duration: "07:15 min",
    image: "images/products/escalera-pliometrica-1.jpg",
    description: "Circuitos de agilidad visomotora, apoyos unipodales y cambio de ritmo para mejorar tu rendimiento deportivo.",
    badge: "AGILIDAD",
    coachName: "Entrenador Funcional BF",
    coachRole: "Preparador Físico Deportivo",
    keySteps: [
      "Apoyo exclusivo sobre metatarsos manteniendo talones despegados",
      "Coordinación de braceo sincrónico en 90 grados",
      "Patrones progresivos: 1-in-the-hole, Ickey Shuffle y laterales",
      "Intervalos de 30 segundos de alta intensidad por 30 de descanso"
    ],
    relatedProductSlug: "escalera-pliometrica-agilidad",
    isVideo: true
  },
  {
    id: "tut-5",
    slug: "vendaje-boxeo-reflejos",
    title: "Vendaje Profesional de Muñecas & Trabajo de Reflejos",
    category: "Boxeo & Combate",
    duration: "04:50 min",
    image: "images/products/vendas-de-boxeo-1.jpg",
    description: "Protege tus nudillos y fija la articulación de la muñeca antes de golpear el saco o entrenar con la pelota de reflejos.",
    badge: "BOXEO",
    coachName: "Instructor de Boxeo BF",
    coachRole: "Técnica de Combate & Striking",
    keySteps: [
      "Iniciar con la lazada en el pulgar y cruzar por el dorso hacia la muñeca",
      "3 vueltas firmes en la muñeca sin cortar la circulación sanguínea",
      "Paso en X entre cada dedo acolchando la zona de impacto de los nudillos",
      "Fijación final con velcro verificando la rigidez articular al cerrar el puño"
    ],
    relatedProductSlug: "vendas-de-boxeo",
    isVideo: true
  },
  {
    id: "tut-6",
    slug: "optimizacion-termica-faja-cinturilla",
    title: "Optimización Térmica: Uso de Faja Cinturilla & Gel Lipo",
    category: "Cuidado Corporal",
    duration: "04:10 min",
    image: "images/products/faja-cinturilla-avispa-1.jpg",
    description: "Aprende a aplicar el gel reductor termogénico y regular la compresión de la faja para sesiones cardiovasculares seguras.",
    badge: "BIENESTAR",
    coachName: "Asesora de Estética & Fitness",
    coachRole: "Cuidado Corporal & Nutrición",
    keySteps: [
      "Aplicar una capa fina de gel lipo reductor con masajes circulares",
      "Ajustar la faja primero con los corchetes interiores de compresión media",
      "Cerrar la banda de velcro reforzada asegurando soporte lumbar firme",
      "Hidratarse constantemente antes, durante y después de la sesión"
    ],
    relatedProductSlug: "faja-cinturilla-avispa",
    isVideo: true
  }
];

export const COMMUNITY_EVENTS_DATA: CommunityEvent[] = [
  {
    id: "evt-1",
    title: "Masterclass de Calistenia: Dominadas y Fondos en Barra 8en1",
    category: "Entrenamientos especiales",
    modality: "Presencial",
    date: "Sábado, 15 de Noviembre 2026",
    time: "09:00 AM - 11:30 AM",
    startIso: "20261115T140000Z",
    endIso: "20261115T163000Z",
    location: "Parque Miguel de Cervantes (Av. del Ejército, San Isidro, Lima)",
    isVirtual: false,
    description: "Entrenamiento grupal al aire libre para perfeccionar la técnica de tracción estricta, dominadas con agarre neutro, fondos en paralelas y progresiones con cinturón de lastre.",
    instructor: "Coach Marco Antonio (Especialista en Calistenia Bassfit)",
    badge: "CUPOS LIMITADOS",
    spotsLeft: 8,
    price: "Gratuito para Clientes Bassfit",
    requirements: [
      "Ropa deportiva transpirable y zapatillas de entrenamiento",
      "Llevar botella de agua personal (1 litro mínimo)",
      "Toalla pequeña y guantes deportivos opcionales",
      "Puntualidad: registro inicia 15 minutos antes"
    ],
    image: "images/products/barras-8en1-multifuncional-1.jpg",
    status: "published",
    featured: true
  },
  {
    id: "evt-2",
    title: "Taller Vivencial: Movilidad Articular & Descarga con Foam Roller",
    category: "Eventos presenciales",
    modality: "Presencial",
    date: "Domingo, 23 de Noviembre 2026",
    time: "08:30 AM - 10:00 AM",
    startIso: "20261123T133000Z",
    endIso: "20261123T150000Z",
    location: "Parque María Reiche (Malecón de la Marina, Miraflores, Lima)",
    isVirtual: false,
    description: "Sesión práctica frente al mar para descontracturar columna, mejorar dorsiflexión de tobillo y liberar tensión miofascial con foam roller y bandas elásticas abiertas.",
    instructor: "Lic. Valeria Gómez (Fisioterapeuta & Movilidad BF)",
    badge: "BIENESTAR",
    spotsLeft: 12,
    price: "Ingreso Libre / Previa Inscripción",
    requirements: [
      "Mat de yoga o colchoneta propia",
      "Foam roller (Bassfit dispondrá de implementos para préstamo)",
      "Ropa cómoda para elongación muscular",
      "Bloqueador solar e hidratación"
    ],
    image: "images/products/foam-roller-1.jpg",
    status: "published",
    featured: true
  },
  {
    id: "evt-3",
    title: "Stand Bassfit en Feria Deportiva & Expo Fitness Lima 2026",
    category: "Stands y ferias",
    modality: "Presencial",
    date: "Sábado, 28 de Noviembre 2026",
    time: "10:00 AM - 06:00 PM",
    startIso: "20261128T150000Z",
    endIso: "20261128T230000Z",
    location: "Explanada del Parque de la Reserva (Cercado de Lima)",
    isVirtual: false,
    description: "Ven a probar toda nuestra línea de implementos en vivo: mancuernas cromadas, barras multifunción, colchonetas y suplementos con descuentos exclusivos de feria y asesoría técnica directa.",
    instructor: "Equipo Oficial Bassfit Perú",
    badge: "STAND OFICIAL",
    spotsLeft: 100,
    price: "Acceso Gratuito a la Feria",
    requirements: [
      "Ingreso libre para todo el público",
      "Zona de pruebas para testeos de barras y mancuernas",
      "Stickers y obsequios Bassfit para los primeros 50 asistentes"
    ],
    image: "images/mockup_vlog_hd.jpg",
    status: "published",
    featured: false
  },
  {
    id: "evt-4",
    title: "Entrenamiento Funcional en Vivo & Técnica Biomecánica",
    category: "Clases online",
    modality: "Online",
    date: "Jueves, 03 de Diciembre 2026",
    time: "07:00 PM - 08:30 PM",
    startIso: "20261204T000000Z",
    endIso: "20261204T013000Z",
    location: "Google Meet / YouTube Live Privado",
    isVirtual: true,
    virtualLink: "https://meet.google.com/bf-noticias-comunidad",
    description: "Clase online en vivo guiada paso a paso: calentamiento dinámico, circuito de fuerza con bandas de resistencia y mancuernas, corrección de postura en tiempo real y ronda de preguntas.",
    instructor: "Head Coach Bassfit & Staff Técnico",
    badge: "EN VIVO ONLINE",
    spotsLeft: 50,
    price: "100% Online Gratuito",
    requirements: [
      "Conexión a internet estable (PC, tablet o celular)",
      "Espacio despejado de 2x2 metros",
      "Mat de ejercicios o alfombra cómoda",
      "Ligas o mancuernas de peso moderado"
    ],
    image: "images/products/bandas-elasticas-abiertas-1.jpg",
    status: "published",
    featured: true
  },
  {
    id: "evt-5",
    title: "Desafío de Calistenia: Reto Comunitario de Tracción & Resistencia",
    category: "Otros eventos",
    modality: "Presencial",
    date: "Sábado, 12 de Diciembre 2026",
    time: "08:00 AM - 11:00 AM",
    startIso: "20261212T130000Z",
    endIso: "20261212T160000Z",
    location: "Complejo Deportivo Manuel Bonilla (Malecón de la Marina, Miraflores)",
    isVirtual: false,
    description: "Torneo amistoso por categorías (amateur y avanzado) de dominadas estrictas, fondos en paralelas y flexiones con cronómetro. ¡Premios en implementos oficiales Bassfit a los ganadores!",
    instructor: "Jueces de Calistenia Bassfit Perú",
    badge: "PREMIOS OFICIALES",
    spotsLeft: 25,
    price: "Inscripción Gratuita",
    requirements: [
      "Llegar 20 minutos antes para pesaje y asignación de turno",
      "Zapatillas deportivas con buen agarre",
      "Magnesio líquido permitido",
      "DNI físico para registro"
    ],
    image: "images/products/escalera-pliometrica-1.jpg",
    status: "published",
    featured: false
  }
];

export function buildGoogleCalendarUrl(event: CommunityEvent): string {
  const title = encodeURIComponent(`Bassfit: ${event.title}`);
  const dates = `${event.startIso || "20261115T140000Z"}/${event.endIso || "20261115T163000Z"}`;
  const details = encodeURIComponent(
    `${event.description}\n\n` +
    `👤 Instructor / A cargo: ${event.instructor || "Equipo Bassfit"}\n` +
    `📍 Ubicación: ${event.location}\n` +
    `🏷️ Categoría: ${event.category} · ${event.modality} (${event.price || "Gratuito"})\n` +
    (event.virtualLink ? `🔗 Enlace Virtual: ${event.virtualLink}\n` : '') +
    (event.requirements && event.requirements.length > 0 ? `📋 Requisitos: ${event.requirements.join(", ")}\n` : '') +
    `\n⚡ Más información y catálogo en Bassfit Perú (+51 967 581 481).`
  );
  const location = encodeURIComponent(event.isVirtual ? (event.virtualLink || "Online") : event.location);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}
