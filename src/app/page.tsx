import { Hud } from "@/components/Hud";
import { HoloRoom } from "@/components/HoloRoom";
import { ProjectsPlaceholder } from "@/components/ProjectsPlaceholder";
import { SkipLink } from "@/components/SkipLink";

export default function Home() {
  return (
    <>
      <SkipLink />
      <Hud />
      <main id="content" tabIndex={-1}>
        <HoloRoom />
        <ProjectsPlaceholder />
      </main>
      {/*
        PHASE 2: a single fixed, lazily loaded WebGL canvas (3D keyboard) mounts here,
        e.g. dynamic(() => import("@/components/webgl/Scene"), { ssr: false }).
        It must be one shared canvas, not one per module.
      */}
    </>
  );
}
