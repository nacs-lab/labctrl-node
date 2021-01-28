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

const { is_object } = require('../lib/utils');

// Event generation is likely per source
// and each socket is more likely to subscribe to a single source
// so we can store the subscription and data age info per source
// in order to minimize the scanning required when emitting events/updates.
class SocketData {
    signals = new Set()
    pending_update = null

    pop_pending_update() {
        let update = this.pending_update;
        this.pending_update = null;
        return update;
    }
};

class Source {
    // Use a single age per source instead of having more fine grain age, e.g. per channel/value.
    // This does mean that `get_values` or the initial `watch_values` request
    // may return some values that are not necessary.
    // However, `get_values` should mainly be used for the initial population of the state
    // whereas `watch_values` should come right after a `get_values`
    // so I don't really either should have a very high chance of needing a partial update.
    // (`get_values` would likely need all the values
    //  whereas `watch_values` would likely already have the most up-to-date value
    //  unless the source updated the value between the `get_values` and `watch_values`.)
    // On the other hand, making the age per source means we don't need to store the age
    // with the values and simplifies a lot of the processing.
    #age = 1
    get age() {
        return this.#age;
    }
    #id
    get id() {
        return this.#id;
    }
    #mgr
    set socket_manager(mgr) {
        this.#mgr = mgr;
    }
    #values = Object.create(null)
    #sockets = new Map()

    constructor(id) {
        this.#id = id;
    }

    #get_socket_data(sock) {
        let data = this.#sockets.get(sock);
        if (data)
            return data;
        data = new SocketData();
        this.#sockets.set(sock, data);
        return data;
    }
    clear() {
        this.#sockets.clear();
    }
    remove_socket(sock) {
        this.#sockets.delete(sock);
    }

    * get_pending_updates() {
        for (let [sock, data] of this.#sockets) {
            let update = data.pop_pending_update();
            if (update === null)
                continue;
            yield [sock, update];
        }
    }

    // To be called by the source implementation.
    emit_signal(name, params) {
        for (let [sock, data] of this.#sockets) {
            if (data.signals.has(name)) {
                this.#mgr.auth_socket(sock)
                    .then((ok) => ok && sock.emit('signal', { id: this.id, name, params }));
            }
        }
    }

    // abstract: set_values(params)
    // abstract: call_method(name, params)
    // This may return a reference to the internal storage.
    // Do not cache the returned object and do not mutate it.
    get_values({ age, path }) {
        if ((age && age >= this.#age))
            return null;
        let get_val = function (value, path) {
            let res = Object.create(null);
            for (let name of Object.getOwnPropertyNames(path)) {
                if (!Object.prototype.hasOwnProperty.call(value, name)) {
                    // Signal to the caller that the subtree/value doesn't exist (anymore).
                    res[name] = null;
                    continue;
                }
                let subpath = path[name];
                let subvalue = value[name];
                if (!is_object(subpath)) {
                    res[name] = subvalue;
                }
                else {
                    res[name] = get_val(subvalue, subpath);
                }
            }
            return res;
        };
        let values = is_object(path) ? get_val(this.#values, path) : this.#values;
        return { age: this.#age, values };
    }

    listen_signal(name, sock) {
        let data = this.#get_socket_data(sock);
        data.signals.add(name);
    }
    unlisten_signal(name, sock) {
        let data = this.#get_socket_data(sock);
        data.signals.delete(name);
    }

    watch_values(params, sock) {
        let data = this.#get_socket_data(sock);
        // TODO add watches and queue update
    }
    unwatch_values(params, sock) {
        let data = this.#get_socket_data(sock);
        // TODO remove watches
    }
};

class SocketManager {
    static Source = Source;

    #sources = new Map()
    #update_timer = 0

    ensure_update_timer() {
        if (this.#update_timer > 0)
            return;
        // Bunch up update events within 30 ms
        this.#update_timer = setTimeout(() => {
            this.#update_timer = 0;
            this.#flush_update();
        }, 30);
    }
    #flush_update() {
        let updates = new Map();
        for (let [src_id, source] of this.#sources) {
            for (let [sock, update] of source.get_pending_updates()) {
                let all_update = updates.get(sock);
                if (!all_update) {
                    all_update = Object.create(null);
                    updates.set(sock, all_update);
                }
                all_update[src_id] = { age: source.age, values: update };
            }
        }
        for (let [sock, update] of updates) {
            this.auth_socket(sock).then((ok) => ok && sock.emit('update', update));
        }
    }

    async #handle(sock, name, req, callback) {
        // From the socketio source code, adding a `onAll` handling
        // or using a socket middleware (with `use`)
        // to disconnect all the handlers should work equally well.
        // However, I don't see this being documented anywhere
        // and I could imagine implementation changing when the disconnection
        // becomes visible.
        // This any change here will mainly be a minor security issue
        // and not a functional one, it can easily go undetected.
        // This is why we'll use our own hook which also make testing a bit easier.
        if (!(await this.auth_socket(sock))) {
            // Be a little nice and inform the client that it's rejected.
            if (callback instanceof Function)
                callback();
            return;
        }
        try {
            let res = await req();
            if (callback instanceof Function) {
                callback(res);
            }
        }
        catch (err) {
            console.log(`Error when processing '${name}' request:`, err);
            if (callback instanceof Function) {
                callback();
            }
        }
    }

    #auth_handler
    set_auth_handler(handler) {
        this.#auth_handler = handler;
    }
    async auth_socket(sock) {
        if (this.#auth_handler !== undefined && !(await this.#auth_handler(sock))) {
            // Authentication failed.
            // Disconnect from future signals.
            sock.sm_disconnect_handlers();
            return false;
        }
        return true;
    }

    add_socket(sock) {
        let call_handler = (src_id, name, params, callback) => {
            this.#handle(sock, 'call', () => this.call_method(src_id, name, params), callback);
        }
        let get_handler = (params, callback) => {
            if (!(callback instanceof Function)) {
                console.log('Ignoring get value request without reply.');
                return;
            }
            this.#handle(sock, 'get', () => this.get_values(params), callback);
        }
        let set_handler = (params, callback) => {
            this.#handle(sock, 'set', () => this.set_values(params), callback);
        }

        let listen_handler = (src_id, name) => {
            this.#handle(sock, 'listen', () => this.#listen_signal(src_id, name, sock));
        };
        let unlisten_handler = (src_id, name) => {
            this.#handle(sock, 'unlisten', () => this.#unlisten_signal(src_id, name, sock));
        };

        let watch_handler = (params) => {
            this.#handle(sock, 'watch', () => this.#watch_values(params, sock));
        };
        let unwatch_handler = (params) => {
            this.#handle(sock, 'unwatch', () => this.#unwatch_values(params, sock));
        };
        sock.sm_disconnect_handlers = () => {
            sock.off('call', call_handler);
            sock.off('get', get_handler);
            sock.off('set', set_handler);

            sock.off('listen', listen_handler);
            sock.off('unlisten', unlisten_handler);

            sock.off('watch', watch_handler);
            sock.off('unwatch', unwatch_handler);

            for (let [src_id, source] of this.#sources) {
                source.remove_socket(sock);
            }
        };

        sock.on('disconnect', sock.sm_disconnect_handlers);

        sock.on('call', call_handler);
        sock.on('get', get_handler);
        sock.on('set', set_handler);

        sock.on('listen', listen_handler);
        sock.on('unlisten', unlisten_handler);

        sock.on('watch', watch_handler);
        sock.on('unwatch', unwatch_handler);
    }

    #use_source(name, src_id, cb) {
        let source = this.#sources.get(src_id);
        if (!source) {
            console.log(`Error when processing '${name}' request: ` +
                        `Cannot find source '${src_id}'`);
        }
        else {
            return cb(source);
        }
    }
    #multi_source(name, params, use_res, cb) {
        let all_res = use_res ? Object.create(null) : undefined;
        let promises;
        for (let src_id of Object.getOwnPropertyNames(params)) {
            let source = this.#sources.get(src_id);
            if (!source) {
                console.log(`Error when processing '${name}' request: ` +
                            `Cannot find source '${src_id}'`);
                continue;
            }
            let res = cb(source, params[src_id]);
            if (use_res) {
                if (res instanceof Promise) {
                    if (promises === undefined)
                        promises = [];
                    promises.push(res.then(v => { all_res[src_id] = v; }));
                }
                else {
                    all_res[src_id] = res;
                }
            }
        }
        if (promises !== undefined)
            return Promise.all(promises).then(() => all_res);
        return all_res;
    }

    call_method(src_id, name, params) {
        return this.#use_source('call', src_id,
                                (source) => source.call_method(name, params));
    }
    get_values(params) {
        return this.#multi_source('get', params, true,
                                  (source, params) => source.get_values(params));
    }
    set_values(params) {
        return this.#multi_source('set', params, true,
                                  (source, params) => source.set_values(params));
    }

    #listen_signal(src_id, name, sock) {
        this.#use_source('listen', src_id, (source) => source.listen_signal(name, sock));
    }
    #unlisten_signal(src_id, name, sock) {
        this.#use_source('unlisten', src_id, (source) => source.unlisten_signal(name, sock));
    }

    #watch_values(params, sock) {
        this.#multi_source('watch', params, false,
                           (source, params) => source.watch_values(params, sock));
    }
    #unwatch_values(params, sock) {
        this.#multi_source('unwatch', params, false,
                           (source, params) => source.unwatch_values(params, sock));
    }

    add_source(source) {
        source.socket_manager = this;
        this.#sources.set(source.id, source);
    }
    remove_source(source) {
        source.clear();
        this.#sources.delete(source.id);
    }
};

module.exports = SocketManager;
