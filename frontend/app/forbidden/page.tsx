import React from 'react';
import Navbar from '../components/common/Navbar';
import AccessDenied from '../components/common/AccessDenied';

export default function ForbiddenPage() {
  return (
    <div className="h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Header cố định nền trắng chuẩn nhận diện thương hiệu */}
      <Navbar forceSolid={true} />

      <main className="flex-1 flex items-center justify-center px-4 pt-16">
        <AccessDenied />
      </main>
    </div>
  );
}
