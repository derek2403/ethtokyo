import { LeaderboardData, useSwarm } from "../SwarmContext"
import LoadingSpinner from "./LoadingSpinner"
import ErrorMessage from "./ErrorMessage"
import SectionHeader from "./SectionHeader"
import { createResource, createSignal, Show, createEffect } from "solid-js"
import Scrollable from "./Scrollable"

export default function Leaderboard() {
	const { leaders, leadersLoading, leadersError, nodesConnected, uniqueVoters, uniqueVotersLoading } = useSwarm()
	let containerRef: HTMLDivElement | undefined

	// Search state: input is the raw text from the <input>, but query is what is searched for.
	// This only exists in two signals so that we search on submit, not on each keystroke.
	const [searchInput, setSearchInput] = createSignal("")
	const [leaderSearchQuery, setLeaderSearchQuery] = createSignal<string | null>(null)
	const [leaderSearchResultError, setLeaderSearchResultError] = createSignal<Error | null>(null)
	const [searchTrigger, setSearchTrigger] = createSignal(0)

	type SearchResult = {
		index: number
		leader: LeaderboardData["leaders"][number]
		inLeaderboard: boolean
	} 

	// This is a little hacky, but I want to allow triggering another search even if the leaderSearchQuery hasn't changed.
	// The searchTrigger() signal is incremented with each search, so we can always re-fire the search.
	const [leaderSearchResult] = createResource(
		() => ({
			query: leaderSearchQuery(),
			trigger: searchTrigger(),
			leaders: leaders(),
		}),
		async ({ query, leaders }) => {
			setLeaderSearchResultError(null)

			if (!query || query.length === 0) {
				return null
			}

			const index = leaders?.leaders.findIndex((leader) => {
				const qlc = query.toLowerCase()
				return leader.nickname.toLowerCase() === qlc || leader.id.toLowerCase() === qlc
			})

			if (index !== undefined && index !== null && index >= 0) {
				return {
					index,
					leader: leaders?.leaders[index],
					inLeaderboard: true,
				} as SearchResult
			}

			setLeaderSearchResultError(new Error(`could not find peer ${query} in top 100 of leaderboard`))

			return null
		},
	)

	const searchLeaderboard = (e: SubmitEvent) => {
		e.preventDefault()

		// This will trigger the refetch for the leaderSearchResult.
		setLeaderSearchQuery(searchInput())
		setSearchTrigger((prev) => prev + 1)
	}

	/**
	 * Checks if the leader is the searched leader.
	 * @param leader - The leader to check.
	 * @returns True if the leader is the searched leader, false otherwise.
	 */
	const isSearchedLeader = (target: LeaderboardData["leaders"][number]) => {
		if (!leaderSearchResult()) {
			return false
		}
		const leader = leaderSearchResult()?.leader
		if (!leader) {
			return false
		}
		const matchId = leader.id.toLowerCase() === target.id.toLowerCase()
		const matchName = leader.nickname.toLowerCase() === target.nickname.toLowerCase()

		return matchId || matchName
	}

	const scrollToLeader = (index: number) => {
		if (!containerRef) {
			return
		}

		const itemPath = `[data-testid="leader-${leaders()?.leaders[index].id}"]`

		const leaderElement = containerRef.querySelector(itemPath)
		if (!leaderElement) {
			return
		}
		
		leaderElement.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		})
	}

	// Watch for search results and scroll when found
	createEffect(() => {
		if (leaderSearchResult()?.inLeaderboard) {
			scrollToLeader(leaderSearchResult()!.index)
		}
	})

	// Only show spinner on the first render.
	// Otherwise we silently refresh.
	if (leadersLoading() && leaders()?.leaders.length === 0) {
		return <LoadingSpinner message="Fetching leaders" />
	}

	if (leadersError()) {
		return <ErrorMessage message="Failed to fetch leaderboard data" />
	}

	const LeaderboardTooltip = () => {
		return (
			<div class="uppercase">
				<p class="mb-4">RL Swarm is a three-stage game where agents first solve problems individually, then evaluate each other's solutions, and finally reach consensus on the best answer. The leaderboard tracks their participation (how many rounds and stages they complete) and their training rewards (how good their answers are).</p>
				<p>
					<strong>Move your agent up the leaderboard</strong> by participating consistently and running models that produce the best answers.
				</p>
			</div>
		)
	}

	return (
		<div class="w-full">
			{/* Stats */}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
				<div class="border border-2 border-dotted p-2">
					Current Nodes Connected:
					<Show when={leadersLoading() && leaders()?.leaders.length === 0} fallback={nodesConnected()}>
						<LoadingSpinner message="..." />
					</Show>
				</div>
				<div class="border border-2 border-dotted p-2">
					Total Models Trained:
					<Show when={uniqueVotersLoading() && uniqueVoters() === -1} fallback={uniqueVoters()}>
						<LoadingSpinner message="..." />
					</Show>
				</div>
			</div>

			{/* Header + Search */}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
				<SectionHeader title="Leaderboard" tooltip={LeaderboardTooltip()} />

				<div class="relative">
					<form onSubmit={searchLeaderboard} class="flex uppercase mt-2 mb-2 uppercase" inert={leaderSearchResult.loading}>
						<input type="text" value={searchInput()} onInput={(e) => setSearchInput(e.currentTarget.value)} placeholder="ENTER YOUR NODE NAME" class="border border-gensyn-brown p-2 flex-grow focus:outline-none focus:ring-0 focus:border-gensyn-green" />
						<button type="submit" class="uppercase border-t border-b border-r border-gensyn-brown p-2 bg-[rgba(0,0,0,0.05)]">
							Search
						</button>
					</form>
				</div>
				<Show when={leaderSearchResultError()}>
					<div class="md:col-span-2 mb-2">
						<ErrorMessage message={leaderSearchResultError()?.message || "Failed to search leaderboard"} />
					</div>
				</Show>
			</div>

			<div class="relative">
				<Scrollable class="max-h-[270px] border-2 border-dotted">
					<div ref={containerRef}>
						<table class="min-w-full table-auto border-collapse border-dotted border-separate border-spacing-1 border-spacing-x-0 py-1 px-4">
							<thead>
								<tr class="align-top">
									<th class="font-normal text-left w-auto relative">
										Rank
										<span class="absolute bottom-0 left-0 w-[90%] border-b border-dotted"></span>
									</th>
									<th class="font-normal text-left w-auto relative">
										Name
										<span class="absolute bottom-0 left-0 w-[90%] border-b border-dotted"></span>
									</th>
									<th class="font-normal text-left w-auto pr-4 relative">
										Participation
										<span class="absolute bottom-0 left-0 w-[90%] border-b border-dotted"></span>
									</th>
									<th class="font-normal text-left w-auto relative hidden md:table-cell">
										Training&nbsp;Reward
										<span class="absolute bottom-0 left-0 w-[100%] border-b border-dotted"></span>
									</th>
								</tr>
							</thead>
							<tbody class="uppercase">
								{leaders()?.leaders.map((leader, index) => (
									<tr classList={{ "bg-gensyn-green text-white": isSearchedLeader(leader) }} data-testid={`leader-${leader.id}`}>
										{/* Rank */}
										<td class="text-left" data-column="rank">
											{index + 1}
										</td>

										{/* Name */}
										<td class="text-left" data-column="name">
											{leader.nickname}
										</td>

										{/* Participation */}
										<td class="text-left" data-column="participation">
											{leader.participation}
										</td>

										{/* Cumulative Reward */}
										<td class="text-right hidden md:table-cell" data-column="reward">
											{leader.cumulativeReward}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Scrollable>
			</div>
		</div>
	)
}
