import { PrismaClient, MovieRating, MovieFormat, MovieStatus, SeatType, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createHallWithSeats(branchId: string, name: string, rows: number, columns: number) {
  const hall = await prisma.hall.create({
    data: { branchId, name, rows, columns },
  });

  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, rows).split("");
  const seatsData = [];
  for (const row of rowLetters) {
    for (let col = 1; col <= columns; col++) {
      // Back two rows are VIP, front row has a couple-seat pair at each end
      let type: SeatType = SeatType.STANDARD;
      const rowIndex = rowLetters.indexOf(row);
      if (rowIndex >= rows - 2) type = SeatType.VIP;
      if (rowIndex === rows - 1 && (col <= 2 || col > columns - 2)) type = SeatType.COUPLE;

      seatsData.push({
        hallId: hall.id,
        row,
        column: col,
        label: `${row}${col}`,
        type,
        isAisleAfter: col === Math.ceil(columns / 2),
      });
    }
  }
  await prisma.seat.createMany({ data: seatsData });
  return hall;
}

async function main() {
  console.log("Seeding CineTown...");

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  await prisma.setting.upsert({
    where: { key: "brand" },
    create: {
      key: "brand",
      value: {
        name: "CineTown",
        logoText: "CineTown",
        colors: {
          orange: "#F0522A",
          red: "#D7372B",
          crimson: "#BE1E2D",
        },
        hotline: "+95 1 234 5678",
        social: {
          facebook: "https://facebook.com/cinetown",
          viber: "",
          telegram: "",
        },
        defaultLanguage: "en",
      },
    },
    update: {},
  });

  // ---------------------------------------------------------------------
  // Super admin
  // ---------------------------------------------------------------------
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "admin@cinetown.mm").toLowerCase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
  const superAdminName = process.env.SUPER_ADMIN_NAME || "CineTown Super Admin";

  const passwordHash = await argon2.hash(superAdminPassword);
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    create: {
      email: superAdminEmail,
      name: superAdminName,
      passwordHash,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
    update: {},
  });
  console.log(`Super admin ready: ${superAdminEmail}`);

  // A regular sample customer for testing bookings
  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    create: {
      email: "customer@example.com",
      name: "Test Customer",
      passwordHash: await argon2.hash("Customer123!"),
      role: Role.USER,
      emailVerified: new Date(),
      phone: "09-123456789",
    },
    update: {},
  });

  // ---------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------
  const branchSeeds = [
    {
      nameEn: "North Okkalapa",
      nameMm: "မြောက်ဥက္ကလာပ",
      addressEn: "No. 12, Yangon-Mandalay Rd, North Okkalapa, Yangon",
      addressMm: "အမှတ် ၁၂၊ ရန်ကုန်-မန္တလေးလမ်း၊ မြောက်ဥက္ကလာပ၊ ရန်ကုန်",
      phone: "+95 1 555 0101",
      latitude: 16.8961,
      longitude: 96.1951,
      openingHours: "10:00 - 23:00 daily",
      facilities: ["Parking", "Snack Bar", "Wheelchair Access", "3D"],
    },
    {
      nameEn: "South Dagon",
      nameMm: "တောင်ဒဂုံ",
      addressEn: "No. 88, Thudhamma Rd, South Dagon, Yangon",
      addressMm: "အမှတ် ၈၈၊ သုဓမ္မလမ်း၊ တောင်ဒဂုံ၊ ရန်ကုန်",
      phone: "+95 1 555 0102",
      latitude: 16.8153,
      longitude: 96.2298,
      openingHours: "10:00 - 23:00 daily",
      facilities: ["Parking", "Snack Bar", "Premium Lounge"],
    },
    {
      nameEn: "Insein",
      nameMm: "အင်းစိန်",
      addressEn: "No. 45, Insein Rd, Insein, Yangon",
      addressMm: "အမှတ် ၄၅၊ အင်းစိန်လမ်း၊ အင်းစိန်၊ ရန်ကုန်",
      phone: "+95 1 555 0103",
      latitude: 16.9010,
      longitude: 96.1006,
      openingHours: "10:00 - 22:30 daily",
      facilities: ["Parking", "Snack Bar"],
    },
    {
      nameEn: "Tarmwe",
      nameMm: "တာမွေ",
      addressEn: "No. 7, Thanlwin Rd, Tarmwe, Yangon",
      addressMm: "အမှတ် ၇၊ သံလွင်လမ်း၊ တာမွေ၊ ရန်ကုန်",
      phone: "+95 1 555 0104",
      latitude: 16.8264,
      longitude: 96.1751,
      openingHours: "10:00 - 23:00 daily",
      facilities: ["Parking", "Snack Bar", "Wheelchair Access"],
    },
  ];

  const branches = [];
  for (const b of branchSeeds) {
    const branch = await prisma.branch.upsert({
      where: { slug: slugify(b.nameEn) },
      create: { ...b, slug: slugify(b.nameEn) },
      update: {},
    });
    branches.push(branch);
  }

  // ---------------------------------------------------------------------
  // Halls per branch
  // ---------------------------------------------------------------------
  const hallsByBranch: Record<string, { id: string; name: string }[]> = {};
  for (const branch of branches) {
    const existing = await prisma.hall.findMany({ where: { branchId: branch.id } });
    if (existing.length > 0) {
      hallsByBranch[branch.id] = existing;
      continue;
    }
    const hall1 = await createHallWithSeats(branch.id, "Hall 1", 8, 12);
    const hall2 = await createHallWithSeats(branch.id, "Hall 2 (Premium)", 6, 10);
    hallsByBranch[branch.id] = [hall1, hall2];
  }

  // ---------------------------------------------------------------------
  // Movies
  // ---------------------------------------------------------------------
  const movieSeeds = [
    {
      titleEn: "Golden Land Heist",
      titleMm: "ရွှေပြည်ရွှေတိုက်ဖျက်ခန်း",
      synopsisEn:
        "A crew of unlikely allies pulls off the biggest heist Yangon has ever seen, racing against time and a relentless detective.",
      synopsisMm: "ရန်ကုန်မြို့ကြုံဖူးဆုံးဖူးသော အကြီးမားဆုံးလုယူမှုကြီးကို ပြီးမြောက်စေရန် အချိန်နှင့်ပြေးနေရသော အဖွဲ့တစ်ဖွဲ့၏ဇာတ်လမ်း။",
      cast: ["Nay Toe", "Wut Hmone Shwe Yi", "Pyay Ti Oo"],
      director: "Aung Ko Latt",
      genre: ["Action", "Thriller"],
      rating: MovieRating.PG13,
      runtimeMin: 128,
      language: "Burmese",
      subtitles: "English",
      formats: [MovieFormat.D2, MovieFormat.D3],
      posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600",
      bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      releaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: MovieStatus.NOW_SHOWING,
      featured: true,
    },
    {
      titleEn: "Skyline Odyssey",
      titleMm: "မိုးကောင်းကင် ခရီးဝေး",
      synopsisEn: "An astronaut stranded above the atmosphere must find a way home before her oxygen runs out.",
      synopsisMm: "လေထုအထက်တွင် ကျန်ရစ်ခဲ့သော အာကာသယာဉ်မှူးမိန်းကလေးတစ်ဦး၏ အသက်ရှင်ရန် ခရီးစဉ်။",
      cast: ["Eaindra Kyaw Zin", "Okkar Dat Khay"],
      director: "Sandi Myint Lwin",
      genre: ["Sci-Fi", "Drama"],
      rating: MovieRating.PG,
      runtimeMin: 112,
      language: "English",
      subtitles: "Burmese",
      formats: [MovieFormat.D2, MovieFormat.PREMIUM],
      posterUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600",
      bannerUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1600",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      releaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: MovieStatus.NOW_SHOWING,
      featured: true,
    },
    {
      titleEn: "Monsoon Melody",
      titleMm: "မိုးရာသီသီချင်း",
      synopsisEn: "A romance blooms between two street musicians during the rainy season in old Yangon.",
      synopsisMm: "ရန်ကုန်မြို့ဟောင်း မိုးရာသီအတွင်း လမ်းဂီတသမား နှစ်ဦးကြား အချစ်ဇာတ်လမ်း။",
      cast: ["Paing Takhon", "Poe Kyar Phyu"],
      director: "Thu Rein Aung",
      genre: ["Romance", "Musical"],
      rating: MovieRating.G,
      runtimeMin: 105,
      language: "Burmese",
      subtitles: null,
      formats: [MovieFormat.D2],
      posterUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600",
      bannerUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600",
      trailerUrl: null,
      releaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: MovieStatus.NOW_SHOWING,
      featured: false,
    },
    {
      titleEn: "Iron Dragon Rising",
      titleMm: "သံနဂါး ထွန်းလင်းချိန်",
      synopsisEn: "A martial arts champion trains for one last tournament to save his family's legacy.",
      synopsisMm: "မိသားစုအမွေအနှစ်ကို ကယ်တင်ရန် နောက်ဆုံးပြိုင်ပွဲအတွက် လေ့ကျင့်နေသော ကျင်းသင်ခေါင်းဆောင်တစ်ဦး။",
      cast: ["Zenn Kyi", "Mo Mo Myint Aung"],
      director: "Ye Lwin Aung",
      genre: ["Action"],
      rating: MovieRating.PG13,
      runtimeMin: 118,
      language: "Burmese",
      subtitles: "English",
      formats: [MovieFormat.D2, MovieFormat.D3],
      posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600",
      bannerUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1600",
      trailerUrl: null,
      releaseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: MovieStatus.COMING_SOON,
      featured: true,
    },
    {
      titleEn: "The Last Lantern",
      titleMm: "နောက်ဆုံးမီးအိမ်",
      synopsisEn: "A grandmother's mysterious lantern reveals the secret history of her village.",
      synopsisMm: "အဖွားတစ်ဦး၏ လျှို့ဝှက်မီးအိမ်ဟောင်းက ကျေးရွာ၏ သမိုင်းကို ဖော်ထုတ်ပေးသည်။",
      cast: ["Khin Wint Wah", "Lu Min"],
      director: "Ma Ma Thit",
      genre: ["Mystery", "Family"],
      rating: MovieRating.G,
      runtimeMin: 98,
      language: "Burmese",
      subtitles: "English",
      formats: [MovieFormat.D2],
      posterUrl: "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=600",
      bannerUrl: "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=1600",
      trailerUrl: null,
      releaseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: MovieStatus.COMING_SOON,
      featured: false,
    },
  ];

  const movies = [];
  for (const m of movieSeeds) {
    const movie = await prisma.movie.upsert({
      where: { slug: slugify(m.titleEn) },
      create: { ...m, slug: slugify(m.titleEn), allBranches: true },
      update: {},
    });
    movies.push(movie);
  }

  // ---------------------------------------------------------------------
  // Showtimes: one week, now-showing movies, both halls per branch
  // ---------------------------------------------------------------------
  const nowShowing = movies.filter((m) => m.status === MovieStatus.NOW_SHOWING);
  const timesOfDay = [10, 13, 16, 19, 21.5];

  await prisma.showtime.deleteMany({
    where: { startsAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });

  for (const branch of branches) {
    const halls = hallsByBranch[branch.id];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      for (const [movieIndex, movie] of nowShowing.entries()) {
        const hall = halls[movieIndex % halls.length];
        const timeHour = timesOfDay[(dayOffset + movieIndex) % timesOfDay.length];
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + dayOffset);
        const hour = Math.floor(timeHour);
        const minute = timeHour % 1 === 0.5 ? 30 : 0;
        startsAt.setHours(hour, minute, 0, 0);
        const endsAt = new Date(startsAt.getTime() + (movie.runtimeMin + 20) * 60 * 1000);

        await prisma.showtime.create({
          data: {
            movieId: movie.id,
            branchId: branch.id,
            hallId: hall.id,
            startsAt,
            endsAt,
            format: movie.formats[0],
            priceStandard: 6000,
            priceVip: 9000,
            priceCouple: 16000,
          },
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Promotions & promo codes
  // ---------------------------------------------------------------------
  await prisma.promotion.upsert({
    where: { id: "seed-promo-1" },
    create: {
      id: "seed-promo-1",
      titleEn: "Grand Opening Week",
      titleMm: "ဖွင့်ပွဲအထူးအပတ်",
      bodyEn: "Enjoy 20% off all tickets during our grand opening week!",
      bodyMm: "ဖွင့်ပွဲအထူးအပတ်အတွင်း လက်မှတ်အားလုံး ၂၀% လျှော့စျေးနှင့် ဝယ်ယူနိုင်ပါပြီ။",
      imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      published: true,
    },
    update: {},
  });

  await prisma.promoCode.upsert({
    where: { code: "WELCOME20" },
    create: {
      code: "WELCOME20",
      discountType: "PERCENTAGE",
      amount: 20,
      minSpend: 6000,
      usageLimit: 500,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
