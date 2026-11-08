import { nanoid } from "nanoid";

export type DraftPost = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  published_at: null;
  approved_at: null;
  rejected_at: null;
};

export function createDraftPost(generated: {
  title: string;
  content: string;
}): DraftPost {
  return {
    id: nanoid(),
    title: generated.title,
    content: generated.content,
    created_at: new Date().toISOString(),
    published_at: null,
    approved_at: null,
    rejected_at: null,
  };
}
