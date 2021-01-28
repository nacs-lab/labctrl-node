/*************************************************************************
 *   Copyright (c) 2019 - 2021 Yichao Yu <yyc1992@gmail.com>             *
 *                                                                       *
 *   This library is free software; you can redistribute it and/or       *
 *   modify it under the terms of the GNU Lesser General Public          *
 *   License as published by the Free Software Foundation; either        *
 *   version 3.0 of the License, or (at your option) any later version.  *
 *                                                                       *
 *   This library is distributed in the hope that it will be useful,     *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of      *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU    *
 *   Lesser General Public License for more details.                     *
 *                                                                       *
 *   You should have received a copy of the GNU Lesser General Public    *
 *   License along with this library. If not,                            *
 *   see <http://www.gnu.org/licenses/>.                                 *
 *************************************************************************/

"use strict";

const assert = require('assert');
const EventEmitter = require('events');

const sleep = require('../lib/sleep');
const SocketManager = require('../server/socket_manager');

class DummySocket extends EventEmitter {
    disconnect() {
        this.emit('disconnect');
    }
    async call(...args) {
        this.emit('call', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
    async set(...args) {
        this.emit('set', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
    async get(...args) {
        this.emit('get', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
    async listen(...args) {
        this.emit('listen', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
    async unlisten(...args) {
        this.emit('unlisten', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
    async watch(...args) {
        this.emit('watch', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
    async unwatch(...args) {
        this.emit('unwatch', ...args);
        // Make sure the async call finishes.
        await sleep(1);
    }
};

class TestSource extends SocketManager.Source {
    test_field = 0
    delay_set = false

    set_values(params) {
        if (this.delay_set) {
            return sleep(10).then(() => {
                this.update_values(params);
                return true;
            });
        }
        this.update_values(params);
        return true;
    }

    call_method(name, params) {
        if (name == 'method1') {
            let { a, b } = params;
            return a + b;
        }
        else if (name == 'method2') {
            this.test_field = params;
            return;
        }
        else if (name == 'async1') {
            return (async () => {
                let { a, b } = params;
                let res = a * b;
                await sleep(10);
                this.test_field = res;
                return res;
            })();
        }
    }
    async emit_signal(...arg) {
        super.emit_signal(...arg);
        // Make sure the async call finishes.
        // This doesn't matter for the actual server since
        // we'll not wait to observer any effect on the reciever but it does matter
        // in the test...
        await sleep(1);
    }
};

/**
 * Comparing arbitrary values. Assuming the values are JSON-serializable.
 * This should be equivalent to checking if the two values can be represented by
 * the same JSON string.
 */
function val_eq(a, b) {
    if (Object.is(a, b))
        return true;

    var atyp = typeof a;
    var btyp = typeof b;

    // `typeof null` is `"object"` but `!!null` is `false`
    if (atyp != "object" || !a)
        return false;
    if (btyp != "object" || !b)
        return false;

    var aprops = Object.getOwnPropertyNames(a);
    var bprops = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aprops.length != bprops.length)
        return false;

    for (var i = 0; i < aprops.length; i++) {
        var pn = aprops[i];

        // We do not support self referencing structure which should be fine
        // since we only need to deal with JSON compabible objects
        if (!val_eq(a[pn], b[pn])) {
            return false;
        }
    }

    return true;
}

async function test_call_and_signal() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src = new TestSource('source1');
    let src2 = new TestSource('source2');
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return true;
    });
    assert(src.test_field == 0);
    mgr.add_source(src);
    assert(src.age == 1);
    assert(src.id == 'source1');
    assert(src2.test_field == 0);
    mgr.add_source(src2);
    assert(src2.age == 1);
    assert(src2.id == 'source2');

    mgr.add_socket(sock);
    let res = await new Promise((resolve, reject) => {
        sock.call('source1', 'method1', { a: 2, b: 3 }, resolve);
    });
    assert(res == 5);
    assert(counter == 1);
    res = new Promise((resolve, reject) => {
        sock.call('source1', 'async1', { a: 2, b: 3 }, resolve);
    });
    // This should not have happened yet.
    assert(src.test_field == 0);
    res = await res;
    assert(res == 6);
    assert(counter == 2);
    assert(src.test_field == 6);
    // Direct server call
    assert(mgr.call_method('source1', 'method1', { a: 6, b: 3 }) == 9);
    assert(mgr.call_method('source2', 'method1', { a: 6, b: -1 }) == 5);
    res = mgr.call_method('source1', 'async1', { a: 6, b: 3 });
    assert(counter == 2);
    assert(src.test_field == 6);
    // Wait for 30 ms, longer than the 10 ms wait in async1 method.
    await sleep(30);
    assert(src.test_field == 18);
    res = await res;
    assert(res == 18);
    res = await new Promise((resolve, reject) => {
        sock.call('source1', 'method2', 100, resolve);
    });
    assert(res === undefined);
    assert(counter == 3);
    assert(src.test_field == 100);
    // Test calling without callback
    await sock.call('source1', 'method2', 1000);
    assert(src.test_field == 1000);
    assert(src2.test_field == 0);
    assert(counter == 4);
    // Now call a second source
    await new Promise((resolve, reject) => {
        sock.call('source2', 'method2', 42, resolve);
    });
    assert(src2.test_field == 42);
    assert(counter == 5);
    // Direct server call
    mgr.call_method('source1', 'method2', 1234);
    assert(src.test_field == 1234);
    mgr.call_method('source2', 'method2', 4321);
    assert(src2.test_field == 4321);
    assert(counter == 5);

    let val1 = 0;
    let val2 = 0;
    sock.on('signal', ({ id, name, params }) => {
        if (id == 'source1' && name == 'signal1') {
            val1 = params;
        }
        else if (id == 'source2' && name == 'signal1') {
            val2 = params;
        }
        else {
            assert(false && "Unknown signal fired.");
        }
    });
    await sock.listen('source1', 'signal1');
    assert(counter == 6);
    await sock.listen('source2', 'signal1');
    assert(counter == 7);
    assert(val1 == 0);
    assert(val2 == 0);
    await src.emit_signal('signal1', 10);
    assert(counter == 8);
    assert(val1 == 10);
    assert(val2 == 0);
    await src2.emit_signal('signal1', 100);
    assert(counter == 9);
    assert(val1 == 10);
    assert(val2 == 100);
    await src.emit_signal('signal2', 1000);
    await src2.emit_signal('signal2', 3);
    assert(val1 == 10);
    assert(val2 == 100);
    await sock.unlisten('source1', 'signal1');
    assert(counter == 10);
    await sock.unlisten('source2', 'signal1');
    assert(counter == 11);
    assert(val1 == 10);
    assert(val2 == 100);
    await src.emit_signal('signal1', 10000);
    await src2.emit_signal('signal1', 10000);
    assert(val1 == 10);
    assert(val2 == 100);
    assert(counter == 11);

    sock.disconnect();
    mgr.remove_source(src);
    mgr.remove_source(src2);
}

async function test_rejection() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src = new TestSource('source1');
    let enable = false;
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return enable;
    });
    mgr.add_source(src);

    mgr.add_socket(sock);
    let res = await new Promise((resolve, reject) => {
        sock.call('source1', 'method1', { a: 2, b: 3 }, resolve);
    });
    assert(res === undefined);
    assert(counter == 1);
    // Make sure that a second call does not reach the manager
    res = await new Promise(async (resolve, reject) => {
        sock.call('source1', 'method1', { a: 2, b: 3 }, resolve);
        await sleep(20);
        resolve(890);
    });
    assert(res === 890);
    assert(counter == 1);

    let sigval = 0;
    sock.on('signal', ({ id, name, params }) => {
        assert(id == 'source1' && name == 'signal1');
        sigval = params;
    });

    mgr.add_socket(sock);
    enable = true;
    await sock.listen('source1', 'signal1');
    assert(counter == 2);
    await src.emit_signal('signal1', 10);
    assert(sigval == 10);
    assert(counter == 3);
    enable = false;
    await src.emit_signal('signal1', 100);
    assert(sigval == 10);
    assert(counter == 4);
    await src.emit_signal('signal1', 1000);
    assert(sigval == 10);
    assert(counter == 4);

    mgr.add_socket(sock);
    await sock.listen('source1', 'signal1');
    assert(counter == 5);
    enable = true;
    await src.emit_signal('signal1', 100);
    assert(sigval == 10);
    assert(counter == 5);

    let updates = [];
    sock.on('update', function (param) {
        updates.push(param);
    });

    mgr.add_socket(sock);
    enable = false;
    await sock.watch({ source1: { path: { chn1: 0 } } });
    assert(counter == 6);
    enable = true;
    assert(val_eq(mgr.set_values({ source1: { chn1: 20 }}), { source1: true }));
    assert(updates.length == 0);
    assert(counter == 6);

    mgr.add_socket(sock);
    await sock.watch({ source1: { path: { chn1: 0 } } });
    assert(counter == 7);
    enable = false;
    assert(val_eq(mgr.set_values({ source1: { chn1: 20 }}), { source1: true }));
    assert(counter == 7);
    await sleep(50);
    assert(updates.length == 0);
    assert(counter == 8);
    assert(val_eq(mgr.set_values({ source1: { chn1: 40 }}), { source1: true }));
    await sleep(50);
    assert(updates.length == 0);
    assert(counter == 8);

    mgr.remove_source(src);
}

async function test_socket_disconnect() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src = new TestSource('source1');
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return true;
    });
    assert(src.test_field == 0);
    mgr.add_source(src);
    assert(src.age == 1);
    assert(src.id == 'source1');

    mgr.add_socket(sock);
    assert(counter == 0);
    await sock.call('source1', 'method2', 1000);
    assert(src.test_field == 1000);
    assert(counter == 1);

    let val1 = 0;
    sock.on('signal', ({ id, name, params }) => {
        if (id == 'source1' && name == 'signal1') {
            val1 = params;
        }
    });
    await sock.listen('source1', 'signal1');
    assert(val1 == 0);
    assert(counter == 2);
    await src.emit_signal('signal1', 10);
    assert(val1 == 10);
    assert(counter == 3);

    sock.disconnect();

    await sock.call('source1', 'method2', 2000);
    await src.emit_signal('signal1', 100);
    await sleep(10);
    assert(src.test_field == 1000);
    assert(val1 == 10);
    assert(counter == 3);

    mgr.remove_source(src);
}

async function test_source_remove() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src = new TestSource('source1');
    assert(src.test_field == 0);
    mgr.add_source(src);
    assert(src.age == 1);
    assert(src.id == 'source1');

    mgr.add_socket(sock);
    await sock.call('source1', 'method2', 1000);
    assert(src.test_field == 1000);

    let val1 = 0;
    sock.on('signal', ({ id, name, params }) => {
        if (id == 'source1' && name == 'signal1') {
            val1 = params;
        }
    });
    await sock.listen('source1', 'signal1');
    assert(val1 == 0);
    await src.emit_signal('signal1', 10);
    assert(val1 == 10);

    mgr.remove_source(src);

    console.log("Expect error printed below:");
    await sock.call('source1', 'method2', 2000);
    await src.emit_signal('signal1', 100);
    await sleep(10);
    assert(src.test_field == 1000);
    assert(val1 == 10);

    sock.disconnect();
}

async function test_set_get() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src1 = new TestSource('source1');
    let src2 = new TestSource('source2');
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return true;
    });
    mgr.add_socket(sock);
    mgr.add_source(src1);
    mgr.add_source(src2);

    assert(val_eq(mgr.set_values({ source1: { chn1: 20, chn2: 30 },
                                   source2: { chn1: -1, chn2: -2 }}),
                  { source1: true, source2: true }));
    let res = mgr.get_values({ source1: { path: { chn1: 0, chn2: 0 }},
                               source2: { path: { chn1: 0, chn2: 0 }}});
    assert(val_eq(res, { source1: { age: 2, values: { chn1: 20, chn2: 30 }},
                         source2: { age: 2, values: { chn1: -1, chn2: -2 }}}));
    res = mgr.get_values({ source1: { age: 2, path: { chn1: 0, chn2: 0 }},
                           source2: { age: 2, path: { chn1: 0, chn2: 0 }}});
    assert(val_eq(res, { source1: null, source2: null}));
    res = mgr.get_values({ source1: { path: { chn1: 0 }},
                           source2: { path: { chn2: 0 }}});
    assert(val_eq(res, { source1: { age: 2, values: { chn1: 20 }},
                         source2: { age: 2, values: { chn2: -2 }}}));
    assert(val_eq(mgr.set_values({ source1: { chn1: null, chn3: 90 }}),
                  { source1: true }));
    assert(src1.age == 3);
    assert(src2.age == 2);
    res = mgr.get_values({ source1: { path: 0 },
                           source2: { path: 0 }});
    assert(val_eq(res, { source1: { age: 3, values: { chn3: 90, chn2: 30 }},
                         source2: { age: 2, values: { chn1: -1, chn2: -2 }}}));
    // Try to access deleted/non-existing channels
    res = mgr.get_values({ source1: { path: { chn1: 0, chn10: { subchn: 0 } } }});
    assert(val_eq(res, { source1: { age: 3, values: { chn1: null, chn10: null }}}));
    assert(val_eq(mgr.set_values({ source2: { chn1: { sub1: 30, sub2: 40 }}}),
                  { source2: true }));
    res = mgr.get_values({ source2: { path: 0 }});
    assert(val_eq(res, { source2: { age: 3, values: { chn1: { sub1: 30, sub2: 40 },
                                                      chn2: -2 }}}));

    assert(counter == 0);
    await sock.set({ source1: { chn3: 10 }});
    assert(counter == 1);
    res = await new Promise((resolve, reject) => {
        sock.get({ source1: { path: 0 }}, resolve);
    });
    assert(val_eq(res, { source1: { age: 4, values: { chn3: 10, chn2: 30 }}}));
    assert(counter == 2);

    res = await new Promise((resolve, reject) => {
        sock.set({ source1: { chn2: 42 }, source2: { chn1: { sub4: 4 }}}, resolve);
    });
    assert(val_eq(res, { source1: true, source2: true }));
    assert(counter == 3);
    res = await new Promise((resolve, reject) => {
        sock.get({ source1: { path: 0 }, source2: { path: 0 }}, resolve);
    });
    assert(val_eq(res, { source1: { age: 5, values: { chn3: 10, chn2: 42 }},
                         source2: { age: 4, values: { chn1: { sub1: 30, sub2: 40, sub4: 4 },
                                                      chn2: -2 }}}));
    assert(counter == 4);

    mgr.remove_source(src1);
    mgr.remove_source(src2);
    sock.disconnect();
}

async function test_set_get_async() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src1 = new TestSource('source1');
    let src2 = new TestSource('source2');
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return true;
    });
    mgr.add_socket(sock);
    mgr.add_source(src1);
    mgr.add_source(src2);
    src1.delay_set = true;

    let res = mgr.set_values({ source1: { chn1: 20, chn2: 30 },
                               source2: { chn1: -1, chn2: -2 }});
    assert(res instanceof Promise);
    assert(val_eq(await res, { source1: true, source2: true }));
    res = mgr.get_values({ source1: { path: { chn1: 0, chn2: 0 }},
                           source2: { path: { chn1: 0, chn2: 0 }}});
    assert(val_eq(res, { source1: { age: 2, values: { chn1: 20, chn2: 30 }},
                         source2: { age: 2, values: { chn1: -1, chn2: -2 }}}));
    res = mgr.get_values({ source1: { age: 2, path: { chn1: 0, chn2: 0 }},
                           source2: { age: 2, path: { chn1: 0, chn2: 0 }}});
    assert(val_eq(res, { source1: null, source2: null}));
    res = mgr.get_values({ source1: { path: { chn1: 0 }},
                           source2: { path: { chn2: 0 }}});
    assert(val_eq(res, { source1: { age: 2, values: { chn1: 20 }},
                         source2: { age: 2, values: { chn2: -2 }}}));
    res = mgr.set_values({ source1: { chn1: null, chn3: 90 }});
    assert(res instanceof Promise);
    assert(val_eq(await res, { source1: true }));
    assert(src1.age == 3);
    assert(src2.age == 2);
    res = mgr.get_values({ source1: { path: 0 },
                           source2: { path: 0 }});
    assert(val_eq(res, { source1: { age: 3, values: { chn3: 90, chn2: 30 }},
                         source2: { age: 2, values: { chn1: -1, chn2: -2 }}}));
    assert(val_eq(mgr.set_values({ source2: { chn1: { sub1: 30, sub2: 40 }}}),
                  { source2: true }));
    res = mgr.get_values({ source2: { path: 0 }});
    assert(val_eq(res, { source2: { age: 3, values: { chn1: { sub1: 30, sub2: 40 },
                                                      chn2: -2 }}}));

    assert(counter == 0);
    await sock.set({ source1: { chn3: 10 }});
    assert(counter == 1);
    res = mgr.get_values({ source1: { path: 0 }});
    assert(val_eq(res, { source1: { age: 3, values: { chn3: 90, chn2: 30 }}}));
    await sleep(30);
    res = await new Promise((resolve, reject) => {
        sock.get({ source1: { path: 0 }}, resolve);
    });
    assert(val_eq(res, { source1: { age: 4, values: { chn3: 10, chn2: 30 }}}));
    assert(counter == 2);

    res = await new Promise((resolve, reject) => {
        sock.set({ source1: { chn2: 42 }, source2: { chn1: { sub4: 4 }}}, resolve);
    });
    assert(val_eq(res, { source1: true, source2: true }));
    assert(counter == 3);
    res = await new Promise((resolve, reject) => {
        sock.get({ source1: { path: 0 }, source2: { path: 0 }}, resolve);
    });
    assert(val_eq(res, { source1: { age: 5, values: { chn3: 10, chn2: 42 }},
                         source2: { age: 4, values: { chn1: { sub1: 30, sub2: 40, sub4: 4 },
                                                      chn2: -2 }}}));
    assert(counter == 4);

    mgr.remove_source(src1);
    mgr.remove_source(src2);
    sock.disconnect();
}

async function test_watch() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src1 = new TestSource('source1');
    let src2 = new TestSource('source2');
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return true;
    });
    mgr.add_socket(sock);
    mgr.add_source(src1);
    mgr.add_source(src2);

    let updates = [];
    sock.on('update', function (param) {
        updates.push(param);
    });

    let res = mgr.set_values({ source1: { chn1: 20, chn2: 30 },
                               source2: { chn1: -1, chn2: -2 }});
    assert(val_eq(res, { source1: true, source2: true }));
    res = mgr.get_values({ source1: { path: { chn1: 0, chn2: 0 }},
                           source2: { path: { chn1: 0, chn2: 0 }}});
    assert(val_eq(res, { source1: { age: 2, values: { chn1: 20, chn2: 30 }},
                         source2: { age: 2, values: { chn1: -1, chn2: -2 }}}));

    assert(counter == 0);
    // Watching subpath
    await sock.watch({ source1: { path: { chn1: 0 } } });
    assert(counter == 1);
    assert(updates.length == 0);
    // Wait for the update timer to fire.
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 2, values: { chn1: 20 }}}));
    assert(counter == 2);
    updates.length = 0; // clear

    // Watching whole source
    await sock.watch({ source2: { path: 0 } });
    assert(updates.length == 0);
    assert(counter == 3);
    // Wait for the update timer to fire.
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source2: { age: 2, values: { chn1: -1, chn2: -2 }}}));
    assert(counter == 4);
    updates.length = 0; // clear

    // Watching sub source within whole source
    await sock.watch({ source2: { path: { chn1: 0 } } });
    assert(updates.length == 0);
    assert(counter == 5);
    // Wait for the update timer to fire.
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source2: { age: 2, values: { chn1: -1 }}}));
    assert(counter == 6);
    updates.length = 0; // clear

    // Nothing changed
    res = mgr.set_values({ source1: { chn1: 20, chn2: 30 },
                           source2: { chn1: -1, chn2: -2 }});
    assert(val_eq(res, { source1: true, source2: true }));
    await sleep(50);
    assert(updates.length == 0);
    assert(counter == 6);

    res = mgr.set_values({ source1: { chn1: 20, chn2: 2 },
                           source2: { chn1: 1, chn2: -2 }});
    assert(val_eq(res, { source1: true, source2: true }));
    assert(updates.length == 0);
    assert(counter == 6);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source2: { age: 3, values: { chn1: 1 }}}));
    assert(counter == 7);
    updates.length = 0; // clear

    res = mgr.set_values({ source1: { chn1: 1 },
                           source2: { chn2: 2 }});
    assert(val_eq(res, { source1: true, source2: true }));
    assert(updates.length == 0);
    assert(counter == 7);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 4, values: { chn1: 1 }},
                                source2: { age: 4, values: { chn2: 2 }}}));
    assert(counter == 8);
    updates.length = 0; // clear

    await sock.unwatch({ source2: { path: 0 } });
    assert(counter == 9);

    // Set a value of `0` to catch potentially faulty logic
    res = mgr.set_values({ source2: { chn1: 0, chn2: 0 }});
    assert(val_eq(res, { source2: true }));
    assert(updates.length == 0);
    assert(counter == 9);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source2: { age: 5, values: { chn1: 0 }}}));
    assert(counter == 10);
    updates.length = 0; // clear

    // Also start a watch on a value of `0` to check if the add watch logic can handle this too.
    await sock.watch({ source2: { path: { chn2: 0 } } });
    assert(updates.length == 0);
    assert(counter == 11);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source2: { age: 5, values: { chn2: 0 }}}));
    assert(counter == 12);
    updates.length = 0; // clear

    // Check if the age parameter works
    await sock.unwatch({ source2: { path: { chn2: 0 } } });
    assert(counter == 13);
    await sock.watch({ source2: { age: 5, path: { chn2: 0 } } });
    assert(updates.length == 0);
    assert(counter == 14);
    await sleep(50);
    assert(updates.length == 0);
    assert(counter == 14);

    await sock.unwatch({ source2: { path: { chn2: 0 } } });
    assert(counter == 15);
    await sock.watch({ source2: { age: 4, path: { chn2: 0 } } });
    assert(counter == 16);
    assert(updates.length == 0);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source2: { age: 5, values: { chn2: 0 }}}));
    assert(counter == 17);
    updates.length = 0; // clear

    // Use the socket to set the value.
    sock.set({ source1: { chn1: 0 }});
    assert(updates.length == 0);
    assert(counter == 18);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 5, values: { chn1: 0 }}}));
    assert(counter == 19);
    updates.length = 0; // clear

    // Bunch up of firing
    sock.set({ source1: { chn1: 1 }});
    assert(counter == 20);
    sock.set({ source2: { chn1: 2 }});
    assert(counter == 21);
    sock.set({ source2: { chn2: 3 }});
    assert(counter == 22);
    assert(updates.length == 0);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 6, values: { chn1: 1 }},
                                source2: { age: 7, values: { chn1: 2, chn2: 3 }}}));
    assert(counter == 23);
    updates.length = 0; // clear

    // Deletion
    sock.set({ source1: { chn1: null }});
    assert(updates.length == 0);
    assert(counter == 24);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 7, values: { chn1: null }}}));
    assert(counter == 25);
    updates.length = 0; // clear

    mgr.remove_source(src1);
    mgr.remove_source(src2);
    sock.disconnect();
}

async function test_watch_delete() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src1 = new TestSource('source1');
    mgr.add_socket(sock);
    mgr.add_source(src1);

    let updates = [];
    sock.on('update', function (param) {
        updates.push(param);
    });

    let res = mgr.set_values({ source1: { chn1: 1, chn2: { subchn1: 1, subchn2: 2 }}});
    assert(val_eq(res, { source1: true }));
    res = mgr.get_values({ source1: { path: 0 }});
    assert(val_eq(res, { source1: { age: 2, values: { chn1: 1, chn2: { subchn1: 1,
                                                                       subchn2: 2 }}}}));

    await sock.watch({ source1: { path: 0 }});

    res = mgr.set_values({ source1: { chn1: 3, chn2: { subchn1: 2, subchn2: 3 }}});
    assert(val_eq(res, { source1: true }));
    assert(updates.length == 0);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 3, values: { chn1: 3, chn2: { subchn1: 2,
                                                                              subchn2: 3 }}}}));
    updates.length = 0; // clear

    res = mgr.set_values({ source1: { chn1: 0, chn2: { subchn1: 1, subchn2: 2 }}});
    assert(val_eq(res, { source1: true }));
    res = mgr.set_values({ source1: { chn1: 3, chn2: { subchn1: null, subchn2: null }}});
    assert(val_eq(res, { source1: true }));
    assert(updates.length == 0);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 5,
                                           values: { chn1: 3, chn2: { subchn1: null,
                                                                      subchn2: null }}}}));
    updates.length = 0; // clear

    res = mgr.set_values({ source1: { chn1: 0, chn2: { subchn1: 1, subchn2: 2 }}});
    assert(val_eq(res, { source1: true }));
    res = mgr.set_values({ source1: { chn1: 3, chn2: null}});
    assert(val_eq(res, { source1: true }));
    // This should not trigger any change.
    res = mgr.set_values({ source1: { chn1: 3, chn2: { subchn1: null, subchn2: null }}});
    assert(val_eq(res, { source1: true }));
    assert(updates.length == 0);
    await sleep(50);
    assert(updates.length == 1);
    assert(val_eq(updates[0], { source1: { age: 7,
                                           values: { chn1: 3, chn2: null }}}));
    updates.length = 0; // clear

    res = mgr.set_values({ source1: { chn1: 0, chn2: { subchn1: 1, subchn2: 2 }}});
    assert(val_eq(res, { source1: true }));
    res = mgr.set_values({ source1: { chn1: 3, chn2: { subchn1: null, subchn2: null }}});
    assert(val_eq(res, { source1: true }));
    assert(updates.length == 0);
    await sleep(50);
    assert(updates.length == 1);
    // chn2 didn't exist before this but we are still getting the deletion notification.
    // This is OK though it doesn't HAVE to be the case.
    // If we have a more accurate change reporting
    // (essentially requiring saving the old state) this could report nothing.
    // or even with not update event.
    assert(val_eq(updates[0], { source1: { age: 9,
                                           values: { chn1: 3, chn2: { subchn1: null,
                                                                      subchn2: null }}}}));
    updates.length = 0; // clear

    mgr.remove_source(src1);
    sock.disconnect();
}

module.exports = async function test() {
    await test_call_and_signal();
    await test_rejection();
    await test_socket_disconnect();
    await test_source_remove();
    await test_set_get();
    await test_set_get_async();
    await test_watch();
    await test_watch_delete();
}
