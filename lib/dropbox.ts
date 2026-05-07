const IMAGE_RE = /\.(jpe?g|png|gif|webp|heic|avif|bmp|tif?f)$/i;

export type DropboxImageFile = {
  name: string;
  pathLower: string;
};

type ListFolderEntry = {
  [key: string]: unknown;
  ".tag": string;
  name: string;
  path_lower: string;
};

type ListFolderResult = {
  entries: ListFolderEntry[];
  cursor: string;
  has_more: boolean;
};

async function dropboxRpc<TBody extends object, TRes>(
  token: string,
  path: string,
  body: TBody,
): Promise<TRes> {
  const res = await fetch(`https://api.dropboxapi.com/2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Dropbox ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as TRes;
}

export async function listSharedFolderImages(
  token: string,
  sharedFolderUrl: string,
  options?: { recursive?: boolean },
): Promise<DropboxImageFile[]> {
  const normalizedUrl = sharedFolderUrl.trim();
  const first = await dropboxRpc<
    { path: string; shared_link: { url: string }; recursive?: boolean },
    ListFolderResult
  >(token, "files/list_folder", {
    path: "",
    shared_link: { url: normalizedUrl },
    recursive: options?.recursive ?? false,
  });

  const entries: ListFolderEntry[] = [...first.entries];
  let cursor = first.cursor;
  let hasMore = first.has_more;

  while (hasMore) {
    const next = await dropboxRpc<{ cursor: string }, ListFolderResult>(
      token,
      "files/list_folder/continue",
      { cursor },
    );
    entries.push(...next.entries);
    cursor = next.cursor;
    hasMore = next.has_more;
  }

  const images: DropboxImageFile[] = [];
  for (const e of entries) {
    if (e[".tag"] !== "file") continue;
    if (!IMAGE_RE.test(e.name)) continue;
    images.push({ name: e.name, pathLower: e.path_lower });
  }

  return images.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTemporaryLink(
  token: string,
  pathLower: string,
): Promise<string> {
  const data = await dropboxRpc<{ path: string }, { link: string }>(
    token,
    "files/get_temporary_link",
    { path: pathLower },
  );
  return data.link;
}

export async function getTemporaryLinksBatched(
  token: string,
  files: DropboxImageFile[],
  concurrency = 8,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let index = 0;

  async function worker() {
    for (;;) {
      const i = index++;
      if (i >= files.length) return;
      const f = files[i]!;
      try {
        const link = await getTemporaryLink(token, f.pathLower);
        map.set(f.pathLower, link);
      } catch {
        map.set(f.pathLower, "");
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, files.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return map;
}
