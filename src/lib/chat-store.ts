"use client"

import { useSyncExternalStore } from "react"
import type { ConversationWithLastMessage } from "./types"

export type TriageTab = "all" | "unverified" | "agent" | "human"

export interface ChatState {
  conversations: ConversationWithLastMessage[]
  selectedId: string | null
  sidebarLoading: boolean
  sidebarError: string | null
}

let state: ChatState = {
  conversations: [],
  selectedId: null,
  sidebarLoading: true,
  sidebarError: null,
}

let onRetry: (() => void) | null = null

export function setOnRetry(fn: (() => void) | null) {
  onRetry = fn
}

export function retry() {
  onRetry?.()
}

const listeners = new Set<() => void>()

export function setChatState(partial: Partial<ChatState>) {
  state = { ...state, ...partial }
  listeners.forEach((fn) => { try { fn() } catch {} })
}

export function selectConversation(id: string | null) {
  setChatState({ selectedId: id })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): ChatState {
  return state
}

export function useChatStore(): ChatState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getChatState(): ChatState {
  return state
}
