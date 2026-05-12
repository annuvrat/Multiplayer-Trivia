import React, { useEffect, useMemo, useState } from "react";
import LobbyChat from "./LobbyChat";
import {
  Volume2,
  VolumeX,
  Loader2,
  Share,
  LogOut,
  Users,
  Settings2,
  Sparkles,
  Swords,
} from "lucide-react";
import type { TeamsSnapshot } from "../types/teams";

interface LobbyProps {
  players: string[];
  roomId: string;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  topic: string;
  setTopic: (t: string) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
  qCount: number;
  setQCount: (c: number) => void;
  onGenerate: () => void;
  onStart: () => void;
  getPlayerIcon: (name: string) => string;
  messages: any[];
  onSendMessage: (msg: string) => void;
  onSendEmoji: (emoji: string) => void;
  currentUserId: string;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  loading: boolean;
  copyInviteLink: () => void;
  onLeave: () => void;
  canManageRoom: boolean;
  gameMode: "ffa" | "tdm";
  teamsState: TeamsSnapshot | null;
  countdownEndsAt: string | null;
  onPickTeam: (team: "a" | "b") => void;
  onSaveTeamNames: (a: string, b: string) => void;
  onCancelCountdown: () => void;
}

const Lobby: React.FC<LobbyProps> = ({
  players,
  roomId,
  isSettingsOpen,
  setIsSettingsOpen,
  topic,
  setTopic,
  difficulty,
  setDifficulty,
  qCount,
  setQCount,
  onGenerate,
  onStart,
  getPlayerIcon,
  messages,
  onSendMessage,
  onSendEmoji,
  currentUserId,
  soundEnabled,
  setSoundEnabled,
  loading,
  copyInviteLink,
  onLeave,
  canManageRoom,
  gameMode,
  teamsState,
  countdownEndsAt,
  onPickTeam,
  onSaveTeamNames,
  onCancelCountdown,
}) => {
  const [nameDraftA, setNameDraftA] = useState("");
  const [nameDraftB, setNameDraftB] = useState("");
  const [countLeft, setCountLeft] = useState(0);

  useEffect(() => {
    if (!teamsState) return;
    setNameDraftA(teamsState.teamAName);
    setNameDraftB(teamsState.teamBName);
  }, [teamsState?.teamAName, teamsState?.teamBName]);

  useEffect(() => {
    if (!countdownEndsAt) {
      setCountLeft(0);
      return;
    }
    const tick = () => {
      const ms = new Date(countdownEndsAt).getTime() - Date.now();
      setCountLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [countdownEndsAt]);

  const playerPositions = useMemo(() => {
    return players.map((_, i) => ({
      top: `${Math.floor(Math.random() * 60) + 15}%`,
      left: `${Math.floor(Math.random() * 70) + 10}%`,
      delay: `${i * 0.2}s`,
      scale: 0.8 + Math.random() * 0.5,
    }));
  }, [players.length]);

  const tdmReady =
    gameMode === "tdm" &&
    teamsState &&
    teamsState.unassigned.length === 0 &&
    teamsState.teamA.length >= 1 &&
    teamsState.teamB.length >= 1 &&
    players.length >= 2;

  const myTeam =
    teamsState &&
    (teamsState.teamA.includes(currentUserId)
      ? "a"
      : teamsState.teamB.includes(currentUserId)
        ? "b"
        : null);

  const showCountdown = Boolean(countdownEndsAt && countLeft > 0);

  const renderPlayerChip = (uid: string) => (
    <div
      key={uid}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
    >
      <img src={getPlayerIcon(uid)} alt="" className="h-8 w-8 rounded-lg object-cover" />
      <span className="max-w-[9rem] truncate text-[11px] font-bold uppercase tracking-wide text-[var(--text-primary)]">
        {uid}
      </span>
      {uid === currentUserId ? (
        <span className="rounded bg-blue-600/30 px-1.5 text-[8px] font-black text-blue-200">YOU</span>
      ) : null}
    </div>
  );

  return (
    <div className="relative min-h-screen select-none overflow-hidden bg-hero-pattern p-8">
      {showCountdown ? (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md">
          <p className="text-sm font-black uppercase tracking-[0.4em] text-violet-300">Match starting</p>
          <div className="mt-4 text-8xl font-black tabular-nums text-white md:text-9xl">{countLeft}</div>
          <p className="mt-4 text-sm text-slate-400">Get ready — quiz loads when the timer hits 0</p>
          {canManageRoom ? (
            <button
              type="button"
              onClick={onCancelCountdown}
              className="mt-8 rounded-2xl border border-red-400/40 bg-red-500/15 px-8 py-3 text-sm font-black uppercase tracking-widest text-red-200 transition hover:bg-red-500/25"
            >
              Cancel start
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="absolute left-10 top-10 z-20 flex flex-col gap-4">
        <div className="space-y-1">
          <h3 className="pl-1 text-left text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 opacity-70 dark:text-blue-400">
            Join the Arena
          </h3>
          <div className="group flex items-center gap-4">
            <div className="text-left text-4xl font-black italic tracking-tighter text-gray-800 drop-shadow-sm dark:text-white">
              Code:{" "}
              <span className="text-blue-600 dark:text-blue-400">{roomId}</span>
            </div>
            <button
              onClick={copyInviteLink}
              className="rounded-2xl border border-white/20 bg-white/10 p-3 shadow-lg backdrop-blur-md transition-all hover:bg-blue-600 hover:text-white active:scale-90"
              title="Copy Invite Link"
              type="button"
            >
              <Share size={18} />
            </button>
          </div>
        </div>

        {gameMode === "tdm" ? (
          <div className="flex w-fit items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 backdrop-blur-sm">
            <Swords size={14} className="text-violet-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-200">
              Team Deathmatch
            </span>
          </div>
        ) : (
          <div className="flex w-fit items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
              Live Connection
            </span>
          </div>
        )}
      </div>

      {gameMode === "tdm" && teamsState ? (
        <div className="relative z-10 mx-auto mt-28 w-full max-w-5xl px-4">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
              Pick your squad — everyone sees this board
            </p>
          </div>
          {canManageRoom ? (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Squad 1
                </label>
                <input
                  className="menti-input h-11 w-full bg-white/5 text-sm font-bold"
                  value={nameDraftA}
                  onChange={(e) => setNameDraftA(e.target.value)}
                  placeholder="e.g. Sapphire"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Squad 2
                </label>
                <input
                  className="menti-input h-11 w-full bg-white/5 text-sm font-bold"
                  value={nameDraftB}
                  onChange={(e) => setNameDraftB(e.target.value)}
                  placeholder="e.g. Crimson"
                />
              </div>
              <button
                type="button"
                onClick={() => onSaveTeamNames(nameDraftA, nameDraftB)}
                className="h-11 shrink-0 rounded-xl border border-violet-400/35 bg-violet-500/15 px-5 text-xs font-black uppercase tracking-wider text-violet-100 hover:bg-violet-500/25"
              >
                Save names
              </button>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/40 to-slate-950/80 p-5 shadow-xl">
              <div className="mb-4">
                <h4 className="text-lg font-black text-cyan-200">{teamsState.teamAName}</h4>
              </div>
              <div className="space-y-2">{teamsState.teamA.map(renderPlayerChip)}</div>
              {myTeam !== "a" ? (
                <button
                  type="button"
                  onClick={() => onPickTeam("a")}
                  className="mt-4 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/15 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-500/25"
                >
                  Join {teamsState.teamAName}
                </button>
              ) : (
                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">
                  You&apos;re on this team
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-rose-500/25 bg-gradient-to-b from-rose-950/40 to-slate-950/80 p-5 shadow-xl">
              <div className="mb-4">
                <h4 className="text-lg font-black text-rose-200">{teamsState.teamBName}</h4>
              </div>
              <div className="space-y-2">{teamsState.teamB.map(renderPlayerChip)}</div>
              {myTeam !== "b" ? (
                <button
                  type="button"
                  onClick={() => onPickTeam("b")}
                  className="mt-4 w-full rounded-2xl border border-rose-400/40 bg-rose-500/15 py-3 text-xs font-black uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-500/25"
                >
                  Join {teamsState.teamBName}
                </button>
              ) : (
                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-rose-400/80">
                  You&apos;re on this team
                </p>
              )}
            </div>
          </div>

          {teamsState.unassigned.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-950/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
                Unassigned — pick a team
              </p>
              <div className="mt-3 flex flex-wrap gap-2">{teamsState.unassigned.map(renderPlayerChip)}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 z-0">
            {players.map((p, i) => (
              <div
                key={p}
                className="group pointer-events-none absolute flex animate-float flex-col items-center gap-3"
                style={{
                  top: playerPositions[i]?.top || "50%",
                  left: playerPositions[i]?.left || "50%",
                  animationDelay: playerPositions[i]?.delay || "0s",
                  transform: `scale(${playerPositions[i]?.scale || 1})`,
                }}
              >
                <div className="relative w-20 rounded-3xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-blue-500/50">
                  <img src={getPlayerIcon(p)} alt={p} className="h-full w-full drop-shadow-xl" />
                  {p === currentUserId ? (
                    <div className="absolute -right-2 -top-2 rounded-full bg-blue-600 px-2 py-1 text-[8px] font-black text-white shadow-lg">
                      YOU
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/80 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] shadow-2xl backdrop-blur-xl">
                  {p}
                </div>
              </div>
            ))}
          </div>

          <div className="animate-in zoom-in-95 z-10 select-none text-center duration-500">
            <div className="group perspective-1000 relative">
              <div className="absolute -inset-20 -z-10 rounded-full bg-blue-600/5 blur-[120px] transition-all duration-1000 group-hover:bg-blue-600/15" />

              <div className="relative flex flex-col items-center justify-center">
                <div className="mb-4 pl-4 text-[10px] font-black uppercase tracking-[1em] text-blue-600 opacity-50 dark:text-blue-400">
                  Arena Status
                </div>
                <div className="text-[18rem] font-black italic leading-none tracking-tighter text-gray-800 transition-transform duration-700 group-hover:scale-105 dark:text-white md:text-[22rem] drop-shadow-[0_20px_40px_rgba(37,99,235,0.2)]">
                  {players.length}
                </div>

                <div className="mt-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 px-10 py-4 shadow-2xl backdrop-blur-3xl">
                  <div className="flex items-center gap-4 text-[14px] font-black uppercase italic tracking-[0.5em] text-[var(--text-primary)]">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
                    Heroes Waiting
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="absolute bottom-8 left-8 z-20">
        <LobbyChat
          messages={messages}
          onSendMessage={onSendMessage}
          onSendEmoji={onSendEmoji}
          currentUserId={currentUserId}
        />
      </div>

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--border-color)] bg-[var(--bg-primary)]/95 shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-700 sm:w-[24rem] ${isSettingsOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          type="button"
          className={`absolute -left-16 top-10 flex h-16 w-16 items-center justify-center transition-all ${isSettingsOpen ? "rounded-l-3xl bg-red-500 text-white shadow-red-500/30" : "rounded-l-3xl border border-[var(--border-color)] border-r-0 bg-[var(--bg-primary)] text-blue-600"}`}
        >
          {isSettingsOpen ? <LogOut size={24} className="rotate-180" /> : <Settings2 size={24} />}
        </button>

        <div className="flex-1 space-y-12 overflow-y-auto p-10">
          <div className="space-y-2">
            <h3 className="pl-1 text-[10px] font-black uppercase tracking-[0.5em] text-blue-600 opacity-70 dark:text-blue-400">
              Room Configuration
            </h3>
            <h2 className="text-3xl font-black italic tracking-tight text-[var(--text-primary)]">
              Arena Setup
            </h2>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="flex items-center gap-2 pl-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <Sparkles size={12} className="text-blue-600" />
                Battle Theme
              </label>
              <input
                className="menti-input h-14 border-white/10 bg-white/5 text-base font-bold focus:border-blue-600"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Marvel Universe..."
                disabled={!canManageRoom}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Difficulty
                </label>
                <select
                  className="menti-input h-14 cursor-pointer appearance-none border-white/10 bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={!canManageRoom}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Rounds
                </label>
                <input
                  type="number"
                  className="menti-input h-14 border-white/10 bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                  value={qCount}
                  onChange={(e) => setQCount(Number(e.target.value))}
                  disabled={!canManageRoom}
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-8">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Audio Experience
                </span>
                <div className={`h-2 w-2 rounded-full ${soundEnabled ? "bg-blue-600" : "bg-gray-600"}`} />
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex h-16 w-full items-center justify-between rounded-2xl px-6 transition-all ${soundEnabled ? "border border-blue-500/20 bg-blue-600/10 text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]" : "border border-gray-500/20 bg-gray-500/10 text-gray-500"}`}
              >
                <span className="text-sm font-bold tracking-wide">
                  {soundEnabled ? "Immersion Active" : "Silence Mode"}
                </span>
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 bg-[var(--bg-secondary)]/50 p-10">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onLeave}
              className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 font-black text-sm uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
            >
              <LogOut size={18} />
              Exit
            </button>
            {canManageRoom ? (
              <button
                type="button"
                className="flex h-16 flex-[2] items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 font-black text-sm uppercase tracking-widest transition-all hover:bg-white/10"
                onClick={onGenerate}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin text-blue-500" size={20} />
                ) : (
                  <Sparkles size={18} className="text-yellow-500" />
                )}
                AI Re-Quiz
              </button>
            ) : (
              <div className="flex h-16 flex-[2] items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 text-center text-[11px] font-black uppercase tracking-widest text-gray-400">
                Host is setting quiz
              </div>
            )}
          </div>

          {canManageRoom ? (
            <button
              type="button"
              className="menti-button-primary group relative flex h-20 w-full items-center justify-center gap-4 overflow-hidden text-2xl shadow-blue-600/20 hover:shadow-blue-600/40"
              onClick={onStart}
              disabled={
                loading ||
                (gameMode === "tdm" && !tdmReady) ||
                Boolean(countdownEndsAt && new Date(countdownEndsAt).getTime() > Date.now())
              }
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-transparent opacity-0 transition-opacity group-hover:opacity-10" />
              {gameMode === "tdm" ? "Start match · 10s countdown" : "Enter Arena 🎆"}
            </button>
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black uppercase tracking-[0.18em] text-gray-400">
              Waiting for host to start
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 opacity-50">
            <Users size={12} className="text-gray-400" />
            <span className="text-[10px] font-black italic uppercase tracking-[0.2em] text-gray-400">
              {canManageRoom ? "Host Exclusive Controls" : "View-Only Mode"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
