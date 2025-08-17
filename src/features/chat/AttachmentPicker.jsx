import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../core/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../core/firebase";
import { Paperclip } from "lucide-react";

export default function AttachmentPicker({ pid, taskId, mid }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `projects/${pid}/tasks/${taskId}/messages/${mid}/${Date.now()}_${file.name}`;
      const sref = ref(storage, path);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);
      await addDoc(collection(db, "projects", pid, "tasks", taskId, "messages", mid, "attachments"), {
        name: file.name,
        size: file.size,
        contentType: file.type,
        url,
        uid: "uploader",
        createdAt: serverTimestamp(),
      });
    } finally { setBusy(false); e.target.value = ""; }
  };

  return (
    <>
      <button
        type="button"
        onClick={pick}
        className="px-2 h-7 rounded border text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-1"
        title="Attach a file"
        disabled={busy}
      >
        <Paperclip size={14} />
        Attach
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={onFile}/>
    </>
  );
}
