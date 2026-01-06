"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const Page = () => {
  const params = useParams()
  const roomId = params.roomId as string
  const router = useRouter()

  const { username } = useUsername()
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [copyStatus, setCopyStatus] = useState("COPY")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      return res.data
    },
  })

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
  }, [ttlData])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return

    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, router])

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      return res.data
    },
  })

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post({ sender: username, text }, { query: { roomId } })
      setInput("")
    },
  })

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") refetch()
      if (event === "chat.destroy") router.push("/?destroyed=true")
    },
  })

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } })
    },
  })

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyStatus("COPIED!")
    setTimeout(() => setCopyStatus("COPY"), 2000)
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/40 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 pt-[env(safe-area-inset-top)] pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <span className="text-[11px] tracking-widest text-zinc-500 uppercase">
                  Room ID
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-bold text-green-500 truncate max-w-55 sm:max-w-none">
                    {roomId.slice(0, 10) + "..."}
                  </span>
                  <button
                    onClick={copyLink}
                    className="ml-auto rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 active:scale-[0.99]"
                  >
                    {copyStatus}
                  </button>
                </div>
              </div>

              <div className="hidden h-10 w-px bg-zinc-800 sm:block" />

              <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                <span className="text-[11px] tracking-widest text-zinc-500 uppercase">
                  Self-Destruct
                </span>
                <div
                  className={`mt-1 text-lg font-bold tabular-nums ${
                    timeRemaining !== null && timeRemaining < 60
                      ? "text-red-400"
                      : "text-amber-300"
                  }`}
                >
                  {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
                </div>
              </div>
            </div>

            <button
              onClick={() => destroyRoom()}
              className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20 active:scale-[0.99] transition-all group flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="group-hover:animate-pulse">💣</span>
              DESTROY NOW
            </button>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-2xl space-y-3">
          {messages?.messages.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="text-zinc-500 text-sm font-mono">
                No messages yet, start the conversation.
              </p>
            </div>
          )}

          {messages?.messages.map((msg) => {
            const isMe = msg.sender === username

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[85%] rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`text-xs font-bold ${isMe ? "text-green-400" : "text-blue-400"}`}>
                      {isMe ? "YOU" : msg.sender}
                    </span>
                    <span className="text-[11px] text-zinc-500 tabular-nums">
                      {format(msg.timestamp, "HH:mm")}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-100 wrap-break-word">
                    {msg.text}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* INPUT */}
      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/40 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500">
                {">"}
              </span>
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={input}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    sendMessage({ text: input })
                    inputRef.current?.focus()
                  }
                }}
                placeholder="Type message..."
                onChange={(e) => setInput(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-600 py-3.5 pl-8 pr-4 text-sm"
              />
            </div>

            <button
              onClick={() => {
                if (!input.trim()) return
                sendMessage({ text: input })
                inputRef.current?.focus()
              }}
              disabled={!input.trim() || isPending}
              className="shrink-0 rounded-xl bg-zinc-800 px-5 py-3.5 text-sm font-bold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Page
