import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AccessDenied from '../components/common/AccessDenied';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 text-slate-900 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Hiệu ứng ánh sáng ambient nhẹ ở nền */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header cố định nền trắng chuẩn nhận diện thương hiệu */}
      <Navbar forceSolid={true} />

      <main className="flex-1 flex items-center justify-center px-4 py-24 sm:py-32 relative z-10">
        <AccessDenied />
      </main>

      <Footer />
    </div>
  );
}
