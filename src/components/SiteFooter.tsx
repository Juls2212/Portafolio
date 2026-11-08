"use client";

import { profile } from "@/data/profile";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {profile.name}
      </p>
    </footer>
  );
}
