import { env } from "cloudflare:workers";
import { articles } from "../../../catalog.generated";
import { isInstitutionalEmail } from "../../../auth-policy";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

type FileBucket = {
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Autenticação necessária", { status: 401 });
  if (!isInstitutionalEmail(user.email)) return new Response("Acesso institucional necessário", { status: 403 });

  const { id } = await context.params;
  const article = articles.find((item) => item.id === id);
  if (!article) return new Response("Artigo não encontrado", { status: 404 });

  const bucket = (env as unknown as { FILES?: FileBucket }).FILES;
  if (!bucket) return new Response("Armazenamento indisponível", { status: 503 });

  const object = await bucket.get(`articles/${article.id}.pdf`);
  if (!object) return new Response("PDF ainda não sincronizado", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/pdf",
      "content-disposition": `inline; filename="${article.id}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
