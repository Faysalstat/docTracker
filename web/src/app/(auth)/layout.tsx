import { BrandMark } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-muted/40 flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <BrandMark />
        Doctor Tracker
      </div>
      {children}
    </main>
  );
}
