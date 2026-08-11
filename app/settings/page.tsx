import { KairosProfileConfig } from "@/components/settings/kairos-profile-config";
import { PageIntro } from "@/components/ui/workspace-primitives";

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <PageIntro
        eyebrow="Kairos personalizado"
        title="Personalização do Kairos"
        description="Defina como o Kairos deve orientar, responder e apoiar o trabalho desta empresa."
      />
      <KairosProfileConfig />
    </section>
  );
}
