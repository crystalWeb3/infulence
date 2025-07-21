"use client";

import InfluenceNetworkForceParent from "../../components/InfluenceNetworkForceParent";
import influenceDataRaw from "@/data/influence2.json";

import {
  getTopCountries,
  getNatoCountries,
  getBricsCountries,
  getCountriesByContinent,
  getAllCountries,
} from "@/utils/getTopCountries";
import {
  getContinentByCountry,
  getCountryGroup,
} from "@/utils/getCountryGroup";
import Select from "react-select";
import type { MultiValue } from "react-select";

import { useMemo, useState } from "react";
import Link from "next/link";
import { scaleQuantile } from "d3-scale";

const MAX_DISPLAY = 2; // Show only first 2 selected

const VISIBLE_LIMIT_OPTIONS = [
  { value: "over_0.1", label: "Over 0.1" },
  { value: "over_0.2", label: "Over 0.2" },
  { value: "over_0.15", label: "Over 0.15" },
  { value: "over_0.25", label: "Over 0.25" },
  { value: "over_0.3", label: "Over 0.3" },
  { value: "over_0.35", label: "Over 0.35" },
  { value: "below_0.02", label: "Below 0.02 (very low)" },
  { value: "0.02_0.1", label: "0.02-0.1 (low)" },
  { value: "0.1_0.25", label: "0.1-0.25 (moderate)" },
  { value: "0.25_0.5", label: "0.25-0.5 (high)" },
  { value: "0.5_up", label: "0.5 and above (very high)" },
];

export default function InfluenceNetworkPageWebGL() {
  const [type, setType] = useState("all");
  const [year, setYear] = useState("2023");
  const [topNum, setTopNum] = useState("200");
  const [colorStyle] = useState("gradient");
  const [showCountryFilters, setShowCountryFilters] = useState(false);
  const [net, setNet] = useState("net");
  const [visibleLimit, setVisibleLimit] = useState(
    VISIBLE_LIMIT_OPTIONS[0].value
  );

  const [countryA, setCountryA] = useState<
    MultiValue<{ label: string; value: string }>
  >([]); // Influencer
  const [countryB, setCountryB] = useState<
    MultiValue<{ label: string; value: string }>
  >([]); // Receiver

  const influenceData = influenceDataRaw as any[];

  let allcountries = getAllCountries(Number(year));

  const countryOptions = allcountries.map((d) => ({
    label: d.name,
    value: d.name,
  }));

  const { nodes, links } = useMemo(() => {
    // 1. Direction-agnostic keys
    let influencerField = "a_first";
    let receiverField = "a_second";
    let b = "a_";
    if (net === "btoa") {
      influencerField = "a_second";
      receiverField = "a_first";
      b = "b_";
    } else if (net === "net") {
      b = "c_";
    }
    const yearkey = b + year;

    // 2. Group/type selection
    let countries = [];
    if (type === "all") {
      countries = getAllCountries(Number(year));
    } else if (type === "top") {
      countries = getTopCountries(Number(year), Number(topNum));
    } else if (type === "nato") {
      countries = getNatoCountries(Number(year));
    } else if (type === "brics") {
      countries = getBricsCountries(Number(year));
    } else {
      countries = getCountriesByContinent(Number(year), type);
    }
    const countriesNames = countries.map((d) => d.name);
    const influenceMap = new Map(countries.map((d) => [d.name, d.value]));

    // 3. Build selected country sets
    const selectedA = countryA.length ? countryA.map((c) => c.value) : null;
    const selectedB = countryB.length ? countryB.map((c) => c.value) : null;

    // 4. Main filter (directionally correct everywhere)
    const filteredData = influenceData.filter((d: any) => {
      // Only include if BOTH ends are in group/type
      if (
        !countriesNames.includes(d[influencerField]) ||
        !countriesNames.includes(d[receiverField])
      ) {
        return false;
      }
      if (selectedA && selectedB) {
        return (
          selectedA.includes(d[influencerField]) &&
          selectedB.includes(d[receiverField])
        );
      }
      if (selectedA) {
        return selectedA.includes(d[influencerField]);
      }
      if (selectedB) {
        return selectedB.includes(d[receiverField]);
      }
      return true;
    });

    // 5. Build nodes from filtered links (directionally correct)
    const nodeSet = new Set<string>();
    filteredData.forEach((d: any) => {
      nodeSet.add(d[influencerField]);
      nodeSet.add(d[receiverField]);
    });

    const nodes = Array.from(nodeSet).map((id) => ({
      id,
      value: influenceMap.get(id) ?? 1,
      group: getCountryGroup(id),
      continent: getContinentByCountry(id) || "Other",
    }));

    // 6. Color logic (unchanged)
    const allValues = influenceData
      .map((d: any) => d[yearkey])
      .filter((v) => typeof v === "number" && !isNaN(v));

    const baseColors = [
      "#9f9faf20",
      "#03adfc30",
      "#03adfc90",
      "#ff0000",
      "#ff0000",
      "#ff0000",
    ];
    const solidbaseColors = [
      "#03adfc20",
      "#03adfc60",
      "#03adfc90",
      "#03adfc95",
      "#03adfc98",
      "#03adfc",
    ];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const colorQuantile = scaleQuantile<string>()
      .domain([minValue, maxValue])
      .range(baseColors);

    const colorQuantileBySolid = scaleQuantile<string>()
      .domain([minValue, maxValue])
      .range(solidbaseColors);

    function getColorByInfluence(val: number): string {
      return colorQuantile(val);
    }
    function getColorBySolid(val: number): string {
      return colorQuantileBySolid(val);
    }

    interface PassVisibleLimitFn {
      (val: number): boolean;
    }

    interface VisibleLimitOptions {
      value: string;
      label: string;
    }

    const passVisibleLimit: PassVisibleLimitFn = (val: number): boolean => {
      switch (visibleLimit) {
        case "over_0.1":
          return val > 0.1;
        case "over_0.2":
          return val > 0.2;
        case "over_0.15":
          return val > 0.15;
        case "over_0.25":
          return val > 0.25;
        case "over_0.3":
          return val > 0.3;
        case "over_0.35":
          return val > 0.35;
        case "below_0.02":
          return val < 0.02 && val > 0;
        case "0.02_0.1":
          return val >= 0.02 && val < 0.1;
        case "0.1_0.25":
          return val >= 0.1 && val < 0.25;
        case "0.25_0.5":
          return val >= 0.25 && val < 0.5;
        case "0.5_up":
          return val >= 0.5;
        default:
          return true;
      }
    };

    const rawLinks = filteredData.filter((d: any) => {
      const val = d[yearkey];
      return typeof val === "number" && passVisibleLimit(val);
    });

    const links = rawLinks.map((d: any) => {
      const val = d[yearkey];
      let baseColor = "#c4c4c4";
      if (colorStyle === "continent") {
        const continent1 = getContinentByCountry(d[influencerField]);
        switch (continent1) {
          case "Asia":
            baseColor = "#00A86B";
            break;
          case "Europe":
            baseColor = "#AA2910";
            break;
          case "Africa":
            baseColor = "#4be0ea";
            break;
          case "NorthAmerica":
            baseColor = "#3C3B6E";
            break;
          case "SouthAmerica":
            baseColor = "#009739";
            break;
          case "Oceania":
            baseColor = "#c4c4c4";
            break;
          default:
            baseColor = "#c4c4c4";
        }
      } else if (colorStyle === "influence") {
        baseColor = getColorByInfluence(val);
      } else if (colorStyle === "solid") {
        baseColor = getColorBySolid(val);
      }
      return {
        source: d[influencerField],
        target: d[receiverField],
        value: val,
        color: baseColor,
        group:
          getCountryGroup(d[influencerField]) ===
          getCountryGroup(d[receiverField])
            ? getCountryGroup(d[influencerField])
            : "Mixed",
      };
    });

    const connectedNodeIds = new Set(
      links.flatMap((link) => [link.source, link.target])
    );
    const filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));

    return { nodes: filteredNodes, links };
  }, [year, countryA, countryB, topNum, type, visibleLimit, net, colorStyle]);

  return (
    <main>
      <div className="w-full flex flex-col gap-1 p-1 bg-[#a0a0a0] rounded-lg shadow-lg absolute left-0 z-10">
        {/* First Row: Settings, now left-aligned */}
        <div className="flex flex-wrap gap-1 items-center justify-start w-full">
          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setYear(e.target.value)}
            value={year}
          >
            <option value="2023">2023</option>
            <option value="2010">2010</option>
            <option value="1995">1995</option>
            <option value="1980">1980</option>
            <option value="1965">1965</option>
          </select>
          {type === "top" && (
            <select
              className="p-2 rounded border border-gray-500"
              onChange={(e) => setTopNum(e.target.value)}
              value={topNum}
            >
              <option value="200">200</option>
              <option value="100">100</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="25">25</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
          )}
          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setType(e.target.value)}
            value={type}
          >
            <option value="all">All Countries</option>
            <option value="top">Top Countries</option>
            <option value="nato">Nato</option>
            <option value="brics">BRICS</option>
            <option value="NorthAmerica">North America</option>
            <option value="SouthAmerica">South America</option>
            <option value="Asia">Asia</option>
            <option value="Europe">Europe</option>
            <option value="Africa">Africa</option>
            <option value="Oceania">Oceania</option>
          </select>
          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setNet(e.target.value)}
            value={net}
          >
            <option value="net">Net influence</option>
            <option value="atob">Directed Dyadic Influence</option>
            {/* <option value="btoa">Directed Dyadic Influence B</option> */}
          </select>
          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setVisibleLimit(e.target.value)}
            value={visibleLimit}
          >
            {VISIBLE_LIMIT_OPTIONS.map((opt) => (
              <option value={opt.value} key={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="text-center bg-[#f47272] text-white p-2 rounded-lg cursor-pointer"
            onClick={() => setShowCountryFilters((prev) => !prev)}
          >
            {showCountryFilters
              ? "Hide Country Filters"
              : "Show Country Filters"}
          </button>
          <Link href="/">
            <span className="text-center bg-[#f0f0f0] p-2 rounded-lg cursor-pointer">
              Back to Home
            </span>
          </Link>
        </div>

        {showCountryFilters && (
          <div className="grid grid-cols-2 gap-1 w-full mt-1">
            <div>
              <Select
                options={countryOptions}
                value={countryA}
                onChange={setCountryA}
                isMulti
                placeholder="Influencer(s)"
                className="w-full"
                isClearable
              />
            </div>
            <div>
              <Select
                options={countryOptions}
                value={countryB}
                onChange={setCountryB}
                isMulti
                placeholder="Receiver(s)"
                className="w-full"
                isClearable
              />
            </div>
          </div>
        )}
      </div>

      <div className="relative w-full h-screen">
        <InfluenceNetworkForceParent
          allview={type}
          nodes={nodes}
          links={links}
        />
      </div>
    </main>
  );
}
