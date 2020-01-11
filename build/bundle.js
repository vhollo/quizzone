
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
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
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

    /* src/Qtypeparosito.svelte generated by Svelte v3.16.7 */

    const file = "src/Qtypeparosito.svelte";

    function create_fragment(ctx) {
    	let div2;
    	let div0;
    	let figure0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let figure1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let figure2;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let figure3;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let figure4;
    	let img4;
    	let img4_src_value;
    	let t4;
    	let div1;
    	let figcaption0;
    	let t6;
    	let figcaption1;
    	let t8;
    	let figcaption2;
    	let t10;
    	let figcaption3;
    	let t12;
    	let figcaption4;
    	let t14;
    	let figure5;
    	let figcaption5;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			figure0 = element("figure");
    			img0 = element("img");
    			t0 = space();
    			figure1 = element("figure");
    			img1 = element("img");
    			t1 = space();
    			figure2 = element("figure");
    			img2 = element("img");
    			t2 = space();
    			figure3 = element("figure");
    			img3 = element("img");
    			t3 = space();
    			figure4 = element("figure");
    			img4 = element("img");
    			t4 = space();
    			div1 = element("div");
    			figcaption0 = element("figcaption");
    			figcaption0.textContent = "A) PEOPLE";
    			t6 = space();
    			figcaption1 = element("figcaption");
    			figcaption1.textContent = "B) NATURE";
    			t8 = space();
    			figcaption2 = element("figcaption");
    			figcaption2.textContent = "C) ANIMALS";
    			t10 = space();
    			figcaption3 = element("figcaption");
    			figcaption3.textContent = "D) TRANSPORT";
    			t12 = space();
    			figcaption4 = element("figcaption");
    			figcaption4.textContent = "E) CITY";
    			t14 = space();
    			figure5 = element("figure");
    			figcaption5 = element("figcaption");
    			if (img0.src !== (img0_src_value = "/images/city.jpeg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "1");
    			add_location(img0, file, 83, 4, 2244);
    			attr_dev(figure0, "class", "svelte-1vzmluh");
    			add_location(figure0, file, 82, 3, 2210);
    			if (img1.src !== (img1_src_value = "/images/transport.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "2");
    			add_location(img1, file, 86, 4, 2332);
    			attr_dev(figure1, "class", "svelte-1vzmluh");
    			add_location(figure1, file, 85, 3, 2298);
    			if (img2.src !== (img2_src_value = "/images/animals.jpeg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "3");
    			add_location(img2, file, 89, 4, 2425);
    			attr_dev(figure2, "class", "svelte-1vzmluh");
    			add_location(figure2, file, 88, 3, 2391);
    			if (img3.src !== (img3_src_value = "/images/nature.jpeg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "4");
    			add_location(img3, file, 92, 4, 2516);
    			attr_dev(figure3, "class", "svelte-1vzmluh");
    			add_location(figure3, file, 91, 3, 2482);
    			if (img4.src !== (img4_src_value = "/images/people.jpeg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "5");
    			add_location(img4, file, 95, 4, 2606);
    			attr_dev(figure4, "class", "svelte-1vzmluh");
    			add_location(figure4, file, 94, 3, 2572);
    			attr_dev(div0, "id", "qs");
    			attr_dev(div0, "class", "svelte-1vzmluh");
    			add_location(div0, file, 81, 2, 2168);
    			attr_dev(figcaption0, "draggable", "true");
    			attr_dev(figcaption0, "id", "txt-1");
    			attr_dev(figcaption0, "class", "svelte-1vzmluh");
    			add_location(figcaption0, file, 99, 3, 2698);
    			attr_dev(figcaption1, "draggable", "true");
    			attr_dev(figcaption1, "id", "txt-2");
    			attr_dev(figcaption1, "class", "svelte-1vzmluh");
    			add_location(figcaption1, file, 100, 3, 2784);
    			attr_dev(figcaption2, "draggable", "true");
    			attr_dev(figcaption2, "id", "txt-3");
    			attr_dev(figcaption2, "class", "svelte-1vzmluh");
    			add_location(figcaption2, file, 101, 3, 2870);
    			attr_dev(figcaption3, "draggable", "true");
    			attr_dev(figcaption3, "id", "txt-4");
    			attr_dev(figcaption3, "class", "svelte-1vzmluh");
    			add_location(figcaption3, file, 102, 3, 2957);
    			attr_dev(figcaption4, "draggable", "true");
    			attr_dev(figcaption4, "id", "txt-5");
    			attr_dev(figcaption4, "class", "svelte-1vzmluh");
    			add_location(figcaption4, file, 103, 3, 3046);
    			attr_dev(div1, "id", "as");
    			attr_dev(div1, "class", "as svelte-1vzmluh");
    			add_location(div1, file, 98, 2, 2670);
    			add_location(div2, file, 80, 1, 2094);
    			attr_dev(figcaption5, "class", "txt svelte-1vzmluh");
    			add_location(figcaption5, file, 106, 16, 3160);
    			figure5.hidden = true;
    			attr_dev(figure5, "class", "svelte-1vzmluh");
    			add_location(figure5, file, 106, 1, 3145);

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
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, figure0);
    			append_dev(figure0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, figure1);
    			append_dev(figure1, img1);
    			append_dev(div0, t1);
    			append_dev(div0, figure2);
    			append_dev(figure2, img2);
    			append_dev(div0, t2);
    			append_dev(div0, figure3);
    			append_dev(figure3, img3);
    			append_dev(div0, t3);
    			append_dev(div0, figure4);
    			append_dev(figure4, img4);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, figcaption0);
    			append_dev(div1, t6);
    			append_dev(div1, figcaption1);
    			append_dev(div1, t8);
    			append_dev(div1, figcaption2);
    			append_dev(div1, t10);
    			append_dev(div1, figcaption3);
    			append_dev(div1, t12);
    			append_dev(div1, figcaption4);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, figure5, anchor);
    			append_dev(figure5, figcaption5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(figure5);
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
    		} else {
    			document.getElementById("as").appendChild(el);
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

    		el.querySelector("img").style.outline = getComputedStyle(document.documentElement).getPropertyValue("--outline-selected");
    		selected = el;
    	}

    	function _blurEls() {
    		let old = document.getElementById("qs").querySelectorAll("img");
    		for (let o of old) o.style.outline = "";
    		selected = null;
    	}

    	function _blurFig(ev) {
    		ev.cancelBubble = true;
    		ev.preventDefault();
    		_blurEls();
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
    		} else {
    			document.getElementById("as").appendChild(el);
    		}
    	}

    	function _dragover(e) {
    		e.preventDefault();

    		if (e.dataTransfer.getData("text") || true) {
    			let el = e.target;
    			_blurEls();
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

    class Qtypeparosito extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Qtypeparosito",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.7 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let main;
    	let t4;
    	let footer;
    	let h6;
    	let current;
    	const qtypeparosito = new Qtypeparosito({ $$inline: true });

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
    			create_component(qtypeparosito.$$.fragment);
    			t4 = space();
    			footer = element("footer");
    			h6 = element("h6");
    			h6.textContent = "2020. január";
    			add_location(h1, file$1, 9, 1, 152);
    			add_location(p, file$1, 10, 1, 182);
    			add_location(header, file$1, 8, 0, 142);
    			attr_dev(main, "id", "questions");
    			add_location(main, file$1, 13, 0, 302);
    			add_location(h6, file$1, 18, 1, 361);
    			add_location(footer, file$1, 17, 0, 351);
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
    			mount_component(qtypeparosito, main, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, h6);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(qtypeparosito.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(qtypeparosito.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(main);
    			destroy_component(qtypeparosito);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
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
