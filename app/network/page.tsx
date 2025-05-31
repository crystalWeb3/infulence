"use client";
import dynamic from "next/dynamic";
import data from "@/data/influence.json";
import Link from "next/link";

// Dynamically import to avoid SSR issues with D3
const NetworkGraph = dynamic(() => import("../components/NetworkGraph"), {
  ssr: false,
});

export default function GraphPage() {
  return (
    <div className="p-6">
      <NetworkGraph data={data} />

      <div className="flex justify-center items-center gap-4 mt-6 text-center">
        <Link href={"/"}>
          <div className="w-[200px] bg-[#f0f0f0] p-2 mr-2 border-lg">
            Back to Home
          </div>
        </Link>

        <Link href={"/network/all"}>
          <div className="w-[200px] bg-[#f0f0f0] p-2 border-lg">
            See All Graphs
          </div>
        </Link>

      </div>
    </div>
  );
}
