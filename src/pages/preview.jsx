import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useParams } from "react-router-dom";
// Import Lucide-React untuk ikon Menu, Close, dan Shopping Cart
import { Menu, X, ShoppingCart, Minus, Plus } from "lucide-react";

// ===========================================
//  1. DEFINISI TEMPLATE & HELPERS
// ... (Semua definisi TRANSLATIONS, TEMPLATES, formatCurrency, dan gaya helper lainnya tetap sama)
const TRANSLATIONS = {
  id: {
    title: "Menu Digital",
    categoryTitle: "Kategori Menu:",
    all: "Semua",
    cartTitle: "🛒 Keranjang",
    cartEmpty: "Keranjang kosong.",
    total: "Total:",
    checkout: "Checkout Pesanan",
    availableItems: "Item Tersedia",
    add: "+ Tambah",
    descMessage:
      "Pesan mudah tanpa perlu ngantri ribet ke kasir ya kan, yuk cukup list pesanan kamu dan kirimkan orderan kamu ke wa admin nanti mimin langsung proses pesenan kamu :)",
    viewCart: "Lihat Keranjang", // Teks baru untuk tombol di fixed bar
    confirmCheckout: "Konfirmasi & Kirim Pesanan", // Teks baru di Modal
  },
  en: {
    title: "Digital Menu",
    categoryTitle: "Menu Categories:",
    all: "All",
    cartTitle: "🛒 Your Cart",
    cartEmpty: "Your cart is empty.",
    total: "Total:",
    checkout: "Checkout via WhatsApp",
    availableItems: "Items Available",
    add: "+ Add to Cart",
    descMessage:
      "Order easily without queuing up at the cashier. Just list your order and send it to the admin via WhatsApp. We will process your order immediately.",
    viewCart: "View Cart",
    confirmCheckout: "Confirm & Send Order",
  },
};

const TEMPLATES = {
  Colorful: {
    bgMain: "#FFF8F0",
    sidebarBg: "#3E2723",
    sidebarText: "#FFECB3",
    primaryAccent: "#D97706",
    cardBg: "#FFFFFF",
    cardShadow: "0 8px 24px rgba(62, 39, 35, 0.15)",
    cardBorder: "none",
    textColor: "#271C19",
  },

  Minimalist: {
    bgMain: "#f2f2f2",
    sidebarBg: "rgb(80, 20, 160)",
    sidebarText: "white",
    primaryAccent: "rgb(80, 20, 160)",
    cardBg: "white",
    cardShadow: "0 4px 10px rgba(0,0,0,0.08)",
    cardBorder: "none",
    textColor: "#333",
  },
};

const formatCurrency = (amount) => {
  const amountStr = String(Math.round(amount)).replace(/[^0-9]/g, "");
  if (!amountStr) return "0";
  const formatted = amountStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted;
};

const langButtonStyle = (isActive) => ({
  padding: "8px 12px",
  backgroundColor: isActive ? "white" : "rgba(255, 255, 255, 0.2)",
  color: isActive ? "rgb(80, 20, 160)" : "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.9em",
  flex: 1,
});

const previewThemeButtonStyle = (templateName, currentTemplate) => ({
  padding: "6px 10px",
  backgroundColor:
    templateName === currentTemplate ? "white" : "rgba(255, 255, 255, 0.2)",
  color: templateName === currentTemplate ? "rgb(80, 20, 160)" : "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.85em",
});

// ===========================================
// ⭐ 2. KOMPONEN PREVIEW UTAMA ⭐
// ===========================================

export default function Preview() {
  const { id: userId } = useParams();

  const [menu, setMenu] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [lang, setLang] = useState("id");
  const T = TRANSLATIONS[lang];

  const [settings, setSettings] = useState({
    template: "Colorful",
    whatsappNumber: "082229081327",
  });

  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // STATE MOBILE & SIDEBAR
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(false);
  // STATE BARU: Kontrol Modal Detail Keranjang
  const [showCartModal, setShowCartModal] = useState(false);

  // ⭐ Tema aktif diambil dari state settings ⭐
  const theme = TEMPLATES[settings.template] || TEMPLATES.Colorful;

  // --- HANDLER UNTUK MOBILE DETECT ---
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowSidebar(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // [FUNGSI-FUNGSI LOGIKA FETCHING TETAP SAMA]
  const handleTemplateChange = async (newTemplate) => {
    setSettings((prev) => ({ ...prev, template: newTemplate }));
    const { error } = await supabase
      .from("user_settings")
      .update({ template: newTemplate })
      .eq("user_id", userId);
    if (error) {
      console.error("Gagal menyimpan template:", error);
      alert("Gagal menyimpan pilihan template!");
    }
  };

  const fetchMenuData = async () => {
    const { data: menuData, error } = await supabase
      .from("menu_items")
      .select("id, name, Harga, Deskripsi, Kategori, foto_url, order")
      .order("order", { ascending: true });
    if (error) {
      console.error("Gagal mengambil menu:", error);
    }
    if (menuData) {
      setMenu(
        menuData.map((item) => ({
          ...item,
          price: item.Harga,
          desc: item.Deskripsi,
          category: item.Kategori,
          image: item.foto_url,
        }))
      );
    }
  };

  const fetchMenuAndSettings = async () => {
    setIsLoading(true);
    if (userId) {
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("template, whatsapp_number")
        .eq("user_id", userId)
        .single();
      if (settingsData) {
        setSettings({
          template: settingsData.template,
          whatsappNumber: settingsData.whatsapp_number,
        });
      }
    }
    await fetchMenuData();
    setIsLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchMenuAndSettings();
    const settingsChannel = supabase
      .channel("settings_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_settings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.template) {
            setSettings((prev) => ({
              ...prev,
              template: payload.new.template,
              whatsappNumber: payload.new.whatsapp_number,
            }));
          }
        }
      )
      .subscribe();

    const menuChannel = supabase
      .channel("menu_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          console.log("Perubahan menu terdeteksi. Memuat ulang data...");
          fetchMenuData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [userId]);

  // --- LOGIKA KERANJANG BELANJA ---
  const handleAddToCart = (item) => {
    setCart((cart) => {
      const existingItem = cart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...cart, { ...item, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (id, change) => {
    setCart((cart) =>
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) return alert(T.cartEmpty);
    // Tutup modal setelah checkout
    if (isMobile) setShowCartModal(false);

    // ... (Logika pembuatan pesan WhatsApp tetap sama)
    let greeting =
      lang === "id"
        ? "Hallo kak, saya ingin memesan menu berikut yaa"
        : "Hello, I would like to order the following menu";
    let totalText = lang === "id" ? "TOTAL HARGA" : "TOTAL PRICE";
    let thanksText =
      lang === "id"
        ? "Terimakasih kak, mohon segera diproses yaa."
        : "Thank you, please process my order immediately.";
    let orderList = cart
      .map((item, index) => {
        const itemName = item.name;
        return `${index + 1}. ${itemName} (${
          item.quantity
        } porsi) - Rp${formatCurrency(item.price * item.quantity)},00`;
      })
      .join("\n");
    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const message = `${greeting} :\n\n*DAFTAR PESANAN:*\n${orderList}\n\n*${totalText}: Rp${formatCurrency(
      total
    )},00*\n\n${thanksText}`;
    const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, "");
    const fullNumber = cleanNumber.startsWith("62")
      ? cleanNumber
      : `62${cleanNumber.substring(1)}`;
    const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
    setCart([]);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // --- FILTER & RENDERING LOGIC ---
  const allCategories = [...new Set(menu.map((item) => item.category))];
  const categories = [T.all, ...allCategories].slice(0, 5);

  const filteredMenu =
    selectedCategory === "All" || selectedCategory === T.all
      ? menu
      : menu.filter((item) => item.category === selectedCategory);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>Memuat Menu...</div>
    );
  }

  // --- STYLES RESPONSIF dan FIXED ---

  // Lebar Kolom
  const SIDEBAR_WIDTH = "280px";
  const CART_WIDTH = "350px";
  const CONTENT_PADDING = "30px";
  const COMPENSATING_PADDING = "50px";
  const FIXED_CART_HEIGHT = "80px";
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Style untuk Sidebar/Kolom 1 (Overlay di mobile)
  const sidebarStyle = {
    position: isMobile ? "fixed" : "fixed",
    top: 0,
    left: isMobile ? (showSidebar ? 0 : "-100%") : 0,
    height: "100vh",
    overflowY: "auto",
    width: isMobile ? "80%" : SIDEBAR_WIDTH,
    maxWidth: isMobile ? "300px" : SIDEBAR_WIDTH,
    backgroundColor: theme.sidebarBg,
    padding: CONTENT_PADDING,
    flexShrink: 0,
    borderRadius: isMobile ? "0 15px 15px 0" : "0 20px 20px 0",
    boxShadow: isMobile ? "0 0 15px rgba(0,0,0,0.3)" : theme.cardShadow,
    borderRight: isMobile ? "none" : theme.cardBorder,
    zIndex: 100,
    transition: "left 0.3s ease-in-out",
  };

  // Style untuk Keranjang/Kolom 3 - FIXED BOTTOM di Mobile
  const cartStyle = {
    position: isMobile ? "fixed" : "fixed",
    top: isMobile ? "auto" : 0,
    bottom: isMobile ? 0 : "auto",
    right: 0,
    left: isMobile ? 0 : "auto",
    height: isMobile ? FIXED_CART_HEIGHT : "100vh",
    overflowY: isMobile ? "hidden" : "auto",
    width: isMobile ? "100%" : CART_WIDTH,
    backgroundColor: theme.cardBg,
    padding: isMobile ? "10px 20px" : CONTENT_PADDING,
    flexShrink: 0,
    boxShadow: isMobile
      ? "0 -2px 10px rgba(0,0,0,0.1)"
      : "-4px 0 10px rgba(0,0,0,0.05)",
    borderLeft: isMobile ? "none" : theme.cardBorder,
    zIndex: 50,
    display: isMobile && totalQuantity === 0 ? "none" : "block",
    alignItems: "center",
    justifyContent: "space-between",
    ...(isMobile && { display: "flex" }),
    cursor: isMobile ? "pointer" : "default", // Tambahkan kursor agar terlihat bisa diklik di mobile
  };

  // Style untuk Konten Menu/Kolom 2 (Fleksibel)
  const menuContentStyle = {
    flexGrow: 1,
    padding: CONTENT_PADDING,
    marginLeft: isMobile
      ? "0"
      : `calc(${SIDEBAR_WIDTH} + ${COMPENSATING_PADDING})`,
    marginRight: isMobile
      ? "0"
      : `calc(${CART_WIDTH} + ${COMPENSATING_PADDING})`,
    minWidth: "auto",
    paddingBottom: isMobile ? FIXED_CART_HEIGHT : CONTENT_PADDING,
    paddingLeft: isMobile ? "20px" : CONTENT_PADDING,
    paddingRight: isMobile ? "20px" : CONTENT_PADDING,
  };

  // Gaya untuk overlay saat sidebar/modal terbuka
  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 99,
    display: isMobile && (showSidebar || showCartModal) ? "block" : "none",
  };

  // --- KOMPONEN MODAL DETAIL KERANJANG (BARU) ---
  const CartModal = () => (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "90%" : "500px",
        maxHeight: "80vh",
        backgroundColor: theme.cardBg,
        borderRadius: "10px",
        boxShadow: "0 5px 20px rgba(0,0,0,0.2)",
        zIndex: 101,
        display: showCartModal ? "block" : "none",
        overflow: "hidden",
      }}
    >
      {/* Header Modal */}
      <div
        style={{
          padding: "15px 20px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, color: theme.textColor }}>
          {T.cartTitle} ({totalQuantity})
        </h3>
        <button
          onClick={() => setShowCartModal(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: theme.textColor,
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Konten Daftar Item */}
      <div
        style={{
          maxHeight: "calc(80vh - 150px)",
          overflowY: "auto",
          padding: "10px 20px",
        }}
      >
        {cart.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "30px 0" }}>
            {T.cartEmpty}
          </p>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                borderBottom: "1px dotted #eee",
                paddingBottom: "10px",
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    color: theme.textColor,
                    fontSize: "0.9em",
                  }}
                >
                  {item.name}
                </div>
                <div style={{ fontSize: "0.8em", color: "#666" }}>
                  Rp{formatCurrency(item.price)},00
                </div>
              </div>

              {/* Kontrol Kuantitas (+/-) */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <button
                  onClick={() => handleUpdateQuantity(item.id, -1)}
                  style={{
                    padding: "5px",
                    background: "#f0f0f0",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ fontWeight: "bold", fontSize: "0.9em" }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(item.id, 1)}
                  style={{
                    padding: "5px",
                    background: "#f0f0f0",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Modal (Total dan Checkout) */}
      <div style={{ padding: "15px 20px", borderTop: "1px solid #ddd" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            fontSize: "1.2em",
            color: theme.textColor,
            marginBottom: "15px",
          }}
        >
          <span>{T.total}</span>
          <span>Rp{formatCurrency(cartTotal)},00</span>
        </div>
        <button
          onClick={handleCheckout}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#25D366",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1em",
          }}
          disabled={cart.length === 0}
        >
          {T.confirmCheckout} ({totalQuantity} Porsi)
        </button>
      </div>
    </div>
  );
  // --- AKHIR KOMPONEN MODAL DETAIL KERANJANG ---

  // --- RENDERING UTAMA ---
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        minHeight: "100vh",
        backgroundColor: theme.bgMain,
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      {/* 1. OVERLAY dan MODAL */}
      <div
        style={overlayStyle}
        onClick={() => {
          if (showSidebar) setShowSidebar(false);
          if (showCartModal) setShowCartModal(false);
        }}
      ></div>
      {isMobile && <CartModal />}

      {/* KOLOM 1: SIDEBAR/NAV (Desktop Fixed / Mobile Overlay) */}
      <div style={sidebarStyle}>
        {/* Tombol Close Sidebar di Mobile */}
        {isMobile && (
          <button
            onClick={() => setShowSidebar(false)}
            style={{
              position: "absolute",
              top: "15px",
              right: "15px",
              background: "none",
              border: "none",
              color: theme.sidebarText,
              cursor: "pointer",
              fontSize: "1.5em",
              zIndex: 101,
            }}
          >
            <X size={24} />
          </button>
        )}

        {/* Konten Sidebar (Tema, Bahasa, Kategori, Deskripsi) */}
        <div style={{ marginTop: isMobile ? "40px" : "0" }}>
          {/* ⭐⭐ TOMBOL THEME DI PREVIEW ⭐⭐ */}
          <div
            style={{
              padding: "10px 0",
              borderBottom: `1px solid ${
                theme.sidebarText === "white"
                  ? "rgba(255, 255, 255, 0.2)"
                  : "#ccc"
              }`,
              marginBottom: "30px",
            }}
          >
            <h4 style={{ color: theme.sidebarText, marginBottom: "10px" }}>
              {" "}
              Pilih Tema:{" "}
            </h4>
            <div style={{ display: "flex", gap: "5px" }}>
              <button
                onClick={() => handleTemplateChange("Colorful")}
                style={previewThemeButtonStyle("Colorful", settings.template)}
              >
                {" "}
                Colorful{" "}
              </button>
              <button
                onClick={() => handleTemplateChange("Minimalist")}
                style={previewThemeButtonStyle("Minimalist", settings.template)}
              >
                {" "}
                Minimalist{" "}
              </button>
            </div>
          </div>

          {/* TOGGLE BAHASA */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
            <button
              onClick={() => setLang("id")}
              style={langButtonStyle(lang === "id")}
            >
              {" "}
              ID{" "}
            </button>
            <button
              onClick={() => setLang("en")}
              style={langButtonStyle(lang === "en")}
            >
              {" "}
              EN{" "}
            </button>
          </div>

          <h2
            style={{
              color: theme.sidebarText,
              marginBottom: "40px",
              fontSize: "1.5em",
            }}
          >
            {" "}
            {T.title}{" "}
          </h2>
          <div
            style={{
              color: theme.sidebarText,
              opacity: 0.8,
              marginBottom: "20px",
              fontWeight: "bold",
            }}
          >
            {" "}
            {T.categoryTitle}{" "}
          </div>

          {/* Categories */}
          {categories.map((cat) => (
            <div
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                if (isMobile) setShowSidebar(false);
              }}
              style={{
                padding: "12px 15px",
                marginBottom: "10px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: selectedCategory === cat ? "bold" : "normal",
                backgroundColor:
                  selectedCategory === cat
                    ? "rgba(0, 0, 0, 0.1)"
                    : "transparent",
                transition: "background-color 0.2s",
                color: theme.sidebarText,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {cat}
            </div>
          ))}

          <div
            style={{
              marginTop: "50px",
              padding: "15px",
              backgroundColor:
                settings.template === "Colorful"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
              borderRadius: "10px",
              color: theme.sidebarText,
            }}
          >
            <p style={{ fontSize: "0.9em", opacity: 0.9 }}>{T.descMessage}</p>
          </div>
        </div>
      </div>

      {/* KOLOM 2: AREA KONTEN MENU */}
      <div style={menuContentStyle}>
        {/* Header Konten Mobile (dengan Hamburger Menu) */}
        {isMobile && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px 0",
              marginBottom: "20px",
              borderBottom: "1px solid #eee",
              backgroundColor: theme.bgMain,
              zIndex: 20,
            }}
          >
            <button
              onClick={() => setShowSidebar(true)}
              style={{
                background: "none",
                border: "none",
                color: theme.textColor,
                cursor: "pointer",
                fontSize: "1.5em",
              }}
            >
              <Menu size={28} />
            </button>
            <h1
              style={{ color: theme.textColor, fontSize: "1.4em", margin: 0 }}
            >
              {T.title} {selectedCategory === T.all ? T.all : selectedCategory}
            </h1>
            <div
              style={{
                padding: "6px 10px",
                backgroundColor: theme.cardBg,
                borderRadius: "15px",
                boxShadow: theme.cardShadow,
                border: theme.cardBorder,
                fontWeight: "bold",
                color: theme.primaryAccent,
                fontSize: "0.8em",
              }}
            >
              {menu.length} {T.availableItems}
            </div>
          </div>
        )}

        {/* Header Konten Desktop */}
        {!isMobile && (
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            <h1 style={{ color: theme.textColor, fontSize: "1.8em" }}>
              {T.title} {selectedCategory === T.all ? T.all : selectedCategory}
            </h1>
            <div
              style={{
                padding: "8px 15px",
                backgroundColor: theme.cardBg,
                borderRadius: "20px",
                boxShadow: theme.cardShadow,
                border: theme.cardBorder,
                fontWeight: "bold",
                color: theme.primaryAccent,
              }}
            >
              {menu.length} {T.availableItems}
            </div>
          </header>
        )}

        {/* Grid Item Menu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(auto-fill, minmax(150px, 1fr))"
              : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: theme.cardBg,
                borderRadius: "12px",
                boxShadow: theme.cardShadow,
                border: theme.cardBorder,
                overflow: "hidden",
                transition: "transform 0.2s",
              }}
            >
              {/* Gambar Item */}
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  style={{
                    width: "100%",
                    height: isMobile ? "180px" : "300px",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
              )}

              {/* Detail Teks */}
              <div style={{ padding: "10px" }}>
                <strong
                  style={{
                    fontSize: isMobile ? "0.9em" : "1.1em",
                    color: theme.textColor,
                  }}
                >
                  {item.name}
                </strong>
                <p
                  style={{
                    fontSize: isMobile ? "0.75em" : "0.9em",
                    color: "#666",
                    margin: "5px 0",
                  }}
                >
                  {item.desc}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "10px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: theme.primaryAccent,
                      fontSize: isMobile ? "0.9em" : "1em",
                    }}
                  >
                    Rp{formatCurrency(item.price)},00
                  </span>

                  {/* Tombol Add to Cart */}
                  <button
                    onClick={() => handleAddToCart(item)}
                    style={{
                      padding: isMobile ? "6px 10px" : "8px 12px",
                      backgroundColor: theme.primaryAccent,
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: isMobile ? "0.8em" : "0.9em",
                    }}
                  >
                    {T.add}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KOLOM 3: KERANJANG BELANJA - FIXED BOTTOM BAR / DESKTOP SIDEBAR */}

      {/* 1. Konten Keranjang Desktop (hanya render jika bukan mobile) */}
      {!isMobile && (
        <div style={cartStyle}>
          <h3
            style={{
              color: theme.textColor,
              borderBottom: `2px solid ${theme.primaryAccent}`,
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            {T.cartTitle}
          </h3>

          {/* List Item Keranjang */}
          <div
            style={{
              minHeight: "300px",
              maxHeight: "60vh",
              overflowY: "auto",
              marginBottom: "20px",
            }}
          >
            {cart.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#999",
                  paddingTop: "50px",
                }}
              >
                {T.cartEmpty}
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                    borderBottom: "1px dotted #eee",
                    paddingBottom: "10px",
                  }}
                >
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: "bold", color: theme.textColor }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>
                      Rp{formatCurrency(item.price)},00 x {item.quantity}
                    </div>
                  </div>

                  {/* Kontrol Kuantitas */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      style={{
                        padding: "5px",
                        background: "#f0f0f0",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      {" "}
                      <Minus size={14} />{" "}
                    </button>
                    <span style={{ fontWeight: "bold" }}>{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      style={{
                        padding: "5px",
                        background: "#f0f0f0",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      {" "}
                      <Plus size={14} />{" "}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total dan Tombol Checkout Desktop */}
          <div
            style={{
              marginTop: "20px",
              paddingTop: "15px",
              borderTop: `1px solid #ddd`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
                fontSize: "1.2em",
                color: theme.textColor,
              }}
            >
              <span>{T.total}</span>
              <span>Rp{formatCurrency(cartTotal)},00</span>
            </div>
            <button
              onClick={handleCheckout}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "12px",
                backgroundColor: "#25D366", // Hijau WA
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1em",
              }}
            >
              {T.checkout} ({totalQuantity} Porsi)
            </button>
          </div>
        </div>
      )}

      {/* 2. Fixed Bottom Cart Bar Mobile (hanya render jika mobile dan cart tidak kosong) */}
      {isMobile && totalQuantity > 0 && (
        <div style={cartStyle} onClick={() => setShowCartModal(true)}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              padding: "0 5px",
            }}
          >
            {/* Informasi Total */}
            <div style={{ color: theme.textColor }}>
              <span style={{ fontSize: "0.75em" }}>{T.total}</span>
              <br />
              <strong style={{ fontSize: "1.1em", color: theme.primaryAccent }}>
                Rp{formatCurrency(cartTotal)},00
              </strong>
            </div>

            {/* Tombol Lihat Keranjang Mobile */}
            <button
              style={{
                padding: "8px 30px",
                backgroundColor: "#25D366",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.85em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {T.viewCart}
              <span
                style={{
                  backgroundColor: "rgba(0,0,0,0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "0.8em",
                }}
              >
                {totalQuantity}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
