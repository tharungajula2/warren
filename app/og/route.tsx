import { ImageResponse } from "next/og";


export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0B0C0E",
          padding: "60px",
          fontFamily: "sans-serif",
          border: "2px solid #23272D",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "#C9711F", letterSpacing: "2px" }}>
              WARREN
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#9AA3AD",
                backgroundColor: "#191C20",
                border: "1px solid #23272D",
                padding: "4px 10px",
                borderRadius: "3px",
              }}
            >
              TECHNICAL OPERATING MANUAL
            </span>
          </div>

          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#E6E8EB",
              margin: 0,
              lineHeight: 1.1,
              maxWidth: "800px",
            }}
          >
            Jurisdiction-Aware Knowledge System for Banking & Finance
          </h1>

          <p style={{ fontSize: "20px", color: "#9AA3AD", margin: 0, maxWidth: "700px" }}>
            Banking risk, regulation, and the work built on it. IN · UK · EU · US Jurisdictions.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid #23272D",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "32px", color: "#9AA3AD", fontSize: "16px" }}>
            <div>
              ATOMS: <strong style={{ color: "#E6E8EB" }}>72</strong>
            </div>
            <div>
              DOMAINS: <strong style={{ color: "#E6E8EB" }}>9</strong>
            </div>
            <div>
              JURISDICTIONS: <strong style={{ color: "#C9711F" }}>5</strong>
            </div>
          </div>

          <div style={{ color: "#C9711F", fontSize: "16px", fontWeight: "bold" }}>
            warren-banking.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
