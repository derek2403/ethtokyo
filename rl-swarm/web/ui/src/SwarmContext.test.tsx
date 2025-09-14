import { render } from "@solidjs/testing-library"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SwarmProvider, useSwarm } from "./SwarmContext"
import api from "./swarm.api"

// Mock the API calls
vi.mock("./swarm.api", () => ({
	default: {
		getGossip: vi.fn(),
		getLeaderboard: vi.fn(),
		getRoundAndStage: vi.fn(),
		getLeaderboardCumulative: vi.fn(),
	},
}))

describe("SwarmProvider", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("should initialize with default values", () => {
		const TestComponent = () => {
			const ctx = useSwarm()
			expect(ctx.currentRound()).toBe(-1)
			expect(ctx.currentStage()).toBe(-1)
			expect(ctx.gossipMessages()).toEqual(null)
			expect(ctx.leaders()).toBeNull()
			expect(ctx.uniqueVoters()).toBe(-1)
			return null
		}

		render(() => (
			<SwarmProvider>
				<TestComponent />
			</SwarmProvider>
		))
	})

	it("should update leaderboard when data is fetched", async () => {
		vi.mocked(api.getLeaderboardCumulative).mockResolvedValue({
			leaders: [
				{ id: "node1", nickname: "nn1", participation: 1, cumulativeReward: 1.0, lastScore: 1.0 },
				{ id: "node2", nickname: "nn2", participation: 0.5, cumulativeReward: 0.5, lastScore: 0.5 },
			],
			totalPeers: 2,
			rewards: [],
		})
		vi.mocked(api.getGossip).mockResolvedValue({ messages: [] })
		vi.mocked(api.getRoundAndStage).mockResolvedValue({ round: 5, stage: 3 })

		const TestComponent = () => {
			const ctx = useSwarm()
			return (
				<div>
					<div data-testid="leader-count">{ctx.leaders()?.leaders.length}</div>
					<div data-testid="round-stage">
						Round {ctx.currentRound()}, stage {ctx.currentStage()}
					</div>
				</div>
			)
		}

		const { findByTestId } = render(() => (
			<SwarmProvider>
				<TestComponent />
			</SwarmProvider>
		))

		// Wait for the initial API calls to resolve
		await vi.advanceTimersByTimeAsync(0)

		// Initial state
		const leaderCount = await findByTestId("leader-count")
		expect(leaderCount.textContent).toBe("2")
	})

	it.skip("should poll for updates", async () => {
		vi.mocked(api.getLeaderboardCumulative).mockResolvedValue({
			leaders: [{ id: "node1", nickname: "nn1", participation: 1, cumulativeReward: 1.0, lastScore: 1.0 }],
			rewards: [],
			totalPeers: 1,
		})
		vi.mocked(api.getGossip).mockResolvedValue({ messages: [] })
		vi.mocked(api.getRoundAndStage).mockResolvedValue({ round: 1, stage: 1 })

		render(() => (
			<SwarmProvider>
				<div />
			</SwarmProvider>
		))

		// Initial calls
		expect(api.getLeaderboardCumulative).toHaveBeenCalledTimes(1)
		expect(api.getGossip).toHaveBeenCalledTimes(1)
		expect(api.getRoundAndStage).toHaveBeenCalledTimes(1)

		// Advance time to trigger polls
		await vi.advanceTimersByTimeAsync(10_000)

		// Wait for and verify additional calls
		expect(api.getLeaderboardCumulative).toHaveBeenCalledTimes(2)
		expect(api.getGossip).toHaveBeenCalledTimes(2)
		expect(api.getRoundAndStage).toHaveBeenCalledTimes(2)
	})

	it("should update gossip messages", async () => {
		vi.mocked(api.getGossip).mockResolvedValue({
			messages: [
				{ id: "msg1", message: "test1", node: "node1" },
				{ id: "msg2", message: "test2", node: "node2" },
			],
		})
		vi.mocked(api.getLeaderboard).mockResolvedValue({
			leaders: [],
			total: 0,
		})
		vi.mocked(api.getRoundAndStage).mockResolvedValue({ round: 1, stage: 1 })

		const TestComponent = () => {
			const ctx = useSwarm()
			return (
				<div>
					<div data-testid="gossip-count">{ctx.gossipMessages()?.messages.length ?? 0}</div>
					<div data-testid="current-round">{ctx.currentRound()}</div>
				</div>
			)
		}

		const { findByTestId } = render(() => (
			<SwarmProvider>
				<TestComponent />
			</SwarmProvider>
		))

		// Wait for initial API calls to resolve
		await vi.advanceTimersByTimeAsync(0)

		// Check both the round and gossip count
		const currentRound = await findByTestId("current-round")
		const gossipCount = await findByTestId("gossip-count")

		expect(currentRound.textContent).toBe("1")
		expect(gossipCount.textContent).toBe("2")
	})
})
