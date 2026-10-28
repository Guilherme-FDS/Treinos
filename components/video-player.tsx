import { isDirectVideo, youtubeEmbedUrl } from "@/lib/video";

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const yt = youtubeEmbedUrl(url);
  if (yt) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          src={yt}
          title={title}
          className="h-full w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  if (isDirectVideo(url)) {
    return <video src={url} controls playsInline loop muted className="aspect-video w-full rounded-2xl bg-black" preload="metadata" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
      Abrir vídeo
    </a>
  );
}
