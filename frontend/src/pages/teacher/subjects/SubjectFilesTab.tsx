import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  X,
} from "lucide-react";

import {
  useDeleteSubjectFile,
  useSubjectFiles,
  useUploadSubjectFile,
} from "../../../hooks/useTeacherSubjects";

const MAX_MB = 10;

const ACCEPT = [
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx",
  ".png,.jpg,.jpeg,.webp",
  ".txt,.csv",
].join(",");

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];

  let i = 0;
  let num = bytes;

  while (num >= 1024 && i < units.length - 1) {
    num /= 1024;
    i++;
  }

  return `${num.toFixed(
    num >= 10 || i === 0 ? 0 : 1
  )} ${units[i]}`;
}

function isPreviewable(
  contentType: string,
  url: string
): "pdf" | "image" | null {
  const lower = url.toLowerCase();

  if (contentType.startsWith("image/")) {
    return "image";
  }

  if (
    contentType === "application/pdf" ||
    lower.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (lower.match(/\.(png|jpg|jpeg|webp)$/)) {
    return "image";
  }

  return null;
}

export default function SubjectFilesTab() {
  const { id } = useParams<{ id: string }>();

  const subjectId = Number(id || 0);

  const [title, setTitle] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<{
    kind: "pdf" | "image";
    url: string;
    title: string;
  } | null>(null);

  const {
    data: files = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSubjectFiles(subjectId);

  const uploadFile = useUploadSubjectFile();

  const deleteFile = useDeleteSubjectFile();

  const handleUpload = () => {
    const file =
      fileInputRef.current?.files?.[0];

    if (!file) {
      alert("Please choose a file first.");
      return;
    }

    if (!subjectId) {
      alert("Invalid subject.");
      return;
    }

    const sizeMB =
      file.size / (1024 * 1024);

    if (sizeMB > MAX_MB) {
      alert(
        `File too large. Max is ${MAX_MB}MB.`
      );

      return;
    }

    uploadFile.mutate(
      {
        subjectId,
        file,
        title,
      },
      {
        onSuccess: () => {
          setTitle("");

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },

        onError: (error) => {
          console.error(
            "Upload failed:",
            error
          );

          alert(
            error instanceof Error
              ? error.message
              : "Upload failed."
          );
        },
      }
    );
  };

  const handleDelete = (
    fileId: number
  ) => {
    if (!subjectId) {
      alert("Invalid subject.");
      return;
    }

    const ok = window.confirm(
      "Delete this file? This cannot be undone."
    );

    if (!ok) return;

    deleteFile.mutate(
      {
        subjectId,
        fileId,
      },
      {
        onError: (error) => {
          console.error(
            "Delete failed:",
            error
          );

          alert(
            error instanceof Error
              ? error.message
              : "Failed to delete file."
          );
        },
      }
    );
  };

  if (!subjectId) {
    return (
      <div className="p-6 text-rose-600">
        Invalid subject ID.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        Loading files…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-rose-600">
        {error instanceof Error
          ? error.message
          : "Failed to load subject files."}
      </div>
    );
  }

  return (
    <>
      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="font-black text-slate-900 truncate">
                {preview.title}
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreview(null)
                }
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-[70vh] bg-slate-50">
              {preview.kind === "image" ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={preview.url}
                    alt={preview.title}
                    className="max-h-full max-w-full rounded-xl"
                  />
                </div>
              ) : (
                <iframe
                  title={preview.title}
                  src={preview.url}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: FILE LIST */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Files ({files.length})
            </h2>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs font-bold text-indigo-600 hover:underline disabled:opacity-50"
            >
              {isFetching
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {files.length === 0 ? (
            <div className="px-6 pb-6 text-slate-600">
              No files uploaded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {files.map((file) => {
                const kind =
                  isPreviewable(
                    file.content_type || "",
                    file.file_url || ""
                  );

                const isDeleting =
                  deleteFile.isPending &&
                  deleteFile.variables
                    ?.fileId === file.id;

                return (
                  <div
                    key={file.id}
                    className="p-5 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <FileText
                          size={18}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {file.title}
                        </div>

                        <div className="text-xs text-slate-500">
                          {formatBytes(
                            file.file_size
                          )}{" "}
                          •{" "}
                          {new Date(
                            file.created_at
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {kind ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              kind,
                              url:
                                file.file_url,
                              title:
                                file.title,
                            })
                          }
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                      ) : null}

                      <a
                        href={
                          file.file_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Download / Open"
                      >
                        <Download
                          size={18}
                        />
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            file.id
                          )
                        }
                        disabled={
                          isDeleting
                        }
                        className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2
                          size={18}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: UPLOAD PANEL */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
            Upload File
          </h3>

          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Title (optional)
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="e.g., Week 1 Handout"
          />

          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">
            Choose File
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="w-full text-sm"
          />

          <p className="text-xs text-slate-500 mt-2">
            Allowed: PDF, Word,
            Excel, PPT, images, TXT,
            CSV • Max {MAX_MB}MB
          </p>

          <button
            type="button"
            onClick={handleUpload}
            disabled={
              uploadFile.isPending
            }
            className="w-full mt-5 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60"
          >
            <Upload size={18} />

            {uploadFile.isPending
              ? "Uploading..."
              : "Upload"}
          </button>
        </div>
      </div>
    </>
  );
}