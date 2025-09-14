import { JSXElement } from "solid-js"

type ModalProps = {
	message: string | JSXElement
}

export default function Modal(props: ModalProps) {
	return (
		<aside data-testid="swarm-modal" class="fixed inset-0 flex items-center justify-center bg-black/20">
			<div class="bg-[#fcc6be] text-[#2A0D04] w-[80vw] md:w-[30vw] text-center p-8 [box-shadow:8px_8px_0px_#2A0D04] border border-[#2A0D04]">
				<p class="uppercase">{props.message}</p>
			</div>
		</aside>
	)
}
