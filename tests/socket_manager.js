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
};

class TestSource extends SocketManager.Source {
    test_field = 0

    // TODO: set_values(params)
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
};

async function test_call() {
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

    sock.disconnect();
    mgr.remove_source(src);
    mgr.remove_source(src2);
}

async function test_rejection() {
    let mgr = new SocketManager();
    let sock = new DummySocket();
    let src = new TestSource('source1');
    let counter = 0;
    mgr.set_auth_handler((s) => {
        assert(s === sock);
        counter += 1;
        return false;
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
    sock.disconnect();

    await sock.call('source1', 'method2', 2000);
    await sleep(10);
    assert(src.test_field == 1000);
    assert(counter == 1);

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

    mgr.remove_source(src);

    console.log("Expect error printed below:");
    await sock.call('source1', 'method2', 2000);
    await sleep(10);
    assert(src.test_field == 1000);

    sock.disconnect();
}

module.exports = async function test() {
    await test_call();
    await test_rejection();
    await test_socket_disconnect();
    await test_source_remove();
}
