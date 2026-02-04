import { useEffect, useState } from "react";

interface ViewCountProps {
  path: string;
}

export default function ViewCount({ path }: ViewCountProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(
      `https://sonsh.goatcounter.com/counter/${encodeURIComponent(path)}.json`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.count) {
          setCount(Number.parseInt(data.count, 10));
        }
      })
      .catch(() => {});
  }, [path]);

  if (count === null) return null;

  return (
    <span className="text-sm text-gray-400 dark:text-gray-500">
      조회 {count.toLocaleString()}회
    </span>
  );
}
