<svelte:options tag="my-app"/>
<script>
	import Qtypeparosito from './Qtypeparosito.svelte';
/* 
svelte-loadable
https://www.npmjs.com/package/svelte-loadable
*/
</script>

<header>
	<h1>Quizzone experiment?</h1>
	<p>Nem vagyunk "bezárva" egy képernyőbe, mint a projektoron! Scrollozhatunk! Drag & drop! Select & pair!</p>
</header>

<main id="questions">
	<Qtypeparosito/>
</main>

<footer>
	<h6>2020. január</h6>
</footer>