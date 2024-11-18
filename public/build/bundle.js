
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1, console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (89:6) {:else}
    function create_else_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Get Prediction");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(89:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (87:6) {#if isLoading}
    function create_if_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Loading...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(87:6) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    // (95:2) {#if prediction}
    function create_if_block_3(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let p;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Prediction Result:";
    			t1 = space();
    			p = element("p");
    			t2 = text(/*prediction*/ ctx[0]);
    			add_location(h2, file, 96, 6, 2603);
    			add_location(p, file, 97, 6, 2637);
    			attr_dev(div, "class", "result svelte-topaqz");
    			add_location(div, file, 95, 4, 2576);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prediction*/ 1) set_data_dev(t2, /*prediction*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(95:2) {#if prediction}",
    		ctx
    	});

    	return block;
    }

    // (102:2) {#if errorMessage}
    function create_if_block_2(ctx) {
    	let div;
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(/*errorMessage*/ ctx[5]);
    			attr_dev(p, "class", "svelte-topaqz");
    			add_location(p, file, 103, 6, 2768);
    			attr_dev(div, "class", "error svelte-topaqz");
    			add_location(div, file, 102, 4, 2742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errorMessage*/ 32) set_data_dev(t, /*errorMessage*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(102:2) {#if errorMessage}",
    		ctx
    	});

    	return block;
    }

    // (120:6) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Get Feedback");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(120:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (118:6) {#if isLoading}
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Loading...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(118:6) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    // (126:2) {#if saved_feedbacks.length > 0}
    function create_if_block(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let ul;
    	let each_value = /*saved_feedbacks*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Feedback:";
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h2, file, 127, 6, 3444);
    			add_location(ul, file, 128, 6, 3469);
    			attr_dev(div, "class", "feedback-list");
    			add_location(div, file, 126, 4, 3410);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*saved_feedbacks*/ 4) {
    				each_value = /*saved_feedbacks*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(126:2) {#if saved_feedbacks.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (130:8) {#each saved_feedbacks as feedback}
    function create_each_block(ctx) {
    	let li;
    	let strong0;
    	let t0;
    	let t1_value = /*feedback*/ ctx[6].id + "";
    	let t1;
    	let br;
    	let t2;
    	let strong1;
    	let t4;
    	let t5_value = /*feedback*/ ctx[6].content + "";
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			li = element("li");
    			strong0 = element("strong");
    			t0 = text("Feedback ID: ");
    			t1 = text(t1_value);
    			br = element("br");
    			t2 = space();
    			strong1 = element("strong");
    			strong1.textContent = "Content:";
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			add_location(strong0, file, 131, 12, 3545);
    			add_location(br, file, 131, 55, 3588);
    			add_location(strong1, file, 132, 12, 3605);
    			add_location(li, file, 130, 10, 3528);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, strong0);
    			append_dev(strong0, t0);
    			append_dev(strong0, t1);
    			append_dev(li, br);
    			append_dev(li, t2);
    			append_dev(li, strong1);
    			append_dev(li, t4);
    			append_dev(li, t5);
    			append_dev(li, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*saved_feedbacks*/ 4 && t1_value !== (t1_value = /*feedback*/ ctx[6].id + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*saved_feedbacks*/ 4 && t5_value !== (t5_value = /*feedback*/ ctx[6].content + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(130:8) {#each saved_feedbacks as feedback}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let input0;
    	let t2;
    	let button0;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let h2;
    	let t7;
    	let textarea;
    	let t8;
    	let button1;
    	let t10;
    	let div2;
    	let label;
    	let t12;
    	let input1;
    	let t13;
    	let button2;
    	let t14;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*isLoading*/ ctx[4]) return create_if_block_4;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*prediction*/ ctx[0] && create_if_block_3(ctx);
    	let if_block2 = /*errorMessage*/ ctx[5] && create_if_block_2(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*isLoading*/ ctx[4]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block3 = current_block_type_1(ctx);
    	let if_block4 = /*saved_feedbacks*/ ctx[2].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Prediction App";
    			t1 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			button0 = element("button");
    			if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Submit Feedback";
    			t7 = space();
    			textarea = element("textarea");
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Submit Feedback";
    			t10 = space();
    			div2 = element("div");
    			label = element("label");
    			label.textContent = "User ID:";
    			t12 = space();
    			input1 = element("input");
    			t13 = space();
    			button2 = element("button");
    			if_block3.c();
    			t14 = space();
    			if (if_block4) if_block4.c();
    			add_location(h1, file, 82, 2, 2268);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Enter your input");
    			attr_dev(input0, "class", "svelte-topaqz");
    			add_location(input0, file, 84, 4, 2304);
    			button0.disabled = /*isLoading*/ ctx[4];
    			attr_dev(button0, "class", "svelte-topaqz");
    			add_location(button0, file, 85, 4, 2384);
    			add_location(div0, file, 83, 2, 2294);
    			add_location(h2, file, 108, 4, 2885);
    			attr_dev(textarea, "placeholder", "Enter your feedback");
    			attr_dev(textarea, "class", "svelte-topaqz");
    			add_location(textarea, file, 109, 4, 2914);
    			attr_dev(button1, "class", "svelte-topaqz");
    			add_location(button1, file, 110, 4, 2996);
    			attr_dev(div1, "class", "feedback-section svelte-topaqz");
    			add_location(div1, file, 107, 2, 2850);
    			attr_dev(label, "for", "userId");
    			add_location(label, file, 114, 4, 3077);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "id", "userId");
    			attr_dev(input1, "placeholder", "Enter user ID");
    			attr_dev(input1, "class", "svelte-topaqz");
    			add_location(input1, file, 115, 4, 3118);
    			button2.disabled = /*isLoading*/ ctx[4];
    			attr_dev(button2, "class", "svelte-topaqz");
    			add_location(button2, file, 116, 4, 3206);
    			add_location(div2, file, 113, 4, 3067);
    			attr_dev(main, "class", "svelte-topaqz");
    			add_location(main, file, 81, 0, 2259);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*inputText*/ ctx[1]);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			if_block0.m(button0, null);
    			append_dev(main, t3);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t4);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t5);
    			append_dev(main, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t7);
    			append_dev(div1, textarea);
    			set_input_value(textarea, /*feedback*/ ctx[6]);
    			append_dev(div1, t8);
    			append_dev(div1, button1);
    			append_dev(main, t10);
    			append_dev(main, div2);
    			append_dev(div2, label);
    			append_dev(div2, t12);
    			append_dev(div2, input1);
    			set_input_value(input1, /*userId*/ ctx[3]);
    			append_dev(div2, t13);
    			append_dev(div2, button2);
    			if_block3.m(button2, null);
    			append_dev(main, t14);
    			if (if_block4) if_block4.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(button0, "click", /*getPrediction*/ ctx[7], false, false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[11]),
    					listen_dev(button1, "click", /*sendFeedback*/ ctx[8], false, false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[12]),
    					listen_dev(button2, "click", /*getFeedback*/ ctx[9], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inputText*/ 2 && input0.value !== /*inputText*/ ctx[1]) {
    				set_input_value(input0, /*inputText*/ ctx[1]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(button0, null);
    				}
    			}

    			if (dirty & /*isLoading*/ 16) {
    				prop_dev(button0, "disabled", /*isLoading*/ ctx[4]);
    			}

    			if (/*prediction*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(main, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*errorMessage*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_2(ctx);
    					if_block2.c();
    					if_block2.m(main, t5);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*feedback*/ 64) {
    				set_input_value(textarea, /*feedback*/ ctx[6]);
    			}

    			if (dirty & /*userId*/ 8 && to_number(input1.value) !== /*userId*/ ctx[3]) {
    				set_input_value(input1, /*userId*/ ctx[3]);
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
    				if_block3.d(1);
    				if_block3 = current_block_type_1(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(button2, null);
    				}
    			}

    			if (dirty & /*isLoading*/ 16) {
    				prop_dev(button2, "disabled", /*isLoading*/ ctx[4]);
    			}

    			if (/*saved_feedbacks*/ ctx[2].length > 0) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block(ctx);
    					if_block4.c();
    					if_block4.m(main, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			if (if_block4) if_block4.d();
    			mounted = false;
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let prediction = "";
    	let inputText = "";
    	let feedback = "";
    	let saved_feedbacks = [];
    	let userId = 1; // Example user ID (replace with actual dynamic value)
    	let isLoading = false;
    	let errorMessage = "";

    	// Function to call the /predict API
    	async function getPrediction() {
    		$$invalidate(4, isLoading = true);
    		$$invalidate(5, errorMessage = "");

    		try {
    			const response = await fetch('http://127.0.0.1:8081/predict', {
    				method: 'POST',
    				headers: {
    					'Content-Type': 'application/json',
    					'accept': 'application/json'
    				},
    				body: JSON.stringify({ text: inputText })
    			});

    			const data = await response.json();

    			// Debugging: Check what data is returned from the API
    			console.log("API Response:", data);

    			// Check if the response contains the sentiment data
    			if (data && data.label && data.score) {
    				$$invalidate(0, prediction = `Sentiment: ${data.label}, Confidence: ${data.score.toFixed(2)}`);
    			} else {
    				$$invalidate(5, errorMessage = "No prediction result returned.");
    			}
    		} catch(error) {
    			$$invalidate(5, errorMessage = "Failed to fetch prediction. Please try again.");
    		} finally {
    			$$invalidate(4, isLoading = false);
    		}
    	}

    	// Function to send feedback to the /submit-feedback API
    	async function sendFeedback() {
    		try {
    			await fetch('http://127.0.0.1:8081/submit-feedback', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ user_id: userId, content: feedback })
    			});

    			alert("Feedback submitted successfully!");
    			$$invalidate(6, feedback = "");
    		} catch(error) {
    			alert("Failed to submit feedback. Please try again.");
    		}
    	}

    	// Function to fetch feedback for a user
    	async function getFeedback() {
    		$$invalidate(4, isLoading = true);
    		$$invalidate(5, errorMessage = "");

    		try {
    			const response = await fetch(`http://127.0.0.1:8081/get-feedback/${userId}`);

    			if (!response.ok) {
    				throw new Error("No feedback found.");
    			}

    			const data = await response.json();
    			$$invalidate(2, saved_feedbacks = data.feedbacks); // Set the feedback data
    		} catch(error) {
    			$$invalidate(5, errorMessage = error.message || "Failed to fetch feedback.");
    		} finally {
    			$$invalidate(4, isLoading = false);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		inputText = this.value;
    		$$invalidate(1, inputText);
    	}

    	function textarea_input_handler() {
    		feedback = this.value;
    		$$invalidate(6, feedback);
    	}

    	function input1_input_handler() {
    		userId = to_number(this.value);
    		$$invalidate(3, userId);
    	}

    	$$self.$capture_state = () => ({
    		prediction,
    		inputText,
    		feedback,
    		saved_feedbacks,
    		userId,
    		isLoading,
    		errorMessage,
    		getPrediction,
    		sendFeedback,
    		getFeedback
    	});

    	$$self.$inject_state = $$props => {
    		if ('prediction' in $$props) $$invalidate(0, prediction = $$props.prediction);
    		if ('inputText' in $$props) $$invalidate(1, inputText = $$props.inputText);
    		if ('feedback' in $$props) $$invalidate(6, feedback = $$props.feedback);
    		if ('saved_feedbacks' in $$props) $$invalidate(2, saved_feedbacks = $$props.saved_feedbacks);
    		if ('userId' in $$props) $$invalidate(3, userId = $$props.userId);
    		if ('isLoading' in $$props) $$invalidate(4, isLoading = $$props.isLoading);
    		if ('errorMessage' in $$props) $$invalidate(5, errorMessage = $$props.errorMessage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		prediction,
    		inputText,
    		saved_feedbacks,
    		userId,
    		isLoading,
    		errorMessage,
    		feedback,
    		getPrediction,
    		sendFeedback,
    		getFeedback,
    		input0_input_handler,
    		textarea_input_handler,
    		input1_input_handler
    	];
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

})();
//# sourceMappingURL=bundle.js.map
