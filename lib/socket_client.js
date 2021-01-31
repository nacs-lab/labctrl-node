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

// Uses the js file included in `_document.js`
const socket = io();
module.exports = socket;

const { is_object } = require('./utils');

socket.check_reconnect = function () {
    if (this.connected)
        return;
    this.disconnect();
    this.connect();
};

socket.call = async function (src_id, name, params) {
    if (!this.connected)
        return;
    return new Promise(resolve => this.emit('call', src_id, name, params, resolve));
};
socket.get = async function (raw_params, return_age) {
    if (!this.connected)
        return return_age ? [undefined, 0] : undefined;
    // TODO check cached values
    let params = Object.create(null);
    for (let src_id of Object.getOwnPropertyNames(raw_params))
        params[src_id] = { path: raw_params[src_id] };
    let raw_res = await new Promise(resolve => this.emit('get', params, resolve));
    let res = Object.create(null);
    for (let src_id of Object.getOwnPropertyNames(raw_res))
        res[src_id] = raw_res[src_id].values;
    if (!return_age)
        return res;
    let ages = Object.create(null);
    for (let src_id of Object.getOwnPropertyNames(raw_res)) {
        let age = raw_res[src_id].age;
        let copy_age = (param) => {
            if (!is_object(param))
                return age;
            let ages = Object.create(null);
            for (let name of Object.getOwnPropertyNames(param))
                ages[name] = copy_age(param[name]);
            return ages;
        };
        ages[src_id] = copy_age(raw_params[src_id]);
    }
    return [res, ages];
};
socket.set = async function (params) {
    if (!this.connected)
        return;
    return new Promise(resolve => this.emit('set', params, resolve));
};

const next_id = (() => {
    // Share the same ID space for all callback registered.
    // Makes it less likely to unregister a wrong type.
    let max_id = 0;
    return function next_id() {
        max_id += 1;
        return max_id;
    }
})();

class SignalListener {
    #listeners = Object.create(null)
    #listener_ids = Object.create(null)

    constructor() {
        socket.on('signal', ({ src_id, name, params }) => {
            let listener_src = this.#listener_ids[src_id];
            if (!listener_src)
                return;
            let listener_name = listener_src[name];
            if (!listener_name)
                return;
            for (let id of listener_name) {
                try {
                    let [_src_id, _name, cb] = this.#listeners[id];
                    cb({ src_id, name, params });
                }
                catch (e) {
                    console.error("Error when processing signal " +
                                  `${name} from source ${src_id}: `, e);
                }
            }
        });
        socket.on('disconnect', () => {
            this.#listeners = Object.create(null);
            this.#listener_ids = Object.create(null);
        });
    }

    listen(src_id, name, cb) {
        if (!socket.connected)
            return -1;
        let id = next_id();
        this.#listeners[id] = [src_id, name, cb];
        let listener_src = this.#listener_ids[src_id];
        if (!listener_src) {
            listener_src = Object.create(null);
            this.#listener_ids[src_id] = listener_src;
        }
        let listener_name = listener_src[name];
        if (!listener_name) {
            listener_name = new Set();
            listener_src[name] = listener_name;
            socket.emit('listen', src_id, name);
        }
        listener_name.add(id);
        return id;
    }

    unlisten(id) {
        if (!socket.connected)
            return;
        let [src_id, name] = this.#listeners[id];
        delete this.#listeners[id];
        let listener_src = this.#listener_ids[src_id];
        if (!listener_src)
            return;
        let listener_name = listener_src[name];
        if (!listener_name)
            return;
        listener_name.delete(id);
        if (listener_name.size == 0)
            socket.emit('unlisten', src_id, name);
        delete listener_src[name];
    }
};
const signal_listener = new SignalListener();

socket.listen = function (src_id, name, cb) {
    return signal_listener.listen(src_id, name, cb);
};
socket.unlisten = function (id) {
    signal_listener.unlisten(id);
};
