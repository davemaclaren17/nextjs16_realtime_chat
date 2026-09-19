import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { getConnectedTokens, joinRoom } from "./lib/database"

export const proxy = async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  const roomMatch = pathname.match(/^\/room\/([^/]+)$/)
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url))

  const roomId = roomMatch[1]

  const connected = await getConnectedTokens(roomId)

  if (!connected) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
  }

  const existingToken = req.cookies.get("x-auth-token")?.value

  // USER IS ALLOWED TO JOIN ROOM
  if (existingToken && connected.includes(existingToken)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const token = nanoid()
  const MAX_ROOM_USERS = Number(process.env.MAX_ROOM_USERS ?? "10")
  const joinResult = await joinRoom(roomId, token, MAX_ROOM_USERS)

  if (joinResult === "missing") {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
  }

  if (joinResult === "full") {
    return NextResponse.redirect(new URL("/?error=room-full", req.url))
  }

  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  })

  return response
}

export const config = {
  matcher: "/room/:path*",
}
