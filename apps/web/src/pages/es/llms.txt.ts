import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.href ?? "https://ui.logic2b.com/").replace(/\/$/, "");
  const docs = (await getCollection("docsEs")).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const body = [
    "# logic2b ui — documentación en español",
    "",
    "> Componentes de interfaz que copias, adaptas y posees, con un registro",
    "> abierto diseñado para asistentes y agentes de programación.",
    "",
    "Esta edición española crece por oleadas. La documentación inglesa completa",
    `sigue disponible en ${base}/llms.txt. Cada página traducida también se`,
    "publica como Markdown añadiendo `.md` a su URL.",
    "",
    "## Guías traducidas",
    "",
    ...docs.map(
      (entry) =>
        `- [${entry.data.title}](${base}/es/docs/${entry.id}.md): ${entry.data.description}`,
    ),
    "",
    `- [Toda la documentación española en un archivo](${base}/es/llms-full.txt)`,
    `- [Documentación inglesa completa](${base}/llms.txt)`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
