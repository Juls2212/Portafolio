/** Destination of the contact form (opens the visitor's mail client; nothing is sent from the site). */
export const CONTACT_EMAIL: string = "juliana.penafiel@campusucc.edu.co";

export interface SocialLink {
  id: string;
  /** Proper name: never translated. */
  name: string;
  url: string;
}

export const socialLinks: readonly SocialLink[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/juliana-pe%C3%B1afiel-melo-4bb280405/",
  },
  { id: "github", name: "GitHub", url: "https://github.com/Juls2212" },
];
