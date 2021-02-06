/*************************************************************************
 *   Copyright (c) 2021 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

// Note that this test is not included in `test-all` since this requires
// starting a test molecube server.
const assert = require('assert');
const EventEmitter = require('events');

const sleep = require('../lib/sleep');
const { array_equal, object_equal } = require('../lib/utils');
const SocketManager = require('../server/socket_manager');
const Zynq = require('../server/zynq');

class DummySocket extends EventEmitter {
    disconnect() {
        this.emit('disconnect');
    }
    call(...args) {
        this.emit('call', ...args);
        // Make sure the async call finishes.
        return sleep(1);
    }
    set(...args) {
        this.emit('set', ...args);
        // Make sure the async call finishes.
        return sleep(1);
    }
    get(...args) {
        this.emit('get', ...args);
        // Make sure the async call finishes.
        return sleep(1);
    }
    watch(...args) {
        this.emit('watch', ...args);
        // Make sure the async call finishes.
        return sleep(1);
    }
    unwatch(...args) {
        this.emit('unwatch', ...args);
        // Make sure the async call finishes.
        return sleep(1);
    }
};

async function test_names(mgr, zynq) {
    let sock = new DummySocket();
    mgr.add_socket(sock);

    let updates = [];
    sock.on('update', function (param) {
        updates.push(param);
    });

    let dds_names = Object.create(null);
    let dds_names_get = Object.create(null);
    for (let i = 0; i < 22; i++) {
        dds_names[`name${i}`] = '';
        dds_names_get[`name${i}`] = 0;
    }
    await sock.watch({ zynq0: { path: { dds: dds_names_get }}});
    assert(await zynq.set_values({ dds: dds_names }));
    assert(object_equal((await zynq.get_values({ path: { dds: dds_names_get }})).values,
                        { dds: dds_names }));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values, { dds: dds_names }));
    updates.length = 0;
    assert(await zynq.set_values({ dds: { name10: 'testchn', name0: 'chn0' }}));
    dds_names.name0 = 'chn0';
    dds_names.name10 = 'testchn';
    assert(object_equal((await zynq.get_values({ path: { dds: dds_names_get }})).values,
                        { dds: dds_names }));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { dds: { name0: 'chn0', name10: 'testchn' }}));
    updates.length = 0;

    let ttl_names = Object.create(null);
    let ttl_names_get = Object.create(null);
    for (let i = 0; i < 32; i++) {
        ttl_names[`name${i}`] = '';
        ttl_names_get[`name${i}`] = 0;
    }
    await sock.watch({ zynq0: { path: { ttl: ttl_names_get }}});
    assert(await zynq.set_values({ ttl: ttl_names }));
    assert(object_equal((await zynq.get_values({ path: { ttl: ttl_names_get }})).values,
                        { ttl: ttl_names }));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values, { ttl: ttl_names }));
    updates.length = 0;
    assert(await zynq.set_values({ ttl: { name10: 'testchn100', name0: 'chn010' }}));
    ttl_names.name0 = 'chn010';
    ttl_names.name10 = 'testchn100';
    assert(object_equal((await zynq.get_values({ path: { ttl: ttl_names_get }})).values,
                        { ttl: ttl_names }));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { ttl: { name0: 'chn010', name10: 'testchn100' }}));
    updates.length = 0;

    sock.disconnect();
}

async function test_sequence(mgr, zynq) {
    let sock = new DummySocket();
    mgr.add_socket(sock);

    let updates = [];
    sock.on('update', function (param) {
        updates.push(param);
    });

    // Clear all DDS, TTL and CLOCK channels
    let get_params = Object.create(null);
    let set_params = Object.create(null);

    get_params.clock = 0;
    set_params.clock = 255;

    get_params.dds = Object.create(null);
    set_params.dds = Object.create(null);
    for (let i = 0; i < 22; i++) {
        get_params.dds[`freq${i}`] = 0;
        get_params.dds[`amp${i}`] = 0;
        get_params.dds[`phase${i}`] = 0;
        get_params.dds[`ovr_freq${i}`] = false;
        get_params.dds[`ovr_amp${i}`] = false;
        get_params.dds[`ovr_phase${i}`] = false;
        set_params.dds[`freq${i}`] = 0;
        set_params.dds[`amp${i}`] = 0;
        set_params.dds[`phase${i}`] = 0;
        set_params.dds[`ovr_freq${i}`] = false;
        set_params.dds[`ovr_amp${i}`] = false;
        set_params.dds[`ovr_phase${i}`] = false;
    }

    get_params.ttl = Object.create(null);
    set_params.ttl = Object.create(null);
    for (let i = 0; i < 32; i++) {
        get_params.ttl[`val${i}`] = 0;
        get_params.ttl[`ovr${i}`] = false;
        set_params.ttl[`val${i}`] = false;
        set_params.ttl[`ovr${i}`] = false;
    }
    await sock.watch({ zynq0: { path: get_params }});
    assert(await zynq.set_values(set_params));
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values, set_params));
    updates.length = 0;

    let res = await new Promise((resolve, reject) => {
        sock.set({ zynq0: { clock: 100 }}, resolve);
    });
    set_params.clock = 100;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { clock: 100 }));
    updates.length = 0;

    res = await new Promise((resolve, reject) => {
        sock.set({ zynq0: { clock: 255 }}, resolve);
    });
    set_params.clock = 255;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { clock: 255 }));
    updates.length = 0;

    res = await new Promise((resolve, reject) => {
        sock.set({ zynq0: { ttl: { val0: true, val2: true, ovr1: true, ovr2: true }}}, resolve);
    });
    set_params.ttl.val0 = true;
    set_params.ttl.val2 = true;
    set_params.ttl.ovr1 = true;
    set_params.ttl.ovr2 = true;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { ttl: { val0: true, val2: true, ovr1: true, ovr2: true }}));
    updates.length = 0;

    res = await new Promise((resolve, reject) => {
        sock.set({ zynq0: { ttl: { val0: false, val1: true,
                                   ovr2: false, ovr3: true }}}, resolve);
    });
    set_params.ttl.val0 = false;
    set_params.ttl.val1 = true;
    set_params.ttl.ovr2 = false;
    set_params.ttl.ovr3 = true;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { ttl: { val0: false, val1: true, ovr2: false, ovr3: true }}));
    updates.length = 0;

    // Make sure removing override didn't change any value
    await sleep(200);
    assert(updates.length == 0);

    res = await new Promise((resolve, reject) => {
        sock.set({ zynq0: { dds: { freq0: 12345, amp1: 20000,
                                   ovr_freq2: true, ovr_amp1: true }}}, resolve);
    });
    set_params.dds.freq0 = 12345;
    set_params.dds.amp1 = 20000;
    set_params.dds.ovr_freq2 = true;
    set_params.dds.ovr_amp1 = true;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { dds: { freq0: 12345, amp1: 20000,
                                 ovr_freq2: true, ovr_amp1: true }}));
    updates.length = 0;

    res = await new Promise((resolve, reject) => {
        sock.set({ zynq0: { dds: { freq2: 2222, amp1: 10000,
                                   ovr_freq2: false, ovr_amp3: true }}}, resolve);
    });
    set_params.dds.freq2 = 2222;
    set_params.dds.amp1 = 10000;
    set_params.dds.ovr_freq2 = false;
    set_params.dds.ovr_amp3 = true;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    await sleep(50);
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { dds: { freq2: 2222, amp1: 10000,
                                 ovr_freq2: false, ovr_amp3: true }}));
    updates.length = 0;

    // Make sure removing override didn't change any value
    console.log("Waiting for update polling.");
    await sleep(1000);
    assert(updates.length == 0);

    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'run_cmdlist', '# Test\nttl_mask = 0xffffffff\nttl-\n', resolve);
    });
    assert(object_equal(res, {
        msg: 'Invalid ttl command: expecting `(` or `=`',
        line: 'ttl-',
        lineno: 3,
        colnum: 4,
        colstart: -1,
        colend: -1,
    }));
    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'set_startup',
                  '# Test\n\nttl_mask = 0x10ff\nfreq(10) = 200.0 THz\n', resolve);
    });
    assert(object_equal(res, {
        msg: 'Unknown frequency unit',
        line: 'freq(10) = 200.0 THz',
        lineno: 4,
        colnum: -1,
        colstart: 18,
        colend: 20,
    }));
    let startup = `ttl(0)=0
ttl(1)=1 t=0x6
freq(5)=10.2MHz
amp(5)=0.3
ttl(10)=On
ttl(11)=False
freq(3)=0.7GHz
freq(4)=0.7kHz`;
    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'set_startup', startup, resolve);
    });
    assert(res);
    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'get_startup', {}, resolve);
    });
    assert(res == startup);

    console.log("Waiting for update polling.");
    await sleep(1000);
    assert(updates.length == 0);

    let seq1 = `ttl(0)=1
ttl(1)=false
ttl(2)=False
ttl(3)=On
freq(5)=8.149072527885437e6 Hz
amp(1)=0.1
amp(2)=0.2
amp(3)=0.5`;
    let id;
    [id, res] = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'run_cmdlist', seq1, resolve);
    });
    assert(array_equal(res, [true, true]));
    assert(id.length == 4);
    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'wait_seq', { id: id, type: 2 }, resolve);
    });
    assert(res);

    console.log("Waiting for update polling.");
    await sleep(1000);

    set_params.ttl.val0 = true;
    set_params.ttl.val2 = false;
    set_params.dds.freq5 = 10000000;
    set_params.dds.amp2 = 819;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { dds: { freq5: 10000000, amp2: 819 },
                          ttl: { val0: true, val2: false }}));
    updates.length = 0;

    let seq2 = `ttl(10)=1
wait(300ms)`;
    let seq3 = `ttl(11)=1
ttl(10)=0`;
    [id, res] = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'run_cmdlist', seq2, resolve);
    });
    assert(res);
    let id2;
    [id2, res] = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'run_cmdlist', seq3, resolve);
    });
    assert(res);

    let ares = new Promise((resolve, reject) => {
        sock.call('zynq0', 'wait_seq', { id: id2, type: 2 }, resolve);
    });
    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'cancel_seq', id2, resolve);
    });
    assert(res);
    assert(!(await ares));
    res = await new Promise((resolve, reject) => {
        sock.call('zynq0', 'wait_seq', { id: id, type: 2 }, resolve);
    });
    assert(res);

    console.log("Waiting for update polling.");
    await sleep(1000);

    set_params.ttl.val10 = true;
    assert(object_equal((await zynq.get_values({ path: get_params })).values, set_params));
    assert(updates.length == 1);
    assert(object_equal(updates[0].zynq0.values,
                        { ttl: { val10: true }}));
    updates.length = 0;

    sock.disconnect();
}

module.exports = async function test() {
    let mgr = new SocketManager();
    let zynq = new Zynq('zynq0', { addr: 'tcp://127.0.0.1:6666' });
    mgr.add_source(zynq);

    await test_names(mgr, zynq);
    await test_sequence(mgr, zynq);

    // Make sure all requests have been processed.
    // Otherwise, the `destroy()` call could abort a request
    // and causes an error to be printed.
    await sleep(100);
    mgr.remove_source(zynq);
    zynq.destroy();
}
