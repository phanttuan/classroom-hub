import React from "react";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import SectionDivider from "./components/common/SectionDivider";
import HeroSection from "./components/home/HeroSection";
import ProblemSection from "./components/home/ProblemSection";
import WorkflowSection from "./components/home/WorkflowSection";
import FeaturesRadarSection from "./components/home/FeaturesRadarSection";
import RolesSection from "./components/home/RolesSection";
import CtaBannerSection from "./components/home/CtaBannerSection";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EFF6FF] text-slate-900 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <SectionDivider />
        <WorkflowSection />
        <SectionDivider />
        <FeaturesRadarSection />
        <SectionDivider />
        <RolesSection />
        <CtaBannerSection />
      </main>

      <Footer />
    </div>
  );
}
