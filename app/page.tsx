import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { 
  CalendarDays,
  FileText,
  FolderOpen,
  PackageSearch,
  ReceiptText,
  Sparkles, 
} from "lucide-react";
import { FeatureCard } from "@/components/dashboard/FeatureCard";
export default function Home() {
return (
  <main className="min-h-screen bg-neutral-100">
    <Header />
    <Hero />
    
    <section className="mx-auto max-w-6xl px-8 pb-24">
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <FeatureCard
      title="Angebote"
      description="Atlas erstellt Angebotsentwürfe aus eingehenden Kundenanfragen."
      icon={FileText}
      statusText="3 Anfragen warten auf Prüfung"
    />

    <FeatureCard
      title="Termine"
      description="Besichtigungen, Baustellen und Kundentermine übersichtlich organisiert."
      icon={CalendarDays}
      statusText="4 Termine stehen heute an"
    />

    <FeatureCard
      title="Dokumente"
      description="Angebote, Bilder und Auftragsunterlagen zentral an einem Ort."
      icon={FolderOpen}
      statusText="2 Dokumente benötigen Aufmerksamkeit"
    />

    <FeatureCard
      title="Lieferanten"
      description="Atlas bereitet Lieferantenanfragen vor und vergleicht Rückmeldungen."
      icon={PackageSearch}
      statusText="2 Antworten sind eingegangen"
    />

    <FeatureCard
      title="Rechnungen"
      description="Offene Rechnungen und Zahlungsstände bleiben jederzeit im Blick."
      icon={ReceiptText}
      statusText="1 Rechnung ist überfällig"
    />

    <FeatureCard
      title="Atlas Assistenz"
      description="Atlas priorisiert Aufgaben und bereitet die nächsten Schritte vor."
      icon={Sparkles}
      statusText="5 Aufgaben wurden vorbereitet"
    />
  </div>
</section>  
  </main>
);  
}
