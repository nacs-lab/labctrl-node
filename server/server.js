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

const api = require('./api');
const SocketManager = require('./socket_manager');
const User = require('./user');
const user_session = require('./user_session');

const body_parser = require('body-parser');
const cls = require('cls-hooked');
const compression = require('compression');
const cookie_parser = require('cookie-parser');
const express = require('express');
const http = require('http');
const next = require('next');
const path = require('path');
const socketio = require('socket.io');

const data_dir = path.join(__dirname, '../public/');

function midware_express2io(mw) {
    return function (socket, next) {
        mw(socket.request, {}, next);
    };
}

class Server {
    static namespace = cls.createNamespace('labctrl-server-ns');
    static current() {
        return this.namespace.get('server');
    }
    constructor() {
        this.next = next({ dev: process.env.NODE_ENV == 'development' });
        this.handle = this.next.getRequestHandler();
        this.sock_mgr = new SocketManager();
        this.prepare = Promise.all([this.next.prepare(),
                                    User.init()]).then(() => {
                                        this.init();
                                    });
    }
    init() {
        this.express = express();
        this.http = http.createServer(this.express);
        let setup_ns = (req, res, next) => {
            return Server.namespace.runAndReturn(() => {
                Server.namespace.set('server', this);
                return next();
            });
        };
        let cp = cookie_parser();

        this.io = socketio(this.http);
        this.io.use(midware_express2io(cp));
        this.io.use(midware_express2io(user_session));
        this.io.use(midware_express2io(setup_ns));
        this.io.use(function (socket, next) {
            let req = socket.request;
            if (!req.nacs_user)
                return next(new Error('Not authorized.'));
            next();
        });
        this.io.on('connection', (sock) => {
            this.sock_mgr.add_socket(sock);
        });

        this.express.use(compression());
        this.express.use('/favicon.ico',
                         express.static(path.join(data_dir, 'img/favicon.ico')));
        this.express.use(body_parser.json());
        this.express.use(cp);
        this.express.use(user_session);
        this.express.use(setup_ns);
        this.express.post('/api', async (req, res, next) => {
            // This handles the client version of the API.

            // Handle exception as per:
            // http://www.acuriousanimal.com/2018/02/15/express-async-middleware.html
            try {
                // Relies on the body parser above to parse the request data.
                res.type("json").send(JSON.stringify(await api(req.body, { req, res })));
            }
            catch (err) {
                next(err);
            }
        });
        this.express.use('/verify', (req, res, next) => {
            return this.next.render(req, res, '/verify', { token: req.path });
        });
        this.express.all('*', (req, res) => {
            return this.handle(req, res);
        });
    }
    listen(...args) {
        this.prepare = this.prepare.then(() => {
            this.http.listen.apply(this.http, args);
        });
    }
};

module.exports = Server;
