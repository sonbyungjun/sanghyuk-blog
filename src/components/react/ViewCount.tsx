import { useEffect, useRef } from "react";

interface ViewCountProps {
  path: string;
}

export default function ViewCount({ path }: ViewCountProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      if (window.goatcounter?.visit_count) {
        clearInterval(interval);
        window.goatcounter.visit_count({
          append: el,
          path: path,
          type: "html",
          no_branding: true,
          attr: { style: "" },
        });
      }
    }, 200);

    return () => clearInterval(interval);
  }, [path]);

  return (
    <span className="text-sm text-gray-400 dark:text-gray-500 inline-flex items-center gap-1">
      조회{" "}
      <span ref={containerRef} className="inline" />
    </span>
  );
}

declare global {
  interface Window {
    goatcounter?: {
      visit_count: (opts: Record<string, unknown>) => void;
    };
  }
}
