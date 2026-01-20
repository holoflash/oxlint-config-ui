import { useEffect, useState } from "react";

type Rule = {
  scope: string;
  value: string;
  category: string;
};

function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/rules")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch rules");
        return res.json();
      })
      .then((data) => {
        setRules(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading rules...</div>;
  if (error) return <div>Error: {error}</div>;

  const sortedRules = [...rules].sort((a, b) =>
    a.category.localeCompare(b.category),
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Oxlint Rules [{sortedRules.length}]</h1>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Scope</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Value</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              Category
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRules.map((rule, idx) => (
            <tr key={idx}>
              <td style={{ border: "1px solid #eee", padding: "8px" }}>
                {rule.scope}
              </td>
              <td style={{ border: "1px solid #eee", padding: "8px" }}>
                {rule.value}
              </td>
              <td style={{ border: "1px solid #eee", padding: "8px" }}>
                {rule.category}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
