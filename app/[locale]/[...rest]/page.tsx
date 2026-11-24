import { notFound } from "next/navigation";

// Qualquer rota desconhecida dentro de /pt ou /en mostra a página 404 traduzida.
export default function CatchAll() {
  notFound();
}
