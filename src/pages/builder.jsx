import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";
import { useState, useEffect, useMemo } from "react";
import ImageUploader from "../components/ImageUploader";
import { supabase } from "../supabase";

// ===============================================
// ⭐ TEMA & STYLING BARU (Cafe Gen Z) ⭐
// ===============================================
const THEME = {
  bgMain: "#F4F6F8", // Background Super Light Gray/Off-White
  cardBg: "#FFFFFF", // Card Background White
  primaryAccent: "#6B8E23", // Aksen Hijau Sage (Modern, Calm)
  secondaryAccent: "#FFD700", // Aksen Kuning Mustard (Kontras)
  textColor: "#2C3E50", // Dark Navy/Charcoal
  shadow: "0 6px 15px rgba(0, 0, 0, 0.08)",
  inputBorder: "#DCE0E6",
  danger: "#E74C3C",
};

// --- FUNGSI HELPER MOBILE/RESPONSIVE ---
// Menggunakan hook untuk mendeteksi apakah layar adalah mobile (misal: lebar < 768px)
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [breakpoint]);

  return isMobile;
};

// 1. HELPER FUNCTION (DI LUAR KOMPONEN)
const formatCurrency = (amount) => {
  const amountStr = String(amount).replace(/[^0-9]/g, "");
  if (!amountStr) return "";
  const formatted = amountStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted;
};

// 2. Fungsi untuk D&D atau drop and drag (SortableItem)
const SortableItem = ({ item, deleteItem, formatCurrency }) => {
  const isMobile = useIsMobile(768); // Cek mobile di SortableItem
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  // ⭐ MODIFIKASI: Gaya Card Menu Responsif
  const style = {
    // Gaya D&D
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    zIndex: 10,
    // Gaya Card Menu
    border: `1px solid ${THEME.inputBorder}`,
    padding: isMobile ? "15px" : "20px", // Padding lebih kecil di mobile
    borderRadius: "10px",
    marginBottom: "15px",
    backgroundColor: THEME.cardBg,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    // Layout Flex: column di mobile, row di desktop
    display: "flex",
    flexDirection: isMobile ? "column" : "row", // UTAMA: Stack di mobile
    alignItems: isMobile ? "flex-start" : "center", // Align ke kiri di mobile
    gap: isMobile ? "10px" : "20px",
    fontFamily: "sans-serif",
    position: "relative", // Untuk posisi tombol hapus
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Area Gambar */}
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          width={isMobile ? "100%" : "120"} // UTAMA: Full width di mobile
          height={isMobile ? "180px" : "120"} // Tinggi tetap/lebih kecil
          style={{
            borderRadius: "8px",
            objectFit: "cover",
            flexShrink: 0,
            border: `2px solid ${THEME.primaryAccent}`,
          }}
        />
      )}

      {/* Area Teks dan Info */}
      <div style={{ flexGrow: 1, width: isMobile ? "100%" : "auto" }}>
        <div
          style={{
            display: "flex",
            // Di mobile: Tumpuk Nama/Harga jika space sempit
            flexDirection: isMobile ? "column" : "row", 
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "baseline",
            marginBottom: "5px",
          }}
        >
          <strong style={{ fontSize: isMobile ? "1.2em" : "1.3em", color: THEME.textColor }}>
            {item.name}
          </strong>
          <span
            style={{
              fontWeight: "bold",
              color: THEME.danger,
              fontSize: isMobile ? "1.0em" : "1.1em",
              marginTop: isMobile ? "5px" : "0", // Jarak harga di mobile
            }}
          >
            Rp{formatCurrency(item.price)},00
          </span>
        </div>

        <div
          style={{ color: "#7F8C8D", marginBottom: "8px", fontSize: isMobile ? "0.85em" : "0.9em" }}
        >
          {item.desc}
        </div>

        <div
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: THEME.cardBg,
            padding: "5px 10px",
            backgroundColor: THEME.primaryAccent,
            borderRadius: "20px",
            display: "inline-block",
          }}
        >
          {item.category}
        </div>
      </div>

      {/* Tombol Hapus */}
      <button
        onClick={() => deleteItem(item.id)}
        // ⭐ MODIFIKASI: Tombol Hapus Responsif
        style={{
          background: THEME.danger,
          color: "white",
          padding: isMobile ? "8px 15px" : "10px 18px", // Padding lebih kecil
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          fontWeight: "bold",
          transition: "background-color 0.2s",
          width: isMobile ? "100%" : "auto", // UTAMA: Full width di mobile
          marginTop: isMobile ? "10px" : "0", // Jarak di mobile
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#C0392B")}
        onMouseOut={(e) =>
          (e.currentTarget.style.backgroundColor = THEME.danger)
        }
      >
        ✕ Hapus
      </button>
    </div>
  );
};

// ⭐ 3. KOMPONEN UTAMA BUILDER
export default function Builder() {
  const isMobile = useIsMobile(768); // Cek mobile di Builder
  // --- STATE INPUT & DATA ---
  const [menu, setMenu] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // ⭐ STATE FILTER BARU ⭐
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Semua Kategori");
  
  // Tambahan state untuk mengontrol visibility form di mobile
  const [isFormVisible, setIsFormVisible] = useState(false); 

  // --- HANDLERS LOKAL ---
  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setPrice(rawValue);
  };

  // --- FUNGSI CRUD & D&D ---
  const fetchMenu = async () => { /* ... (Logika fetchMenu tidak berubah) */ };
  useEffect(() => { fetchMenu(); }, []);
  const addItem = async () => { 
    // ... (Logika addItem tidak berubah)
    if (!name || !price) return alert("Nama & harga wajib diisi!");
    if (!category) return alert("Kategori wajib diisi!");

    const parsedPrice = parseInt(price, 10);

    if (isNaN(parsedPrice)) {
      return alert("Harga harus diisi dengan angka yang valid!");
    }

    const newItem = {
      name: name,
      Harga: parsedPrice,
      Deskripsi: desc,
      Kategori: category,
      foto_url: imageUrl,
      order: menu.length,
    };

    const { data, error } = await supabase
      .from("menu_items")
      .insert([newItem])
      .select();

    if (error) {
      console.error("Error adding item:", error);
      alert("Gagal menambahkan menu!");
      return;
    }

    const addedItem = {
      ...data[0],
      price: data[0].Harga,
      desc: data[0].Deskripsi,
      category: data[0].Kategori,
      image: data[0].foto_url,
    };

    setMenu([...menu, addedItem]);

    // reset input
    setName("");
    setPrice("");
    setDesc("");
    setCategory("");
    setImageUrl("");
    if (isMobile) setIsFormVisible(false); // Sembunyikan form setelah submit di mobile
  };
  const deleteItem = async (id) => { /* ... (Logika deleteItem tidak berubah) */ };
  const handleDragEnd = async (event) => { /* ... (Logika handleDragEnd tidak berubah) */ };

  // --- LOGIKA FILTER DAN SEARCH UTAMA ---
  const allCategories = [
    "Semua Kategori",
    ...new Set(menu.map((item) => item.category)),
  ];

  const filteredMenu = useMemo(() => {
    let currentMenu = menu;
    const lowerCaseSearch = searchTerm.toLowerCase();

    // 1. Filter berdasarkan Kategori
    if (selectedFilter !== "Semua Kategori") {
      currentMenu = currentMenu.filter(
        (item) => item.category === selectedFilter
      );
    }

    // 2. Filter berdasarkan Search Term (Nama atau Deskripsi)
    if (lowerCaseSearch) {
      currentMenu = currentMenu.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerCaseSearch) ||
          item.desc.toLowerCase().includes(lowerCaseSearch)
      );
    }

    return currentMenu;
  }, [menu, searchTerm, selectedFilter]);

  // --- RENDERING JSX ---
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: THEME.bgMain,
        fontFamily: "sans-serif",
        padding: isMobile ? "20px 10px" : "40px 20px", // Padding lebih kecil di mobile
      }}
    >
      <div
        style={{
          maxWidth: "1300px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: THEME.cardBg,
          padding: isMobile ? "20px" : "40px", // Padding lebih kecil di mobile
          borderRadius: "15px",
          boxShadow: THEME.shadow,
        }}
      >
        <h1
          style={{
            marginBottom: isMobile ? "20px" : "40px",
            color: THEME.textColor,
            borderBottom: `3px solid ${THEME.secondaryAccent}`,
            paddingBottom: "10px",
            fontSize: isMobile ? "1.8em" : "2.5em" // Ukuran H1 lebih kecil
          }}
        >
          Menu Admin
        </h1>

        {/* KONTENER DUA KOLOM DENGAN FLEXBOX */}
        <div 
          style={{ 
            display: "flex", 
            gap: isMobile ? "20px" : "40px", 
            alignItems: "flex-start",
            flexDirection: isMobile ? "column" : "row", // UTAMA: Stack di mobile
          }}
        >
          
          {/* ⭐ UTAMA MOBILE: Tombol untuk Membuka Form ⭐ */}
          {isMobile && (
            <button
              onClick={() => setIsFormVisible(!isFormVisible)}
              style={{
                width: "100%",
                padding: "15px",
                backgroundColor: isFormVisible ? THEME.danger : THEME.primaryAccent,
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1em",
                marginBottom: "20px",
                transition: "background-color 0.2s",
              }}
            >
              {isFormVisible ? "❌ Tutup Form Input" : "➕ Input Menu Baru"}
            </button>
          )}

          {/* Kolom Kiri: Form Tambah Item (INPUT STICKY) */}
          <div
            // ⭐ MODIFIKASI: Layout Form Responsif ⭐
            style={{
              flexShrink: 0,
              width: isMobile ? "100%" : "350px", // Full width di mobile
              // Sticky hanya di desktop/jika isMobile false
              position: isMobile ? "static" : "sticky",
              top: "40px", 
              padding: "30px",
              border: `1px solid ${THEME.inputBorder}`,
              borderRadius: "12px",
              backgroundColor: THEME.bgMain,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              // UTAMA MOBILE: Sembunyikan/Tampilkan Form
              display: isMobile && !isFormVisible ? "none" : "block", 
            }}
          >
            <h3 style={{ color: THEME.primaryAccent, marginBottom: "20px" }}>
              Input Menu Baru
            </h3>

            {/* Semua Input Field, Textarea, Select, ImageUploader, dan Button Tambah Menu di sini. 
            Styling inner elements sudah di set width: 100%, jadi sudah responsif. */}
            <input
              placeholder="Nama menu (misal: Kopi Susu Aren)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${THEME.inputBorder}`,
                boxSizing: "border-box",
                color: THEME.textColor,
              }}
            />
            {/* ... (Input Harga, Deskripsi, Kategori, ImageUploader) ... */}
            <input
              placeholder="Harga (misal: 18000)"
              value={formatCurrency(price)}
              onChange={handlePriceChange}
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${THEME.inputBorder}`,
                boxSizing: "border-box",
                color: THEME.textColor,
              }}
            />

            <textarea
              placeholder="Deskripsi singkat menu…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows="3"
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${THEME.inputBorder}`,
                boxSizing: "border-box",
                resize: "vertical",
                color: THEME.textColor,
              }}
            />

            {/* DROPDOWN KATEGORI */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "20px",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${THEME.inputBorder}`,
                boxSizing: "border-box",
                height: "45px",
                color: THEME.textColor,
                backgroundColor: THEME.cardBg,
              }}
            >
              <option value="" disabled>
                Pilih Kategori Menu
              </option>
              <option value="Makanan">Makanan</option>
              <option value="Minuman">Minuman</option>
              <option value="Dessert">Dessert</option>
              <option value="Snack">Snack</option>
            </select>

            {/* Upload Gambar */}
            <p
              style={{
                marginBottom: "10px",
                color: THEME.textColor,
                fontWeight: "bold",
              }}
            >
              🖼️ Gambar Menu:
            </p>
            <ImageUploader onUploaded={(url) => setImageUrl(url)} />

            {/* PREVIEW GAMBAR */}
            {imageUrl && (
              <div
                style={{
                  marginTop: "20px",
                  textAlign: "center",
                }}
              >
                <img
                  src={imageUrl}
                  alt="menu preview"
                  // ⭐ MODIFIKASI: Ukuran Preview Gambar Responsif
                  width={isMobile ? "100%" : "300"} 
                  height={isMobile ? "200px" : "200"}
                  style={{
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: `3px solid ${THEME.primaryAccent}`,
                  }}
                />
              </div>
            )}

            <button
              onClick={addItem}
              style={{
                marginTop: "30px",
                width: "100%",
                padding: "15px",
                backgroundColor: THEME.primaryAccent,
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1.1em",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#8BA154")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = THEME.primaryAccent)
              }
            >
              ➕ Tambah Menu Sekarang
            </button>

          </div>
          {/* Akhir Kolom Kiri */}

          {/* Kolom Kanan: Daftar Menu (Filter, Search, D&D) */}
          <div
            style={{
              flexGrow: 1,
              width: isMobile ? "100%" : "auto", // Full width di mobile
              padding: isMobile ? "0" : "20px 0", // Hapus padding vertikal di mobile
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                color: THEME.textColor,
                fontSize: isMobile ? "1.2em" : "1.5em", // Ukuran H3 lebih kecil
              }}
            >
              Atur Daftar Menu ({filteredMenu.length} Item)
            </h3>

            {/* ⭐ SEARCH DAN FILTER ⭐ */}
            <div 
              style={{ 
                display: "flex", 
                gap: "10px", // Gap lebih kecil
                marginBottom: "30px",
                flexDirection: isMobile ? "column" : "row", // UTAMA: Stack di mobile
              }}
            >
              {/* Search Bar */}
              <input
                type="text"
                placeholder="🔍 Cari menu berdasarkan nama atau deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flexGrow: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${THEME.inputBorder}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  color: THEME.textColor,
                  width: isMobile ? "100%" : "auto", // Full width di mobile
                }}
              />

              {/* Filter Kategori */}
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                style={{
                  width: isMobile ? "100%" : "200px", // Full width di mobile
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${THEME.inputBorder}`,
                  color: THEME.textColor,
                  backgroundColor: THEME.cardBg,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  flexShrink: 0, // Agar tidak di-stretch
                }}
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {filteredMenu.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "#7F8C8D",
                  marginTop: "50px",
                  padding: "30px",
                  backgroundColor: THEME.bgMain,
                  borderRadius: "10px",
                }}
              >
                {menu.length === 0
                  ? "👋 Belum ada menu yang diinput. Mulai tambah dari kolom kiri!"
                  : "😞 Menu tidak ditemukan sesuai kriteria pencarian/filter Anda."}
              </p>
            )}

            {/* List Menu yang Dapat Diurutkan */}
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {filteredMenu.length > 0 && (
                <SortableContext
                  items={filteredMenu.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredMenu.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      deleteItem={deleteItem}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </SortableContext>
              )}
            </DndContext>
          </div>
          {/* Akhir Kolom Kanan */}
        </div>
      </div>
    </div>
  );
}