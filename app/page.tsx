import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { FileText } from "lucide-react";
import { FeatureCard } from "@/components/dashboard/FeatureCard";
export default function Home() {
return (
  <main className="min-h-screen bg-neutral-100">
    <Header />
    <Hero />
    
    <section className="mx-auto max-w-6xl px-8 pb-24">
  <FeatureCard
    title="Angebote"
    description="Atlas erstellt Angebotsentwürfe aus eingehenden Kundenanfragen."
    icon={FileText}
    statusText="3 Anfragen warten auf Prüfung"
  />
</section>  
  </main>
);  
}
