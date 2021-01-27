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

class SocketManager {
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

            // TODO: disconnect from all sources
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

    call_method(src_id, name, params) {
        // TODO
    }
    get_values(params) {
        // TODO
    }
    set_values(params) {
        // TODO
    }

    #listen_signal(src_id, name, sock) {
        // TODO
    }
    #unlisten_signal(src_id, name, sock) {
        // TODO
    }

    #watch_values(params, sock) {
        // TODO
    }
    #unwatch_values(params, sock) {
        // TODO
    }
};

module.exports = SocketManager;
