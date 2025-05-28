'use client';
import dynamic from 'next/dynamic';
import data from '@/data/influence.json';

// Dynamically import to avoid SSR issues with D3
const NetworkGraph = dynamic(() => import('../components/NetworkGraph'), { ssr: false });

export default function GraphPage() {
  return (
    <div className="p-6">

      <NetworkGraph data={data} />
    </div>
  );
}
