import { CRITERIA, countries } from "./data/countries.js";

let liveCountries = structuredClone(countries);
let lastUpdated = new Date().toISOString();

export function scoreCountry(country) {
  const score = CRITERIA.reduce((total, { key, weight }) => total + country.metrics[key] * weight / 100, 0);
  const dominant = ["military", "gdp", "industry", "trade", "energy"].reduce((best, key) =>
    country.metrics[key] > country.metrics[best] ? key : best, "military");
  return { ...country, score: Number(score.toFixed(1)), dominant };
}

export function getRankings() {
  return liveCountries.map(scoreCountry).sort((a, b) => b.score - a.score).map((country, index) => ({ ...country, rank: index + 1 }));
}

const normalize = (value, peak) => Math.max(0, Math.min(100, (Number(value || 0) / peak) * 100));

async function worldBankIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000&date=2023:2025`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`World Bank ${indicator} returned ${response.status}`);
  const [, rows] = await response.json();
  return (rows || []).reduce((acc, row) => {
    if (row.value != null && !acc[row.countryiso3code]) acc[row.countryiso3code] = row.value;
    return acc;
  }, {});
}

export async function refreshRankings() {
  try {
    const [gdp, trade, industry, energy] = await Promise.all([
      worldBankIndicator("NY.GDP.MKTP.CD"),
      worldBankIndicator("NE.TRD.GNFS.CD"),
      worldBankIndicator("NV.IND.TOTL.CD"),
      worldBankIndicator("EG.ELC.PROD.KH")
    ]);
    const byCode = new Map(liveCountries.map(c => [c.code, c]));
    // World Bank reports ISO-3 codes; map the subset represented in the HPI baseline.
    const iso3 = { US:"USA", CN:"CHN", RU:"RUS", IN:"IND", GB:"GBR", FR:"FRA", JP:"JPN", DE:"DEU", KR:"KOR", TR:"TUR", IT:"ITA", BR:"BRA", CA:"CAN", AU:"AUS", IL:"ISR", SA:"SAU", IR:"IRN", ES:"ESP", ID:"IDN", MX:"MEX", PL:"POL", NL:"NLD", PK:"PAK", TW:"", VN:"VNM", AE:"ARE", EG:"EGY", TH:"THA", SE:"SWE", SG:"SGP", NO:"NOR", AR:"ARG", UA:"UKR", MY:"MYS", ZA:"ZAF", NG:"NGA", BE:"BEL", CH:"CHE", DK:"DNK", FI:"FIN", AT:"AUT", PH:"PHL", BD:"BGD", CO:"COL", CL:"CHL", DZ:"DZA", IQ:"IRQ", KZ:"KAZ", QA:"QAT", NZ:"NZL" };
    const peaks = { gdp: 28e12, trade: 12e12, industry: 5e12, energy: 4e12 };
    for (const [code, iso] of Object.entries(iso3)) {
      const country = byCode.get(code);
      if (!country || !iso) continue;
      if (gdp[iso]) country.metrics.gdp = normalize(gdp[iso], peaks.gdp);
      if (trade[iso]) country.metrics.trade = normalize(trade[iso], peaks.trade);
      if (industry[iso]) country.metrics.industry = normalize(industry[iso], peaks.industry);
      if (energy[iso]) country.metrics.energy = normalize(energy[iso], peaks.energy);
    }
    lastUpdated = new Date().toISOString();
    return { ok: true, source: "World Bank" };
  } catch (error) {
    console.warn("Ranking refresh retained baseline:", error.message);
    return { ok: false, error: error.message };
  }
}

export const getLastUpdated = () => lastUpdated;
