# Project architecture decisions

- Grey/white light mode (`.report-light` tokens) applies to reports, rosters, admin and builder pages via `isGreyLightPath` in use-theme; reports and rosters share a guest-accessible saved preference, while other shared client pages stay dark.
