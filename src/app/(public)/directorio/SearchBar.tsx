'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

function SearchBarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get('q') || '');

  // Sincronizar el input si el parámetro de la URL cambia externamente
  useEffect(() => {
    setTerm(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (term.trim()) {
      params.set('q', term.trim());
    } else {
      params.delete('q');
    }
    router.push(`/directorio?${params.toString()}`);
  };

  return (
    <form 
      onSubmit={handleSearch}
      className="max-w-2xl mx-auto flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input 
          type="text"
          placeholder="¿Qué estás buscando? (ej. Salud, Yoga...)" 
          className="border-none shadow-none h-12 pl-10 focus-visible:ring-0 text-lg"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      <Button 
        type="submit"
        size="lg" 
        className="px-8 font-bold rounded-xl text-white bg-primary"
      >
        Buscar
      </Button>
    </form>
  );
}

export default function SearchBar() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 animate-pulse">
        <div className="h-12 flex-1 bg-gray-100 rounded-lg" />
        <div className="h-12 w-24 bg-gray-200 rounded-lg" />
      </div>
    }>
      <SearchBarContent />
    </Suspense>
  );
}
