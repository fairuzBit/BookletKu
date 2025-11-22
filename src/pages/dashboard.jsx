import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [menu, setMenu] = useState([]);
  const [kategori, setKategori] = useState([]);

  // =============== FETCH MENU ===============
  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, Harga, foto_url, Kategori");

    if (error) {
      console.error("Error fetching menu:", error);
      return;
    }

    setMenu(
      data.map((item) => ({
        ...item,
        price: item.Harga,
        image: item.foto_url,
      }))
    );
  };

  // =============== FETCH CATEGORY ===============
  const fetchKategori = async () => {
    const { data, error } = await supabase
      .from("kategori_menu")
      .select("id, nama_kategori");

    if (error) {
      console.error("Error fetching kategori:", error);
      return;
    }

    setKategori(data);
  };

  useEffect(() => {
    fetchMenu();
    fetchKategori();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px",
        backgroundColor: "#f0f4ff",
      }}
    >
      <h1 style={{ marginBottom: "20px", textAlign: "center" }}>
        Dashboard Menu Builder
      </h1>

      {/* ==================== STATISTIK ==================== */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
            width: "200px",
          }}
        >
          <h3>Total Menu</h3>
          <p style={{ fontSize: "30px", fontWeight: "bold" }}>{menu.length}</p>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
            width: "200px",
          }}
        >
          <h3>Total Kategori</h3>
          <p style={{ fontSize: "30px", fontWeight: "bold" }}>
            {kategori.length}
          </p>
        </div>
      </div>

      {/* ==================== MENU LIST ==================== */}
      <div
        style={{
          background: "white",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h2>Daftar Menu</h2>
          <Link
            to="/builder"
            style={{
              padding: "10px 15px",
              backgroundColor: "#28a745",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            + Tambah Menu
          </Link>
        </div>

        {menu.length === 0 ? (
          <p style={{ color: "#666" }}>Belum ada menu.</p>
        ) : (
          menu.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "15px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  width="80"
                  height="80"
                  style={{ borderRadius: "8px", objectFit: "cover" }}
                />
              )}

              <div>
                <strong>{item.name}</strong>
                <div style={{ fontSize: "14px", opacity: 0.7 }}>
                  Kategori: {item.Kategori}
                </div>
                <div style={{ fontWeight: "bold", color: "#c0392b" }}>
                  Rp{item.price}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================== KATEGORI LIST ==================== */}
      <div
        style={{
          background: "white",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <h2>Daftar Kategori</h2>
          <Link
            to="/kategori"
            style={{
              padding: "10px 15px",
              backgroundColor: "#007bff",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            + Tambah Kategori
          </Link>
        </div>

        {kategori.length === 0 ? (
          <p style={{ color: "#666" }}>Belum ada kategori.</p>
        ) : (
          kategori.map((k) => (
            <div
              key={k.id}
              style={{
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                marginBottom: "10px",
              }}
            >
              {k.nama_kategori}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
