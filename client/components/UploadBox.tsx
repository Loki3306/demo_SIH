import React, { useCallback, useEffect, useRef, useState } from "react";

function IconPhoto() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeOpacity="0.12" />
      <circle cx="9.5" cy="11.5" r="2.5" fill="currentColor" stroke="none" opacity="0.12" />
      <path d="M21 19l-5-6-4 5-3-4-5 6h17z" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

export default function UploadBox({ onUpload }: { onUpload?: (file: File) => Promise<void> | void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [preview]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowed.includes(f.type)) {
      setError("Only PNG or JPG images are allowed.");
      return;
    }
    if (f.size > maxSize) {
      setError("File is too large. Maximum size is 5MB.");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const doUpload = useCallback(async () => {
    if (!file) return;
    try {
      if (onUpload) await onUpload(file);
      else {
        // Placeholder behavior
        console.log("Upload placeholder for", file.name);
        alert(`Ready to upload: ${file.name}`);
      }
    } catch (err) {
      setError("Upload failed");
    }
  }, [file, onUpload]);

  const fileSizeLabel = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mt-6">
      <label className="block text-sm font-medium text-foreground/70 mb-2">Upload a picture</label>
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center rounded-2xl p-5 transition-shadow border ${isDragging ? "border-sky-400 shadow-xl" : "border-white/10 shadow-sm"} bg-gradient-to-b from-white/3 to-white/2`}
        style={{ minHeight: 180 }}
        aria-label="File dropzone"
      >
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="flex-shrink-0 text-sky-400">
            <IconPhoto />
          </div>
          <div className="flex-1">
            {preview ? (
              <div className="flex items-center gap-4">
                <img src={preview} alt="preview" className="h-24 w-24 rounded-lg object-cover border border-white/5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm truncate">{file?.name}</div>
                    <div className="text-xs text-foreground/60">{file ? fileSizeLabel(file.size) : ""}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => inputRef.current?.click()} className="px-3 py-1 rounded bg-sky-600 text-white text-sm">Change</button>
                    <button onClick={reset} className="px-3 py-1 rounded bg-gray-800 text-sm">Remove</button>
                    <button onClick={doUpload} disabled={!file} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm disabled:opacity-50">Upload</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="text-sm text-foreground/60">Drag & drop an image here, or</div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-1 rounded bg-sky-600 text-white text-sm">Choose a file</button>
                  <div className="text-xs text-foreground/60">PNG or JPG, up to 5MB</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onSelect} />
      </div>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}
