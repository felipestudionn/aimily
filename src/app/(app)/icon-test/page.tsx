import React from 'react';
import Image from 'next/image';

export default function IconTestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Icon Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Icon {num}</h2>
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
              <Image 
                src={`/icons/${num}.svg`} 
                alt={`Icon ${num}`}
                width={150}
                height={150}
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
