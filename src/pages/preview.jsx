import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useParams } from "react-router-dom";

// ===========================================
//  1. DEFINISI TEMPLATE & HELPERS

// ⭐ DATA TERJEMAHAN ⭐
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
  },
};

const TEMPLATES = {
  // TEMPLATE 1: Colorful (Inspirasi desain Ungu)
  Colorful: {
    bgMain: "#f2f2f2",
    sidebarBg: "rgb(80, 20, 160)",
    sidebarText: "white",
    primaryAccent: "rgb(80, 20, 160)",
    cardBg: "white",
    cardShadow: "0 4px 10px rgba(0,0,0,0.08)",
    cardBorder: "none",
    textColor: "#333",
  },
  // TEMPLATE 2: Minimalist
  Minimalist: {
    bgMain: "#ffffff",
    sidebarBg: "#f8f8f8",
    sidebarText: "#333",
    primaryAccent: "#007bff",
    cardBg: "#ffffff",
    cardShadow: "none",
    cardBorder: "1px solid #eee",
    textColor: "#333",
  },
};

/**
 * Memformat angka menjadi string format Rupiah (tanpa "Rp").
 */
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

  // ⭐ Tema aktif diambil dari state settings ⭐
  const theme = TEMPLATES[settings.template] || TEMPLATES.Colorful;

  // --- FUNGSI UPDATE SETTINGS (Untuk tombol Theme di Preview) ---
  const handleTemplateChange = async (newTemplate) => {
    // 1. Update State Lokal segera (agar terlihat cepat)
    setSettings((prev) => ({ ...prev, template: newTemplate }));

    // 2. Kirim Update ke DB
    const { error } = await supabase
      .from("user_settings")
      .update({ template: newTemplate })
      .eq("user_id", userId);

    if (error) {
      console.error("Gagal menyimpan template:", error);
      alert("Gagal menyimpan pilihan template!");
    }
  };

  // --- FUNGSI UTAMA UNTUK FETCH DATA MENU ---
  const fetchMenuData = async () => {
    const { data: menuData, error } = await supabase
      .from("menu_items")
      // PERBAIKAN 1: HANYA PILIH KOLOM YANG ADA DI DATABASE
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
          // PERBAIKAN 2: Hapus properti mapping untuk terjemahan yang tidak ada
          category: item.Kategori,
          image: item.foto_url,
        }))
      );
    }
  };

  // --- FUNGSI UNTUK FETCH DATA AWAL (MENU DAN SETTINGS) ---
  const fetchMenuAndSettings = async () => {
    setIsLoading(true);

    // 1. Ambil Settings (Template & WA Number)
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

    // 2. Ambil Data Menu
    await fetchMenuData();

    setIsLoading(false);
  };

  // ⭐ SUBSCRIBE KE PERUBAHAN SETTINGS DAN MENU SECARA REALTIME ⭐
  useEffect(() => {
    if (!userId) return;

    // 1. MUAT DATA AWAL
    fetchMenuAndSettings();

    // 2. LISTENER REALTIME UNTUK USER_SETTINGS (Perubahan Tema/WA)
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

    // 3. LISTENER REALTIME UNTUK MENU_ITEMS (Perbaikan Logika Utama)
    const menuChannel = supabase
      .channel("menu_items_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // MENDENGARKAN SEMUA EVENT: INSERT, UPDATE, DELETE
          schema: "public",
          table: "menu_items",
        },
        () => {
          console.log("Perubahan menu terdeteksi. Memuat ulang data...");
          fetchMenuData(); // Panggil ulang untuk mengambil data menu terbaru
        }
      )
      .subscribe();

    // Clean-up function (penting)
    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(menuChannel); // <--- Hapus channel menu
    };
  }, [userId]); // Dependency array: userId

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
        // PERBAIKAN 3: Hanya gunakan item.name (tanpa logika terjemahan)
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
  const categories = [T.all, ...new Set(menu.map((item) => item.category))];
  const filteredMenu =
    selectedCategory === "All" || selectedCategory === T.all
      ? menu
      : menu.filter((item) => item.category === selectedCategory);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>Memuat Menu...</div>
    );
  }

  // --- RENDERING DENGAN TIGA KOLOM ---
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: theme.bgMain,
        justifyContent: "space-between",
      }}
    >
      {/* KOLOM 1: SIDEBAR/NAV (Kategori & Tombol Theme) */}
      <div
        style={{
          width: "280px",
          backgroundColor: theme.sidebarBg,
          padding: "30px",
          flexShrink: 0,
          borderRadius: "0 20px 20px 0",
          boxShadow: theme.cardShadow,
          borderRight: theme.cardBorder,
        }}
      >
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
            Pilih Tema:
          </h4>
          <div style={{ display: "flex", gap: "5px" }}>
            <button
              onClick={() => handleTemplateChange("Colorful")}
              style={previewThemeButtonStyle("Colorful", settings.template)}
            >
              Colorful
            </button>
            <button
              onClick={() => handleTemplateChange("Minimalist")}
              style={previewThemeButtonStyle("Minimalist", settings.template)}
            >
              Minimalist
            </button>
          </div>
        </div>

        {/* TOGGLE BAHASA */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
          <button
            onClick={() => setLang("id")}
            style={langButtonStyle(lang === "id")}
          >
            ID
          </button>
          <button
            onClick={() => setLang("en")}
            style={langButtonStyle(lang === "en")}
          >
            EN
          </button>
        </div>

        <h2
          style={{
            color: theme.sidebarText,
            marginBottom: "40px",
            fontSize: "1.5em",
          }}
        >
          {T.title}
        </h2>

        <div
          style={{
            color: theme.sidebarText,
            opacity: 0.8,
            marginBottom: "20px",
            fontWeight: "bold",
          }}
        >
          {T.categoryTitle}
        </div>

        {categories.map((cat) => (
          <div
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "12px 15px",
              marginBottom: "10px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: selectedCategory === cat ? "bold" : "normal",
              backgroundColor:
                selectedCategory === cat ? "rgba(0, 0, 0, 0.1)" : "transparent",
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

      {/* KOLOM 2: AREA KONTEN MENU */}

      <div style={{ flexGrow: 1, padding: "30px 30px 30px 50px" }}>
        {/* Header Konten */}
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

        {/* Grid Item Menu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "25px",
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
                    height: "300px",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
              )}

              {/* Detail Teks */}
              <div style={{ padding: "15px" }}>
                <strong style={{ fontSize: "1.1em", color: theme.textColor }}>
                  {/* PERBAIKAN 4: Hanya gunakan item.name */}
                  {item.name}
                </strong>
                <p
                  style={{ fontSize: "0.9em", color: "#666", margin: "5px 0" }}
                >
                  {/* PERBAIKAN 5: Hanya gunakan item.desc */}
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
                    style={{ fontWeight: "bold", color: theme.primaryAccent }}
                  >
                    Rp{formatCurrency(item.price)},00
                  </span>

                  {/* Tombol Add to Cart */}
                  <button
                    onClick={() => handleAddToCart(item)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: theme.primaryAccent, // Warna Aksen Utama
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "0.9em",
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

      {/* KOLOM 3: KERANJANG BELANJA */}
      <div
        style={{
          width: "350px",
          backgroundColor: theme.cardBg,
          padding: "30px",
          flexShrink: 0,
          boxShadow: "-4px 0 10px rgba(0,0,0,0.05)",
          borderLeft: theme.cardBorder,
        }}
      >
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
              style={{ textAlign: "center", color: "#999", paddingTop: "50px" }}
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
                    {/* PERBAIKAN 6: Hanya gunakan item.name */}
                    {item.name}
                  </div>
                  <div style={{ fontSize: "0.9em", color: "#666" }}>
                    Rp{formatCurrency(item.price)},00 x {item.quantity}
                  </div>
                </div>

                {/* Kontrol Kuantitas */}
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
                    -
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
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total dan Tombol Checkout */}
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
            {T.checkout} ({cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
            Porsi)
          </button>
        </div>
      </div>
    </div>
  );
}
