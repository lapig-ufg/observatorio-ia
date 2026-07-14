import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../catalog.generated";
import { Catalog } from "../components/Catalog";
import { institutionalDomainLabel, isInstitutionalEmail } from "../auth-policy";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Área dos alunos",
  description: "Área institucional do acervo de leituras sobre inteligência artificial.",
};

export default async function StudentPage() {
  const user = await requireChatGPTUser("/alunos");

  if (!isInstitutionalEmail(user.email)) {
    return (
      <main className="access-page">
        <div className="access-panel">
          <p className="eyebrow">Acesso institucional</p>
          <h1>Este e-mail não pertence aos domínios autorizados.</h1>
          <p>Use uma conta vinculada a {institutionalDomainLabel}.</p>
          <Link href="/signout-with-chatgpt?return_to=/alunos">Entrar com outra conta</Link>
        </div>
      </main>
    );
  }

  return <Catalog articles={articles} mode="student" />;
}
