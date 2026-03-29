
export default function Footer() {
  return (
    <footer className="w-full border-t bg-card">
      <div className="container flex items-center justify-center h-16 px-4 md:px-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Zentry. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

    
