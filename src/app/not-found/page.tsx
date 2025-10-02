export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Página não encontrada</h2>
      <p className="max-w-md text-muted-foreground mb-8">
        A página que você tentou acessar não existe, foi movida ou está temporariamente indisponível.
      </p>
      <a href="/" className="inline-flex items-center px-5 py-3 rounded-md bg-primary text-white hover:opacity-90 transition-colors">
        Voltar para a Página Inicial
      </a>
    </div>
  );
}
