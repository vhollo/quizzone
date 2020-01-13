<svelte:options tag="qtype-parosito"/>
<script>
	//export let name;
	var selected;

	function _focusFig(e) {
		let el = e 
		if (e.currentTarget) {
			e.cancelBubble = true;
			e.preventDefault();
			el = e.currentTarget
		}
		_blurEls()
		el.querySelector('img').style.outline = getComputedStyle(document.documentElement).getPropertyValue('--outline-selected')
		selected = el
	}

	function _blurEls() {
		let old = document.getElementById('qs').querySelectorAll('img')
		for (let o of old) o.style.outline = ''
		selected = null
	}

	function _blurFig(ev) {
		ev.cancelBubble = true;
		ev.preventDefault();
		_blurEls()
	}

	function _moveTxt(e) {
		let el = e.target
		if (selected && selected.tagName == 'FIGURE') {
			let old = selected.querySelector('figcaption');
			if (old) document.getElementById('as').appendChild(old);
			if (old != el) {
				selected.appendChild(el);
				if (selected.nextElementSibling) _focusFig(selected.nextElementSibling)
				else _focusFig(selected.parentNode.firstElementChild)
			}
		} else {
			document.getElementById('as').appendChild(el);
		}
	}

	function _dragover(e) {
		e.preventDefault();
//console.log('_dragover',e.dataTransfer.getData("text"))/* miért nincs meg a text? */
		if (e.dataTransfer.getData("text") || true) {
			let el = e.target
			_blurEls()
			if (el.tagName == 'FIGURE') /* console.log(e); */_focusFig(el)
			if (el.parentNode.tagName == 'FIGURE') _focusFig(el.parentNode)
		}
	}
	
	function _dragstart(e) {
		e.dataTransfer.setData("text", e.target.id);
		e.dataTransfer.dropEffect = "copy";
	}
	
	function _drop(e) {
		e.preventDefault();
		let el = document.getElementById(e.dataTransfer.getData("text"))
		if (el && el.tagName == 'FIGCAPTION') {
			let selected = e.target.parentNode
			if (selected.tagName == 'FIGURE') {
				let old = selected.querySelector('figcaption')
				if (old) document.getElementById('as').appendChild(old)
				selected.appendChild(el)
				if (selected.nextElementSibling) _focusFig(selected.nextElementSibling)
				else _focusFig(selected.parentNode.firstElementChild)
			} else {
				document.getElementById('as').appendChild(el)
			}
		}
	}
</script>

	<div on:drop={_drop} on:dragstart={_dragstart} on:dragover={_dragover}>
		<div id="qs" on:click|self={_blurFig}>
			<figure on:click={_focusFig}>
				<img src="/images/city.jpeg" alt="1">
			</figure>
			<figure on:click={_focusFig}>
				<img src="/images/transport.jpeg" alt="2">
			</figure>
			<figure on:click={_focusFig}>
				<img src="/images/animals.jpeg" alt="3">
			</figure>
			<figure on:click={_focusFig}>
				<img src="/images/nature.jpeg" alt="4">
			</figure>
			<figure on:click={_focusFig}>
				<img src="/images/people.jpeg" alt="5">
			</figure>
		</div>
		<div id="as" class="as">
			<figcaption draggable="true" id="txt-1" on:click={_moveTxt}>A) PEOPLE</figcaption>
			<figcaption draggable="true" id="txt-2" on:click={_moveTxt}>B) NATURE</figcaption>
			<figcaption draggable="true" id="txt-3" on:click={_moveTxt}>C) ANIMALS</figcaption>
			<figcaption draggable="true" id="txt-4" on:click={_moveTxt}>D) TRANSPORT</figcaption>
			<figcaption draggable="true" id="txt-5" on:click={_moveTxt}>E) CITY</figcaption>
		</div>
	</div>
	<!-- <figure hidden><figcaption class="txt"></figcaption></figure> -->
<style>
	#qs, #as {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-evenly;
		width: 100%;
	}
	#qs {
		padding: 2rem 0;
		counter-reset: qnum;
	}
	#as {
		position: sticky;
		bottom: 1rem;
	}
	#as::before {
  content: '';
  position: absolute;
  width: 100%; 
  height: 100%;  
  opacity: .4; 
  z-index: -1;
	background-color: var(--theme-color, orange);
	}


	figure {
		position: relative;
		margin: 1%;
		width: 31%;
	}
	figure::after {
		counter-increment: qnum;
		content: counter(qnum);
		position: absolute;
		left: -.25rem;
		top: 1rem;
		outline: solid 2px white;
		width: 2rem;
		text-align: center;
		background: var(--theme-color, orange);
		color: white;
	}

	figcaption {
		flex-grow: 1;
		max-width: 31%;
		margin: .5rem 1%;
		padding: 0 .5rem;
		outline: solid 2px white;
		text-align: center;
		background: var(--theme-color, orange);
		color: white;
	}

	@media screen and (orientation:portrait) {
		figure {
			margin: 1%;
			width: 46%;
		}
		figcaption {
			max-width: 46%;
		}
	}

	/* párosítás után */
	figure :global(figcaption) {
		position: absolute;
		margin: 0 -.25rem;
		width: fit-content;
		max-width: unset;
		bottom: 1rem;
	}

</style>