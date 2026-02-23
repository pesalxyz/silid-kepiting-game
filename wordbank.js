const PACK_META = {
  "Makanan": ["indonesia", "kuliner"],
  "Tempat": ["lokasi", "umum"],
  "Hewan": ["alam", "fauna"],
  "Benda": ["objek", "harian"],
  "Profesi": ["pekerjaan", "karier"],
  "Aktivitas": ["aksi", "kegiatan"],
  "Teknologi": ["digital", "modern"],
  "Indonesia Lokal": ["nusantara", "lokal"],
  "Random": ["umum", "campuran"]
};

const PACK_CLUSTERS = {
  "Makanan": [
    ["Nasi Goreng", "Nasi Uduk", "Nasi Kuning"], ["Sate Ayam", "Sate Kambing", "Sate Padang"],
    ["Rendang", "Gulai", "Kalio"], ["Bakso", "Mie Ayam", "Soto Ayam"],
    ["Gado-Gado", "Karedok", "Pecel"], ["Martabak Manis", "Terang Bulan", "Martabak Telur"],
    ["Pempek", "Tekwan", "Model"], ["Nasi Padang", "Nasi Rames", "Nasi Campur"],
    ["Ayam Geprek", "Ayam Penyet", "Ayam Bakar"], ["Bubur Ayam", "Bubur Kacang Hijau", "Bubur Sumsum"],
    ["Es Teh", "Es Jeruk", "Es Campur"], ["Nugget", "Sosis", "Kornet"],
    ["Siomay", "Batagor", "Tahu Gejrot"], ["Mie Goreng", "Mie Rebus", "Kwetiau"],
    ["Donat", "Bomboloni", "Roti Sobek"], ["Pisang Goreng", "Tape Goreng", "Ubi Goreng"],
    ["Sushi", "Kimbap", "Onigiri"], ["Ramen", "Udon", "Soba"],
    ["Dimsum", "Hakau", "Bakpao"], ["Pizza", "Calzone", "Lasagna"],
    ["Burger", "Hotdog", "Sandwich"], ["Steak", "Roast Beef", "BBQ"],
    ["Salad Buah", "Rujak Buah", "Asinan"], ["Cokelat", "Karamel", "Nougat"],
    ["Kopi Susu", "Cappuccino", "Latte"], ["Teh Tarik", "Milk Tea", "Thai Tea"],
    ["Puding", "Jeli", "Mousse"], ["Klepon", "Onde-Onde", "Getuk"],
    ["Lemper", "Arem-Arem", "Lontong Isi"], ["Kerupuk", "Emping", "Rempeyek"],
    ["Sambal Terasi", "Sambal Matah", "Sambal Ijo"], ["Kari Ayam", "Kari Sapi", "Opor Ayam"]
  ],
  "Tempat": [
    ["Sekolah", "Kampus", "Perpustakaan"], ["Rumah", "Apartemen", "Kontrakan"],
    ["Pasar", "Supermarket", "Minimarket"], ["Pantai", "Pulau", "Teluk"],
    ["Gunung", "Bukit", "Lembah"], ["Bandara", "Terminal", "Stasiun"],
    ["Kafe", "Restoran", "Warung"], ["Bioskop", "Teater", "Aula"],
    ["Mall", "Plaza", "Pusat Grosir"], ["Masjid", "Mushola", "Surau"],
    ["Rumah Sakit", "Klinik", "Puskesmas"], ["Kantor", "Coworking Space", "Studio"],
    ["Taman Kota", "Lapangan", "Alun-Alun"], ["Hotel", "Guest House", "Hostel"],
    ["Museum", "Galeri", "Pameran"], ["Kebun Binatang", "Taman Safari", "Akuarium"],
    ["Kolam Renang", "Waterpark", "Pantai Buatan"], ["Jembatan", "Flyover", "Terowongan"],
    ["SPBU", "Bengkel", "Car Wash"], ["Pelabuhan", "Dermaga", "Marina"],
    ["Hutan Kota", "Cagar Alam", "Taman Nasional"], ["Sawah", "Perkebunan", "Ladang"],
    ["Pabrik", "Gudang", "Sentra Industri"], ["Studio Musik", "Ruang Rekaman", "Ruang Latihan"],
    ["Salon", "Barbershop", "Spa"], ["Toko Buku", "Toko Alat Tulis", "Fotokopi"],
    ["Bengkel Motor", "Bengkel Mobil", "Dealer"], ["Arena Futsal", "Lapangan Basket", "Lapangan Badminton"],
    ["Kebun Raya", "Taman Bunga", "Rumah Kaca"], ["Kawasan Wisata", "Kampung Wisata", "Desa Wisata"],
    ["Rooftop", "Balkon", "Teras"], ["Kantin", "Food Court", "Dapur Umum"]
  ],
  "Hewan": [
    ["Kucing", "Kucing Anggora", "Kucing Persia"], ["Anjing", "Anjing Husky", "Anjing Golden"],
    ["Ayam", "Bebek", "Angsa"], ["Sapi", "Kerbau", "Kambing"], ["Harimau", "Macan Tutul", "Singa"],
    ["Gajah", "Badak", "Kuda Nil"], ["Hiu", "Lumba-Lumba", "Paus"], ["Ikan Lele", "Ikan Nila", "Ikan Gurame"],
    ["Burung Elang", "Burung Hantu", "Burung Rajawali"], ["Kelinci", "Hamster", "Marmut"],
    ["Kuda", "Zebra", "Keledai"], ["Ular", "Biawak", "Komodo"], ["Kura-Kura", "Penyu", "Siput"],
    ["Semut", "Lebah", "Tawon"], ["Kupu-Kupu", "Ngengat", "Capung"], ["Katak", "Kodok", "Salamander"],
    ["Cumi", "Gurita", "Sotong"], ["Kepiting", "Rajungan", "Lobster"], ["Paus Orca", "Paus Beluga", "Narwhal"],
    ["Panda", "Koala", "Wombat"], ["Rusa", "Kijang", "Rusa Kutub"], ["Cheetah", "Jaguar", "Puma"],
    ["Bunglon", "Iguana", "Tokek"], ["Merpati", "Perkutut", "Kenari"], ["Burung Kakaktua", "Burung Nuri", "Burung Beo"],
    ["Udang", "Kril", "Rebon"], ["Tuna", "Tongkol", "Cakalang"], ["Belut", "Sidat", "Lele"],
    ["Kuda Laut", "Ikan Pari", "Ikan Kerapu"], ["Piranha", "Barracuda", "Sarden"], ["Landak", "Trenggiling", "Armadillo"],
    ["Bison", "Yak", "Musk Ox"]
  ],
  "Benda": [
    ["Ponsel", "Tablet", "Laptop"], ["Kursi", "Sofa", "Bangku"], ["Meja", "Rak", "Lemari"],
    ["Payung", "Jas Hujan", "Topi"], ["Jam Tangan", "Jam Dinding", "Alarm"], ["Pensil", "Pulpen", "Spidol"],
    ["Buku", "Majalah", "Komik"], ["Kacamata", "Lensa Kontak", "Kacamata Hitam"], ["Sepatu", "Sandal", "Boot"],
    ["Tas Ransel", "Tas Selempang", "Tote Bag"], ["Botol Minum", "Tumbler", "Termos"], ["Piring", "Mangkuk", "Gelas"],
    ["Sendok", "Garpu", "Sumpit"], ["Wajan", "Panci", "Dandang"], ["Kipas Angin", "AC", "Air Cooler"],
    ["Lampu", "Senter", "Lilin"], ["Sapu", "Pel", "Lap"], ["Sabun", "Shampoo", "Pasta Gigi"],
    ["Dompet", "Card Holder", "Pouch"], ["Kunci", "Gembok", "Rantai"], ["Helm", "Pelindung Lutut", "Sarung Tangan"],
    ["Kamera", "Action Cam", "Drone"], ["Speaker", "Headset", "Earbud"], ["Remote TV", "Remote AC", "Remote Lampu"],
    ["Charger", "Power Bank", "Kabel Data"], ["Mouse", "Keyboard", "Trackpad"], ["Printer", "Scanner", "Fotokopi"],
    ["Stapler", "Paper Clip", "Binder"], ["Selimut", "Bantal", "Guling"], ["Gunting", "Cutter", "Penggaris"],
    ["Obeng", "Kunci Inggris", "Tang"], ["Lilin Aromaterapi", "Pengharum Ruangan", "Diffuser"]
  ],
  "Profesi": [
    ["Dokter", "Perawat", "Bidan"], ["Guru", "Dosen", "Tutor"], ["Programmer", "Frontend Engineer", "Backend Engineer"],
    ["Desainer", "Ilustrator", "Animator"], ["Pilot", "Pramugari", "ATC"], ["Polisi", "Satpam", "Detektif"],
    ["Pemadam Kebakaran", "Relawan SAR", "Petugas BPBD"], ["Koki", "Pastry Chef", "Barista"], ["Fotografer", "Videografer", "Editor"],
    ["Arsitek", "Insinyur Sipil", "Drafter"], ["Akuntan", "Auditor", "Analis Keuangan"], ["Marketing", "Sales", "Business Development"],
    ["Penulis", "Jurnalis", "Editor Media"], ["Musisi", "Produser Musik", "Sound Engineer"], ["Atlet", "Pelatih", "Fisioterapis"],
    ["Psikolog", "Konselor", "Terapis"], ["Apoteker", "Asisten Apoteker", "Analis Laboratorium"], ["Petani", "Pekebun", "Peternak"],
    ["Nelayan", "Mualim", "Nahkoda"], ["Supir", "Kurir", "Logistik"], ["Montir", "Teknisi", "Quality Control"],
    ["Penjahit", "Perancang Busana", "Pattern Maker"], ["Event Organizer", "MC", "Stage Manager"], ["Content Creator", "Script Writer", "Social Media Manager"],
    ["Hakim", "Jaksa", "Pengacara"], ["Analis Data", "Data Scientist", "Data Engineer"], ["Manajer Produk", "Project Manager", "Scrum Master"],
    ["Peneliti", "Asisten Riset", "Laboran"], ["Pustakawan", "Arsiparis", "Kurator"], ["Penjual", "Kasir", "SPG"],
    ["Pemandu Wisata", "Travel Planner", "Tour Leader"], ["Penata Rias", "Hair Stylist", "Beautician"]
  ],
  "Aktivitas": [
    ["Lari", "Jogging", "Sprint"], ["Jalan Santai", "Hiking", "Trekking"], ["Berenang", "Snorkeling", "Diving"],
    ["Memasak", "Memanggang", "Menumis"], ["Membaca", "Menulis", "Mencatat"], ["Belanja", "Window Shopping", "Checkout"],
    ["Ngobrol", "Diskusi", "Debat"], ["Menari", "Senam", "Zumba"], ["Bernyanyi", "Karaoke", "Jamming"],
    ["Fotografi", "Videografi", "Editing"], ["Berkebun", "Menyiram Tanaman", "Panen"], ["Memancing", "Menjala", "Menyelam"],
    ["Bermain Catur", "Bermain Kartu", "Bermain Domino"], ["Nonton Film", "Nonton Serial", "Nonton Dokumenter"], ["Main Game", "Speedrun", "Mabar"],
    ["Belajar", "Latihan Soal", "Ujian"], ["Meditasi", "Yoga", "Peregangan"], ["Camping", "Piknik", "Barbeku"],
    ["Bersepeda", "Spin Bike", "Gowes"], ["Naik Motor", "Naik Mobil", "Naik Bus"], ["Membersihkan Rumah", "Menyapu", "Mengepel"],
    ["Mencuci", "Menyetrika", "Melipat"], ["Belajar Bahasa", "Latihan Speaking", "Listening"], ["Presentasi", "Public Speaking", "Pitching"],
    ["Ngoding", "Debugging", "Refactor"], ["Desain", "Menggambar", "Sketsa"], ["Beladiri", "Sparring", "Latihan Fisik"],
    ["Futsal", "Sepak Bola", "Mini Soccer"], ["Basket", "Voli", "Badminton"], ["Main Puzzle", "Main Teka-Teki", "Main Sudoku"],
    ["Nge-vlog", "Live Streaming", "Podcasting"], ["Naik Kereta", "Naik Pesawat", "Naik Kapal"]
  ],
  "Teknologi": [
    ["WiFi", "Hotspot", "Bluetooth"], ["Router", "Modem", "Access Point"], ["Browser", "Search Engine", "Website"],
    ["Aplikasi", "Web App", "Desktop App"], ["Cloud Storage", "Hard Disk", "Flashdisk"], ["CPU", "GPU", "RAM"],
    ["Keyboard Mekanikal", "Keyboard Membran", "Keypad"], ["Linux", "Windows", "macOS"], ["Android", "iOS", "HarmonyOS"],
    ["Database SQL", "NoSQL", "Spreadsheet"], ["API", "Webhook", "SDK"], ["Server", "VPS", "Shared Hosting"],
    ["Firewall", "Antivirus", "VPN"], ["Enkripsi", "Hash", "Token"], ["Bug", "Crash", "Lag"],
    ["Deploy", "Rollback", "Monitoring"], ["Git", "Branch", "Commit"], ["UI", "UX", "Wireframe"],
    ["Sensor", "Mikrokontroler", "Arduino"], ["IoT", "Smart Home", "Wearable"], ["Layar OLED", "Layar AMOLED", "Layar IPS"],
    ["Baterai", "Fast Charging", "Wireless Charging"], ["QR Code", "Barcode", "NFC"], ["Robot Vacuum", "Robot Lengan", "Robot Edukasi"],
    ["AI Asisten", "Chatbot", "Speech to Text"], ["Model Machine Learning", "Dataset", "Training"], ["Augmented Reality", "Virtual Reality", "Mixed Reality"],
    ["Email", "Pesan Instan", "Forum"], ["CDN", "Cache", "Load Balancer"], ["Jam Pintar", "Gelang Pintar", "Pelacak Kebugaran"],
    ["3D Printer", "Laser Cutter", "CNC"], ["Password Manager", "Authenticator", "Backup Code"]
  ],
  "Indonesia Lokal": [
    ["Jakarta", "Bandung", "Surabaya"], ["Yogyakarta", "Solo", "Semarang"], ["Medan", "Palembang", "Pekanbaru"],
    ["Makassar", "Manado", "Balikpapan"], ["Bali", "Lombok", "Labuan Bajo"], ["Angkot", "Bajaj", "Ojol"],
    ["Warteg", "Warmindo", "Warung Tenda"], ["Sambal", "Lalapan", "Urap"], ["Batik", "Tenun", "Songket"],
    ["Wayang", "Ketoprak", "Lenong"], ["Dangdut", "Campursari", "Keroncong"], ["Gamelan", "Angklung", "Sasando"],
    ["Candi", "Keraton", "Benteng"], ["Pasar Malam", "Car Free Day", "Alun-Alun"], ["Kopi Tubruk", "Kopi Gayo", "Kopi Toraja"],
    ["Pempek", "Mie Aceh", "Coto Makassar"], ["Rawon", "Soto Betawi", "Soto Lamongan"], ["Rujak Cingur", "Lontong Balap", "Tahu Campur"],
    ["Klepon", "Lapis Legit", "Bika Ambon"], ["Ondel-Ondel", "Reog", "Barongsai"], ["Mudik", "Pulang Kampung", "Arus Balik"],
    ["Lebaran", "Takbiran", "Halalbihalal"], ["KTP", "SIM", "KK"], ["RT", "RW", "Kelurahan"],
    ["Posyandu", "Puskesmas", "Balai Desa"], ["Becak", "Delman", "Andong"], ["Kereta Commuter", "MRT", "LRT"],
    ["Tahu Bulat", "Cilok", "Cireng"], ["Es Cendol", "Es Dawet", "Es Doger"], ["Lagu Daerah", "Tari Daerah", "Upacara Adat"],
    ["Pantun", "Peribahasa", "Tebak-tebakan"], ["Banjir Rob", "Musim Hujan", "Musim Kemarau"]
  ],
  "Random": [
    ["Merah", "Jingga", "Kuning"], ["Senin", "Selasa", "Rabu"], ["Pagi", "Siang", "Malam"],
    ["Kertas", "Karton", "Tisu"], ["Batu", "Kerikil", "Pasir"], ["Awan", "Kabut", "Embun"],
    ["Cepat", "Lincah", "Gesit"], ["Lambat", "Santai", "Tenang"], ["Manis", "Asam", "Gurih"],
    ["Panas", "Hangat", "Dingin"], ["Tinggi", "Pendek", "Sedang"], ["Kuat", "Kokoh", "Tangguh"],
    ["Tipis", "Tebal", "Padat"], ["Halus", "Lembut", "Licin"], ["Keras", "Padat", "Kaku"],
    ["Pintar", "Cerdas", "Jenius"], ["Lucu", "Kocak", "Jenaka"], ["Serius", "Formal", "Resmi"],
    ["Ramah", "Akrab", "Hangat"], ["Hening", "Sepi", "Sunyi"], ["Petir", "Guntur", "Kilat"],
    ["Hujan", "Gerimis", "Rintik"], ["Sungai", "Danau", "Rawa"], ["Planet", "Bintang", "Galaksi"],
    ["Kertas Kado", "Pita", "Stiker"], ["Tenda", "Sleeping Bag", "Matras"], ["Lilin Ulang Tahun", "Kue Ulang Tahun", "Balon"],
    ["Peta", "Kompas", "Globe"], ["Surat", "Kartu Pos", "Amplop"], ["Bendera", "Lambang", "Logo"],
    ["Puzzle 3D", "Rubik", "Jigsaw"], ["Kelereng", "Gundu", "Yoyo"]
  ]
};

function difficulty(main, undercover) {
  const d = Math.abs(main.length - undercover.length);
  if (d <= 2) return 1;
  if (d <= 5) return 2;
  return 3;
}

function toTag(token) {
  return token.toLowerCase().replace(/\s+/g, "-");
}

function buildWordBank() {
  const out = [];
  Object.entries(PACK_CLUSTERS).forEach(([pack, clusters]) => {
    clusters.forEach((cluster) => {
      for (let i = 0; i < cluster.length - 1; i += 1) {
        const main = cluster[i];
        const undercover = cluster[i + 1];
        out.push({
          pack,
          main,
          undercover,
          difficulty: difficulty(main, undercover),
          tags: [...(PACK_META[pack] || []), toTag(main.split(" ")[0])]
        });
      }
    });
  });
  return out;
}

export const WORD_BANK = buildWordBank();
export const PACKS = Object.keys(PACK_META);
