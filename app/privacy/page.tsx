import { SiteShell } from "@/components/site-shell";

const sections = [
  {
    title: "Information we collect",
    body: "Lunio may collect operational usage data needed to run the service, such as playback activity and command timing information.",
  },
  {
    title: "How data is used",
    body: "We use service data to operate the bot, improve reliability, and support the dashboard and control plane experience.",
  },
  {
    title: "Your rights",
    body: "Where applicable, you may request access, correction, deletion, or portability of your data.",
  },
  {
    title: "Contact",
    body: "Email: lavalinklunio@gmail.com | Support server: discord.gg/rrqEFukVUZ",
  },
  {
    title: "Deletion requests",
    body: "Use your existing data deletion form to request removal of your data.",
  },
];

export default function PrivacyPage() {
  return (
    <SiteShell currentPath="/privacy">
      <section className="py-16 sm:py-24">
        <div className="shell max-w-4xl">
          <div className="panel p-8">
            <div className="eyebrow">Privacy</div>
            <h1 className="section-title">Privacy Policy</h1>
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
