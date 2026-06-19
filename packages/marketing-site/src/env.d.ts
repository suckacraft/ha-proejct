/// <reference types="astro/client" />

// @fontsource packages ship CSS but no type declarations for the bare/side-effect
// import. Declare them so `astro check` doesn't flag ts(2882).
declare module "@fontsource/*";
declare module "@fontsource-variable/*";
