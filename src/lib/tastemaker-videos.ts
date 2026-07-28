import { supabase } from "@/integrations/supabase/client";

export type TastemakerVideoPlatform = "tiktok" | "youtube" | "instagram" | "upload";

export type TastemakerVideo = {
  id: string;
  tastemaker_id: string;
  title: string;
  storage_path: string;
  public_url: string;
  poster_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  platform: TastemakerVideoPlatform;
  created_at: string;
};

const BUCKET = "tastemaker-videos";

export async function listVideosForTastemaker(
  tastemakerId: string,
): Promise<TastemakerVideo[]> {
  const { data, error } = await supabase
    .from("tastemaker_videos")
    .select("*")
    .eq("tastemaker_id", tastemakerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TastemakerVideo[];
}

export async function uploadTastemakerVideo(opts: {
  tastemakerId: string;
  file: File;
  title: string;
  userId: string;
  platform?: TastemakerVideoPlatform;
}): Promise<TastemakerVideo> {
  const ext = opts.file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${opts.tastemakerId}/${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, opts.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: opts.file.type || undefined,
    });
  if (uploadErr) throw uploadErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error: insertErr } = await supabase
    .from("tastemaker_videos")
    .insert({
      tastemaker_id: opts.tastemakerId,
      title: opts.title,
      storage_path: path,
      public_url: pub.publicUrl,
      file_size_bytes: opts.file.size,
      mime_type: opts.file.type || null,
      uploaded_by: opts.userId,
      platform: opts.platform ?? "upload",
    } as any)
    .select("*")
    .single();
  if (insertErr) throw insertErr;
  return data as TastemakerVideo;
}

export async function deleteTastemakerVideo(video: TastemakerVideo) {
  await supabase.storage.from(BUCKET).remove([video.storage_path]);
  const { error } = await supabase
    .from("tastemaker_videos")
    .delete()
    .eq("id", video.id);
  if (error) throw error;
}
