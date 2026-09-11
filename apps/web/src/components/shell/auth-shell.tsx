import { BrandMark } from "@/components/brand/brand-mark";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="ihp-auth-grid relative grid min-h-screen flex-1 overflow-hidden bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden min-h-screen flex-col justify-between border-r border-border px-10 py-9 lg:flex xl:px-16 xl:py-12">
        <BrandMark />

        <div className="relative z-10 max-w-2xl pb-14">
          <p className="brand-eyebrow">Director-led. Toronto-built.</p>
          <h1 className="mt-7 max-w-xl font-heading text-5xl font-bold leading-[0.98] tracking-[-0.055em] text-foreground xl:text-6xl">
            The operating system behind work that earns its keep.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">
            One accountable workspace for IHP strategy, delivery, evidence, and decisions.
          </p>
        </div>

        <p className="brand-eyebrow text-[10px]">Strategy · Creative · Technology</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-6 lg:hidden">
          <BrandMark />
        </div>
        <div className="relative z-10 mt-20 w-full max-w-md lg:mt-0">{children}</div>
      </section>
    </main>
  );
}
