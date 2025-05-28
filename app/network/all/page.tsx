// app/all-graphs/page.tsx
"use client";
import AllGraphs from "../../components/AllGraphs"; // Adjust the import path as necessary
import data from "@/data/influence.json"; // Replace with your actual path
import Link from "next/link";

export default function AllGraphsPage() {
  return (
    <div className="p-6">
        <Link href = "/">
        <div className="absolute top-[30px] p-2 bg-[#f0f0f0] rounded-lg">Go to Home</div>        
        </Link>
      <h1 className="text-3xl font-bold mb-6 text-center">All Network Graphs (1965 ~ 2023)</h1>
      <AllGraphs data={data} />
    </div>
  );
}
