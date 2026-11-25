import { AtmosphereBack, AtmosphereFront } from "@/components/atmosphere/Atmosphere";
import { Diagnostics } from "@/components/Diagnostics";
import { Hud } from "@/components/Hud";
import { HudFrame } from "@/components/HudFrame";
import { HoloRoom } from "@/components/HoloRoom";
import { KeyboardLayer } from "@/components/keyboard/KeyboardLayer";
import { StackSection } from "@/components/keyboard/StackSection";
import { ContactSection } from "@/components/contact/ContactSection";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { getAssetAvailability } from "@/lib/assets";
import { SkipLink } from "@/components/SkipLink";

export default function Home() {
  const assets = getAssetAvailability();
  return (
    <>
      <SkipLink />
      <Hud />
      <HudFrame />
      <Diagnostics />
      <AtmosphereBack />
      {/* The one fixed, lazily loaded WebGL canvas (HOME globe, 3D keyboard). Persists across modules. */}
      <KeyboardLayer />
      <AtmosphereFront />
      <main id="content" tabIndex={-1}>
        <HoloRoom assets={assets} />
        <div id="explore-root">
          <StackSection />
          <ProjectsSection />
          <ExperienceSection />
          <ContactSection />
        </div>
      </main>
    </>
  );
}
