"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePickButton } from "@/components/controls/FilePickButton";
import { InboxCsvPanel } from "@/components/controls/InboxCsvPanel";
import { Label } from "@/components/ui/label";
import type { InboxModuleId } from "@/lib/inbox-types";

interface CsvUploaderProps {
  fileName: string | null;
  onLoad: (text: string, name: string) => void;
  onLoadMock: () => void;
  inboxModule?: InboxModuleId;
}

export function CsvUploader({
  fileName,
  onLoad,
  onLoadMock,
  inboxModule,
}: CsvUploaderProps) {
  const handleFile = async (file: File) => {
    const text = await file.text();
    onLoad(text, file.name);
  };

  return (
    <div className="space-y-3">
      <Label>CSV 파일</Label>
      <div className="flex flex-wrap gap-2">
        <FilePickButton variant="outline" onPick={handleFile}>
          <Upload className="h-4 w-4" />
          CSV 업로드
        </FilePickButton>
        <Button type="button" variant="secondary" onClick={onLoadMock}>
          Mock 데이터 로드
        </Button>
      </div>
      {fileName && (
        <p className="text-sm text-muted-foreground">로드됨: {fileName}</p>
      )}
      {inboxModule && (
        <InboxCsvPanel
          module={inboxModule}
          onLoad={onLoad}
          loadedFileName={fileName}
        />
      )}
    </div>
  );
}
