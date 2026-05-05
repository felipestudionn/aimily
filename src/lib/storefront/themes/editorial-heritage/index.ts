/* ═══════════════════════════════════════════════════════════════════
   editorial-heritage theme module · entry point

   Exported as the default for dynamic import in theme-registry.ts.
   The shape conforms to ThemeModule from ../../types.ts.
   ═══════════════════════════════════════════════════════════════════ */

import { manifest } from './manifest';
import { tokens } from './tokens';
import HomeTemplate from './pages/HomeTemplate';
import PlpTemplate from './pages/PlpTemplate';
import PdpTemplate from './pages/PdpTemplate';
import LookbookTemplate from './pages/LookbookTemplate';
import AboutTemplate from './pages/AboutTemplate';
import ContactTemplate from './pages/ContactTemplate';
import type { ThemeModule } from '../../types';

const editorialHeritage: ThemeModule = {
  manifest,
  tokens,
  pages: {
    home: HomeTemplate,
    plp: PlpTemplate,
    pdp: PdpTemplate,
    lookbook: LookbookTemplate,
    about: AboutTemplate,
    contact: ContactTemplate,
  },
};

export default editorialHeritage;
