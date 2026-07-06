"use client";

import { useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface FilePickButtonProps extends ButtonProps {
  accept?: string;
  onPick: (file: File) => void | Promise<void>;
}

/** label+hidden input 대신 button click → file dialog (portable/브라우저 호환) */
export function FilePickButton({
  accept = ".csv,text/csv",
  onPick,
  children,
  onClick,
  ...buttonProps
}: FilePickButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onPick(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        {...buttonProps}
        onClick={(e) => {
          onClick?.(e);
          inputRef.current?.click();
        }}
      >
        {children}
      </Button>
    </>
  );
}
