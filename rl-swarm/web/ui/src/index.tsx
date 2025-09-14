/* @refresh reload */
import { render } from "solid-js/web"
import "./index.css"
import Swarm from "./Swarm.tsx"
import { SwarmProvider } from "./SwarmContext"

const root = document.getElementById("root")

render(
	() => (
		<SwarmProvider>
			<Swarm />
		</SwarmProvider>
	),
	root!,
)
