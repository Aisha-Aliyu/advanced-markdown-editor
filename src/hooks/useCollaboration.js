import { useEffect, useRef, useState, useCallback } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

const COLORS = [
  "#7c6af7", "#f97316", "#d6317a", "#4a9ef4",
  "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
];

const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
const randomId    = () => Math.random().toString(36).slice(2, 10);

export const useCollaboration = ({ docId, user, isEnabled }) => {
  const [presence, setPresence]     = useState([]);
  const [isConnected, setConnected] = useState(false);
  const channelRef                  = useRef(null);
  const myId                        = useRef(randomId());
  const myColor                     = useRef(randomColor());

  const myInfo = {
    id:    myId.current,
    color: myColor.current,
    name:  user?.email?.split("@")[0] || "Guest",
    email: user?.email || null,
  };

  const broadcastCursor = useCallback((position) => {
    channelRef.current?.send({
      type:    "broadcast",
      event:   "cursor",
      payload: { ...myInfo, position },
    });
  }, [myInfo]);

  useEffect(() => {
    if (!isSupabaseEnabled || !docId || !isEnabled) return;

    const channel = supabase.channel(`doc:${docId}`, {
      config: { presence: { key: myId.current } },
    });

    channelRef.current = channel;

    // Track presence (who's in the document right now)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.values(state)
          .flat()
          .filter((p) => p.id !== myId.current);
        setPresence(others);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setPresence((prev) => {
          const filtered = prev.filter(
            (p) => !newPresences.find((n) => n.id === p.id)
          );
          return [...filtered, ...newPresences.filter((p) => p.id !== myId.current)];
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setPresence((prev) =>
          prev.filter((p) => !leftPresences.find((l) => l.id === p.id))
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(myInfo);
          setConnected(true);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnected(false);
      setPresence([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, isEnabled]);

  return { presence, isConnected, broadcastCursor, myInfo };
};
