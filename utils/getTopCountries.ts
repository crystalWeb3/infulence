import totalData from "@/data/total.json";
import { getContinentCountries } from "./getCountryGroup";
import { NATO, BRICS } from "./groups";

type CountryData = {
  country: string;
  [yearKey: string]: string | number;
};

export function getTopCountries(
  year: number,
  topN: number = 30
): { name: string; value: number }[] {
  const key = `y_${year}`;

  const validData = (totalData as CountryData[]).filter(
    (d) => d[key] !== undefined
  );

  const sorted = validData.sort((a, b) => {
    const aVal = a[key] as number;
    const bVal = b[key] as number;
    return bVal - aVal;
  });

  return sorted.slice(0, topN).map((d) => ({
    name: d.country,
    value: d[key] as number,
  }));
}

export function getNatoCountries(
  year: number
): { name: string; value: number }[] {
  const key = `y_${year}`;

  const validData = (totalData as CountryData[]).filter(
    (d) => d[key] !== undefined
  );

  const natos = validData.filter((d: any) => {
    return NATO.includes(d.country);
  });

  return natos.map((d) => ({
    name: d.country,
    value: d[key] as number,
  }));
}


export function getBricsCountries(
  year: number
): { name: string; value: number }[] {
  const key = `y_${year}`;

  const validData = (totalData as CountryData[]).filter(
    (d) => d[key] !== undefined
  );

  const brics = validData.filter((d: any) => BRICS.includes(d.country));

  console.log(brics)

  return brics.map((d) => ({
    name: d.country,
    value: d[key] as number,
  }));
}


export function getCountriesByContinent(
  year: number,
  continent: string
): { name: string; value: number }[] {
  const key = `y_${year}`;

  const validData = (totalData as CountryData[]).filter(
    (d) => d[key] !== undefined
  );

  const continentCountries = getContinentCountries(continent);

  const filtered = validData.filter((d: any) =>
    continentCountries.includes(d.country)
  );

  return filtered.map((d) => ({
    name: d.country,
    value: d[key] as number,
  }));
}

