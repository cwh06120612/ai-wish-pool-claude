import React from "react";

// 把純文字裡的網址（http/https）轉成可點的連結，點了開新分頁；其餘文字原樣保留。
// 用於顯示使用者輸入的留言／評論／說明，讓貼上的連結可直接點開。
const URL_RE = /(https?:\/\/[^\s<]+)/gi;
// 網址結尾常見的標點通常不屬於網址本身，去掉後另外輸出
const TRAILING_RE = /[).,!?;:，。！？；：、）】」』]+$/;

export function Linkify({ text }: { text: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    const start = m.index;
    let url = m[0];
    let trailing = "";
    const t = url.match(TRAILING_RE);
    if (t) { trailing = t[0]; url = url.slice(0, url.length - trailing.length); }

    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer"
        className="text-[#007A87] underline underline-offset-2 hover:text-[#00555E] break-all">
        {url}
      </a>
    );
    if (trailing) parts.push(trailing);
    last = start + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
