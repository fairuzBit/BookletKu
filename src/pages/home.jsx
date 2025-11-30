import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ===========================================
// ⭐ 0. HOOK UNTUK DETEKSI LEBAR LAYAR ⭐
// ===========================================
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
};

// ===========================================
// ⭐ 1. DEFINISI HELPERS & KONFIGURASI (PITCH.IO STYLE) ⭐
// ===========================================

const formatCurrency = (amount) => {
  const amountStr = String(Math.round(amount)).replace(/[^0-9]/g, "");
  if (!amountStr) return "0";
  return amountStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Konfigurasi Admin
const CURRENT_USER_ID = "user_unique_id_123";
const BASE_URL = window.location.origin;
const PREVIEW_URL = `${BASE_URL}/preview/${CURRENT_USER_ID}`;

// ⭐ PALET WARNA BARU (Mengambil dari desain Pitch.io) ⭐
const THEME = {
  bgMain: "#F4F6F8", // Latar belakang luar
  bgContent: "#FFFFFF", // Latar belakang area konten
  bgSidebar: "#FFFFFF", // Latar belakang Sidebar
  textColor: "#2C3E50", // Teks utama (Dark Navy)
  accentPurple: "#0600AB", // Biru Gelap
  accentYellow: "#FFC300", // Kuning (Untuk Metrik 1)
  accentBlue: "#7B68EE", // Biru Violet (Untuk Metrik 2)
  accentPink: "#FF6392", // Merah Muda (Untuk Metrik 3)
  graphLine: "#28a745",
  shadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
  shadowLight: "0 2px 5px rgba(0, 0, 0, 0.05)",
};

// --- Style Link Navigasi (Sederhana, sesuai Pitch.io) ---
const navLinkStyle = (isActive) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textDecoration: "none",
  marginBottom: "5px",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer",
  // Warna sesuai desain
  backgroundColor: isActive ? "#f0f0ffff" : "transparent",
  color: isActive ? THEME.accentPurple : THEME.textColor,
  fontWeight: isActive ? "bold" : "normal",
  transition: "background-color 0.2s",
  fontSize: "0.95em",
});

// ===========================================
// ⭐ 2. KOMPONEN UTAMA DASHBOARD ⭐
// ===========================================

export default function Home() {
  const windowWidth = useWindowWidth(); // Dapatkan lebar layar
  const isMobile = windowWidth < 768; // Definisikan breakpoint mobile
  const isTablet = windowWidth < 1024; // Definisikan breakpoint tablet/kecil

  const [menu, setMenu] = useState([]);
  const [settings, setSettings] = useState({
    template: "Colorful",
    whatsappNumber: "6281xxxxxx",
  });
  const [waInput, setWaInput] = useState(settings.whatsappNumber);
  const [notification, setNotification] = useState(null);

  // Data Simulasi & Perhitungan ---
  const totalItems = menu.length;
  const totalInventoryValue = menu.reduce((sum, item) => sum + item.price, 0);
  const totalLeads = 126;
  const completedRate = 77;
  const uniqueViews = 91;
  const simulatedSales = totalInventoryValue * 1.5;

  // --- FUNGSI NOTIFIKASI POP-UP ---
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // --- FETCH DATA (Menu dan Settings) ---
  const fetchMenu = async () => {
    const { data } = await supabase.from("menu_items").select("Harga");
    if (data) {
      setMenu(data.map((item) => ({ price: item.Harga })));
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("user_settings")
      .select("template, whatsapp_number")
      .eq("user_id", CURRENT_USER_ID)
      .single();

    if (data) {
      setSettings({
        template: data.template,
        whatsappNumber: data.whatsapp_number,
      });
      setWaInput(data.whatsapp_number);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchSettings();
  }, []);

  // --- WHATSAPP HANDLER (UPDATE Logic) ---
  const handleWhatsappChange = async (newNumber) => {
    const cleanNumber = newNumber.replace(/[^0-9]/g, "");
    if (!cleanNumber)
      return showNotification("Nomor WA tidak boleh kosong.", "error");

    setSettings((prevSettings) => ({
      ...prevSettings,
      whatsappNumber: cleanNumber,
    }));

    const { error } = await supabase
      .from("user_settings")
      .update({ whatsapp_number: cleanNumber })
      .eq("user_id", CURRENT_USER_ID);

    if (error) {
      console.error("Gagal menyimpan nomor WA:", error);
      showNotification("Gagal menyimpan nomor WhatsApp.", "error");
    } else {
      showNotification("Nomor WhatsApp berhasil disimpan!", "success");
    }
  };

  return (
    // KONTENER UTAMA
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: THEME.bgMain,
        color: THEME.textColor,
        fontFamily: "sans-serif",
        flexDirection: isMobile ? "column" : "row", // Tumpuk ke bawah di mobile
      }}
    >
      {/* ⭐ RENDER NOTIFIKASI POP-UP DI SINI ⭐ */}
      {notification && (
        <NotificationToast notification={notification} theme={THEME} />
      )}

      {/* =================================== */}
      {/* ⭐ KOLOM 1: SIDEBAR NAV (FIXED/STICKY) ⭐ */}
      {/* =================================== */}
      <div
        style={{
          width: isMobile ? "100%" : "350px", // Lebar penuh di mobile
          backgroundColor: THEME.bgSidebar,
          padding: isMobile ? "10px 0" : "20px 0",
          flexShrink: 0,
          // Properti Sticky/Fixed untuk Desktop/Tablet
          height: isMobile ? "auto" : "100vh",
          position: isMobile ? "relative" : "sticky",
          top: 0,
          // ------------------------
          boxShadow: THEME.shadowLight,
          borderRight: isMobile ? "none" : "1px solid #f0f0f0",
          borderBottom: isMobile ? "1px solid #f0f0f0" : "none",
        }}
      >
        <div style={{ padding: "0 20px" }}>
          <Link to="/" style={navLinkStyle(true)}>
            Dashboard
          </Link>
          <Link to="/builder" style={navLinkStyle(false)}>
            Tambah Menu
          </Link>
          <Link
            to={`/preview/${CURRENT_USER_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            style={navLinkStyle(false)}
          >
            Dashboard Pelanggan
          </Link>
        </div>

        <div
          style={{
            padding: "20px",
            borderTop: isMobile ? "1px solid #f0f0f0" : "none",
            borderBottom: isMobile ? "none" : "1px solid #f0f0f0",
            marginTop: isMobile ? "10px" : "20px",
          }}
        >
          <Link
            to="/builder"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              backgroundColor: THEME.accentPurple,
              color: "white",
              padding: "10px 15px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              boxShadow: "0 4px 8px rgba(6, 0, 171, 0.4)",
            }}
          >
            <span style={{ fontSize: "1.5em", fontWeight: "normal" }}>+</span>{" "}
            Tambah Menu
          </Link>
        </div>
      </div>

      {/* =================================== */}
      {/* ⭐ KOLOM 2: KONTEN DASHBOARD ⭐ */}
      {/* =================================== */}
      <div style={{ flexGrow: 1, padding: "0", overflowY: "auto" }}>
        {/* Kontener Konten Utama dengan Padding dan Background Putih */}
        <div
          style={{
            padding: isMobile ? "20px" : "30px 40px", // Padding lebih kecil di mobile
            backgroundColor: THEME.bgContent,
            minHeight: "100vh",
            borderRadius: "15px",
            boxShadow: THEME.shadow,
          }}
        >
          {/* --- TOP HEADER BAR --- */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
              paddingBottom: "15px",
              borderBottom: "1px solid #eee",
              flexDirection: isMobile ? "column" : "row", // Tumpuk header di mobile
              alignItems: isMobile ? "flex-start" : "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontWeight: "normal",
                  color: THEME.textColor,
                }}
              >
                Dashboard Admin
              </h2>
              <p style={{ margin: 0, fontSize: "0.9em", color: "#7F8C8D" }}>
                Rabu, 26 November 2025
              </p>
            </div>
            {/* User Profile dan Notifikasi (Simulasi) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                marginTop: isMobile ? "10px" : "0",
              }}
            >
              <div
                style={{
                  padding: "8px 15px",
                  backgroundColor: THEME.accentPurple,
                  color: "white",
                  borderRadius: "50%",
                  fontWeight: "bold",
                }}
              >
                AJ
              </div>
            </div>
          </div>

          {/* --- HERO BANNER / WELCOME MESSAGE --- */}
          <div
            style={{
              backgroundColor: THEME.accentPurple,
              color: "white",
              padding: isMobile ? "20px" : "40px",
              borderRadius: "15px",
              marginBottom: "40px",
              position: "relative",
              overflow: "hidden",
              boxShadow: THEME.shadow,
              display: "flex",
              alignItems: "center",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              textAlign: isMobile ? "center" : "left",
            }}
          >
            {/* Konten Teks */}
            <div style={{ maxWidth: isMobile ? "100%" : "60%", zIndex: 1 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? "1.8em" : "2.5em",
                  fontWeight: "bold",
                }}
              >
                Hi, Admin!
              </h1>
              <p style={{ fontSize: isMobile ? "1em" : "1.2em", opacity: 0.9 }}>
                Siap untuk memulai hari Anda dengan mengatur menu?
              </p>
            </div>
          </div>

          {/* --- METRICS OVERVIEW --- */}
          <h3
            style={{
              marginBottom: "20px",
              color: THEME.textColor,
              opacity: 0.7,
            }}
          >
            Overview
          </h3>
          <div
            style={{
              display: "grid",
              // Kolom Metrik: 2 di Tablet/Mobile, 4 di Desktop
              gridTemplateColumns: isMobile
                ? "repeat(2, 1fr)"
                : isTablet
                ? "repeat(3, 1fr)"
                : "repeat(4, 1fr)",
              gap: isMobile ? "10px" : "20px",
              marginBottom: "40px",
            }}
          >
            {/* METRIC 1: Total Penjualan */}
            <PitchMetricCard
              title="Total Penjualan"
              value={`Rp${formatCurrency(simulatedSales)},00`}
              themeColor={THEME.accentYellow}
            />

            {/* METRIC 2: Total Menu */}
            <PitchMetricCard
              value={`${totalItems} Item`}
              themeColor={THEME.accentBlue}
              title="Total Menu"
            />

            {/* METRIC 3: Pengunjung */}
            <PitchMetricCard
              title="Pengunjung"
              value={uniqueViews}
              themeColor={THEME.accentPink}
            />
          </div>

          {/* --- GRAFIK & QR CODE --- */}
          <h3
            style={{
              marginBottom: "20px",
              color: THEME.textColor,
              opacity: 0.7,
            }}
          >
            Pengaturan & Analisis
          </h3>

          <div
            style={{
              display: "grid",
              // 1 kolom di mobile, 2 di desktop
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "20px" : "30px",
            }}
          >
            {/* KOLOM KIRI: GRAFIK TREN */}
            <GraphPlaceholder theme={THEME} isMobile={isMobile} />

            {/* KOLOM KANAN: QR & WA SETTINGS */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <PublishCard theme={THEME} previewUrl={PREVIEW_URL} />
              <WhatsappSettingsCard
                id="whatsapp-settings"
                theme={THEME}
                waInput={waInput}
                setWaInput={setWaInput}
                onSave={handleWhatsappChange}
                currentNumber={settings.whatsappNumber}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// ⭐ 3. KOMPONEN PEMBANTU (Deklarasi Tunggal) ⭐
// ===========================================

// --- Card Metrik Gaya Pitch.io ---
const PitchMetricCard = ({ title, value, themeColor, icon, suffix }) => (
  <div
    style={{
      padding: "20px",
      backgroundColor: themeColor,
      borderRadius: "10px",
      color: "white",
      fontWeight: "bold",
      boxShadow: `0 4px 15px ${themeColor}60`,
      textAlign: "center",
      minHeight: "100px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <div style={{ fontSize: "2.5em", marginBottom: "5px" }}>
      {value}
      {suffix && (
        <span
          style={{ fontSize: "0.5em", fontWeight: "normal", marginLeft: "5px" }}
        >
          {suffix}
        </span>
      )}
    </div>
    <div style={{ opacity: 0.8, fontSize: "0.9em" }}>{title}</div>
  </div>
);

// --- Notification Toast (Didefinisikan di luar Home) ---
const NotificationToast = ({ notification, theme }) => {
  // ... (Logika Toast)
  if (!notification) return null;
  const successColor = theme.accentPurple;
  const errorColor = theme.danger || "#dc3545";
  const icon = notification.type === "success" ? "✓" : "✗";
  const bgColor = notification.type === "success" ? successColor : errorColor;
  const messageColor = "white";

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: bgColor,
        color: messageColor,
        padding: "15px 25px",
        borderRadius: "8px",
        boxShadow: `0 4px 15px rgba(0, 0, 0, 0.2)`,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        transition: "transform 0.3s ease-in-out",
        transform: "translateY(0)",
        fontSize: "1em",
        fontFamily: "sans-serif",
      }}
    >
      <span
        style={{
          fontSize: "1.5em",
          marginRight: "10px",
          fontWeight: "bold",
          color: "white",
        }}
      >
        {icon}
      </span>
      <div>
        <strong>
          {notification.type === "success" ? "Sukses!" : "Gagal!"}:
        </strong>
        <p style={{ margin: 0 }}>{notification.message}</p>
      </div>
    </div>
  );
};

// --- Placeholder Grafik Garis (Menggunakan Recharts) ---
const GraphPlaceholder = ({ theme, isMobile }) => {
  // Data Penjualan Simulasi (7 Hari)
  const simulasiData = [
    { day: "Sen", Pesanan: 15, Dilihat: 50 },
    { day: "Sel", Pesanan: 25, Dilihat: 70 },
    { day: "Rab", Pesanan: 18, Dilihat: 65 },
    { day: "Kam", Pesanan: 70, Dilihat: 90 },
    { day: "Jum", Pesanan: 80, Dilihat: 120 },
    { day: "Sab", Pesanan: 100, Dilihat: 150 },
    { day: "Min", Pesanan: 30, Dilihat: 80 },
  ];

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: theme.bgContent,
        borderRadius: "12px",
        boxShadow: theme.shadowLight,
        border: `1px solid #f0f0f0`,
        height: isMobile ? "300px" : "350px", // Tinggi lebih pendek di mobile
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ color: theme.textColor, marginBottom: "10px" }}>
        Analisis Penjualan Harian & Jumlah User Akses.
      </h2>
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
        <LineChart
          data={simulasiData}
          margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#000000ff"
            opacity={0.5}
          />
          <XAxis dataKey="day" stroke={theme.textColor} opacity={0.7} />
          <YAxis stroke={theme.textColor} opacity={0.7} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.bgContent,
              border: "none",
              borderRadius: "5px",
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ padding: "10px 0 0 0" }} />

          <Line
            type="monotone"
            dataKey="Pesanan"
            stroke={theme.accentBlue}
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="Dilihat"
            stroke={theme.graphLine}
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Card QR Code Publishing ---
const PublishCard = ({ theme, previewUrl }) => (
  <div
    style={{
      flex: 1,
      padding: "25px",
      backgroundColor: theme.bgContent,
      borderRadius: "12px",
      boxShadow: theme.shadowLight,
      textAlign: "center",
      border: `1px solid #f0f0f0`,
      color: theme.textColor,
      fontFamily: "sans-serif",
    }}
  >
    <h3>QR Code Publikasi</h3>
    <p style={{ opacity: 0.7, marginBottom: "15px", fontSize: "0.9em" }}>
      Scan untuk melihat tampilan pelanggan.
    </p>

    <div
      style={{
        margin: "15px auto",
        width: "fit-content",
        border: `5px solid ${theme.accentPurple}`,
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
      }}
    >
      <QRCodeSVG
        value={previewUrl}
        size={150} // Ukuran QR code disesuaikan
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"Q"}
      />
    </div>

    <a
      href={previewUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: theme.accentPurple,
        textDecoration: "none",
        marginTop: "10px",
        display: "block",
        fontWeight: "bold",
      }}
    >
      Lihat Link Preview
    </a>
  </div>
);

// --- Card Pengaturan WhatsApp ---
const WhatsappSettingsCard = ({
  theme,
  waInput,
  setWaInput,
  onSave,
  currentNumber,
  id,
}) => (
  <div
    id={id}
    style={{
      padding: "25px",
      backgroundColor: theme.bgContent,
      borderRadius: "12px",
      boxShadow: theme.shadowLight,
      border: `1px solid #f0f0f0`,
      color: theme.textColor,
      fontFamily: "sans-serif",
    }}
  >
    <h3>Setting No Admin Default</h3>
    <p style={{ opacity: 0.7, marginBottom: "15px", fontSize: "0.9em" }}>
      Nomor ini digunakan untuk checkout pelanggan (format 62xxxx).
    </p>

    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <input
        type="text"
        value={waInput}
        onChange={(e) => setWaInput(e.target.value)}
        placeholder="Contoh: 628123xxxx"
        style={{
          flexGrow: 1,
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          color: "#333",
        }}
      />
      <button
        onClick={() => onSave(waInput)}
        style={{
          padding: "10px 15px",
          backgroundColor: theme.accentPurple,
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "background-color 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#9A6BFF")}
        onMouseOut={(e) =>
          (e.currentTarget.style.backgroundColor = theme.accentPurple)
        }
      >
        Simpan WA
      </button>
    </div>
    <p style={{ fontSize: "0.8em", color: theme.graphLine, marginTop: "10px" }}>
      Nomor Aktif: {currentNumber}
    </p>
  </div>
);
