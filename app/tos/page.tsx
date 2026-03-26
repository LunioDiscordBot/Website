import { SiteShell } from "@/components/site-shell";

const sections = [
  {
    title: "Acceptance",
    body: "By using Lunio, you agree to use the bot and website only for lawful, authorized purposes.",
  },
  {
    title: "Service use",
    body: "Lunio is intended to enhance Discord communities with music playback and related controls. Access may be limited for abuse or operational reasons.",
  },
  {
    title: "Ownership",
    body: "The bot, website, and associated materials remain the property of Lunio and its licensors.",
  },
  {
    title: "Warranty and liability",
    body: "Lunio is provided as-is and as-available. We do not guarantee uninterrupted service and are not liable for indirect or consequential damages arising from use.",
  },
  {
    title: "Contact",
    body: "Email: lavalinklunio@gmail.com | Support server: discord.gg/rrqEFukVUZ",
  },
];

export default function TosPage() {
  return (
    <SiteShell currentPath="/tos">
      <section className="py-16 sm:py-24">
        <div className="shell max-w-4xl">
          <div className="panel p-8">
            <div className="eyebrow">Terms</div>
            <h1 className="section-title">Terms of Service</h1>
            <div className="mt-8 space-y-5">
              {sections.map((section) => (
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5" key={section.title}>
                  <h2 className="font-headline text-2xl font-bold tracking-[-0.04em] text-white">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
