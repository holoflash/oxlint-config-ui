import { useSignal, useSignalEffect } from "@preact/signals";

export function App() {
  const config = useSignal<any>(null);
  const error = useSignal<string | null>(null);

  useSignalEffect(() => {
    fetch("/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          config.value = data.config;
        } else {
          error.value = data.error || "Unknown error";
        }
      })
      .catch(() => {
        error.value = "Failed to fetch config";
      });
  });

  return (
    <div>
      <h1>oxlint-config-ui</h1>
      <h2>TODO: Make this interactive</h2>
      {error.value && <div style={{ color: "red" }}>{error.value}</div>}
      {config.value ? (
        <pre
          style={{
            background: "#222",
            color: "#fff",
            padding: 16,
            borderRadius: 8,
          }}
        >
          {JSON.stringify(config.value, null, 2)}
        </pre>
      ) : !error.value ? (
        <div>Loading...</div>
      ) : null}
    </div>
  );
}
