import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { query } from "@/lib/db";
import { defaultPageContent, isPageSlug, pageTitleFromSlug } from "@/lib/page-content";
import sanitizeHtml from "sanitize-html";

/** Allowed HTML for CMS pages — rich content subset, no scripts or event handlers */
const CMS_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1","h2","h3","h4","h5","h6","p","br","hr","strong","em","u","s","b","i",
    "ul","ol","li","blockquote","pre","code","a","img",
    "table","thead","tbody","tr","th","td",
    "div","span","section","article","aside","figure","figcaption",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    "*": ["class", "id"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  // Strip event handlers, javascript: hrefs, and data: URLs
  allowedSchemesByTag: {
    img: ["https", "http", "data"],
    a: ["https", "http", "mailto"],
  },
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: false,
};

type Params = {
  params: Promise<{ slug: string }>;
};

type CmsPageRow = {
  slug: string;
  title: string;
  content_html: string;
  updated_at: string;
};

type DbResult = {
  affectedRows: number;
};

async function ensurePage(slug: "about" | "privacy") {
  const title = pageTitleFromSlug(slug);
  await query<DbResult>(
    `INSERT INTO cms_pages (slug, title, content_html)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title)`,
    [slug, title, defaultPageContent(slug)],
  );
}

export async function GET(_: Request, { params }: Params) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { slug } = await params;
  if (!isPageSlug(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  try {
    await ensurePage(slug);

    const rows = await query<CmsPageRow[]>(
      `SELECT slug, title, content_html, updated_at
       FROM cms_pages
       WHERE slug = ?
       LIMIT 1`,
      [slug],
    );

    const row = rows[0];
    return NextResponse.json({
      page: {
        slug: row.slug,
        title: row.title,
        contentHtml: row.content_html,
        updatedAt: row.updated_at,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load page content" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const access = await requireAdminApi();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { slug } = await params;
  if (!isPageSlug(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { title?: string; contentHtml?: string }
    | null;

  const title = payload?.title?.trim() ?? "";
  const rawHtml = payload?.contentHtml?.trim() ?? "";

  if (!title || !rawHtml) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  // Sanitize HTML before storage — strips scripts, event handlers, javascript: URIs
  const contentHtml = sanitizeHtml(rawHtml, CMS_SANITIZE_OPTIONS);

  try {
    const updatedBy = access.session.user?.email ?? null;

    await query<DbResult>(
      `INSERT INTO cms_pages (slug, title, content_html, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         content_html = VALUES(content_html),
         updated_by = VALUES(updated_by)`,
      [slug, title, contentHtml, updatedBy],
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update page content" }, { status: 500 });
  }
}
