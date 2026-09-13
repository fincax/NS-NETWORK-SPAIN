/**
 * Ingesta de la web de la empresa (D-040, CLAUDE.md §25 "Website ingestion"): título, descripción y texto visible,
 * sin menús ni scripts, recortado para que quepa en la entrevista. Nunca rompe: sin red devuelve null.
 */
import { fetchText, type FetchText } from "@/agents/feeds";

export function htmlToText(html: string, limit = 8000): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " })[m] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  const head = [title.trim(), meta.trim()].filter(Boolean).join(". ");
  return `${head ? head + "\n" : ""}${body}`.slice(0, limit).trim();
}

export async function fetchWebsiteText(url: string | null | undefined, reader: FetchText = fetchText): Promise<string | null> {
  if (!url) return null;
  try {
    const html = await reader(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const text = htmlToText(html);
    return text.length > 40 ? text : null;
  } catch {
    return null;
  }
}
