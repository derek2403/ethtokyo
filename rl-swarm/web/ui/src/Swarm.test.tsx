import { render, waitFor } from "@solidjs/testing-library"
import Swarm from "./Swarm"
import { SwarmProvider } from "./SwarmContext"
import { vi, afterEach, beforeEach, describe, expect, it } from "vitest"
import api from "./swarm.api"

vi.mock("./swarm.api", () => ({
	default: {
		getGossip: vi.fn(),
		getRoundAndStage: vi.fn(),
		getLeaderboardCumulative: vi.fn(),
	},
}))

describe("Swarm", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("should render gossip messages", async () => {
		const firstRes = {
			messages: [
				{ id: "nodea_1_1", message: "foo1", node: "nodea" },
				{ id: "nodeb_1_1", message: "bar1", node: "nodeb" },
			],
		}
		const secondRes = {
			messages: [
				{ id: "nodea_1_1", message: "foo1", node: "nodea" },
				{ id: "nodea_1_2", message: "foo2", node: "nodea" },
				{ id: "nodeb_1_1", message: "bar1", node: "nodeb" },
				{ id: "nodeb_1_2", message: "bar2", node: "nodeb" },
			],
		}

		const getLeaderboardSpy = vi.spyOn(api, "getLeaderboardCumulative")
		const getGossipSpy = vi.spyOn(api, "getGossip")

		getGossipSpy.mockResolvedValueOnce(firstRes).mockResolvedValueOnce(secondRes)
		getLeaderboardSpy.mockResolvedValue({
			leaders: [{ id: "node1", nickname: "nn1", participation: 1, cumulativeReward: 0, lastScore: 1 }],
			rewards: [],
			totalPeers: 1,
		})

		const result = render(() => (
			<SwarmProvider>
				<Swarm />
			</SwarmProvider>
		))

		await vi.advanceTimersByTimeAsync(0)

		// On mount we expect the APIs to have resolved.
		expect(getGossipSpy).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(result.queryAllByText("foo1")).toHaveLength(1)
			expect(result.queryAllByText("bar1")).toHaveLength(1)
		})

		vi.advanceTimersByTime(10_000)

		expect(getGossipSpy).toHaveBeenCalledTimes(2)

		// Results are de-duplicated.
		await waitFor(() => {
			expect(result.queryAllByText("foo1")).toHaveLength(1)
			expect(result.queryAllByText("foo2")).toHaveLength(1)
			expect(result.queryAllByText("bar1")).toHaveLength(1)
			expect(result.queryAllByText("bar2")).toHaveLength(1)
		})
	})

	it("should display round and stage information", async () => {
		const getLeaderboardSpy = vi.spyOn(api, "getLeaderboardCumulative")
		const getGossipSpy = vi.spyOn(api, "getGossip")
		const getRoundAndStageSpy = vi.spyOn(api, "getRoundAndStage")

		getGossipSpy.mockResolvedValue({ messages: [] })
		getLeaderboardSpy.mockResolvedValue({
			leaders: [{ id: "node1", nickname: "nn1", participation: 1, cumulativeReward: 0, lastScore: 1 }],
			rewards: [],
			totalPeers: 1,
		})
		getRoundAndStageSpy.mockResolvedValue({ round: 5, stage: 3 })

		const result = render(() => (
			<SwarmProvider>
				<Swarm />
			</SwarmProvider>
		))

		await waitFor(() => {
			const header = result.getByText("Round: 5 Stage: 3")
			expect(header).toBeTruthy()
		})
	})

	it("should handle gossip message updates", async () => {
		const getLeaderboardSpy = vi.spyOn(api, "getLeaderboardCumulative")
		const getGossipSpy = vi.spyOn(api, "getGossip")
		const getRoundAndStageSpy = vi.spyOn(api, "getRoundAndStage")

		getLeaderboardSpy.mockResolvedValue({
			leaders: [{ id: "node1", nickname: "nn1", participation: 1, cumulativeReward: 0, lastScore: 1 }],
			rewards: [],
			totalPeers: 1,
		})
		getRoundAndStageSpy.mockResolvedValue({ round: 1, stage: 1 })

		// Initial messages
		getGossipSpy.mockResolvedValueOnce({
			messages: [{ id: "msg1", message: "Initial message", node: "node1" }],
		})

		// Updated messages
		getGossipSpy.mockResolvedValueOnce({
			messages: [
				{ id: "msg1", message: "Initial message", node: "node1" },
				{ id: "msg2", message: "New message", node: "node2" },
			],
		})

		const result = render(() => (
			<SwarmProvider>
				<Swarm />
			</SwarmProvider>
		))

		await waitFor(() => {
			const initialMessage = result.getByText("Initial message")
			expect(initialMessage).toBeTruthy()
		})

		vi.advanceTimersByTime(10_000)

		await waitFor(() => {
			const newMessage = result.getByText("New message")
			expect(newMessage).toBeTruthy()
		})
	})
})
