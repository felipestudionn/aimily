/* Presentation route = the spine in 'presentation' mode.

   WizardSidebar reads usePathname() and, when the path ends with
   '/presentation', expands the same <aside> to 100vw and renders the
   PresentationDeck inside. Symmetric to the calendar route — same
   cube, third face.

   This page renders nothing: the spine owns everything. */
export default function PresentationPage() {
  return null;
}
