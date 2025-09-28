import Header from '@/components/Header';
import ShoeShowcase from '@/components/ShoeShowcase';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ShoeShowcase />
      </main>
    </div>
  );
}
