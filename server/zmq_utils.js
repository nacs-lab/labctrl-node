/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
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

const zmq = require('zeromq');

class BufferReader {
    constructor(buff) {
        this.pos = 0;
        this.buff = buff;
    }
    byte_left() {
        return this.buff.length - this.pos;
    }
    read_str0() {
        let end = this.buff.indexOf(0, this.pos);
        if (end < 0)
            return;
        let res = this.buff.toString('utf8', this.pos, end);
        this.pos = end + 1;
        return res;
    }
    read_int8() {
        let res = this.buff.readInt8(this.pos);
        this.pos += 1;
        return res;
    }
    read_int16() {
        let res = this.buff.readInt16LE(this.pos);
        this.pos += 2;
        return res;
    }
    read_int32() {
        let res = this.buff.readInt32LE(this.pos);
        this.pos += 4;
        return res;
    }
    read_int64() {
        let res = this.buff.readBigInt64LE(this.pos);
        this.pos += 8;
        return res;
    }
    read_uint8() {
        let res = this.buff.readUInt8(this.pos);
        this.pos += 1;
        return res;
    }
    read_uint16() {
        let res = this.buff.readUInt16LE(this.pos);
        this.pos += 2;
        return res;
    }
    read_uint32() {
        let res = this.buff.readUInt32LE(this.pos);
        this.pos += 4;
        return res;
    }
    read_uint64() {
        let res = this.buff.readBigUInt64LE(this.pos);
        this.pos += 8;
        return res;
    }
};
module.exports.BufferReader = BufferReader;

class Dealer {
    #addr
    #sock
    #waiters
    #max_id = 0
    #worker_running = false
    constructor(addr) {
        this.#addr = addr;
        this.#waiters = new Map();
        this.open();
    }

    get addr() {
        return this.#addr;
    }

    // Manage waiter ID
    _alloc_cb_id() {
        this.#max_id = this.#max_id + 1;
        return this.#max_id;
    }
    _pop_cb_id(id) {
        let val = this.#waiters.get(id);
        this.#waiters.delete(id);
        if (this.#waiters.size == 0)
            this.#max_id = 0;
        return val;
    }

    // The worker will be running if and only if there are waiters.
    // The waiting task should add itself to waiters before
    // starting the worker.
    async _ensure_worker() {
        if (this.#worker_running)
            return;
        this.#worker_running = true;
        while (this.#waiters.size > 0) {
            try {
                if (!this.#sock)
                    break;
                let rep = await this.#sock.receive();
                // Shouldn't happen but isn't our problem if it does...
                if (rep.length == 0)
                    continue;
                let addr_buff = rep.shift();
                // Incorrect reply. Ignore.
                if (addr_buff.length != 5 || addr_buff.readInt8(0) != 5)
                    continue;
                let cb = this._pop_cb_id(addr_buff.readUInt32LE(1));
                if (cb === undefined)
                    continue;
                while (rep.length > 0) {
                    if (rep.shift().length == 0) {
                        break;
                    }
                }
                cb.resolve(rep);
            }
            catch {
                if (!this.#sock || this.#sock.closed)
                    break;
                continue;
            }
        }
        this.#worker_running = false;
    }

    async query(msgs) {
        let id = this._alloc_cb_id();
        let addr_buff = Buffer.allocUnsafe(5);
        addr_buff.writeInt8(5, 0);
        addr_buff.writeUInt32LE(id, 1);
        if (Array.isArray(msgs)) {
            msgs = [addr_buff, null, ...msgs];
        }
        else {
            msgs = [addr_buff, null, msgs];
        }
        if (!this.#sock || this.#sock.closed)
            throw new Error('Socket is closed');
        let res = new Promise((resolve, reject) => {
            this.#waiters.set(id, { resolve, reject });
            this._ensure_worker();
        });
        try {
            await this.#sock.send(msgs);
        }
        catch (e) {
            this._pop_cb_id(id);
            throw e;
        }
        return await res;
    }

    abort_all() {
        for (let [id, cb] of this.#waiters)
            cb.reject(new Error('Socket is closed'));
        this.#waiters.clear();
    }
    open() {
        if (this.#sock)
            return;
        this.#sock = new zmq.Dealer();
        this.#sock.linger = 0;
        this.#sock.connect(this.#addr);
    }
    close() {
        if (!this.#sock)
            return;
        this.#sock.disconnect(this.#addr);
        this.#sock.close();
        this.#sock = undefined;
        this.abort_all();
    }
};
module.exports.Dealer = Dealer;
