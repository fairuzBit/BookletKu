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

// 1. HELPER FUNCTION (DI LUAR KOMPONEN)
const formatCurrency = (amount) => {
  const amountStr = String(amount).replace(/[^0-9]/g, "");
  if (!amountStr) return "";
  const formatted = amountStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted;
};

// 2. Fungsi untuk D&D atau drop and drag (Tidak Berubah)
const SortableItem = ({ item, deleteItem, formatCurrency }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    // Gaya D&D
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    zIndex: 10,
    // Gaya Card Menu
    border: `1px solid ${THEME.inputBorder}`,
    padding: "20px", // Padding lebih besar
    borderRadius: "10px",
    marginBottom: "15px",
    backgroundColor: THEME.cardBg,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)", // Shadow lebih lembut
    display: "flex",
    alignItems: "center",
    gap: "20px",
    fontFamily: "sans-serif",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Area Gambar */}
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          width="120" // Gambar lebih besar
          height="120"
          style={{
            borderRadius: "8px",
            objectFit: "cover",
            flexShrink: 0,
            border: `2px solid ${THEME.primaryAccent}`, // Border aksen
          }}
        />
      )}

      {/* Area Teks dan Info */}
      <div style={{ flexGrow: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "5px",
          }}
        >
          <strong style={{ fontSize: "1.3em", color: THEME.textColor }}>
            {item.name}
          </strong>
          <span
            style={{
              fontWeight: "bold",
              color: THEME.danger,
              fontSize: "1.1em",
            }}
          >
            Rp{formatCurrency(item.price)},00
          </span>
        </div>

        <div
          style={{ color: "#7F8C8D", marginBottom: "8px", fontSize: "0.9em" }}
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
        style={{
          background: THEME.danger,
          color: "white",
          padding: "10px 18px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          fontWeight: "bold",
          transition: "background-color 0.2s",
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

  // --- HANDLERS LOKAL ---
  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setPrice(rawValue);
  };

  // --- FUNGSI CRUD & D&D ---

  // READ: Mengambil data menu dari Supabase
  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, Harga, Deskripsi, Kategori, foto_url, order")
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching menu:", error);
    } else {
      setMenu(
        data.map((item) => ({
          ...item,
          price: item.Harga,
          desc: item.Deskripsi,
          category: item.Kategori,
          image: item.foto_url,
          order: item.order,
        }))
      );
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // CREATE: Menambahkan item baru ke Supabase
  const addItem = async () => {
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
  };

  // DELETE: Menghapus item dari Supabase
  const deleteItem = async (id) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      console.error("Error deleting item:", error);
      alert("Gagal menghapus menu!");
      return;
    }

    setMenu(menu.filter((item) => item.id !== id));
  };

  // D&D HANDLER: Mengelola perubahan urutan dan menyimpannya ke Supabase
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = menu.findIndex((item) => item.id === active.id);
      const newIndex = menu.findIndex((item) => item.id === over.id);

      const newMenu = arrayMove(menu, oldIndex, newIndex);
      setMenu(newMenu);

      for (let i = 0; i < newMenu.length; i++) {
        const item = newMenu[i];

        await supabase
          .from("menu_items")
          .update({ order: i })
          .eq("id", item.id);
      }
    }
  };

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
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1300px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: THEME.cardBg,
          padding: "40px",
          borderRadius: "15px",
          boxShadow: THEME.shadow,
        }}
      >
        <h1
          style={{
            marginBottom: "40px",
            color: THEME.textColor,
            borderBottom: `3px solid ${THEME.secondaryAccent}`,
            paddingBottom: "10px",
          }}
        >
          Menu Admin
        </h1>

        {/* KONTENER DUA KOLOM DENGAN FLEXBOX */}
        <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
          {/* Kolom Kiri: Form Tambah Item (INPUT STICKY) */}
          <div
            // ⭐ PERUBAHAN UTAMA DI SINI: MENAMBAH STICKY POSITION ⭐
            style={{
              flexShrink: 0,
              width: "350px",
              // --- Properti Sticky ---
              position: "sticky",
              top: "40px", // Jarak dari atas layar saat discroll
              // -----------------------
              padding: "30px",
              border: `1px solid ${THEME.inputBorder}`,
              borderRadius: "12px",
              backgroundColor: THEME.bgMain,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ color: THEME.primaryAccent, marginBottom: "20px" }}>
              Input Menu Baru
            </h3>

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
                  width="300"
                  height="200"
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
              padding: "20px 0", // Padding vertikal saja
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                color: THEME.textColor,
                fontSize: "1.5em",
              }}
            >
              Atur Daftar Menu ({filteredMenu.length} Item)
            </h3>

            {/* ⭐ SEARCH DAN FILTER ⭐ */}
            <div style={{ display: "flex", gap: "15px", marginBottom: "30px" }}>
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
                }}
              />

              {/* Filter Kategori */}
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                style={{
                  width: "200px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${THEME.inputBorder}`,
                  color: THEME.textColor,
                  backgroundColor: THEME.cardBg,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
