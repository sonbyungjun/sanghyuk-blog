import { useCallback, useEffect, useState } from "react";

const COMMENTS_ID = "comments-container";

const Giscus = () => {
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(currentTheme);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          setTheme(isDark ? "dark" : "light");
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const loadComments = useCallback(() => {
    const comments = document.getElementById(COMMENTS_ID);
    if (!comments) return;

    comments.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "sonbyungjun/sanghyuk-blog");
    script.setAttribute("data-repo-id", "R_kgDORFdWLQ");
    script.setAttribute("data-category", "Announcements");
    script.setAttribute("data-category-id", "DIC_kwDORFdWLc4C10e-");
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-lang", "ko");
    script.setAttribute("data-theme", theme === "dark" ? "dark_dimmed" : "light");
    script.setAttribute("crossorigin", "anonymous");
    script.async = true;

    comments.appendChild(script);
  }, [theme]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return <div className="mt-16 giscus" id={COMMENTS_ID} />;
};

export default Giscus;
