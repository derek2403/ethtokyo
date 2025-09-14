import { ParentProps } from "solid-js"
import { LeaderboardData, SwarmContext, SwarmContextType } from "./SwarmContext"
import { RewardsHistory, GossipResponse } from "./swarm.api"

export const defaultMockSwarmContext: SwarmContextType = {
	gossipMessages: () => null,
	leaders: () => null,
	leadersLoading: () => false,
	leadersError: () => null,
	nodesConnected: () => -1,
	uniqueVoters: () => -1,
	uniqueVotersLoading: () => false,
	uniqueVotersError: () => null,
	rewardsHistory: () => null,
	rewardsHistoryLoading: () => false,
	rewardsHistoryError: () => null,
	currentRound: () => -1,
	currentStage: () => -1,
}

interface MockSwarmProviderProps extends ParentProps {
	values: {
		gossipMessages?: () => GossipResponse | null | undefined
		leaders?: () => LeaderboardData | null | undefined
		leadersLoading?: () => boolean
		leadersError?: () => Error | null
		nodesConnected?: () => number
		uniqueVoters?: () => number
		uniqueVotersLoading?: () => boolean
		uniqueVotersError?: () => Error | null
		rewardsHistory?: () => RewardsHistory | null | undefined
		rewardsHistoryLoading?: () => boolean
		rewardsHistoryError?: () => Error | null
		currentRound?: () => number
		currentStage?: () => number
	}
}

export function MockSwarmProvider(props: MockSwarmProviderProps) {
	// Destructuring loses reactivity.
	const value: SwarmContextType = {
		gossipMessages: () => props.values.gossipMessages?.() || defaultMockSwarmContext.gossipMessages(),
		leaders: () => props.values.leaders?.() || defaultMockSwarmContext.leaders(),
		leadersLoading: () => props.values.leadersLoading?.() || defaultMockSwarmContext.leadersLoading(),
		leadersError: () => props.values.leadersError?.() || defaultMockSwarmContext.leadersError(),
		nodesConnected: () => props.values.nodesConnected?.() || defaultMockSwarmContext.nodesConnected(),
		uniqueVoters: () => props.values.uniqueVoters?.() || defaultMockSwarmContext.uniqueVoters(),
		uniqueVotersLoading: () => props.values.uniqueVotersLoading?.() || defaultMockSwarmContext.uniqueVotersLoading(),
		uniqueVotersError: () => props.values.uniqueVotersError?.() || defaultMockSwarmContext.uniqueVotersError(),
		rewardsHistory: () => props.values.rewardsHistory?.() || defaultMockSwarmContext.rewardsHistory(),
		rewardsHistoryLoading: () => props.values.rewardsHistoryLoading?.() || defaultMockSwarmContext.rewardsHistoryLoading(),
		rewardsHistoryError: () => props.values.rewardsHistoryError?.() || defaultMockSwarmContext.rewardsHistoryError(),
		currentRound: () => props.values.currentRound?.() || defaultMockSwarmContext.currentRound(),
		currentStage: () => props.values.currentStage?.() || defaultMockSwarmContext.currentStage(),
	}

	return <SwarmContext.Provider value={value}>{props.children}</SwarmContext.Provider>
}
