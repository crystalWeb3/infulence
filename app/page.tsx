import WorldMap from "./components/WorldMap";

import Link from "next/link";

export default function HomePage() {
  const countries = [
    { name: "United States", color: "#3C3B6E" },
    { name: "United Kingdom", color: "#CF142B" },
    { name: "Germany", color: "#0055A4" },
    { name: "France", color: "#000000" },
    { name: "Russia", color: "#3F6DB3" },
    { name: "China", color: "#DE2910" },
  ];
  return (
    <>
      <main className="relative z-10 max-w-screen-xl mx-auto p-4 w-full h-full">
        <div className="w-[400px] bg-[#f0f0f0] p-4 rounded-lg shadow-lg absolute left-[50%] translate-x-[-50%] bottom-[30px] z-10">
          <h1 className="text-center color-black] shadow-sm mb-3">
            Influence of Major World Powers ( 1965–2023 )
          </h1>
          <div className="grid grid-cols-2 gap-2">
            {countries.map((country) => (
              <div
                key={country.name}
                className="flex items-center border-[1px] rounded-lg"
              >
                <div
                  className="w-6 h-6 mr-2"
                  style={{ backgroundColor: country.color }}
                ></div>
                <span>{country.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[200px] bg-[#a0a0a0] p-4 rounded-lg shadow-lg absolute left-[5%] bottom-[5%] translate-x-[-50%] bottom-[30px] z-10">
          <Link href={"/network2"}>
            <div className="text-center bg-[#f0f0f0] rounded-lg mb-2">
              All World's Network
            </div>
          </Link>

          <Link href={"/chord"}>
            <div className="text-center bg-[#f0f0f0] rounded-lg mb-2">
              Chords
            </div>
          </Link>

          <Link href={"/chord/v2"}>
            <div className="text-center bg-[#f0f0f0] rounded-lg mb-2">
              Chord (Version 2)
            </div>
          </Link>

          <Link href={"/network"}>
            <div className="text-center bg-[#f0f0f0] rounded-lg mb-2">
              Power 6
            </div>
          </Link>
        </div>
        <WorldMap />
      </main>
    </>
  );
}
