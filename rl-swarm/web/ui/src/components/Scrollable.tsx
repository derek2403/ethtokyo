import { createSignal, onMount, onCleanup, ParentProps, Show } from "solid-js"

interface ScrollableProps extends ParentProps {
	class?: string
	ref?: (element: HTMLElement) => void
	hideScrollbar?: boolean
}

/**
 *  Scrollable wraps an element and adds a custom scrollbar.
 * @param props 
 * @returns 
 */
export default function Scrollable(props: ScrollableProps) {
	let containerRef: HTMLDivElement | undefined
	let thumbRef: HTMLDivElement | undefined
	let trackRef: HTMLDivElement | undefined
	const [isDragging, setIsDragging] = createSignal(false)
	const [startY, setStartY] = createSignal(0)
	const [startScrollTop, setStartScrollTop] = createSignal(0)
	const [thumbHeight, setThumbHeight] = createSignal(0)
	const [thumbTop, setThumbTop] = createSignal(0)

	const updateThumb = () => {
		if (!containerRef || !thumbRef || !trackRef) {
			return
		}
		
		const containerHeight = containerRef.clientHeight
		const contentHeight = containerRef.scrollHeight
		const scrollTop = containerRef.scrollTop
		
		// Calculate thumb height based on content ratio
		const thumbHeight = Math.max(20, (containerHeight / contentHeight) * containerHeight)
		setThumbHeight(thumbHeight)
		
		// Calculate thumb position
		const trackHeight = trackRef.clientHeight - thumbHeight
		const scrollRatio = scrollTop / (contentHeight - containerHeight)
		const thumbTop = scrollRatio * trackHeight
		setThumbTop(thumbTop)
	}

	const handleScroll = () => {
		updateThumb()
	}

	const handleThumbMouseDown = (e: MouseEvent) => {
		setIsDragging(true)
		setStartY(e.clientY)
		setStartScrollTop(containerRef?.scrollTop || 0)
	}

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging() || !containerRef || !trackRef) {
			return
		}
		
		const deltaY = e.clientY - startY()
		const trackHeight = trackRef.clientHeight - thumbHeight()
		const scrollRatio = deltaY / trackHeight
		const contentHeight = containerRef.scrollHeight - containerRef.clientHeight
		
		containerRef.scrollTop = startScrollTop() + (scrollRatio * contentHeight)
	}

	const handleMouseUp = () => {
		setIsDragging(false)
	}

	const scrollUp = () => {
		if (!containerRef) {
			return
		}

		containerRef.scrollTop -= 100
	}

	const scrollDown = () => {
		if (!containerRef) {
			return
		}

		containerRef.scrollTop += 100
	}

	onMount(() => {
		// Sets the ref to the container element so the child can access it.
		if (props.ref && containerRef) {
			props.ref(containerRef)
		}

		containerRef?.addEventListener('scroll', handleScroll)
		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('mouseup', handleMouseUp)
		updateThumb()
	})

	onCleanup(() => {
		containerRef?.removeEventListener('scroll', handleScroll)
		window.removeEventListener('mousemove', handleMouseMove)
		window.removeEventListener('mouseup', handleMouseUp)
	})

	return (
		<div class="relative">
			<div 
				ref={containerRef}
				class={`overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${props.class || ''}`}
				classList={{
					"select-none": isDragging()
				}}
			>
				{props.children}
			</div>
			
			{/* Custom scrollbar */}
			<Show when={!props.hideScrollbar}>
				<div class="absolute right-0 top-0 w-4 h-full flex flex-col">
					{/* Up button */}
					<button 
					class="w-full h-4 bg-gensyn-brown/10 hover:bg-gensyn-brown/20 flex items-center justify-center"
					onClick={scrollUp}
				>
					<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 15l-6-6-6 6"/>
					</svg>
				</button>

				{/* Track */}
				<div 
					ref={trackRef}
					class="flex-1 bg-gensyn-brown/5 relative"
				>
					{/* Thumb */}
					<div
						ref={thumbRef}
						class="absolute left-0 bg-gensyn-brown/20 hover:bg-gensyn-brown/30 cursor-pointer"
						style={{
							"width": "100%",
							"height": `${thumbHeight()}px`,
							"top": `${thumbTop()}px`
						}}
						onMouseDown={handleThumbMouseDown}
					/>
				</div>

				{/* Down button */}
				<button 
					class="w-full h-4 bg-gensyn-brown/10 hover:bg-gensyn-brown/20 flex items-center justify-center"
					onClick={scrollDown}
				>
					<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 9l6 6 6-6"/>
					</svg>
					</button>
				</div>
			</Show>
		</div>
	)
}
