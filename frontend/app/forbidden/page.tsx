import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AccessDenied from '../components/common/AccessDenied';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EFF6FF] text-slate-900 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-24 sm:py-32">
        <AccessDenied />
      </main>

      <Footer />
    </div>
  );
}
