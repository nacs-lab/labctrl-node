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

const { BufferReader, Dealer } = require('./zmq_utils');
const sleep = require('../lib/sleep');
const { parse_cmdlist } = require(process.env.LABCTRL_LIB_DIR + '/labctrl');

class ParseError {
    constructor(msg, line, lineno, colnum, colstart, colend) {
        this.msg = msg;
        this.line = line;
        this.lineno = lineno;
        this.colnum = colnum;
        this.colstart = colstart;
        this.colend = colend;
    }
};

class ZynqSocket extends Dealer {
    async set_startup(cmdlist) {
        let [rep] = await this.query(['set_startup', cmdlist + '\0']);
        let reader = new BufferReader(rep);
        if (!reader.byte_left()) {
            console.warn("Invalid set_startup reply: message too short.");
            return false;
        }
        let err = reader.read_int8();
        if (err == 0)
            return true;
        // Unknown error
        if (err != 1) {
            console.info(`Unknown set_startup error code: ${err}.`);
            return false;
        }
        let msg = reader.read_str0();
        let line = reader.read_str0();
        if (msg === undefined || line === undefined || reader.byte_left() < 16) {
            console.warn(`Invalid set_startup reply: Truncated ParseError.`);
            return false;
        }
        let lineno = reader.read_int32();
        let colnum = reader.read_int32();
        let colstart = reader.read_int32();
        let colend = reader.read_int32();
        return new ParseError(msg, line, lineno, colnum, colstart, colend);
    }
    async get_startup() {
        let [rep] = await this.query('get_startup');
        let reader = new BufferReader(rep);
        return reader.read_str0();
    }
    _check_errno(rep) {
        let reader = new BufferReader(rep);
        if (!reader.byte_left())
            return false;
        let err = reader.read_int8();
        if (err == 0)
            return true;
        return false;
    }
    async _set_names(cmd, names) {
        let msg = Buffer.allocUnsafe(0);
        for (let [key, name] of names)
            msg = Buffer.concat([msg, Buffer.from([key]),
                                 Buffer.from(name + '\0')]);
        let [rep] = await this.query([cmd, msg]);
        return this._check_errno(rep);
    }
    async _get_names(cmd) {
        let [rep] = await this.query(cmd);
        let reader = new BufferReader(rep);
        let names = [];
        while (reader.byte_left()) {
            let chn = reader.read_int8();
            let name = reader.read_str0();
            names.push([chn, name]);
        }
        return names;
    }
    set_ttl_names(names) {
        return this._set_names('set_ttl_names', names);
    }
    get_ttl_names() {
        return this._get_names('get_ttl_names');
    }
    set_dds_names(names) {
        return this._set_names('set_dds_names', names);
    }
    get_dds_names() {
        return this._get_names('get_dds_names');
    }
    async override_ttl(hi, lo, normal) {
        let msg = Buffer.allocUnsafe(12);
        msg.writeUInt32LE(hi, 0);
        msg.writeUInt32LE(lo, 4);
        msg.writeUInt32LE(normal, 8);
        let [rep] = await this.query(['override_ttl', msg]);
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 8) {
            console.warn(`Invalid override_ttl reply: Reply too short.`);
            return [0, 0];
        }
        hi = reader.read_uint32();
        lo = reader.read_uint32();
        return [hi, lo];
    }
    async set_ttl(hi, lo) {
        let msg = Buffer.allocUnsafe(8);
        msg.writeUInt32LE(hi, 0);
        msg.writeUInt32LE(lo, 4);
        let [rep] = await this.query(['set_ttl', msg]);
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 4) {
            console.warn(`Invalid set_ttl reply: Reply too short.`);
            return 0;
        }
        return reader.read_uint32();
    }
    async set_clock(clock) {
        let [rep] = await this.query(['set_clock', Buffer.from([clock])]);
        return this._check_errno(rep);
    }
    async get_clock() {
        let [rep] = await this.query('get_clock');
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 1) {
            console.warn(`Invalid get_clock reply: Reply too short.`);
            return 255;
        }
        return reader.read_uint8();
    }
    async _set_dds(cmd, vals) {
        let msg = Buffer.allocUnsafe(0);
        for (let [key, val] of vals) {
            let buff = Buffer.allocUnsafe(5);
            buff.writeUInt8(key);
            buff.writeUInt32(val, 1);
            msg = Buffer.concat([msg, buff]);
        }
        let [rep] = await this.query([cmd, msg]);
        return this._check_errno(rep);
    }
    async _get_dds(cmd, chns) {
        let req;
        if (chns !== undefined && chns.length > 0) {
            req = [cmd, Buffer.from(chns)];
        }
        else {
            req = cmd;
        }
        let [rep] = await this.query(req);
        let reader = new BufferReader(rep);
        let res = [];
        while (reader.byte_left() >= 5)
            res.push([reader.read_uint8(), reader.read_uint32()]);
        return res;
    }
    override_dds(vals) {
        return this._set_dds('override_dds', vals);
    }
    get_override_dds() {
        return this._get_dds('get_override_dds');
    }
    set_dds(vals) {
        return this._set_dds('set_dds', vals);
    }
    get_dds(chns) {
        return this._get_dds('get_dds', chns);
    }
    async reset_dds(chn) {
        let [rep] = await this.query(['reset_dds', Buffer.from([chn])]);
        return this._check_errno(rep);
    }
    async state_id() {
        let [rep] = await this.query('state_id');
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 16) {
            console.warn(`Invalid state_id reply: Reply too short.`);
            return [0n, 0n];
        }
        return [reader.read_int64(), reader.read_uint64()];
    }
    async run_cmdlist(cmdlist) {
        let ver = Buffer.from([1, 0, 0, 0]);
        let [rep] = await this.query(['run_cmdlist', ver, cmdlist]);
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 18)
            return false;
        return [[reader.read_uint64(), reader.read_uint64()],
                [reader.read_int8() != 0, reader.read_int8() != 0]]
    }
    async wait_seq(id, type) {
        let msg = Buffer.allocUnsafe(17);
        msg.writeBigUInt64(id[0]);
        msg.writeBigUInt64(id[1], 8);
        msg.writeInt8(type, 16);
        let [rep] = await this.query(['wait_seq', msg]);
        return this._check_errno(rep);
    }
    async cancel_seq(id) {
        let msg;
        if (id === undefined) {
            msg = 'cancel_seq';
        }
        else {
            let buf = Buffer.allocUnsafe(16);
            buf.writeBigUInt64(id[0]);
            buf.writeBigUInt64(id[1], 8);
            msg = ['canncel_seq', buf];
        }
        let [rep] = await this.query(msg);
        return this._check_errno(rep);
    }
};

function compare_array(a, b) {
    if (a.length != b.length)
        return false;
    for (let i in a) {
        if (a[i] != b[i]) {
            return false;
        }
    }
    return true;
}

function ttl_state(ttl_ovr_hi, ttl_ovr_lo, ttl_val, i) {
    let mask = 1 << i;
    if (ttl_ovr_hi & mask)
        return [true, true];
    if (ttl_ovr_lo & mask)
        return [false, true];
    return [(ttl_val & mask) != 0, false];
}

function dds_chn_name(id) {
    let typ = id >> 6;
    let chn = id & ((1 << 6) - 1);
    if (typ == 0)
        return `freq${chn}`;
    if (typ == 1)
        return `amp${chn}`;
    if (typ == 2)
        return `phase${chn}`;
    return `unknown${chn}`;
}

class Zynq {
    static ParseError = ParseError
    static parse_cmdlist(cmdlist) {
        return new Promise((resolve, reject) => {
            parse_cmdlist(cmdlist, ParseError, (err, res) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    }

    #sock
    #live = true
    #state_id = [0n, 0n]
    #prev_state_id = [0n, 0n]
    #update_running = false
    #prev_update_time = 0

    #max_watcher_id = 0
    #update_watchers = new Map()

    #ttl_ovr_lo = 0
    #ttl_ovr_hi = 0
    #ttl_val = 0
    #clock = 255
    #dds_val = new Map()
    #dds_ovr = new Set()
    constructor(params) {
        this.reconfig(params);
        this._liveness_id_check();
    }

    watch_update(cb) {
        let id = this.#max_watcher_id + 1;
        this.#max_watcher_id = id;
        this.#update_watchers.set(id, cb);
        return id;
    }
    unwatch_update(id) {
        this.#update_watchers.delete(id);
    }

    get live() {
        return this.#live;
    }
    get seq_running() {
        return this.#state_id < 0;
    }

    get_channels(chns) {
        if (typeof(chns) === 'string')
            return this.get_channels([chns])[0];
        let res = [];
        if (chns === undefined) {
            res.push(['clock', this.#clock, false]);
            for (let i = 0; i < 32; i++) {
                let state = ttl_state(this.#ttl_ovr_hi, this.#ttl_ovr_lo, this.#ttl_val, i);
                res.push([`ttl${i}`, ...state]);
            }
            for (let [chn, val] of this.#dds_val) {
                res.push([dds_chn_name(chn), val, this.#dds_ovr.has(chn)]);
            }
        }
        else {
            for (let chn of chns) {
                if (chn == 'clock') {
                    res.push(['clock', this.#clock, false]);
                    continue;
                }
                let m;
                if (m = chn.match(/^ttl([0-9]*)$/)) {
                    let i = Number(m[1]);
                    if (i >= 32)
                        continue;
                    let state = ttl_state(this.#ttl_ovr_hi, this.#ttl_ovr_lo, this.#ttl_val, i);
                    res.push([chn, ...state]);
                }
                else if (m = chn.match(/^(freq|amp|phase)([0-9]*)$/)) {
                    let type = m[1];
                    let i = Number(m[2]);
                    if (type == 'amp') {
                        i |= 1 << 6;
                    }
                    else if (type == 'phase') {
                        i |= 2 << 6;
                    }
                    let val = this.#dds_val.get(i);
                    if (val === undefined)
                        continue;
                    res.push([chn, val, this.#dds_ovr.has(i)]);
                }
            }
        }
        return res;
    }
    set_channels(vals) {
        let changes = [];

        let ttl_ovr_hi = 0;
        let ttl_ovr_lo = 0;
        let ttl_ovr_normal = 0;
        let ttl_hi = 0;
        let ttl_lo = 0;

        let dds_cmd = [];
        let dds_ovr_cmd = [];

        for (let [chn, val, ovr] of vals) {
            if (chn == 'clock') {
                if (val != this.#clock) {
                    this.#clock = val;
                    changes.push(['clock', this.#clock, false]);
                }
                this.#sock.set_clock(val).catch(e => {
                    console.error("Error setting clock: ", e);
                });
                continue;
            }
            let m;
            if (m = chn.match(/^ttl([0-9]*)$/)) {
                let i = Number(m[1]);
                if (i >= 32)
                    continue;
                let cur_state = ttl_state(this.#ttl_ovr_hi, this.#ttl_ovr_lo, this.#ttl_val, i);
                if (val != cur_state[0] || ovr != cur_state[1]) {
                    if (ovr) {
                        if (val) {
                            this.#ttl_ovr_hi |= mask;
                        }
                        else {
                            this.#ttl_ovr_lo |= mask;
                        }
                    }
                    if (val) {
                        this.#ttl_val |= mask;
                    }
                    else {
                        this.#ttl_val &= ~mask;
                    }
                    changes.push([chn, val, ovr]);
                }
                let mask = 1 << i;
                if (ovr) {
                    if (val) {
                        ttl_ovr_hi = ttl_ovr_hi | mask;
                    }
                    else {
                        ttl_ovr_lo = ttl_ovr_lo | mask;
                    }
                }
                else {
                    ttl_ovr_normal = ttl_ovr_normal | mask;
                    if (val) {
                        ttl_hi = ttl_hi | mask;
                    }
                    else {
                        ttl_lo = ttl_lo | mask;
                    }
                }
            }
            else if (m = chn.match(/^(freq|amp|phase)([0-9]*)$/)) {
                let type = m[1];
                let i = Number(m[2]);
                if (type == 'amp') {
                    i |= 1 << 6;
                }
                else if (type == 'phase') {
                    i |= 2 << 6;
                }
                let old_val = this.#dds_val.get(i);
                if (old_val !== undefined) {
                    let old_ovr = this.#dds_ovr.has(i);
                    if (val != old_val || ovr != old_ovr) {
                        if (ovr) {
                            this.#dds_ovr.add(i);
                        }
                        else {
                            this.#dds_ovr.delete(i);
                        }
                        this.#dds_val.set(i, val);
                    }
                    changes.push([chn, val, ovr]);
                }
                if (ovr) {
                    dds_ovr_cmd.push([i, val]);
                }
                else {
                    dds_ovr_cmd.push([i, 0xffffffff]);
                    dds_cmd.push([i, val]);
                }
            }
        }
        this._send_ttl_cmd(ttl_ovr_hi, ttl_ovr_lo, ttl_ovr_normal, ttl_hi, ttl_lo);
        this._send_dds_cmd(dds_cmd, dds_ovr_cmd);
        this._fire_update_callback(changes);
    }
    _send_ttl_cmd(ttl_ovr_hi, ttl_ovr_lo, ttl_ovr_normal, ttl_hi, ttl_lo) {
        if (ttl_hi || ttl_lo) {
            // Set the TTL value first before disabling override to minimize
            // output flip flop.
            this.#sock.set_ttl(ttl_hi, ttl_lo).catch(e => {
                console.error("Error set ttl: ", e);
            });
        }
        if (ttl_ovr_hi || ttl_ovr_lo || ttl_ovr_normal) {
            this.#sock.override_ttl(ttl_ovr_hi, ttl_ovr_lo, ttl_ovr_normal).catch(e => {
                console.error("Error set ttl override: ", e);
            });
        }
    }
    _send_dds_cmd(dds_cmd, dds_ovr_cmd) {
        if (dds_cmd.length > 0) {
            this.#sock.set_dds(dds_cmd).catch(e => {
                console.error("Error set dds: ", e);
            });
        }
        if (dds_ovr_cmd.length) {
            this.#sock.override_dds(dds_ovr_cmd).catch(e => {
                console.error("Error set dds override: ", e);
            });
        }
    }

    reconfig(params) {
        if (this.#sock) {
            if (this.#sock.addr != params.addr) {
                this.#sock.close();
                this.#sock = new ZynqSocket(params.addr);
            }
        }
        else {
            this.#sock = new ZynqSocket(params.addr);
        }
    }

    destroy() {
        this.#sock.close();
        // This stops the background worker tasks.
        this.#sock = undefined;
    }

    async set_startup(startup) {
        return await this.#sock.set_startup(startup);
    }
    async get_startup() {
        return await this.#sock.get_startup();
    }

    async set_ttl_names(names) {
        return await this.#sock.set_ttl_names(names);
    }
    async get_ttl_names() {
        return await this.#sock.get_ttl_names();
    }

    async set_dds_names(names) {
        return await this.#sock.set_dds_names(names);
    }
    async get_dds_names() {
        return await this.#sock.get_dds_names();
    }

    async reset_dds(chn) {
        if (!(await this.#sock.reset_dds()))
            return false;
        let changes = [];
        for (let type = 0; type < 3; type++) {
            let i = chn | (type << 6);
            if (this.#dds_val.has(i)) {
                changes.push([i, 0, false]);
                this.#dds_val.set(i, 0);
            }
            this.#dds_ovr.delete(i);
        }
        this._fire_update_callback(changes);
    }

    _should_update(cur_t) {
        // State changed or state unknown.
        if (!compare_array(this.#state_id, this.#prev_state_id) ||
            compare_array(this.#state_id, [0, 0]) || this.#state_id[0] < 0)
            return true;
        // one minute since last update.
        if (cur_t - this.#prev_update_time > 60000)
            return true;
        return false;
    }

    async _update_state_real() {
        let cur_t = Date.now();
        if (!this._should_update(cur_t))
            return;
        this.#prev_state_id = this.#state_id;
        this.#prev_update_time = cur_t;
        let changes = [];
        // Cache in local variables first to make sure
        // the values are always consistent with each other.
        let ttl_ovr_hi;
        let ttl_ovr_lo;
        let ttl_val;
        let ttl_ovr_res = this.#sock.override_ttl(0, 0, 0).then(([hi, lo]) => {
            ttl_ovr_hi = hi;
            ttl_ovr_lo = lo;
        });
        let ttl_res = this.#sock.set_ttl(0, 0).then(val => {
            ttl_val = val;
        });
        let clock_res = this.#sock.get_clock().then(val => {
            if (this.#clock != val)
                changes.push(['clock', val, false]);
            this.#clock = val;
        });
        let dds_val;
        let dds_res = this.#sock.get_dds().then(val => {
            dds_val = val;
        });
        let dds_ovr_val;
        let dds_ovr_res = this.#sock.get_override_dds().then(val => {
            dds_ovr_val = val;
        });

        await Promise.all([ttl_ovr_res, ttl_res, clock_res, dds_res, dds_ovr_res]);
        this._handle_ttl_update(ttl_ovr_hi, ttl_ovr_lo, ttl_val, changes);
        this._handle_dds_update(dds_val, dds_ovr_val, changes);
        this._fire_update_callback(changes);
    }
    _fire_update_callback(changes) {
        if (changes.length == 0)
            return;
        this.#update_watchers.forEach(async cb => {
            // Swallow all errors for now.
            try {
                await cb(changes);
            }
            catch (e) {
                console.error("Update callback error: ", e);
            }
        });
    }
    _handle_ttl_update(ttl_ovr_hi, ttl_ovr_lo, ttl_val, changes) {
        ttl_val = (ttl_val | ttl_ovr_hi) & ~ttl_ovr_lo;
        for (let i = 0; i < 32; i++) {
            let old_st = ttl_state(this.#ttl_ovr_hi, this.#ttl_ovr_lo, this.#ttl_val, i);
            let new_st = ttl_state(ttl_ovr_hi, ttl_ovr_lo, ttl_val, i);
            if (compare_array(old_st, new_st))
                continue;
            changes.push([`ttl${i}`, ...new_st]);
        }
        this.#ttl_ovr_hi = ttl_ovr_hi;
        this.#ttl_ovr_lo = ttl_ovr_lo;
        this.#ttl_val = ttl_val;
    }
    _handle_dds_update(dds_val, dds_ovr_val, changes) {
        let chns = new Set();
        let ovr_chns = new Set();
        for (let [chn, val] of dds_ovr_val) {
            ovr_chns.add(chn);
            chns.add(chn);
            if (this.#dds_val.get(chn) != val) {
                this.#dds_val.set(chn, val);
            }
            else if (this.#dds_ovr.has(chn)) {
                continue;
            }
            this.#dds_ovr.add(chn);
            changes.push([dds_chn_name(chn), val, true]);
        }
        for (let [chn, val] of dds_val) {
            chns.add(chn);
            if (this.#dds_val.get(chn) === val)
                continue;
            // If we've already seen this channel in the override result,
            // assume the value from override is correct.
            if (ovr_chns.has(chn))
                continue;
            this.#dds_val.set(chn, val);
            changes.push([dds_chn_name(chn), val, false]);
        }
        for (let [chn, val] of this.#dds_val) {
            if (chns.has(chn))
                continue;
            this.#dds_val.delete(chn);
            changes.push([dds_chn_name(chn), null, false]);
        }
        for (let chn of this.#dds_ovr) {
            if (ovr_chns.has(chn))
                continue;
            // We only need to push the override update if the channel still exist.
            if (chns.has(chn))
                changes.push([dds_chn_name(chn), this.#dds_val.get(chn), false]);
            this.#dds_ovr.delete(chn);
        }
    }
    async _update_state() {
        // Previous one haven't finished.
        if (this.#update_running)
            return;
        this.#update_running = true;
        try {
            this._update_state_real();
        }
        catch {
        }
        this.#update_running = false;
    }

    async _liveness_id_check() {
        while (this.#sock) {
            try {
                let timeout = setTimeout(() => {
                    if (!this.#sock)
                        return;
                    // Too long without any reply, try restarting.
                    console.warn(`Zynq server ${this.#sock.addr} is not responding, restarting.`);
                    this.#live = false;
                    this.#sock.close();
                    this.#sock.open();
                }, 10000);
                this.#state_id = await this.#sock.state_id();
                clearTimeout(timeout);
                if (this.#state_id[1] != this.#prev_state_id[1] &&
                    this.#prev_state_id[1] != 0) {
                    console.warn(`Zynq server ${this.#sock.addr} restarted, abort all requests.`);
                    this.#sock.abort_all();
                }
                this.#live = true;
                this._update_state();
                if (this.#state_id[0] < 0) {
                    await sleep(100);
                }
                else {
                    await sleep(500);
                }
            }
            catch {
                continue;
            }
        }
    }

    async run_cmdlist(cmdlist) {
        let bin = await Zynq.parse_cmdlist(cmdlist);
        let res = await this.#sock.run_cmdlist(bin);
        // If the sequence starts successfully, fake a state id to inform the user
        // about the running sequence.
        if (res && this.#state_id > 0)
            this.#state_id |= 1 << 31;
        return res;
    }
    wait_seq(id, type) {
        return this.#sock.wait_seq(id, type);
    }
    cancel_seq(id) {
        return this.#sock.cancel_seq(id);
    }
};
module.exports = Zynq;
