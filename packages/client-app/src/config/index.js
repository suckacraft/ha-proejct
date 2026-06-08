export async function loadConfig() {
  const res = await fetch("/client.config.json");
  const config = await res.json();
  document.documentElement.style.setProperty(
    "--color-primary",
    config.colours.primary,
  );
  return config;
}
