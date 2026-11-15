// Country names and the languages searched for each. Any ISO 3166-1 alpha-2 code works;
// codes outside this table fall back to the English name and English only.
export const PRECOMPUTED = "UA RU IL IR MD GE FI US PS RS AM AZ BY VE SE NO DK EE LV LT PL DE FR IT ES NL GB IE CA RO HU CZ SK CN TW JP KR IN SG".split(" ");
const LANGS = {
  FI: ["fi", "sv"], SE: ["sv"], NO: ["no"], DK: ["da"], EE: ["et", "ru"], LV: ["lv", "ru"], LT: ["lt", "ru"],
  PL: ["pl"], DE: ["de"], FR: ["fr"], IT: ["it"], ES: ["es"], NL: ["nl"], GB: [], IE: [], US: [], CA: ["fr"],
  UA: ["uk", "ru"], MD: ["ro", "ru"], GE: ["ka", "ru"], RO: ["ro"], HU: ["hu"], CZ: ["cs"], SK: ["sk"],
  CN: ["zh"], TW: ["zh"], JP: ["ja"], KR: ["ko"], IN: ["hi"], SG: ["zh"],
  RU: ["ru"], IR: ["fa"], IL: ["he", "ar"], PS: ["ar"], RS: ["sr"], AM: ["hy", "ru"], AZ: ["az", "ru"], BY: ["be", "ru"], VE: ["es"],
};
const LOCAL = {
  FI: "Suomi", SE: "Sverige", NO: "Norge", DK: "Danmark", EE: "Eesti", LV: "Latvija", LT: "Lietuva", PL: "Polska",
  DE: "Deutschland", FR: "France", IT: "Italia", ES: "España", NL: "Nederland", UA: "Україна", MD: "Moldova",
  GE: "საქართველო", RO: "România", HU: "Magyarország", CZ: "Česko", SK: "Slovensko", CN: "中国", TW: "台灣",
  JP: "日本", KR: "대한민국", IN: "भारत", RU: "Россия", IR: "ایران", IL: "ישראל", PS: "فلسطين", RS: "Србија", AM: "Հայաստան", AZ: "Azərbaycan", BY: "Беларусь",
};
const DEMONYM = {
  FI: "Finnish|Finn|suom|Helsin", SE: "Swedish|Swede|svensk|Stockholm", NO: "Norwegian|norsk|Oslo", DK: "Danish|Dane|dansk|Copenhagen|København",
  EE: "Estonian|eesti|Tallinn", LV: "Latvian|latvieš|Riga|Rīga", LT: "Lithuanian|lietuv|Vilni", PL: "Polish|Pole|polsk|Warsaw|Warszaw",
  DE: "German|deutsch|Berlin|Bundes", FR: "French|français|Paris|Macron", IT: "Italian|italian|Rome|Roma|Meloni", ES: "Spanish|español|Madrid|Sánchez",
  NL: "Dutch|Netherlands|Nederland|Amsterdam|The Hague", GB: "British|Britain|UK\\b|London|Starmer", IE: "Irish|Dublin", US: "American|U\\.S\\.|\\bUS\\b|Washington|Trump|White House|Congress",
  CA: "Canadian|Ottawa|Carney", UA: "Ukrain|Kyiv|Kiev|Zelensk", MD: "Moldov|Chișinău|Chisinau|Transnistr", GE: "Georgian|Tbilisi",
  RO: "Romanian|român|Bucharest", HU: "Hungarian|magyar|Budapest|Orbán|Orban", CZ: "Czech|česk|Prague|Praha", SK: "Slovak|sloven|Bratislava|Fico",
  CN: "Chinese|Beijing|Xi Jinping|中国", TW: "Taiwan|Taipei|台灣|台湾", JP: "Japanese|Tokyo|日本", KR: "Korean|Seoul|한국",
  IN: "Indian|India|New Delhi|Modi|भारत", SG: "Singapore",
  RU: "Russian|Moscow|Kremlin|Putin|Росси|Москв", IR: "Iranian|Tehran|Khamenei|ایران", IL: "Israeli|Jerusalem|Tel Aviv|Netanyahu|IDF|ישראל", PS: "Palestin|Gaza|West Bank|Hamas|فلسطين|غزة",
  RS: "Serbian|Belgrade|Vučić|Vucic|Srbij|Србиј", AM: "Armenian|Yerevan|Pashinyan|Հայ", AZ: "Azerbaijani|Baku|Aliyev|Azərbaycan", BY: "Belarus|Minsk|Lukashenko|Беларус", VE: "Venezuel|Caracas|Maduro",
};
const names = new Intl.DisplayNames(["en"], { type: "region" });
export function country(code) {
  const cc = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  let name;
  try {
    name = names.of(cc);
  } catch {
    return null;
  }
  if (!name || name === cc) return null;
  const terms = [name, LOCAL[cc], DEMONYM[cc]].filter(Boolean).map((t) => t.replace(/[.*+?^${}()[\]\\]/g, (m) => (t === DEMONYM[cc] ? m : "\\" + m))).join("|");
  return { code: cc, name, local: LOCAL[cc] || null, langs: LANGS[cc] || [], about: new RegExp(terms, "i") };
}
