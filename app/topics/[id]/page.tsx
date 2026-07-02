"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTopic, type Topic } from "@/lib/topics";
import { getIdentity, getStaffInfo, type Identity } from "@/lib/identity";
import { ThreadView } from "@/components/topics/thread-view";
import { ArrowLeft } from "lucide-react";

export default function TopicThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<Identity>({ name: "", deptPath: [] });
  const [staff, setStaff] = useState<{ isStaff: boolean; name: string }>({ isStaff: false, name: "" });

  useEffect(() => {
    setIdentity(getIdentity());
    setStaff(getStaffInfo());
  }, []);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    getTopic(id).then((t) => { if (alive) { setTopic(t); setLoading(false); } });
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      {loading ? (
        <div className="py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>
      ) : !topic ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[#9E9E9E] mb-4">找不到這個主題，可能已被刪除。</p>
          <button type="button" onClick={() => router.push("/topics")}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors">
            <ArrowLeft size={15} />回主題列表
          </button>
        </div>
      ) : (
        <ThreadView topic={topic} identity={identity} staff={staff} onIdentityChange={setIdentity} onBack={() => router.push("/topics")} />
      )}
    </div>
  );
}
