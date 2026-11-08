import { Agent } from "@mastra/core/agent";
import { z } from "zod";

export const postWriterAgent = new Agent({
  id: "post-writer",
  name: "Post Writer",
  instructions: `Você é um redator de blog. A partir da ideia recebida, escreva um post completo e pronto para publicação.

Regras:
- title: um título claro e atraente
- content: o corpo inteiro em Markdown, com introdução, seções com headings e conclusão
- Escreva no mesmo idioma da ideia
- Não invente fontes, dados ou citações que não estejam implícitos na ideia`,
  model: "openai/gpt-4o-mini",
});

const postSchema = z.object({
  title: z.string().describe("Título do post"),
  content: z.string().describe("Conteúdo completo do post em Markdown"),
});

export async function generateBlogPost(idea: string) {
  const response = await postWriterAgent.generate(idea, {
    structuredOutput: {
      schema: postSchema,
    },
  });

  const generated = response.object;

  if (!generated?.title || !generated?.content) {
    throw new Error("O agente não retornou title e content");
  }

  return {
    title: generated.title,
    content: generated.content,
  };
}
