# Project architecture decisions

- Grey/white light mode (`.report-light` tokens) applies to reports plus admin and builder pages via `isGreyLightPath` in use-theme; other shared client pages stay dark.
