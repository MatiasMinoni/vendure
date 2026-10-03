/** Default service logo; login extensions may override it. */
export function ServiceLoginWordmark() {
  return <div className="text-primary text-2xl font-semibold tracking-tight">ArgySolutions</div>;
}

/** Default Spanish welcome; login extensions may override it. */
export function ServiceLoginWelcome() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Administrá tu tienda</h1>
      <p className="text-sm text-muted-foreground">Ingresá con tu cuenta de administración.</p>
    </div>
  );
}

/** Service name hidden on small screens to preserve toolbar space. */
export function ServiceToolbarWordmark() {
  return <span className="hidden text-sm font-semibold text-primary sm:inline">ArgySolutions</span>;
}

