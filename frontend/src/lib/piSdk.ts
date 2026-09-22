let initialization: Promise<void> | undefined;
export async function getPiSdk() {
  if (!window.Pi) throw new Error("Pi SDK did not load. Reload in Pi Browser.");
  if (!initialization) {
    initialization = Promise.resolve().then(() => window.Pi.init({ version: "2.0" }))
      .catch(error => { initialization = undefined; throw error; });
  }
  await initialization;
  return window.Pi;
}
