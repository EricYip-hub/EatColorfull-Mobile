import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getTastemaker } from "@/lib/tastemakers-data";
import { useAuth } from "@/lib/auth-context";
import {
  deleteTastemakerVideo,
  listVideosForTastemaker,
  uploadTastemakerVideo,
  type TastemakerVideo,
  type TastemakerVideoPlatform,
} from "@/lib/tastemaker-videos";

const searchSchema = z.object({
  platform: z.enum(["tiktok", "youtube", "instagram", "upload"]).optional(),
});

export const Route = createFileRoute(
  "/_authenticated/tastemakers/$tastemakerId/upload",
)({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Upload videos — Colorfull" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UploadPage,
});

function formatMB(bytes: number | null) {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadPage() {
  const { tastemakerId } = Route.useParams();
  const search = Route.useSearch();
  const t = getTastemaker(tastemakerId);
  const { user, isHost, isAdmin, loading } = useAuth();

  const [videos, setVideos] = useState<TastemakerVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<TastemakerVideoPlatform>(
    search.platform ?? "upload",
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listVideosForTastemaker(tastemakerId)
      .then(setVideos)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingVideos(false));
  }, [tastemakerId]);

  if (!t) return <Navigate to="/tastemakers" />;
  if (loading) return <div className="p-12 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" search={{}} />;
  if (!isHost && !isAdmin) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="eyebrow">Restricted</p>
        <h1 className="mt-2 font-serif text-3xl">Hosts and admins only</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Only approved hosts and admins can upload videos to tastemaker profiles.
        </p>
        <Link
          to="/tastemakers/$tastemakerId"
          params={{ tastemakerId }}
          className="mt-6 inline-flex h-10 items-center border border-foreground px-5 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
        >
          Back to profile
        </Link>
      </section>
    );
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !user) return;
    setUploading(true);
    setError(null);
    setProgress("Uploading…");
    try {
      const created = await uploadTastemakerVideo({
        tastemakerId,
        file,
        title: title.trim(),
        userId: user.id,
        platform,
      });
      setVideos((v) => [created, ...v]);
      setFile(null);
      setTitle("");
      setProgress("Uploaded.");
      (document.getElementById("video-file") as HTMLInputElement | null)?.value &&
        ((document.getElementById("video-file") as HTMLInputElement).value = "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(v: TastemakerVideo) {
    if (!confirm(`Delete "${v.title}"?`)) return;
    try {
      await deleteTastemakerVideo(v);
      setVideos((list) => list.filter((x) => x.id !== v.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
      <p className="eyebrow">Tastemaker uploads</p>
      <h1 className="mt-2 font-serif text-3xl md:text-4xl">
        Videos for {t.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload short films from dinners, prep, or behind the scenes. Files appear
        in the "In motion" section of the public profile immediately.
      </p>

      <form
        onSubmit={handleUpload}
        className="mt-8 grid gap-4 rounded-2xl border border-border bg-secondary/30 p-6"
      >
        <div>
          <label className="eyebrow" htmlFor="video-title">
            Title
          </label>
          <input
            id="video-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Italian night — pasta course"
            className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-foreground focus:outline-none"
          />
        </div>
        <div>
          <label className="eyebrow" htmlFor="video-platform">
            Platform
          </label>
          <select
            id="video-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as TastemakerVideoPlatform)}
            className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-foreground focus:outline-none"
          >
            <option value="upload">General upload</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube Shorts</option>
            <option value="instagram">Instagram Reels</option>
          </select>
        </div>
        <div>
          <label className="eyebrow" htmlFor="video-file">
            Video file (MP4, MOV, WebM · up to 500 MB)
          </label>
          <input
            id="video-file"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/mpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="mt-2 block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border file:border-border file:bg-background file:px-4 file:text-[11px] file:uppercase file:tracking-[0.2em] hover:file:border-foreground"
          />
          {file && (
            <p className="mt-2 text-xs text-muted-foreground">
              {file.name} · {formatMB(file.size)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="inline-flex h-11 items-center bg-foreground px-6 text-[11px] uppercase tracking-[0.22em] text-background hover:bg-foreground/90 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload video"}
          </button>
          <Link
            to="/tastemakers/$tastemakerId"
            params={{ tastemakerId }}
            className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
          >
            View public profile →
          </Link>
        </div>
        {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      <div className="mt-12">
        <h2 className="font-serif text-2xl">Uploaded videos</h2>
        {loadingVideos ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : videos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No videos yet. Upload the first one above.
          </p>
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {videos.map((v) => (
              <li
                key={v.id}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <video
                  src={v.public_url}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black object-cover"
                />
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-serif text-base">{v.title}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()}
                      {v.file_size_bytes ? ` · ${formatMB(v.file_size_bytes)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(v)}
                    className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
