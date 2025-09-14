import { createContext, createResource, createSignal, useContext, onMount, onCleanup, ParentProps } from "solid-js"
import { GossipResponse } from "./swarm.api"
import api from "./swarm.api"

/**
 * Leaderboard data is the set of data needed to render the leaderboard.
 */
export type LeaderboardData = {
	leaders: Array<{
		id: string
		nickname: string
		participation: number
		cumulativeReward: number
		lastScore: number
	}>
	totalPeers: number
}

/**
 * Rewards data is the set of data needed to render the rewards graph.
 */
type RewardsHistory = {
	leaders: Array<{
		id: string
		values: Array<{ x: number; y: number }>
	}>
}

export interface SwarmContextType {
	// Gossip info
	gossipMessages: () => GossipResponse | null | undefined

	// The data for the actual leaderboard + loading, error states.
	leaders: () => LeaderboardData | null | undefined
	leadersLoading: () => boolean
	leadersError: () => Error | null

	// The number of nodes connected to the swarm.
	nodesConnected: () => number

	// The number of unique voters *(all time) + loading, error states.
	uniqueVoters: () => number
	uniqueVotersLoading: () => boolean
	uniqueVotersError: () => Error | null

	// Rewards history info + loading, error states.
	rewardsHistory: () => RewardsHistory | null | undefined
	rewardsHistoryLoading: () => boolean
	rewardsHistoryError: () => Error | null

	// Swarm state
	currentRound: () => number
	currentStage: () => number
}

export const SwarmContext = createContext<SwarmContextType>()

export function useSwarm() {
	const context = useContext(SwarmContext)
	if (!context) {
		throw new Error("useSwarm must be used within a SwarmProvider")
	}
	return context
}

export function SwarmProvider(props: ParentProps) {
	// Gossip state
	const [gossipMessages, setGossipMessages] = createSignal<GossipResponse | undefined | null>(null)
	let seenMessageIds = new Set<string>()

	// Round and stage state
	const [currentRound, setCurrentRound] = createSignal(-1)
	const [currentStage, setCurrentStage] = createSignal(-1)

	// Leaderboard state
	const [leaders, setLeaders] = createSignal<LeaderboardData | null | undefined>(null)
	const [rewardsHistory, setRewardsHistory] = createSignal<RewardsHistory | null | undefined>(null)

	const [nodesConnected, setNodesConnected] = createSignal(-1)
	const [uniqueVoters, setUniqueVoters] = createSignal(-1)

	// @ts-expect-warning - Intentionally unused variable
	const [_roundAndStage, { refetch: refetchRoundAndStage }] = createResource(async () => {
		const data = await api.getRoundAndStage()
		if (!data) {
			return undefined
		}

		setCurrentRound(data.round)
		setCurrentStage(data.stage)

		return data
	})

	const [_uniqueVoters, { refetch: refetchUniqueVoters }] = createResource(async () => {
		const data = await api.getUniqueVotersCount()
		if (!data) {
			return undefined
		}

		setUniqueVoters(data)
		return data
	})

	// Resources for data fetching
	// @ts-expect-warning - Intentionally unused variable
	const [_leaderboardData, { refetch: refetchLeaderboard }] = createResource(async () => {
		const data = await fetchLeaderboardData()
		if (!data || data.leaders.length === 0) {
			setLeaders(null)
			setNodesConnected(0)
			return
		}

		setLeaders(data)
		setNodesConnected(data.totalPeers)

		return data
	})

	// @ts-expect-warning - Intentionally unused variable
	const [_gossipData, { refetch: refetchGossip }] = createResource(async () => {
		const data = await fetchGossipData(currentRound())
		if (!data) {
			return undefined
		}

		const msgs = data.messages
			.filter((msg) => !seenMessageIds.has(msg.id))
			.map((msg) => {
				seenMessageIds.add(msg.id)
				return msg
			})

		const nextGossip = {
			messages: [...(gossipMessages()?.messages ?? []), ...msgs].slice(-200),
		}

		setGossipMessages(nextGossip)

		if (seenMessageIds.size > 2000) {
			const temp = Array.from(seenMessageIds).slice(-2000)
			seenMessageIds = new Set(temp)
		}

		return nextGossip
	})

	// @ts-expect-warning - Intentionally unused variable
	const [_rewardsHistory, { refetch: refetchRewardsHistory }] = createResource(async () => {
		const data = await fetchRewardsHistoryData()
		setRewardsHistory(data)
		return data
	})

	// Polling timers
	let leaderboardTimer: ReturnType<typeof setTimeout> | undefined = undefined
	let gossipTimer: ReturnType<typeof setTimeout> | undefined = undefined
	let roundAndStageTimer: ReturnType<typeof setTimeout> | undefined = undefined
	let rewardsHistoryTimer: ReturnType<typeof setTimeout> | undefined = undefined

	// Polling functions
	const pollGossip = async () => {
		await refetchGossip()

		if (gossipTimer !== undefined) {
			clearTimeout(gossipTimer)
		}

		gossipTimer = setTimeout(pollGossip, 10_000)
	}

	const pollLeaderboard = async () => {
		await refetchLeaderboard()
		await refetchUniqueVoters()

		if (leaderboardTimer !== undefined) {
			clearTimeout(leaderboardTimer)
		}

		leaderboardTimer = setTimeout(pollLeaderboard, 10_000)
	}

	const pollRoundAndStage = async () => {
		await refetchRoundAndStage()

		if (roundAndStageTimer !== undefined) {
			clearTimeout(roundAndStageTimer)
		}

		roundAndStageTimer = setTimeout(pollRoundAndStage, 10_000)
	}

	const pollRewardsHistory = async () => {
		await refetchRewardsHistory()

		if (rewardsHistoryTimer !== undefined) {
			clearTimeout(rewardsHistoryTimer)
		}

		rewardsHistoryTimer = setTimeout(pollRewardsHistory, 10_000)
	}

	// Setup and cleanup
	onMount(() => {
		// These already fire once immediately since the calls are created through createResource,
		// so we can add a 10s delay to start firing after that.
		leaderboardTimer = setTimeout(pollLeaderboard, 10_000)
		gossipTimer = setTimeout(pollGossip, 10_000)
		roundAndStageTimer = setTimeout(pollRoundAndStage, 10_000)
		rewardsHistoryTimer = setTimeout(pollRewardsHistory, 10_000)
	})

	onCleanup(() => {
		if (leaderboardTimer) {
			clearTimeout(leaderboardTimer)
		}

		if (gossipTimer) {
			clearTimeout(gossipTimer)
		}

		if (roundAndStageTimer) {
			clearTimeout(roundAndStageTimer)
		}
	})

	const value: SwarmContextType = {
		currentRound,
		currentStage,

		gossipMessages,

		leaders,
		leadersLoading: () => _leaderboardData.loading,
		leadersError: () => _leaderboardData.error,

		nodesConnected,

		uniqueVoters,
		uniqueVotersLoading: () => _uniqueVoters.loading,
		uniqueVotersError: () => _uniqueVoters.error,

		rewardsHistory,
		rewardsHistoryLoading: () => _rewardsHistory.loading,
		rewardsHistoryError: () => _rewardsHistory.error,
	}

	return <SwarmContext.Provider value={value}>{props.children}</SwarmContext.Provider>
}

async function fetchLeaderboardData(): Promise<LeaderboardData | undefined> {
	try {
		const monolithicData = await api.getLeaderboardCumulative()
		return {
			leaders: monolithicData.leaders,
			totalPeers: monolithicData.totalPeers,
		}
	} catch (e) {
		console.error("fetchLeaderboardData failed", e)
		return undefined
	}
}

async function fetchGossipData(since: number): Promise<GossipResponse | undefined> {
	try {
		return await api.getGossip({ since })
	} catch (e) {
		console.error("fetchGossipData failed", e)
		return undefined
	}
}

async function fetchRewardsHistoryData(): Promise<RewardsHistory | undefined> {
	try {
		const monolithicData = await api.getLeaderboardCumulative()
		return {
			leaders: monolithicData.rewards,
		}
	} catch (e) {
		console.error("fetchRewardsHistoryData failed", e)
		return undefined
	}
}
