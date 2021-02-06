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

const SocketManager = require('./socket_manager');
const { BufferReader, Dealer } = require('./zmq_utils');
const sleep = require('../lib/sleep');
const { is_object, array_equal } = require('../lib/utils');
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
        return { msg, line, lineno, colnum, colstart, colend };
    }
    async get_startup() {
        let [rep] = await this.query('get_startup');
        let reader = new BufferReader(rep);
        return reader.read_str0();
    }
    #check_errno(rep) {
        let reader = new BufferReader(rep);
        if (!reader.byte_left())
            return false;
        let err = reader.read_int8();
        if (err == 0)
            return true;
        return false;
    }
    async #set_names(cmd, names) {
        let msg = Buffer.allocUnsafe(0);
        for (let [key, name] of names)
            msg = Buffer.concat([msg, Buffer.from([key]),
                                 Buffer.from(name + '\0')]);
        let [rep] = await this.query([cmd, msg]);
        return this.#check_errno(rep);
    }
    async #get_names(cmd) {
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
        return this.#set_names('set_ttl_names', names);
    }
    get_ttl_names() {
        return this.#get_names('get_ttl_names');
    }
    set_dds_names(names) {
        return this.#set_names('set_dds_names', names);
    }
    get_dds_names() {
        return this.#get_names('get_dds_names');
    }
    async override_ttl(lo, hi, normal) {
        let msg = Buffer.allocUnsafe(12);
        msg.writeInt32LE(lo | 0, 0);
        msg.writeInt32LE(hi | 0, 4);
        msg.writeInt32LE(normal | 0, 8);
        let [rep] = await this.query(['override_ttl', msg]);
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 8) {
            console.warn(`Invalid override_ttl reply: Reply too short.`);
            return [0, 0];
        }
        lo = reader.read_int32();
        hi = reader.read_int32();
        return [lo, hi];
    }
    async set_ttl(lo, hi) {
        let msg = Buffer.allocUnsafe(8);
        msg.writeInt32LE(lo | 0, 0);
        msg.writeInt32LE(hi | 0, 4);
        let [rep] = await this.query(['set_ttl', msg]);
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 4) {
            console.warn(`Invalid set_ttl reply: Reply too short.`);
            return 0;
        }
        return reader.read_int32();
    }
    async set_clock(clock) {
        let [rep] = await this.query(['set_clock', Buffer.from([clock])]);
        return this.#check_errno(rep);
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
    async #set_dds(cmd, vals) {
        let msg = Buffer.allocUnsafe(0);
        for (let [key, val] of vals) {
            let buff = Buffer.allocUnsafe(5);
            buff.writeUInt8(key);
            buff.writeInt32LE(val | 0, 1);
            msg = Buffer.concat([msg, buff]);
        }
        let [rep] = await this.query([cmd, msg]);
        return this.#check_errno(rep);
    }
    async #get_dds(cmd, chns) {
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
            res.push([reader.read_uint8(), reader.read_int32()]);
        return res;
    }
    override_dds(vals) {
        return this.#set_dds('override_dds', vals);
    }
    get_override_dds() {
        return this.#get_dds('get_override_dds');
    }
    set_dds(vals) {
        return this.#set_dds('set_dds', vals);
    }
    get_dds(chns) {
        return this.#get_dds('get_dds', chns);
    }
    async reset_dds(chn) {
        let [rep] = await this.query(['reset_dds', Buffer.from([chn])]);
        return this.#check_errno(rep);
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
    async name_id() {
        let [rep] = await this.query('name_id');
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 16) {
            console.warn(`Invalid name_id reply: Reply too short.`);
            return [0n, 0n];
        }
        return [reader.read_uint64(), reader.read_uint64()];
    }
    async run_cmdlist(cmdlist) {
        let ver = Buffer.from([1, 0, 0, 0]);
        let [rep] = await this.query(['run_cmdlist', ver, cmdlist]);
        let reader = new BufferReader(rep);
        if (reader.byte_left() < 18)
            return false;
        // The 16 bytes ID is meant to be two 64bit integers.
        // However, since we may want to pass this to the client
        // (which may or may not support BigInt)
        // and we don't really need to interpret these number,
        // we'll pass them around as four 32bit integers instead.
        return [[reader.read_int32(), reader.read_int32(),
                 reader.read_int32(), reader.read_int32()],
                [reader.read_int8() != 0, reader.read_int8() != 0]]
    }
    async wait_seq(id, type) {
        let msg = Buffer.allocUnsafe(17);
        msg.writeInt32LE(id[0]);
        msg.writeInt32LE(id[1], 4);
        msg.writeInt32LE(id[2], 8);
        msg.writeInt32LE(id[3], 12);
        msg.writeInt8(type, 16);
        let [rep] = await this.query(['wait_seq', msg]);
        return this.#check_errno(rep);
    }
    async cancel_seq(id) {
        let msg;
        if (id === undefined) {
            msg = 'cancel_seq';
        }
        else {
            let buf = Buffer.allocUnsafe(16);
            buf.writeInt32LE(id[0]);
            buf.writeInt32LE(id[1], 4);
            buf.writeInt32LE(id[2], 8);
            buf.writeInt32LE(id[3], 12);
            msg = ['cancel_seq', buf];
        }
        let [rep] = await this.query(msg);
        return this.#check_errno(rep);
    }
};

const dds_type_names = ['freq', 'amp', 'phase'];
function dds_chn_name(id) {
    let typ = id >> 6;
    let chn = id & ((1 << 6) - 1);
    return `${dds_type_names[typ]}${chn}`;
}

class Zynq extends SocketManager.Source {
    #sock
    #update_running = false
    #state_id = [0n, 0n]
    #prev_state_id = [0n, 0n]
    #update_value_time = 0
    #name_id = [0n, 0n]
    #prev_name_id = [0n, 0n]
    #update_name_time = 0

    // Lifetime and settings
    constructor(id, params) {
        super(id);
        this.reconfig(params);
        this.#set_init_vals();
        this.#poll_update();
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

    // Setting values
    #set_init_vals() {
        let init_vals = Object.create(null);
        init_vals.connected = true;
        init_vals.running = false;
        init_vals.clock = 255;
        init_vals.ttl = Object.create(null);
        for (let i = 0; i < 32; i++) {
            init_vals.ttl[`val${i}`] = false;
            init_vals.ttl[`ovr${i}`] = false;
            init_vals.ttl[`name${i}`] = '';
        }
        init_vals.dds = Object.create(null);
        for (let i = 0; i < 22; i++) {
            init_vals.dds[`ovr_freq${i}`] = false;
            init_vals.dds[`ovr_amp${i}`] = false;
            init_vals.dds[`ovr_phase${i}`] = false;
            init_vals.dds[`name${i}`] = '';
        }
        this.update_values(init_vals);
    }

    #set_ttl_vals(ttl_set, ttl_cur, updates) {
        let values = [];
        let ovrs = [];
        let names = [];
        updates.ttl = Object.create(null);
        for (let chn of Object.getOwnPropertyNames(ttl_set)) {
            let m;
            if (m = chn.match(/^val([0-9]*)$/)) {
                let i = Number(m[1]);
                if (i >= 32)
                    continue;
                values[i] = updates.ttl[chn] = !!ttl_set[chn];
            }
            else if (m = chn.match(/^ovr([0-9]*)$/)) {
                let i = Number(m[1]);
                if (i >= 32)
                    continue;
                ovrs[i] = updates.ttl[chn] = !!ttl_set[chn];
            }
            else if (m = chn.match(/^name([0-9]*)$/)) {
                let i = Number(m[1]);
                if (i >= 32)
                    continue;
                let name = String(ttl_set[chn]);
                updates.ttl[chn] = name;
                names.push([i, name]);
            }
        }
        if (names.length > 0) {
            this.#sock.set_ttl_names(names).catch(e => {
                console.error("Error setting TTL names: ", e);
            });
        }

        let ttl_ovr_hi = 0;
        let ttl_ovr_lo = 0;
        let ttl_ovr_normal = 0;
        let ttl_hi = 0;
        let ttl_lo = 0;

        for (let i = 0; i < 32; i++) {
            let ovr_set = ovrs[i];
            let ovr = ovr_set;
            if (ovr === undefined)
                ovr = ttl_cur[`ovr${i}`];
            let val_set = values[i];
            let val = val_set;
            if (val === undefined)
                val = ttl_cur[`val${i}`];
            let mask = 1 << i;
            if (ovr_set !== undefined || ovr) {
                val_set = undefined;
                if (!ovr) {
                    ttl_ovr_normal |= mask;
                    val_set = val; // Make sure value is set to override value.
                }
                else if (val) {
                    ttl_ovr_hi |= mask;
                }
                else {
                    ttl_ovr_lo |= mask;
                }
            }
            if (val_set !== undefined) {
                if (val) {
                    ttl_hi |= mask;
                }
                else {
                    ttl_lo |= mask;
                }
            }
        }
        if (ttl_hi || ttl_lo) {
            // Set the TTL value first before disabling override to minimize
            // output flip flop.
            this.#sock.set_ttl(ttl_lo, ttl_hi).catch(e => {
                console.error("Error set ttl: ", e);
            });
        }
        if (ttl_ovr_hi || ttl_ovr_lo || ttl_ovr_normal) {
            this.#sock.override_ttl(ttl_ovr_lo, ttl_ovr_hi, ttl_ovr_normal).catch(e => {
                console.error("Error set ttl override: ", e);
            });
        }
    }

    #set_dds_vals(dds_set, dds_cur, updates) {
        let values = { freq: [], amp: [], phase: [] };
        let ovrs = { freq: [], amp: [], phase: [] };
        let names = [];
        updates.dds = Object.create(null);
        for (let chn of Object.getOwnPropertyNames(dds_set)) {
            let m;
            if (m = chn.match(/^(freq|amp|phase)([0-9]*)$/)) {
                let type_name = m[1];
                let i = Number(m[2]);
                if (i > 22)
                    continue;
                let val = Math.round(Number(dds_set[chn]));
                if (Number.isFinite(val)) {
                    values[type_name][i] = val | 0;
                }
            }
            else if (m = chn.match(/^ovr_(freq|amp|phase)([0-9]*)$/)) {
                let type_name = m[1];
                let i = Number(m[2]);
                if (i > 22)
                    continue;
                ovrs[type_name][i] = !!dds_set[chn];
            }
            else if (m = chn.match(/^name([0-9]*)$/)) {
                let i = Number(m[1]);
                if (i >= 32)
                    continue;
                let name = String(dds_set[chn]);
                updates.dds[chn] = name;
                names.push([i, name]);
            }
        }
        if (names.length > 0) {
            this.#sock.set_dds_names(names).catch(e => {
                console.error("Error setting DDS names: ", e);
            });
        }

        let cmd = [];
        let ovr_cmd = [];

        for (let type_id = 0; type_id < 2; type_id++) {
            let type_name = dds_type_names[type_id];
            let type_values = values[type_name];
            let type_ovrs = ovrs[type_name];
            for (let i = 0; i < 22; i++) {
                let cmdi = i | (type_id << 6);
                let ovr_set = type_ovrs[i];
                let ovr = ovr_set;
                if (ovr === undefined)
                    ovr = dds_cur[`ovr_${type_name}${i}`];
                let val_set = type_values[i];
                let val_cur = dds_cur[`${type_name}${i}`];
                let val = val_set;
                if (val === undefined)
                    val = val_cur;
                let skip_cmd = false;
                if (ovr_set !== undefined || (ovr && val_set !== undefined)) {
                    if (!ovr) {
                        ovr_cmd.push([cmdi, -1]);
                    }
                    else {
                        ovr_cmd.push([cmdi, val]);
                        skip_cmd = true;
                    }
                }
                if (val_set !== undefined && !skip_cmd)
                    cmd.push([cmdi, val]);
                // Don't update cache if we didn't know that the cache exists.
                if (val_cur !== undefined) {
                    if (val_set !== undefined) {
                        updates.dds[`${type_name}${i}`] = val_set;
                    }
                    if (ovr_set !== undefined) {
                        updates.dds[`ovr_${type_name}${i}`] = ovr_set;
                    }
                }
            }
        }
        if (cmd.length > 0) {
            this.#sock.set_dds(cmd).catch(e => {
                console.error("Error set DDS: ", e);
            });
        }
        if (ovr_cmd.length) {
            this.#sock.override_dds(ovr_cmd).catch(e => {
                console.error("Error set DDS override: ", e);
            });
        }
    }

    set_values(vals) {
        if (!is_object(vals))
            return false;

        let cur_vals = this.get_values({}).values;

        let updates = Object.create(null);

        let clock_set = Number(vals.clock);
        if (clock_set >= 0 && clock_set <= 255) {
            updates.clock = clock_set;
            this.#sock.set_clock(clock_set).catch(e => {
                console.error("Error setting clock: ", e);
            });
        }

        let ttl_set = vals.ttl;
        if (is_object(ttl_set))
            this.#set_ttl_vals(ttl_set, cur_vals.ttl, updates);

        let dds_set = vals.dds;
        if (is_object(dds_set))
            this.#set_dds_vals(dds_set, cur_vals.dds, updates);

        this.update_values(updates);
        return true;
    }

    // Polling
    #should_update_values(cur_t) {
        // State changed or state unknown.
        if (!array_equal(this.#state_id, this.#prev_state_id) ||
            array_equal(this.#state_id, [0, 0]) || this.#state_id[0] < 0)
            return true;
        // one minute since last update.
        if (cur_t - this.#update_value_time > 60000)
            return true;
        return false;
    }
    async #update_values(cur_t) {
        if (!this.#should_update_values(cur_t))
            return;
        this.#prev_state_id = this.#state_id;
        this.#update_value_time = cur_t;

        let updates = Object.create(null);

        let clock_res = this.#sock.get_clock().then(val => {
            updates.clock = val;
        });

        updates.ttl = Object.create(null);
        let ttl_ovr_res = this.#sock.override_ttl(0, 0, 0).then(([lo, hi]) => {
            for (let i = 0; i < 32; i++) {
                let mask = 1 << i;
                if (hi & mask) {
                    updates.ttl[`val${i}`] = true;
                    updates.ttl[`ovr${i}`] = true;
                }
                else if (lo & mask) {
                    updates.ttl[`val${i}`] = false;
                    updates.ttl[`ovr${i}`] = true;
                }
                else {
                    updates.ttl[`ovr${i}`] = false;
                }
            }
        });
        let ttl_res = this.#sock.set_ttl(0, 0).then(val => {
            for (let i = 0; i < 32; i++) {
                let mask = 1 << i;
                let ovr_val = updates.ttl[`val${i}`];
                if (ovr_val === undefined) {
                    updates.ttl[`val${i}`] = !!(val & mask);
                }
            }
        });
        updates.dds = Object.create(null);
        for (let i = 0; i < 22; i++) {
            updates.dds[`freq${i}`] = null;
            updates.dds[`ovr_freq${i}`] = false;
            updates.dds[`amp${i}`] = null;
            updates.dds[`ovr_amp${i}`] = false;
            updates.dds[`phase${i}`] = null;
            updates.dds[`ovr_phase${i}`] = false;
        }
        let dds_res = this.#sock.get_dds().then(dds_val => {
            for (let [chn, val] of dds_val) {
                let name = dds_chn_name(chn);
                let ovr_val = updates.dds[name];
                if (ovr_val === null) {
                    updates.dds[name] = val;
                }
            }
        });
        let dds_ovr_res = this.#sock.get_override_dds().then(dds_ovr_val => {
            for (let [chn, val] of dds_ovr_val) {
                let name = dds_chn_name(chn);
                updates.dds[name] = val;
                updates.dds[`ovr_${name}`] = true;
            }
        });
        await Promise.all([ttl_ovr_res, ttl_res, clock_res, dds_res, dds_ovr_res]);
        this.update_values(updates);
    }

    #should_update_names(cur_t) {
        // Name changed or name unknown.
        if (!array_equal(this.#name_id, this.#prev_name_id) ||
            array_equal(this.#name_id, [0, 0]))
            return true;
        // one minute since last update.
        if (cur_t - this.#update_name_time > 60000)
            return true;
        return false;
    }
    async #update_names(cur_t) {
        if (!this.#should_update_names(cur_t))
            return;
        this.#prev_name_id = this.#name_id;
        this.#update_name_time = cur_t;

        let updates = Object.create(null);
        updates.ttl = Object.create(null);
        for (let i = 0; i < 32; i++)
            updates.ttl[`name${i}`] = '';
        let ttl_name_res = this.#sock.get_ttl_names.then((names) => {
            for (let [chn, name] of names) {
                updates.ttl[`name${chn}`] = name;
            }
        });
        updates.dds = Object.create(null);
        for (let i = 0; i < 22; i++)
            updates.dds[`name${i}`] = '';
        let dds_name_res = this.#sock.get_dds_names.then((names) => {
            for (let [chn, name] of names) {
                updates.dds[`name${chn}`] = name;
            }
        });
        await Promise.all([ttl_name_res, dds_name_res]);
        this.update_values(updates);
    }
    async #update_state() {
        // Previous ones haven't finished.
        if (this.#update_running)
            return;
        this.#update_running = true;
        let cur_t = Date.now();
        await Promise.allSettled([this.#update_values(cur_t), this.#update_names(cur_t)]);
        this.#update_running = false;
    }

    async #poll_update() {
        let timeout;
        while (this.#sock) {
            try {
                timeout = setTimeout(() => {
                    if (!this.#sock)
                        return;
                    // Too long without any reply, try restarting.
                    console.warn(`Zynq server ${this.#sock.addr} is not responding, restarting.`);
                    this.update_values({ connected: false });
                    this.#sock.close();
                    this.#update_running = false;
                    this.#sock.open();
                }, 20000);
                let state_id = this.#sock.state_id();
                let name_id = this.#sock.name_id();
                [this.#state_id, this.#name_id] = await Promise.all([state_id, name_id]);
                this.update_values({ running: this.#state_id[0] < 0 });
                clearTimeout(timeout);
                timeout = undefined;
                if (this.#state_id[1] != this.#prev_state_id[1] &&
                    this.#prev_state_id[1] != 0) {
                    console.warn(`Zynq server ${this.#sock.addr} restarted, abort all requests.`);
                    this.#sock.abort_all();
                }
                this.update_values({ connected: true });
                // Launch the update asynchronously
                // so that we can start the next cycle to check the connection again.
                this.#update_state();
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
        // Clear the timeout check so that we don't have to wait for it to finish
        // before the process can exit.
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
    }

    // Other requests
    async #reset_dds(chn) {
        chn = Number(chn);
        if (chn < 0 || chn >= 22 || !(await this.#sock.reset_dds(chn)))
            return false;
        let cur_vals = this.get_values({}).values;
        let updates = Object.create(null);
        updates.dds = Object.create(null);
        for (let type_id = 0; type_id < 3; type_id++) {
            let name = `${dds_type_names[type_id]}${chn}`;
            if (cur_vals.dds[name] !== undefined)
                updates.dds[name] = 0;
            updates.dds[`ovr_${name}`] = false;
        }
        this.update_values(updates);
    }

    async #run_cmdlist(cmdlist) {
        let error;
        let bin = await new Promise((resolve) => {
            parse_cmdlist(String(cmdlist), ParseError, (err, res) => {
                if (err !== null) {
                    error = err;
                    resolve();
                }
                else {
                    resolve(res);
                }
            });
        });
        if (bin === undefined) {
            if (error instanceof ParseError) {
                return {
                    msg: error.msg, line: error.line, lineno: error.lineno,
                    colnum: error.colnum, colstart: error.colstart, colend: error.colend,
                };
            }
            return false;
        }
        let res = await this.#sock.run_cmdlist(bin);
        // If the sequence starts successfully, fake a state id to inform the user
        // about the running sequence.
        if (res && this.#state_id[0] > 0) {
            this.#state_id[0] |= 1n << 31n;
            this.update_values({ running: true });
        }
        return res;
    }

    call_method(name, params) {
        if (name == 'get_startup') {
            return this.#sock.get_startup();
        }
        else if (name == 'set_startup') {
            return this.#sock.set_startup(String(params));
        }
        else if (name == 'reset_dds') {
            return this.#reset_dds(params);
        }
        else if (name == 'run_cmdlist') {
            return this.#run_cmdlist(params);
        }
        else if (name == 'wait_seq') {
            let { id, type } = params;
            type = Number(type) | 0;
            if (type != 1 && type != 2)
                return;
            return this.#sock.wait_seq(id, type);
        }
        else if (name == 'cancel_seq') {
            return this.#sock.cancel_seq(params);
        }
        return;
    }
};
module.exports = Zynq;
