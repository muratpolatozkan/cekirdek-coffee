// Oyunun bütün sabit verisi burada: ızgara ölçüleri, eşyalar, içecekler, mahalleler, olaylar…

// ---- dünya ölçüleri ----
export const UW = 5, UD = 6, NU = 4, GW = UW * NU;          // dükkan birimi genişlik/derinlik, birim sayısı
export const SIDEWALK_Z = UD + 1.3, FAR_Z = UD + 6.3;       // yaya şeritleri (teras kaldırımın iç kısmında)
export const STREET_X0 = -9, STREET_X1 = GW + 9;
export const MIN_PER_SEC = 2.4;                              // 1 gerçek saniye = 2.4 oyun dakikası (gün ≈ 6 dk)
export const PACE = 1.6;                                     // günü kısalttığımız oran: yaya akışı bu kadar sıklaşır, işler bu kadar hızlanır
export const OPEN = 8 * 60, CLOSE = 22 * 60, DAY_START = 7 * 60 + 30;
export const MAX_QUEUE = 4, MAX_INSIDE = 45, WALL_H = 1.6;
export const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
export const SAVE_KEY = 'cekirdek-coffee-v3', OLD_SAVE_KEY = 'cekirdek-coffee-v2', META_KEY = 'cekirdek-coffee-meta';
export const START_ITEMS = [{ type: 'bar', i: 7, j: 1, r: 0 }, { type: 'table', i: 6, j: 4, r: 0 }, { type: 'plant', i: 5, j: 0, r: 0 }];
export const TERRACE_COST = 2500, TERRACE_FEE = 100, LOYALTY_CARD_COST = 3000, AUTO_SUPPLY_COST = 2000;

// ---- komşu dükkan tipleri ----
export const NEIGHBORS = {
  bakkal:        { name: 'Bakkal Hasan',     sign: 'HASAN BAKKALİYE',      signBg: '#b03a2e', signFg: '#fff6e5', wall: 0xeadcb5, floor: 'tile',     icon: '🏪', npc: { shirt: 0xf3f1ea, hair: 0xd0d0d0 } },
  kuafor:        { name: 'Kuaför Ahmet',     sign: 'KUAFÖR AHMET',         signBg: '#24557e', signFg: '#ffffff', wall: 0xcfe0e8, floor: 'checker',  icon: '✂️', npc: { shirt: 0x24557e, hair: 0x222222 } },
  cicekci:       { name: 'Çiçekçi Leyla',    sign: 'LEYLA ÇİÇEKÇİLİK',     signBg: '#c2577a', signFg: '#ffffff', wall: 0xf3e1e6, floor: 'tile',     icon: '💐', npc: { shirt: 0xc2577a, hair: 0x5a3a22 } },
  balikci:       { name: 'Balıkçı Yusuf',    sign: 'BALIKÇI YUSUF',        signBg: '#1f6f8b', signFg: '#ffffff', wall: 0xd9ecf2, floor: 'tile',     icon: '🐟', npc: { shirt: 0x2c3e50, hair: 0x111111 } },
  kirtasiye:     { name: 'Kırtasiyeci Nur',  sign: 'NUR KIRTASİYE',        signBg: '#e2a400', signFg: '#2a211b', wall: 0xf6edcf, floor: 'tile',     icon: '✏️', npc: { shirt: 0xe3b23c, hair: 0x2b1d14 } },
  kurutemizleme: { name: 'Kuru Temizleme',   sign: 'EXPRESS KURU TEMİZLEME', signBg: '#3b4d8f', signFg: '#ffffff', wall: 0xe4e8f2, floor: 'beton', icon: '👔', npc: { shirt: 0xf0efe9, hair: 0x5a3a22 } },
  fotokopi:      { name: 'Fotokopici Cem',   sign: 'CEM FOTOKOPİ',         signBg: '#3a3a3a', signFg: '#ffd84d', wall: 0xe8e8e8, floor: 'beton',    icon: '🖨️', npc: { shirt: 0x5c6670, hair: 0x111111 } },
  kitapci:       { name: 'Sahaf Nuri',       sign: 'SAHAF NURİ',           signBg: '#5a3d2b', signFg: '#f3e9d6', wall: 0xeadfcf, floor: 'ceviz',    icon: '📚', npc: { shirt: 0x7a9e7e, hair: 0xcfcfcf } },
};

// ---- mahalleler (şubeler) ----
// units: 4 dükkan birimi; 'ours' ilk dükkanımız, 'empty' baştan kiralık, diğerleri komşu (koşulla kiralığa düşer)
export const HOODS = {
  cinar: {
    name: 'Çınar Sokak', icon: '🌳', theme: 'park', open: 0, rentMult: 1, passMult: 1, typeMult: {},
    desc: 'Sakin bir mahalle sokağı. Her tipten müşteri uğrar.',
    units: [
      { kind: 'bakkal', deposit: 9000, rent: 450, unlock: { age: 10, served: 600 }, hint: 'Hasan Amca emekliliği düşünmüyor… (10 gün ve 600 servis)', news: '🏪 Bakkal Hasan Amca dükkanı devrediyor, artık kiralık!' },
      { kind: 'ours', rent: 300 },
      { kind: 'empty', deposit: 2500, rent: 350 },
      { kind: 'kuafor', deposit: 5000, rent: 400, unlock: { age: 5, rating: 4.0 }, hint: 'Ahmet Usta emekli olmayı düşünüyor… (5 gün ve ⭐4.0)', news: '✂️ Kuaför Ahmet emekli oldu, dükkanı kiralık!' },
    ],
    rival: { name: 'MEGA KAHVE', age: 8 },
  },
  kampus: {
    name: 'Kampüs Caddesi', icon: '🎓', theme: 'campus', open: 12000, rentMult: .8, passMult: 1.2, typeMult: { ogrenci: 4, tutkun: 1.3, ofis: .4, emekli: .5 },
    desc: 'Üniversitenin karşısı. Öğrenci dolu, fiyata çok duyarlı.',
    units: [
      { kind: 'fotokopi', deposit: 6000, rent: 380, unlock: { age: 6, served: 300 }, hint: 'Cem Abi dijitale geçmeyi düşünüyor… (6 gün ve 300 servis)', news: '🖨️ Fotokopici Cem dükkanı kapattı, kiralık!' },
      { kind: 'ours', rent: 300 },
      { kind: 'empty', deposit: 2500, rent: 330 },
      { kind: 'kitapci', deposit: 5000, rent: 360, unlock: { age: 4, rating: 4.1 }, hint: 'Nuri Bey sahafı internete taşıyacak… (4 gün ve ⭐4.1)', news: '📚 Sahaf Nuri internete taşındı, dükkanı kiralık!' },
    ],
    rival: { name: 'KAMPÜS KAHVE', age: 5 },
  },
  moda: {
    name: 'Moda Sahil', icon: '⛵', theme: 'sea', open: 18000, rentMult: 1.5, passMult: 1.25, typeMult: { turist: 3.5, tutkun: 1.6, ofis: .5 },
    desc: 'Deniz kenarı. Turist ve kahve tutkunu bol, kira yüksek.',
    units: [
      { kind: 'cicekci', deposit: 8000, rent: 450, unlock: { age: 4, rating: 4.2 }, hint: 'Leyla Hanım daha büyük bir dükkan arıyor… (4 gün ve ⭐4.2)', news: '💐 Çiçekçi Leyla büyük dükkanına taşındı, yer kiralık!' },
      { kind: 'ours', rent: 300 },
      { kind: 'empty', deposit: 3500, rent: 380 },
      { kind: 'balikci', deposit: 7000, rent: 420, unlock: { age: 7, served: 400 }, hint: 'Yusuf Reis tekneye dönmek istiyor… (7 gün ve 400 servis)', news: '🐟 Balıkçı Yusuf denize döndü, dükkanı kiralık!' },
    ],
    rival: { name: 'SAHİL COFFEE CO.', age: 5 },
  },
  plaza: {
    name: 'Levent Plaza', icon: '🏢', theme: 'plaza', open: 26000, rentMult: 1.8, passMult: 1.35, typeMult: { ofis: 4.5, ogrenci: .3, emekli: .3, turist: .6 },
    desc: 'Gökdelenlerin dibi. Sabah ve öğle akını, aceleci ofis çalışanları.',
    units: [
      { kind: 'kirtasiye', deposit: 9000, rent: 480, unlock: { age: 5, served: 500 }, hint: 'Nur Hanım AVM\'ye taşınacak… (5 gün ve 500 servis)', news: '✏️ Kırtasiye AVM\'ye taşındı, dükkan kiralık!' },
      { kind: 'ours', rent: 300 },
      { kind: 'empty', deposit: 4000, rent: 420 },
      { kind: 'kurutemizleme', deposit: 8000, rent: 450, unlock: { age: 6, rating: 4.2 }, hint: 'Kuru temizlemeci kapanmayı düşünüyor… (6 gün ve ⭐4.2)', news: '👔 Kuru temizleme kapandı, yer kiralık!' },
    ],
    rival: { name: 'KAHVE EXPRESS', age: 4 },
  },
};

// ---- eşyalar ----
export const CATALOG = {
  bar:     { name: 'Espresso Bar', icon: '☕', price: 1500, amb: 0 },
  table:   { name: 'Masa', icon: '🪑', price: 300, amb: 1, seats: [
             { x: -0.38, z: 0, h: 0.235, fx: 0, fz: 0, cx: -0.15, cz: 0 }, { x: 0.38, z: 0, h: 0.235, fx: 0, fz: 0, cx: 0.15, cz: 0 }], cupY: 0.39 },
  stool:   { name: 'Bar Taburesi', icon: '🍸', price: 180, amb: 0, seats: [
             { x: 0.2, z: 0.14, h: 0.345, fx: -0.12, fz: -0.06, cx: -0.12, cz: -0.06 }], cupY: 0.47 },
  sofa:    { name: 'Koltuk', icon: '🛋️', price: 650, amb: 4, seats: [
             { x: -0.22, z: 0.03, h: 0.26, fx: -0.22, fz: 1, cx: -0.36, cz: 0.12 }, { x: 0.22, z: 0.03, h: 0.26, fx: 0.22, fz: 1, cx: 0.36, cz: 0.12 }], cupY: 0.28 },
  umbrella:{ name: 'Şemsiyeli Masa', icon: '⛱️', price: 550, amb: 2, terraceOnly: true, seats: [
             { x: -0.38, z: 0, h: 0.235, fx: 0, fz: 0, cx: -0.15, cz: 0 }, { x: 0.38, z: 0, h: 0.235, fx: 0, fz: 0, cx: 0.15, cz: 0 }], cupY: 0.39 },
  plant:   { name: 'Bitki', icon: '🪴', price: 120, amb: 2 },
  tree:    { name: 'Zeytin Ağacı', icon: '🌳', price: 380, amb: 4 },
  shelf:   { name: 'Çekirdek Rafı', icon: '🫘', price: 350, amb: 3 },
  lamp:    { name: 'Lamba', icon: '💡', price: 220, amb: 2 },
  pikap:   { name: 'Pikap', icon: '🎶', price: 900, amb: 5 },
  vitrin:  { name: 'Pasta Vitrini', icon: '🥐', price: 1200, amb: 1 },
  roaster: { name: 'Kavurma Mak.', icon: '🔥', price: 6000, amb: 3 },
  xmas:    { name: 'Yılbaşı Ağacı', icon: '🎄', price: 450, amb: 5, season: 'kis' },
};
export const TERRACE_OK = ['table', 'umbrella', 'stool', 'plant', 'tree', 'lamp'];

// ---- içecekler ----
// temp: sıcak/soğuk (hava durumu talebi etkiler); sig: imza tarif; likes: müşteri tiplerinin ilgisi
export const DRINKS = {
  espresso:  { name: 'Espresso',   icon: '☕', base: 50,  beans: 1, milk: 0, time: 3,   temp: 'hot',  start: true },
  americano: { name: 'Americano',  icon: '☕', base: 60,  beans: 1, milk: 0, time: 3.5, temp: 'hot',  start: true },
  latte:     { name: 'Latte',      icon: '🥛', base: 80,  beans: 1, milk: 1, time: 5,   temp: 'hot',  cost: 600 },
  flatwhite: { name: 'Flat White', icon: '🥛', base: 90,  beans: 2, milk: 1, time: 5.5, temp: 'hot',  cost: 1500 },
  coldbrew:  { name: 'Cold Brew',  icon: '🧊', base: 95,  beans: 2, milk: 0, time: 2.5, temp: 'cold', cost: 2500 },
  v60:       { name: 'V60 Filtre', icon: '⏳', base: 130, beans: 2, milk: 0, time: 8,   temp: 'hot',  cost: 4000 },
  turk:      { name: 'Türk Kahvesi', icon: '🫖', base: 70, beans: 1, milk: 0, extra: 2, time: 5, temp: 'hot', cost: 1200, sig: true,
               likes: { emekli: 5, turist: 4, ofis: 1 }, desc: 'Köpüklü, lokumla servis' },
  tahinli:   { name: 'Tahinli Latte', icon: '🥜', base: 105, beans: 1, milk: 1, extra: 8, time: 6, temp: 'hot', cost: 2000, sig: true,
               likes: { ogrenci: 3, turist: 3, emekli: 1 }, desc: 'Pekmez ve tahinle, mahallenin imzası' },
  findikli:  { name: 'Fındıklı Latte', icon: '🌰', base: 100, beans: 1, milk: 1, extra: 7, time: 5.5, temp: 'hot', cost: 1800, sig: true,
               likes: { ogrenci: 3, ofis: 2 }, season: 'sonbahar', desc: 'Sonbaharda iki kat sevilir' },
  lokumlu:   { name: 'Lokumlu Cold Brew', icon: '🍬', base: 115, beans: 2, milk: 0, extra: 9, time: 3, temp: 'cold', cost: 3000, sig: true,
               likes: { turist: 4, ogrenci: 2 }, season: 'yaz', desc: 'Gül lokumlu, yazın yıldızı' },
  salep:     { name: 'Salep', icon: '🍵', base: 80, beans: 0, milk: 1, extra: 6, time: 4, temp: 'hot', cost: 1500, sig: true,
               likes: { emekli: 3, ogrenci: 2, turist: 2 }, season: 'kis', desc: 'Tarçınlı, kışın vazgeçilmezi' },
};
export const SWEET = ['Az', 'Orta', 'Çok'];
export const FOOD = { name: 'Kruvasan', icon: '🥐', base: 75, cost: 25 };
export const MILK_PACK = 50, MILK_PACK_COST = 150, BAG = 100;
export const BEANS = {
  brezilya:  { name: 'Brezilya Santos',      q: 2.5, cost: 3,  note: 'Ticari harman, ucuz' },
  kolombiya: { name: 'Kolombiya Huila',      q: 3.2, cost: 5,  note: 'Dengeli, çikolatamsı' },
  etiyopya:  { name: 'Etiyopya Yirgacheffe', q: 4.0, cost: 9,  note: 'Çiçeksi, meyvemsi' },
  geisha:    { name: 'Panama Geisha',        q: 5.0, cost: 18, note: 'Nadir ve efsane' },
};
export const ROASTS = { acik: 'Açık', orta: 'Orta', koyu: 'Koyu' };

// ---- müşteri tipleri ----
export const TYPES = {
  ofis:    { name: 'Ofis çalışanı', icon: '💼', price: .7,  qual: .6,  patience: 26, sit: .25, sitDur: [6, 12],  review: .3,  food: .15, sweet: .5,  roast: 'koyu',
             drinks: { americano: 4, espresso: 2, latte: 3, flatwhite: 2, coldbrew: 2 }, look: { acc: 'tie', shirt: 0xf0efe9 } },
  ogrenci: { name: 'Öğrenci',       icon: '🎒', price: 1.5, qual: .4,  patience: 45, sit: .9,  sitDur: [28, 55], review: .35, food: .35, sweet: 1.7, roast: 'orta',
             drinks: { latte: 4, americano: 2, coldbrew: 3, espresso: 1 }, look: { acc: 'backpack' } },
  tutkun:  { name: 'Kahve tutkunu', icon: '🧐', price: .45, qual: 1.7, patience: 55, sit: .6,  sitDur: [14, 26], review: .8,  food: .1,  sweet: 0,   roast: 'acik',
             drinks: { v60: 6, espresso: 3, flatwhite: 2, coldbrew: 1 }, look: { acc: 'glasses' } },
  emekli:  { name: 'Emekli',        icon: '👴', price: 1.1, qual: .7,  patience: 60, sit: .85, sitDur: [18, 35], review: .3,  food: .5,  sweet: 1.2, roast: 'koyu',
             drinks: { americano: 3, latte: 2, espresso: 2 }, look: { acc: 'cap', hair: 0xd6d6d6 } },
  turist:  { name: 'Turist',        icon: '📸', price: .35, qual: .9,  patience: 40, sit: .55, sitDur: [12, 22], review: .65, food: .45, sweet: 1.3, roast: 'orta',
             drinks: { latte: 3, flatwhite: 2, coldbrew: 3, v60: 1, espresso: 1 }, look: { acc: 'camera' } },
};

export const NAMES = ['Zeynep', 'Mert', 'Elif', 'Can', 'Defne', 'Emre', 'Selin', 'Burak', 'Ece', 'Kerem', 'Ayşe', 'Deniz', 'Cem', 'İrem',
  'Ozan', 'Melis', 'Kaan', 'Sude', 'Arda', 'Yağmur', 'Efe', 'Nil', 'Barış', 'Derin', 'Umut', 'Ceren', 'Tolga', 'Asya', 'Onur', 'Gizem', 'Berk', 'Lale'];

// ---- yorum metinleri ----
export const TXT = {
  quality: { pos: ['Kahveleri gerçekten çok iyi, çekirdekler taze.', 'Mahallenin en iyi espressosu olabilir.', 'Aromalar harikaydı, işini bilen bir yer.'],
             neg: ['Kahve sıradandı, daha iyi çekirdek kullanabilirler.', 'Açıkçası market kahvesi gibiydi.'] },
  atm:     { pos: ['Mekan çok şirin, ortam harika.', 'Dekorasyon çok hoş, saatlerce oturulur.', 'Bitkiler ve müzik çok iyi bir hava katmış.'], neg: [] },
  charm:   { pos: ['Barista {b} çok güler yüzlüydü!', '{b} kahveyi anlatarak yaptı, bayıldım.'], neg: ['Barista biraz asık suratlıydı.', 'Barista çok yorgun görünüyordu.'] },
  wait:    { pos: ['Servis çok hızlıydı.', 'Hiç beklemeden kahvemi aldım.'], neg: ['Sıra çok uzundu, {m} dakika bekledim.', 'Bekleme süresi fazla uzun.'] },
  price:   { pos: ['Fiyatlar gayet uygun.', 'Bu kaliteye bu fiyat süper.'], neg: ['Fiyatlar biraz tuzlu.', '{d} için {p} fazla pahalı.'] },
  missing: { pos: [], neg: ['Menüde {want} yoktu, üzüldüm.', '{want} istedim ama yokmuş.'] },
  milk:    { pos: [], neg: ['Süt bitmiş, istediğimi içemedim.'] },
  seat:    { pos: [], neg: ['Oturacak yer bulamadım.', 'İçerisi çok kalabalık, yer yoktu.'] },
  dirty:   { pos: [], neg: ['Masalar kirliydi, toplayan yoktu.', 'Her yerde boş bardak vardı.'] },
  food:    { pos: ['Kruvasanı efsane!', 'Kahvenin yanındaki kruvasan çok tazeydi.'], neg: [] },
  art:     { pos: ['Fincandaki latte art sanat eseri gibiydi!', 'Köpükteki kalp çok tatlıydı.'], neg: ['Latte art biraz dağılmıştı ama olsun.'] },
  taste:   { pos: ['{d} tam kıvamındaydı, şekeri ayarında.', '{d} hayatımda içtiğim en iyisiydi.'], neg: ['{d} benim damak tadıma göre değildi.'] },
  roast:   { pos: ['Taze kavrulmuş çekirdeğin farkı belli, kavrum tam kıvamında.'], neg: ['Kavrum profili bana göre değildi.'] },
  terrace: { pos: ['Terasta oturmak çok keyifliydi.', 'Güneşte kahve, daha ne olsun!'], neg: [] },
  cozy:    { pos: ['Yağmurlu havada sıcacık bir köşe, harika.', 'Dışarısı soğuktu, içerisi çok sıcacıktı.'], neg: [] },
  pevent:  { pos: ['Bugünkü etkinlik çok keyifliydi!', 'Böyle etkinlikleri daha sık yapın.'], neg: [] },
  vip:     { pos: ['VIP muamelesi gördüm, hızlı ve kusursuzdu.', 'Siparişim anında hazırdı, çok profesyonel.'], neg: ['Siparişim çok gecikti, daha hızlı olmalıydı.'] },
  angry:   ['Sipariş bile veremedim, çok bekledim!', 'Sıra hiç ilerlemedi, çıkıp gittim.', 'Kimse ilgilenmedi, bir daha gelmem.'],
  nostock: ['Kahvecide kahve bitmiş, inanılmaz!', 'Çekirdek kalmamış dediler. Ciddi misiniz?'],
  refused: ['Fiyatları görünce vazgeçtim.', 'Bir kahveye bu para çok fazla.'],
  outage:  ['Elektrik kesikti, kahve alamadım.'],
};

// ---- mevsimler ve hava durumu ----
export const SEASONS = [
  { id: 'ilkbahar', name: 'İlkbahar', icon: '🌸', weather: { gunes: .45, bulut: .3, yagmur: .25 } },
  { id: 'yaz',      name: 'Yaz',      icon: '🌞', weather: { gunes: .45, sicak: .4, bulut: .1, yagmur: .05 } },
  { id: 'sonbahar', name: 'Sonbahar', icon: '🍂', weather: { gunes: .25, bulut: .35, yagmur: .4 } },
  { id: 'kis',      name: 'Kış',      icon: '⛄', weather: { gunes: .2, bulut: .3, yagmur: .2, kar: .3 } },
];
export const SEASON_DAYS = 7;
// pass: yaya çarpanı, sit: oturma eğilimi, dur: oturma süresi, temp: -1 soğuk/+1 sıcak (içecek talebi), sun: güneş ışığı
export const WEATHER = {
  gunes:  { name: 'Güneşli', icon: '☀️', pass: 1,   sit: 0,   dur: 1,   temp: 0,    sun: 1 },
  bulut:  { name: 'Bulutlu', icon: '⛅', pass: .95, sit: .05, dur: 1.1, temp: 0,    sun: .6 },
  yagmur: { name: 'Yağmurlu', icon: '🌧️', pass: .6, sit: .25, dur: 1.4, temp: -1,   sun: .35, precip: 'rain' },
  kar:    { name: 'Karlı', icon: '❄️',   pass: .5,  sit: .3,  dur: 1.5, temp: -1.5, sun: .5,  precip: 'snow' },
  sicak:  { name: 'Çok sıcak', icon: '🔥', pass: .9, sit: 0,  dur: 1,   temp: 1.5,  sun: 1.15 },
};

// ---- rastgele olaylar (sabah duyurulur) ----
export const EVENTS = {
  influencer: { name: 'Influencer ziyareti', icon: '📸', desc: 'Ünlü bir yemek influencerı bugün mahallede! Gelirse onu iyi ağırla: memnun kalırsa puanın fırlar, kalmazsa yerle bir olur.' },
  mac:        { name: 'Maç günü', icon: '⚽', desc: 'Akşam derbi var. 17–19 arası cadde kalabalık, 19’dan sonra herkes evde.' },
  denetim:    { name: 'Sağlık denetimi', icon: '🧾', desc: 'Bugün bir ara belediye denetçisi gelecek. Kirli masa görürse ceza keser!' },
  elektrik:   { name: 'Elektrik kesintisi', icon: '⚡', desc: '14:00–15:30 arası planlı kesinti var. Makineler çalışmayacak.' },
  festival:   { name: 'Sokak festivali', icon: '🎪', desc: 'Caddede festival var! Bütün gün kalabalık, turistler bol.' },
};

// ---- senin düzenlediğin etkinlikler ----
export const PEVENTS = {
  akustik: { name: 'Akustik müzik gecesi', icon: '🎸', cost: 800, from: 19, to: 22, pass: 1.6, sit: .2, atm: 6, types: { ogrenci: 1.6, turist: 1.6 }, desc: 'Akşam müzisyen çalar, cadde dolar.' },
  tadim:   { name: 'Kahve tadım atölyesi', icon: '🧪', cost: 600, from: 14, to: 16, pass: 1.1, types: { tutkun: 5 }, review: .25, desc: 'Kahve tutkunları akın eder, bolca yorum yazarlar.' },
  mutlu:   { name: 'Mutlu saat', icon: '🎉', cost: 0, from: 15, to: 17, pass: 1.2, enter: 1.6, discount: .3, desc: 'Bütün içecekler %30 indirimli.' },
  kitap:   { name: 'Kitap kulübü', icon: '📚', cost: 400, from: 10, to: 12, pass: 1.1, sit: .3, types: { emekli: 2.5, ogrenci: 2 }, desc: 'Emekliler ve öğrenciler gelir, uzun oturur.' },
};

// ---- personel özellikleri ----
export const TRAITS = {
  latte:     { name: 'Latte art ustası', icon: '🎨', role: 'barista', desc: 'Latte art mini oyununda hedef alan geniş' },
  hizli:     { name: 'Hızlı eller', icon: '⚡', role: 'barista', desc: 'Sütsüz içecekleri %15 hızlı yapar' },
  guler:     { name: 'Güler yüzlü', icon: '😊', role: 'barista', desc: 'Müşteri memnuniyeti ve bahşiş artar' },
  dayanikli: { name: 'Dayanıklı', icon: '💪', role: 'any', desc: 'Daha geç yorulur' },
  titiz:     { name: 'Titiz', icon: '✨', role: 'komi', desc: 'Masaları iki kat hızlı toplar' },
};

// ---- dekorasyon ----
export const WALL_COLORS = {
  krem: { name: 'Krem', c: 0xf4f0ea }, adacayi: { name: 'Adaçayı', c: 0xdde6d5 }, terrakota: { name: 'Terrakota', c: 0xe6c3a5 },
  pudra: { name: 'Pudra', c: 0xf1d9d6 }, lacivert: { name: 'Lacivert', c: 0x3e5070 }, antrasit: { name: 'Antrasit', c: 0x4b4b4f },
};
export const WALL_COST = 300, FLOOR_COST = 800;
export const FLOORS = { mese: 'Meşe parke', ceviz: 'Ceviz parke', balik: 'Balıksırtı', terrazzo: 'Terrazzo', karo: 'Yeşil karo', beton: 'Beton' };
export const WALL_DECOR = {
  tablo:  { name: 'Soyut tablo', icon: '🖼️', amb: 2, cost: 400 },
  neon:   { name: 'Neon yazı', icon: '💡', amb: 3, cost: 900 },
  ayna:   { name: 'Yuvarlak ayna', icon: '🪞', amb: 2, cost: 500 },
  raf:    { name: 'Sarmaşıklı raf', icon: '🌿', amb: 3, cost: 600 },
  saat:   { name: 'Duvar saati', icon: '🕰️', amb: 1, cost: 250 },
  harita: { name: 'Kahve haritası', icon: '🗺️', amb: 2, cost: 450 },
};
export const BRAND_COLORS = { yesil: '#1f4f3e', lacivert: '#24365e', bordo: '#6b1f2e', siyah: '#232323', turuncu: '#b8561c', mor: '#4b2e6b' };
export const BRAND_ICONS = ['☕', '🫘', '🌿', '🐈', '⭐', '🔥', '🌙', '🍂'];

// ---- müdavimler ----
export const REGULARS = {
  cinar: [
    { name: 'Necati Bey', emoji: '👴', type: 'emekli', fav: 'americano', hour: 8.25, story: 'Emekli edebiyat öğretmeni. Her sabah gazetesini okur, şiir sever.', look: { shirt: 0x6b5b4b, hair: 0xd6d6d6, acc: 'cap' } },
    { name: 'Kerem', emoji: '💼', type: 'ofis', fav: 'espresso', hour: 8.75, story: 'Plaza çalışanı. Her dakikası önemli, beklemekten nefret eder.', look: { shirt: 0xf0efe9, acc: 'tie' } },
    { name: 'Zeynep', emoji: '💻', type: 'ogrenci', fav: 'latte', hour: 10.5, story: 'Serbest çalışan tasarımcı. Laptopuyla saatlerce oturur.', look: { shirt: 0x8f5fc2, acc: 'backpack' } },
    { name: 'Barış', emoji: '🧐', type: 'tutkun', fav: 'v60', hour: 12.5, story: 'Kahve blogu yazıyor. Kaliteden asla ödün vermez.', look: { shirt: 0x2d4059, acc: 'glasses' } },
    { name: 'Ayla Hanım', emoji: '🌸', type: 'emekli', fav: 'latte', hour: 15, food: true, story: 'Emekli hemşire. Kruvasanı olmadan kahve içmez.', look: { shirt: 0xe07aa1, hair: 0xcfcfcf } },
    { name: 'Elif', emoji: '🎨', type: 'turist', fav: 'flatwhite', hour: 17, story: 'İllüstratör. Mekanın atmosferine çok önem verir.', look: { shirt: 0x3aa17e, acc: 'camera' } },
  ],
};
export const REGULAR_STORIES = {
  ofis: ['Yazılımcı. Kahvesiz kod yazamaz.', 'Banka müdürü. Sabah toplantısından önce mutlaka uğrar.', 'Avukat. Zamanı yok ama kaliteyi sever.'],
  ogrenci: ['Mimarlık öğrencisi. Projelerini burada çizer.', 'Tıp öğrencisi. Sınav haftası buradan çıkmaz.', 'Doktora öğrencisi. Tezini burada yazıyor.'],
  tutkun: ['Ev baristası. Senden tarif kapmaya çalışır.', 'Kahve podcasti var. Her yudumu not alır.'],
  emekli: ['Emekli kaptan. Denizden hikayeler anlatır.', 'Emekli öğretmen. Bulmaca çözmeye gelir.', 'Emekli terzi. Mahallenin bütün dedikodusunu bilir.'],
  turist: ['Gezgin fotoğrafçı. Mekanı Instagram\'da paylaşır.', 'Yemek yazarı. Şehrin en iyi kahvecilerini listeliyor.'],
};
export const REGULAR_EMOJI = { ofis: '💼', ogrenci: '📚', tutkun: '🧐', emekli: '👵', turist: '🗺️' };
export const REGULAR_FAV = { ofis: 'americano', ogrenci: 'latte', tutkun: 'v60', emekli: 'americano', turist: 'flatwhite' };
export const REGULAR_HOUR = { ofis: [8, 9.5], ogrenci: [10, 16], tutkun: [11, 15], emekli: [9, 16], turist: [11, 18] };

// ---- mahalle görevleri ----
// need: beans/milk/croissant/money/fresh (anlık) veya avgSat (gün sonunda otomatik kontrol)
export const QUESTS = [
  { id: 'cekirdek', neighbor: true, icon: '📦', text: n => `${n}, dükkanında satmak için 40 doz çekirdek istiyor.`, need: { beans: 40 }, reward: { beansMult: 1.8 }, days: 3 },
  { id: 'ikram', neighbor: true, icon: '☕', text: n => `${n}, müşterilerine ikram için 8 kahve istiyor.`, need: { beans: 8, milk: 4 }, reward: { money: 900, reviews: 2 }, days: 2 },
  { id: 'bank', from: 'Muhtar', icon: '🏛️', text: () => 'Parka yeni banklar için bağış istiyor. Caddeye daha çok insan gelir.', need: { money: 1500 }, reward: { civic: .08, reviews: 1 }, days: 4 },
  { id: 'kruvasan', from: 'İlkokul', icon: '🏫', text: () => 'Öğretmenler günü için 15 kruvasan sipariş verdi.', need: { croissant: 15 }, reward: { money: 1700 }, days: 3, requires: 'vitrin' },
  { id: 'gazete', from: 'Mahalle Gazetesi', icon: '📰', text: () => 'Röportaj yapmak istiyor: bugün ortalama memnuniyet en az 4.0 olsun.', need: { avgSat: 4 }, reward: { buzz: 2 }, days: 1, auto: true },
  { id: 'dernek', from: 'Kahve Derneği', icon: '🧪', text: () => 'Tadım için 30 doz taze kavrulmuş çekirdek istiyor.', need: { fresh: 30 }, reward: { money: 2500, reviews: 2 }, days: 4, requires: 'roaster' },
];

// ---- seviye (itibar) ve açılan özellikler ----
// unlocks: 'tab:x' alt sekme, 'seg:sayfa:bölüm', 'item:tür', ya da özellik adı
export const LEVELS = [
  { xp: 0, title: 'Mahalle kahvecisi', unlocks: [] },
  { xp: 35, title: 'Sevilen kahveci', unlocks: ['tab:staff', 'seg:shop:gelistir', 'item:sofa', 'item:lamp', 'item:shelf'] },
  { xp: 110, title: 'Mahallenin kahvecisi', unlocks: ['tab:hood', 'seg:more:cadde', 'item:vitrin', 'item:pikap', 'events', 'rush'] },
  { xp: 240, title: 'Caddenin yıldızı', unlocks: ['seg:hood:istek', 'seg:hood:etkinlik', 'seg:more:dekor', 'item:tree', 'vip'] },
  { xp: 420, title: 'Kahve ustası', unlocks: ['seg:hood:rakip', 'rival', 'item:roaster', 'terrace', 'item:umbrella', 'seg:shop:atolye'] },
  { xp: 680, title: 'Üçüncü dalga öncüsü', unlocks: ['sig'] },
  { xp: 1000, title: 'Şehrin konuştuğu', unlocks: [] },
  { xp: 1500, title: 'Kahve markası', unlocks: ['branches'] },
];
export const UNLOCK_NAMES = {
  'tab:staff': '👥 Ekip (personel işe alma)', 'tab:hood': '👋 Mahalle (müdavimler, yorumlar)', 'seg:shop:gelistir': '⬆️ Geliştirmeler',
  'seg:more:cadde': '🏠 Yan dükkanları kiralama', 'seg:hood:istek': '📬 Mahalle istekleri', 'seg:hood:etkinlik': '🎉 Etkinlik düzenleme',
  'seg:more:dekor': '🎨 Dekorasyon', 'seg:hood:rakip': '🏪 Rakip kahveci', 'seg:shop:atolye': '🧪 Tarif atölyesi', events: '🎲 Rastgele olaylar',
  rush: '🏃 Yoğun saat akınları', vip: '⭐ VIP siparişleri', rival: '🏪 Rakip kahveci', terrace: '⛱️ Teras', sig: '✨ İmza tarifler', branches: '🏙️ Yeni şubeler',
};
export const XP = { serve: 1, five: 2, daily: 12, quest: 10, vip: 10, rush: 15, regularQuest: 15 };

// ---- tarif atölyesi ----
export const BASES = {
  espresso: { name: 'Espresso bazlı', short: 'Espresso', icon: '☕', beans: 1, time: 3, base: 55, temp: 'hot' },
  coldbrew: { name: 'Cold brew bazlı', short: 'Cold brew', icon: '🧊', beans: 2, time: 2.5, base: 90, temp: 'cold' },
  filtre: { name: 'Filtre bazlı', short: 'Filtre', icon: '⏳', beans: 2, time: 6, base: 100, temp: 'hot' },
};
export const MILKS = {
  yok: { name: 'Sütsüz', milk: 0, add: 0, extra: 0, likes: {} },
  sut: { name: 'Süt', milk: 1, add: 15, extra: 0, likes: { ogrenci: 1, emekli: .5 } },
  yulaf: { name: 'Yulaf sütü', milk: 1, add: 25, extra: 6, likes: { turist: 1.2, ogrenci: .8 } },
};
export const FLAVORS = {
  sade: { name: 'Sade', icon: '☕', extra: 0, add: 0, likes: { tutkun: 2.5, ofis: 1 } },
  karamel: { name: 'Karamel', icon: '🍮', extra: 4, add: 15, likes: { ogrenci: 2, turist: 1.5 } },
  findik: { name: 'Fındık', icon: '🌰', extra: 5, add: 15, likes: { ofis: 1.5, ogrenci: 1.5 } },
  tarcin: { name: 'Tarçın', icon: '🍂', extra: 3, add: 12, likes: { emekli: 2, turist: 1 } },
  lavanta: { name: 'Lavanta', icon: '💜', extra: 6, add: 20, likes: { turist: 2.5, tutkun: .5 } },
  tahin: { name: 'Tahin & pekmez', icon: '🥜', extra: 7, add: 20, likes: { ogrenci: 2, emekli: 1.5 } },
  lokum: { name: 'Gül lokumu', icon: '🌹', extra: 8, add: 22, likes: { turist: 3, ogrenci: 1 } },
};
export const CUSTOM_COST = 2500, MAX_CUSTOM = 3;

// ---- VIP müşteriler ----
export const VIPS = [
  { name: 'Yazar Orhan Bey', type: 'tutkun', look: { shirt: 0x3b2f2f, hair: 0xcfcfcf, acc: 'glasses' } },
  { name: 'Şef Deniz', type: 'tutkun', look: { shirt: 0xf3f1ea, hair: 0x2b1d14, acc: 'apron' } },
  { name: 'Oyuncu Ece Su', type: 'turist', look: { shirt: 0xff7eb6, hair: 0xd9c08a, sunglasses: true } },
  { name: 'Futbolcu Kaan', type: 'ofis', look: { shirt: 0xc0392b, hair: 0x111111, acc: 'cap', capColor: 0xc0392b } },
];

// ---- müdavim replikleri (sadakate göre) ----
export const LINES = {
  ofis: { low: ['Acelem var, çabuk olsun lütfen.', 'Umarım bugün sıra yoktur.'], mid: ['Günaydın! Her zamankinden.', 'Toplantıdan önce sana uğramadan olmaz.'], high: ['Ofiste herkese seni anlatıyorum!', 'Senin kahven olmadan güne başlayamıyorum.'] },
  ogrenci: { low: ['Burada çalışabilir miyim acaba?', 'Fiyatlar biraz yüksek ama bakalım.'], mid: ['Bugün de tez yazacağım, yerim hazır mı?', 'Selam! Latte lütfen.'], high: ['Burası benim ikinci evim oldu!', 'Arkadaşlarımı da getiriyorum artık.'] },
  tutkun: { low: ['Bakalım çekirdekler ne durumda.', 'Ekstraksiyon süren kaç saniye?'], mid: ['Bugün hangi çekirdek var?', 'Geçen seferki fena değildi.'], high: ['Şehrin en iyi kahvesi burada, yazdım bunu!', 'Kavrumuna bayılıyorum.'] },
  emekli: { low: ['Hmm, bakalım bugün kahve nasıl.', 'Eskiden kahve böyle değildi evladım.'], mid: ['Günaydın evladım, her zamankinden.', 'Gazetemi okumaya geldim.'], high: ['Senin kahven olmadan güne başlayamıyorum!', 'Mahallenin en tatlı köşesi burası.'] },
  turist: { low: ['Hello! Nice place, mekan güzelmiş.', 'Fotoğraf çekebilir miyim?'], mid: ['Yine geldim, burası çok şirin!', 'Bugün ne önerirsin?'], high: ['Seni bütün takipçilerime anlattım!', 'Şehirdeki favori kahvecim burası.'] },
  rain: ['Bu yağmurda en iyi yer burası.', 'Şemsiyemi kapıya bırakıyorum.'],
  snow: ['Kar yağıyor, sıcacık bir şey lazım!', 'Dışarısı buz gibi!'],
  hot: ['Çok sıcak, soğuk bir şey içmem lazım!', 'Bu sıcakta cold brew iyi gider.'],
};
// müdavimlerin küçük hikaye görevleri (sadakat 60'ı geçince açılır)
export const REG_QUESTS = {
  ofis: { text: 'Sabahları çok bekliyor: espresso makinesini 3. seviyeye çıkar.', check: 'machine3', thanks: 'Artık kahvem 2 dakikada hazır, harikasın!' },
  ogrenci: { text: 'Rahat çalışmak için koltuk istiyor: dükkana bir koltuk koy.', check: 'sofa', thanks: 'Bu koltukta tezimi bitireceğim, teşekkürler!' },
  tutkun: { text: 'Daha iyi çekirdek istiyor: Etiyopya ya da daha kaliteli bir çekirdek kullan.', check: 'bean4', thanks: 'İşte bu! Çiçeksi notalar mükemmel.' },
  emekli: { text: 'Kahvesinin yanında bir şey istiyor: vitrinde kruvasan olsun.', check: 'croissant', thanks: 'Kruvasanla kahve, tam istediğim gibi evladım.' },
  turist: { text: 'Fotoğraf için güzel bir köşe istiyor: duvara bir dekor as.', check: 'walldecor', thanks: 'Bu duvar çok fotojenik oldu, paylaştım bile!' },
};
