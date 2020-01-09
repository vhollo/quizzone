
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function self(fn) {
        return function (event) {
            // @ts-ignore
            if (event.target === this)
                fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/App.svelte generated by Svelte v3.16.7 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let main;
    	let div2;
    	let div0;
    	let figure0;
    	let img0;
    	let img0_src_value;
    	let span0;
    	let t5;
    	let figure1;
    	let img1;
    	let img1_src_value;
    	let span1;
    	let t7;
    	let figure2;
    	let img2;
    	let img2_src_value;
    	let span2;
    	let t9;
    	let figure3;
    	let img3;
    	let img3_src_value;
    	let span3;
    	let t11;
    	let figure4;
    	let img4;
    	let img4_src_value;
    	let span4;
    	let t13;
    	let div1;
    	let figcaption0;
    	let t15;
    	let figcaption1;
    	let t17;
    	let figcaption2;
    	let t19;
    	let figcaption3;
    	let t21;
    	let figcaption4;
    	let t23;
    	let footer;
    	let h6;
    	let dispose;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Quizzone experiment";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Nem vagyunk \"bezárva\" egy képernyőbe, mint a projektoron! Scrollozhatunk! Drag & drop! Select & pair!";
    			t3 = space();
    			main = element("main");
    			div2 = element("div");
    			div0 = element("div");
    			figure0 = element("figure");
    			img0 = element("img");
    			span0 = element("span");
    			span0.textContent = "1";
    			t5 = space();
    			figure1 = element("figure");
    			img1 = element("img");
    			span1 = element("span");
    			span1.textContent = "2";
    			t7 = space();
    			figure2 = element("figure");
    			img2 = element("img");
    			span2 = element("span");
    			span2.textContent = "3";
    			t9 = space();
    			figure3 = element("figure");
    			img3 = element("img");
    			span3 = element("span");
    			span3.textContent = "4";
    			t11 = space();
    			figure4 = element("figure");
    			img4 = element("img");
    			span4 = element("span");
    			span4.textContent = "5";
    			t13 = space();
    			div1 = element("div");
    			figcaption0 = element("figcaption");
    			figcaption0.textContent = "A) PEOPLE";
    			t15 = space();
    			figcaption1 = element("figcaption");
    			figcaption1.textContent = "B) NATURE";
    			t17 = space();
    			figcaption2 = element("figcaption");
    			figcaption2.textContent = "C) ANIMALS";
    			t19 = space();
    			figcaption3 = element("figcaption");
    			figcaption3.textContent = "D) TRANSPORT";
    			t21 = space();
    			figcaption4 = element("figcaption");
    			figcaption4.textContent = "E) CITY";
    			t23 = space();
    			footer = element("footer");
    			h6 = element("h6");
    			h6.textContent = "2020. január";
    			add_location(h1, file, 77, 1, 1991);
    			add_location(p, file, 78, 1, 2021);
    			add_location(header, file, 76, 0, 1981);
    			if (img0.src !== (img0_src_value = "/images/city.jpeg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "1");
    			add_location(img0, file, 85, 4, 2365);
    			attr_dev(span0, "class", "svelte-11iuysj");
    			add_location(span0, file, 85, 41, 2402);
    			attr_dev(figure0, "class", "fig svelte-11iuysj");
    			add_location(figure0, file, 84, 3, 2319);
    			if (img1.src !== (img1_src_value = "/images/transport.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "2");
    			add_location(img1, file, 87, 4, 2475);
    			attr_dev(span1, "class", "svelte-11iuysj");
    			add_location(span1, file, 87, 46, 2517);
    			attr_dev(figure1, "class", "fig svelte-11iuysj");
    			add_location(figure1, file, 86, 3, 2429);
    			if (img2.src !== (img2_src_value = "/images/animals.jpeg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "3");
    			add_location(img2, file, 90, 4, 2594);
    			attr_dev(span2, "class", "svelte-11iuysj");
    			add_location(span2, file, 90, 44, 2634);
    			attr_dev(figure2, "class", "fig svelte-11iuysj");
    			add_location(figure2, file, 89, 3, 2548);
    			if (img3.src !== (img3_src_value = "/images/nature.jpeg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "4");
    			add_location(img3, file, 93, 4, 2711);
    			attr_dev(span3, "class", "svelte-11iuysj");
    			add_location(span3, file, 93, 43, 2750);
    			attr_dev(figure3, "class", "fig svelte-11iuysj");
    			add_location(figure3, file, 92, 3, 2665);
    			if (img4.src !== (img4_src_value = "/images/people.jpeg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "5");
    			add_location(img4, file, 96, 4, 2827);
    			attr_dev(span4, "class", "svelte-11iuysj");
    			add_location(span4, file, 96, 43, 2866);
    			attr_dev(figure4, "class", "fig svelte-11iuysj");
    			add_location(figure4, file, 95, 3, 2781);
    			attr_dev(div0, "id", "qs");
    			attr_dev(div0, "class", "svelte-11iuysj");
    			add_location(div0, file, 83, 2, 2275);
    			attr_dev(figcaption0, "draggable", "true");
    			attr_dev(figcaption0, "class", "txt svelte-11iuysj");
    			attr_dev(figcaption0, "id", "txt-1");
    			add_location(figcaption0, file, 100, 3, 2933);
    			attr_dev(figcaption1, "draggable", "true");
    			attr_dev(figcaption1, "class", "txt svelte-11iuysj");
    			attr_dev(figcaption1, "id", "txt-2");
    			add_location(figcaption1, file, 101, 3, 3033);
    			attr_dev(figcaption2, "draggable", "true");
    			attr_dev(figcaption2, "class", "txt svelte-11iuysj");
    			attr_dev(figcaption2, "id", "txt-3");
    			add_location(figcaption2, file, 102, 3, 3133);
    			attr_dev(figcaption3, "draggable", "true");
    			attr_dev(figcaption3, "class", "txt svelte-11iuysj");
    			attr_dev(figcaption3, "id", "txt-4");
    			add_location(figcaption3, file, 103, 3, 3234);
    			attr_dev(figcaption4, "draggable", "true");
    			attr_dev(figcaption4, "class", "txt svelte-11iuysj");
    			attr_dev(figcaption4, "id", "txt-5");
    			add_location(figcaption4, file, 104, 3, 3337);
    			attr_dev(div1, "id", "as");
    			attr_dev(div1, "class", "as svelte-11iuysj");
    			add_location(div1, file, 99, 2, 2905);
    			attr_dev(div2, "class", "parosito svelte-11iuysj");
    			attr_dev(div2, "id", "dragdrop");
    			add_location(div2, file, 82, 1, 2164);
    			attr_dev(main, "id", "questions");
    			add_location(main, file, 81, 0, 2141);
    			add_location(h6, file, 110, 1, 3468);
    			add_location(footer, file, 109, 0, 3458);

    			dispose = [
    				listen_dev(figure0, "click", /*_focusFig*/ ctx[0], false, false, false),
    				listen_dev(figure1, "click", /*_focusFig*/ ctx[0], false, false, false),
    				listen_dev(figure2, "click", /*_focusFig*/ ctx[0], false, false, false),
    				listen_dev(figure3, "click", /*_focusFig*/ ctx[0], false, false, false),
    				listen_dev(figure4, "click", /*_focusFig*/ ctx[0], false, false, false),
    				listen_dev(div0, "click", self(/*_blurFig*/ ctx[1]), false, false, false),
    				listen_dev(figcaption0, "click", /*_moveTxt*/ ctx[2], false, false, false),
    				listen_dev(figcaption1, "click", /*_moveTxt*/ ctx[2], false, false, false),
    				listen_dev(figcaption2, "click", /*_moveTxt*/ ctx[2], false, false, false),
    				listen_dev(figcaption3, "click", /*_moveTxt*/ ctx[2], false, false, false),
    				listen_dev(figcaption4, "click", /*_moveTxt*/ ctx[2], false, false, false),
    				listen_dev(div2, "drop", _drop, false, false, false),
    				listen_dev(div2, "dragstart", _dragstart, false, false, false),
    				listen_dev(div2, "dragover", /*_dragover*/ ctx[3], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, p);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, div0);
    			append_dev(div0, figure0);
    			append_dev(figure0, img0);
    			append_dev(figure0, span0);
    			append_dev(div0, t5);
    			append_dev(div0, figure1);
    			append_dev(figure1, img1);
    			append_dev(figure1, span1);
    			append_dev(div0, t7);
    			append_dev(div0, figure2);
    			append_dev(figure2, img2);
    			append_dev(figure2, span2);
    			append_dev(div0, t9);
    			append_dev(div0, figure3);
    			append_dev(figure3, img3);
    			append_dev(figure3, span3);
    			append_dev(div0, t11);
    			append_dev(div0, figure4);
    			append_dev(figure4, img4);
    			append_dev(figure4, span4);
    			append_dev(div2, t13);
    			append_dev(div2, div1);
    			append_dev(div1, figcaption0);
    			append_dev(div1, t15);
    			append_dev(div1, figcaption1);
    			append_dev(div1, t17);
    			append_dev(div1, figcaption2);
    			append_dev(div1, t19);
    			append_dev(div1, figcaption3);
    			append_dev(div1, t21);
    			append_dev(div1, figcaption4);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, h6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(footer);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function _dragstart(e) {
    	e.dataTransfer.setData("text", e.target.id);
    	e.dataTransfer.dropEffect = "copy";
    	console.log("_dragstart", e.dataTransfer.getData("text"));
    }

    function _drop(e) {
    	e.preventDefault();
    	let el = document.getElementById(e.dataTransfer.getData("text"));

    	if (el && el.tagName == "FIGCAPTION") {
    		let selected = e.target.parentNode;

    		if (selected.tagName == "FIGURE") {
    			let old = selected.querySelector("figcaption");
    			if (old) document.getElementById("as").appendChild(old);
    			selected.appendChild(el);
    		}
    	}
    }

    function instance($$self) {
    	var selected;

    	function _focusFig(e) {
    		let el = e;

    		if (e.currentTarget) {
    			e.cancelBubble = true;
    			e.preventDefault();
    			el = e.currentTarget;
    		}

    		let old = el.parentNode.querySelectorAll("img");

    		if (old) {
    			for (let o of old) {
    				o.style.outline = "";
    			}
    		}

    		el.querySelector("img").style.outline = "dashed 4px white";
    		selected = el;
    	}

    	function _blurFig(ev) {
    		ev.cancelBubble = true;
    		ev.preventDefault();
    		let old = ev.target.querySelectorAll("img");
    		for (let o of old) o.style.outline = "";
    		selected = null;
    	}

    	function _moveTxt(e) {
    		let el = e.target;

    		if (selected && selected.tagName == "FIGURE") {
    			let old = selected.querySelector("figcaption");
    			if (old) document.getElementById("as").appendChild(old);

    			if (old != el) {
    				selected.appendChild(el);
    				if (selected.nextElementSibling) _focusFig(selected.nextElementSibling); else _focusFig(selected.parentNode.firstElementChild);
    			}
    		}
    	}

    	function _dragover(e) {
    		e.preventDefault();
    		console.log("_dragover", e.dataTransfer.getData("text"));

    		if (e.dataTransfer.getData("text") || true) {
    			let el = e.target;
    			if (el.tagName == "FIGURE") _focusFig(el);
    			if (el.parentNode.tagName == "FIGURE") _focusFig(el.parentNode);
    		}
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("selected" in $$props) selected = $$props.selected;
    	};

    	return [_focusFig, _blurFig, _moveTxt, _dragover];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
