import { useEffect, useId } from "react";

interface ViewCountProps {
  path: string;
}

export default function ViewCount({ path }: ViewCountProps) {
  const containerId = `vc-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.goatcounter?.visit_count) {
        clearInterval(interval);
        window.goatcounter.visit_count({
          append: `#${containerId}`,
          path: path,
          type: "html",
          no_branding: true,
        });
      }
    }, 200);

    return () => clearInterval(interval);
  }, [path, containerId]);

  return (
    <span className="text-sm text-gray-400 dark:text-gray-500 inline-flex items-center gap-1">
      조회 <span id={containerId} className="inline" />
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
