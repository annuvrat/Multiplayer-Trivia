import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./socket";
import {
  getFreshIdToken,
  onFirebaseAuthStateChange,
  signOutFirebase,
  type FirebaseGoogleUser,
} from "./firebase/FireBase";

import Lobby from "./components/Lobby";
import Quiz from "./components/Quiz";
import Leaderboard from "./components/Leaderboard";
import Result from "./components/Result";
import MatchReplayModal from "./components/MatchReplayModal";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parseQuizSnapshot, type ReplayQuestion } from "./utils/quizSnapshot";
import type { TeamsSnapshot } from "./types/teams";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const AUTH_TOKEN_STORAGE_KEY = "quizme-google-token";
const AUTH_USER_STORAGE_KEY = "quizme-google-user";
const MATCH_HISTORY_STORAGE_KEY = "quizme-match-history";
const HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

const HERO_ICONS = [
  "https://api.dicebear.com/9.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Aria",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Zane",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Luna",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Milo",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Jasper",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Kira",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Leo",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Maya",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Otto",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Phoebe",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Rico",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Sasha",
];

interface Player {
  userId: string;
  avatar: string;
}

type MatchHistoryItem = {
  id: string;
  roomId: string;
  winner: string;
  score: number;
  position: number | null;
  isAuthenticated: boolean;
  playedAt: string;
  topic?: string | null;
  difficulty?: string | null;
  questionCount?: number | null;
  hasQuizSnapshot?: boolean;
  /** Raw quiz JSON from DB (server rows only). */
  quizSnapshot?: unknown;
  source?: "local" | "server";
};

export default function GameApp() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("");
  const [avatar, setAvatar] = useState(HERO_ICONS[0]);
  const [joined, setJoined] = useState(false);

  const [gameState, setGameState] = useState<
    "waiting" | "playing" | "mid-round-leaderboard" | "finished"
  >("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);

  const [topic, setTopic] = useState("General Knowledge");
  const [difficulty, setDifficulty] = useState("Easy");
  const [qCount, setQCount] = useState(5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [canManageRoom, setCanManageRoom] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseGoogleUser | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as FirebaseGoogleUser;
    } catch {
      return null;
    }
  });
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>(() => {
    const raw = localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as MatchHistoryItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [serverMatchHistory, setServerMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [replaySession, setReplaySession] = useState<{
    item: MatchHistoryItem;
    questions: ReplayQuestion[];
  } | null>(null);

  /** Arena mode for the next created room (joining an existing room uses that room's mode from the server). */
  const [dashboardGameMode, setDashboardGameMode] = useState<"ffa" | "tdm">("ffa");
  const [activeRoomMode, setActiveRoomMode] = useState<"ffa" | "tdm">("ffa");
  const [teamsState, setTeamsState] = useState<TeamsSnapshot | null>(null);
  const [countdownEndsAt, setCountdownEndsAt] = useState<string | null>(null);

  const isAuthenticated = Boolean(authUser);
  const profileName = authUser?.name || userId || "Guest Player";
  const profileAvatar = authUser?.photoURL || avatar;
  const userIdRef = useRef(userId);
  const roomIdRef = useRef(roomId);
  const authRef = useRef(isAuthenticated);

  const getProtectedHeaders = async () => {
    const freshToken = await getFreshIdToken().catch(() => null);
    const token = freshToken || localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) return null;
    if (freshToken) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, freshToken);

    return {
      ...HEADERS,
      Authorization: `Bearer ${token}`,
    };
  };

  const getPlayerIcon = (name: string) => {
    const player = players.find((p) => p.userId === name);
    if (player?.avatar) return player.avatar;
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return HERO_ICONS[hash % HERO_ICONS.length];
  };

  const applyRoomTeamsPayload = useCallback((teams: TeamsSnapshot | null | undefined) => {
    if (!teams) {
      setTeamsState(null);
      setCountdownEndsAt(null);
      return;
    }
    setTeamsState(teams);
    setCountdownEndsAt(teams.countdownEndsAt ?? null);
    setActiveRoomMode(teams.gameMode === "tdm" ? "tdm" : "ffa");
  }, []);

  const playSound = (soundFile: string) => {
    if (!soundEnabled) return;
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch((e) => console.log("Audio playback failed:", e));
  };

  const handleSendMessage = (text: string) => {
    socket.emit("send_message", { roomId, userId, message: text });
  };

  const handleSendEmoji = (emoji: string) => {
    socket.emit("send_message", { roomId, userId, emoji });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/play?room=${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied! 🔗", { position: "bottom-center" });
  };

  const handleGenerateQuestions = async () => {
    setLoading(true);
    const toastId = toast.loading("Brewing fresh trivia with AI...");
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Sign in with Google to generate tests.", { id: toastId });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId.toLowerCase()}/generate-test`,
        {
          method: "POST",
          headers: protectedHeaders,
          body: JSON.stringify({ topic, difficulty, questionCount: qCount }),
        },
      );
      if (response.ok) {
        toast.success("AI Quiz Ready! 🧠⚡", { id: toastId });
      } else {
        toast.error("AI couldn't think of anything. Try again!", { id: toastId });
      }
    } catch (err) {
      console.error("Error generating questions:", err);
      toast.error("Connection lost in cyberspace.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleStartFfaGame = async () => {
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Host must sign in with Google to start.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId.toLowerCase()}/start`, {
        method: "POST",
        headers: protectedHeaders,
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error || "Failed to start game.");
      }
    } catch (err) {
      console.error("Error starting game:", err);
    }
  };

  const handleStartTdmCountdown = async () => {
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Host must sign in with Google to start.");
        return;
      }
      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId.toLowerCase()}/start-countdown`,
        { method: "POST", headers: protectedHeaders },
      );
      const data = (await response.json()) as { error?: string; endsAt?: string };
      if (!response.ok) {
        toast.error(data.error || "Cannot start countdown.");
        return;
      }
      if (data.endsAt) setCountdownEndsAt(data.endsAt);
    } catch (err) {
      console.error("Error starting countdown:", err);
    }
  };

  const handleCancelTdmCountdown = async () => {
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Host must sign in.");
        return;
      }
      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId.toLowerCase()}/cancel-countdown`,
        { method: "POST", headers: protectedHeaders },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error || "Could not cancel.");
      }
    } catch (err) {
      console.error("Error cancelling countdown:", err);
    }
  };

  const handlePickTeam = async (team: "a" | "b") => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId.toLowerCase()}/team`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ userId, team }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error || "Could not switch team.");
      }
    } catch (err) {
      console.error("pick team:", err);
    }
  };

  const handleSaveTeamNames = async (teamAName: string, teamBName: string) => {
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Host must sign in to rename teams.");
        return;
      }
      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomId.toLowerCase()}/team-names`,
        {
          method: "PATCH",
          headers: protectedHeaders,
          body: JSON.stringify({ teamAName, teamBName }),
        },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error || "Could not save team names.");
      }
    } catch (err) {
      console.error("save team names:", err);
    }
  };

  const handleStartGame = async () => {
    if (activeRoomMode === "tdm") {
      await handleStartTdmCountdown();
    } else {
      await handleStartFfaGame();
    }
  };

  const handleSubmitAnswer = async (choiceIndex: number) => {
    playSound("submit_sound.mp3");
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${roomId.toLowerCase()}/answer`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          userId,
          questionIndex: qIndex,
          selectedOption: choiceIndex,
        }),
      });
      const data = await res.json();
      if (data.correct) {
        playSound("correct_answer.mp3");
        toast.success("Correct! +10 Points", { position: "top-center" });
      } else {
        playSound("wrong_answer.mp3");
        toast.error(`Wrong! Correct: ${currentQuestion.options[data.correctAnswer]}`, {
          position: "top-center",
        });
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  const handleRestartRoom = async () => {
    setLoading(true);
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Host must sign in with Google to restart.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId.toLowerCase()}/restart`, {
        method: "POST",
        headers: protectedHeaders,
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to restart.");
      }
    } catch (err) {
      console.error("Error restarting:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await fetch(`${API_BASE_URL}/rooms/${roomId.toLowerCase()}/leave`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ userId }),
      });
      socket.emit("leave_room", { roomId, userId });
      localStorage.removeItem("menti-session");
      setJoined(false);
      setRoomId("");
      setPlayers([]);
      setGameState("waiting");
      setCanManageRoom(false);
      setTeamsState(null);
      setCountdownEndsAt(null);
      setActiveRoomMode("ffa");
      toast("Left the arena. See you later!", { icon: "👋" });
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const toastId = toast.loading("Forging your battleground...");
    try {
      const protectedHeaders = await getProtectedHeaders();
      if (!protectedHeaders) {
        toast.error("Sign in with Google to create a room.", { id: toastId });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/rooms/create`, {
        method: "POST",
        headers: protectedHeaders,
        body: JSON.stringify({ gameMode: dashboardGameMode }),
      });
      const data = await response.json();
      if (response.ok) {
        setRoomId(data.roomId);
        setCanManageRoom(true);
        toast.success(`Arena Created! Code: ${data.roomId.toUpperCase()}`, {
          id: toastId,
          duration: 10000,
          style: { minWidth: "300px", fontWeight: "bold" },
        });
      }
    } catch (err) {
      console.error("Error creating room:", err);
      toast.error("Failed to create room.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (r?: string | any, u?: string, a?: string) => {
    const rId = r && typeof r === "string" ? r : roomId;
    const uId = u && typeof u === "string" ? u : userId;
    const av = a && typeof a === "string" ? a : avatar;

    if (!rId || !uId) return toast.error("Missing Room ID or Name!");
    const cleanRoomId = rId.trim().toLowerCase();
    setLoading(true);
    const toastId = toast.loading("Rushing to the arena...");
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/join/${cleanRoomId}`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ userId: uId, avatar: av }),
      });
      if (response.ok) {
        socket.emit("join_room", { roomId: cleanRoomId, userId: uId, avatar: av });

        const roomRes = await fetch(`${API_BASE_URL}/rooms/${cleanRoomId}`, {
          headers: HEADERS,
        });
        if (!roomRes.ok) throw new Error("Could not sync room status");

        const roomData = (await roomRes.json()) as Record<string, unknown>;
        console.log("Room synced:", roomData);

        const canManage = Boolean(authUser?.uid && roomData.host === authUser.uid);
        setCanManageRoom(canManage);
        setGameState(
          roomData.status as "waiting" | "playing" | "mid-round-leaderboard" | "finished",
        );
        if (roomData.status === "playing") {
          setCurrentQuestion(roomData.currentQuestion);
          setQIndex(roomData.currentQuestionIndex as number);
        }

        const pl = roomData.players as { userId: string; avatar: string }[] | undefined;
        setPlayers(
          Array.isArray(pl) ? pl.map((p) => ({ userId: p.userId, avatar: p.avatar || "" })) : [],
        );

        const teams = roomData.teams as TeamsSnapshot | undefined;
        applyRoomTeamsPayload(teams ?? null);
        if (typeof roomData.gameMode === "string") {
          setActiveRoomMode(roomData.gameMode === "tdm" ? "tdm" : "ffa");
        }

        toast.success(
          r && typeof r === "string" ? "Session Restored! ⚡" : "Welcome, Champion! ⚔️",
          { id: toastId },
        );
        localStorage.setItem(
          "menti-session",
          JSON.stringify({ roomId: cleanRoomId, userId: uId, avatar: av }),
        );
        setJoined(true);
      } else {
        const data = await response.json();
        console.error("Join failed:", data);
        toast.error(data.error || "Arena full or closed.", { id: toastId });
        localStorage.removeItem("menti-session");
      }
    } catch (err) {
      console.error("Error joining:", err);
      toast.error("Arena entrance blocked by network spirits.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardLogout = async () => {
    if (joined) {
      await handleLeaveRoom();
    }

    try {
      await signOutFirebase();
    } catch (error) {
      console.error("Failed to sign out Firebase:", error);
    }
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setAuthUser(null);
    toast.success("Logged out");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const unsub = onFirebaseAuthStateChange((user) => {
      setAuthUser(user);
      if (!user) {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        return;
      }

      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, user.idToken);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || joined || userId.trim().length > 0) return;
    setUserId(authUser?.name || "");
  }, [authUser?.name, isAuthenticated, joined, userId]);

  useEffect(() => {
    if (isAuthenticated) return;
    localStorage.setItem(MATCH_HISTORY_STORAGE_KEY, JSON.stringify(matchHistory));
  }, [matchHistory, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || joined) return;
    let cancelled = false;
    setHistoryLoading(true);
    void (async () => {
      const headers = await getProtectedHeaders();
      if (!headers || cancelled) {
        if (!cancelled) setHistoryLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me/matches`, { headers });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          matches?: Array<{
            id: string;
            room_id: string;
            topic: string | null;
            difficulty: string | null;
            question_count: number | null;
            quiz_snapshot: unknown;
            ended_at: string | null;
            started_at: string;
            score: number;
            position: number | null;
            winner_name: string | null;
          }>;
        };
        const rows: MatchHistoryItem[] = (data.matches || []).map((m) => ({
          id: m.id,
          roomId: (m.room_id || "").toUpperCase(),
          winner: m.winner_name || "—",
          score: m.score ?? 0,
          position: m.position,
          isAuthenticated: true,
          playedAt: m.ended_at || m.started_at,
          topic: m.topic,
          difficulty: m.difficulty,
          questionCount: m.question_count,
          hasQuizSnapshot: m.quiz_snapshot != null,
          quizSnapshot: m.quiz_snapshot,
          source: "server",
        }));
        if (!cancelled) setServerMatchHistory(rows);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, joined, authUser?.uid]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    socket.connect();
    socket.on("player_joined", (data) => {
      setPlayers((prev) => {
        const exists = prev.find((p) => p.userId === data.userId);
        if (exists) return prev;
        return [...prev, { userId: data.userId, avatar: data.avatar || getPlayerIcon(data.userId) }];
      });
    });
    socket.on("player_left", (data) =>
      setPlayers((prev) => prev.filter((p) => p.userId !== data.userId)),
    );
    socket.on("game_started", () => {
      setGameState("playing");
      setCountdownEndsAt(null);
      playSound("game_start.mp3");
    });
    socket.on("new_question", (data) => {
      setCurrentQuestion(data.question);
      setQIndex(data.index);
      setGameState("playing");
      setTimeLeft(10);
    });
    socket.on("show_mid_round_leaderboard", (data) => {
      setLeaderboard(data.leaderboard);
      setGameState("mid-round-leaderboard");
    });
    socket.on("leaderboard_update", (data) => setLeaderboard(data.leaderboard));
    socket.on("test_generated", (data) => {
      if (typeof data?.topic === "string") setTopic(data.topic);
      if (typeof data?.difficulty === "string") setDifficulty(data.difficulty);
      if (typeof data?.questionCount === "number") setQCount(data.questionCount);
      toast.success(`Quiz set: ${data?.topic || "Custom topic"}`, { position: "bottom-center" });
    });
    socket.on("game_ended", (data) => {
      setWinner(data.winner);
      setLeaderboard(data.leaderboard);
      setGameState("finished");
      playSound("end_game_winner.mp3");

      const myEntry = (data.leaderboard || []).find((entry: any) => entry.user === userIdRef.current);
      const myPosition = (data.leaderboard || []).findIndex((entry: any) => entry.user === userIdRef.current);

      if (!authRef.current) {
        setMatchHistory((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            roomId: roomIdRef.current.toUpperCase(),
            winner: data.winner || "Unknown",
            score: myEntry?.score || 0,
            position: myPosition >= 0 ? myPosition + 1 : null,
            isAuthenticated: false,
            playedAt: new Date().toISOString(),
            source: "local",
          },
          ...prev.slice(0, 24),
        ]);
      }
    });
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev.slice(-49), msg]);
    });
    socket.on("return_to_lobby", async () => {
      setGameState("waiting");
      setLeaderboard([]);
      setCountdownEndsAt(null);
      const rid = roomIdRef.current?.toLowerCase();
      if (rid) {
        try {
          const res = await fetch(`${API_BASE_URL}/rooms/${rid}`, { headers: HEADERS });
          if (res.ok) {
            const d = (await res.json()) as { teams?: TeamsSnapshot; gameMode?: string };
            if (d.teams) {
              setTeamsState(d.teams);
              setCountdownEndsAt(d.teams.countdownEndsAt ?? null);
            }
            if (d.gameMode === "tdm") setActiveRoomMode("tdm");
            else setActiveRoomMode("ffa");
          }
        } catch {
          /* ignore */
        }
      }
      toast("Returning to lobby for a new round...", { icon: "🔄" });
    });

    socket.on("teams_updated", (payload: TeamsSnapshot) => {
      setTeamsState(payload);
      setCountdownEndsAt(payload.countdownEndsAt ?? null);
      setActiveRoomMode(payload.gameMode === "tdm" ? "tdm" : "ffa");
    });

    socket.on("countdown_started", (data: { endsAt: string }) => {
      if (data?.endsAt) setCountdownEndsAt(data.endsAt);
    });

    socket.on("countdown_cancelled", () => {
      setCountdownEndsAt(null);
    });

    return () => {
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("game_started");
      socket.off("new_question");
      socket.off("show_mid_round_leaderboard");
      socket.off("leaderboard_update");
      socket.off("test_generated");
      socket.off("game_ended");
      socket.off("receive_message");
      socket.off("return_to_lobby");
      socket.off("teams_updated");
      socket.off("countdown_started");
      socket.off("countdown_cancelled");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room")?.toUpperCase();
    const savedSessionRaw = localStorage.getItem("menti-session");
    const session = savedSessionRaw ? JSON.parse(savedSessionRaw) : null;

    if (urlRoom) {
      setRoomId(urlRoom);
      if (session && session.roomId.toUpperCase() === urlRoom && session.userId) {
        setUserId(session.userId);
        setAvatar(session.avatar || HERO_ICONS[0]);
        handleJoin(session.roomId, session.userId, session.avatar || HERO_ICONS[0]);
      } else {
        setJoined(false);
        setUserId("");
      }
    } else if (session && session.roomId && session.userId) {
      setRoomId(session.roomId);
      setUserId(session.userId);
      setAvatar(session.avatar || avatar);
      handleJoin(session.roomId, session.userId, session.avatar || avatar);
    }
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  const historyTitle = useMemo(() => {
    return isAuthenticated ? "Your Match History" : "Guest Match History";
  }, [isAuthenticated]);

  const dashboardHistory = isAuthenticated ? serverMatchHistory : matchHistory;

  const openReplay = (item: MatchHistoryItem) => {
    const questions = parseQuizSnapshot(item.quizSnapshot);
    if (!questions?.length) {
      toast.error("Quiz data unavailable for this match.");
      return;
    }
    setReplaySession({ item, questions });
  };

  return (
    <div className="relative min-h-screen font-sans bg-slate-950">
      {!joined ? (
        <div className="fixed right-4 top-4 z-[60]">
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-slate-900/85 px-3 py-2 shadow-2xl backdrop-blur">
          <img
            src={profileAvatar}
            alt={profileName}
            className="h-9 w-9 rounded-full border border-white/20 bg-slate-700 object-cover"
          />
          <div className="hidden sm:block">
            <p className="max-w-[11rem] truncate text-sm font-semibold text-slate-100">{profileName}</p>
            <p className="text-[11px] text-slate-400">{isAuthenticated ? "Authenticated" : "Guest mode"}</p>
          </div>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleDashboardLogout}
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/go?next=${encodeURIComponent("/auth?next=%2Fplay")}`)}
              className="rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/20"
            >
              Sign in
            </button>
          )}
        </div>
        </div>
      ) : null}

      {!joined && (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_45%)] px-4 py-20 text-slate-100">
          <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Play Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold">Create or join an arena</h1>
              <p className="mt-2 text-sm text-slate-400">
                {isAuthenticated
                  ? "You can host arenas and generate AI quizzes."
                  : "Guest mode supports instant join and play. Sign in to host arenas."}
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Game mode</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDashboardGameMode("ffa")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      dashboardGameMode === "ffa"
                        ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                        : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25"
                    }`}
                  >
                    Free-for-all
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardGameMode("tdm")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      dashboardGameMode === "tdm"
                        ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                        : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25"
                    }`}
                  >
                    Team (TDM)
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  FFA is every player for themselves. TDM groups players into two squads (see below).
                </p>
              </div>

              {dashboardGameMode === "tdm" ? (
                <div className="mt-5 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 to-slate-950/80 p-4 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                    Team Deathmatch
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    This arena is a <span className="text-violet-200">squad battle</span>: players are split into{" "}
                    <span className="font-medium text-slate-100">Sapphire</span> and{" "}
                    <span className="font-medium text-slate-100">Crimson</span> as they join (even headcount).
                    Invite friends on both sides — full team scoring and a live squad board are next on the roadmap;
                    rounds still use the same quiz flow you already know.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Room Code</label>
                  <input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="e.g. A1B2C3"
                    className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Player Name</label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Your display name"
                    className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Avatar</p>
                <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
                  {HERO_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setAvatar(icon)}
                      className={`rounded-lg border p-1 transition ${
                        avatar === icon
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-white/5 hover:border-white/25"
                      }`}
                    >
                      <img src={icon} alt="Avatar option" className="h-8 w-8 object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Create New Arena
                </button>
                <button
                  type="button"
                  onClick={() => handleJoin()}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Join Arena
                </button>
              </div>
            </section>

            <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
              <h2 className="text-lg font-semibold">{historyTitle}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {isAuthenticated
                  ? "Synced from your account — open Replay to practice the saved questions."
                  : `Last ${Math.min(matchHistory.length, 25)} records on this device only.`}
              </p>

              {historyLoading && isAuthenticated ? (
                <div className="mt-6 text-sm text-slate-500">Loading history…</div>
              ) : dashboardHistory.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-400">
                  No matches yet. Finish a game and your results will show here.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {dashboardHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Room {item.roomId}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(item.playedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {(item.topic || item.difficulty) && (
                        <div className="mt-1 text-xs text-cyan-200/90">
                          {item.topic || "Custom"}
                          {item.difficulty ? ` · ${item.difficulty}` : ""}
                          {item.questionCount != null ? ` · ${item.questionCount} Q` : ""}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span>Winner: {item.winner}</span>
                        <span>
                          {item.position ? `#${item.position}` : "Unranked"} • {item.score} pts
                        </span>
                      </div>
                      {item.hasQuizSnapshot && item.source === "server" ? (
                        <button
                          type="button"
                          onClick={() => openReplay(item)}
                          className="mt-2 w-full rounded-lg border border-cyan-500/35 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                        >
                          Replay quiz
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {joined && gameState === "waiting" && (
        <Lobby
          players={players.map((p) => p.userId)}
          roomId={roomId}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          topic={topic}
          setTopic={setTopic}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          qCount={qCount}
          setQCount={setQCount}
          onGenerate={handleGenerateQuestions}
          onStart={handleStartGame}
          getPlayerIcon={getPlayerIcon}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendEmoji={handleSendEmoji}
          copyInviteLink={copyInviteLink}
          onLeave={handleLeaveRoom}
          currentUserId={userId}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          loading={loading}
          canManageRoom={canManageRoom}
          gameMode={activeRoomMode}
          teamsState={teamsState}
          countdownEndsAt={countdownEndsAt}
          onPickTeam={handlePickTeam}
          onSaveTeamNames={handleSaveTeamNames}
          onCancelCountdown={handleCancelTdmCountdown}
        />
      )}

      {joined && gameState === "playing" && (
        <Quiz
          currentQuestion={currentQuestion}
          qIndex={qIndex}
          timeLeft={timeLeft}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {joined && gameState === "mid-round-leaderboard" && (
        <Leaderboard leaderboard={leaderboard} />
      )}

      {joined && gameState === "finished" && (
        <Result
          winner={winner || "Unknown Champion"}
          leaderboard={leaderboard}
          onRestart={handleRestartRoom}
          onLeave={handleLeaveRoom}
          isHost={canManageRoom}
        />
      )}

      {replaySession ? (
        <MatchReplayModal
          open
          onClose={() => setReplaySession(null)}
          roomLabel={replaySession.item.roomId}
          topic={replaySession.item.topic}
          difficulty={replaySession.item.difficulty}
          questions={replaySession.questions}
        />
      ) : null}
    </div>
  );
}
