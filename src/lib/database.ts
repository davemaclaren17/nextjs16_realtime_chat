import type { Message } from "@/lib/realtime"
import { getSupabase } from "@/lib/supabase"

export const ROOM_TTL_SECONDS = 60 * 1440

type Room = {
  id: string
  expires_at: string
}

type MessageRow = {
  id: string
  room_id: string
  sender: string
  text: string
  timestamp: number
  token: string
}

type JoinRoomResult = "joined" | "exists" | "full" | "missing"

const getExpiresAt = () => new Date(Date.now() + ROOM_TTL_SECONDS * 1000).toISOString()

const deleteExpiredRooms = async () => {
  const { error } = await getSupabase()
    .from("rooms")
    .delete()
    .lte("expires_at", new Date().toISOString())

  if (error) throw error
}

const getActiveRoom = async (roomId: string) => {
  const { data, error } = await getSupabase()
    .from("rooms")
    .select("id, expires_at")
    .eq("id", roomId)
    .maybeSingle<Room>()

  if (error) throw error
  if (!data) return null

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await deleteRoom(roomId)
    return null
  }

  return data
}

export const createRoom = async (roomId: string) => {
  await deleteExpiredRooms()

  const { error } = await getSupabase().from("rooms").insert({
    id: roomId,
    expires_at: getExpiresAt(),
  })

  if (error) throw error
}

export const getRoomTtl = async (roomId: string) => {
  const room = await getActiveRoom(roomId)
  if (!room) return 0

  return Math.max(0, Math.ceil((new Date(room.expires_at).getTime() - Date.now()) / 1000))
}

export const deleteRoom = async (roomId: string) => {
  const { error } = await getSupabase().from("rooms").delete().eq("id", roomId)
  if (error) throw error
}

export const roomExists = async (roomId: string) => {
  const room = await getActiveRoom(roomId)
  return Boolean(room)
}

export const getConnectedTokens = async (roomId: string) => {
  const room = await getActiveRoom(roomId)
  if (!room) return null

  const { data, error } = await getSupabase()
    .from("room_participants")
    .select("token")
    .eq("room_id", roomId)

  if (error) throw error
  return data.map((participant) => participant.token)
}

export const joinRoom = async (roomId: string, token: string, maxUsers: number) => {
  const { data, error } = await getSupabase().rpc("join_room", {
    p_room_id: roomId,
    p_token: token,
    p_max_users: maxUsers,
  })

  if (error) throw error
  return data as JoinRoomResult
}

export const addMessage = async (message: Message, token: string) => {
  const { error } = await getSupabase().from("messages").insert({
    id: message.id,
    room_id: message.roomId,
    sender: message.sender,
    text: message.text,
    timestamp: message.timestamp,
    token,
  })

  if (error) throw error
}

export const getMessages = async (roomId: string) => {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("id, room_id, sender, text, timestamp, token")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>()

  if (error) throw error

  return data.map((message) => ({
    id: message.id,
    roomId: message.room_id,
    sender: message.sender,
    text: message.text,
    timestamp: message.timestamp,
    token: message.token,
  }))
}
