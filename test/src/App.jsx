import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    const url = encodeURIComponent("https://www.google.com");
    const prompt = encodeURIComponent("Get restaurants in Ottawa");

    const evtSource = new EventSource(`/extract?url=${url}&prompt=${prompt}`);

    evtSource.onmessage = (e) => {
      if (!e.data) return;
      console.log("SSE data:", e.data);

      try {
        const obj = JSON.parse(e.data);
        console.log("Parsed:", obj);
      } catch {
        // raw line
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE error", err);
      evtSource.close();
    };

    return () => evtSource.close();
  }, []);

  return <div>Check console for streaming data</div>;
}
