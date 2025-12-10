import React from "react";

export interface QueueSong {
  id: string;
  title: string;
  artist: string;
  bpm: number;
}

interface QueueSidebarProps {
  queue: QueueSong[];
  currentIndex: number;
}

const QueueSidebar: React.FC<QueueSidebarProps> = ({ queue, currentIndex }) => {
  const prev = queue[currentIndex - 1];
  const current = queue[currentIndex];
  const next = queue[currentIndex + 1];

  return (
    <aside
      style={{
        position: "absolute",
        right: "4rem",
        top: "50%",
        transform: "translateY(-50%)",
        width: "220px",
        padding: "1rem",
        borderRadius: "16px",
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,64,175,0.4))",
        backdropFilter: "blur(16px)",
        color: "#e5e7eb",
        fontSize: "0.85rem",
      }}
    >
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Queue</h3>

      <div style={{ opacity: prev ? 0.6 : 0.3, marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
          Previous
        </div>
        {prev ? (
          <>
            <div>{prev.title}</div>
            <div style={{ fontSize: "0.75rem" }}>{prev.artist}</div>
          </>
        ) : (
          <div>—</div>
        )}
      </div>

      <div
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem",
          borderRadius: "10px",
          background:
            "linear-gradient(135deg, rgba(129,140,248,0.5), rgba(56,189,248,0.5))",
        }}
      >
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
          Now Playing
        </div>
        {current && (
          <>
            <div style={{ fontWeight: 600 }}>{current.title}</div>
            <div style={{ fontSize: "0.8rem" }}>{current.artist}</div>
            <div style={{ fontSize: "0.75rem" }}>{current.bpm} BPM</div>
          </>
        )}
      </div>

      <div style={{ opacity: next ? 0.9 : 0.3 }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
          Next
        </div>
        {next ? (
          <>
            <div>{next.title}</div>
            <div style={{ fontSize: "0.75rem" }}>{next.artist}</div>
          </>
        ) : (
          <div>—</div>
        )}
      </div>
    </aside>
  );
};

export default QueueSidebar;