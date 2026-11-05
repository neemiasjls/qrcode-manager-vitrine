import { requireUser } from "@/lib/auth/dal";
import { DomainBanner } from "@/components/domain-banner";
import { MobileBar, Sidebar } from "@/components/painel-nav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar username={user.username} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* barra do celular + aviso de URL provisória ficam sempre visíveis */}
        <div className="sticky top-0 z-40">
          <MobileBar username={user.username} />
          <DomainBanner />
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
