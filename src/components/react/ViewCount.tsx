import { useEffect, useState } from "react";

interface ViewCountProps {
  path: string;
}

export default function ViewCount({ path }: ViewCountProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(
          `https://sonsh.goatcounter.com/counter/${encodeURIComponent(path)}.json`
        );
        if (res.ok) {
          const data = await res.json();
          setCount(data.count_unique || data.count || 0);
        }
      } catch {
        // GoatCounter API 에러 시 조회수 표시 안 함
      }
    };

    fetchCount();
  }, [path]);

  if (count === null) return null;

  return (
    <span className="text-sm text-gray-400 dark:text-gray-500">
      조회 {count.toLocaleString()}회
    </span>
  );
}
